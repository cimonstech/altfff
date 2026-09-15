import { createClient } from "@/lib/supabase/server";
import CheckInOverviewLive from "@/components/admin/CheckInOverviewLive";
import { fetchCheckInOverviewCounts } from "@/lib/checkInOverview";

export default async function AdminCheckInOverviewPage() {
  const supabase = await createClient();
  const initialCounts = await fetchCheckInOverviewCounts(supabase);
  return <CheckInOverviewLive initialCounts={initialCounts} />;
}
