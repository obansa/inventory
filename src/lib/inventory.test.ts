import { describe, expect, it } from 'vitest';
import { mergeScan, parseScan, toCsv, type InventoryItem } from './inventory';

const at = new Date('2026-01-01T00:00:00.000Z');

describe('parseScan', () => {
  it('returns a single code untouched', () => {
    expect(parseScan('SN-0001')).toEqual(['SN-0001']);
  });

  it('strips surrounding whitespace', () => {
    expect(parseScan('  SN-0001 \n')).toEqual(['SN-0001']);
  });

  it('splits space-separated codes', () => {
    expect(parseScan('xxxx yyyy zzz')).toEqual(['xxxx', 'yyyy', 'zzz']);
  });

  it('splits newline-separated codes, including CRLF and tabs', () => {
    expect(parseScan('\nxxxx\r\nXxx\n\tXxy\n')).toEqual(['xxxx', 'Xxx', 'Xxy']);
  });

  it('returns nothing for blank input', () => {
    expect(parseScan('  \n\t ')).toEqual([]);
  });
});

describe('mergeScan', () => {
  it('records every code from a multi-code scan under the configured product', () => {
    const { items, added, duplicates } = mergeScan([], 'A1 A2\nA3', 'Laptop', 'qr', at);
    expect(duplicates).toEqual([]);
    expect(added.map((i) => i.serial)).toEqual(['A1', 'A2', 'A3']);
    expect(items.every((i) => i.productName === 'Laptop' && i.method === 'qr')).toBe(true);
    expect(items[0].addedAt).toBe(at.toISOString());
  });

  it('skips codes that are already in the inventory', () => {
    const existing: InventoryItem[] = [
      { serial: 'A1', productName: 'Laptop', method: 'qr', addedAt: at.toISOString() },
    ];
    const { items, added, duplicates } = mergeScan(existing, 'A1 A2', 'Mouse', 'barcode', at);
    expect(added.map((i) => i.serial)).toEqual(['A2']);
    expect(duplicates).toEqual(['A1']);
    expect(items).toHaveLength(2);
  });

  it('skips codes repeated within the same scan', () => {
    const { added, duplicates } = mergeScan([], 'B1 B1\nB2 B1', 'Cable', 'qr', at);
    expect(added.map((i) => i.serial)).toEqual(['B1', 'B2']);
    expect(duplicates).toEqual(['B1', 'B1']);
  });

  it('returns the same array when nothing was added', () => {
    const existing: InventoryItem[] = [
      { serial: 'A1', productName: 'Laptop', method: 'qr', addedAt: at.toISOString() },
    ];
    expect(mergeScan(existing, 'A1', 'Laptop', 'qr', at).items).toBe(existing);
  });
});

describe('toCsv', () => {
  it('numbers rows and escapes special characters', () => {
    const csv = toCsv([
      { serial: 'A1', productName: 'Desk, "Oak"', method: 'manual', addedAt: at.toISOString() },
    ]);
    expect(csv.split('\n')[1]).toBe(`1,A1,"Desk, ""Oak""",Manual,${at.toISOString()}`);
  });
});
