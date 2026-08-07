/** True when any list filter or search term is active. */
export function hasActiveListFilters(search: string, statusFilter: string, statusAllValue = "all"): boolean {
  return statusFilter !== statusAllValue || search.trim().length > 0;
}
