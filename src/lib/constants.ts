export const EVENT = {
  name: "Alt.FFF",
  /** Exhibitor set-up — Friday 18 Sept 2026 (not a public visitor day). */
  setupDate: "2026-09-18",
  /** Public trade fair — Saturday 19 Sept 2026 (one-day event). */
  startDate: "2026-09-19",
  endDate: "2026-09-19",
  /** Short display dates used site-wide (emails, tickers, meta, etc.). */
  dates: "19 Sept 2026",
  /** Longer label for hero cards and schedule headings. */
  tradeFairDateLabel: "Saturday 19 Sept 2026",
  venue: "The Palms Convention Centre, La Palm Royal Beach Hotel, Accra Ghana",
  city: "Accra, Ghana",
} as const;

// Site-wide sharing metadata. No dedicated OG image has been supplied yet -
// reusing the site icon is a reasonable placeholder until a proper 1200x630
// social-share image exists.
export const SITE = {
  ogImage: "/Afff_icon.png",
  // TODO: confirm this is the real production domain - also used as
  // metadataBase in the root layout. Kept as one source of truth so
  // anything building absolute URLs (e.g. news article share links)
  // stays consistent with it.
  url: "https://www.altfff.com",
} as const;

export type Material = {
  id: string;
  name: string;
  origin: string;
  description: string;
  /** Full-bleed hero background image. */
  background: string;
  /** Small circular selector thumbnail. */
  thumbnail: string;
  /** Giant cropped word shown at the bottom of the hero. */
  heroWord: string;
  /**
   * Left-side scrim peak opacity (0–1) for this material's hero background,
   * behind the white headline text. Photos vary a lot in how light/busy
   * their left-hand crop is, so one flat value doesn't hold up across all
   * of them - tuned per material by eye. Falls back to
   * DEFAULT_SCRIM_OPACITY in Hero.tsx if omitted.
   */
  scrimOpacity?: number;
};

export const MATERIALS: Material[] = [
  {
    id: "kente",
    name: "Kente",
    origin: "Ghana",
    description:
      "Strip-woven silk and cotton cloth from Bonwire and the Volta looms, pattern by pattern.",
    background: "/materials/kente-bg2.webp",
    thumbnail: "/materials/kente-thumb.webp",
    heroWord: "GHANA'S KENTE",
    // Bright yellow/green/orange geometric weave, busy throughout
    // including the left crop. Bumped up again after 0.26 still read as
    // barely-there against this much colour.
    scrimOpacity: 0.38,
  },
  {
    id: "adire",
    name: "Indigo & Adire",
    origin: "Nigeria",
    description:
      "Resist-dyed indigo cloth from Abeokuta, where cassava paste and raffia draw the pattern.",
    background: "/materials/adire-bg.webp",
    thumbnail: "/materials/adire-thumb.webp",
    heroWord: "NIGERIA'S ADIRE",
    // Deep indigo blue left crop - decent baseline contrast, modest lift.
    scrimOpacity: 0.14,
  },
  {
    id: "leather",
    name: "Leather",
    origin: "Ethiopia",
    description:
      "Highland hides tanned in Addis Ababa, among the finest sheepskin and goatskin anywhere.",
    background: "/materials/leather-bg.webp",
    thumbnail: "/materials/leather-thumb.webp",
    heroWord: "ETHIOPIA'S LEATHER",
    // Uniformly dark brown throughout - best-contrast material, lightest
    // scrim of the six (kept non-zero for a touch of consistent depth).
    scrimOpacity: 0.1,
  },
  {
    id: "cotton",
    name: "Raw Cotton",
    origin: "Uganda",
    description:
      "Long-staple, hand-picked cotton from the Nile basin, ginned close to the field.",
    background: "/materials/cotton-bg.webp",
    thumbnail: "/materials/cotton-thumb.webp",
    heroWord: "UGANDA'S COTTON",
    // Bright white cotton fibres dominate most of the frame, the worst
    // case of the six for white text. Bumped up again after 0.3 still
    // read as barely-there against this much white.
    scrimOpacity: 0.42,
  },
  {
    id: "dyes",
    name: "Natural Dyes",
    origin: "Mali",
    description:
      "Bogolan mud, n'gallama leaf and river clay, colour drawn from the Niger's banks.",
    background: "/materials/dyes-bg.webp",
    thumbnail: "/materials/dyes-thumb.webp",
    heroWord: "MALI'S DYES",
    // Left crop is a deep matte maroon (the bright yellow/black batik
    // sits further right, past where the scrim fades out) - decent
    // contrast, modest lift.
    scrimOpacity: 0.15,
  },
  {
    id: "cowrie",
    name: "Cowrie & Shells",
    origin: "Senegal",
    description:
      "Shell-work, beading and embellishment from Dakar's ateliers, currency turned ornament.",
    background: "/materials/cowrie-bg.webp",
    thumbnail: "/materials/cowrie-thumb.webp",
    heroWord: "SENEGAL'S COWRIE",
    // Left crop is mostly dark leather backing with scattered cream
    // shells (the dense bright shell pile is further right) - good
    // contrast, light scrim.
    scrimOpacity: 0.11,
  },
];


