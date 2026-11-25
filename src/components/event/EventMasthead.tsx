import Image from "next/image";
import Link from "next/link";

const LEFT = [
  { label: "Home", href: "/" },
  { label: "Gallery", href: "/altfff2026/gallery" },
];

const RIGHT = [
  { label: "Trade Guide", href: "/trade-show-guide" },
  { label: "Acknowledgement", href: "/altfff2026/acknowledgement" },
];

const LINKS = [...LEFT, ...RIGHT];

/** Masthead shared by the 2026 issue and its gallery. Sits on the green field. */
export default function EventMasthead({ centered = false }: { centered?: boolean }) {
  const linkClass =
    "inline-flex min-h-11 items-center text-[11px] font-medium uppercase tracking-[0.18em] text-white/80 transition-colors hover:text-white";

  if (centered) {
    return (
      <header className="flex flex-col items-center gap-2 px-5 py-5 text-center md:py-6">
        <Link href="/altfff2026" aria-label="Alt.FFF 2026">
          <Image
            src="/alt-fff-logo-white.png"
            alt=""
            width={715}
            height={565}
            className="h-8 w-auto md:h-10"
            priority
          />
        </Link>
        <nav aria-label="Issue" className="flex flex-wrap items-center justify-center gap-x-5">
          {LINKS.map((item) => (
            <Link key={item.href} href={item.href} className={linkClass}>
              {item.label}
            </Link>
          ))}
        </nav>
      </header>
    );
  }

  return (
    <header className="flex items-center justify-between gap-4 px-5 py-4 md:px-8 md:py-5">
      <nav aria-label="Issue" className="flex min-w-0 items-center gap-4 md:gap-6">
        {LEFT.map((item) => (
          <Link key={item.href} href={item.href} className={linkClass}>
            {item.label}
          </Link>
        ))}
      </nav>
      <Link href="/altfff2026" className="shrink-0" aria-label="Alt.FFF 2026">
        <Image
          src="/alt-fff-logo-white.png"
          alt=""
          width={715}
          height={565}
          className="h-8 w-auto md:h-10"
          priority
        />
      </Link>
      <nav aria-label="Event" className="flex items-center justify-end gap-4 md:gap-6">
        {RIGHT.map((item) => (
          <Link key={item.href} href={item.href} className={linkClass}>
            {item.label}
          </Link>
        ))}
      </nav>
    </header>
  );
}
