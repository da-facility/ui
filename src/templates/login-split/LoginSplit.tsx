// Adapted from the Meta Astryx Login Split template. See LICENSE.third-party.
import {useId, useRef, useState, type FormEvent, type ReactNode} from 'react';
import {Button} from '@astryxdesign/core/Button';
import './login-split.css';

export type LoginCredentials = {email: string; password: string};

export type LoginSplitProps = {
  /** Logo or product name above the form. */
  brand: ReactNode;
  /** Cover shown beside the form on desktop and above it on mobile, usually an `<img>`. */
  artwork: ReactNode;
  /**
   * Called with the entered credentials. Throw (or reject) to show the error's
   * message under the form. The app owns authentication and redirects.
   */
  onSubmit: (credentials: LoginCredentials) => void | Promise<void>;
  title?: string;
  description?: string;
  forgotPasswordHref?: string;
  /** Alternative sign-in buttons, shown under "Or continue with". */
  providers?: ReactNode;
  /** Content at the bottom of the form column, such as a sign-up link. */
  signup?: ReactNode;
  /** Content below the card, such as terms and privacy links. */
  legal?: ReactNode;
};

/** Full-page sign-in with an email and password form beside a cover image. */
export function LoginSplit({
  brand,
  artwork,
  onSubmit,
  title = 'Welcome back',
  description,
  forgotPasswordHref,
  providers,
  signup,
  legal,
}: LoginSplitProps) {
  const id = useId();
  const isSubmitting = useRef(false);
  const [isPending, setPending] = useState(false);
  const [error, setError] = useState('');

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSubmitting.current) return;
    const form = new FormData(event.currentTarget);
    isSubmitting.current = true;
    setPending(true);
    setError('');
    try {
      await onSubmit({email: String(form.get('email')).trim(), password: String(form.get('password'))});
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to sign in. Please try again.');
    } finally {
      isSubmitting.current = false;
      setPending(false);
    }
  }

  // Native inputs keep browser and password-manager autofill working.
  return <main className="login-split">
    <div className="login-split__shell">
      <section className="login-split__card" aria-labelledby={`${id}-title`}>
        <div className="login-split__form-column">
          <div className="login-split__brand">{brand}</div>
          <form className="login-split__form" onSubmit={submit} aria-busy={isPending}>
            <header className="login-split__heading">
              <h1 id={`${id}-title`}>{title}</h1>
              {description && <p>{description}</p>}
            </header>
            <div className="login-split__fields">
              <label className="login-split__visually-hidden" htmlFor={`${id}-email`}>Email</label>
              <input
                id={`${id}-email`}
                name="email"
                type="email"
                autoComplete="email"
                placeholder="name@company.com"
                required
                readOnly={isPending}
              />
              <label className="login-split__visually-hidden" htmlFor={`${id}-password`}>Password</label>
              <input
                id={`${id}-password`}
                name="password"
                type="password"
                autoComplete="current-password"
                placeholder="Enter your password"
                required
                readOnly={isPending}
                aria-invalid={error ? true : undefined}
                aria-describedby={error ? `${id}-error` : undefined}
              />
              {error && <p className="login-split__error" id={`${id}-error`} role="alert">{error}</p>}
              {forgotPasswordHref && <a className="login-split__forgot" href={forgotPasswordHref}>Forgot your password?</a>}
            </div>
            <Button className="login-split__submit" type="submit" label="Login" variant="primary" width="100%" isLoading={isPending} />
            {providers && <>
              <div className="login-split__divider"><span>Or continue with</span></div>
              <div className="login-split__providers">{providers}</div>
            </>}
          </form>
          {signup && <div className="login-split__footnote">{signup}</div>}
        </div>
        <div className="login-split__cover">{artwork}</div>
      </section>
      {legal && <div className="login-split__footnote login-split__legal">{legal}</div>}
    </div>
  </main>;
}
