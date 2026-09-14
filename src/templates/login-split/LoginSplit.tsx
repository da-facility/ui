// Ported from Meta Astryx's Login Split template.
// Original copyright: Meta Platforms, Inc. and affiliates.

import {useState, type FormEvent} from 'react';

const COVER_IMAGE_URL =
  'https://lookaside.facebook.com/assets/astryx/light-working-vertical-1.png';
const APPLE_LOGO_URL =
  'https://lookaside.facebook.com/assets/astryx/AppleLogo.png';
const GOOGLE_LOGO_URL =
  'https://lookaside.facebook.com/assets/astryx/GoogleLogo.png';

function ProductMark() {
  return (
    <svg aria-hidden="true" className="login-split__brand-mark" viewBox="0 0 20 20">
      <rect x="2.2" y="2.2" width="5.4" height="5.4" rx="0.8" />
      <rect x="12.4" y="2.2" width="5.4" height="5.4" rx="0.8" />
      <rect x="2.2" y="12.4" width="5.4" height="5.4" rx="0.8" />
      <path d="M15.1 11.7v6.8M11.7 15.1h6.8" />
    </svg>
  );
}

export function LoginSplit() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [status, setStatus] = useState<'idle' | 'error' | 'loading' | 'success'>('idle');

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!email || !password) {
      setStatus('error');
      return;
    }

    setStatus('loading');
    window.setTimeout(() => setStatus('success'), 900);
  }

  return (
    <main className="login-split">
      <div className="login-split__shell">
        <section className="login-split__card" aria-label="Product Inc. sign in">
          <div className="login-split__grid">
            <div className="login-split__form-panel">
              <div className="login-split__brand">
                <ProductMark />
                <span>Product Inc.</span>
              </div>

              <div className="login-split__form-center">
                {status === 'success' ? (
                  <div className="login-split__success" role="status">
                    <span className="login-split__success-icon">✓</span>
                    <h1>You’re signed in</h1>
                    <p>Redirecting to your dashboard…</p>
                  </div>
                ) : (
                  <form className="login-split__form" onSubmit={handleSubmit} noValidate>
                    <header className="login-split__heading">
                      <h1>Welcome back</h1>
                      <p>Login to your Product Inc. account</p>
                    </header>

                    <div className="login-split__fields">
                      <label className="sr-only" htmlFor="login-email">Email</label>
                      <input
                        id="login-email"
                        type="email"
                        autoComplete="email"
                        placeholder="name@company.com"
                        value={email}
                        onChange={(event) => setEmail(event.target.value)}
                        aria-invalid={status === 'error'}
                      />

                      <label className="sr-only" htmlFor="login-password">Password</label>
                      <input
                        id="login-password"
                        type="password"
                        autoComplete="current-password"
                        placeholder="Enter your password"
                        value={password}
                        onChange={(event) => {
                          setPassword(event.target.value);
                          setStatus('idle');
                        }}
                        aria-invalid={status === 'error'}
                        aria-describedby={status === 'error' ? 'login-error' : undefined}
                      />

                      {status === 'error' && (
                        <div className="login-split__field-error" id="login-error">
                          <span>Incorrect password. Try again.</span>
                          <a href="#forgot-password">Forgot your password?</a>
                        </div>
                      )}
                    </div>

                    <button className="login-split__submit" type="submit" disabled={status === 'loading'}>
                      {status === 'loading' ? 'Signing in…' : 'Login'}
                    </button>

                    <div className="login-split__divider"><span>Or continue with</span></div>

                    <div className="login-split__providers">
                      <button type="button">
                        <img src={APPLE_LOGO_URL} width="16" height="16" alt="" />
                        Apple
                      </button>
                      <button type="button">
                        <img src={GOOGLE_LOGO_URL} width="16" height="16" alt="" />
                        Google
                      </button>
                    </div>
                  </form>
                )}
              </div>

              {status !== 'success' && (
                <p className="login-split__signup">
                  Don’t have an account? <a href="#sign-up">Sign up</a>
                </p>
              )}
            </div>

            <div className="login-split__cover">
              <img src={COVER_IMAGE_URL} alt="Two people working together at a desk" />
            </div>
          </div>
        </section>

        <p className="login-split__legal">
          By clicking continue, you agree to our <a href="#terms">Terms of Service</a> and{' '}
          <a href="#privacy">Privacy Policy</a>.
        </p>
      </div>
    </main>
  );
}
