import fs from "node:fs";
import path from "node:path";

/** Public paths for every downloaded 2026 fair photograph, numeric order. */
export function listFairPhotos(): string[] {
  const dir = path.join(process.cwd(), "public", "gallery", "2026");
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter((name) => /\.jpe?g$/i.test(name))
    .sort((a, b) => numberIn(a) - numberIn(b))
    .map((name) => `/gallery/2026/${name}`);
}

function numberIn(name: string): number {
  const match = name.match(/(\d+)/);
  return match ? Number(match[1]) : 0;
}

/** Photographs dropped in public/event/2026/<folder>. `cover` is shown first. */
export function listEventFolder(folder: string, cover?: string): string[] {
  const dir = path.join(process.cwd(), "public", "event", "2026", folder);
  if (!fs.existsSync(dir)) return [];
  const names = fs
    .readdirSync(dir)
    .filter((name) => /\.jpe?g$/i.test(name))
    .sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" }));
  const paths = names.map((name) => `/event/2026/${folder}/${encodeURIComponent(name)}`.replace(/%2F/g, "/"));
  if (!cover) return paths;
  const coverPath = `/event/2026/${folder}/${cover}`;
  if (!paths.includes(coverPath)) return paths;
  return [coverPath, ...paths.filter((item) => item !== coverPath)];
}
