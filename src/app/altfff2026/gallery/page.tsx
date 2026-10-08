import type { Metadata } from "next";
import Altfff2026Gallery from "@/components/event/Altfff2026Gallery";
import { buildMetadata } from "@/lib/metadata";

export const metadata: Metadata = buildMetadata({
  title: "Gallery - Alt.FFF 2026",
  description: "Photographs from Alt.FFF 2026. Stand-in images until the fair set is published.",
  path: "/altfff2026/gallery",
});

export default function Altfff2026GalleryPage() {
  return (
    <main>
      <Altfff2026Gallery />
    </main>
  );
}
