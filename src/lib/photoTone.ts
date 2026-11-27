"use client";

// A pale, quiet colour taken from a photo, for the colour field behind the
// itinerary title. A tiny copy of the photo is drawn to a canvas, the strongest
// colour family wins, and the result is lifted to the same light, low-saturation
// band so black text always reads on it.
import { useEffect, useState } from "react";

const cache = new Map<string, string | null>();

// Ask Unsplash for a tiny rendition; other hosts are used as they are
const tiny = (url: string) =>
  url.includes("images.unsplash.com")
    ? url.replace(/([?&])w=\d+/, "$1w=48").replace(/([?&])q=\d+/, "$1q=40") +
      (/[?&]w=/.test(url) ? "" : `${url.includes("?") ? "&" : "?"}w=48`)
    : url;

function toHex(r: number, g: number, b: number) {
  return "#" + [r, g, b].map((v) => Math.round(v).toString(16).padStart(2, "0")).join("");
}

function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  const k = (n: number) => (n + h * 12) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => l - a * Math.max(-1, Math.min(k(n) - 3, 9 - k(n), 1));
  return [f(0) * 255, f(8) * 255, f(4) * 255];
}

function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return [0, 0, l];
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h = max === r ? (g - b) / d + (g < b ? 6 : 0) : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  h /= 6;
  return [h, s, l];
}

/**
 * Light (L 88%) and soft (S 26–45%) version of the photo's strongest colour.
 * Pixels are grouped into 12 hue families and the strongest family wins, so a
 * photo of orange roofs under a blue sky gives a warm or a blue tone, never the
 * grey you'd get by averaging the two.
 */
function paleTone(data: Uint8ClampedArray): string {
  const BINS = 12;
  const bins = Array.from({ length: BINS }, () => ({ w: 0, r: 0, g: 0, b: 0 }));
  for (let i = 0; i < data.length; i += 4) {
    const [h, s, l] = rgbToHsl(data[i], data[i + 1], data[i + 2]);
    if (s < 0.12 || l < 0.1 || l > 0.92) continue; // greys, shadows, highlights
    const weight = s * s * (1 - Math.abs(l - 0.5)); // colourful mid-tones count most
    const bin = bins[Math.floor(h * BINS) % BINS];
    bin.w += weight; bin.r += data[i] * weight; bin.g += data[i + 1] * weight; bin.b += data[i + 2] * weight;
  }
  const best = bins.reduce((a, c) => (c.w > a.w ? c : a));
  if (best.w === 0) return "#f3eee4"; // a black-and-white photo: the usual sand
  const [h, s] = rgbToHsl(best.r / best.w, best.g / best.w, best.b / best.w);
  const [rr, gg, bb] = hslToRgb(h, Math.min(0.45, Math.max(0.26, s * 0.8)), 0.88);
  return toHex(rr, gg, bb);
}

/** Pale colour for a photo URL; null while loading or when it can't be read */
export function usePhotoTone(url?: string | null): string | null {
  const [tone, setTone] = useState<string | null>(() => (url ? cache.get(url) ?? null : null));

  useEffect(() => {
    if (!url) { setTone(null); return; }
    if (cache.has(url)) { setTone(cache.get(url) ?? null); return; }
    let cancelled = false;
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      try {
        const size = 24;
        const canvas = document.createElement("canvas");
        canvas.width = canvas.height = size;
        const ctx = canvas.getContext("2d");
        if (!ctx) throw new Error("no canvas");
        ctx.drawImage(img, 0, 0, size, size);
        const result = paleTone(ctx.getImageData(0, 0, size, size).data);
        cache.set(url, result);
        if (!cancelled) setTone(result);
      } catch {
        cache.set(url, null); // e.g. a host without CORS: keep the default
      }
    };
    img.onerror = () => cache.set(url, null);
    img.src = tiny(url);
    return () => { cancelled = true; };
  }, [url]);

  return tone;
}
