import type { Metadata } from "next";
import Altfff2026Issue from "@/components/event/Altfff2026Issue";
import { HERO_LANDSCAPE } from "@/data/altfff2026";
import { buildMetadata } from "@/lib/metadata";
import { EVENT } from "@/lib/constants";

export const metadata: Metadata = buildMetadata({
  title: "Alt.FFF 2026",
  description: `The Alt.FFF 2026 issue. One day at ${EVENT.venue}. ${EVENT.dates}.`,
  path: "/altfff2026",
  image: HERO_LANDSCAPE,
});

export default function Altfff2026Page() {
  return (
    <main>
      <Altfff2026Issue />
    </main>
  );
}
