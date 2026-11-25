import type { Metadata } from "next";
import Nav from "@/components/Nav";
import Footer from "@/components/Footer";
import GuideLogo from "@/components/GuideLogo";
import { acknowledgements, type Acknowledgement, type AcknowledgementLink } from "@/data/acknowledgements";
import { buildMetadata } from "@/lib/metadata";

export const metadata: Metadata = buildMetadata({
  title: "Acknowledgement | Alt.FFF",
  description: "Organisations acknowledged at Alt.FFF 2026, with their logos and contact details.",
  path: "/altfff2026/acknowledgement",
});

const listed = [...acknowledgements].sort((a, b) =>
  a.name.localeCompare(b.name, undefined, { sensitivity: "base" }),
);

function isSocialLink(link: AcknowledgementLink): boolean {
  return link.label === "Visit Website" || link.label === "Instagram" || link.label === "X";
}

function AcknowledgementCard({ entry }: { entry: Acknowledgement }) {
  const cover = Boolean(entry.logoSrc);
  const directLinks = entry.links?.filter((link) => !isSocialLink(link)) ?? [];
  const socialLinks = entry.links?.filter(isSocialLink) ?? [];
  const hasContact = Boolean(entry.emails?.length || entry.phone || entry.links?.length);

  return (
    <article className="flex h-full flex-col overflow-hidden rounded-2xl border border-ink/10 bg-white shadow-[0_1px_0_rgba(1,83,71,0.04)]">
      <div
        className={`flex shrink-0 overflow-hidden ${
          cover ? "h-52 bg-[#f3efe6]" : "h-44 items-center justify-center bg-white"
        }`}
      >
        <GuideLogo src={entry.logoSrc} name={entry.name} cover={cover} />
      </div>
      <div className="flex flex-1 flex-col px-4 pb-4 pt-3">
        <h2 className="font-display text-lg font-extrabold leading-tight tracking-tight text-ink">{entry.name}</h2>
        {hasContact ? (
          <div className="mt-1 flex flex-col">
            {entry.emails?.map((email) => (
              <a
                key={email}
                href={`mailto:${email}`}
                className="inline-flex py-0.5 text-sm leading-5 text-ink/75 hover:text-gold-deep"
              >
                {email}
              </a>
            ))}
            {directLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex py-0.5 text-sm leading-5 text-ink/75 hover:text-gold-deep"
              >
                {link.label}
              </a>
            ))}
            {entry.phone ? (
              <a
                href={`tel:${entry.phone.replace(/\s/g, "")}`}
                className="inline-flex py-0.5 text-sm leading-5 text-ink/75 hover:text-gold-deep"
              >
                {entry.phone}
              </a>
            ) : null}
            {socialLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex py-0.5 text-sm font-semibold leading-5 text-ink hover:text-gold-deep"
              >
                {link.label === "Visit Website" ? "Visit Website →" : link.label}
              </a>
            ))}
          </div>
        ) : null}
      </div>
    </article>
  );
}

export default function AcknowledgementPage() {
  return (
    <>
      <Nav />
      <main className="bg-paper px-6 pb-20 pt-32 md:px-16 md:pb-28 md:pt-40">
        <div className="mx-auto max-w-6xl">
          <h1 className="font-display text-[clamp(2.2rem,6vw,4rem)] font-extrabold uppercase leading-[1.02] tracking-tight text-ink">
            Acknowledgement
          </h1>
          <p className="mt-5 max-w-[60ch] text-base leading-relaxed text-ink/80 md:text-lg">
            Organisations acknowledged at Alt.FFF 2026.
          </p>
          <ul className="mt-12 grid list-none grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {listed.map((entry) => (
              <li key={entry.id} className="min-w-0">
                <AcknowledgementCard entry={entry} />
              </li>
            ))}
          </ul>
        </div>
      </main>
      <Footer />
    </>
  );
}
