import {ScrollArea} from '@da-facility/ui';
import './scroll-area-example.css';

const STATIONS = Array.from({length: 40}, (_, index) => `Platform ${index + 1}`);

function Panel({title, fade, items}: {title: string; fade?: number; items: string[]}) {
  return <section className="scroll-area-example__panel" aria-label={title}>
    <header>{title}</header>
    <ScrollArea className="scroll-area-example__list" fade={fade} data-testid={title}>
      <ul>{items.map(item => <li key={item}>{item}</li>)}</ul>
    </ScrollArea>
    <footer>{items.length} items</footer>
  </section>;
}

export function ScrollAreaExample() {
  return <main className="scroll-area-example">
    <h1>Scroll area</h1>
    <p>Lists scroll between a pinned header and footer. While a list overflows it keeps native momentum and bounce without moving the page, and items fade out under the edges with more content behind them. A list that fits does neither.</p>
    <div className="scroll-area-example__panels">
      <Panel title="Default fade (10px)" items={STATIONS} />
      <Panel title="Wide fade (32px)" fade={32} items={STATIONS} />
      <Panel title="Fits, so no fade or bounce" items={STATIONS.slice(0, 4)} />
    </div>
  </main>;
}
