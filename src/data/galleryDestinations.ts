// Curated destination photos for the first wizard step's gallery.
// Hand-picked on Unsplash, deduplicated, and grouped by place. Each place has
// one or more photos; the gallery shows one at random per visit.
// Images are hotlinked from images.unsplash.com as the Unsplash API guidelines
// require; attribution is shown on hover and downloads are tracked via
// /api/unsplash/track when a photo is shown.

export interface GalleryPhoto {
  id: string;
  /** images.unsplash.com base URL (no size params); add w/h/fit when rendering */
  url: string;
  photographerName: string;
  photographerProfile: string;
  downloadLocation: string;
}

export interface GalleryDestination {
  slug: string;
  city: string;
  country: string;
  photos: GalleryPhoto[];
}

export const GALLERY_DESTINATIONS: GalleryDestination[] = [
  {
    slug: "kyoto",
    city: "Kyoto",
    country: "Japan",
    photos: [
      {
        id: "Bxzrd0p6yOM",
        url: "https://images.unsplash.com/photo-1505069446780-4ef442b5207f?ixid=M3w4OTkyNTJ8MHwxfGFsbHx8fHx8fHx8fDE3OTU2MjE0NTV8&ixlib=rb-4.1.0",
        photographerName: "Redd Francisco",
        photographerProfile: "https://unsplash.com/@reddfrancisco",
        downloadLocation: "https://api.unsplash.com/photos/Bxzrd0p6yOM/download?ixid=M3w4OTkyNTJ8MHwxfGFsbHx8fHx8fHx8fDE3OTU2MjE0NTV8",
      },
      {
        id: "01t3ZAHn4hQ",
        url: "https://images.unsplash.com/photo-1605523746900-8aa30db1befd?ixid=M3w4OTkyNTJ8MHwxfGFsbHx8fHx8fHx8fDE3OTU2MjE0NTd8&ixlib=rb-4.1.0",
        photographerName: "Luke Stackpoole",
        photographerProfile: "https://unsplash.com/@withluke",
        downloadLocation: "https://api.unsplash.com/photos/01t3ZAHn4hQ/download?ixid=M3w4OTkyNTJ8MHwxfGFsbHx8fHx8fHx8fDE3OTU2MjE0NTd8",
      },
    ],
  },
  {
    slug: "mount-fuji",
    city: "Mount Fuji",
    country: "Japan",
    photos: [
      {
        id: "PMkQ7WVWqr0",
        url: "https://images.unsplash.com/photo-1574236170880-fbbca132d83d?ixid=M3w4OTkyNTJ8MHwxfGFsbHx8fHx8fHx8fDE3OTU2MjE0ODl8&ixlib=rb-4.1.0",
        photographerName: "Svetlana Gumerova",
        photographerProfile: "https://unsplash.com/@bananablackcat",
        downloadLocation: "https://api.unsplash.com/photos/PMkQ7WVWqr0/download?ixid=M3w4OTkyNTJ8MHwxfGFsbHx8fHx8fHx8fDE3OTU2MjE0ODl8",
      },
      {
        id: "0XnSuPFty2U",
        url: "https://images.unsplash.com/photo-1712976692892-07d78428215d?ixid=M3w4OTkyNTJ8MHwxfGFsbHx8fHx8fHx8fDE3OTU2MjE0NTd8&ixlib=rb-4.1.0",
        photographerName: "Sora Sagano",
        photographerProfile: "https://unsplash.com/@sorasagano",
        downloadLocation: "https://api.unsplash.com/photos/0XnSuPFty2U/download?ixid=M3w4OTkyNTJ8MHwxfGFsbHx8fHx8fHx8fDE3OTU2MjE0NTd8",
      },
    ],
  },
  {
    slug: "lisbon",
    city: "Lisbon",
    country: "Portugal",
    photos: [
      {
        id: "hgFX7SydvFk",
        url: "https://images.unsplash.com/photo-1536663815808-535e2280d2c2?ixid=M3w4OTkyNTJ8MHwxfGFsbHx8fHx8fHx8fDE3OTU2MjE0NTd8&ixlib=rb-4.1.0",
        photographerName: "Tom Byrom",
        photographerProfile: "https://unsplash.com/@tombyrom",
        downloadLocation: "https://api.unsplash.com/photos/hgFX7SydvFk/download?ixid=M3w4OTkyNTJ8MHwxfGFsbHx8fHx8fHx8fDE3OTU2MjE0NTd8",
      },
      {
        id: "oiVvB-A7XDM",
        url: "https://images.unsplash.com/photo-1697748525265-7431cba075b6?ixid=M3w4OTkyNTJ8MHwxfGFsbHx8fHx8fHx8fDE3OTU2MjE0NTd8&ixlib=rb-4.1.0",
        photographerName: "Henry Ren",
        photographerProfile: "https://unsplash.com/@henryren",
        downloadLocation: "https://api.unsplash.com/photos/oiVvB-A7XDM/download?ixid=M3w4OTkyNTJ8MHwxfGFsbHx8fHx8fHx8fDE3OTU2MjE0NTd8",
      },
    ],
  },
  {
    slug: "dolomites",
    city: "Dolomites",
    country: "Italy",
    photos: [
      {
        id: "oGIr8Fkg3LU",
        url: "https://images.unsplash.com/photo-1619371208402-615001f13a45?ixid=M3w4OTkyNTJ8MHwxfGFsbHx8fHx8fHx8fDE3OTU2MjE0NTh8&ixlib=rb-4.1.0",
        photographerName: "Ruud Luijten",
        photographerProfile: "https://unsplash.com/@rluijtenant",
        downloadLocation: "https://api.unsplash.com/photos/oGIr8Fkg3LU/download?ixid=M3w4OTkyNTJ8MHwxfGFsbHx8fHx8fHx8fDE3OTU2MjE0NTh8",
      },
      {
        id: "ICSRhjP1UBU",
        url: "https://images.unsplash.com/photo-1681210994962-f1483b0b569d?ixid=M3w4OTkyNTJ8MHwxfGFsbHx8fHx8fHx8fDE3OTU2MjE0NTh8&ixlib=rb-4.1.0",
        photographerName: "Riccardo Cervia",
        photographerProfile: "https://unsplash.com/@riccardocervia",
        downloadLocation: "https://api.unsplash.com/photos/ICSRhjP1UBU/download?ixid=M3w4OTkyNTJ8MHwxfGFsbHx8fHx8fHx8fDE3OTU2MjE0NTh8",
      },
      {
        id: "Kbu5YwTDUDM",
        url: "https://images.unsplash.com/photo-1698235926601-1d7bd32e4240?ixid=M3w4OTkyNTJ8MHwxfGFsbHx8fHx8fHx8fDE3OTU2MjE0NTl8&ixlib=rb-4.1.0",
        photographerName: "Lars Eisenberg",
        photographerProfile: "https://unsplash.com/@yeahlars",
        downloadLocation: "https://api.unsplash.com/photos/Kbu5YwTDUDM/download?ixid=M3w4OTkyNTJ8MHwxfGFsbHx8fHx8fHx8fDE3OTU2MjE0NTl8",
      },
    ],
  },
  {
    slug: "barcelona",
    city: "Barcelona",
    country: "Spain",
    photos: [
      {
        id: "gGjgFQo3HLQ",
        url: "https://images.unsplash.com/photo-1738036391388-2d9b1fd54c9c?ixid=M3w4OTkyNTJ8MHwxfGFsbHx8fHx8fHx8fDE3OTU2MjE0NTl8&ixlib=rb-4.1.0",
        photographerName: "Abdiel Mejia",
        photographerProfile: "https://unsplash.com/@shuntennn",
        downloadLocation: "https://api.unsplash.com/photos/gGjgFQo3HLQ/download?ixid=M3w4OTkyNTJ8MHwxfGFsbHx8fHx8fHx8fDE3OTU2MjE0NTl8",
      },
      {
        id: "EQUsR9xc5uk",
        url: "https://images.unsplash.com/photo-1718788712222-5893863c4112?ixid=M3w4OTkyNTJ8MHwxfGFsbHx8fHx8fHx8fDE3OTU2MjE0NjB8&ixlib=rb-4.1.0",
        photographerName: "NuKi Chikhladze",
        photographerProfile: "https://unsplash.com/@noukies",
        downloadLocation: "https://api.unsplash.com/photos/EQUsR9xc5uk/download?ixid=M3w4OTkyNTJ8MHwxfGFsbHx8fHx8fHx8fDE3OTU2MjE0NjB8",
      },
      {
        id: "EfLpWn9y3ww",
        url: "https://images.unsplash.com/photo-1701601268259-4b4b5a6c8f90?ixid=M3w4OTkyNTJ8MHwxfGFsbHx8fHx8fHx8fDE3OTU2MjE0NjB8&ixlib=rb-4.1.0",
        photographerName: "Álvaro López",
        photographerProfile: "https://unsplash.com/@alvarolopez5",
        downloadLocation: "https://api.unsplash.com/photos/EfLpWn9y3ww/download?ixid=M3w4OTkyNTJ8MHwxfGFsbHx8fHx8fHx8fDE3OTU2MjE0NjB8",
      },
    ],
  },
  {
    slug: "paris",
    city: "Paris",
    country: "France",
    photos: [
      {
        id: "yzh7B-9sOhc",
        url: "https://images.unsplash.com/photo-1772119044027-04e80adeda6b?ixid=M3w4OTkyNTJ8MHwxfGFsbHx8fHx8fHx8fDE3OTU2MjE0NjB8&ixlib=rb-4.1.0",
        photographerName: "Pavel Abramiankou",
        photographerProfile: "https://unsplash.com/@brmnkv",
        downloadLocation: "https://api.unsplash.com/photos/yzh7B-9sOhc/download?ixid=M3w4OTkyNTJ8MHwxfGFsbHx8fHx8fHx8fDE3OTU2MjE0NjB8",
      },
      {
        id: "CB0Qrf8ib4I",
        url: "https://images.unsplash.com/photo-1503917988258-f87a78e3c995?ixid=M3w4OTkyNTJ8MHwxfGFsbHx8fHx8fHx8fDE3OTU2MjE0NjB8&ixlib=rb-4.1.0",
        photographerName: "Ilnur Kalimullin",
        photographerProfile: "https://unsplash.com/@kalimullin",
        downloadLocation: "https://api.unsplash.com/photos/CB0Qrf8ib4I/download?ixid=M3w4OTkyNTJ8MHwxfGFsbHx8fHx8fHx8fDE3OTU2MjE0NjB8",
      },
    ],
  },
  {
    slug: "beijing",
    city: "Beijing",
    country: "China",
    photos: [
      {
        id: "Wbu_scb-9HQ",
        url: "https://images.unsplash.com/photo-1571822325911-c01620a65e86?ixid=M3w4OTkyNTJ8MHwxfGFsbHx8fHx8fHx8fDE3OTU2MjE0NjF8&ixlib=rb-4.1.0",
        photographerName: "Usukhbayar Gankhuyag",
        photographerProfile: "https://unsplash.com/@usukbayer",
        downloadLocation: "https://api.unsplash.com/photos/Wbu_scb-9HQ/download?ixid=M3w4OTkyNTJ8MHwxfGFsbHx8fHx8fHx8fDE3OTU2MjE0NjF8",
      },
      {
        id: "clbAEqgM0-k",
        url: "https://images.unsplash.com/photo-1699173563249-8ab319163034?ixid=M3w4OTkyNTJ8MHwxfGFsbHx8fHx8fHx8fDE3OTU2MjE0NjF8&ixlib=rb-4.1.0",
        photographerName: "Eean Chen",
        photographerProfile: "https://unsplash.com/@zhouyudesign",
        downloadLocation: "https://api.unsplash.com/photos/clbAEqgM0-k/download?ixid=M3w4OTkyNTJ8MHwxfGFsbHx8fHx8fHx8fDE3OTU2MjE0NjF8",
      },
    ],
  },
  {
    slug: "guilin",
    city: "Guilin",
    country: "China",
    photos: [
      {
        id: "satNyOd77Jg",
        url: "https://images.unsplash.com/photo-1556880003-4fcd06418af3?ixid=M3w4OTkyNTJ8MHwxfGFsbHx8fHx8fHx8fDE3OTU2MjE0NjF8&ixlib=rb-4.1.0",
        photographerName: "Zhimai Zhang",
        photographerProfile: "https://unsplash.com/@zhimaii",
        downloadLocation: "https://api.unsplash.com/photos/satNyOd77Jg/download?ixid=M3w4OTkyNTJ8MHwxfGFsbHx8fHx8fHx8fDE3OTU2MjE0NjF8",
      },
    ],
  },
  {
    slug: "marrakech",
    city: "Marrakech",
    country: "Morocco",
    photos: [
      {
        id: "bzFHhYKdIa0",
        url: "https://images.unsplash.com/photo-1653323792487-6ecc6217040b?ixid=M3w4OTkyNTJ8MHwxfGFsbHx8fHx8fHx8fDE3OTU2MjE0NjF8&ixlib=rb-4.1.0",
        photographerName: "Rumman Amin",
        photographerProfile: "https://unsplash.com/@rumanamin",
        downloadLocation: "https://api.unsplash.com/photos/bzFHhYKdIa0/download?ixid=M3w4OTkyNTJ8MHwxfGFsbHx8fHx8fHx8fDE3OTU2MjE0NjF8",
      },
      {
        id: "BeMc6A68Mpg",
        url: "https://images.unsplash.com/photo-1548018560-4cb48a8837c1?ixid=M3w4OTkyNTJ8MHwxfGFsbHx8fHx8fHx8fDE3OTU2MjE0NjF8&ixlib=rb-4.1.0",
        photographerName: "Don Fontijn",
        photographerProfile: "https://unsplash.com/@donfontijn",
        downloadLocation: "https://api.unsplash.com/photos/BeMc6A68Mpg/download?ixid=M3w4OTkyNTJ8MHwxfGFsbHx8fHx8fHx8fDE3OTU2MjE0NjF8",
      },
      {
        id: "YSabBvW1aR4",
        url: "https://images.unsplash.com/photo-1570133435536-7ececf000ef6?ixid=M3w4OTkyNTJ8MHwxfGFsbHx8fHx8fHx8fDE3OTU2MjE0NjJ8&ixlib=rb-4.1.0",
        photographerName: "Alex Azabache",
        photographerProfile: "https://unsplash.com/@alexazabache",
        downloadLocation: "https://api.unsplash.com/photos/YSabBvW1aR4/download?ixid=M3w4OTkyNTJ8MHwxfGFsbHx8fHx8fHx8fDE3OTU2MjE0NjJ8",
      },
    ],
  },
];

/** Sized, cropped image URL for a gallery photo (portrait 3:4 by default). */
export function galleryImageUrl(photo: GalleryPhoto, width = 480, height = 640): string {
  const sep = photo.url.includes("?") ? "&" : "?";
  return `${photo.url}${sep}w=${width}&h=${height}&fit=crop&crop=entropy&q=80&fm=jpg`;
}
