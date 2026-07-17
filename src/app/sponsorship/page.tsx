import type { Metadata } from "next";
import Nav from "@/components/Nav";
import Footer from "@/components/Footer";
import Partners from "@/components/Partners";
import SponsorshipHero from "@/components/SponsorshipHero";
import SponsorshipWhyItMatters from "@/components/SponsorshipWhyItMatters";
import SponsorshipBenefits from "@/components/SponsorshipBenefits";
import SponsorshipForm from "@/components/SponsorshipForm";
import SponsorshipSidebar from "@/components/SponsorshipSidebar";
import { SITE } from "@/lib/constants";

const TITLE = "Sponsorship | Alt.FFF 2026";
const DESCRIPTION =
  "Back Africa's first alternative fashion fabric fair. Partner with Alt.FFF to support African creatives, drive industry conversations, and align your brand with the future of fashion and manufacturing across the continent.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    images: [SITE.ogImage],
  },
};

export default function SponsorshipPage() {
  return (
    <>
      <Nav />
      <main>
        <SponsorshipHero />
        <SponsorshipWhyItMatters />
        <SponsorshipBenefits />

        {/* Same Partners component used site-wide (homepage, About,
            Exhibiting) - reusing it exactly rather than a bespoke
            monochrome treatment keeps the partner tier structure and
            Black Star Experience's prominence consistent everywhere. */}
        <Partners />

        <section
          id="sponsor-form"
          aria-label="Become a sponsor"
          className="bg-paper px-6 py-20 md:px-16 md:py-28"
        >
          <div className="mx-auto max-w-6xl">
            <h2 className="font-display text-[clamp(1.8rem,4vw,3rem)] font-extrabold uppercase tracking-tight text-ink">
              Become a Sponsor
            </h2>
            <p className="mt-4 max-w-[60ch] text-sm leading-relaxed text-indigo md:text-base">
              If you would like to make a meaningful impact on the future of
              manufacturing and fashion in Africa, complete the form below. A
              member of our team will be in touch shortly.
            </p>

            <div className="mt-12 grid gap-12 md:grid-cols-12">
              <div className="md:col-span-7">
                <SponsorshipForm />
              </div>
              <div className="md:col-span-5">
                <SponsorshipSidebar />
              </div>
            </div>
          </div>
        </section>

        {/* Closing band - madder, no animation needed. */}
        <section aria-label="Request the sponsorship deck" className="bg-madder px-6 py-16 text-paper md:px-16">
          <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-6 md:flex-row md:items-center">
            <h2 className="font-display text-2xl font-extrabold uppercase tracking-tight md:text-3xl">
              Request the sponsorship deck
            </h2>
            <a
              href="mailto:enquiries@altfff.com?subject=Alt.FFF%20Sponsorship%20Deck"
              className="inline-flex shrink-0 items-center gap-2 rounded-full border border-gold bg-gold px-7 py-3.5 text-sm font-semibold text-paper transition-colors hover:border-gold-deep hover:bg-gold-deep"
            >
              Email Us
            </a>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}


