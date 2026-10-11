import { EXPORT_HEADERS, toCsv, toExportRows, type InventoryItem } from './inventory';

export type ExportFormat = 'xlsx' | 'csv';

function fileName(ext: ExportFormat): string {
  return `inventory-${new Date().toISOString().slice(0, 10)}.${ext}`;
}

function download(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export async function exportItems(items: InventoryItem[], format: ExportFormat): Promise<void> {
  if (format === 'csv') {
    // The BOM makes Excel open the file as UTF-8 so non-ASCII product names display correctly.
    download(new Blob(['\uFEFF' + toCsv(items)], { type: 'text/csv;charset=utf-8' }), fileName('csv'));
    return;
  }

  // Loaded on demand so the spreadsheet writer is not part of the main bundle.
  const { default: writeXlsxFile } = await import('write-excel-file/browser');
  const header = EXPORT_HEADERS.map((value) => ({ value, fontWeight: 'bold' as const }));
  const rows = toExportRows(items).map((row) => row.map((value) => ({ value, type: String })));

  await writeXlsxFile([header, ...rows], {
    sheet: 'Inventory',
    stickyRowsCount: 1,
    columns: [{ width: 28 }, { width: 36 }, { width: 22 }, { width: 22 }],
  }).toFile(fileName('xlsx'));
}
