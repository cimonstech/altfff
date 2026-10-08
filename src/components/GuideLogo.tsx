"use client";

import { useState } from "react";

export function initialsFor(name: string): string {
  const skip = new Set(["the", "of", "and", "by", "for"]);
  const words = name.split(/\s+/).filter((word) => word && !skip.has(word.toLowerCase()));
  const letters = words
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase() ?? "")
    .join("");
  return letters || name.slice(0, 2).toUpperCase();
}

export default function GuideLogo({
  src,
  name,
  cover = false,
}: {
  src?: string;
  name: string;
  cover?: boolean;
}) {
  const [failed, setFailed] = useState(false);
  if (!src || failed) {
    return (
      <span className="flex h-full w-full items-center justify-center font-display text-2xl font-extrabold tracking-tight text-gold-deep">
        {initialsFor(name)}
      </span>
    );
  }
  return (
    <img
      src={src}
      alt=""
      className={cover ? "h-full w-full object-cover" : "max-h-24 w-auto max-w-[80%] object-contain"}
      onError={() => setFailed(true)}
    />
  );
}
