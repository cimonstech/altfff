import type { Metadata } from "next";
import Nav from "@/components/Nav";
import Footer from "@/components/Footer";

export const metadata: Metadata = {
  title: "Terms & Conditions | Alt.FFF",
};

/**
 * Placeholder page - the footer links here needed a real route rather than
 * a dead link, but the actual terms copy hasn't been supplied yet. Replace
 * this body with the real text once Fashion Forum Africa provides it; do
 * not treat the current paragraph as legally meaningful.
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
      </main>
      <Footer />
    </>
  );
}
