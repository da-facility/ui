import {Avatar} from '@astryxdesign/core/Avatar';
import {DropdownMenu, type DropdownMenuOption, type DropdownMenuProps} from '@astryxdesign/core/DropdownMenu';
import {useMessages} from '../../i18n';
import './user-menu.css';

/** An action, divider or section in the menu. Same shape as Astryx `DropdownMenu` items. */
export type UserMenuItem = DropdownMenuOption;

export type UserMenuProps = {
  /** Shown in the trigger and as the menu heading. Without `imageUrl`, the avatar shows initials. */
  user: {name: string; description?: string; imageUrl?: string};
  /** Account actions. The app owns navigation and authentication. */
  items: UserMenuItem[];
  /** Show only the avatar, a 44px target for narrow headers such as the phone top bar. */
  compact?: boolean;
  /** Fill the container's width, for example in a sidebar footer. */
  isFullWidth?: boolean;
  placement?: DropdownMenuProps['placement'];
  alignment?: DropdownMenuProps['alignment'];
  /**
   * Names the trigger for screen readers. The accessible name is this, a
   * colon, then what the trigger shows (the name and description, or the
   * name alone when `compact`), so name and visible text agree (WCAG 2.5.3).
   * Without it the name is "Account menu for" and what the trigger shows.
   */
  label?: string;
  /**
   * Repeat the person's name and description as the menu's heading. Turn it
   * off when the trigger already shows them, such as a full-width row.
   * Defaults to true.
   */
  hasHeading?: boolean;
  /**
   * The menu's width in pixels, or `'trigger'` for at least the trigger's
   * width (a full-width row and its menu line up). Defaults to 260.
   */
  menuWidth?: number | 'trigger';
  /** Controlled open state. */
  isOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
};

/** Account avatar and name that opens a menu of account actions. */
export function UserMenu({
  user,
  items,
  compact = false,
  isFullWidth = false,
  placement = 'below',
  alignment = 'end',
  label,
  hasHeading = true,
  menuWidth = 260,
  isOpen,
  onOpenChange,
}: UserMenuProps) {
  const t = useMessages();
  const shown = compact || !user.description ? user.name : `${user.name} ${user.description}`;
  // Astryx's Button names itself with an aria-label: the label, then what the trigger shows.
  const name = label ? `${label}: ${shown}` : t('@da-facility.userMenu.label', {name: shown});
  const heading = user.description ? `${user.name} · ${user.description}` : user.name;
  return (
    <span className={['user-menu', compact && 'user-menu--compact', isFullWidth && 'user-menu--full-width'].filter(Boolean).join(' ')}>
      <DropdownMenu
        button={{
          className: ['user-menu__trigger', compact && 'user-menu__trigger--compact', isFullWidth && 'user-menu__trigger--full-width'].filter(Boolean).join(' '),
          width: isFullWidth ? '100%' : undefined,
          variant: 'ghost',
          label: name,
          children: <span className="user-menu__content">
            {/* Room for the avatar, which is drawn over it from outside the button (below). */}
            <span className="user-menu__avatar-room" />
            {!compact && <span className="user-menu__identity">
              <span>{user.name}</span>
              {/* A space, unseen in the grid, so the text reads "name description", as the accessible name does. */}
              {user.description && <>{' '}<small>{user.description}</small></>}
            </span>}
          </span>,
        }}
        hasChevron={!compact}
        placement={placement}
        alignment={alignment}
        menuWidth={menuWidth === 'trigger' ? undefined : menuWidth}
        isMenuOpen={isOpen}
        onOpenChange={onOpenChange}
        items={hasHeading ? [{type: 'section', title: heading, items: []}, ...items] : items}
      />
      {/*
        The avatar sits outside the button, over its room, and lets clicks through.
        Inside, its initials would be visible text the aria-label leaves out
        (WCAG 2.5.3); they only repeat the name.
      */}
      <span className="user-menu__avatar" aria-hidden="true">
        <Avatar name={user.name} src={user.imageUrl} size={32} tooltip={false} />
      </span>
    </span>
  );
}

