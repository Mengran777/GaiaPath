// Seeds prisma/seed-data/pois/*.json into the points_of_interest table,
// embedding each POI's description with Gemini gemini-embedding-001.
// The embedding column is native pgvector (Unsupported in Prisma schema),
// so writes go through $executeRaw instead of the normal Client API.
// Usage: node --env-file=.env scripts/seed-pois.js
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { PrismaClient } = require("@prisma/client");
const { GoogleGenerativeAI, TaskType } = require("@google/generative-ai");

const prisma = new PrismaClient();
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Gemini's free-tier embedding quota is easy to trip when firing requests
// back-to-back; retry with backoff on 429s instead of dying mid-run.
async function embedDocument(text, retries = 4) {
  const model = genAI.getGenerativeModel({ model: "gemini-embedding-001" });
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const result = await model.embedContent({
        content: { role: "user", parts: [{ text }] },
        taskType: TaskType.RETRIEVAL_DOCUMENT,
      });
      return result.embedding.values;
    } catch (err) {
      if (err?.status === 429 && attempt < retries) {
        const wait = 5000 * (attempt + 1);
        console.log(`    (429, retrying in ${wait / 1000}s...)`);
        await sleep(wait);
        continue;
      }
      throw err;
    }
  }
}

async function main() {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error("GEMINI_API_KEY is not set");
  }

  const seedDir = path.join(__dirname, "..", "prisma", "seed-data", "pois");
  const files = fs.readdirSync(seedDir).filter((f) => f.endsWith(".json"));

  let total = 0;
  for (const file of files) {
    const destination = path.basename(file, ".json").toLowerCase();
    const pois = JSON.parse(fs.readFileSync(path.join(seedDir, file), "utf-8"));

    console.log(`\n[${destination}] embedding ${pois.length} POIs...`);
    for (const poi of pois) {
      await sleep(800); // stay under Gemini's free-tier embedding rate limit
      const embedding = await embedDocument(poi.description);
      const vectorLiteral = `[${embedding.join(",")}]`;
      const id = crypto.randomUUID();

      await prisma.$executeRaw`
        INSERT INTO points_of_interest
          (id, destination, name, description, category, latitude, longitude, embedding, source, created_at, updated_at)
        VALUES
          (${id}, ${destination}, ${poi.name}, ${poi.description}, ${poi.category ?? null},
           ${poi.latitude}, ${poi.longitude}, ${vectorLiteral}::vector, ${poi.source ?? "manual"}, now(), now())
        ON CONFLICT (destination, name) DO UPDATE SET
          description = EXCLUDED.description,
          category = EXCLUDED.category,
          latitude = EXCLUDED.latitude,
          longitude = EXCLUDED.longitude,
          embedding = EXCLUDED.embedding,
          updated_at = now()
      `;
      total += 1;
      process.stdout.write(`  ✓ ${poi.name}\n`);
    }
  }

  console.log(`\nDone. Upserted ${total} POIs across ${files.length} destinations.`);
}

main()
  .catch((err) => {
    console.error("Seeding failed:", err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
