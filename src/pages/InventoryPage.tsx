import { useMemo, useState } from 'react';
import {
  Barcode,
  Boxes,
  CalendarClock,
  Download,
  Keyboard,
  PackageOpen,
  QrCode,
  ScanLine,
  Search,
  Tags,
  Trash2,
  X,
} from 'lucide-react';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { toCsv, type ScanMethod } from '../lib/inventory';
import { navigate } from '../lib/router';
import { useInventory } from '../lib/store';

const METHOD_META: Record<ScanMethod, { label: string; Icon: typeof QrCode }> = {
  qr: { label: 'QR code', Icon: QrCode },
  barcode: { label: 'Barcode', Icon: Barcode },
  manual: { label: 'Manual', Icon: Keyboard },
};

function productHue(name: string): number {
  let hash = 0;
  for (const ch of name) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0;
  return hash % 360;
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' });
}

function isToday(iso: string): boolean {
  return new Date(iso).toDateString() === new Date().toDateString();
}

export function InventoryPage() {
  const { items, removeItem, clearAll } = useInventory();
  const [query, setQuery] = useState('');
  const [product, setProduct] = useState('');
  const [confirmClear, setConfirmClear] = useState(false);

  const products = useMemo(
    () => [...new Set(items.map((i) => i.productName))].sort((a, b) => a.localeCompare(b)),
    [items],
  );

  // Keep each item's S/N (its position in the full list) stable while filtering.
  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items
      .map((item, index) => ({ item, sn: index + 1 }))
      .filter(
        ({ item }) =>
          (!product || item.productName === product) &&
          (!q || item.serial.toLowerCase().includes(q) || item.productName.toLowerCase().includes(q)),
      );
  }, [items, query, product]);

  const lastAdded = items.length ? items[items.length - 1].addedAt : null;
  const addedToday = items.filter((i) => isToday(i.addedAt)).length;

  function exportCsv() {
    const blob = new Blob([toCsv(items)], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `inventory-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="page">
      <header className="page-head">
        <div>
          <h1>Inventory</h1>
          <p className="muted">Items queued to be added to the inventory.</p>
        </div>
        <div className="page-head__actions">
          <button className="btn btn--secondary" onClick={exportCsv} disabled={!items.length}>
            <Download size={16} /> Export CSV
          </button>
          <button className="btn btn--primary" onClick={() => navigate('scan')}>
            <ScanLine size={16} /> Scan items
          </button>
        </div>
      </header>

      <div className="stats">
        <Stat Icon={Boxes} label="Total items" value={items.length} tone="indigo" />
        <Stat Icon={Tags} label="Products" value={products.length} tone="cyan" />
        <Stat Icon={ScanLine} label="Added today" value={addedToday} tone="emerald" />
        <Stat
          Icon={CalendarClock}
          label="Last added"
          value={lastAdded ? new Date(lastAdded).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}
          tone="amber"
        />
      </div>

      <section className="card table-card">
        <div className="toolbar">
          <div className="search">
            <Search size={16} />
            <input
              className="input"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search serial number or product"
              aria-label="Search"
            />
            {query && (
              <button className="search__clear" onClick={() => setQuery('')} aria-label="Clear search">
                <X size={14} />
              </button>
            )}
          </div>
          <select
            className="input select"
            value={product}
            onChange={(e) => setProduct(e.target.value)}
            aria-label="Filter by product"
          >
            <option value="">All products</option>
            {products.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
          <button className="btn btn--danger-ghost" onClick={() => setConfirmClear(true)} disabled={!items.length}>
            <Trash2 size={16} /> Clear all
          </button>
        </div>

        {items.length === 0 ? (
          <div className="empty">
            <div className="empty__icon">
              <PackageOpen size={34} />
            </div>
            <h3>No items yet</h3>
            <p className="muted">Scan QR codes or barcodes to build your list of items.</p>
            <button className="btn btn--primary" onClick={() => navigate('scan')}>
              <ScanLine size={16} /> Start scanning
            </button>
          </div>
        ) : rows.length === 0 ? (
          <div className="empty empty--small">
            <h3>No matches</h3>
            <p className="muted">Try a different search or product filter.</p>
          </div>
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th className="col-sn">S/N</th>
                  <th>Serial number</th>
                  <th>Product name</th>
                  <th className="hide-sm">Scanned via</th>
                  <th className="hide-sm">Added</th>
                  <th className="col-actions" aria-label="Actions" />
                </tr>
              </thead>
              <tbody>
                {rows.map(({ item, sn }) => {
                  const { label, Icon } = METHOD_META[item.method];
                  return (
                    <tr key={item.serial}>
                      <td className="col-sn muted">{sn}</td>
                      <td>
                        <span className="mono serial">{item.serial}</span>
                      </td>
                      <td>
                        <span className="product" style={{ ['--hue' as string]: productHue(item.productName) }}>
                          <span className="product__dot" />
                          {item.productName}
                        </span>
                      </td>
                      <td className="hide-sm">
                        <span className="badge">
                          <Icon size={13} /> {label}
                        </span>
                      </td>
                      <td className="hide-sm muted small">{formatTime(item.addedAt)}</td>
                      <td className="col-actions">
                        <button
                          className="btn btn--ghost btn--icon btn--row"
                          onClick={() => removeItem(item.serial)}
                          title="Remove item"
                          aria-label={`Remove ${item.serial}`}
                        >
                          <Trash2 size={15} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <div className="table-foot muted small">
              Showing {rows.length} of {items.length} item{items.length === 1 ? '' : 's'}
            </div>
          </div>
        )}
      </section>

      <ConfirmDialog
        open={confirmClear}
        title="Clear all items?"
        message={`This removes all ${items.length} items from the list. This cannot be undone.`}
        confirmLabel="Clear all"
        onConfirm={clearAll}
        onClose={() => setConfirmClear(false)}
      />
    </div>
  );
}

function Stat({
  Icon,
  label,
  value,
  tone,
}: {
  Icon: typeof QrCode;
  label: string;
  value: string | number;
  tone: string;
}) {
  return (
    <div className={`card stat-card stat-card--${tone}`}>
      <span className="stat-card__icon">
        <Icon size={18} />
      </span>
      <div>
        <span className="stat-card__label">{label}</span>
        <span className="stat-card__value">{value}</span>
      </div>
    </div>
  );
}
