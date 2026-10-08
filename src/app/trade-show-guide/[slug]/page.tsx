import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Nav from "@/components/Nav";
import Footer from "@/components/Footer";
import GuideProfile from "@/components/GuideProfile";
import { getGuideEntry, tradeShowEntries } from "@/data/tradeShowGuide";
import { buildMetadata } from "@/lib/metadata";

export function generateStaticParams() {
  return tradeShowEntries.map((entry) => ({ slug: entry.id }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const entry = getGuideEntry(slug);
  if (!entry) return {};
  return buildMetadata({
    title: `${entry.name} - Trade Show Guide - Alt.FFF`,
    description: entry.shortDescription ?? `${entry.name} in the Alt.FFF 2026 Trade Show Guide.`,
    path: `/trade-show-guide/${entry.id}`,
  });
}

export default async function GuideEntryPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const entry = getGuideEntry(slug);
  if (!entry) notFound();

  return (
    <>
      <Nav />
      <main>
        <GuideProfile entry={entry} />
      </main>
      <Footer />
    </>
  );
}
