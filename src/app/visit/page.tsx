import type { Metadata } from "next";
import Nav from "@/components/Nav";
import Ticker from "@/components/Ticker";
import EventDetails from "@/components/EventDetails";
import Footer from "@/components/Footer";
import VisitHero from "@/components/VisitHero";
import VisitBenefits from "@/components/VisitBenefits";
import VisitExperience from "@/components/VisitExperience";
import VisitRegisterForm from "@/components/VisitRegisterForm";
import { EVENT } from "@/lib/constants";

export const metadata: Metadata = {
  title: "Visit | Alt.FFF",
  description: `Plan your visit to ${EVENT.name}, ${EVENT.dates} at ${EVENT.venue}, ${EVENT.city}.`,
};

const VALUE_PROPS = [
  "Reliability You Can Count On",
  "A Focus on Quality",
  "Real Materials, Real Makers",
  "Three Days in Accra",
  EVENT.dates,
];

export default function VisitPage() {
  return (
    <>
      <Nav />
      <main>
        <VisitHero />
        <Ticker items={VALUE_PROPS} />
        <VisitBenefits />
        <VisitExperience />

        <section
          id="visit-register"
          aria-label="Register to visit"
          className="bg-paper px-6 py-20 md:px-16 md:py-28"
        >
          <div className="mx-auto max-w-2xl">
            <h2 className="font-display text-[clamp(1.8rem,4vw,3rem)] font-extrabold uppercase tracking-tight text-ink">
              Register to Visit
            </h2>
            <p className="mt-4 text-sm leading-relaxed text-indigo md:text-base">
              Fill in the form below to visit Alt.FFF. We look forward to
              meeting you — your badge will be emailed to you closer to the
              event.
            </p>
            <div className="mt-10">
              <VisitRegisterForm />
            </div>
          </div>
        </section>

        <EventDetails />
      </main>
      <Footer />
    </>
  );
}
