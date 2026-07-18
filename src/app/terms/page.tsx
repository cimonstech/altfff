import type { Metadata } from "next";
import Nav from "@/components/Nav";
import Footer from "@/components/Footer";
import TermsSections from "@/components/TermsSections";
import { buildMetadata } from "@/lib/metadata";

export const metadata: Metadata = buildMetadata({
  title: "Exhibitor Terms & Conditions - Alt.FFF 2026",
  description:
    "Payment terms, cancellation policy, and the exhibitor agreement for Alt.FFF 2026.",
  path: "/terms",
});

export default function TermsPage() {
  return (
    <>
      <Nav />
      <main>
        <section className="bg-gold px-6 pb-8 pt-32 text-paper md:px-16 md:pt-40">
          <h1 className="font-display text-[clamp(2.2rem,5vw,3.5rem)] font-extrabold uppercase leading-[1.02] tracking-tight">
            Terms &amp; Conditions
          </h1>
        </section>

        <TermsSections />
      </main>
      <Footer />
    </>
  );
}
