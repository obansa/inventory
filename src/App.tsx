import { List, ScanLine } from 'lucide-react';
import { InventoryPage } from './pages/InventoryPage';
import { ScanPage } from './pages/ScanPage';
import { useRoute } from './lib/router';
import { useInventory } from './lib/store';

export function App() {
  const route = useRoute();
  const { items } = useInventory();

  return (
    <div className="app">
      <header className="topbar">
        <div className="topbar__inner">
          <a className="brand" href="#/inventory">
            <img src="./favicon.svg" alt="" width={30} height={30} />
            <span>
              Stockline<small>Inventory scanner</small>
            </span>
          </a>
          <nav className="tabs" aria-label="Main">
            <a className={`tab ${route === 'inventory' ? 'tab--active' : ''}`} href="#/inventory">
              <List size={16} /> Items <span className="tab__count">{items.length}</span>
            </a>
            <a className={`tab ${route === 'scan' ? 'tab--active' : ''}`} href="#/scan">
              <ScanLine size={16} /> Scan
            </a>
          </nav>
        </div>
      </header>
      <main>{route === 'scan' ? <ScanPage /> : <InventoryPage />}</main>
    </div>
  );
}
