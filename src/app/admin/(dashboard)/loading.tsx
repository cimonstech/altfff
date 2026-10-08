import LoadingSkeleton from "@/components/ui/states/LoadingSkeleton";

export default function AdminDashboardLoading() {
  return (
    <div aria-busy="true" aria-live="polite">
      <LoadingSkeleton variant="overview" className="mb-8 max-w-4xl" />
      <LoadingSkeleton variant="table" />
    </div>
  );
}
