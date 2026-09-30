import {useEffect, useRef, useState} from 'react';
import {Switch} from '@astryxdesign/core/Switch';
import {Theme} from '@astryxdesign/core/theme';
import {neutralTheme} from '@astryxdesign/theme-neutral/built';
import {examples} from '../examples';
import {navigate, routePath} from '../router';
import {useStoredState} from '../storage';
import type {Example, Tweak} from '../types';
import {useFloatingPosition, type Corner} from './useFloatingPosition';
import './catalogue-menu.css';

const BAR = {width: 280, height: 48};
const KINDS: Example['kind'][] = ['Layout', 'Template', 'Component'];

export type MenuTweak = Tweak & {value: boolean; onChange: (value: boolean) => void};

type CatalogueMenuProps = {
  selectedId: string;
  page?: string;
  tweaks: MenuTweak[];
};

/**
 * Floating dev menu: the current example's tweaks stay in view beside a
 * draggable bar, and the list of examples opens from the bar (⌘K / Ctrl+K).
 */
export function CatalogueMenu({selectedId, page, tweaks}: CatalogueMenuProps) {
  const {elementRef, style, opensUp, isDragging, handleProps, dock} = useFloatingPosition('menu-anchor', BAR);
  const [isOpen, setOpen] = useStoredState('menu-open', false);
  // Collapsed by default on phones, where the list would cover the page.
  const [showTweaks, setShowTweaks] = useStoredState('menu-tweaks', typeof window === 'undefined' || window.innerWidth > 768);
  const [query, setQuery] = useState('');
  const toggleRef = useRef<HTMLButtonElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) searchRef.current?.focus({preventScroll: true});
  }, [isOpen]);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setOpen(open => !open);
      } else if (event.key === 'Escape' && isOpen) {
        setOpen(false);
        if (elementRef.current?.contains(document.activeElement)) toggleRef.current?.focus();
      }
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen, setOpen, elementRef]);

  const selected = examples.find(example => example.id === selectedId);
  const matches = examples.filter(example => `${example.name} ${example.kind}`.toLowerCase().includes(query.trim().toLowerCase()));
  const groups = [...new Set(tweaks.map(tweak => tweak.group ?? 'Tweaks'))];

  return (
    <div
      ref={elementRef}
      className="catalogue-menu"
      data-opens-up={opensUp || undefined}
      data-dragging={isDragging || undefined}
      style={{...style, width: BAR.width}}>
      {isOpen && <section id="catalogue-panel" className="catalogue-menu__panel" aria-label="Catalogue">
        <header className="catalogue-menu__header">
          <h2>Da Facility UI</h2>
          <span>{examples.length} examples</span>
        </header>
        <label className="catalogue-menu__search">
          <span aria-hidden="true">⌕</span>
          <input
            ref={searchRef}
            type="search"
            aria-label="Find an example"
            placeholder="Find an example…"
            value={query}
            onChange={event => setQuery(event.target.value)}
          />
          <kbd>esc</kbd>
        </label>
        <nav aria-label="Examples">
          {KINDS.map(kind => {
            const items = matches.filter(example => example.kind === kind);
            if (items.length === 0) return null;
            return <section key={kind} aria-label={`${kind}s`}>
              <h3 className="catalogue-menu__kind">{kind}s</h3>
              {items.map(example => <a
                key={example.id}
                href={routePath({exampleId: example.id, isClean: false})}
                aria-current={example.id === selectedId ? 'page' : undefined}
                onClick={event => {
                  if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) return;
                  event.preventDefault();
                  navigate({exampleId: example.id, isClean: false});
                }}>
                <span className="catalogue-menu__icon" data-kind={example.kind} aria-hidden="true"><i /><i /></span>
                <span>{example.name}<small>{example.description}</small></span>
              </a>)}
            </section>;
          })}
          {matches.length === 0 && <p className="catalogue-menu__empty">No examples match “{query}”.</p>}
        </nav>
        <footer className="catalogue-menu__footer">
          <a href={routePath({exampleId: selectedId, page, isClean: true})} target="_blank" rel="noreferrer">
            Open clean view <span aria-hidden="true">↗</span>
          </a>
          <select aria-label="Move menu to corner" value="" onChange={event => dock(event.target.value as Corner)}>
            <option value="" disabled>Position</option>
            <option value="top-left">Top left</option>
            <option value="top-right">Top right</option>
            <option value="bottom-left">Bottom left</option>
            <option value="bottom-right">Bottom right</option>
          </select>
        </footer>
      </section>}
      <div className="catalogue-menu__dock">
        {tweaks.length > 0 && <section className="catalogue-menu__tweaks" aria-label="Tweaks">
          <button className="catalogue-menu__tweaks-toggle" type="button" aria-expanded={showTweaks} onClick={() => setShowTweaks(!showTweaks)}>
            Tweaks <span aria-hidden="true">{showTweaks ? '−' : '+'}</span>
          </button>
          {showTweaks && <div className="catalogue-menu__tweak-list">
            <Theme theme={neutralTheme} mode="dark">
              {groups.map(group => <div key={group} className="catalogue-menu__tweak-group" role="group" aria-label={group}>
                <h3>{group}</h3>
                {tweaks.filter(tweak => (tweak.group ?? 'Tweaks') === group).map(tweak => <div key={tweak.id}>
                  <Switch
                    label={tweak.label}
                    value={tweak.value}
                    onChange={tweak.onChange}
                    labelPosition="start"
                    labelSpacing="spread"
                    size="sm"
                  />
                </div>)}
              </div>)}
            </Theme>
          </div>}
        </section>}
        <div className="catalogue-menu__bar">
          <button
            className="catalogue-menu__handle"
            type="button"
            aria-label="Move catalogue menu"
            title="Drag to move, or focus and use the arrow keys"
            {...handleProps}>
            <svg aria-hidden="true" viewBox="0 0 12 20">
              {[5, 10, 15].flatMap(y => [3, 9].map(x => <circle key={`${x}-${y}`} cx={x} cy={y} r="1.2" />))}
            </svg>
          </button>
          <button
            ref={toggleRef}
            className="catalogue-menu__toggle"
            type="button"
            aria-label={isOpen ? 'Close catalogue' : 'Open catalogue'}
            aria-expanded={isOpen}
            aria-controls="catalogue-panel"
            aria-keyshortcuts="Control+K Meta+K"
            onClick={() => setOpen(!isOpen)}>
            <span className="catalogue-menu__mark">ui</span>
            <span>{selected?.name ?? 'Catalogue'}</span>
            <span className="catalogue-menu__chevron" aria-hidden="true">{isOpen ? '−' : '+'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
