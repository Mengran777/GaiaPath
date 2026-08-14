import { GoogleGenerativeAI, TaskType } from "@google/generative-ai";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const EMBEDDING_MODEL = "gemini-embedding-001";

const genAI = new GoogleGenerativeAI(GEMINI_API_KEY || "");

// taskType matters: RETRIEVAL_DOCUMENT for corpus text at index time,
// RETRIEVAL_QUERY for search text at query time — asymmetric embeddings
// give better retrieval quality than embedding both sides the same way.
export async function embedText(
  text: string,
  taskType: TaskType,
): Promise<number[]> {
  const model = genAI.getGenerativeModel({ model: EMBEDDING_MODEL });
  const result = await model.embedContent({
    content: { role: "user", parts: [{ text }] },
    taskType,
  });
  return result.embedding.values;
}

export { TaskType };
