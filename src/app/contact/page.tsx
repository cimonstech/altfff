import type { Metadata } from "next";
import Link from "next/link";
import Nav from "@/components/Nav";
import Footer from "@/components/Footer";
import ContactHero from "@/components/ContactHero";
import ContactForm from "@/components/ContactForm";
import ContactPhotoCard from "@/components/ContactPhotoCard";
import ContactStrip from "@/components/ContactStrip";
import ContactFAQ from "@/components/ContactFAQ";
import { SITE } from "@/lib/constants";

const TITLE = "Contact | Alt.FFF 2026";
const DESCRIPTION =
  "Get in touch with Alt.FFF — enquire about exhibiting, sponsoring, or visiting Ghana's first alternative fashion fabric fair, September 17 to 19, 2026 in Accra.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    images: [SITE.ogImage],
  },
};

export default function ContactPage() {
  return (
    <>
      <Nav />
      <main>
        <ContactHero />

        <section aria-label="Contact form" className="bg-paper px-6 py-20 md:px-16 md:py-28">
          <div className="mx-auto grid max-w-6xl gap-12 md:grid-cols-12">
            <div className="md:col-span-7">
              <ContactForm />
            </div>
            <div className="md:col-span-5">
              <ContactPhotoCard />
            </div>
          </div>
        </section>

        <ContactStrip />
        <ContactFAQ />

        {/* Closing band — no reusable one exists elsewhere on the site yet
            (Footer.tsx has its own inline newsletter block, not a
            standalone component), so this is a plain slim band matching
            the sponsorship page's closing-band pattern. */}
        <section aria-label="See you in Accra" className="bg-indigo px-6 py-14 text-paper md:px-16">
          <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-6 md:flex-row md:items-center">
            <p className="font-display text-xl font-extrabold uppercase tracking-tight md:text-2xl">
              See you in Accra. September 17 to 19, 2026.
            </p>
            <Link
              href="/visit"
              className="inline-flex shrink-0 items-center gap-2 rounded-full border border-gold bg-gold px-7 py-3.5 text-sm font-semibold text-paper transition-colors hover:border-gold-deep hover:bg-gold-deep"
            >
              Plan Your Visit
            </Link>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
