import type { Metadata } from "next";
import Nav from "@/components/Nav";
import Footer from "@/components/Footer";
import TermsSections from "@/components/TermsSections";

export const metadata: Metadata = {
  title: "Terms & Conditions | Alt.FFF",
};

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
