import Image from "next/image";
import Link from "next/link";
import EventMasthead from "@/components/event/EventMasthead";
import MasonryGallery from "@/components/event/MasonryGallery";
import { HERO_LANDSCAPE } from "@/data/altfff2026";
import { listFairPhotos } from "@/lib/fairGallery";

export default function Altfff2026Gallery() {
  const photos = listFairPhotos();

  return (
    <article className="bg-white text-ink">
      <div className="relative isolate overflow-hidden bg-[#015347] text-white">
        <Image src={HERO_LANDSCAPE} alt="" fill priority className="object-cover" sizes="100vw" />
        <div className="absolute inset-0 bg-[#015347]/70" aria-hidden="true" />
        <div className="relative">
          <EventMasthead centered />
          <div className="px-5 pb-14 pt-2 text-center md:pb-20 md:pt-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-white/70">Alt.FFF 2026</p>
            <h1 className="mt-3 font-display text-[clamp(3.5rem,12vw,8rem)] font-extrabold uppercase leading-[0.82] tracking-[-0.04em]">
              Gallery
            </h1>
            <p className="mx-auto mt-6 max-w-[42ch] text-sm leading-relaxed text-white/80 md:text-base">
              Photographs from the fair. Tap one to see it large.
            </p>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-4 py-8 md:px-8 md:py-12">
        <MasonryGallery photos={photos} />
      </div>

      <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-ink/10 px-5 py-6 text-[11px] uppercase tracking-[0.16em] text-ink/50 md:px-10">
        <Link href="/altfff2026" className="hover:text-ink">
          Back to the 2026 issue
        </Link>
        <p>Gallery · Alt.FFF 2026</p>
      </footer>
    </article>
  );
}
