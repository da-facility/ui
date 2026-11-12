import {useState} from 'react';
import {LoginEmailCode, type LoginEmailCodeFailure} from '@da-facility/ui';
import {demoPhoto} from '../shared/photos';
import type {ExampleProps} from '../../types';
import './login-email-code-example.css';

const CODE = '419072';
const wait = (milliseconds: number) => new Promise(resolve => setTimeout(resolve, milliseconds));

export function LoginEmailCodeExample({tweaks}: ExampleProps) {
  const [signedIn, setSignedIn] = useState('');
  const cover = demoPhoto(7);

  // A stand-in backend: the app passes handlers like these and owns the requests.
  async function requestCode(): Promise<void | LoginEmailCodeFailure> {
    await wait(600);
    if (tweaks.locked) return {reason: 'too-many-attempts', retryAfterMinutes: 15};
  }

  async function verifyCode(code: string, email: string): Promise<void | LoginEmailCodeFailure> {
    await wait(700);
    if (tweaks.locked) return {reason: 'too-many-attempts', retryAfterMinutes: 15};
    if (code === '000000') return {reason: 'expired-code'};
    if (code !== CODE) return {reason: 'invalid-code'};
    setSignedIn(email);
  }

  return <>
    <LoginEmailCode
      key={`${tweaks.codeStep}-${tweaks.locked}`}
      brand="Product Inc."
      brandPanel={tweaks.brandPanel && <div className="login-email-code-example__panel">
        <img src={cover.previewUrl} alt="" />
        <p>Photographs from the venue to the client in minutes.</p>
      </div>}
      onRequestCode={requestCode}
      onVerifyCode={verifyCode}
      defaultEmail={tweaks.codeStep ? 'taylor@example.com' : undefined}
      defaultStep={tweaks.codeStep ? 'code' : 'email'}
      codeDescription={email => <>We sent a code to {email}. It is valid for 10 minutes. This demo accepts {CODE}.</>}
      footer={<>By signing in you accept the <a href="#terms">terms of use</a>.</>}
    />
    {signedIn && <p className="login-email-code-example__status" role="status">Signed in as {signedIn}.</p>}
  </>;
}
