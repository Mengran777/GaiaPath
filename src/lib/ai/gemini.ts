import {
  GoogleGenerativeAI,
  SchemaType,
  type ObjectSchema,
} from "@google/generative-ai";

export const ITINERARY_MODEL = "gemini-3.1-flash-lite-preview";

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

/**
 * Calls Gemini with a response schema and returns the parsed JSON.
 * Retries on overload / rate limit / truncated output with 2s, 4s backoff.
 */
export async function generateJson<T>(
  prompt: string,
  options: {
    schema: ObjectSchema;
    temperature: number;
    maxOutputTokens: number;
    label: string;
    maxRetries?: number;
  },
): Promise<T> {
  const { schema, temperature, maxOutputTokens, label, maxRetries = 3 } = options;

  const model = genAI.getGenerativeModel({
    model: ITINERARY_MODEL,
    generationConfig: {
      temperature,
      maxOutputTokens,
      responseMimeType: "application/json",
      responseSchema: schema,
    },
  });

  let lastError: unknown;
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const result = await model.generateContent(prompt);
      return JSON.parse(result.response.text()) as T;
    } catch (error: any) {
      lastError = error;
      if (!isRetryable(error) || attempt === maxRetries) break;
      const waitMs = Math.pow(2, attempt) * 1000;
      console.warn(`${label}: attempt ${attempt} failed (${error?.message}), retrying in ${waitMs / 1000}s`);
      await new Promise((resolve) => setTimeout(resolve, waitMs));
    }
  }
  throw lastError;
}
