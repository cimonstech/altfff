import type { CheckInOverviewListRow } from "@/lib/checkInOverview";

function displayName(row: Pick<CheckInOverviewListRow, "full_name" | "email">): string {
  const name = row.full_name?.trim();
  if (name) return name;
  return row.email;
}

type Cell = string | Date | null;

type XlsxModule = typeof import("xlsx");
type WorkBook = import("xlsx").WorkBook;

const DATE_FORMAT = "dd mmm yyyy hh:mm";

export type CheckInOverviewExportLists = {
  preRegistered: CheckInOverviewListRow[];
  checkedIn: CheckInOverviewListRow[];
  walkIns: CheckInOverviewListRow[];
};

function text(value: string | null | undefined): string {
  return value?.trim() ?? "";
}

function asDate(iso: string | null): Date | null {
  if (!iso) return null;
  const parsed = new Date(iso);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

async function loadXlsx(): Promise<XlsxModule> {
  const mod = await import("xlsx");
  if ("utils" in mod && mod.utils) return mod;
  const fallback = (mod as { default?: XlsxModule }).default;
  if (fallback?.utils) return fallback;
  throw new Error("Excel exporter failed to load.");
}

function appendSheet(
  xlsx: XlsxModule,
  workbook: WorkBook,
  name: string,
  headers: string[],
  rows: Cell[][],
) {
  const sheet = xlsx.utils.aoa_to_sheet([
    headers,
    ...rows.map((row) => row.map((cell) => (cell instanceof Date ? cell : (cell ?? "")))),
  ]);

  sheet["!cols"] = headers.map((header, index) => {
    const longest = rows.reduce((max, row) => {
      const value = row[index];
      const length = value instanceof Date ? 18 : String(value ?? "").length;
      return Math.max(max, length);
    }, header.length);
    return { wch: Math.min(48, Math.max(12, longest + 2)) };
  });

  rows.forEach((row, rowIndex) => {
    row.forEach((value, colIndex) => {
      const address = xlsx.utils.encode_cell({ r: rowIndex + 1, c: colIndex });
      const cell = sheet[address];
      if (!cell) return;
      if (value instanceof Date) {
        cell.t = "d";
        cell.v = value;
        cell.z = DATE_FORMAT;
        delete cell.w;
        return;
      }
      if (headers[colIndex] === "Phone") {
        cell.t = "s";
        cell.v = value ?? "";
        delete cell.w;
      }
    });
  });

  xlsx.utils.book_append_sheet(workbook, sheet, name);
}

function preRegisteredRows(rows: CheckInOverviewListRow[]): Cell[][] {
  return rows.map((row) => [displayName(row), row.email, text(row.phone)]);
}

function checkedInRows(rows: CheckInOverviewListRow[]): Cell[][] {
  return rows.map((row) => [
    displayName(row),
    row.email,
    text(row.phone),
    asDate(row.checked_in_at),
    text(row.checked_in_by_email),
  ]);
}

function walkInRows(rows: CheckInOverviewListRow[]): Cell[][] {
  return rows.map((row) => [displayName(row), row.email, text(row.phone), asDate(row.created_at)]);
}

export function buildCheckInOverviewWorkbook(xlsx: XlsxModule, lists: CheckInOverviewExportLists) {
  const workbook = xlsx.utils.book_new();
  appendSheet(xlsx, workbook, "Confirmed pre-registered", ["Name", "Email", "Phone"], preRegisteredRows(lists.preRegistered));
  appendSheet(
    xlsx,
    workbook,
    "Checked in so far",
    ["Name", "Email", "Phone", "Checked in", "Checked in by"],
    checkedInRows(lists.checkedIn),
  );
  appendSheet(
    xlsx,
    workbook,
    "Walk-in registrations",
    ["Name", "Email", "Phone", "Registered"],
    walkInRows(lists.walkIns),
  );
  return workbook;
}

export function checkInOverviewExportFilename(now = new Date()): string {
  const stamp = [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, "0"),
    String(now.getDate()).padStart(2, "0"),
  ].join("-");
  return `altfff-check-in-overview-${stamp}.xlsx`;
}

/** Downloads one workbook with the three check-in overview lists. */
export async function downloadCheckInOverviewExcel(lists: CheckInOverviewExportLists): Promise<void> {
  const xlsx = await loadXlsx();
  const workbook = buildCheckInOverviewWorkbook(xlsx, lists);
  xlsx.writeFile(workbook, checkInOverviewExportFilename());
}
