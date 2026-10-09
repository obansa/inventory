export type ScanMethod = 'qr' | 'barcode' | 'manual';

export interface InventoryItem {
  /** The scanned serial number / code. Unique across the inventory. */
  serial: string;
  productName: string;
  method: ScanMethod;
  /** ISO timestamp of when the item was recorded. */
  addedAt: string;
}

export interface ScanConfig {
  productName: string;
  method: Exclude<ScanMethod, 'manual'>;
}

export interface MergeResult {
  items: InventoryItem[];
  added: InventoryItem[];
  /** Codes that were skipped because they were already recorded (or repeated in the same scan). */
  duplicates: string[];
}

/**
 * Splits a raw scan payload into individual codes.
 *
 * A single QR code may carry several serial numbers separated by spaces,
 * tabs or line breaks, e.g. "AB12 CD34 EF56" or "AB12\nCD34\nEF56".
 * Each non-empty token is treated as its own item.
 */
export function parseScan(raw: string): string[] {
  return raw
    .split(/\s+/)
    .map((code) => code.trim())
    .filter((code) => code.length > 0);
}

/**
 * Adds every code from a raw scan to the inventory under the configured
 * product name, skipping codes that are already recorded so an ID is never
 * stored more than once.
 */
export function mergeScan(
  existing: InventoryItem[],
  raw: string,
  productName: string,
  method: ScanMethod,
  now: Date = new Date(),
): MergeResult {
  const seen = new Set(existing.map((item) => item.serial));
  const added: InventoryItem[] = [];
  const duplicates: string[] = [];

  for (const serial of parseScan(raw)) {
    if (seen.has(serial)) {
      duplicates.push(serial);
      continue;
    }
    seen.add(serial);
    added.push({ serial, productName, method, addedAt: now.toISOString() });
  }

  return { items: added.length ? [...existing, ...added] : existing, added, duplicates };
}

export const METHOD_LABELS: Record<ScanMethod, string> = {
  qr: 'QR code',
  barcode: 'Barcode',
  manual: 'Manual',
};

export const EXPORT_HEADERS = ['S/N', 'Serial Number', 'Product Name', 'Scan Method', 'Added At'] as const;

export interface ExportRow {
  sn: number;
  serial: string;
  productName: string;
  method: string;
  addedAt: Date;
}

/** One row per item, in the same order and numbering as the items table. */
export function toExportRows(items: InventoryItem[]): ExportRow[] {
  return items.map((item, i) => ({
    sn: i + 1,
    serial: item.serial,
    productName: item.productName,
    method: METHOD_LABELS[item.method],
    addedAt: new Date(item.addedAt),
  }));
}

function csvCell(value: string): string {
  return /[",\n\r]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

export function toCsv(items: InventoryItem[]): string {
  const rows = toExportRows(items).map((r) =>
    [String(r.sn), r.serial, r.productName, r.method, r.addedAt.toISOString()].map(csvCell).join(','),
  );
  return [EXPORT_HEADERS.join(','), ...rows].join('\n');
}
