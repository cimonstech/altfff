/**
 * JSON-LD structured data. Metadata only - every export here renders a
 * single invisible <script type="application/ld+json"> tag, never any
 * visible markup. Server components (no "use client"), so these render
 * directly into the initial HTML.
 */

import { EVENT } from "@/lib/constants";

const ORGANIZATION_SCHEMA = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "Alternative Fashion Fabric Fair",
  alternateName: "Alt.FFF",
  url: "https://www.altfff.com",
  logo: "https://www.altfff.com/Afff_icon.png",
  description:
    "Alternative Fashion Fabric Fair is a curated platform redefining the future of fashion by placing African materials at the centre of global design conversations.",
  email: "enquiries@altfff.com",
  telephone: "+233541177573",
  address: {
    "@type": "PostalAddress",
    addressLocality: "Accra",
    addressCountry: "GH",
  },
  sameAs: [
    "https://www.instagram.com/fashionforumafrica",
    "https://www.facebook.com/share/1D3VYeEFrR/",
  ],
};

const WEBSITE_SCHEMA = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: "Alt.FFF",
  url: "https://www.altfff.com",
  description: `Where materials speak before fashion. Alt.FFF is Ghana's first alternative fashion fabric fair, taking place ${EVENT.dates} in Accra.`,
  inLanguage: "en",
  // No potentialAction/SearchAction - the site has no working search
  // functionality.
};

const EVENT_SCHEMA = {
  "@context": "https://schema.org",
  "@type": "Event",
  name: "Alternative Fashion Fabric Fair 2026",
  startDate: `${EVENT.startDate}T09:00:00+00:00`,
  endDate: `${EVENT.endDate}T20:00:00+00:00`,
  eventStatus: "https://schema.org/EventScheduled",
  eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
  location: {
    "@type": "Place",
    name: EVENT.venue,
    address: {
      "@type": "PostalAddress",
      streetAddress: "La Palm Royal Beach Hotel",
      addressLocality: "Accra",
      addressCountry: "GH",
    },
  },
  description:
    "Where materials speak before fashion. A curated one-day trade fair repositioning African materials at the centre of fashion thinking, showcasing raw, processed, and semi-processed fibres, fabrics, and textile innovations from across the continent.",
  organizer: {
    "@type": "Organization",
    name: "Fashion Forum Africa",
    url: "https://www.altfff.com",
  },
  // No offers - registration isn't backed by a live ticketing/payment
  // system yet; adding fake offer data would misrepresent the event.
  // No image - no obvious, confirmed hero image URL to use yet.
};

/** Organization + WebSite schemas - mounted once in the root layout so they
 * render on every page. */
export function GlobalStructuredData() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(ORGANIZATION_SCHEMA) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(WEBSITE_SCHEMA) }}
      />
    </>
  );
}

/** Event schema - mounted on the homepage and /visit, the two pages that
 * represent the event itself. */
export function EventStructuredData() {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(EVENT_SCHEMA) }}
    />
  );
}
