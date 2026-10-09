import { useCallback, useEffect, useRef, useState, type KeyboardEvent } from 'react';
import {
  AlertTriangle,
  Barcode,
  CheckCircle2,
  Keyboard,
  Package,
  QrCode,
  Settings2,
  SwitchCamera,
} from 'lucide-react';
import { CameraScanner } from '../components/CameraScanner';
import { ScanSetup } from '../components/ScanSetup';
import { duplicateFeedback, successFeedback } from '../lib/feedback';
import type { ScanConfig, ScanMethod } from '../lib/inventory';
import { navigate } from '../lib/router';
import { useInventory } from '../lib/store';

interface ScanEvent {
  id: number;
  at: Date;
  method: ScanMethod;
  added: string[];
  duplicates: string[];
}

export function ScanPage() {
  const { scanConfig, setScanConfig } = useInventory();
  const [editing, setEditing] = useState(false);

  if (!scanConfig || editing) {
    return (
      <div className="page page--narrow">
        <ScanSetup
          initial={scanConfig}
          onSubmit={(config) => {
            setScanConfig(config);
            setEditing(false);
          }}
          onCancel={scanConfig ? () => setEditing(false) : undefined}
        />
      </div>
    );
  }

  return <ScannerView config={scanConfig} onEdit={() => setEditing(true)} />;
}

let nextEventId = 1;

function ScannerView({ config, onEdit }: { config: ScanConfig; onEdit: () => void }) {
  const { addScan, items } = useInventory();
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [events, setEvents] = useState<ScanEvent[]>([]);
  const [flash, setFlash] = useState<{ kind: 'success' | 'duplicate'; key: number } | null>(null);
  const [manual, setManual] = useState('');
  const flashTimer = useRef<number>();

  const totals = events.reduce(
    (acc, e) => ({ added: acc.added + e.added.length, duplicates: acc.duplicates + e.duplicates.length }),
    { added: 0, duplicates: 0 },
  );
  const latest = events[0];

  const record = useCallback(
    (raw: string, method: ScanMethod) => {
      const result = addScan(raw, method);
      if (!result.added.length && !result.duplicates.length) return false;

      const event: ScanEvent = {
        id: nextEventId++,
        at: new Date(),
        method,
        added: result.added.map((i) => i.serial),
        duplicates: result.duplicates,
      };
      setEvents((prev) => [event, ...prev].slice(0, 50));

      const kind = result.added.length ? 'success' : 'duplicate';
      if (kind === 'success') successFeedback();
      else duplicateFeedback();
      setFlash({ kind, key: event.id });
      window.clearTimeout(flashTimer.current);
      flashTimer.current = window.setTimeout(() => setFlash(null), 900);
      return true;
    },
    [addScan],
  );

  useEffect(() => () => window.clearTimeout(flashTimer.current), []);

  const onCameraScan = useCallback((raw: string) => record(raw, config.method), [record, config.method]);

  function submitManual() {
    if (record(manual, 'manual')) setManual('');
  }

  function onManualKey(e: KeyboardEvent<HTMLTextAreaElement>) {
    // USB/Bluetooth scanners "type" the code and press Enter. Shift+Enter adds a line.
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      submitManual();
    }
  }

  const MethodIcon = config.method === 'qr' ? QrCode : Barcode;

  return (
    <div className="page">
      <div className="scan-bar card">
        <div className="scan-bar__info">
          <span className="live-dot" aria-hidden />
          <div className="scan-bar__chips">
            <span className="chip chip--strong">
              <Package size={14} /> {config.productName}
            </span>
            <span className="chip">
              <MethodIcon size={14} /> {config.method === 'qr' ? 'QR code' : 'Barcode'}
            </span>
          </div>
        </div>
        <button className="btn btn--secondary" onClick={onEdit}>
          <Settings2 size={16} /> Edit scan options
        </button>
      </div>

      <div className="scan-layout">
        <section className="card camera-card">
          <div className="camera-card__viewport">
            <CameraScanner method={config.method} facingMode={facingMode} onScan={onCameraScan} />
            {flash && <div key={flash.key} className={`camera-flash camera-flash--${flash.kind}`} aria-hidden />}
          </div>
          <div className="camera-card__footer">
            <p className="muted small">
              Hold the {config.method === 'qr' ? 'QR code' : 'barcode'} inside the frame. Codes separated by spaces,
              commas or new lines are recorded as separate items.
            </p>
            <button
              className="btn btn--ghost btn--icon"
              title="Switch camera"
              aria-label="Switch camera"
              onClick={() => setFacingMode((f) => (f === 'environment' ? 'user' : 'environment'))}
            >
              <SwitchCamera size={18} />
            </button>
          </div>
        </section>

        <aside className="scan-side">
          <div className="stat-pair">
            <div className="card stat stat--success">
              <span className="stat__label">Added this session</span>
              <span className="stat__value">{totals.added}</span>
            </div>
            <div className="card stat stat--warn">
              <span className="stat__label">Duplicates skipped</span>
              <span className="stat__value">{totals.duplicates}</span>
            </div>
          </div>

          {latest && (
            <div className={`card result result--${latest.added.length ? 'success' : 'duplicate'}`} key={latest.id}>
              {latest.added.length ? <CheckCircle2 size={22} /> : <AlertTriangle size={22} />}
              <div>
                <strong>
                  {latest.added.length
                    ? `${latest.added.length} item${latest.added.length > 1 ? 's' : ''} added`
                    : 'Already recorded'}
                </strong>
                <span>
                  {latest.added.length ? latest.added.join(', ') : latest.duplicates.join(', ')}
                  {latest.added.length > 0 && latest.duplicates.length > 0 &&
                    ` · ${latest.duplicates.length} duplicate${latest.duplicates.length > 1 ? 's' : ''} skipped`}
                </span>
              </div>
            </div>
          )}

          <div className="card manual">
            <label className="field__label" htmlFor="manual-entry">
              <Keyboard size={15} /> Type, paste or use a handheld scanner
            </label>
            <textarea
              id="manual-entry"
              className="input input--mono"
              rows={3}
              value={manual}
              onChange={(e) => setManual(e.target.value)}
              onKeyDown={onManualKey}
              placeholder={'SN-1001, SN-1002 SN-1003\nSN-1004'}
            />
            <div className="manual__row">
              <span className="muted small">Enter to add · Shift+Enter for a new line</span>
              <button className="btn btn--primary btn--sm" onClick={submitManual} disabled={!manual.trim()}>
                Add
              </button>
            </div>
          </div>

          <div className="card feed">
            <div className="feed__head">
              <h3>Recent scans</h3>
              <button className="link" onClick={() => navigate('inventory')}>
                View inventory ({items.length})
              </button>
            </div>
            {events.length === 0 ? (
              <p className="muted small feed__empty">Scanned codes will appear here.</p>
            ) : (
              <ul className="feed__list">
                {events.map((e) =>
                  [
                    ...e.added.map((code) => ({ code, dup: false })),
                    ...e.duplicates.map((code) => ({ code, dup: true })),
                  ].map(({ code, dup }, i) => (
                    <li key={`${e.id}-${i}`} className={dup ? 'feed__item feed__item--dup' : 'feed__item'}>
                      <span className="mono">{code}</span>
                      <span className={`badge ${dup ? 'badge--warn' : 'badge--success'}`}>
                        {dup ? 'Duplicate' : 'Added'}
                      </span>
                      <time className="muted small">
                        {e.at.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                      </time>
                    </li>
                  )),
                )}
              </ul>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}
