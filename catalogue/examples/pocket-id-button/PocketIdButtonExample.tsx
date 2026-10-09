import {useState} from 'react';
import {PocketIdButton} from '@da-facility/ui';
import './pocket-id-button-example.css';

export function PocketIdButtonExample() {
  const [message, setMessage] = useState('');
  const press = (variant: string) => () => setMessage(`${variant} pressed. This demo does not sign in.`);

  return <main className="pocket-id-button-example">
    <h1>Pocket ID button</h1>
    <div className="pocket-id-button-example__variants">
      <section>
        <h2>Default</h2>
        <PocketIdButton onClick={press('Default')} />
      </section>
      <section>
        <h2>Link</h2>
        <PocketIdButton href="#sign-in" label="Continue with Pocket ID" />
      </section>
      <section>
        <h2>Custom label</h2>
        <PocketIdButton label="Log in with Pocket ID" onClick={press('Custom label')} />
      </section>
      <section>
        <h2>Full width</h2>
        <PocketIdButton isFullWidth onClick={press('Full width')} />
      </section>
    </div>
    <p role="status">{message}</p>
  </main>;
}
