"use client";

import { useRef, useState } from "react";
import Image from "next/image";

const VISIBLE = 5;
const TILTS = [11, 4, -3, -9, -14];
const SHIFTS = [10, -4, -14, 2, -22];

/** Eight portraits in a polaroid stack. Drag or use the arrows to slide. */
export default function SlidingPortraits({ frames }: { frames: string[] }) {
  const [index, setIndex] = useState(0);
  const [dragX, setDragX] = useState(0);
  const startX = useRef<number | null>(null);
  const count = frames.length;

  const step = (direction: 1 | -1) => {
    setIndex((current) => (current + direction + count) % count);
    setDragX(0);
  };

  const onPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    startX.current = event.clientX;
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const onPointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (startX.current === null) return;
    setDragX(event.clientX - startX.current);
  };

  const onPointerUp = () => {
    if (startX.current === null) return;
    if (dragX <= -48) step(1);
    else if (dragX >= 48) step(-1);
    else setDragX(0);
    startX.current = null;
  };

  const visible = Array.from({ length: Math.min(VISIBLE, count) }, (_, offset) => {
    const frameIndex = (index + offset) % count;
    return { src: frames[frameIndex], offset, frameIndex };
  });

  return (
    <div className="flex shrink-0 flex-col items-center gap-3">
      <div
        className="relative h-[220px] w-[250px] touch-pan-y cursor-grab select-none active:cursor-grabbing sm:h-[270px] sm:w-[300px] md:h-[320px] md:w-[360px]"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        role="group"
        aria-roledescription="carousel"
        aria-label="Fair portraits"
      >
        {visible.map((card) => {
          const isFront = card.offset === 0;
          const pull = isFront ? dragX : 0;
          return (
            <div
              key={card.src}
              className="absolute left-1/2 top-1/2 w-[128px] overflow-hidden border-[7px] border-white bg-white shadow-[0_16px_36px_rgba(0,0,0,0.45)] sm:w-[148px] md:w-[168px]"
              style={{
                transform: `translate(calc(-50% + ${SHIFTS[card.offset] + pull}px), -54%) rotate(${TILTS[card.offset] + pull / 25}deg)`,
                zIndex: isFront ? 20 : VISIBLE - card.offset,
                transition: startX.current === null ? "transform 280ms ease" : "none",
              }}
            >
              <div className="relative aspect-[3/4] w-full">
                <Image src={card.src} alt="" fill sizes="180px" className="object-cover" draggable={false} />
              </div>
            </div>
          );
        })}
      </div>
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => step(-1)}
          className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/30 text-lg text-white hover:bg-white/10"
          aria-label="Previous portrait"
        >
          ‹
        </button>
        <p className="min-w-12 text-center text-[11px] tracking-[0.16em] text-white/70">
          {index + 1} / {count}
        </p>
        <button
          type="button"
          onClick={() => step(1)}
          className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/30 text-lg text-white hover:bg-white/10"
          aria-label="Next portrait"
        >
          ›
        </button>
      </div>
    </div>
  );
}
