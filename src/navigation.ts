export type CatalogueRoute = {templateId: string; pageId?: string; clean: boolean};

export function readRoute(pathname = window.location.pathname): CatalogueRoute {
  const segments = pathname.split('/').filter(Boolean);
  const clean = segments[0] === 'render';
  if (clean) segments.shift();
  return {templateId: segments[0] ?? 'login-split', pageId: segments[1], clean};
}

export function templatePath(templateId: string, clean = false, pageId?: string) {
  return `${clean ? '/render' : ''}/${encodeURIComponent(templateId)}${pageId ? `/${encodeURIComponent(pageId)}` : ''}`;
}

export function navigate(path: string, replace = false) {
  if (replace) window.history.replaceState(null, '', path);
  else window.history.pushState(null, '', path);
  window.dispatchEvent(new PopStateEvent('popstate'));
}

// Old phone QR codes remain usable, but the address is immediately canonicalized.
export function migrateLegacyLink() {
  const url = new URL(window.location.href);
  const id = url.searchParams.get('render') ?? url.searchParams.get('template');
  if (id) window.history.replaceState(null, '', templatePath(id, url.searchParams.has('render')));
  else if (url.pathname === '/') window.history.replaceState(null, '', '/login-split');
}
