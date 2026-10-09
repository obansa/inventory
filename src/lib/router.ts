import { useEffect, useState } from 'react';

export type Route = 'inventory' | 'scan';

function currentRoute(): Route {
  return window.location.hash.replace(/^#\/?/, '') === 'scan' ? 'scan' : 'inventory';
}

export function navigate(route: Route) {
  window.location.hash = `/${route}`;
}

/** Minimal hash router so the build works on any static host. */
export function useRoute(): Route {
  const [route, setRoute] = useState<Route>(currentRoute);
  useEffect(() => {
    const onChange = () => setRoute(currentRoute());
    window.addEventListener('hashchange', onChange);
    return () => window.removeEventListener('hashchange', onChange);
  }, []);
  return route;
}
