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

export default function Home() {
  return (
    <>
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
