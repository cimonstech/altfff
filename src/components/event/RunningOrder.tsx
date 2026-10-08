"use client";

import { useEffect, useState } from "react";
import { ChevronDown } from "lucide-react";
import type { DayChapter } from "@/data/altfff2026";

export type RunningChapter = DayChapter & { images: string[] };

function ChapterRow({
  chapter,
  index,
  cover,
  open,
  expandable,
}: {
  chapter: RunningChapter;
  index: number;
  cover?: string;
  open: boolean;
  expandable: boolean;
}) {
  return (
    <>
      <p className="font-display text-3xl font-extrabold leading-none tracking-tight text-ink/25">
        {String(index + 1).padStart(2, "0")}
      </p>
      <div className="min-w-0">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-gold-deep">
          {chapter.time}
          <span className="text-ink/35"> · </span>
          {chapter.place}
        </p>
        <div className="mt-2 flex items-start justify-between gap-4">
          <h3 className="font-display text-2xl font-extrabold uppercase leading-none tracking-tight md:text-3xl">
            {chapter.title}
          </h3>
          {expandable ? (
            <span
              className={`mt-0.5 inline-flex h-10 shrink-0 items-center gap-2 rounded-full border border-ink/20 px-3 text-[11px] font-semibold uppercase tracking-[0.14em] ${
                open ? "bg-ink text-paper" : "bg-white text-ink"
              }`}
            >
              {open ? "Close" : "Open"}
              <ChevronDown
                className={`h-4 w-4 transition-transform ${open ? "rotate-180" : ""}`}
                aria-hidden="true"
                strokeWidth={2}
              />
            </span>
          ) : null}
        </div>
        <p className="mt-3 max-w-[62ch] text-sm leading-relaxed text-ink/75">{chapter.summary}</p>
      </div>
      {cover ? (
        <img src={cover} alt="" className="aspect-[4/3] w-full object-cover" />
      ) : (
        <span className="hidden md:block" />
      )}
    </>
  );
}

export default function RunningOrder({ chapters }: { chapters: RunningChapter[] }) {
  const [openId, setOpenId] = useState<string | null>(null);

  useEffect(() => {
    const openFromHash = () => {
      const id = window.location.hash.replace("#", "");
      if (!id) return;
      if (id === "rooms") {
        setOpenId("fair");
        return;
      }
      if (id === "panels") {
        setOpenId("panel-one");
        return;
      }
      if (chapters.some((chapter) => chapter.id === id)) setOpenId(id);
    };
    const onClick = (event: MouseEvent) => {
      const anchor = (event.target as HTMLElement).closest("a[href^='#']");
      if (!anchor) return;
      const id = anchor.getAttribute("href")?.replace("#", "") ?? "";
      if (id === "rooms") setOpenId("fair");
      else if (id === "panels") setOpenId("panel-one");
      else if (chapters.some((chapter) => chapter.id === id)) setOpenId(id);
    };
    openFromHash();
    window.addEventListener("hashchange", openFromHash);
    document.addEventListener("click", onClick);
    return () => {
      window.removeEventListener("hashchange", openFromHash);
      document.removeEventListener("click", onClick);
    };
  }, [chapters]);

  return (
    <ol className="mx-auto mt-12 max-w-6xl border-t border-ink/15">
      {chapters.map((chapter, index) => {
        const hasPhotos = chapter.images.length > 0;
        const open = hasPhotos && openId === chapter.id;
        const cover = chapter.images[0];
        return (
          <li
            key={chapter.id}
            id={chapter.id}
            className="scroll-mt-16 border-b border-ink/15"
          >
            {chapter.id === "fair" && <span id="rooms" className="sr-only" />}
            {chapter.id === "panel-one" && <span id="panels" className="sr-only" />}
            {hasPhotos ? (
              <button
                type="button"
                aria-expanded={open}
                onClick={() => setOpenId(open ? null : chapter.id)}
                className="grid w-full cursor-pointer items-center gap-5 py-6 text-left hover:bg-ink/[0.03] md:grid-cols-[4.5rem_1fr_11rem] md:gap-8 md:py-7"
              >
                <ChapterRow chapter={chapter} index={index} cover={cover} open={open} expandable />
              </button>
            ) : (
              <div className="grid w-full items-center gap-5 py-6 text-left md:grid-cols-[4.5rem_1fr_11rem] md:gap-8 md:py-7">
                <ChapterRow chapter={chapter} index={index} cover={cover} open={false} expandable={false} />
              </div>
            )}

            {open && chapter.images.length > 0 && (
              <div className="grid gap-8 px-0 pb-8 md:grid-cols-[4.5rem_1fr] md:gap-8 md:pb-10">
                <span className="hidden md:block" />
                <div className="flex gap-3 overflow-x-auto pb-1">
                  {chapter.images.map((src) => (
                    <img
                      key={src}
                      src={src}
                      alt=""
                      className="h-44 w-auto shrink-0 bg-ink object-cover md:h-56"
                    />
                  ))}
                </div>
              </div>
            )}
          </li>
        );
      })}
    </ol>
  );
}
