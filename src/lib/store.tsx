import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { mergeScan, type InventoryItem, type MergeResult, type ScanConfig, type ScanMethod } from './inventory';

// Everything is saved in the browser (localStorage) so a page refresh,
// closing the tab or restarting the device never loses data.
const ITEMS_KEY = 'stockline.items.v1';
const CONFIG_KEY = 'stockline.scanConfig.v1';
const LOG_KEY = 'stockline.scanLog.v1';
const LOG_LIMIT = 50;

export interface ScanEvent {
  id: number;
  /** ISO timestamp. */
  at: string;
  method: ScanMethod;
  added: string[];
  duplicates: string[];
}

function load<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

/** Returns false when the browser refused to store the value. */
function save(key: string, value: unknown): boolean {
  try {
    if (value === null) localStorage.removeItem(key);
    else localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

interface InventoryStore {
  items: InventoryItem[];
  scanConfig: ScanConfig | null;
  /** Scans recorded since the current scan options were chosen, newest first. */
  scanLog: ScanEvent[];
  /** True when the last save to browser storage failed. */
  saveFailed: boolean;
  setScanConfig: (config: ScanConfig | null) => void;
  /** Records a raw scan; `method` defaults to the configured scan method. */
  addScan: (raw: string, method?: ScanMethod) => MergeResult & { event: ScanEvent | null };
  removeItem: (serial: string) => void;
  clearAll: () => void;
}

const InventoryContext = createContext<InventoryStore | null>(null);

export function InventoryProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<InventoryItem[]>(() => load(ITEMS_KEY, []));
  const [scanConfig, setScanConfigState] = useState<ScanConfig | null>(() => load(CONFIG_KEY, null));
  const [scanLog, setScanLog] = useState<ScanEvent[]>(() => load(LOG_KEY, []));
  const [saveFailed, setSaveFailed] = useState(false);

  // The camera fires callbacks faster than React re-renders, so duplicate
  // checks read from refs that are updated synchronously on every change.
  const itemsRef = useRef(items);
  const configRef = useRef(scanConfig);
  const logRef = useRef(scanLog);

  // Data is written to storage at the moment it changes (not after the next
  // render), so a refresh straight after a scan cannot lose it.
  const persist = useCallback((key: string, value: unknown) => {
    setSaveFailed(!save(key, value));
  }, []);

  const commitItems = useCallback(
    (next: InventoryItem[]) => {
      itemsRef.current = next;
      setItems(next);
      persist(ITEMS_KEY, next);
    },
    [persist],
  );

  const commitLog = useCallback(
    (next: ScanEvent[]) => {
      logRef.current = next;
      setScanLog(next);
      persist(LOG_KEY, next);
    },
    [persist],
  );

  // Keep several open tabs in sync. Without this, a tab holding an old copy
  // of the list would overwrite items another tab had just added.
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === ITEMS_KEY || e.key === null) {
        itemsRef.current = load(ITEMS_KEY, []);
        setItems(itemsRef.current);
      }
      if (e.key === CONFIG_KEY || e.key === null) {
        configRef.current = load(CONFIG_KEY, null);
        setScanConfigState(configRef.current);
      }
      if (e.key === LOG_KEY || e.key === null) {
        logRef.current = load(LOG_KEY, []);
        setScanLog(logRef.current);
      }
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  // Ask the browser not to clear this site's data when the device is low on space.
  useEffect(() => {
    navigator.storage?.persist?.().catch(() => {});
  }, []);

  const setScanConfig = useCallback(
    (config: ScanConfig | null) => {
      const previous = configRef.current;
      configRef.current = config;
      setScanConfigState(config);
      persist(CONFIG_KEY, config);
      // New scan options start a new scanning session.
      if (previous?.productName !== config?.productName || previous?.method !== config?.method) commitLog([]);
    },
    [persist, commitLog],
  );

  const addScan = useCallback(
    (raw: string, method?: ScanMethod) => {
      const config = configRef.current;
      const usedMethod = method ?? config?.method ?? 'manual';
      const result = mergeScan(itemsRef.current, raw, config?.productName ?? 'Unassigned', usedMethod);
      if (result.added.length) commitItems(result.items);

      let event: ScanEvent | null = null;
      if (result.added.length || result.duplicates.length) {
        event = {
          id: Math.max(0, ...logRef.current.map((e) => e.id)) + 1,
          at: new Date().toISOString(),
          method: usedMethod,
          added: result.added.map((i) => i.serial),
          duplicates: result.duplicates,
        };
        commitLog([event, ...logRef.current].slice(0, LOG_LIMIT));
      }
      return { ...result, event };
    },
    [commitItems, commitLog],
  );

  const removeItem = useCallback(
    (serial: string) => commitItems(itemsRef.current.filter((item) => item.serial !== serial)),
    [commitItems],
  );

  const clearAll = useCallback(() => commitItems([]), [commitItems]);

  const value = useMemo(
    () => ({ items, scanConfig, scanLog, saveFailed, setScanConfig, addScan, removeItem, clearAll }),
    [items, scanConfig, scanLog, saveFailed, setScanConfig, addScan, removeItem, clearAll],
  );

  return <InventoryContext.Provider value={value}>{children}</InventoryContext.Provider>;
}

export function useInventory(): InventoryStore {
  const store = useContext(InventoryContext);
  if (!store) throw new Error('useInventory must be used inside <InventoryProvider>');
  return store;
}
