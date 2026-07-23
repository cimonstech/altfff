import type { Metadata } from "next";
import Nav from "@/components/Nav";
import Hero from "@/components/Hero";
import HeroMobile from "@/components/HeroMobile";
import Ticker from "@/components/Ticker";
import Stats from "@/components/Stats";
import Manifesto from "@/components/Manifesto";
import Quote from "@/components/Quote";
import EventDetails from "@/components/EventDetails";
import Partners from "@/components/Partners";
import Footer from "@/components/Footer";
import { EventStructuredData } from "@/components/structured-data";
import { buildMetadata } from "@/lib/metadata";

// Title kept exactly as previously specified - not overwritten by this
// metadata pass, per instruction.
export const metadata: Metadata = buildMetadata({
  title: "Before Fashion, There are Materials",
  description:
    "Where materials speak before fashion. Three days of fibres, dyes, weaves and the people behind them - Accra, 17- 19, Sept 2026.",
  path: "/",
});

export default function Home() {
  return (
    <>
      <EventStructuredData />
      <Nav />
      <main>
        <div className="hidden md:block">
          <Hero />
        </div>
        <div className="md:hidden">
          <HeroMobile />
        </div>
        <Ticker className="hidden md:block" />
        <Stats />
        <Manifesto />
        <EventDetails />
        <Quote />
        <Partners />
      </main>
      <Footer />
    </>
  );
}


