import {useState} from 'react';
import {Button} from '@astryxdesign/core/Button';
import {LoginSplit} from '@da-facility/ui';
import './login-split-example.css';

const ASSETS = 'https://lookaside.facebook.com/assets/astryx';

export function LoginSplitExample() {
  const [message, setMessage] = useState('');

  async function signIn({password}: {password: string}) {
    await new Promise(resolve => setTimeout(resolve, 900));
    if (password === 'wrong') throw new Error('That password is incorrect. Try again.');
    setMessage('Signed in. This demo accepts any password except “wrong”.');
  }

  return <>
    <LoginSplit
      brand="Product Inc."
      description="Login to your Product Inc. account"
      artwork={<img src={`${ASSETS}/light-working-vertical-1.png`} alt="Two people working together at a desk" />}
      onSubmit={signIn}
      forgotPasswordHref="#forgot-password"
      providers={['Apple', 'Google'].map(provider => <Button
        key={provider}
        label={provider}
        variant="secondary"
        icon={<img src={`${ASSETS}/${provider}Logo.png`} width={16} height={16} alt="" />}
        onClick={() => setMessage(`${provider} sign-in is not part of this demo.`)}
      />)}
      signup={<>Don’t have an account? <a href="#sign-up">Sign up</a></>}
    />
    {message && <p className="login-split-example__status" role="status">{message}</p>}
  </>;
}
