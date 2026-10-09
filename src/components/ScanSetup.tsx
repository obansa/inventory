import { useMemo, useState, type FormEvent } from 'react';
import { ArrowRight, Barcode, Package, QrCode } from 'lucide-react';
import type { ScanConfig } from '../lib/inventory';
import { useInventory } from '../lib/store';

const METHODS: { id: ScanConfig['method']; title: string; hint: string; Icon: typeof QrCode }[] = [
  { id: 'qr', title: 'QR code', hint: 'Square 2D codes. One code may hold several serial numbers.', Icon: QrCode },
  { id: 'barcode', title: 'Barcode', hint: 'Linear codes: EAN, UPC, Code 128, Code 39, ITF and more.', Icon: Barcode },
];

interface Props {
  initial: ScanConfig | null;
  onSubmit: (config: ScanConfig) => void;
  onCancel?: () => void;
}

export function ScanSetup({ initial, onSubmit, onCancel }: Props) {
  const { items } = useInventory();
  const [productName, setProductName] = useState(initial?.productName ?? '');
  const [method, setMethod] = useState<ScanConfig['method']>(initial?.method ?? 'qr');
  const [touched, setTouched] = useState(false);

  const knownProducts = useMemo(
    () => [...new Set(items.map((i) => i.productName))].sort((a, b) => a.localeCompare(b)),
    [items],
  );

  const name = productName.trim();
  const invalid = touched && !name;

  function submit(event: FormEvent) {
    event.preventDefault();
    setTouched(true);
    if (name) onSubmit({ productName: name, method });
  }

  return (
    <form className="card setup" onSubmit={submit} noValidate>
      <div className="setup__head">
        <span className="setup__step">Scan options</span>
        <h2>What are you scanning?</h2>
        <p className="muted">
          Every code you scan is recorded under this product until you change the options.
        </p>
      </div>

      <label className="field">
        <span className="field__label">
          <Package size={15} /> Product name
        </span>
        <input
          className={`input ${invalid ? 'input--invalid' : ''}`}
          value={productName}
          onChange={(e) => setProductName(e.target.value)}
          onBlur={() => setTouched(true)}
          placeholder="e.g. Dell Latitude 5440"
          list="known-products"
          autoFocus
          autoComplete="off"
        />
        <datalist id="known-products">
          {knownProducts.map((p) => (
            <option key={p} value={p} />
          ))}
        </datalist>
        {invalid && <span className="field__error">Enter a product name to continue.</span>}
      </label>

      <fieldset className="field">
        <legend className="field__label">Scan type</legend>
        <div className="method-grid" role="radiogroup">
          {METHODS.map(({ id, title, hint, Icon }) => (
            <label key={id} className={`method ${method === id ? 'method--active' : ''}`}>
              <input
                type="radio"
                name="method"
                value={id}
                checked={method === id}
                onChange={() => setMethod(id)}
              />
              <span className="method__icon">
                <Icon size={22} />
              </span>
              <span className="method__text">
                <strong>{title}</strong>
                <span>{hint}</span>
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      <div className="setup__actions">
        {onCancel && (
          <button type="button" className="btn btn--ghost" onClick={onCancel}>
            Cancel
          </button>
        )}
        <button type="submit" className="btn btn--primary btn--lg">
          Start scanning <ArrowRight size={18} />
        </button>
      </div>
    </form>
  );
}
