import {useEffect, useId, useMemo, useRef, useState, type KeyboardEvent} from 'react';
import {Avatar} from '@astryxdesign/core/Avatar';
import {Icon} from '@astryxdesign/core/Icon';
import {Popover} from '@astryxdesign/core/Popover';
import '../../shared/scroll-edges.css';
import './project-selector.css';

export type Project = {
  id: string;
  name: string;
  /** Secondary line, such as a team, plan or URL. */
  description?: string;
  /** Logo. Without one, the project's initials are shown. */
  imageUrl?: string;
};

export type ProjectSelectorProps = {
  projects: Project[];
  /** The selected project's id. */
  value: string;
  onChange: (id: string) => void;
  /** Heading in the menu and the accessible name of the search. */
  label?: string;
  /** Shows a create action at the end of the menu. */
  onCreate?: () => void;
  createLabel?: string;
};

/**
 * Button showing the current project that opens a searchable list of projects.
 * The search starts compact and widens once there is something typed in it.
 */
export function ProjectSelector({projects, value, onChange, label = 'Projects', onCreate, createLabel = 'New project'}: ProjectSelectorProps) {
  const id = useId();
  const [isOpen, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const listRef = useRef<HTMLUListElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  // Typing works straight away: the search has focus whenever the menu opens.
  useEffect(() => {
    if (!isOpen) return;
    const frame = requestAnimationFrame(() => searchRef.current?.focus({preventScroll: true}));
    return () => cancelAnimationFrame(frame);
  }, [isOpen]);

  const selected = projects.find(project => project.id === value);
  const matches = useMemo(() => {
    const search = query.trim().toLowerCase();
    return projects.filter(project => `${project.name} ${project.description ?? ''}`.toLowerCase().includes(search));
  }, [projects, query]);
  const optionId = (index: number) => `${id}-option-${index}`;

  function setOpenState(open: boolean) {
    setOpen(open);
    setQuery('');
    setActiveIndex(Math.max(0, projects.findIndex(project => project.id === value)));
  }

  function select(project: Project) {
    onChange(project.id);
    setOpenState(false);
  }

  function moveActive(index: number) {
    const next = Math.min(Math.max(index, 0), matches.length - 1);
    setActiveIndex(next);
    document.getElementById(optionId(next))?.scrollIntoView({block: 'nearest'});
  }

  function onKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    const actions: Record<string, () => void> = {
      ArrowDown: () => moveActive(activeIndex + 1),
      ArrowUp: () => moveActive(activeIndex - 1),
      Home: () => moveActive(0),
      End: () => moveActive(matches.length - 1),
      Enter: () => matches[activeIndex] && select(matches[activeIndex]),
    };
    // The first Escape clears the search; the next one closes the menu.
    if (event.key === 'Escape' && query) actions.Escape = () => updateQuery('');
    const action = actions[event.key];
    if (!action) return;
    event.preventDefault();
    event.stopPropagation();
    action();
  }

  function updateQuery(next: string) {
    setQuery(next);
    setActiveIndex(0);
    listRef.current?.scrollTo({top: 0});
  }

  const content = <div className="project-selector__menu">
    <div className="project-selector__bar" data-searching={query ? '' : undefined}>
      <span className="project-selector__heading" aria-hidden={query ? true : undefined}>{label}</span>
      <label className="project-selector__search">
        <Icon icon="search" size="sm" color="secondary" />
        <input
          ref={searchRef}
          type="text"
          role="combobox"
          aria-label={`Search ${label.toLowerCase()}`}
          aria-expanded
          aria-controls={`${id}-list`}
          aria-autocomplete="list"
          aria-activedescendant={matches[activeIndex] ? optionId(activeIndex) : undefined}
          placeholder="Search"
          autoComplete="off"
          spellCheck={false}
          value={query}
          onChange={event => updateQuery(event.target.value)}
          onKeyDown={onKeyDown}
        />
        <button
          className="project-selector__clear"
          type="button"
          aria-label="Clear search"
          tabIndex={-1}
          onClick={() => updateQuery('')}>
          <Icon icon="close" size="sm" color="secondary" />
        </button>
      </label>
    </div>
    <ul ref={listRef} id={`${id}-list`} className="project-selector__list scroll-edges" role="listbox" aria-label={label}>
      {matches.map((project, index) => <li
        key={project.id}
        id={optionId(index)}
        className="project-selector__option"
        role="option"
        aria-selected={project.id === value}
        data-active={index === activeIndex ? '' : undefined}
        onPointerMove={() => setActiveIndex(index)}
        onClick={() => select(project)}>
        <ProjectIdentity project={project} />
        {project.id === value && <Icon icon="check" size="sm" />}
      </li>)}
    </ul>
    {matches.length === 0 && <p className="project-selector__empty">No projects match “{query.trim()}”.</p>}
    {onCreate && <button
      className="project-selector__create"
      type="button"
      onClick={() => {
        setOpenState(false);
        onCreate();
      }}>
      <span aria-hidden="true">+</span>
      {createLabel}
    </button>}
  </div>;

  return (
    <Popover
      className="project-selector__popover"
      content={content}
      label={label}
      isOpen={isOpen}
      onOpenChange={setOpenState}
      placement="below"
      alignment="start"
      width={280}
      hasAutoFocus={false}>
      {trigger => <button {...trigger} className="project-selector__trigger" type="button" aria-label={`${label}: ${selected?.name ?? 'none selected'}`}>
        {selected ? <ProjectIdentity project={selected} /> : <span className="project-selector__placeholder">Select a project</span>}
        <Icon icon="arrowsUpDown" size="sm" color="secondary" />
      </button>}
    </Popover>
  );
}

function ProjectIdentity({project}: {project: Project}) {
  return <span className="project-selector__identity">
    <Avatar name={project.name} src={project.imageUrl} size={24} shape="rounded" tooltip={false} />
    <span className="project-selector__text">
      <span>{project.name}</span>
      {project.description && <small>{project.description}</small>}
    </span>
  </span>;
}
