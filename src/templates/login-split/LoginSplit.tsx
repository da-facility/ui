// Adapted from Meta Astryx Login Split. See LICENSE.third-party.
import {useId, useRef, useState, type FormEvent, type ReactNode} from 'react';
import './login-split.css';

export type LoginSplitProps = {
  brand: ReactNode;
  artwork: ReactNode;
  onSubmit: (credentials: {email: string; password: string}) => void | Promise<void>;
  title?: string;
  description?: string;
  forgotPasswordHref?: string;
  signup?: ReactNode;
  legal?: ReactNode;
  providers?: ReactNode;
};

export function LoginSplit({brand, artwork, onSubmit, title = 'Welcome back', description,
  forgotPasswordHref, signup, legal, providers,
}: LoginSplitProps) {
  const id = useId();
  const submitting = useRef(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting.current) return;
    const form = new FormData(event.currentTarget);
    submitting.current = true;
    setPending(true);
    setError('');
    try {
      await onSubmit({email: String(form.get('email')).trim(), password: String(form.get('password'))});
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to sign in. Please try again.');
    } finally {
      submitting.current = false;
      setPending(false);
    }
  }

  return <main className="login-split">
    <div className="login-split__shell">
      <section className="login-split__card" aria-labelledby={`${id}-title`}>
        <div className="login-split__grid">
          <div className="login-split__form-panel">
            <div className="login-split__brand">{brand}</div>
            <div className="login-split__form-center">
              <form className="login-split__form" onSubmit={submit} aria-busy={pending}>
                <header className="login-split__heading"><h1 id={`${id}-title`}>{title}</h1>{description && <p>{description}</p>}</header>
                <div className="login-split__fields">
                  <label className="login-split__sr-only" htmlFor={`${id}-email`}>Email</label>
                  <input id={`${id}-email`} name="email" type="email" autoComplete="email" placeholder="name@company.com" required readOnly={pending} />
                  <label className="login-split__sr-only" htmlFor={`${id}-password`}>Password</label>
                  <input id={`${id}-password`} name="password" type="password" autoComplete="current-password" placeholder="Enter your password" required readOnly={pending} aria-describedby={error ? `${id}-error` : undefined} />
                  {error && <p className="login-split__field-error" id={`${id}-error`} role="alert">{error}</p>}
                  {forgotPasswordHref && <a className="login-split__forgot" href={forgotPasswordHref}>Forgot your password?</a>}
                </div>
                <button className="login-split__submit" type="submit" disabled={pending}>{pending ? 'Signing in…' : 'Login'}</button>
                {providers && <><div className="login-split__divider"><span>Or continue with</span></div><div className="login-split__providers">{providers}</div></>}
              </form>
            </div>
            {signup && <div className="login-split__signup">{signup}</div>}
          </div>
          <div className="login-split__cover">{artwork}</div>
        </div>
      </section>
      {legal && <div className="login-split__legal">{legal}</div>}
    </div>
  </main>;
}
