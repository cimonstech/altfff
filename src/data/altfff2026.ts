/**
 * Alt.FFF 2026 event issue.
 * Fair photographs live in public/gallery/2026.
 * Copy is the day's programme, condensed from the official running order.
 */

export type StandInPhoto = {
  src: string;
  /** What the stand-in is standing in for, so it is obvious what to replace. */
  label: string;
};

export const HERO_LANDSCAPE = "/gallery/2026/AltFashionFair-198.jpg";

/** Eight portraits in the cover stack. Slide to move through them. */
export const HERO_PORTRAITS = [
  "/gallery/2026/AltFashionFair-30.jpg",
  "/gallery/2026/AltFashionFair-112.jpg",
  "/gallery/2026/AltFashionFair-207.jpg",
  "/gallery/2026/AltFashionFair-217.jpg",
  "/gallery/2026/AltFashionFair-232.jpg",
  "/gallery/2026/AltFashionFair-246.jpg",
  "/gallery/2026/AltFashionFair-270.jpg",
  "/gallery/2026/AltFashionFair-303.jpg",
];

export type DayChapter = {
  id: string;
  time: string;
  place: string;
  title: string;
  summary: string;
  /** Folder under public/event/2026. Drop photographs there to attach them. */
  folder?: string;
  /** Filename in that folder used as the row thumbnail. */
  cover?: string;
};

export const DAY_CHAPTERS: DayChapter[] = [
  {
    id: "opening",
    time: "9:00–10:30",
    place: "Main Stage",
    title: "Opening Ceremony",
    summary:
      "Apiorkor Seyiram Ashong opened the room. A kora solo, diplomatic messages, and the keynote from Osafohene Dr. Afua Asabea Asare followed, with sponsor remarks from DIMO.",
    folder: "opening",
    cover: "apiorkor.jpg",
  },
  {
    id: "fair",
    time: "10:30–20:00",
    place: "The floor",
    title: "Trade Fair & Experience Zones",
    summary:
      "Manufacturers, materials, and country-led displays stayed open for the rest of the day, alongside the main stage. Experience Hall, The Moving Loom, and the Green Artist Area did not close for the panels.",
    folder: "trade-experience",
    cover: "AltFashionFair-313.jpg",
  },
  {
    id: "panel-one",
    time: "12:00–13:00",
    place: "Main Stage",
    title: "Building Africa's Material Economy",
    summary:
      "The panel took up what the continent can produce: a market, a route across borders, and the money to move it. Apiorkor Seyiram Ashong moderated.",
    folder: "panel-one",
  },
  {
    id: "workshops",
    time: "13:15–16:00",
    place: "Workshop Room",
    title: "Scale Up, Built Africa, Identity & Markets",
    summary:
      "Three practical sessions ran through the afternoon: growing a creative business, digital tools for intra-African trade, and how identity makes a market.",
    folder: "conference",
    cover: "AltFashionFair-840.jpg",
  },
  {
    id: "panel-two",
    time: "17:30–18:30",
    place: "Main Stage",
    title: "The Next Market: Alt.FFF 2027",
    summary:
      "The panel looked at what to build together, and who had been missing from the room. Ivy Prosper moderated.",
    folder: "panel-two",
  },
  {
    id: "closing",
    time: "19:00–19:30",
    place: "Main Stage",
    title: "From Materials to Momentum",
    summary:
      "Ivy Prosper closed the day. The room heard the outcomes, partner recognition, and the line toward Alt.FFF 2027.",
    folder: "materials",
    cover: "AltFashionFair-47.jpg",
  },
];

/** Figures from the day, shown before the running order. */
export const FAIR_STATS = [
  { value: "150+", label: "Visitors" },
  { value: "22", label: "Exhibitors" },
  { value: "4", label: "Rooms" },
  { value: "1", label: "Saturday" },
];

export type FairRoom = {
  id: string;
  title: string;
  line: string;
  photo: StandInPhoto;
};

export const FAIR_ROOMS: FairRoom[] = [
  {
    id: "experience-hall",
    title: "Experience Hall",
    line: "Country-led displays ran all day, from raw fibre to finished cloth.",
    photo: { src: "/materials/fabrics2.webp", label: "Experience Hall" },
  },
  {
    id: "moving-loom",
    title: "The Moving Loom",
    line: "A dark room of looped films from people who could not be in Accra.",
    photo: { src: "/materials/Raw-Materials/mohair-2.jpg", label: "The Moving Loom" },
  },
  {
    id: "workshop-room",
    title: "Workshop Room",
    line: "Scale Up, Built Africa, and Identity & Markets ran through the afternoon.",
    photo: { src: "/materials/Finished-Materials/pineapple-finished-1.webp", label: "Workshop Room" },
  },
  {
    id: "green-artist",
    title: "Green Artist Area",
    line: "Live installations in reclaimed material, led by Geez.",
    photo: { src: "/materials/Raw-Materials/RAFFIA-2Madagascar.jpg", label: "Green Artist Area" },
  },
];

export const ISSUE_QUOTE = {
  text: "Africa's fashion story begins with our fabrics, our craftsmanship, and our people.",
  attribution: "Rex Owusu Marfo",
  role: "Presidential Staffer & Coordinator, Black Star Experience",
};
