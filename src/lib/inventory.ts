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
 * tabs, line breaks or commas, e.g. "AB12 CD34 EF56", "AB12\nCD34\nEF56"
 * or "AB12, CD34,EF56".
 * Each non-empty token is treated as its own item.
 */
export function parseScan(raw: string): string[] {
  return raw
    .split(/[\s,]+/)
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

/**
 * Export columns, matching the inventory system's import sheet.
 * "Created on" and "Activities" are intentionally left blank.
 */
export const EXPORT_HEADERS = ['Lot/Serial Number', 'Product', 'Created on', 'Activities'] as const;

/** One row per item, in the same order as the items table. */
export function toExportRows(items: InventoryItem[]): string[][] {
  return items.map((item) => [item.serial, item.productName, '', '']);
}

function csvCell(value: string): string {
  return /[",\n\r]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

export function toCsv(items: InventoryItem[]): string {
  return [[...EXPORT_HEADERS], ...toExportRows(items)].map((row) => row.map(csvCell).join(',')).join('\n');
}
