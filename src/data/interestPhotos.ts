// Photos for the wizard's "What are you into?" tiles, one per interest.
//
// Until a photo is added, a tile shows a soft color block in the same place,
// so the layout is final either way. To add one, set `photo` with the same
// shape as the destination gallery (see galleryDestinations.ts):
//   photo: { id, url, photographerName, photographerProfile, downloadLocation }
import type { GalleryPhoto } from "./galleryDestinations";

export interface InterestTile {
  value: string;
  label: string;
  /** Color block shown when there is no photo yet */
  tone: string;
  photo: GalleryPhoto | null;
}

export const INTEREST_TILES: InterestTile[] = [
  { value: "history", label: "History and culture", tone: "#b8a28a", photo: null },
  { value: "food", label: "Food", tone: "#c47d5a", photo: null },
  { value: "nature", label: "Nature", tone: "#7f9a78", photo: null },
  { value: "art_shopping", label: "Art and shopping", tone: "#9b8fb0", photo: null },
  { value: "adventure", label: "Adventure", tone: "#c08f6a", photo: null },
  { value: "relax", label: "Slow days", tone: "#8fa9b5", photo: null },
  { value: "honeymoon", label: "Romantic", tone: "#b88a8a", photo: null },
  { value: "family", label: "Family", tone: "#c9a65e", photo: null },
];
