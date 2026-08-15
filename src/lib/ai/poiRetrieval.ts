import prisma from "@/lib/db";
import { embedText, TaskType } from "./embeddings";

export interface RetrievedPoi {
  id: string;
  destination: string;
  name: string;
  description: string;
  category: string | null;
  latitude: number;
  longitude: number;
  score: number;
}

// LocationAutocomplete stores whatever `name` Nominatim returns, which isn't
// always our canonical slug (Rome -> "Roma", Tokyo -> "東京都", London ->
// "Greater London"). Unmapped values pass through unchanged.
const DESTINATION_ALIASES: Record<string, string> = {
  "roma": "rome",
  "greater-london": "london",
  "東京都": "tokyo",
};

// Matches the slug format seed-data files are named after (e.g. "New York"
// -> "new-york"), since the corpus keys destinations by hyphenated slug.
export function normalizeDestination(destination: string): string {
  const slug = destination.trim().toLowerCase().replace(/\s+/g, "-");
  return DESTINATION_ALIASES[slug] ?? slug;
}

// Similarity ranking happens in Postgres via pgvector's `<=>` cosine-distance
// operator — candidate sets are scoped to a single destination (tens of
// rows), so no ANN index is needed at this scale.
export async function retrievePois(
  destination: string,
  queryText: string,
  topK = 8,
): Promise<RetrievedPoi[]> {
  const normalizedDest = normalizeDestination(destination);

  // Cheap existence check first — skips the embedding API call entirely for
  // destinations outside the corpus, which is the common case until it's
  // grown to cover more cities.
  const [{ exists }] = await prisma.$queryRaw<{ exists: boolean }[]>`
    SELECT EXISTS(SELECT 1 FROM points_of_interest WHERE destination = ${normalizedDest}) AS exists
  `;
  if (!exists) return [];

  const queryEmbedding = await embedText(queryText, TaskType.RETRIEVAL_QUERY);
  const vectorLiteral = `[${queryEmbedding.join(",")}]`;

  return prisma.$queryRaw<RetrievedPoi[]>`
    SELECT id, destination, name, description, category, latitude, longitude,
           1 - (embedding <=> ${vectorLiteral}::vector) AS score
    FROM points_of_interest
    WHERE destination = ${normalizedDest}
    ORDER BY embedding <=> ${vectorLiteral}::vector
    LIMIT ${topK}
  `;
}

// Shared prompt-formatting helper — used by both the first-generation route
// and the modify-itinerary route, so grounding text reads identically in
// both prompts.
export function formatPoisForPrompt(pois: RetrievedPoi[]): string {
  if (pois.length === 0) {
    return "(No verified local place data available for this destination — use your own knowledge, but still be as accurate as possible with real place names and coordinates.)";
  }
  return pois
    .map((p) => `- ${p.name} [${p.category ?? "general"}] (${p.latitude}, ${p.longitude}): ${p.description}`)
    .join("\n");
}
