import {useEffect, useState} from 'react';
import {LibraryMenu} from './components/library-menu/LibraryMenu';
import {LibraryTweaksProvider} from './components/library-menu/LibraryTweaks';
import {Theme} from '@astryxdesign/core/theme';
import {neutralTheme} from '@astryxdesign/theme-neutral/built';
import {getCatalogueItem} from './templates/registry';
import {migrateLegacyLink, navigate, readRoute, templatePath} from './navigation';

export function App() {
  const [route, setRoute] = useState(() => { migrateLegacyLink(); return readRoute(); });
  useEffect(() => {
    const sync = () => setRoute(readRoute());
    window.addEventListener('popstate', sync);
    return () => window.removeEventListener('popstate', sync);
  }, []);
  const Component = getCatalogueItem(route.templateId)?.Component;
  return <Theme theme={neutralTheme} mode="light"><LibraryTweaksProvider>
    {Component ? <Component key={route.templateId} /> : <main className="empty-catalogue">Unknown catalogue item: {route.templateId}</main>}
    {!route.clean && <LibraryMenu selectedId={route.templateId} onSelect={(id) => navigate(templatePath(id))} />}
  </LibraryTweaksProvider></Theme>;
}
