import {useState} from 'react';
import {ArrowRightStartOnRectangleIcon, Cog6ToothIcon, UserCircleIcon} from '@heroicons/react/24/outline';
import {UserMenu, type UserMenuItem} from '@da-facility/ui';
import './user-menu-example.css';

const AVATAR = 'https://github.com/ghost.png';

export function UserMenuExample() {
  const [status, setStatus] = useState('Choose an account action to try the menu.');
  const items: UserMenuItem[] = [
    {id: 'profile', label: 'Profile', icon: UserCircleIcon, onClick: () => setStatus('Profile selected.')},
    {id: 'settings', label: 'Settings', icon: Cog6ToothIcon, onClick: () => setStatus('Settings selected.')},
    {type: 'divider'},
    {id: 'sign-out', label: 'Sign out', icon: ArrowRightStartOnRectangleIcon, onClick: () => setStatus('Sign out selected. This demo does not end a session.')},
  ];

  return <main className="user-menu-example">
    <h1>User menu</h1>
    <div className="user-menu-example__variants">
      <section>
        <h2>Picture and name</h2>
        <UserMenu user={{name: 'Alex Johnson', description: 'alex@example.com', imageUrl: AVATAR}} items={items} alignment="start" />
      </section>
      <section>
        <h2>Initials</h2>
        <UserMenu user={{name: 'Sam Rivera', description: 'Workspace admin'}} items={items} alignment="start" />
      </section>
      <section>
        <h2>Compact</h2>
        <UserMenu user={{name: 'Alex Johnson', imageUrl: AVATAR}} items={items} compact alignment="start" />
      </section>
    </div>
    <p role="status">{status}</p>
  </main>;
}
