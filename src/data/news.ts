/**
 * News data access layer. No CMS on this project yet, so this reads from
 * the local NEWS_ARTICLES array below — but every component that needs
 * news data goes through the async functions at the bottom (getAllArticles,
 * getFeaturedArticle, getArticleBySlug, getLatestArticles), never the
 * array directly. That's deliberate: swapping the source for R2-hosted
 * JSON or a real CMS later means rewriting the bodies of those functions
 * only — no component that calls them needs to change, since they're
 * already being awaited as if they were remote calls.
 */

export type NewsCategory = "Announcement" | "Press" | "Materials" | "Partners" | "Event";

export interface NewsArticle {
  slug: string;
  title: string;
  category: NewsCategory;
  date: string; // ISO
  excerpt: string;
  image: string; // path under public/ — reusing existing site imagery, not a dedicated /news/ asset set yet
  body: string[]; // paragraphs
  featured?: boolean;
  externalUrl?: string; // if set, card links out instead of to /news/[slug]
}

// PLACEHOLDER CONTENT — every entry below is plausible-but-invented copy
// for a first build. Replace with real client-approved copy before launch.
const NEWS_ARTICLES: NewsArticle[] = [
  {
    slug: "alt-fff-2026-confirms-dates-and-venue",
    title: "Alt.FFF 2026 Confirms Dates and Venue",
    category: "Announcement",
    date: "2026-02-10",
    excerpt:
      "Ghana's first alternative fashion fabric fair returns September 17 to 19, 2026 at The Palms Convention Centre, La Palm Royal Beach Hotel, Accra.",
    image: "/materials/exhibition-bg.webp",
    body: [
      "Alt.FFF, Ghana's first alternative fashion fabric fair, has confirmed its dates and venue for 2026: September 17 to 19, at The Palms Convention Centre, La Palm Royal Beach Hotel, Accra.",
      "Over three days, the fair brings together manufacturers, material producers, designers and buyers from across the continent and beyond, spotlighting the fibres, dyes and finished textiles shaping the future of African fashion.",
      "Registration for exhibitors and sponsors is now open, with further programming details to follow in the coming months.",
    ],
    featured: true,
  },
  {
    slug: "exhibitor-registration-opens",
    title: "Exhibitor Registration Opens",
    category: "Announcement",
    date: "2026-02-17",
    excerpt:
      "Manufacturers and material producers across Africa can now apply for a booth at Alt.FFF 2026, with four package tiers to choose from.",
    image: "/materials/Finished-Materials/croc-jacket.jpg",
    body: [
      "Exhibitor registration for Alt.FFF 2026 is now open. Manufacturers, material producers and innovators working across Africa are invited to apply for a place on the trade floor.",
      "Four package tiers are available, from the Standard Booth up to the Premium Booth, alongside a dedicated Innovation Start-up Pod for smaller companies.",
      "Full package details and the application form are available on the Exhibiting page.",
    ],
  },
  {
    slug: "partners-and-collaborators-announced",
    title: "Partners and Collaborators Join Alt.FFF 2026",
    category: "Partners",
    date: "2026-03-03",
    excerpt:
      "Fashion Forum Africa welcomes Black Star Experience, MCPR Africa, and a growing list of collaborators supporting the fair's second edition.",
    image: "/people/person1.webp",
    body: [
      "Alt.FFF 2026 is backed by a growing roster of partners and collaborators. Black Star Experience joins as a lead partner alongside Fashion Forum Africa and MCPR Africa, bringing production and industry experience to the fair's programming.",
      "Collaborators supporting the fair include the Association of Ghana Industries, the National Commission on Culture, the Institute of Textiles & Fashion Professionals Ghana, and Ghana Culture Forum.",
      "Further partnership announcements are expected in the lead-up to September.",
    ],
  },
  {
    slug: "before-fashion-there-are-materials",
    title: "Before Fashion, There Are Materials",
    category: "Materials",
    date: "2026-03-17",
    excerpt:
      "Kente, natural dyes, raffia, leather, cotton, cowrie craft: a look at the raw materials Alt.FFF puts centre stage.",
    image: "/materials/Raw-Materials/leather_hides.jpg",
    body: [
      "Before a single garment is cut, there is a material — grown, woven, dyed or tanned somewhere on the continent. Alt.FFF exists to put those materials, and the people behind them, at the centre of the conversation.",
      "The fair's exhibitor floor spans strip-woven kente, resist-dyed indigo and adire, raffia fibre, tanned leather, raw cotton, and cowrie shell craft — six material families, each with its own regional story.",
      "Expect both raw material sourcing and finished-product innovation on display across the three days.",
    ],
  },
  {
    slug: "sponsorship-opportunities-announced",
    title: "Sponsorship Opportunities Announced",
    category: "Announcement",
    date: "2026-03-24",
    excerpt:
      "Brands can now back the future of African materials — sponsorship packages for Alt.FFF 2026 are live.",
    image: "/materials/kente-bg.webp",
    body: [
      "Alt.FFF has opened sponsorship opportunities for its 2026 edition. Sponsorship puts a brand behind the platform bridging African creativity with global commerce.",
      "Packages support everything from exhibitor programming to industry panels and immersive brand experiences on the fair floor.",
      "Full details and the sponsorship enquiry form are available on the Sponsorship page.",
    ],
  },
  {
    slug: "alt-fff-featured-in-african-fashion-press",
    title: "Alt.FFF Featured in African Fashion Press",
    category: "Press",
    date: "2026-04-02",
    excerpt: "Placeholder coverage entry — swap for a real press mention and link before launch.",
    image: "/materials/adire-bg.webp",
    body: [
      "PLACEHOLDER CONTENT — replace with a real excerpt or summary of the press coverage once a piece is confirmed.",
    ],
    // TODO: replace with the real external article URL once confirmed —
    // left as "#" (a safe no-op link) rather than an invented URL.
    externalUrl: "#",
  },
];

function sortByDateDesc(articles: NewsArticle[]): NewsArticle[] {
  return [...articles].sort((a, b) => b.date.localeCompare(a.date));
}

export async function getAllArticles(): Promise<NewsArticle[]> {
  return sortByDateDesc(NEWS_ARTICLES);
}

export async function getFeaturedArticle(): Promise<NewsArticle | undefined> {
  return NEWS_ARTICLES.find((a) => a.featured) ?? sortByDateDesc(NEWS_ARTICLES)[0];
}

export async function getArticleBySlug(slug: string): Promise<NewsArticle | undefined> {
  return NEWS_ARTICLES.find((a) => a.slug === slug);
}

export async function getLatestArticles(count: number): Promise<NewsArticle[]> {
  return sortByDateDesc(NEWS_ARTICLES).slice(0, count);
}
