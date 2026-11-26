// Fires Unsplash's required download-trigger ping for a photo we display from
// a fixed list (the wizard's destination gallery). Only Unsplash's own
// download endpoints are accepted, so this can't be used to fetch arbitrary URLs.
import { NextResponse, type NextRequest } from "next/server";
import { guestGate } from "@/lib/guestGate";

const ALLOWED_PREFIX = "https://api.unsplash.com/photos/";

export async function POST(req: NextRequest) {
  const { blocked } = await guestGate(req, "image");
  if (blocked) return blocked;

  const accessKey = process.env.UNSPLASH_ACCESS_KEY;
  if (!accessKey) return NextResponse.json({ ok: false }, { status: 503 });

  let downloadLocation: unknown;
  try {
    ({ downloadLocation } = await req.json());
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
  if (typeof downloadLocation !== "string" || !downloadLocation.startsWith(ALLOWED_PREFIX)) {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  try {
    await fetch(downloadLocation, { headers: { Authorization: `Client-ID ${accessKey}` } });
  } catch {
    // Tracking is best-effort; never fail the page over it.
  }
  return NextResponse.json({ ok: true });
}
