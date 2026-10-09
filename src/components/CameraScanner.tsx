import { useEffect, useId, useRef, useState } from 'react';
import { Html5Qrcode, Html5QrcodeSupportedFormats as F } from 'html5-qrcode';
import { CameraOff, Loader2, RotateCcw } from 'lucide-react';
import type { ScanConfig } from '../lib/inventory';

const FORMATS: Record<ScanConfig['method'], F[]> = {
  qr: [F.QR_CODE],
  barcode: [
    F.CODE_128,
    F.CODE_39,
    F.CODE_93,
    F.EAN_13,
    F.EAN_8,
    F.UPC_A,
    F.UPC_E,
    F.ITF,
    F.CODABAR,
  ],
};

/**
 * A code held in front of the camera is decoded on every frame. It is only
 * reported again once it has been out of view for this long.
 */
const REPEAT_GAP_MS = 1500;

// Starting and stopping the camera is async. Running every start/stop through
// one chain guarantees a previous session is fully released before the next
// one begins (mode switches, camera flips, React StrictMode remounts).
let lifecycle: Promise<void> = Promise.resolve();

type Status = { kind: 'starting' } | { kind: 'running' } | { kind: 'error'; message: string };

function describeError(error: unknown): string {
  const text = String((error as Error)?.name ?? '') + ' ' + String((error as Error)?.message ?? error);
  if (!window.isSecureContext) return 'The camera is only available over HTTPS or on localhost.';
  if (/NotAllowed|Permission/i.test(text)) return 'Camera permission was denied. Allow camera access in your browser settings and retry.';
  if (/NotFound|no camera|Requested device not found/i.test(text)) return 'No camera was found on this device. You can still type or paste codes below.';
  if (/NotReadable|in use/i.test(text)) return 'The camera is in use by another application.';
  return 'Could not start the camera. ' + text.trim();
}

interface Props {
  method: ScanConfig['method'];
  facingMode: 'environment' | 'user';
  onScan: (raw: string) => void;
}

export function CameraScanner({ method, facingMode, onScan }: Props) {
  const elementId = 'reader-' + useId().replace(/[^a-zA-Z0-9]/g, '');
  const [status, setStatus] = useState<Status>({ kind: 'starting' });
  const [attempt, setAttempt] = useState(0);
  const onScanRef = useRef(onScan);
  onScanRef.current = onScan;

  useEffect(() => {
    let cancelled = false;
    let scanner: Html5Qrcode | null = null;
    let last = { text: '', seenAt: 0 };
    setStatus({ kind: 'starting' });

    lifecycle = lifecycle.then(async () => {
      if (cancelled) return;
      const instance = new Html5Qrcode(elementId, {
        formatsToSupport: FORMATS[method],
        useBarCodeDetectorIfSupported: true,
        verbose: false,
      });
      scanner = instance;
      try {
        await instance.start(
          { facingMode },
          {
            fps: 12,
            qrbox: (w, h) => {
              if (method === 'qr') {
                const size = Math.max(120, Math.floor(Math.min(w, h) * 0.68));
                return { width: size, height: size };
              }
              return {
                width: Math.max(160, Math.floor(w * 0.86)),
                height: Math.max(80, Math.floor(Math.min(h, w) * 0.38)),
              };
            },
          },
          (text) => {
            const now = Date.now();
            const repeat = text === last.text && now - last.seenAt < REPEAT_GAP_MS;
            last = { text, seenAt: now };
            if (!repeat) onScanRef.current(text);
          },
          () => {
            // Called for every frame without a code; nothing to do.
          },
        );
        if (!cancelled) setStatus({ kind: 'running' });
      } catch (error) {
        if (!cancelled) setStatus({ kind: 'error', message: describeError(error) });
      }
    });

    return () => {
      cancelled = true;
      lifecycle = lifecycle.then(async () => {
        if (!scanner) return;
        try {
          if (scanner.isScanning) await scanner.stop();
          scanner.clear();
        } catch {
          // Already stopped.
        }
      });
    };
  }, [elementId, method, facingMode, attempt]);

  return (
    <div className={`camera camera--${method}`}>
      <div id={elementId} className="camera__feed" />
      {status.kind === 'running' && <div className={`camera__laser camera__laser--${method}`} aria-hidden />}
      {status.kind === 'starting' && (
        <div className="camera__overlay">
          <Loader2 className="spin" size={28} />
          <span>Starting camera…</span>
        </div>
      )}
      {status.kind === 'error' && (
        <div className="camera__overlay camera__overlay--error">
          <CameraOff size={30} />
          <p>{status.message}</p>
          <button className="btn btn--light btn--sm" onClick={() => setAttempt((n) => n + 1)}>
            <RotateCcw size={15} /> Retry
          </button>
        </div>
      )}
    </div>
  );
}
