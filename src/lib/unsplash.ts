// Shared helpers for Unsplash API compliance: attribution metadata and the
// download-trigger ping required by https://help.unsplash.com/en/articles/2511245.
export interface UnsplashAttribution {
  photographerName: string;
  photographerUrl: string; // profile URL, utm-tagged
}

export interface UnsplashPhoto extends UnsplashAttribution {
  url: string;
}

const APP_NAME = "gaiapath";

function withUtm(url: string): string {
  const sep = url.includes("?") ? "&" : "?";
  return `${url}${sep}utm_source=${APP_NAME}&utm_medium=referral`;
}

export const UNSPLASH_HOME_LINK = withUtm("https://unsplash.com/");

// Extracts what we need from a Search Photos API result and fires the
// required download-trigger ping in the same step, since that call marks the
// exact moment we've decided to actually use this photo (not just preview it).
export function selectUnsplashPhoto(
  result: any,
  urlField: "regular" | "small",
  accessKey: string,
): UnsplashPhoto | null {
  const url: string | undefined = result?.urls?.[urlField];
  const photographerName: string | undefined = result?.user?.name;
  const photographerProfile: string | undefined = result?.user?.links?.html;
  const downloadLocation: string | undefined = result?.links?.download_location;
  if (!url || !photographerName || !photographerProfile || !downloadLocation) return null;

  fetch(downloadLocation, { headers: { Authorization: `Client-ID ${accessKey}` } }).catch(() => {});

  return { url, photographerName, photographerUrl: withUtm(photographerProfile) };
}
