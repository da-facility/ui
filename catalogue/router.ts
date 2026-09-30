import {useEffect, useState} from 'react';

/**
 * Catalogue URLs are `/<example>/<page>`. The `/render` prefix shows the
 * example alone, without the catalogue menu, for screenshots and sharing.
 */
export type Route = {exampleId?: string; page?: string; isClean: boolean};

export function readRoute(): Route {
  const segments = window.location.pathname.split('/').filter(Boolean).map(decodeURIComponent);
  const isClean = segments[0] === 'render';
  if (isClean) segments.shift();
  return {exampleId: segments[0], page: segments[1], isClean};
}

export function routePath({exampleId, page, isClean}: Route) {
  return '/' + [isClean && 'render', exampleId, page].filter(Boolean).map(segment => encodeURIComponent(segment as string)).join('/');
}

export function navigate(route: Route, {replace = false} = {}) {
  const path = routePath(route);
  if (path === window.location.pathname) return;
  window.history[replace ? 'replaceState' : 'pushState'](null, '', path);
  window.dispatchEvent(new PopStateEvent('popstate'));
}

export function useRoute() {
  const [route, setRoute] = useState(readRoute);
  useEffect(() => {
    const sync = () => setRoute(readRoute());
    window.addEventListener('popstate', sync);
    return () => window.removeEventListener('popstate', sync);
  }, []);
  return route;
}
