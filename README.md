# Stockline — Inventory Scanner

A web app for building a list of items to add to an inventory by scanning QR codes or barcodes.

## Pages

**Items (`#/inventory`)** — a table of every recorded item with its S/N, serial number and
product name, plus how it was scanned and when. Includes search, a product filter, CSV export,
per-row delete and "clear all".

**Scan (`#/scan`)**
1. Choose the **scan options**: the product name and the scan type (QR code or barcode).
2. The page switches to the live camera scanner and **stays there** — including across page
   reloads — until you press **Edit scan options**.
3. Every scanned code is recorded under the configured product name.

You can also type or paste codes, or use a USB/Bluetooth handheld scanner (they "type" the code
and press Enter) in the box beside the camera.

## Scan processing rules

- The scanned text is split on whitespace. If a code contains spaces or line breaks
  (`xxxx xxxx xxx`, or one code per line), **each part is recorded as a separate item** with the
  configured product name.
- **Duplicates are never recorded.** A serial number that is already in the list — or appears
  twice in the same scan — is skipped and shown as "Duplicate" (amber flash + low beep).
  New items get a green flash + high beep.
- A code held in front of the camera is reported once; it is reported again only after it
  leaves the frame and comes back.

The logic lives in `src/lib/inventory.ts` and is covered by `src/lib/inventory.test.ts`.

Data is stored in the browser's `localStorage`, so it stays on the device the app is used on.

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
