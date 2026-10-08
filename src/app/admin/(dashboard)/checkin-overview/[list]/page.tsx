import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import CheckInOverviewListLive from "@/components/admin/CheckInOverviewListLive";
import { isFullAdminRole } from "@/lib/adminRoles";
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
  const [initialRows, auth] = await Promise.all([
    fetchCheckInOverviewList(supabase, kind),
    supabase.auth.getUser(),
  ]);

  let canSendMessages = false;
  if (auth.data.user) {
    const { data: profile } = await supabase
      .from("admin_profiles")
      .select("role")
      .eq("id", auth.data.user.id)
      .single();
    canSendMessages = isFullAdminRole(profile?.role);
  }

  return (
    <CheckInOverviewListLive
      kind={kind}
      initialRows={initialRows}
      canSendMessages={canSendMessages}
    />
  );
}
