import { NextRequest, NextResponse } from "next/server";
import { selectUnsplashPhoto } from "@/lib/unsplash";

const UNSPLASH_ACCESS_KEY = process.env.UNSPLASH_ACCESS_KEY;

const STOPWORDS = new Set([
  "the", "and", "of", "at", "in", "a", "an", "to", "for",
  "by", "on", "with", "from", "visit", "explore", "see", "tour",
]);

function buildKeywords(title: string, destination: string): string {
  const words = title
    .toLowerCase()
    .replace(/[^a-z\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 1 && !STOPWORDS.has(w))
    .slice(0, 3);
  return [...words, destination].filter(Boolean).join(" ");
}

export async function POST(req: NextRequest) {
  const { title, destination, locationName } = await req.json();

  if (!title || typeof title !== "string") {
    return NextResponse.json({ imageUrl: null }, { status: 400 });
  }
  if (!UNSPLASH_ACCESS_KEY) {
    return NextResponse.json({ imageUrl: null });
  }

  const keywords = buildKeywords(locationName || title, destination ?? "");

  try {
    const res = await fetch(
      `https://api.unsplash.com/search/photos?query=${encodeURIComponent(keywords)}&per_page=1&orientation=landscape`,
      { headers: { Authorization: `Client-ID ${UNSPLASH_ACCESS_KEY}` } },
    );
    if (!res.ok) return NextResponse.json({ imageUrl: null });
    const data = await res.json();
    const result = data?.results?.[0];
    const photo = result ? selectUnsplashPhoto(result, "small", UNSPLASH_ACCESS_KEY) : null;
    return NextResponse.json({
      imageUrl: photo?.url ?? null,
      imageAttribution: photo
        ? { photographerName: photo.photographerName, photographerUrl: photo.photographerUrl }
        : null,
    });
  } catch {
    return NextResponse.json({ imageUrl: null, imageAttribution: null });
  }
}
