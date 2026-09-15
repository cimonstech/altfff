import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import CheckInOverviewListLive from "@/components/admin/CheckInOverviewListLive";
import {
  fetchCheckInOverviewList,
  parseCheckInOverviewListSlug,
} from "@/lib/checkInOverview";

export default async function AdminCheckInOverviewListPage({
  params,
}: {
  params: Promise<{ list: string }>;
}) {
  const { list } = await params;
  const kind = parseCheckInOverviewListSlug(list);
  if (!kind) notFound();

  const supabase = await createClient();
  const initialRows = await fetchCheckInOverviewList(supabase, kind);

  return <CheckInOverviewListLive kind={kind} initialRows={initialRows} />;
}
