import {useState} from 'react';
import {LoginSplit} from '../../src';

export function LoginSplitExample() {
  const [message, setMessage] = useState('');
  return <>
    <LoginSplit brand="Product Inc." description="Login to your Product Inc. account"
      artwork={<img src="https://lookaside.facebook.com/assets/astryx/light-working-vertical-1.png" alt="Two people working together at a desk" />}
      onSubmit={async () => { await new Promise(resolve => setTimeout(resolve, 900)); setMessage('Demo sign-in complete. No account was accessed.'); }}
      providers={<>{['Apple', 'Google'].map(provider => <button key={provider} type="button" onClick={() => setMessage(`${provider} sign-in is a demo.`)}><img src={`https://lookaside.facebook.com/assets/astryx/${provider}Logo.png`} width="16" height="16" alt="" />{provider}</button>)}</>}
    />
    {message && <p role="status" style={{position: 'fixed', bottom: 72, left: 24, right: 24, textAlign: 'center'}}>{message}</p>}
  </>;
}
