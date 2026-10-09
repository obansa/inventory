# Stockline — Inventory Scanner

A web app for building a list of items to add to an inventory by scanning QR codes or barcodes.

## Pages

**Items (`#/inventory`)** — a table of every recorded item with its S/N, serial number and
product name, plus how it was scanned and when. Includes search, a product filter, per-row
delete and "clear all".

**Export** the list as an **Excel workbook (.xlsx)** — bold frozen header row, real date cells —
or as a **CSV file (.csv)** that opens in any spreadsheet app.

**Scan (`#/scan`)**
1. Choose the **scan options**: the product name and the scan type (QR code or barcode).
2. The page switches to the live camera scanner and **stays there** — including across page
   reloads — until you press **Edit scan options**.
3. Every scanned code is recorded under the configured product name.

You can also type or paste codes, or use a USB/Bluetooth handheld scanner (they "type" the code
and press Enter) in the box beside the camera.

## Scan processing rules

- The scanned text is split on spaces, commas and line breaks. If a code contains several values
  (`xxxx xxxx xxx`, `xxxx,xxxx,xxx`, `xxxx, xxxx`, or one code per line), **each part is recorded
  as a separate item** with the configured product name. Empty parts (e.g. `a,,b` or a trailing
  comma) are ignored.
- **Duplicates are never recorded.** A serial number that is already in the list — or appears
  twice in the same scan — is skipped and shown as "Duplicate" (amber flash + low beep).
  New items get a green flash + high beep.
- A code held in front of the camera is reported once; it is reported again only after it
  leaves the frame and comes back.

The logic lives in `src/lib/inventory.ts` and is covered by `src/lib/inventory.test.ts`.

## Saving data

Everything is saved in the browser (`localStorage`) the moment it changes, so a page refresh,
closing the tab or restarting the phone loses nothing:

- the item list,
- the current scan options (the app reopens straight into the scanner),
- the scanner's recent-scans list and its added/duplicate counters (these reset when new scan
  options are chosen; the items are kept).

Several tabs can be open at once: they stay in sync, so one tab never overwrites what another
added. The app asks the browser to keep its storage permanently, and shows a warning bar if the
browser refuses to save (storage full or some private-browsing modes).

Data stays on the device and browser it was recorded in. Export to Excel/CSV to move or back it up.

## Development

```bash
npm install
npm run dev      # http://localhost:5173
npm test         # unit tests
npm run build    # production build in dist/
```

The camera only works on **HTTPS or localhost**. To test on a phone, deploy the `dist/` folder to
any static HTTPS host (GitHub Pages, Netlify, Vercel…). The build uses relative paths and hash
routing, so it works from any sub-path.

Built with React, TypeScript, Vite and [html5-qrcode](https://github.com/mebjas/html5-qrcode).
