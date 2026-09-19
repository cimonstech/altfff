/** True when any list filter or search term is active. */
export function hasActiveListFilters(
  search: string,
  statusFilter: string,
  statusAllValue = "all",
  checkInFilter: string | null = null,
  checkInAllValue = "all",
): boolean {
  return (
    statusFilter !== statusAllValue ||
    search.trim().length > 0 ||
    (checkInFilter !== null && checkInFilter !== checkInAllValue)
  );
}
