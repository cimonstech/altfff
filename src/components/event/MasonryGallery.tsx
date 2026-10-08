"use client";

import { useEffect, useState } from "react";

const FIRST_BATCH = 50;
const NEXT_BATCH = 30;

export default function MasonryGallery({ photos }: { photos: string[] }) {
  const [shown, setShown] = useState(Math.min(FIRST_BATCH, photos.length));
  const [active, setActive] = useState<number | null>(null);
  const visible = photos.slice(0, shown);
  const remaining = photos.length - shown;

  const close = () => setActive(null);
  const step = (direction: 1 | -1) => {
    setActive((current) => {
      if (current === null || photos.length === 0) return current;
      return (current + direction + photos.length) % photos.length;
    });
  };

  useEffect(() => {
    if (active === null) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") close();
      if (event.key === "ArrowRight") step(1);
      if (event.key === "ArrowLeft") step(-1);
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previous;
      document.removeEventListener("keydown", onKey);
    };
  }, [active, photos.length]);

  return (
    <div>
      <div className="columns-2 gap-3 md:columns-3 md:gap-4 lg:columns-4">
        {visible.map((src, index) => (
          <figure key={src} className="mb-3 break-inside-avoid md:mb-4">
            <button
              type="button"
              onClick={() => setActive(index)}
              className="block w-full cursor-zoom-in"
              aria-label={`View photograph ${index + 1} larger`}
            >
              <img
                src={src}
                alt={`Alt.FFF 2026 photograph ${index + 1}`}
                loading={index < 8 ? "eager" : "lazy"}
                className="block w-full bg-ink"
              />
            </button>
          </figure>
        ))}
      </div>

      {remaining > 0 && (
        <div className="mt-8 flex justify-center">
          <button
            type="button"
            onClick={() => setShown((count) => Math.min(photos.length, count + NEXT_BATCH))}
            className="inline-flex min-h-12 items-center rounded-full bg-ink px-6 text-sm font-semibold text-paper hover:opacity-90"
          >
            Load more
          </button>
        </div>
      )}

      {active !== null && (
        <div
          className="fixed inset-0 z-[80] flex items-center justify-center bg-black/92 p-4 md:p-10"
          role="dialog"
          aria-modal="true"
          aria-label="Photograph"
          onClick={close}
        >
          <button
            type="button"
            onClick={close}
            className="absolute right-4 top-4 inline-flex h-11 w-11 items-center justify-center text-2xl text-white"
            aria-label="Close"
          >
            ×
          </button>
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              step(-1);
            }}
            className="absolute left-2 top-1/2 inline-flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full border border-white/30 text-2xl text-white hover:bg-white/10 md:left-6"
            aria-label="Previous photograph"
          >
            ‹
          </button>
          <img
            src={photos[active]}
            alt=""
            onClick={(event) => event.stopPropagation()}
            className="max-h-[82vh] max-w-[calc(100vw-7rem)] object-contain"
          />
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              step(1);
            }}
            className="absolute right-2 top-1/2 inline-flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full border border-white/30 text-2xl text-white hover:bg-white/10 md:right-6"
            aria-label="Next photograph"
          >
            ›
          </button>
        </div>
      )}
    </div>
  );
}
