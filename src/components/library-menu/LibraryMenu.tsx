import {useEffect, useLayoutEffect, useRef, useState, type KeyboardEvent, type PointerEvent} from 'react';
import {catalogue, getCatalogueItem} from '../../templates/registry';
import './library-menu.css';
import {readRoute, templatePath} from '../../navigation';
import {Switch} from '@astryxdesign/core/Switch';
import {Theme} from '@astryxdesign/core/theme';
import {neutralTheme} from '@astryxdesign/theme-neutral/built';
import {useLibraryTweaks} from './LibraryTweaks';

type Position = {x: number; y: number};
const STORAGE_KEY = 'df-ui-library-menu';
const WIDTH = 280;
const HEIGHT = 48;
const GAP = 12;
function bounds(position: Position): Position {
  return {
    x: Math.max(GAP, Math.min(position.x, window.innerWidth - WIDTH - GAP)),
    y: Math.max(GAP, Math.min(position.y, window.innerHeight - HEIGHT - GAP)),
  };
}
function readSaved(): {position: Position; open: boolean} {
  const fallback = {position: bounds({x: window.innerWidth, y: window.innerHeight}), open: false};
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? 'null');
    if (Number.isFinite(saved?.position?.x) && Number.isFinite(saved?.position?.y)) {
      return {position: bounds(saved.position), open: saved.open === true};
    }
  } catch { /* Storage is optional. */ }
  return fallback;
}
export function LibraryMenu({selectedId, onSelect}: {selectedId: string; onSelect: (id: string) => void}) {
  const tweaks = useLibraryTweaks();
  const [saved] = useState(readSaved);
  const [position, setPosition] = useState(saved.position);
  const [open, setOpen] = useState(saved.open);
  const [query, setQuery] = useState('');
  const [viewportHeight, setViewportHeight] = useState(window.innerHeight);
  const [dragging, setDragging] = useState(false);
  const drag = useRef<{pointerId: number; start: Position; origin: Position} | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const toggleRef = useRef<HTMLButtonElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const selected = getCatalogueItem(selectedId);
  const items = catalogue.filter((item) => `${item.name} ${item.category}`.toLowerCase().includes(query.trim().toLowerCase()));
  const above = position.y > (viewportHeight - HEIGHT) / 2;
  const panelHeight = Math.max(0, above ? position.y - GAP - 8 : viewportHeight - position.y - HEIGHT - GAP - 8);
  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify({position, open})); } catch { /* Optional persistence. */ }
  }, [position, open]);
  useLayoutEffect(() => {
    function resize() { setViewportHeight(window.innerHeight); setPosition((current) => bounds(current)); }
    window.addEventListener('resize', resize);
    return () => window.removeEventListener('resize', resize);
  }, []);
  useEffect(() => { if (open) searchRef.current?.focus({preventScroll: true}); }, [open]);
  useEffect(() => {
    function keyboard(event: globalThis.KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault(); setOpen((current) => !current);
      }
      if (event.key === 'Escape' && open) {
        setOpen(false);
        if (rootRef.current?.contains(document.activeElement)) toggleRef.current?.focus();
      }
    }
    window.addEventListener('keydown', keyboard);
    return () => window.removeEventListener('keydown', keyboard);
  }, [open]);
  function startDrag(event: PointerEvent<HTMLButtonElement>) {
    if (event.button !== 0) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    drag.current = {pointerId: event.pointerId, start: {x: event.clientX, y: event.clientY}, origin: position};
    setDragging(true);
  }
  function moveDrag(event: PointerEvent<HTMLButtonElement>) {
    const current = drag.current;
    if (!current || current.pointerId !== event.pointerId) return;
    setPosition(bounds({x: current.origin.x + event.clientX - current.start.x, y: current.origin.y + event.clientY - current.start.y}));
  }
  function endDrag() { drag.current = null; setDragging(false); }
  function moveWithKeys(event: KeyboardEvent<HTMLButtonElement>) {
    const delta = event.shiftKey ? 40 : 10;
    const direction = {ArrowLeft: [-delta, 0], ArrowRight: [delta, 0], ArrowUp: [0, -delta], ArrowDown: [0, delta]}[event.key];
    if (!direction) return;
    event.preventDefault();
    setPosition((current) => bounds({x: current.x + direction[0], y: current.y + direction[1]}));
  }
  function dock(corner: string) {
    setPosition(bounds({x: corner.endsWith('right') ? window.innerWidth : GAP, y: corner.startsWith('bottom') ? window.innerHeight : GAP}));
  }
  return (
    <div ref={rootRef} className={`library-menu${dragging ? ' is-dragging' : ''}`} style={{left: position.x, top: position.y}}>
      {open && <section id="library-panel" className="library-menu__panel" aria-label="UI library" style={{[above ? 'bottom' : 'top']: HEIGHT + 8, maxHeight: panelHeight}}>
        <header><h2>UI library</h2><span>{String(catalogue.length).padStart(2, '0')}</span></header>
        <div className="library-menu__search">
          <span aria-hidden="true">⌕</span>
          <input ref={searchRef} type="search" aria-label="Find a layout" placeholder="Find a layout…" value={query} onChange={(event) => setQuery(event.target.value)} />
          <kbd>esc</kbd>
        </div>
        <nav aria-label="UI library layouts">
          {items.map((item) => <a key={item.id} href={templatePath(item.id)} aria-current={item.id === selectedId ? 'page' : undefined} onClick={(event) => {
            if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) return;
            event.preventDefault(); onSelect(item.id);
          }}>
            <span className={`library-menu__layout-icon library-menu__layout-icon--${item.id}`} aria-hidden="true"><i /><i /></span>
            <span>{item.name}<small>{item.category}</small></span>
            {item.id === selectedId && <span className="library-menu__active" aria-hidden="true">●</span>}
          </a>)}
          {items.length === 0 && <p className="library-menu__empty">No layouts match “{query}”.</p>}
        </nav>
        <section className="library-menu__tweaks" aria-label="Tweaks">
          <h3>Tweaks</h3>
          <Theme theme={neutralTheme} mode="dark">
            <Switch label="100 extra sidebar items" value={tweaks.enabled} onChange={tweaks.setEnabled} labelPosition="start" labelSpacing="spread" size="sm" />
          </Theme>
        </section>
        <footer>
          <a href={templatePath(selectedId, true, readRoute().pageId)} target="_blank" rel="noreferrer">Open clean view <span aria-hidden="true">↗</span></a>
          <label className="sr-only" htmlFor="library-position">Move menu to corner</label>
          <select id="library-position" value="" onChange={(event) => dock(event.target.value)}>
            <option value="" disabled>Position</option>
            <option value="top-left">Top left</option><option value="top-right">Top right</option>
            <option value="bottom-left">Bottom left</option><option value="bottom-right">Bottom right</option>
          </select>
        </footer>
      </section>}
      <div className="library-menu__bar">
        <button className="library-menu__drag" type="button" aria-label="Move UI library menu" title="Drag to move, or focus and use arrow keys" onPointerDown={startDrag} onPointerMove={moveDrag} onPointerUp={endDrag} onPointerCancel={endDrag} onLostPointerCapture={endDrag} onKeyDown={moveWithKeys}>
          <svg aria-hidden="true" viewBox="0 0 12 20">{[5, 10, 15].flatMap((y) => [3, 9].map((x) => <circle key={`${x}-${y}`} cx={x} cy={y} r="1.2" />))}</svg>
        </button>
        <button ref={toggleRef} className="library-menu__toggle" type="button" aria-label={open ? 'Close UI library' : 'Open UI library'} aria-expanded={open} aria-controls="library-panel" aria-keyshortcuts="Control+k Meta+k" onClick={() => setOpen(!open)}>
          <span className="library-menu__mark">ui</span><span>{selected?.name ?? 'UI library'}</span><span className="library-menu__chevron" aria-hidden="true">{open ? '−' : '+'}</span>
        </button>
      </div>
    </div>
  );
}
