import {useState} from 'react';
import {CodeInput} from '@da-facility/ui';
import type {ExampleProps} from '../../types';
import './code-input-example.css';

const CODE = '419072';
const WRONG = 'That code isn’t right. Check your email or request a new code.';

export function CodeInputExample({tweaks}: ExampleProps) {
  const length = tweaks.fourDigits ? 4 : 6;
  const code = CODE.slice(0, length);
  const [value, setValue] = useState(tweaks.error ? '419070'.slice(0, length) : '');
  const [error, setError] = useState(tweaks.error ? WRONG : '');
  const [isChecking, setChecking] = useState(false);
  const [isSignedIn, setSignedIn] = useState(false);

  async function check(entered: string) {
    setChecking(true);
    await new Promise(resolve => setTimeout(resolve, 700));
    setChecking(false);
    if (entered === code) setSignedIn(true);
    else setError(WRONG);
  }

  return <main className="code-input-example">
    <section className="code-input-example__card" aria-labelledby="code-input-example-title">
      <h1 id="code-input-example-title">Enter the code</h1>
      <p>We sent a code to taylor@example.com. It is valid for 10 minutes. This demo accepts {code}.</p>
      <CodeInput
        key={length}
        length={length}
        value={value}
        onChange={next => {
          setValue(next);
          setError('');
          setSignedIn(false);
        }}
        onComplete={check}
        error={error}
        isChecking={isChecking || tweaks.checking}
        isDisabled={tweaks.disabled}
        autoFocus={!tweaks.disabled}
      />
      {isSignedIn && <p className="code-input-example__status" role="status">Signed in.</p>}
    </section>
  </main>;
}
