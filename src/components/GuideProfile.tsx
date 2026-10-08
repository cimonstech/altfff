import type { ReactNode } from "react";
import Link from "next/link";
import GuideLogo from "@/components/GuideLogo";
import {
  GUIDE_TYPE_LABEL,
  GUIDE_ZONE_LABEL,
  type GuideEntry,
} from "@/data/tradeShowGuide";

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="mt-8">
      <h2 className="text-[11px] font-semibold uppercase tracking-[0.18em] text-ink/50">{title}</h2>
      <div className="mt-3 text-sm leading-relaxed text-ink/80">{children}</div>
    </section>
  );
}

function PointList({ items }: { items: string[] }) {
  return (
    <ul className="flex flex-col gap-1.5">
      {items.map((item) => (
        <li key={item}>{item}</li>
      ))}
    </ul>
  );
}

export default function GuideProfile({ entry }: { entry: GuideEntry }) {
  const hasProfile = Boolean(
    entry.about?.length ||
      entry.services?.length ||
      entry.expertise?.length ||
      entry.practice?.length ||
      entry.work?.length ||
      entry.founder ||
      entry.lead ||
      entry.representative ||
      entry.featuredWork,
  );

  return (
    <article className="bg-paper px-5 pb-20 pt-28 md:px-10 md:pt-36">
      <div className="mx-auto max-w-3xl">
        <Link href="/trade-show-guide" className="text-sm font-semibold text-gold-deep hover:opacity-75">
          ← Back to Trade Show Guide
        </Link>
        <div
          className={`mt-6 flex overflow-hidden rounded-2xl ${entry.type === "exhibitor" ? "bg-[#f3efe6]" : "bg-white"} ${
            entry.imageSrc ? "h-72 md:h-96" : "h-40 items-center justify-center"
          }`}
        >
          <GuideLogo src={entry.imageSrc ?? entry.logoSrc} name={entry.name} cover={Boolean(entry.imageSrc)} />
        </div>
        <h1 className="mt-6 font-display text-4xl font-extrabold leading-tight tracking-tight text-ink">
          {entry.name}
        </h1>
        {entry.fullName ? <p className="mt-2 text-sm text-ink/70">{entry.fullName}</p> : null}
        <p className="mt-4 inline-flex rounded-full bg-white px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-ink/70">
          {GUIDE_TYPE_LABEL[entry.type]}
          {entry.zone ? ` · ${GUIDE_ZONE_LABEL[entry.zone]}` : ""}
        </p>
        {entry.location ? <p className="mt-3 text-sm text-ink/75">{entry.location}</p> : null}
        {entry.origin ? <p className="mt-1 text-sm text-ink/60">Origin: {entry.origin}</p> : null}

        {hasProfile ? (
          <>
            {entry.about?.length ? (
              <Section title="About">
                <div className="flex flex-col gap-3">
                  {entry.about.map((paragraph) => (
                    <p key={paragraph}>{paragraph}</p>
                  ))}
                </div>
              </Section>
            ) : null}
            {entry.services?.length ? (
              <Section title="Services">
                <PointList items={entry.services} />
              </Section>
            ) : null}
            {entry.expertise?.length ? (
              <Section title="Expertise">
                <PointList items={entry.expertise} />
              </Section>
            ) : null}
            {entry.practice?.length ? (
              <Section title="Practice">
                <PointList items={entry.practice} />
              </Section>
            ) : null}
            {entry.work?.length ? (
              <Section title="Work">
                <PointList items={entry.work} />
              </Section>
            ) : null}
            {entry.founder ? (
              <Section title="Founder">
                <p>{entry.founder}</p>
              </Section>
            ) : null}
            {entry.lead ? (
              <Section title="Leadership">
                <p>{entry.lead}</p>
                {entry.founded ? <p className="mt-2">Founded {entry.founded}.</p> : null}
              </Section>
            ) : null}
            {entry.memberships?.length ? (
              <Section title="Professional bodies">
                <PointList items={entry.memberships} />
              </Section>
            ) : null}
            {entry.award ? (
              <Section title="Recognition">
                <p>{entry.award}</p>
              </Section>
            ) : null}
            {entry.representative ? (
              <Section title="Featured representative">
                <p>{entry.representative}</p>
                {entry.representativeNote ? <p className="mt-2">{entry.representativeNote}</p> : null}
              </Section>
            ) : null}
            {entry.featuredWork ? (
              <Section title="Featured work">
                <p className="font-display text-lg font-extrabold text-ink">{entry.featuredWork.title}</p>
                {entry.featuredWork.year ? <p className="mt-1">{entry.featuredWork.year}</p> : null}
                {entry.featuredWork.type ? <p className="mt-1">{entry.featuredWork.type}</p> : null}
                {entry.featuredWork.description ? <p className="mt-2">{entry.featuredWork.description}</p> : null}
                {entry.featuredWork.materials?.length ? (
                  <p className="mt-2">Materials: {entry.featuredWork.materials.join(", ")}</p>
                ) : null}
                {entry.featuredWork.dimensions ? <p className="mt-2">{entry.featuredWork.dimensions}</p> : null}
              </Section>
            ) : null}
          </>
        ) : (
          <p className="mt-8 text-sm text-ink/70">Profile information coming soon.</p>
        )}

        <Section title="Alt.FFF 2026">
          <p>Participated in the 2026 edition of Alt.FFF.</p>
        </Section>

        {entry.links?.length || entry.socialLabels?.length ? (
          <div className="mt-8 flex flex-wrap gap-3">
            {entry.links?.map((link) => (
              <a
                key={link.href}
                href={link.href}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex min-h-11 items-center rounded-full bg-ink px-4 text-sm font-semibold text-paper"
              >
                {link.label}
              </a>
            ))}
          </div>
        ) : null}
        {entry.socialLabels?.length ? (
          <ul className="mt-4 flex flex-col gap-1 text-sm text-ink/70">
            {entry.socialLabels.map((label) => (
              <li key={label}>{label}</li>
            ))}
          </ul>
        ) : null}
      </div>
    </article>
  );
}
