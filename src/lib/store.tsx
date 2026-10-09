import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { mergeScan, type InventoryItem, type MergeResult, type ScanConfig, type ScanMethod } from './inventory';

const ITEMS_KEY = 'stockline.items.v1';
const CONFIG_KEY = 'stockline.scanConfig.v1';

function load<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function save(key: string, value: unknown) {
  try {
    if (value === null) localStorage.removeItem(key);
    else localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Storage may be unavailable (private mode / quota); the app keeps working in memory.
  }
}

interface InventoryStore {
  items: InventoryItem[];
  scanConfig: ScanConfig | null;
  setScanConfig: (config: ScanConfig | null) => void;
  /** Records a raw scan; `method` defaults to the configured scan method. */
  addScan: (raw: string, method?: ScanMethod) => MergeResult;
  removeItem: (serial: string) => void;
  clearAll: () => void;
}

const InventoryContext = createContext<InventoryStore | null>(null);

export function InventoryProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<InventoryItem[]>(() => load(ITEMS_KEY, []));
  const [scanConfig, setScanConfigState] = useState<ScanConfig | null>(() => load(CONFIG_KEY, null));

  // The camera fires callbacks faster than React re-renders, so duplicate
  // checks read from a ref that is updated synchronously on every add.
  const itemsRef = useRef(items);
  const configRef = useRef(scanConfig);

  useEffect(() => save(ITEMS_KEY, items), [items]);

  const commit = useCallback((next: InventoryItem[]) => {
    itemsRef.current = next;
    setItems(next);
  }, []);

  const setScanConfig = useCallback((config: ScanConfig | null) => {
    configRef.current = config;
    setScanConfigState(config);
    save(CONFIG_KEY, config);
  }, []);

  const addScan = useCallback(
    (raw: string, method?: ScanMethod) => {
      const config = configRef.current;
      const result = mergeScan(itemsRef.current, raw, config?.productName ?? 'Unassigned', method ?? config?.method ?? 'manual');
      if (result.added.length) commit(result.items);
      return result;
    },
    [commit],
  );

  const removeItem = useCallback(
    (serial: string) => commit(itemsRef.current.filter((item) => item.serial !== serial)),
    [commit],
  );

  const clearAll = useCallback(() => commit([]), [commit]);

  const value = useMemo(
    () => ({ items, scanConfig, setScanConfig, addScan, removeItem, clearAll }),
    [items, scanConfig, setScanConfig, addScan, removeItem, clearAll],
  );

  return <InventoryContext.Provider value={value}>{children}</InventoryContext.Provider>;
}

export function useInventory(): InventoryStore {
  const store = useContext(InventoryContext);
  if (!store) throw new Error('useInventory must be used inside <InventoryProvider>');
  return store;
}
