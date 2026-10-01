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
  /** Show only the avatar, for narrow headers. */
  compact?: boolean;
  /** Fill the container's width, for example in a sidebar footer. */
  isFullWidth?: boolean;
  placement?: DropdownMenuProps['placement'];
  alignment?: DropdownMenuProps['alignment'];
  /** Controlled open state. */
  isOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
};

/** Account avatar and name that opens a menu of account actions. */
export function UserMenu({user, items, compact = false, isFullWidth = false, placement = 'below', alignment = 'end', isOpen, onOpenChange}: UserMenuProps) {
  const t = useMessages();
  const label = t('@da-facility.userMenu.label', {name: user.name});
  const heading = user.description ? `${user.name} · ${user.description}` : user.name;
  return (
    <DropdownMenu
      button={{
        className: ['user-menu__trigger', compact && 'user-menu__trigger--compact', isFullWidth && 'user-menu__trigger--full-width'].filter(Boolean).join(' '),
        width: isFullWidth ? '100%' : undefined,
        variant: 'ghost',
        label,
        'aria-label': label,
        children: <span className="user-menu__content">
          <Avatar name={user.name} src={user.imageUrl} size={32} tooltip={false} />
          {!compact && <span className="user-menu__identity">
            <span>{user.name}</span>
            {user.description && <small>{user.description}</small>}
          </span>}
        </span>,
      }}
      hasChevron={!compact}
      placement={placement}
      alignment={alignment}
      menuWidth={260}
      isMenuOpen={isOpen}
      onOpenChange={onOpenChange}
      items={[{type: 'section', title: heading, items: []}, ...items]}
    />
  );
}
