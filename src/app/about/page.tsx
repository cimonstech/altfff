import type { Metadata } from "next";
import Nav from "@/components/Nav";
import AboutHero from "@/components/AboutHero";
import AboutIntro from "@/components/AboutIntro";
import AboutBlocks from "@/components/AboutBlocks";
import Partners from "@/components/Partners";
import Footer from "@/components/Footer";
import { buildMetadata } from "@/lib/metadata";

export const metadata: Metadata = buildMetadata({
  title: "About Alt.FFF - Where Materials Speak Before Fashion",
  description:
    "Alt.FFF is a curated platform redefining the future of fashion by placing African materials at the centre of global design conversations.",
  path: "/about",
});

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


