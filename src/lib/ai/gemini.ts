import {
  GoogleGenerativeAI,
  SchemaType,
  type ObjectSchema,
} from "@google/generative-ai";

// Models tried in order. When one is overloaded (503) or rate limited (429),
// the next takes over, so a demand spike on one model doesn't stop generation.
// Override with GEMINI_MODEL / GEMINI_FALLBACK_MODELS (comma-separated).
export const ITINERARY_MODEL = process.env.GEMINI_MODEL || "gemini-3.1-flash-lite";
const FALLBACK_MODELS = (
  process.env.GEMINI_FALLBACK_MODELS ||
  "gemini-3.5-flash-lite,gemini-flash-lite-latest,gemini-3-flash-preview,gemini-3.1-flash-lite-preview"
)
  .split(",")
  .map((m) => m.trim())
  .filter((m) => m && m !== ITINERARY_MODEL);
const MODEL_CHAIN = [ITINERARY_MODEL, ...FALLBACK_MODELS];

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

// ── Response schemas ─────────────────────────────────────────────────────────
// Passed to Gemini as `responseSchema`, so the model is constrained to return
// JSON in exactly this shape — no regex extraction or format guessing needed.

const activitySchema: ObjectSchema = {
  type: SchemaType.OBJECT,
  properties: {
    title: { type: SchemaType.STRING, description: "Real place or activity name" },
    description: { type: SchemaType.STRING, description: "1-2 sentences" },
    time: { type: SchemaType.STRING, description: 'Time range, e.g. "09:00-11:30"' },
    rating: { type: SchemaType.NUMBER, description: "1 to 5" },
    price: { type: SchemaType.STRING, description: 'e.g. "€20" or "Free"' },
    latitude: { type: SchemaType.NUMBER },
    longitude: { type: SchemaType.NUMBER },
  },
  required: ["title", "description", "time", "rating", "price", "latitude", "longitude"],
};

export const routeSchema: ObjectSchema = {
  type: SchemaType.OBJECT,
  properties: {
    id: { type: SchemaType.STRING },
    badge: { type: SchemaType.STRING },
    title: { type: SchemaType.STRING },
    description: { type: SchemaType.STRING },
    highlights: {
      type: SchemaType.ARRAY,
      items: { type: SchemaType.STRING },
      description: "3 key attractions",
    },
    days: { type: SchemaType.INTEGER },
    itinerary: {
      type: SchemaType.ARRAY,
      items: {
        type: SchemaType.OBJECT,
        properties: {
          day: { type: SchemaType.INTEGER },
          title: { type: SchemaType.STRING },
          date: { type: SchemaType.STRING, description: "YYYY-MM-DD" },
          activities: { type: SchemaType.ARRAY, items: activitySchema },
        },
        required: ["day", "title", "date", "activities"],
      },
    },
  },
  required: ["id", "badge", "title", "description", "highlights", "days", "itinerary"],
};

export const modifySchema: ObjectSchema = {
  type: SchemaType.OBJECT,
  properties: {
    summary: { type: SchemaType.STRING },
    operations: {
      type: SchemaType.ARRAY,
      items: {
        type: SchemaType.OBJECT,
        properties: {
          type: { type: SchemaType.STRING, format: "enum", enum: ["replace", "add"] },
          day: { type: SchemaType.INTEGER },
          activityIndex: {
            type: SchemaType.INTEGER,
            description: 'Required for "replace"; omit for "add"',
          },
          activity: activitySchema,
        },
        required: ["type", "day", "activity"],
      },
    },
  },
  required: ["summary", "operations"],
};

// ── JSON generation with retry ───────────────────────────────────────────────

function isRetryable(error: any): boolean {
  const msg: string = error?.message ?? "";
  return (
    msg.includes("503") ||
    msg.includes("overloaded") ||
    msg.includes("429") ||
    // Truncated output (hit maxOutputTokens) still fails to parse
    error?.name === "SyntaxError"
  );
}

// Overload / rate limit: worth moving to another model rather than waiting
function isCapacityError(error: any): boolean {
  const msg: string = error?.message ?? "";
  return msg.includes("503") || msg.includes("overloaded") || msg.includes("429") || msg.includes("404");
}

/**
 * Calls Gemini with a response schema and returns the parsed JSON.
 * Each model in MODEL_CHAIN gets up to `attemptsPerModel` tries (1s, 2s
 * backoff); on overload or rate limit it moves straight on to the next model.
 */
export async function generateJson<T>(
  prompt: string,
  options: {
    schema: ObjectSchema;
    temperature: number;
    maxOutputTokens: number;
    label: string;
    attemptsPerModel?: number;
  },
): Promise<T> {
  const { schema, temperature, maxOutputTokens, label, attemptsPerModel = 2 } = options;

  // Capacity shifts from moment to moment, so the chain is walked twice
  // with a short pause between passes before giving up.
  const PASSES = 2;
  let lastError: unknown;
  for (let pass = 1; pass <= PASSES; pass++) {
  if (pass > 1) await new Promise((resolve) => setTimeout(resolve, 1500));
  for (const modelName of MODEL_CHAIN) {
    const model = genAI.getGenerativeModel({
      model: modelName,
      generationConfig: {
        temperature,
        maxOutputTokens,
        responseMimeType: "application/json",
        responseSchema: schema,
      },
    });

    for (let attempt = 1; attempt <= attemptsPerModel; attempt++) {
      try {
        const result = await model.generateContent(prompt);
        if (modelName !== ITINERARY_MODEL) console.warn(`${label}: served by fallback model ${modelName}`);
        return JSON.parse(result.response.text()) as T;
      } catch (error: any) {
        lastError = error;
        if (!isRetryable(error) && !isCapacityError(error)) throw error;
        // Capacity problems: don't wait on this model, try the next one
        if (isCapacityError(error) || attempt === attemptsPerModel) {
          console.warn(`${label}: ${modelName} failed (${error?.status ?? error?.message}), trying next model`);
          break;
        }
        const waitMs = attempt * 1000;
        console.warn(`${label}: ${modelName} attempt ${attempt} failed (${error?.message}), retrying in ${waitMs / 1000}s`);
        await new Promise((resolve) => setTimeout(resolve, waitMs));
      }
    }
  }
  }
  throw lastError;
}
