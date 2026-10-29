import Image from "next/image";
import Link from "next/link";
import EventMasthead from "@/components/event/EventMasthead";
import RunningOrder from "@/components/event/RunningOrder";
import SlidingPortraits from "@/components/event/SlidingPortraits";
import { EVENT } from "@/lib/constants";
import { listEventFolder } from "@/lib/fairGallery";
import {
  DAY_CHAPTERS,
  FAIR_STATS,
  HERO_PORTRAITS,
  ISSUE_QUOTE,
} from "@/data/altfff2026";

const HERO_BACKGROUND = "/event/2026/random/AltFashionFair-313.jpg";

const CHAPTER_LINKS = [
  { label: "Opening", href: "#opening" },
  { label: "Trade Fair", href: "#fair" },
  { label: "Panels", href: "#panels" },
  { label: "Workshops", href: "#workshops" },
  { label: "Rooms", href: "#rooms" },
  { label: "Gallery", href: "/altfff2026/gallery" },
];

export default function Altfff2026Issue() {
  const chapters = DAY_CHAPTERS.map((chapter) => ({
    ...chapter,
    images: chapter.folder ? listEventFolder(chapter.folder, chapter.cover) : [],
  }));
  const statPhotos = listEventFolder("materials");

  return (
    <article>
      <section className="relative isolate overflow-hidden bg-[#015347] text-white">
        <Image src={HERO_BACKGROUND} alt="" fill priority className="object-cover" sizes="100vw" />
        <div className="absolute inset-0 bg-[#015347]/70" aria-hidden="true" />
        <div className="relative">
        <EventMasthead />

        <div className="overflow-hidden px-4 pb-6 pt-4 md:px-8 md:pb-8 md:pt-6">
          <h1 className="flex flex-col items-center justify-center gap-2 lg:flex-row lg:gap-4">
            <span className="font-display text-[22vw] font-extrabold leading-[0.78] tracking-[-0.04em] lg:text-[12vw]">
              Alt.
            </span>
            <SlidingPortraits frames={HERO_PORTRAITS} />
            <span className="font-display text-[22vw] font-extrabold uppercase leading-[0.78] tracking-[-0.04em] lg:text-[12vw]">
              FFF
            </span>
          </h1>
        </div>

        <div className="grid gap-6 px-5 pb-8 md:grid-cols-2 md:px-10 md:pb-10">
          <p className="max-w-[36ch] text-sm leading-relaxed text-white/75 md:text-[15px]">
            Ghana&apos;s first alternative fashion fabric fair. Fibres, dyes, weaves, and the
            manufacturers filled the room for one Saturday, from the opening to the close.
          </p>
          <p className="text-sm leading-relaxed text-white/75 md:text-right md:text-[15px]">
            {EVENT.venue}
          </p>
        </div>

        </div>
      </section>

      <nav aria-label="In this issue" className="sticky top-0 z-40 border-y border-white/10 bg-[#015347] text-white">
        <ul className="flex gap-1 overflow-x-auto px-3 py-1 md:grid md:grid-cols-6 md:px-6">
          {CHAPTER_LINKS.map((item) => (
            <li key={item.href} className="min-w-[7.5rem] flex-1 md:min-w-0">
              <Link
                href={item.href}
                className="flex min-h-11 items-center justify-center px-2 text-center text-[11px] font-medium uppercase tracking-[0.16em] text-white/80 hover:text-white"
              >
                {item.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      <section className="bg-white px-5 pb-4 pt-16 text-ink md:px-10 md:pt-24">
        <div className="mx-auto max-w-6xl">
          <h2 className="font-display text-[clamp(2.4rem,6vw,4.5rem)] font-extrabold uppercase leading-[0.9] tracking-tight">
            The day
            <br />
            in numbers
          </h2>
          <dl className="mt-8 grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
            {FAIR_STATS.map((stat, index) => (
              <div key={stat.label} className="relative min-h-36 overflow-hidden bg-[#015347] text-white">
                {statPhotos[index] && (
                  <img src={statPhotos[index]} alt="" className="absolute inset-0 h-full w-full object-cover" />
                )}
                <div className="absolute inset-0 bg-[#015347]/72" />
                <div className="relative flex h-full min-h-36 flex-col justify-end p-4">
                  <dd className="font-display text-4xl font-extrabold leading-none md:text-5xl">{stat.value}</dd>
                  <dt className="mt-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-white/80">
                    {stat.label}
                  </dt>
                </div>
              </div>
            ))}
          </dl>
        </div>
      </section>

      <section className="bg-white px-5 py-16 text-ink md:px-10 md:py-24">
        <div className="mx-auto grid max-w-6xl gap-8 md:grid-cols-[1.1fr_0.9fr] md:items-end">
          <h2 className="font-display text-[clamp(2.4rem,6vw,4.5rem)] font-extrabold uppercase leading-[0.9] tracking-tight">
            The running
            <br />
            order
          </h2>
          <p className="max-w-[42ch] text-sm leading-relaxed text-ink/70 md:justify-self-end md:text-right md:text-base">
            {EVENT.tradeFairDateLabel}. Doors {EVENT.doorsOpenTime}. Open a section for the
            photographs from that part of the day.
          </p>
        </div>

        <RunningOrder chapters={chapters} />
      </section>

      <section className="bg-ink px-5 py-16 text-paper md:px-10 md:py-24">
        <div className="mx-auto grid max-w-6xl gap-10 md:grid-cols-[1.3fr_0.7fr] md:items-end">
          <blockquote>
            <p className="font-display text-[clamp(1.8rem,4vw,3.2rem)] font-extrabold uppercase leading-[0.95] tracking-tight">
              {ISSUE_QUOTE.text}
            </p>
            <footer className="mt-6 text-sm text-paper/70">
              {ISSUE_QUOTE.attribution}
              <span className="mt-1 block text-paper/50">{ISSUE_QUOTE.role}</span>
            </footer>
          </blockquote>
          <div>
            <p className="text-sm leading-relaxed text-paper/75">
              More of the day is in the gallery.
            </p>
            <Link
              href="/altfff2026/gallery"
              className="mt-6 inline-flex min-h-12 items-center rounded-full bg-gold px-6 text-sm font-semibold text-ink hover:opacity-90"
            >
              Open the 2026 gallery
            </Link>
          </div>
        </div>
      </section>

      <footer className="flex flex-wrap items-center justify-between gap-3 bg-white px-5 py-6 text-[11px] uppercase tracking-[0.16em] text-ink/50 md:px-10">
        <p>Alt.FFF 2026</p>
        <p>{EVENT.tradeFairDateLabel}</p>
        <Link href="/" className="hover:text-ink">
          Back to the fair
        </Link>
      </footer>
    </article>
  );
}
