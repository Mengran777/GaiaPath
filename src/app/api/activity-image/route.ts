import { NextRequest, NextResponse } from "next/server";
import { guestGate } from "@/lib/guestGate";
import { searchStopPhotos } from "@/lib/stopPhotoSearch";

const UNSPLASH_ACCESS_KEY = process.env.UNSPLASH_ACCESS_KEY;

// Unsplash photos for a stop (or a city). The search widens step by step
// (name + city → name → city + kind, see lib/stopPhotoSearch.ts); when nothing
// is found the response is empty and the page shows a typographic placeholder.
//   { title, destination?, locationName? }           → { imageUrl, imageAttribution }
//   { title, destination?, locationName?, count: n } → { images: [...] } (n ≤ 4)
export async function POST(req: NextRequest) {
  const { blocked } = await guestGate(req, "image");
  if (blocked) return blocked;

  const { title, destination, locationName, count } = await req.json();

  if (!title || typeof title !== "string") {
    return NextResponse.json({ imageUrl: null }, { status: 400 });
  }
  if (!UNSPLASH_ACCESS_KEY) {
    return NextResponse.json({ imageUrl: null, imageAttribution: null, images: [] });
  }

  const name = locationName || title;
  const place = typeof destination === "string" ? destination : "";

  // Gallery mode: several photos for a stop's drawer
  if (typeof count === "number" && count > 1) {
    const photos = await searchStopPhotos(name, place, Math.min(Math.floor(count), 4), UNSPLASH_ACCESS_KEY);
    return NextResponse.json({
      images: photos.map((p) => ({ url: p.url, photographerName: p.photographerName, photographerUrl: p.photographerUrl })),
    });
  }

  const [photo] = await searchStopPhotos(name, place, 1, UNSPLASH_ACCESS_KEY);
  return NextResponse.json({
    imageUrl: photo?.url ?? null,
    imageAttribution: photo ? { photographerName: photo.photographerName, photographerUrl: photo.photographerUrl } : null,
  });
}
