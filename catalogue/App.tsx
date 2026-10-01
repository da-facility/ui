import {InternationalizationProvider} from '@astryxdesign/core/i18n';
import {Theme} from '@astryxdesign/core/theme';
import hr from '@da-facility/ui/locales/hr.json';
import {neutralTheme} from '@astryxdesign/theme-neutral/built';
import {examples, findExample, globalTweaks} from './examples';
import {CatalogueMenu} from './menu/CatalogueMenu';
import {navigate, useRoute} from './router';
import {useStoredState} from './storage';
import type {Tweak} from './types';

const GLOBAL = 'global';

export function App() {
  const route = useRoute();
  const exampleId = route.exampleId ?? examples[0].id;
  const example = findExample(exampleId);

  // Stored per example, plus a shared set every example sees.
  const [stored, setStored] = useStoredState<Record<string, Record<string, boolean>>>('tweaks', {});
  const valuesFor = (scope: string, tweaks: Tweak[] = []) =>
    Object.fromEntries(tweaks.map(tweak => [tweak.id, stored[scope]?.[tweak.id] ?? tweak.default ?? false]));
  const setTweak = (scope: string) => (id: string, value: boolean) =>
    setStored(current => ({...current, [scope]: {...current[scope], [id]: value}}));
  const exampleTweaks = valuesFor(exampleId, example?.tweaks);
  const global = valuesFor(GLOBAL, globalTweaks);

  // Package strings in Croatian, through the same provider that translates Astryx.
  return <InternationalizationProvider locale={global.croatian ? 'hr' : 'en'} messages={{hr}}>
    <Theme theme={neutralTheme} mode={global.darkMode ? 'dark' : 'light'}>
      {example
        ? <example.Component
            key={example.id}
            page={route.page}
            onPageChange={page => navigate({exampleId, page, isClean: route.isClean})}
            tweaks={exampleTweaks}
            onTweakChange={setTweak(exampleId)}
          />
        : <main className="catalogue-missing">No example called “{exampleId}”.</main>}
      {!route.isClean && <CatalogueMenu
        selectedId={exampleId}
        page={route.page}
        tweaks={[
          ...(example?.tweaks ?? []).map(tweak => ({...tweak, value: exampleTweaks[tweak.id], onChange: (value: boolean) => setTweak(exampleId)(tweak.id, value)})),
          ...globalTweaks.map(tweak => ({...tweak, value: global[tweak.id], onChange: (value: boolean) => setTweak(GLOBAL)(tweak.id, value)})),
        ]}
      />}
    </Theme>
  </InternationalizationProvider>;
}
