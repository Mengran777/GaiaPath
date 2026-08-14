// Sanity-checks POI retrieval quality with a handful of sample queries.
// Mirrors the pgvector query in src/lib/ai/poiRetrieval.ts (kept as a plain
// JS duplicate here since this script can't import the .ts module directly).
// Usage: node --env-file=.env scripts/test-retrieval.js
const { PrismaClient } = require("@prisma/client");
const { GoogleGenerativeAI, TaskType } = require("@google/generative-ai");

const prisma = new PrismaClient();
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

async function embedQuery(text) {
  const model = genAI.getGenerativeModel({ model: "gemini-embedding-001" });
  const result = await model.embedContent({
    content: { role: "user", parts: [{ text }] },
    taskType: TaskType.RETRIEVAL_QUERY,
  });
  return result.embedding.values;
}

async function retrieve(destination, queryText, topK = 5) {
  const queryEmbedding = await embedQuery(queryText);
  const vectorLiteral = `[${queryEmbedding.join(",")}]`;

  return prisma.$queryRaw`
    SELECT name, category,
           1 - (embedding <=> ${vectorLiteral}::vector) AS score
    FROM points_of_interest
    WHERE destination = ${destination.toLowerCase()}
    ORDER BY embedding <=> ${vectorLiteral}::vector
    LIMIT ${topK}
  `;
}

const TEST_QUERIES = [
  { destination: "athens", query: "art museums and ancient history" },
  { destination: "athens", query: "quiet nature spots and sea views away from crowds" },
  { destination: "paris", query: "local food markets and casual eating" },
  { destination: "paris", query: "impressionist paintings" },
  { destination: "tokyo", query: "family friendly outdoor activities" },
  { destination: "tokyo", query: "quirky pop culture and anime shopping" },
  { destination: "rome", query: "ancient ruins and gladiators" },
  { destination: "rome", query: "renaissance art collections" },
  { destination: "barcelona", query: "Gaudí architecture" },
  { destination: "barcelona", query: "green space to relax away from downtown" },
  { destination: "london", query: "royal history and famous museums" },
  { destination: "london", query: "iconic skyscrapers and modern landmarks" },
  { destination: "new-york", query: "world famous statues and monuments" },
  { destination: "new-york", query: "a big park to walk around in" },
];

async function main() {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error("GEMINI_API_KEY is not set");
  }

  for (const { destination, query } of TEST_QUERIES) {
    console.log(`\n=== [${destination}] "${query}" ===`);
    const results = await retrieve(destination, query);
    if (results.length === 0) {
      console.log("  (no POIs found for this destination — did you run seed:pois?)");
      continue;
    }
    results.forEach((row, i) => {
      console.log(`  ${i + 1}. ${row.name} (${row.category ?? "uncategorized"}) — score ${Number(row.score).toFixed(3)}`);
    });
  }
}

main()
  .catch((err) => {
    console.error("Retrieval test failed:", err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
