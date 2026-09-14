import type { Metadata } from "next";
import Nav from "@/components/Nav";
import Footer from "@/components/Footer";
// import TermsSections from "@/components/TermsSections";
import { buildMetadata } from "@/lib/metadata";

export const metadata: Metadata = buildMetadata({
  title: "Terms & Conditions | Alt.FFF",
  description:
    "Terms and conditions for Alt.FFF. A full policy is being finalised and will be published here ahead of the event.",
  path: "/terms",
});

/**
 * Placeholder page — matches the privacy policy layout. The full exhibitor
 * terms content (TermsSections) is commented out below until final copy is
 * confirmed; restore it when ready.
 */
export default function TermsPage() {
  return (
    <>
      <Nav />
      <main>
        <section className="bg-paper px-6 pb-20 pt-32 md:px-16 md:pt-40">
          <div className="mx-auto max-w-[65ch]">
            <h1 className="font-display text-[clamp(2rem,5vw,3.5rem)] font-extrabold uppercase leading-tight tracking-tight text-ink">
              Terms &amp; Conditions
            </h1>
            <p className="mt-6 text-base leading-relaxed text-indigo">
              This page is a placeholder. Full terms and conditions for
              Alt.FFF are being finalised and will be published here ahead of
              the event.
            </p>
          </div>
        </section>

        {/* <section className="bg-gold px-6 pb-8 pt-32 text-paper md:px-16 md:pt-40">
          <h1 className="font-display text-[clamp(2.2rem,5vw,3.5rem)] font-extrabold uppercase leading-[1.02] tracking-tight">
            Terms &amp; Conditions
          </h1>
        </section>
        <TermsSections /> */}
      </main>
      <Footer />
    </>
  );
}
