// components/programme/ui.tsx
'use client';

import styles from '@/styles/programme.module.css';

export function GlassCard({
  children,
  strong = false,
  className = '',
  style,
  onClick,
}: {
  children: React.ReactNode;
  strong?: boolean;
  className?: string;
  style?: React.CSSProperties;
  onClick?: () => void;
}) {
  return (
    <div
      className={`${strong ? styles.glassStrong : styles.glass} ${className}`}
      style={style}
      onClick={onClick}
    >
      {children}
    </div>
  );
}

export function ChevronIcon({ open }: { open: boolean }) {
  return (
    <svg
      className={`${styles.chevron} ${open ? styles.chevronOpen : ''}`}
      viewBox="0 0 20 20"
      fill="none"
    >
      <path
        d="M5 7.5L10 12.5L15 7.5"
        stroke="#F3ECE0"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  );
}

/** Logo with graceful fallback to initials if the image 404s (e.g. asset not uploaded yet). */
export function LogoImage({
  src,
  alt,
  fallbackText,
  wrapClassName,
}: {
  src: string;
  alt: string;
  fallbackText: string;
  wrapClassName: string;
}) {
  return (
    <div className={wrapClassName}>
      {/* Plain <img> so onError fallback works; logos keep their natural shape. */}
      <img
        src={src}
        alt={alt}
        onError={(e) => {
          const target = e.currentTarget;
          target.style.display = 'none';
          const fallback = target.nextElementSibling as HTMLElement | null;
          if (fallback) fallback.style.display = 'block';
        }}
      />
      <span className={styles.logoFallback}>{fallbackText}</span>
    </div>
  );
}
