// src/app/api/generate-activity-description/route.ts
import { NextRequest, NextResponse } from "next/server";

/** Truncate to at most `maxLen` chars, ending at the last full sentence. */
function truncateToSentence(text: string, maxLen: number): string {
  if (text.length <= maxLen) return text;
  const sub = text.slice(0, maxLen);
  const lastPeriod = sub.lastIndexOf(".");
  return lastPeriod > 0 ? text.slice(0, lastPeriod + 1) : sub.trimEnd() + "…";
}

export async function POST(req: NextRequest) {
  const { title } = await req.json();
  if (!title || typeof title !== "string") {
    return NextResponse.json({ error: "title is required" }, { status: 400 });
  }

  const res = await fetch(
    `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`,
    { headers: { "User-Agent": "GaiaPath/1.0 (educational travel app)" } }
  );

  if (!res.ok) {
    // 404 or other error → frontend will fall back to activity.description
    return NextResponse.json({ description: null });
  }

  const data = await res.json();
  const extract: string = data?.extract ?? "";
  const description = extract ? truncateToSentence(extract, 150) : null;

  return NextResponse.json({ description });
}
