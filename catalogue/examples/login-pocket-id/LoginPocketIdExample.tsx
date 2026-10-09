import {useState} from 'react';
import {LoginPocketId} from '@da-facility/ui';
import type {ExampleProps} from '../../types';
import './login-pocket-id-example.css';

export function LoginPocketIdExample({tweaks}: ExampleProps) {
  const [message, setMessage] = useState('');
  const signIn = () => setMessage('Pocket ID would open here. This demo does not sign in.');

  return <>
    {tweaks.noAccess
      ? <LoginPocketId
          title="No access to this app"
          description="Your Pocket ID account isn’t in the group allowed to use this app. Ask an administrator for access."
        />
      : <LoginPocketId
          onSignIn={signIn}
          title={tweaks.expired ? 'Sign-in took too long' : undefined}
          description={tweaks.expired ? 'Sign-in has to finish within 10 minutes of starting. Start again; it’s quick if you’re still signed in to Pocket ID.' : undefined}
          buttonLabel={tweaks.expired ? 'Try again' : undefined}
        />}
    {message && <p className="login-pocket-id-example__status" role="status">{message}</p>}
  </>;
}
