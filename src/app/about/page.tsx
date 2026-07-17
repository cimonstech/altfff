import type { Metadata } from "next";
import Nav from "@/components/Nav";
import AboutHero from "@/components/AboutHero";
import AboutIntro from "@/components/AboutIntro";
import AboutBlocks from "@/components/AboutBlocks";
import Partners from "@/components/Partners";
import Footer from "@/components/Footer";

export const metadata: Metadata = {
  title: "About | Alt.FFF",
  description:
    "Alt.FFF is a curated platform redefining the future of fashion by placing African materials at the centre of global design conversations.",
};

export default function AboutPage() {
  return (
    <>
      <Nav />
      <main>
        <AboutHero />
        <AboutIntro />
        <AboutBlocks />
        <Partners />
      </main>
      <Footer />
    </>
  );
}


