// Photos for the wizard's "What are you into?" tiles. Each interest has a few
// hand-picked Unsplash photos; the wizard shows one at random per visit.
// The color block shows while a photo loads, or if an interest has none.
// Source list: links/photo.txt
import type { GalleryPhoto } from "./galleryDestinations";

export interface InterestTile {
  value: string;
  label: string;
  /** Color block behind the photo */
  tone: string;
  photos: GalleryPhoto[];
}

export const INTEREST_TILES: InterestTile[] = [
  {
    value: "history",
    label: "History and culture",
    tone: "#b8a28a",
    photos: [
      {
        "id": "ilQmlVIMN4c",
        "url": "https://images.unsplash.com/photo-1555993539-1732b0258235?ixid=M3w4OTkyNTJ8MHwxfGFsbHx8fHx8fHx8fDE3OTU2OTc2Mjh8&ixlib=rb-4.1.0",
        "photographerName": "Spencer Davis",
        "photographerProfile": "https://unsplash.com/@spencerdavis",
        "downloadLocation": "https://api.unsplash.com/photos/ilQmlVIMN4c/download?ixid=M3w4OTkyNTJ8MHwxfGFsbHx8fHx8fHx8fDE3OTU2OTc2Mjh8"
      },
      {
        "id": "maW1uOwCJf8",
        "url": "https://images.unsplash.com/photo-1776799734097-14646d051846?ixid=M3w4OTkyNTJ8MHwxfGFsbHx8fHx8fHx8fDE3OTU2OTc2Mjh8&ixlib=rb-4.1.0",
        "photographerName": "Rasmus Andersen",
        "photographerProfile": "https://unsplash.com/@rasmusandersen93",
        "downloadLocation": "https://api.unsplash.com/photos/maW1uOwCJf8/download?ixid=M3w4OTkyNTJ8MHwxfGFsbHx8fHx8fHx8fDE3OTU2OTc2Mjh8"
      },
      {
        "id": "IooHbXUfOeA",
        "url": "https://images.unsplash.com/photo-1591865986097-77712322981b?ixid=M3w4OTkyNTJ8MHwxfGFsbHx8fHx8fHx8fDE3OTU2OTc2Mjh8&ixlib=rb-4.1.0",
        "photographerName": "Roland Fényes",
        "photographerProfile": "https://unsplash.com/@rolandfenyes",
        "downloadLocation": "https://api.unsplash.com/photos/IooHbXUfOeA/download?ixid=M3w4OTkyNTJ8MHwxfGFsbHx8fHx8fHx8fDE3OTU2OTc2Mjh8"
      },
      {
        "id": "EOKwo-BAtE0",
        "url": "https://images.unsplash.com/photo-1721884257503-fb608967d6ac?ixid=M3w4OTkyNTJ8MHwxfGFsbHx8fHx8fHx8fDE3OTU2OTc2Mjh8&ixlib=rb-4.1.0",
        "photographerName": "Richard Wang",
        "photographerProfile": "https://unsplash.com/@rrricharddd",
        "downloadLocation": "https://api.unsplash.com/photos/EOKwo-BAtE0/download?ixid=M3w4OTkyNTJ8MHwxfGFsbHx8fHx8fHx8fDE3OTU2OTc2Mjh8"
      },
      {
        "id": "HRDv9BF17xo",
        "url": "https://images.unsplash.com/photo-1544550285-bb77ca19c0e8?ixid=M3w4OTkyNTJ8MHwxfGFsbHx8fHx8fHx8fDE3OTU2OTc2Mjh8&ixlib=rb-4.1.0",
        "photographerName": "Shah",
        "photographerProfile": "https://unsplash.com/@asoshiation",
        "downloadLocation": "https://api.unsplash.com/photos/HRDv9BF17xo/download?ixid=M3w4OTkyNTJ8MHwxfGFsbHx8fHx8fHx8fDE3OTU2OTc2Mjh8"
      },
      {
        "id": "kXwsXsS2t-E",
        "url": "https://images.unsplash.com/photo-1769018508568-db2f2d0b94e3?ixid=M3w4OTkyNTJ8MHwxfGFsbHx8fHx8fHx8fDE3OTU2OTc2Mjl8&ixlib=rb-4.1.0",
        "photographerName": "Karly Jones",
        "photographerProfile": "https://unsplash.com/@earthtokarly",
        "downloadLocation": "https://api.unsplash.com/photos/kXwsXsS2t-E/download?ixid=M3w4OTkyNTJ8MHwxfGFsbHx8fHx8fHx8fDE3OTU2OTc2Mjl8"
      },
      {
        "id": "ZZV1FOGaQ8s",
        "url": "https://images.unsplash.com/photo-1527922751658-fdc12370761e?ixid=M3w4OTkyNTJ8MHwxfGFsbHx8fHx8fHx8fDE3OTU2OTc2Mjl8&ixlib=rb-4.1.0",
        "photographerName": "Aaron Greenwood",
        "photographerProfile": "https://unsplash.com/@onevibe",
        "downloadLocation": "https://api.unsplash.com/photos/ZZV1FOGaQ8s/download?ixid=M3w4OTkyNTJ8MHwxfGFsbHx8fHx8fHx8fDE3OTU2OTc2Mjl8"
      },
      {
        "id": "WdjFDzqBBP8",
        "url": "https://images.unsplash.com/photo-1775401152739-662f585e4360?ixid=M3w4OTkyNTJ8MHwxfGFsbHx8fHx8fHx8fDE3OTU2OTc2Mjl8&ixlib=rb-4.1.0",
        "photographerName": "Redd Francisco",
        "photographerProfile": "https://unsplash.com/@reddfrancisco",
        "downloadLocation": "https://api.unsplash.com/photos/WdjFDzqBBP8/download?ixid=M3w4OTkyNTJ8MHwxfGFsbHx8fHx8fHx8fDE3OTU2OTc2Mjl8"
      },
      {
        "id": "Cv0x2GDrJf4",
        "url": "https://images.unsplash.com/photo-1590502640308-160a1fda0d52?ixid=M3w4OTkyNTJ8MHwxfGFsbHx8fHx8fHx8fDE3OTU2OTc2Mjl8&ixlib=rb-4.1.0",
        "photographerName": "daniele tofani",
        "photographerProfile": "https://unsplash.com/@danieletofani",
        "downloadLocation": "https://api.unsplash.com/photos/Cv0x2GDrJf4/download?ixid=M3w4OTkyNTJ8MHwxfGFsbHx8fHx8fHx8fDE3OTU2OTc2Mjl8"
      }
    ],
  },
  {
    value: "food",
    label: "Food",
    tone: "#c47d5a",
    photos: [
      {
        "id": "osNl3-g9VoU",
        "url": "https://images.unsplash.com/photo-1601063458289-77247ba485ec?ixid=M3w4OTkyNTJ8MHwxfGFsbHx8fHx8fHx8fDE3OTU2OTc2MjV8&ixlib=rb-4.1.0",
        "photographerName": "J G",
        "photographerProfile": "https://unsplash.com/@dotjpg",
        "downloadLocation": "https://api.unsplash.com/photos/osNl3-g9VoU/download?ixid=M3w4OTkyNTJ8MHwxfGFsbHx8fHx8fHx8fDE3OTU2OTc2MjV8"
      },
      {
        "id": "TzKnmh_k9Mw",
        "url": "https://images.unsplash.com/photo-1727198826083-6693684e4fc1?ixid=M3w4OTkyNTJ8MHwxfGFsbHx8fHx8fHx8fDE3OTU2OTc2MjV8&ixlib=rb-4.1.0",
        "photographerName": "Racha Debbech",
        "photographerProfile": "https://unsplash.com/@racha__debbech",
        "downloadLocation": "https://api.unsplash.com/photos/TzKnmh_k9Mw/download?ixid=M3w4OTkyNTJ8MHwxfGFsbHx8fHx8fHx8fDE3OTU2OTc2MjV8"
      },
      {
        "id": "MaWMfm-HCqQ",
        "url": "https://images.unsplash.com/photo-1663530761401-15eefb544889?ixid=M3w4OTkyNTJ8MHwxfGFsbHx8fHx8fHx8fDE3OTU2OTc2MjZ8&ixlib=rb-4.1.0",
        "photographerName": "Urban Gyllström",
        "photographerProfile": "https://unsplash.com/@gyllstrom_photo",
        "downloadLocation": "https://api.unsplash.com/photos/MaWMfm-HCqQ/download?ixid=M3w4OTkyNTJ8MHwxfGFsbHx8fHx8fHx8fDE3OTU2OTc2MjZ8"
      }
    ],
  },
  {
    value: "nature",
    label: "Nature",
    tone: "#7f9a78",
    photos: [
      {
        "id": "1Z2niiBPg5A",
        "url": "https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?ixid=M3w4OTkyNTJ8MHwxfGFsbHx8fHx8fHx8fDE3OTU2OTc2MjZ8&ixlib=rb-4.1.0",
        "photographerName": "v2osk",
        "photographerProfile": "https://unsplash.com/@v2osk",
        "downloadLocation": "https://api.unsplash.com/photos/1Z2niiBPg5A/download?ixid=M3w4OTkyNTJ8MHwxfGFsbHx8fHx8fHx8fDE3OTU2OTc2MjZ8"
      },
      {
        "id": "i60yUhfWeYI",
        "url": "https://images.unsplash.com/photo-1682687982093-4773cb0dbc2e?ixid=M3w4OTkyNTJ8MHwxfGFsbHx8fHx8fHx8fDE3OTU2OTc2MjZ8&ixlib=rb-4.1.0",
        "photographerName": "NEOM",
        "photographerProfile": "https://unsplash.com/@neom",
        "downloadLocation": "https://api.unsplash.com/photos/i60yUhfWeYI/download?ixid=M3w4OTkyNTJ8MHwxfGFsbHx8fHx8fHx8fDE3OTU2OTc2MjZ8"
      },
      {
        "id": "jRp60R7ogNQ",
        "url": "https://images.unsplash.com/photo-1621849400072-f554417f7051?ixid=M3w4OTkyNTJ8MHwxfGFsbHx8fHx8fHx8fDE3OTU2OTc2MjZ8&ixlib=rb-4.1.0",
        "photographerName": "Krystal Ng",
        "photographerProfile": "https://unsplash.com/@bykrystal",
        "downloadLocation": "https://api.unsplash.com/photos/jRp60R7ogNQ/download?ixid=M3w4OTkyNTJ8MHwxfGFsbHx8fHx8fHx8fDE3OTU2OTc2MjZ8"
      },
      {
        "id": "9qgKQewttVs",
        "url": "https://images.unsplash.com/photo-1552323543-4cffa4ffffe3?ixid=M3w4OTkyNTJ8MHwxfGFsbHx8fHx8fHx8fDE3OTU2OTc2MjZ8&ixlib=rb-4.1.0",
        "photographerName": "John Fowler",
        "photographerProfile": "https://unsplash.com/@wildhoney",
        "downloadLocation": "https://api.unsplash.com/photos/9qgKQewttVs/download?ixid=M3w4OTkyNTJ8MHwxfGFsbHx8fHx8fHx8fDE3OTU2OTc2MjZ8"
      }
    ],
  },
  {
    value: "art_shopping",
    label: "Art and shopping",
    tone: "#9b8fb0",
    photos: [
      {
        "id": "Agwv1mKDUnc",
        "url": "https://images.unsplash.com/photo-1588260692987-01360da8185b?ixid=M3w4OTkyNTJ8MHwxfGFsbHx8fHx8fHx8fDE3OTU2OTc2MjZ8&ixlib=rb-4.1.0",
        "photographerName": "Europeana",
        "photographerProfile": "https://unsplash.com/@europeana",
        "downloadLocation": "https://api.unsplash.com/photos/Agwv1mKDUnc/download?ixid=M3w4OTkyNTJ8MHwxfGFsbHx8fHx8fHx8fDE3OTU2OTc2MjZ8"
      },
      {
        "id": "b5HMwgoU2h4",
        "url": "https://images.unsplash.com/photo-1531489956451-20957fab52f2?ixid=M3w4OTkyNTJ8MHwxfGFsbHx8fHx8fHx8fDE3OTU2OTc2Mjd8&ixlib=rb-4.1.0",
        "photographerName": "Steve A Johnson",
        "photographerProfile": "https://unsplash.com/@steve_j",
        "downloadLocation": "https://api.unsplash.com/photos/b5HMwgoU2h4/download?ixid=M3w4OTkyNTJ8MHwxfGFsbHx8fHx8fHx8fDE3OTU2OTc2Mjd8"
      },
      {
        "id": "1rBg5YSi00c",
        "url": "https://images.unsplash.com/flagged/photo-1572392640988-ba48d1a74457?ixid=M3w4OTkyNTJ8MHwxfGFsbHx8fHx8fHx8fDE3OTU2OTc2Mjd8&ixlib=rb-4.1.0",
        "photographerName": "adrianna geo",
        "photographerProfile": "https://unsplash.com/@adrigeo_",
        "downloadLocation": "https://api.unsplash.com/photos/1rBg5YSi00c/download?ixid=M3w4OTkyNTJ8MHwxfGFsbHx8fHx8fHx8fDE3OTU2OTc2Mjd8"
      },
      {
        "id": "5TK1F5VfdIk",
        "url": "https://images.unsplash.com/photo-1579783902614-a3fb3927b6a5?ixid=M3w4OTkyNTJ8MHwxfGFsbHx8fHx8fHx8fDE3OTU2OTc2Mjd8&ixlib=rb-4.1.0",
        "photographerName": "Europeana",
        "photographerProfile": "https://unsplash.com/@europeana",
        "downloadLocation": "https://api.unsplash.com/photos/5TK1F5VfdIk/download?ixid=M3w4OTkyNTJ8MHwxfGFsbHx8fHx8fHx8fDE3OTU2OTc2Mjd8"
      },
      {
        "id": "PamFFHL6fVY",
        "url": "https://images.unsplash.com/photo-1529154166925-574a0236a4f4?ixid=M3w4OTkyNTJ8MHwxfGFsbHx8fHx8fHx8fDE3OTU2OTc2Mjd8&ixlib=rb-4.1.0",
        "photographerName": "Chris Czermak",
        "photographerProfile": "https://unsplash.com/@chris_czermak",
        "downloadLocation": "https://api.unsplash.com/photos/PamFFHL6fVY/download?ixid=M3w4OTkyNTJ8MHwxfGFsbHx8fHx8fHx8fDE3OTU2OTc2Mjd8"
      },
      {
        "id": "wqBeoCtU_Ic",
        "url": "https://images.unsplash.com/photo-1614521084980-811d04f6c6cb?ixid=M3w4OTkyNTJ8MHwxfGFsbHx8fHx8fHx8fDE3OTU2OTc2Mjd8&ixlib=rb-4.1.0",
        "photographerName": "Jimmy  Chang",
        "photographerProfile": "https://unsplash.com/@photohunter",
        "downloadLocation": "https://api.unsplash.com/photos/wqBeoCtU_Ic/download?ixid=M3w4OTkyNTJ8MHwxfGFsbHx8fHx8fHx8fDE3OTU2OTc2Mjd8"
      },
      {
        "id": "F6-U5fGAOik",
        "url": "https://images.unsplash.com/photo-1528698827591-e19ccd7bc23d?ixid=M3w4OTkyNTJ8MHwxfGFsbHx8fHx8fHx8fDE3OTU2OTc2Mjd8&ixlib=rb-4.1.0",
        "photographerName": "Tem Rysh",
        "photographerProfile": "https://unsplash.com/@tem_rysh",
        "downloadLocation": "https://api.unsplash.com/photos/F6-U5fGAOik/download?ixid=M3w4OTkyNTJ8MHwxfGFsbHx8fHx8fHx8fDE3OTU2OTc2Mjd8"
      },
      {
        "id": "MFmHV695pd4",
        "url": "https://images.unsplash.com/photo-1682823544433-aae34df4e3da?ixid=M3w4OTkyNTJ8MHwxfGFsbHx8fHx8fHx8fDE3OTU2OTc2Mjd8&ixlib=rb-4.1.0",
        "photographerName": "Nataliia Hordiiuk",
        "photographerProfile": "https://unsplash.com/@whynotnatali",
        "downloadLocation": "https://api.unsplash.com/photos/MFmHV695pd4/download?ixid=M3w4OTkyNTJ8MHwxfGFsbHx8fHx8fHx8fDE3OTU2OTc2Mjd8"
      },
      {
        "id": "fVeujn3i5ZE",
        "url": "https://images.unsplash.com/photo-1651160670627-2896ddf7822f?ixid=M3w4OTkyNTJ8MHwxfGFsbHx8fHx8fHx8fDE3OTU2OTc2Mjh8&ixlib=rb-4.1.0",
        "photographerName": "Subham Hait",
        "photographerProfile": "https://unsplash.com/@subhamhait",
        "downloadLocation": "https://api.unsplash.com/photos/fVeujn3i5ZE/download?ixid=M3w4OTkyNTJ8MHwxfGFsbHx8fHx8fHx8fDE3OTU2OTc2Mjh8"
      }
    ],
  },
  {
    value: "adventure",
    label: "Adventure",
    tone: "#c08f6a",
    photos: [
      {
        "id": "BL4XEhUx1Vk",
        "url": "https://images.unsplash.com/photo-1742201514090-5a173b9477ab?ixid=M3w4OTkyNTJ8MHwxfGFsbHx8fHx8fHx8fDE3OTU2OTc2MzF8&ixlib=rb-4.1.0",
        "photographerName": "Fadhil Abhimantra",
        "photographerProfile": "https://unsplash.com/@fabhimantra",
        "downloadLocation": "https://api.unsplash.com/photos/BL4XEhUx1Vk/download?ixid=M3w4OTkyNTJ8MHwxfGFsbHx8fHx8fHx8fDE3OTU2OTc2MzF8"
      },
      {
        "id": "GuH-a9m57F0",
        "url": "https://images.unsplash.com/photo-1585036761624-4c2cd0f9f2d3?ixid=M3w4OTkyNTJ8MHwxfGFsbHx8fHx8fHx8fDE3OTU2OTc2MzJ8&ixlib=rb-4.1.0",
        "photographerName": "Gaurav Sehara",
        "photographerProfile": "https://unsplash.com/@gvpixels",
        "downloadLocation": "https://api.unsplash.com/photos/GuH-a9m57F0/download?ixid=M3w4OTkyNTJ8MHwxfGFsbHx8fHx8fHx8fDE3OTU2OTc2MzJ8"
      },
      {
        "id": "3i5PHVp1Fkw",
        "url": "https://images.unsplash.com/photo-1570641963303-92ce4845ed4c?ixid=M3w4OTkyNTJ8MHwxfGFsbHx8fHx8fHx8fDE3OTU2OTc2MzJ8&ixlib=rb-4.1.0",
        "photographerName": "Massimiliano Morosinotto",
        "photographerProfile": "https://unsplash.com/@therawhunter",
        "downloadLocation": "https://api.unsplash.com/photos/3i5PHVp1Fkw/download?ixid=M3w4OTkyNTJ8MHwxfGFsbHx8fHx8fHx8fDE3OTU2OTc2MzJ8"
      }
    ],
  },
  {
    value: "relax",
    label: "Slow days",
    tone: "#8fa9b5",
    photos: [
      {
        "id": "t-g6RBGDO2w",
        "url": "https://images.unsplash.com/photo-1775128390546-6856908695ca?ixid=M3w4OTkyNTJ8MHwxfGFsbHx8fHx8fHx8fDE3OTU2OTc2MzB8&ixlib=rb-4.1.0",
        "photographerName": "Kyle Hinkson",
        "photographerProfile": "https://unsplash.com/@whereiskylenow",
        "downloadLocation": "https://api.unsplash.com/photos/t-g6RBGDO2w/download?ixid=M3w4OTkyNTJ8MHwxfGFsbHx8fHx8fHx8fDE3OTU2OTc2MzB8"
      },
      {
        "id": "hrXU63rpQF4",
        "url": "https://images.unsplash.com/photo-1599185186578-0ba91c2a15c0?ixid=M3w4OTkyNTJ8MHwxfGFsbHx8fHx8fHx8fDE3OTU2OTc2MzB8&ixlib=rb-4.1.0",
        "photographerName": "Haley Truong",
        "photographerProfile": "https://unsplash.com/@haleytruong",
        "downloadLocation": "https://api.unsplash.com/photos/hrXU63rpQF4/download?ixid=M3w4OTkyNTJ8MHwxfGFsbHx8fHx8fHx8fDE3OTU2OTc2MzB8"
      },
      {
        "id": "dfwDVTy738I",
        "url": "https://images.unsplash.com/photo-1644641085347-61993fc4cb47?ixid=M3w4OTkyNTJ8MHwxfGFsbHx8fHx8fHx8fDE3OTU2OTc2MzB8&ixlib=rb-4.1.0",
        "photographerName": "Brynden",
        "photographerProfile": "https://unsplash.com/@bagasvg",
        "downloadLocation": "https://api.unsplash.com/photos/dfwDVTy738I/download?ixid=M3w4OTkyNTJ8MHwxfGFsbHx8fHx8fHx8fDE3OTU2OTc2MzB8"
      },
      {
        "id": "McmRfLKw8yg",
        "url": "https://images.unsplash.com/photo-1520322082799-20c1288346e3?ixid=M3w4OTkyNTJ8MHwxfGFsbHx8fHx8fHx8fDE3OTU2OTc2MzB8&ixlib=rb-4.1.0",
        "photographerName": "takahiro taguchi",
        "photographerProfile": "https://unsplash.com/@tak_tag",
        "downloadLocation": "https://api.unsplash.com/photos/McmRfLKw8yg/download?ixid=M3w4OTkyNTJ8MHwxfGFsbHx8fHx8fHx8fDE3OTU2OTc2MzB8"
      },
      {
        "id": "1k7TnX5GAww",
        "url": "https://images.unsplash.com/photo-1542372147193-a7aca54189cd?ixid=M3w4OTkyNTJ8MHwxfGFsbHx8fHx8fHx8fDE3OTU2OTc2MzB8&ixlib=rb-4.1.0",
        "photographerName": "Rizky Subagja",
        "photographerProfile": "https://unsplash.com/@subagjav",
        "downloadLocation": "https://api.unsplash.com/photos/1k7TnX5GAww/download?ixid=M3w4OTkyNTJ8MHwxfGFsbHx8fHx8fHx8fDE3OTU2OTc2MzB8"
      }
    ],
  },
  {
    value: "honeymoon",
    label: "Romantic",
    tone: "#b88a8a",
    photos: [
      {
        "id": "6knrseSjPhs",
        "url": "https://images.unsplash.com/photo-1782241594385-1919f2a7d4fe?ixid=M3w4OTkyNTJ8MHwxfGFsbHx8fHx8fHx8fDE3OTU2OTc2Mjl8&ixlib=rb-4.1.0",
        "photographerName": "Planet Volumes",
        "photographerProfile": "https://unsplash.com/@planetvolumes",
        "downloadLocation": "https://api.unsplash.com/photos/6knrseSjPhs/download?ixid=M3w4OTkyNTJ8MHwxfGFsbHx8fHx8fHx8fDE3OTU2OTc2Mjl8"
      },
      {
        "id": "aQHR96H4VT0",
        "url": "https://images.unsplash.com/photo-1613313151410-21ca3764d71f?ixid=M3w4OTkyNTJ8MHwxfGFsbHx8fHx8fHx8fDE3OTU2OTc2Mjl8&ixlib=rb-4.1.0",
        "photographerName": "Onur Binay",
        "photographerProfile": "https://unsplash.com/@onurbinay",
        "downloadLocation": "https://api.unsplash.com/photos/aQHR96H4VT0/download?ixid=M3w4OTkyNTJ8MHwxfGFsbHx8fHx8fHx8fDE3OTU2OTc2Mjl8"
      },
      {
        "id": "wxc2TyKIIVY",
        "url": "https://images.unsplash.com/photo-1747168572615-09820c6c3a43?ixid=M3w4OTkyNTJ8MHwxfGFsbHx8fHx8fHx8fDE3OTU2OTc2MzB8&ixlib=rb-4.1.0",
        "photographerName": "Stepan Konev",
        "photographerProfile": "https://unsplash.com/@stepan_konev",
        "downloadLocation": "https://api.unsplash.com/photos/wxc2TyKIIVY/download?ixid=M3w4OTkyNTJ8MHwxfGFsbHx8fHx8fHx8fDE3OTU2OTc2MzB8"
      }
    ],
  },
  {
    value: "family",
    label: "Family",
    tone: "#c9a65e",
    photos: [
      {
        "id": "NUZT7_roNEM",
        "url": "https://images.unsplash.com/photo-1672172363390-b47102199dc5?ixid=M3w4OTkyNTJ8MHwxfGFsbHx8fHx8fHx8fDE3OTU2OTc2MzF8&ixlib=rb-4.1.0",
        "photographerName": "Ana Curcan",
        "photographerProfile": "https://unsplash.com/@annaacurcan",
        "downloadLocation": "https://api.unsplash.com/photos/NUZT7_roNEM/download?ixid=M3w4OTkyNTJ8MHwxfGFsbHx8fHx8fHx8fDE3OTU2OTc2MzF8"
      },
      {
        "id": "ur5e3Hu0rmg",
        "url": "https://images.unsplash.com/photo-1745565531807-afa79e9ffbe8?ixid=M3w4OTkyNTJ8MHwxfGFsbHx8fHx8fHx8fDE3OTU2OTc2MzF8&ixlib=rb-4.1.0",
        "photographerName": "Grace Anne Bobadilla",
        "photographerProfile": "https://unsplash.com/@graceannefully",
        "downloadLocation": "https://api.unsplash.com/photos/ur5e3Hu0rmg/download?ixid=M3w4OTkyNTJ8MHwxfGFsbHx8fHx8fHx8fDE3OTU2OTc2MzF8"
      },
      {
        "id": "mwIqqM1otnk",
        "url": "https://images.unsplash.com/photo-1621206593424-6e4e8f6336e9?ixid=M3w4OTkyNTJ8MHwxfGFsbHx8fHx8fHx8fDE3OTU2OTc2MzF8&ixlib=rb-4.1.0",
        "photographerName": "Jeremy Hynes",
        "photographerProfile": "https://unsplash.com/@hynesight",
        "downloadLocation": "https://api.unsplash.com/photos/mwIqqM1otnk/download?ixid=M3w4OTkyNTJ8MHwxfGFsbHx8fHx8fHx8fDE3OTU2OTc2MzF8"
      },
      {
        "id": "KzvUfXlfCKA",
        "url": "https://images.unsplash.com/flagged/photo-1575896225742-3c6ba7caf401?ixid=M3w4OTkyNTJ8MHwxfGFsbHx8fHx8fHx8fDE3OTU2OTc2MzF8&ixlib=rb-4.1.0",
        "photographerName": "Weiqi Xiong",
        "photographerProfile": "https://unsplash.com/@wqqq14",
        "downloadLocation": "https://api.unsplash.com/photos/KzvUfXlfCKA/download?ixid=M3w4OTkyNTJ8MHwxfGFsbHx8fHx8fHx8fDE3OTU2OTc2MzF8"
      },
      {
        "id": "HXMunKmZOJ4",
        "url": "https://images.unsplash.com/photo-1789758612535-303f3f1902c3?ixid=M3w4OTkyNTJ8MHwxfGFsbHx8fHx8fHx8fDE3OTU2OTc2MzF8&ixlib=rb-4.1.0",
        "photographerName": "Queensland, Australia",
        "photographerProfile": "https://unsplash.com/@queenslandaustralia",
        "downloadLocation": "https://api.unsplash.com/photos/HXMunKmZOJ4/download?ixid=M3w4OTkyNTJ8MHwxfGFsbHx8fHx8fHx8fDE3OTU2OTc2MzF8"
      }
    ],
  },
];
