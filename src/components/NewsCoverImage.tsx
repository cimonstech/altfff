"use client";

import Image from "next/image";

/**
 * Renders a news post's cover image, choosing next/image (real
 * optimization - resizing, lazy loading, format conversion) when the URL is
 * on our own R2 domain, or a plain <img> fallback otherwise.
 *
 * `r2PublicUrl` is passed down from the server (R2_PUBLIC_URL isn't
 * NEXT_PUBLIC_-prefixed, so this client component can't read it directly)
 * rather than duplicating it under a new public env var. Any cover image
 * predating uploads (an old external test URL, not one of ours) still
 * renders correctly via the plain <img> path instead of breaking the page -
 * next/image would otherwise reject any domain not in next.config.ts's
 * images.remotePatterns.
 */
export default function NewsCoverImage({
  src,
  alt,
  r2PublicUrl,
  objectClassName = "object-cover",
  sizes,
  priority,
}: {
  src: string;
  alt: string;
  r2PublicUrl: string;
  objectClassName?: string;
  sizes: string;
  priority?: boolean;
}) {
  const isOwnUpload = r2PublicUrl.length > 0 && src.startsWith(r2PublicUrl);

  if (isOwnUpload) {
    return <Image src={src} alt={alt} fill sizes={sizes} className={objectClassName} priority={priority} />;
  }

  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} alt={alt} className={`absolute inset-0 h-full w-full ${objectClassName}`} />;
}
