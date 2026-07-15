import Nav from "@/components/Nav";
import Hero from "@/components/Hero";
import Ticker from "@/components/Ticker";
import Stats from "@/components/Stats";
import Materials from "@/components/Materials";
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
        <Hero />
        <Ticker />
        <Stats />
        <Materials />
        <Manifesto />
        <Quote />
        <EventDetails />
        <Partners />
      </main>
      <Footer />
    </>
  );
}
