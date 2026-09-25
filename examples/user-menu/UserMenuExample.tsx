import {useState} from 'react';
import {UserCircleIcon, Cog6ToothIcon, ArrowRightStartOnRectangleIcon} from '@heroicons/react/24/outline';
import {UserMenu, type UserMenuProps} from '../../src';
import './user-menu-example.css';

export function UserMenuExample() {
  const [action, setAction] = useState('');
  const items: UserMenuProps['items'] = [
    {id: 'profile', label: 'Profile', icon: UserCircleIcon, onClick: () => setAction('Profile selected')},
    {id: 'settings', label: 'Settings', icon: Cog6ToothIcon, onClick: () => setAction('Settings selected')},
    {type: 'divider'},
    {id: 'sign-out', label: 'Sign out', icon: ArrowRightStartOnRectangleIcon, onClick: () => setAction('Sign out selected. This example does not end a session.')},
  ];
  return <main className="user-menu-example">
    <h1>User menu</h1>
    <div className="user-menu-example__variants">
      <section><h2>Picture and name</h2><UserMenu user={{name: 'Alex Johnson', description: 'alex@example.com', imageUrl: 'https://github.com/ghost.png'}} items={items} alignment="start" /></section>
      <section><h2>Initials</h2><UserMenu user={{name: 'Sam Rivera', description: 'Workspace admin'}} items={items} alignment="start" /></section>
      <section><h2>Compact</h2><UserMenu user={{name: 'Alex Johnson', imageUrl: 'https://github.com/ghost.png'}} items={items} compact alignment="start" /></section>
    </div>
    <p role="status">{action || 'Choose an account action to try the menu.'}</p>
    <pre><code>{`<UserMenu\n  user={{name: 'Alex Johnson', imageUrl: '/avatar.jpg'}}\n  items={[{label: 'Settings', onClick: openSettings}]}\n/>`}</code></pre>
  </main>;
}
