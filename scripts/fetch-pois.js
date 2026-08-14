// Semi-automated POI discovery for the RAG corpus.
//
// Discovery: Wikidata SPARQL, ranked by how many Wikipedia languages link to
// each item (a proxy for "real landmark" vs. random OSM node). The query
// avoids `wdt:P279*` (subclass expansion) and a direct enwiki sitelink join
// — both blow the query service's timeout when combined with the geo filter.
//
// Description text comes from English Wikipedia's summary API, gated by a
// word-overlap check so a loosely related article can't attach to the
// wrong place.
//
// Writes prisma/seed-data/pois/<destination>.json per target below. Review
// the output before running `npm run seed:pois`.
//
// Usage: node --env-file=.env scripts/fetch-pois.js
const fs = require("fs");
const path = require("path");

const LOCATIONIQ_API_KEY = process.env.LOCATIONIQ_API_KEY;
const LOCATIONIQ_BASE = "https://us1.locationiq.com/v1";
const WIKIDATA_SPARQL = "https://query.wikidata.org/sparql";
const APP_USER_AGENT = "GaiaPath/1.0 (educational travel app)";

// Edit this list to add more cities in a future run.
const TARGET_DESTINATIONS = [
  { name: "rome", query: "Rome, Italy" },
  { name: "barcelona", query: "Barcelona, Spain" },
  { name: "london", query: "London, UK" },
  { name: "new-york", query: "Midtown Manhattan, New York" }, // was "New York, USA" — that centroid landed near City Hall, 8-9km from Central Park/the Met, outside the search radius
];

const RADIUS_KM = 7;
const RESULTS_PER_GROUP = 20;
const MIN_SITELINKS = 3; // floor to weed out obscure single-language stubs

// Flat (non-transitive) Wikidata "instance of" type lists per category.
const WIKIDATA_TYPE_GROUPS = [
  {
    category: "culture",
    types: ["Q33506", "Q1802963", "Q17431399"], // museum, art gallery, gallery
  },
  {
    category: "classic",
    types: [
      "Q570116", "Q4989906", "Q839954", "Q23413", "Q16970", // tourist attraction, monument, archaeological site, castle, church building
      "Q179700", "Q1779653", "Q11303", "Q174782", "Q120560", // statue, colossal statue, skyscraper, square, minor basilica
    ],
  },
  {
    category: "nature",
    types: ["Q22698", "Q253439", "Q43501"], // park, botanical garden, zoo
  },
];

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchJsonWithRetry(url, options, retries = 2) {
  let lastError = null;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fetch(url, options);
      if (!res.ok) {
        lastError = `HTTP ${res.status}`;
        if (attempt < retries) {
          await sleep(2000 * (attempt + 1));
          continue;
        }
        console.log(`    (fetch failed: ${lastError} for ${url.slice(0, 80)}...)`);
        return null;
      }
      return await res.json();
    } catch (e) {
      lastError = e.message;
      if (attempt < retries) {
        await sleep(2000 * (attempt + 1));
        continue;
      }
      console.log(`    (fetch failed: ${lastError} for ${url.slice(0, 80)}...)`);
      return null;
    }
  }
  return null;
}

async function geocodeCity(query) {
  const url = `${LOCATIONIQ_BASE}/search?key=${LOCATIONIQ_API_KEY}&q=${encodeURIComponent(query)}&format=json&limit=1`;
  const data = await fetchJsonWithRetry(url, undefined, 3);
  if (!data?.[0]) throw new Error(`No geocoding result for "${query}"`);
  return { lat: parseFloat(data[0].lat), lon: parseFloat(data[0].lon) };
}

function parseWktPoint(wkt) {
  const m = /Point\(([-\d.]+)\s+([-\d.]+)\)/.exec(wkt ?? "");
  if (!m) return null;
  return { lon: parseFloat(m[1]), lat: parseFloat(m[2]) };
}

async function wikidataNearbyByType(lat, lon, types) {
  const valuesClause = types.map((t) => `wd:${t}`).join(" ");
  const query = `
    SELECT ?item ?itemLabel ?coord (COUNT(DISTINCT ?sitelink) AS ?sitelinks) WHERE {
      VALUES ?type { ${valuesClause} }
      ?item wdt:P31 ?type .
      ?item wdt:P625 ?coord .
      SERVICE wikibase:around {
        ?item wdt:P625 ?location .
        bd:serviceParam wikibase:center "Point(${lon} ${lat})"^^geo:wktLiteral .
        bd:serviceParam wikibase:radius "${RADIUS_KM}" .
      }
      ?sitelink schema:about ?item .
      SERVICE wikibase:label { bd:serviceParam wikibase:language 'en'. }
    }
    GROUP BY ?item ?itemLabel ?coord
    HAVING (COUNT(DISTINCT ?sitelink) >= ${MIN_SITELINKS})
    ORDER BY DESC(?sitelinks)
    LIMIT ${RESULTS_PER_GROUP}
  `;
  const url = `${WIKIDATA_SPARQL}?format=json&query=${encodeURIComponent(query)}`;
  const data = await fetchJsonWithRetry(url, {
    headers: { "User-Agent": APP_USER_AGENT, Accept: "application/sparql-results+json" },
  });
  if (!data) return [];

  return data.results.bindings
    .map((b) => {
      const coord = parseWktPoint(b.coord?.value);
      if (!coord) return null;
      return {
        qid: b.item.value.split("/").pop(),
        name: b.itemLabel.value,
        sitelinks: parseInt(b.sitelinks.value, 10),
        latitude: coord.lat,
        longitude: coord.lon,
      };
    })
    .filter(Boolean);
}

/** Truncate to at most `maxLen` chars, ending at the last full sentence. */
function truncateToSentence(text, maxLen) {
  if (text.length <= maxLen) return text;
  const sub = text.slice(0, maxLen);
  const lastPeriod = sub.lastIndexOf(".");
  return lastPeriod > 0 ? text.slice(0, lastPeriod + 1) : sub.trimEnd() + "…";
}

const GENERIC_STOPWORDS = new Set(["the", "and", "de", "la", "le", "el", "of", "des", "del"]);

function significantWords(s, extraStopwords) {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, "")
    .split(/\s+/)
    .filter((w) => w.length > 2 && !GENERIC_STOPWORDS.has(w) && !extraStopwords.has(w));
}

// Guards against full-text search matching a loosely related but wrong
// entity. Destination words are stripped first — otherwise a name like "FC
// Barcelona Museum" can hit the overlap bar on the city name alone, without
// "Museum" ever being checked. Names with <=2 significant words left after
// stripping require ALL of them to match, since a fractional threshold is
// trivially satisfied by chance that small.
function textMatchesName(name, text, destinationStopwords) {
  const nameWords = significantWords(name, destinationStopwords);
  // Nothing left to verify against (e.g. "W Barcelona") — reject rather
  // than blindly accept.
  if (nameWords.length === 0) return false;
  const textWords = new Set(significantWords(text, new Set()));
  const overlap = nameWords.filter((w) => textWords.has(w)).length;
  const threshold = nameWords.length <= 2 ? 1 : 0.6;
  return overlap / nameWords.length >= threshold;
}

async function searchWiki(query) {
  const url =
    `https://en.wikipedia.org/w/api.php?action=query&list=search` +
    `&srsearch=${encodeURIComponent(query)}&srlimit=1&format=json`;
  const data = await fetchJsonWithRetry(url, { headers: { "User-Agent": APP_USER_AGENT } });
  return data?.query?.search?.[0]?.title ?? null;
}

async function findMatchedTitle(name, destinationLabel, destinationStopwords) {
  const primary = await searchWiki(`${name} ${destinationLabel}`);
  if (primary && textMatchesName(name, primary, destinationStopwords)) return primary;

  const shortName = name.split(/\s+/).slice(0, 2).join(" ");
  if (shortName !== name) {
    await sleep(1200);
    const fallback = await searchWiki(shortName);
    if (fallback && textMatchesName(name, fallback, destinationStopwords)) return fallback;
  }
  return null;
}

async function fetchWikiSummary(title) {
  const url = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`;
  const data = await fetchJsonWithRetry(url, { headers: { "User-Agent": APP_USER_AGENT } });
  const extract = data?.extract ?? "";
  return extract ? truncateToSentence(extract, 220) : null;
}

async function processDestination({ name, query }) {
  console.log(`\n[${name}] geocoding "${query}"...`);
  const { lat, lon } = await geocodeCity(query);
  console.log(`  center: ${lat}, ${lon}`);

  const destinationStopwords = new Set(name.split(/[-\s]+/));

  const seen = new Map(); // qid -> { candidate, fallbackCategory }
  for (const group of WIKIDATA_TYPE_GROUPS) {
    await sleep(1000); // be polite to the shared Wikidata Query Service
    const results = await wikidataNearbyByType(lat, lon, group.types);
    console.log(`  [${group.category}] types=${group.types.join(",")} -> ${results.length} results`);
    for (const r of results) {
      if (!seen.has(r.qid)) seen.set(r.qid, { candidate: r, fallbackCategory: group.category });
    }
  }

  console.log(`  ${seen.size} unique candidates, fetching Wikipedia descriptions...`);

  async function resolveCandidate(candidate, fallbackCategory, delayMs) {
    await sleep(delayMs);
    const title = await findMatchedTitle(candidate.name, name, destinationStopwords);
    if (!title) return { ok: false, reason: "no Wikipedia title match" };

    await sleep(delayMs);
    const description = await fetchWikiSummary(title);
    if (!description) return { ok: false, reason: `matched "${title}" but no usable summary` };

    // Second gate: the title passed, but the summary content itself might
    // still be about something else. Check the description text too.
    if (!textMatchesName(candidate.name, description, destinationStopwords)) {
      return { ok: false, reason: `matched "${title}" but description doesn't mention "${candidate.name}"` };
    }

    return {
      ok: true,
      poi: {
        name: candidate.name,
        description,
        category: fallbackCategory,
        latitude: candidate.latitude,
        longitude: candidate.longitude,
        source: "wikidata",
      },
    };
  }

  const pois = [];
  const failed = [];
  for (const { candidate, fallbackCategory } of seen.values()) {
    const result = await resolveCandidate(candidate, fallbackCategory, 1200);
    if (result.ok) {
      pois.push(result.poi);
      console.log(`    ✓ ${candidate.name} (sitelinks: ${candidate.sitelinks})`);
    } else {
      failed.push({ candidate, fallbackCategory });
      console.log(`    ✗ ${candidate.name} (sitelinks: ${candidate.sitelinks}) — ${result.reason}`);
    }
  }

  // Wikipedia's rate limit is intermittent — retrying leftovers after a
  // cooldown recovers most of what the first pass lost to 429s.
  if (failed.length > 0) {
    console.log(`  retrying ${failed.length} failed candidates after cooldown...`);
    await sleep(8000);
    for (const { candidate, fallbackCategory } of failed) {
      const result = await resolveCandidate(candidate, fallbackCategory, 2000);
      if (result.ok) {
        pois.push(result.poi);
        console.log(`    ✓ (retry) ${candidate.name} (sitelinks: ${candidate.sitelinks})`);
      } else {
        console.log(`    ✗ (retry) ${candidate.name} — giving up: ${result.reason}`);
      }
    }
  }

  return pois;
}

async function main() {
  if (!LOCATIONIQ_API_KEY) throw new Error("LOCATIONIQ_API_KEY is not set");

  const outDir = path.join(__dirname, "..", "prisma", "seed-data", "pois");

  for (const destination of TARGET_DESTINATIONS) {
    const pois = await processDestination(destination);
    const outPath = path.join(outDir, `${destination.name}.json`);
    fs.writeFileSync(outPath, JSON.stringify(pois, null, 2) + "\n", "utf-8");
    console.log(`  wrote ${pois.length} POIs -> ${outPath}`);
  }

  console.log("\nDone. Review the generated JSON files, then run: npm run seed:pois");
}

main().catch((err) => {
  console.error("fetch-pois failed:", err);
  process.exitCode = 1;
});
