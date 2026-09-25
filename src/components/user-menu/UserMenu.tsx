import type {ReactElement} from 'react';
import {Avatar} from '@astryxdesign/core/Avatar';
import {DropdownMenu, type DropdownMenuOption, type DropdownMenuProps} from '@astryxdesign/core/DropdownMenu';
import './user-menu.css';

export type UserMenuProps = {
  user: {name: string; description?: string; imageUrl?: string};
  items: DropdownMenuOption[];
  compact?: boolean;
  placement?: DropdownMenuProps['placement'];
  alignment?: DropdownMenuProps['alignment'];
  isOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
};

/** Account identity and actions. The caller supplies navigation and authentication. */
export function UserMenu({user, items, compact = false, placement = 'below', alignment = 'end', isOpen, onOpenChange}: UserMenuProps): ReactElement {
  return (
    <DropdownMenu
      className="user-menu"
      button={{
        className: `user-menu__trigger${compact ? ' user-menu__trigger--compact' : ''}`,
        variant: 'ghost',
        'aria-label': `Account menu for ${user.name}`,
        label: `Account menu for ${user.name}`,
        children: <span className="user-menu__content">
          <Avatar name={user.name} src={user.imageUrl} size={32} tooltip={false} />
          {!compact && <span className="user-menu__identity"><span>{user.name}</span>{user.description && <small>{user.description}</small>}</span>}
        </span>,
      }}
      hasChevron={!compact}
      placement={placement}
      alignment={alignment}
      menuWidth={260}
      isMenuOpen={isOpen}
      onOpenChange={onOpenChange}
      items={[{type: 'section', title: user.description ? `${user.name} · ${user.description}` : user.name, items: []}, ...items]}
    />
  );
}
