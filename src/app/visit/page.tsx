import type { Metadata } from "next";
import Nav from "@/components/Nav";
import EventDetails from "@/components/EventDetails";
import Footer from "@/components/Footer";
import VisitHero from "@/components/VisitHero";
import { EVENT } from "@/lib/constants";

export const metadata: Metadata = {
  title: "Visit | Alt.FFF",
  description: `Plan your visit to ${EVENT.name}, ${EVENT.dates} at ${EVENT.venue}, ${EVENT.city}.`,
};

export default function VisitPage() {
  return (
    <>
      <Nav />
      <main>
        <VisitHero />
        <EventDetails />
      </main>
      <Footer />
    </>
  );
}
