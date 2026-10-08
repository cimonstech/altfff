import type { Metadata } from "next";
import Nav from "@/components/Nav";
import Footer from "@/components/Footer";
import TradeShowGuide from "@/components/TradeShowGuide";
import { buildMetadata } from "@/lib/metadata";

export const metadata: Metadata = buildMetadata({
  title: "Trade Show Guide - Alt.FFF",
  description: "A searchable directory of the businesses, makers and organisations that joined Alt.FFF 2026.",
  path: "/trade-show-guide",
});

export default function TradeShowGuidePage() {
  return (
    <>
      <Nav />
      <main>
        <TradeShowGuide />
      </main>
      <Footer />
    </>
  );
}
