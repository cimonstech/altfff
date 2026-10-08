/**
 * Alt.FFF 2026 Trade Show Guide.
 * Transcribed from the trade show guide specification.
 * Names, locations, and profiles are only what that document supplies.
 */

export type GuideZone =
  | "materials"
  | "experience"
  | "business-services"
  | "sustainability"
  | "furniture"
  | "green-artist"
  | "food-court";

export type GuideType = "exhibitor" | "sponsor" | "partner" | "supporter";

export type GuideBrowse = "all" | GuideType | GuideZone;

export type GuideLink = {
  label: string;
  href: string;
};

export type GuideFeaturedWork = {
  title: string;
  year?: string;
  type?: string;
  description?: string;
  materials?: string[];
  dimensions?: string;
};

export type GuideEntry = {
  id: string;
  name: string;
  fullName?: string;
  type: GuideType;
  zone?: GuideZone;
  location?: string;
  origin?: string;
  logoSrc?: string;
  imageSrc?: string;
  shortDescription?: string;
  about?: string[];
  services?: string[];
  expertise?: string[];
  practice?: string[];
  work?: string[];
  founder?: string;
  lead?: string;
  founded?: string;
  memberships?: string[];
  award?: string;
  representative?: string;
  representativeNote?: string;
  links?: GuideLink[];
  socialLabels?: string[];
  featuredWork?: GuideFeaturedWork;
  /** Search words the specification itself maps onto this listing. */
  keywords?: string[];
};

export const GUIDE_TYPE_LABEL: Record<GuideType, string> = {
  exhibitor: "Exhibitor",
  sponsor: "Sponsor",
  partner: "Partner",
  supporter: "Supporter",
};

export const GUIDE_ZONE_LABEL: Record<GuideZone, string> = {
  materials: "Materials Zone",
  experience: "Experience Hall",
  "business-services": "Business & Service Zone",
  sustainability: "Sustainability Zone",
  furniture: "Furniture Zone",
  "green-artist": "Green Artist Area",
  "food-court": "Food Court",
};

export const GUIDE_ZONES: GuideZone[] = [
  "materials",
  "experience",
  "business-services",
  "sustainability",
  "furniture",
  "green-artist",
  "food-court",
];

export const GUIDE_TYPES: GuideType[] = ["exhibitor", "sponsor", "partner", "supporter"];

const TYPE_BROWSE = new Set<GuideBrowse>(GUIDE_TYPES);

export function isGuideType(browse: GuideBrowse): browse is GuideType {
  return TYPE_BROWSE.has(browse);
}

export function entryMatchesBrowse(entry: GuideEntry, browse: GuideBrowse): boolean {
  if (browse === "all") return entry.type === "exhibitor";
  if (isGuideType(browse)) return entry.type === browse;
  return entry.zone === browse;
}

export function entryMatchesQuery(entry: GuideEntry, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return searchHaystack(entry).includes(q);
}

export function getGuideEntry(id: string): GuideEntry | undefined {
  return tradeShowEntries.find((entry) => entry.id === id);
}

function searchHaystack(entry: GuideEntry): string {
  return [
    entry.name,
    entry.fullName,
    GUIDE_TYPE_LABEL[entry.type],
    entry.zone ? GUIDE_ZONE_LABEL[entry.zone] : "",
    entry.location,
    entry.origin,
    entry.shortDescription,
    ...(entry.about ?? []),
    ...(entry.services ?? []),
    ...(entry.expertise ?? []),
    ...(entry.practice ?? []),
    ...(entry.work ?? []),
    entry.founder,
    entry.lead,
    entry.founded,
    ...(entry.memberships ?? []),
    entry.award,
    entry.representative,
    entry.representativeNote,
    entry.featuredWork?.title,
    entry.featuredWork?.type,
    entry.featuredWork?.description,
    ...(entry.featuredWork?.materials ?? []),
    ...(entry.keywords ?? []),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

export const tradeShowEntries: GuideEntry[] = [
  {
    id: "katoo-maroquinerie",
    name: "Katoo maroquinerie",
    type: "exhibitor",
    zone: "materials",
    location: "Ivory Coast",
  },
  {
    id: "bonwire-kente-weavers-association",
    name: "Bonwire Kente Weavers Association",
    imageSrc: "/event/2026/trade-images/bonwire.jpg",
    type: "exhibitor",
    zone: "materials",
    location: "Ashanti Region, Ghana",
    keywords: ["textile", "kente", "weaving"],
  },
  {
    id: "maic-silk-farm",
    name: "MAIC Silk Farm",
    type: "exhibitor",
    zone: "materials",
    keywords: ["textile", "silk"],
  },
  {
    id: "david-adinkra-works-and-training",
    name: "David Adinkra Works & Training",
    imageSrc: "/event/2026/trade-images/david-adinkra.jpg",
    type: "exhibitor",
    zone: "materials",
    location: "Ashanti Region, Ghana",
  },
  {
    id: "edtex-textiles-ltd",
    name: "Edtex Textiles Ltd",
    imageSrc: "/event/2026/trade-images/edtex.jpg",
    type: "exhibitor",
    zone: "materials",
    keywords: ["textile"],
  },
  {
    id: "adire-kho-nuh-sur",
    name: "Adire Kho-Nuh-Sur",
    type: "exhibitor",
    zone: "materials",
    keywords: ["textile", "adire"],
  },
  {
    id: "godfrey-km-tietaah",
    name: "Godfrey K.M. Tietaah",
    imageSrc: "/event/2026/trade-images/godfrey.jpg",
    type: "exhibitor",
    zone: "materials",
  },
  {
    id: "the-gele-center",
    name: "The Gele Center",
    type: "exhibitor",
    zone: "materials",
    location: "Ghana/Nigeria",
    logoSrc: "/tradeguide/GeleCenter.jpeg",
  },
  {
    id: "gi-exclusive-collection",
    name: "GI Exclusive Collection",
    type: "exhibitor",
    zone: "materials",
  },
  {
    id: "sa-banderole-enterprise-limited",
    name: "Sa Banderole Enterprise Limited",
    type: "exhibitor",
    zone: "materials",
  },
  {
    id: "nuava-handmade",
    name: "Nuava handmade",
    type: "exhibitor",
    zone: "materials",
    logoSrc: "/tradeguide/NuaVaLogo.jpeg",
  },
  {
    id: "suuraya-sarl",
    name: "Suuraya Sarl",
    imageSrc: "/event/2026/trade-images/suuraya-sarl.jpg",
    type: "exhibitor",
    zone: "materials",
    location: "Benin",
  },
  {
    id: "jok-consultancy",
    name: "JOK Consultancy",
    imageSrc: "/event/2026/trade-images/JOK.jpg",
    type: "exhibitor",
    zone: "business-services",
    founder: "Jessica Okwabi",
    shortDescription:
      "Fashion retail and merchandising advisory supporting creative businesses with retail strategy, commercial planning, business audits and training.",
    about: [
      "JOK Consultancy helps fashion and creative businesses replace commercial guesswork with clearer systems and more confident decisions. Through retail strategy, merchandising expertise, practical business tools and training, the consultancy supports stronger pricing, product planning, stock performance, customer experience and sustainable growth.",
      "JOK Consultancy is a fashion retail and merchandising advisory practice supporting founders, brands and institutions. It covers retail strategy, merchandise and assortment planning, pricing, stock performance, customer experience, business audits and training.",
    ],
    services: [
      "Retail strategy",
      "Merchandising",
      "Commercial planning",
      "Business audits",
      "Advisory sessions",
      "Training",
    ],
    links: [
      { label: "Visit Website", href: "https://jokconsultancy.com" },
      { label: "Instagram", href: "https://www.instagram.com/jokconsultancy" },
    ],
    keywords: ["retail", "jessica"],
  },
  {
    id: "raniel-freight-solutions",
    name: "Raniel Freight Solutions Ltd",
    imageSrc: "/event/2026/trade-images/RANIEL-BLUE.jpg",
    type: "exhibitor",
    zone: "business-services",
    location: "Community 1, Tema, Ghana",
    lead: "Jacob Etse Kodzoe Seddoh, Managing Director",
    founded: "June 2023",
    shortDescription:
      "International logistics, freight forwarding, customs compliance and supply chain management, led from Community 1, Tema.",
    about: [
      "Raniel Freight Solutions Ltd is led by Managing Director Jacob Etse Kodzoe Seddoh, who has more than ten years of experience in international logistics, freight forwarding, customs compliance and supply chain management.",
    ],
    expertise: [
      "International freight management",
      "Air freight",
      "Sea freight",
      "Road freight",
      "Customs clearance",
      "Trade compliance",
      "Carrier relationships",
      "3PL relationships",
      "Partner management",
      "Supply chain management",
    ],
    memberships: ["CUBAG", "JCTRANS", "OREXTRADE"],
    award:
      'In 2026, Jacob Etse Kodzoe Seddoh was recognised with the "Outstanding Leadership in Transport & Logistics" award at the GEMA awards.',
    keywords: ["logistics", "tema", "freight"],
  },
  {
    id: "built-financial-technologies",
    name: "Built Africa",
    imageSrc: "/event/2026/trade-images/built.webp",
    fullName: "Built Financial Technologies",
    type: "exhibitor",
    zone: "business-services",
    shortDescription:
      "An all-in-one finance platform that simplifies invoicing, expense tracking, payments and payroll management for small and medium-sized enterprises in Africa.",
    about: [
      "Built is an all-in-one finance platform that simplifies invoicing, expense tracking, payments and payroll management for small and medium-sized enterprises in Africa.",
      "Built's stated goal is to democratize prosperity for African SMEs by providing digital infrastructure for entrepreneurs to start, launch and grow their businesses.",
    ],
    services: [
      "Professional Services",
      "Training & Workshops",
      "Invoice Discounting",
      "Accounting & Bookkeeping",
      "Financial Reporting & Business Insights",
      "Multi-Branch / Multi-Store Management",
      "Digital Payments / E-Payment",
      "Virtual Accounting Services",
      "Invoicing & Quotation",
      "Expense Management",
      "Payroll Management",
      "CRM & Customer Management",
      "Point of Sale (POS) & Inventory",
    ],
    representative: "Stella Niiney Amoatey",
    representativeNote:
      "Senior Sales Associate at Built Financial Technologies. Her supplied profile focuses on client problem-solving, commercial insight, relationship building and sustainable business growth.",
    links: [
      { label: "Instagram", href: "https://www.instagram.com/built.africa" },
      { label: "X", href: "https://x.com/built_africa" },
    ],
    socialLabels: ["LinkedIn: Built Financial Technologies", "Facebook: Built Financial Technologies"],
    keywords: ["accounting", "payroll", "invoicing"],
  },
  {
    id: "kokrobite-institute",
    name: "Kokrobite Institute",
    imageSrc: "/event/2026/trade-images/kokrobite.jpg",
    type: "exhibitor",
    zone: "sustainability",
  },
  {
    id: "nubuke-foundation",
    name: "Nubuke Foundation",
    type: "exhibitor",
    zone: "sustainability",
    shortDescription:
      "A Ghanaian institution dedicated to contemporary art, culture and community engagement.",
    about: [
      "Nubuke Foundation is a Ghanaian institution dedicated to contemporary art, culture and community engagement.",
      "Founded in 2006, it serves as a space connecting artists, researchers and audiences across disciplines and generations.",
      "The Alt.FFF artwork submission highlights Nubuke Foundation's long-term commitment to Ghana's textile traditions, including collaborations with women's weaving associations in Wa, Nadowli and Nandom in Ghana's Upper West Region.",
    ],
    work: [
      "Technical workshops",
      "Design collaborations",
      "Artistic commissions",
      "Support for women weavers",
      "Textile heritage",
      "Contemporary artistic expression",
      "Community and cultural development",
    ],
    featuredWork: {
      title: "Asaasaa",
      year: "2023",
      type: "Handwoven textile installation",
      description:
        "Communal handwoven strips reflecting the traditions, ingenuity and cultural legacy of women weavers from Ghana's Upper West region.",
      materials: ["Handwoven cotton", "Rayon", "Polyester yarns"],
      dimensions: "5,815.6 cm (64 yards) × 35.6 cm (0.4 yards)",
    },
    keywords: ["textile", "weaving", "ghana"],
  },
  {
    id: "interior-design-and-decor-association",
    name: "Interior Design and Decor Association",
    type: "exhibitor",
    zone: "furniture",
  },
  {
    id: "tekura",
    name: "Tekura",
    imageSrc: "/event/2026/trade-images/tekura.jpg",
    type: "exhibitor",
    zone: "furniture",
  },
  {
    id: "national-association-of-handicraft-exporters",
    name: "National Association of Handicraft Exporters",
    type: "exhibitor",
    zone: "furniture",
  },
  {
    id: "geez",
    name: "Geez",
    imageSrc: "/event/2026/trade-images/geez.jpg",
    type: "exhibitor",
    zone: "green-artist",
    location: "Ghana",
    origin: "Guadeloupe, French Caribbean",
    shortDescription:
      "An artisan-activist working in re/up-cycling art and crafts, now based in Ghana.",
    about: [
      "Geez is an artisan-activist working in Re/Up-Cycling Art & Crafts.",
      "After 30 years in Paris, 12 years in London and 3 years in New York City, Geez is now based in Ghana.",
      "The work brought to Alt.FFF focused on how Geez sees textile through fashion and sustainability: fibres, reused materials, low-impact sourcing and the ephemeral, circular aspects of one-of-a-kind productions.",
      "Geez also lectures on subjects inspired by personal life experience and routines.",
    ],
    practice: [
      "Re/up-cycling",
      "Art and crafts",
      "Responsible consumption and production",
      "Sustainability",
      "Textile",
      "Fibres",
      "Low-impact sourcing",
      "Circularity",
      "One-of-a-kind productions",
      "Heritage",
      "Creativity",
      "Environmental stewardship",
    ],
    keywords: ["recycling", "up-cycling", "textile", "sustainability"],
  },
  {
    id: "ghana-food-movement",
    name: "Ghana Food Movement",
    imageSrc: "/event/2026/trade-images/ghanafoodmovement.jpg",
    type: "exhibitor",
    zone: "food-court",
    keywords: ["ghana"],
  },
  { id: "dimo", name: "DIMO", type: "sponsor", logoSrc: "/supporters/dimo.png" },
  { id: "black-star-experience", name: "Black Star Experience", type: "partner", logoSrc: "/supporters/blackStarExperience.png" },
  { id: "mcpr-africa", name: "MCPR Africa", type: "partner", logoSrc: "/supporters/MCPR-Africa.png" },
  { id: "fashion-forum-africa", name: "Fashion Forum Africa", type: "partner", logoSrc: "/supporters/fashionForumAfrica.png" },
  { id: "agi", name: "Association of Ghana Industries (AGI)", type: "supporter", logoSrc: "/supporters/agi.png" },
  {
    id: "itfp-ghana",
    name: "Institute of Textiles & Fashion Professionals Ghana (ITFPG)",
    type: "supporter",
    logoSrc: "/supporters/itfpg.png",
  },
  { id: "ghana-culture-forum", name: "Ghana Culture Forum", type: "supporter", logoSrc: "/supporters/gcf.png" },
  { id: "national-commission-on-culture", name: "National Commission on Culture", type: "supporter", logoSrc: "/supporters/ncc.png" },
  { id: "creative-arts-agency", name: "Creative Arts Agency", type: "supporter", logoSrc: "/supporters/CAAG.png" },
  { id: "ghana-tourism-authority", name: "Ghana Tourism Authority", type: "supporter", logoSrc: "/supporters/GTA.png" },
  { id: "aya-by-asabea", name: "AyA by asabea", type: "supporter", logoSrc: "/supporters/aya.jpg" },
];
