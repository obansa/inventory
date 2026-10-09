import { useEffect, useRef, useState } from 'react';
import { ChevronDown, Download, FileSpreadsheet, FileText, Loader2 } from 'lucide-react';
import { exportItems, type ExportFormat } from '../lib/export';
import type { InventoryItem } from '../lib/inventory';

const OPTIONS: { format: ExportFormat; title: string; hint: string; Icon: typeof FileText }[] = [
  { format: 'xlsx', title: 'Excel workbook', hint: '.xlsx · formatted, opens in Excel', Icon: FileSpreadsheet },
  { format: 'csv', title: 'CSV file', hint: '.csv · plain text, any spreadsheet app', Icon: FileText },
];

export function ExportMenu({ items }: { items: InventoryItem[] }) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointer = (e: PointerEvent) => ref.current?.contains(e.target as Node) || setOpen(false);
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('pointerdown', onPointer);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onPointer);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  async function run(format: ExportFormat) {
    setOpen(false);
    setBusy(true);
    setError('');
    try {
      await exportItems(items, format);
    } catch {
      setError('Export failed. Please try again.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="menu" ref={ref}>
      <button
        className="btn btn--secondary"
        onClick={() => setOpen((o) => !o)}
        disabled={!items.length || busy}
        aria-haspopup="menu"
        aria-expanded={open}
      >
        {busy ? <Loader2 size={16} className="spin" /> : <Download size={16} />} Export
        <ChevronDown size={15} className={`menu__chevron ${open ? 'menu__chevron--open' : ''}`} />
      </button>
      {open && (
        <div className="menu__list" role="menu">
          {OPTIONS.map(({ format, title, hint, Icon }) => (
            <button key={format} className="menu__item" role="menuitem" onClick={() => run(format)}>
              <span className={`menu__icon menu__icon--${format}`}>
                <Icon size={18} />
              </span>
              <span className="menu__text">
                <strong>{title}</strong>
                <span>{hint}</span>
              </span>
            </button>
          ))}
        </div>
      )}
      {error && <span className="menu__error">{error}</span>}
    </div>
  );
}
