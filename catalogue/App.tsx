import {Theme} from '@astryxdesign/core/theme';
import {neutralTheme} from '@astryxdesign/theme-neutral/built';
import {examples, findExample} from './examples';
import {CatalogueMenu} from './menu/CatalogueMenu';
import {navigate, useRoute} from './router';
import {useStoredState} from './storage';

export function App() {
  const route = useRoute();
  const exampleId = route.exampleId ?? examples[0].id;
  const example = findExample(exampleId);
  const [tweaks, setTweaks] = useStoredState<Record<string, Record<string, boolean>>>('tweaks', {});
  const exampleTweaks = tweaks[exampleId] ?? {};
  const setTweak = (id: string, value: boolean) => setTweaks(current => ({...current, [exampleId]: {...current[exampleId], [id]: value}}));

  return <Theme theme={neutralTheme} mode="light">
    {example
      ? <example.Component
          key={example.id}
          page={route.page}
          onPageChange={page => navigate({exampleId, page, isClean: route.isClean})}
          tweaks={exampleTweaks}
          onTweakChange={setTweak}
        />
      : <main className="catalogue-missing">No example called “{exampleId}”.</main>}
    {!route.isClean && <CatalogueMenu
      selectedId={exampleId}
      page={route.page}
      tweaks={example?.tweaks?.map(tweak => ({...tweak, value: exampleTweaks[tweak.id] ?? false})) ?? []}
      onTweakChange={setTweak}
    />}
  </Theme>;
}
