// Finds Unsplash photos for an itinerary stop, widening the search step by step
// when a narrow query finds nothing:
//   1. the stop's name + city      "hoto fudo kawaguchiko mount fuji"
//   2. the stop's name alone       "hoto fudo kawaguchiko"
//   3. the city + the stop's kind  "mount fuji food"  (kind guessed from the name)
// If all three come back empty, callers show a typographic placeholder instead.
import { selectUnsplashPhoto, type UnsplashPhoto } from "@/lib/unsplash";

const STOPWORDS = new Set([
  "the", "and", "of", "at", "in", "a", "an", "to", "for",
  "by", "on", "with", "from", "visit", "explore", "see", "tour",
]);

// Kind of place, guessed from words in its name (first match wins)
const KINDS: { kind: string; words: string[] }[] = [
  { kind: "food", words: ["food", "restaurant", "ramen", "sushi", "noodle", "udon", "soba", "hoto", "izakaya", "cafe", "coffee", "bakery", "lunch", "dinner", "breakfast", "taverna", "bistro", "kitchen", "eatery", "tapas", "bar"] },
  { kind: "market", words: ["market", "bazaar", "souk", "stalls"] },
  { kind: "temple", words: ["temple", "shrine", "pagoda", "church", "cathedral", "mosque", "monastery", "abbey", "basilica"] },
  { kind: "museum", words: ["museum", "gallery", "exhibition"] },
  { kind: "garden", words: ["garden", "park", "botanical"] },
  { kind: "lake", words: ["lake", "river", "beach", "bay", "harbour", "harbor", "coast", "falls", "waterfall"] },
  { kind: "mountain", words: ["mountain", "mount", "peak", "hike", "trail", "hill", "summit", "valley", "gorge"] },
  { kind: "castle", words: ["castle", "palace", "fort", "fortress", "citadel"] },
  { kind: "street", words: ["street", "alley", "quarter", "district", "old town", "square", "plaza"] },
];

function nameWords(title: string): string[] {
  return title
    .toLowerCase()
    .replace(/[^a-z\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 1 && !STOPWORDS.has(w))
    .slice(0, 3);
}

function kindOf(title: string): string | null {
  const t = ` ${title.toLowerCase()} `;
  for (const { kind, words } of KINDS) {
    if (words.some((w) => t.includes(` ${w}`))) return kind;
  }
  return null;
}

/** The queries to try, narrowest first, without duplicates or empties */
export function stopPhotoQueries(title: string, destination: string): string[] {
  const words = nameWords(title);
  const city = destination.split(",")[0].trim().toLowerCase();
  const kind = kindOf(title);
  const qs = [
    [...words, city].filter(Boolean).join(" "),
    words.join(" "),
    kind && city ? `${city} ${kind}` : "",
  ];
  return [...new Set(qs.map((q) => q.trim()).filter(Boolean))];
}

/**
 * Up to `count` distinct photos for a stop, trying each query in turn until
 * enough are found. Returns [] when nothing matches (or the API refuses).
 */
export async function searchStopPhotos(
  title: string,
  destination: string,
  count: number,
  accessKey: string,
  urlField: "regular" | "small" = "small",
): Promise<UnsplashPhoto[]> {
  const found: UnsplashPhoto[] = [];
  const seen = new Set<string>();
  for (const query of stopPhotoQueries(title, destination)) {
    try {
      const res = await fetch(
        `https://api.unsplash.com/search/photos?query=${encodeURIComponent(query)}&per_page=${Math.max(count, 1) + 2}&orientation=landscape&content_filter=high`,
        { headers: { Authorization: `Client-ID ${accessKey}` } },
      );
      if (!res.ok) {
        // Rate limit or auth: wider queries won't fare better, stop here
        console.warn(`Unsplash stop photo search failed (${res.status}) for "${query}"`);
        break;
      }
      const data = await res.json();
      for (const result of (data?.results ?? []) as any[]) {
        if (found.length >= count) break;
        if (!result?.id || seen.has(result.id)) continue;
        const photo = selectUnsplashPhoto(result, urlField, accessKey);
        if (photo) {
          seen.add(result.id);
          found.push(photo);
        }
      }
    } catch {
      break;
    }
    if (found.length >= count) break;
  }
  return found;
}
