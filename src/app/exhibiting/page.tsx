import type { Metadata } from "next";
import Nav from "@/components/Nav";
import ExhibitingHero from "@/components/ExhibitingHero";
import Ticker from "@/components/Ticker";
import ExhibitingReasons from "@/components/ExhibitingReasons";
import ExhibitingRegister from "@/components/ExhibitingRegister";
import Quote from "@/components/Quote";
import Footer from "@/components/Footer";

const TICKER_ITEMS = ["Exhibition", "Trade", "Commercial Design", "Africa", "Exhibit"];

export const metadata: Metadata = {
  title: "Exhibiting | Alt.FFF",
  description:
    "Exhibiting at Alt.FFF places your brand at the centre of one of the most exciting conversations in fashion, manufacturing, and African creative enterprise.",
};

export default function ExhibitingPage() {
  return (
    <>
      <Nav />
      <main>
        <ExhibitingHero />
        <Ticker items={TICKER_ITEMS} />
        <ExhibitingReasons />
        <ExhibitingRegister />
        <Quote
          dark
          quote="Africa has the talent, the resources, the craftsmanship."
          attribution="Visiting David Whiteheads Textiles"
          image={{
            src: "/materials/Finished-Materials/croc-jacket.jpg",
            alt: "Finished leather jacket, embossed pattern detail",
          }}
        />
      </main>
      <Footer />
    </>
  );
}
