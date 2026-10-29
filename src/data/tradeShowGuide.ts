/**
 * Alt.FFF 2026 Trade Show Guide.
 * Transcribed from the trade show guide specification.
 * Names, locations, and profiles are only what that document supplies.
 */

export type GuideZone =
  | "materials"
  | "business-services"
  | "sustainability"
  | "furniture"
  | "green-artist";

export type GuideType =
  | "exhibitor"
  | "sponsor"
  | "partner"
  | "supporter"
  | "supporting-brand"
  | "media-partner"
  | "advert";

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
  contact?: string;
  emails?: string[];
  phone?: string;
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
  "supporting-brand": "Supporting brand",
  "media-partner": "Media partner",
  advert: "Advert",
};

export const GUIDE_TYPE_PLURAL: Record<GuideType, string> = {
  exhibitor: "Exhibitors",
  sponsor: "Sponsors",
  partner: "Partners",
  supporter: "Supporters",
  "supporting-brand": "Supporting brands",
  "media-partner": "Media partners",
  advert: "Adverts",
};

export const GUIDE_ZONE_LABEL: Record<GuideZone, string> = {
  materials: "Materials Zone",
  "business-services": "Business & Service Zone",
  sustainability: "Sustainability Zone",
  furniture: "Furniture Zone",
  "green-artist": "Green Artist Area",
};

export const GUIDE_ZONES: GuideZone[] = [
  "materials",
  "business-services",
  "sustainability",
  "furniture",
  "green-artist",
];

export const GUIDE_TYPES: GuideType[] = [
  "exhibitor",
  "sponsor",
  "partner",
  "supporter",
  "supporting-brand",
  "media-partner",
  "advert",
];

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

/** Exhibitors use a photo only. A logo on an exhibitor is not shown. */
export function guideVisual(entry: GuideEntry): { src?: string; cover: boolean } {
  if (entry.type === "exhibitor") {
    return { src: entry.imageSrc, cover: Boolean(entry.imageSrc) };
  }
  return { src: entry.imageSrc ?? entry.logoSrc, cover: Boolean(entry.imageSrc) };
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
    entry.contact,
    ...(entry.emails ?? []),
    entry.phone,
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
    imageSrc: "/event/2026/materials/AltFashionFair-47.jpg",
    type: "exhibitor",
    zone: "materials",
    location: "Yamoussoukro, Ivory Coast",
    shortDescription: "Leather goods from Ivory Coast, including bags and smaller pieces made by hand.",
    about: ["Katoo maroquinerie makes leather goods, including bags and smaller pieces, by hand."],
    services: ["Leather goods", "Bags", "Small leather pieces", "Handmade work"],
    contact: "Touré Kadidiatou",
    emails: ["kadhymode@gmail.com", "Katoomode@gmail.com"],
  },
  {
    id: "bonwire-kente-weavers-association",
    name: "Bonwire Kente Weavers Association",
    imageSrc: "/event/2026/trade-images/bonwire.jpg",
    type: "exhibitor",
    zone: "materials",
    location: "Accra, Ghana",
    keywords: ["textile", "kente", "weaving"],
    shortDescription: "Handwoven kente from the Bonwire weavers, made on the loom for cloth and custom orders.",
    about: ["The Bonwire Kente Weavers Association brings together weavers who make kente by hand, for cloth and for custom orders."],
    services: ["Handwoven kente", "Custom cloth", "Weaving"],
    contact: "Wilberforce Okyere Marfo",
    emails: ["wilberforceokyeremarfo@gmail.com"],
  },
  {
    id: "maic-silk-farm",
    name: "MAIC Silk Farm",
    imageSrc: "/event/2026/materials/AltFashionFair-80.jpg",
    type: "exhibitor",
    zone: "materials",
    keywords: ["textile", "silk"],
    shortDescription: "Silk farming, raising silkworms and producing fibre for textile use.",
    about: ["MAIC Silk Farm raises silkworms and produces silk fibre for textile use."],
    services: ["Silk farming", "Cocoon production", "Silk fibre"],
    contact: "Mabel Asibi Charles",
    emails: ["asibicharles@me.com"],
  },
  {
    id: "david-adinkra-works-and-training",
    name: "David Adinkra Works & Training",
    imageSrc: "/event/2026/trade-images/david-adinkra.jpg",
    type: "exhibitor",
    zone: "materials",
    location: "Accra, Ghana",
    shortDescription: "Adinkra cloth and training in the symbols and the making of the cloth.",
    about: ["David Adinkra Works & Training makes adinkra cloth and trains people in the symbols and the making of the cloth."],
    services: ["Adinkra cloth", "Symbol work", "Training"],
    contact: "David Kwaku Boamah",
    emails: ["bdavid77@yahoo.com"],
  },
  {
    id: "edtex-textiles-ltd",
    name: "Edtex Textiles Ltd",
    imageSrc: "/event/2026/trade-images/edtex.jpg",
    type: "exhibitor",
    zone: "materials",
    keywords: ["textile"],
    shortDescription: "A textiles company supplying fabric for fashion and making.",
    about: ["Edtex Textiles Ltd supplies fabric for fashion and making."],
    services: ["Fabric", "Textile production", "Supply"],
    contact: "Edwina Assan",
    emails: ["edwina@edtexghana.com"],
  },
  {
    id: "adire-kho-nuh-sur",
    name: "Adire Kho-Nuh-Sur",
    imageSrc: "/event/2026/materials/AltFashionFair-96.jpg",
    type: "exhibitor",
    zone: "materials",
    keywords: ["textile", "adire"],
    shortDescription: "Adire cloth made with resist-dye methods.",
    about: ["Adire Kho-Nuh-Sur makes adire cloth with resist-dye methods."],
    services: ["Adire cloth", "Resist dyeing", "Textile"],
    contact: "Marie Opoku Adomako",
    emails: ["hello.sisimarie@gmail.com"],
  },
  {
    id: "godfrey-km-tietaah",
    name: "Godfrey K.M. Tietaah",
    imageSrc: "/event/2026/trade-images/godfrey.jpg",
    type: "exhibitor",
    zone: "materials",
    shortDescription: "Materials and making, shown on the fair floor.",
    about: ["Godfrey K.M. Tietaah shows materials and making on the fair floor."],
    services: ["Materials", "Making"],
    contact: "Faustina Melody Tietaah",
    emails: ["tmelody2000@gmail.com"],
  },
  {
    id: "the-gele-center",
    name: "The Gele Center",
    imageSrc: "/event/2026/materials/AltFashionFair-283.jpg",
    type: "exhibitor",
    zone: "materials",
    location: "Accra, Ghana / Abuja, Nigeria",
    links: [{ label: "Visit Website", href: "https://www.thegelecenter.com" }],
    shortDescription: "Custom autogele headwraps, made to colour and size, with turban tying.",
    about: ["The Gele Center makes custom autogele headwraps to a chosen colour and size, and offers turban tying."],
    services: ["Custom autogele", "Turban tying", "Made-to-order headwraps"],
    emails: ["jewelrybyjojo4@gmail.com"],
  },
  {
    id: "gi-exclusive-collection",
    name: "GI Exclusive Collection",
    imageSrc: "/event/2026/materials/AltFashionFair-510.jpg",
    type: "exhibitor",
    zone: "materials",
    shortDescription: "A finished collection shown on the materials floor.",
    about: ["GI Exclusive Collection shows a finished collection on the materials floor."],
    services: ["Collection pieces", "Finished goods"],
    contact: "Gifty Donkor",
  },
  {
    id: "sa-banderole-enterprise-limited",
    name: "Sa Banderole Enterprise Limited",
    imageSrc: "/event/2026/random/AltFashionFair-313.jpg",
    type: "exhibitor",
    zone: "materials",
    shortDescription: "A materials enterprise supplying work for fashion and making.",
    about: ["Sa Banderole Enterprise Limited supplies materials for fashion and making."],
    services: ["Materials", "Supply", "Made work"],
    emails: ["orwoahene@gmail.com"],
  },
  {
    id: "nuava-handmade",
    name: "Nuava handmade",
    imageSrc: "/event/2026/random/AltFashionFair-319.jpg",
    type: "exhibitor",
    zone: "materials",
    shortDescription: "Handmade pieces, made in small runs.",
    about: ["Nuava handmade makes pieces by hand, in small runs."],
    services: ["Handmade goods", "Small-run making", "Made-to-order pieces"],
  },
  {
    id: "suuraya-sarl",
    name: "Suuraya Sarl",
    imageSrc: "/event/2026/trade-images/suuraya-sarl.jpg",
    type: "exhibitor",
    zone: "materials",
    location: "Porto-Novo, Benin",
    shortDescription: "A heritage company from Benin, working with craft and material.",
    about: ["Suuraya Sarl is a heritage company from Benin, working with craft and material."],
    services: ["Heritage craft", "Materials", "Made goods"],
    contact: "Gnigla Rma Angela L.",
    emails: ["heritagetextilebenin@gmail.com"],
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
    emails: ["hello@jokconsultancy.com"],
  },
  {
    id: "raniel-freight-solutions",
    name: "Raniel Freight Solutions Ltd",
    imageSrc: "/event/2026/trade-images/RANIEL-BLUE.jpg",
    type: "exhibitor",
    zone: "business-services",
    location: "Tema, Ghana",
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
    links: [{ label: "Visit Website", href: "https://ranielfreightsolutions.com" }],
    keywords: ["logistics", "tema", "freight"],
    emails: ["ranielfreightsolutions@gmail.com"],
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
      { label: "Visit Website", href: "https://built.africa" },
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
    shortDescription: "A place for learning design, materials, and sustainability.",
    about: ["Kokrobite Institute is a place for learning design, materials, and sustainability."],
    services: ["Design education", "Workshops", "Sustainability"],
    contact: "Renée Nesblitt",
    emails: ["info@kokrobiteyinstitute.com"],
  },
  {
    id: "nubuke-foundation",
    name: "Nubuke Foundation",
    imageSrc: "/event/2026/random/AltFashionFair-86.jpg",
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
    links: [{ label: "Visit Website", href: "https://nubukefoundation.com" }],
    contact: "Odile Tevie",
    emails: ["i@nubukefoundation.org", "info@nubukegoundation.org"],
  },
  {
    id: "interior-design-and-decor-association",
    name: "Interior Design and Decor Association",
    imageSrc: "/event/2026/materials/AltFashionFair-88.jpg",
    type: "exhibitor",
    zone: "furniture",
    shortDescription: "An association for interior design and decor practices.",
    about: ["The Interior Design and Decor Association brings together practices in interior design and decor."],
    services: ["Interior design", "Decor", "Membership"],
    contact: "Audrey Forson",
    emails: ["msaudreyforson@gmail.com"],
  },
  {
    id: "tekura",
    name: "Tekura",
    imageSrc: "/event/2026/trade-images/tekura.jpg",
    type: "exhibitor",
    zone: "furniture",
    location: "Accra, Ghana",
    links: [{ label: "Visit Website", href: "https://tekuradesigns.com" }],
    shortDescription: "Contemporary furniture and decor, made by hand, including stools, tables, and smaller pieces for the home.",
    about: ["Tekura designs and makes contemporary furniture and decor. The range includes stools, tables, and smaller pieces for the home."],
    services: ["Furniture", "Stools and tables", "Decor", "Made-to-order pieces"],
    contact: "Audrey Forson",
    emails: ["msaudreyforson@gmail.com"],
  },
  {
    id: "national-association-of-handicraft-exporters",
    name: "National Association of Handicraft Exporters",
    imageSrc: "/event/2026/materials/AltFashionFair-576.jpg",
    type: "exhibitor",
    zone: "furniture",
    shortDescription: "An association for makers who export handicrafts.",
    about: ["The National Association of Handicraft Exporters is an association for makers who export handicrafts."],
    services: ["Handicraft export", "Maker membership", "Trade support"],
    contact: "Audrey Forson",
    emails: ["msaudreyforson@gmail.com"],
  },
  {
    id: "geez",
    name: "Geez",
    imageSrc: "/event/2026/trade-images/geez.jpg",
    type: "exhibitor",
    zone: "green-artist",
    location: "Accra, Ghana",
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
  {
    id: "aya-by-asabea",
    name: "AyA by asabea",
    type: "supporting-brand",
    logoSrc: "/tradeguide/aya.webp",
  },
  {
    id: "wrap-to-go",
    name: "Wrap to go (Mrs. Ngonadi)",
    type: "supporting-brand",
  },
  {
    id: "melange-africa",
    name: "Melange Africa",
    type: "media-partner",
    logoSrc: "/tradeguide/media/melange.png",
  },
  {
    id: "ameyawtv",
    name: "AmeyawTV",
    type: "media-partner",
    logoSrc: "/tradeguide/media/ameyaw.jpg",
  },
  {
    id: "fashion-ghana",
    name: "Fashion Ghana",
    type: "media-partner",
    logoSrc: "/tradeguide/media/fashionghana.png",
  },
  { id: "iamadinkra", name: "IamAdinkra", type: "advert", phone: "026 234 6572" },
  { id: "motivo-limited", name: "Motivo Limited", type: "advert", phone: "055 301 8172" },
  { id: "mhaxillian-concepts", name: "Mhaxillian Concepts", type: "advert", phone: "024 443 7799" },
];
