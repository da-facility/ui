import {Fragment, type MouseEvent, type ReactNode} from 'react';
import {BreadcrumbItem, Breadcrumbs} from '@astryxdesign/core/Breadcrumbs';
import {Icon} from '@astryxdesign/core/Icon';
import {useMessages} from '../../i18n';
import './page-header.css';

export type PageHeaderBreadcrumb = {
  label: string;
  /** Where the part leads. Links go through Astryx's `LinkProvider`, so the app's router handles them. */
  href?: string;
  onClick?: (event: MouseEvent<HTMLElement>) => void;
};

export type PageHeaderChip = {
  id: string;
  label: string;
  /** Whether this filter is on; chosen chips are drawn in the accent with a tick. */
  isSelected?: boolean;
};

export type PageHeaderProps = {
  /** The page's one title, such as a gallery or project name as written by its owner. */
  title: ReactNode;
  /**
   * The path to this page. Every part but the last is a link; the last is the
   * current page. Leave out for top-level pages.
   */
  breadcrumbs?: PageHeaderBreadcrumb[];
  /**
   * What is known about the page, such as place, date and counts, shown under
   * the title separated by " · ". Empty parts are left out.
   */
  meta?: ReactNode[];
  /** Page actions to the right of the title, wrapping under it on phones. At most one primary. */
  actions?: ReactNode;
  /** A search field at the start of the row under the title, such as Astryx's `TextInput`. */
  search?: ReactNode;
  /** Filter suggestions after the search, as toggle chips. */
  chips?: PageHeaderChip[];
  /** Called with a chip's id when it is pressed; the app turns the filter on or off. */
  onChipClick?: (id: string) => void;
  /** Accessible name of the chips. Defaults to "Filters". */
  chipsLabel?: string;
  /** Heading level of the title. Defaults to 1, as the page's only `h1`. */
  headingLevel?: 1 | 2;
};

/**
 * The top of a page: breadcrumbs, the title with a meta line and actions, and
 * a row for search and filter chips.
 */
export function PageHeader({title, breadcrumbs, meta, actions, search, chips, onChipClick, chipsLabel, headingLevel = 1}: PageHeaderProps) {
  const t = useMessages();
  const Heading = headingLevel === 1 ? 'h1' : 'h2';
  const metaParts = (meta ?? []).filter(isPresent);
  const hasTools = isPresent(search) || (chips?.length ?? 0) > 0;
  return <header className="page-header">
    {breadcrumbs && breadcrumbs.length > 0 && <Breadcrumbs className="page-header__breadcrumbs">
      {breadcrumbs.map((crumb, index) => {
        const isCurrent = index === breadcrumbs.length - 1;
        return <BreadcrumbItem key={`${index}-${crumb.label}`} href={isCurrent ? undefined : crumb.href} onClick={isCurrent ? undefined : crumb.onClick} isCurrent={isCurrent}>{crumb.label}</BreadcrumbItem>;
      })}
    </Breadcrumbs>}
    <div className="page-header__title-row">
      <div className="page-header__title">
        <Heading>{title}</Heading>
        {metaParts.length > 0 && <p className="page-header__meta">
          {metaParts.map((part, index) => <Fragment key={index}>
            {index > 0 && <span className="page-header__separator" aria-hidden="true"> · </span>}
            <span>{part}</span>
          </Fragment>)}
        </p>}
      </div>
      {isPresent(actions) && <div className="page-header__actions">{actions}</div>}
    </div>
    {hasTools && <div className="page-header__tools">
      {isPresent(search) && <div className="page-header__search">{search}</div>}
      {chips && chips.length > 0 && <div className="page-header__chips" role="group" aria-label={chipsLabel ?? t('@da-facility.pageHeader.filters')}>
        {chips.map(chip => <button
          key={chip.id}
          type="button"
          className="page-header__chip"
          aria-pressed={Boolean(chip.isSelected)}
          onClick={() => onChipClick?.(chip.id)}
        >
          {chip.isSelected && <Icon icon="check" size="sm" color="inherit" />}
          {chip.label}
        </button>)}
      </div>}
    </div>}
  </header>;
}

/** Slots left empty with `false`, as in `actions={canDownload && <Button … />}`, render nothing. */
function isPresent(node: ReactNode) {
  return node != null && node !== false && node !== '';
}
