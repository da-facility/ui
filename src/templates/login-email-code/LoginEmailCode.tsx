import {useEffect, useId, useRef, useState, type FormEvent, type ReactNode} from 'react';
import {Button} from '@astryxdesign/core/Button';
import {CodeInput} from '../../components/code-input/CodeInput';
import {useMessages} from '../../i18n';
import './login-email-code.css';

/**
 * Why a request or a code was turned down, returned (not thrown) by the
 * handlers so the page can say what happened and what to do.
 */
export type LoginEmailCodeFailure = {
  /**
   * `invalid-code`: the code is wrong. `expired-code`: it is too old.
   * `too-many-attempts`: sign-in is locked for `retryAfterMinutes`, and the
   * page turns its inputs off until then. `other`: shows `message`.
   */
  reason: 'invalid-code' | 'expired-code' | 'too-many-attempts' | 'other';
  /** With `too-many-attempts`: how long to wait, in minutes. */
  retryAfterMinutes?: number;
  /** Text shown instead of the built-in one for the reason. */
  message?: string;
};

export type LoginEmailCodeStep = 'email' | 'code';

export type LoginEmailCodeProps = {
  /**
   * Sends a code to the address. Resolve to move on to the code step, return a
   * failure to stay and show it, or throw to show the error's message. The app
   * owns the network call; the page only waits for it.
   */
  onRequestCode: (email: string) => Promise<void | LoginEmailCodeFailure> | void | LoginEmailCodeFailure;
  /**
   * Checks a complete code. Resolve once signed in (the app then navigates
   * away; the boxes stay read-only meanwhile), return a failure, or throw.
   */
  onVerifyCode: (code: string, email: string) => Promise<void | LoginEmailCodeFailure> | void | LoginEmailCodeFailure;
  /** Logo or product name above the form. */
  brand?: ReactNode;
  /**
   * The brand panel beside the form on desktop and above it on phones, such
   * as a photograph and a line about the product. It sits on the dark media
   * canvas (`--da-media-canvas`, `--da-media-text`) in light and dark mode.
   */
  brandPanel?: ReactNode;
  /** Number of digits in the code. Defaults to 6. */
  codeLength?: number;
  /** Seconds before another code can be requested. Defaults to 30. */
  resendCooldown?: number;
  /** Heading of the email step. Defaults to "Sign in". */
  title?: ReactNode;
  /** Text under the email step's heading. Defaults to "Enter your email address. We’ll send you a one-time code." */
  description?: ReactNode;
  /** Heading of the code step. Defaults to "Enter the code". */
  codeTitle?: ReactNode;
  /**
   * Text under the code step's heading, such as how long the code is valid.
   * A function receives the address the code went to. Defaults to "We sent a
   * code to {email}."
   */
  codeDescription?: ReactNode | ((email: string) => ReactNode);
  /** Address to start with, such as one remembered from the last sign-in. */
  defaultEmail?: string;
  /** Step to start on. `code` needs `defaultEmail`, for a page reloaded after the code was sent. */
  defaultStep?: LoginEmailCodeStep;
  /** Called when the page moves between the email and code steps, for apps that keep the step in the URL. */
  onStepChange?: (step: LoginEmailCodeStep, email: string) => void;
  /** Content below the form, such as terms and privacy links. */
  footer?: ReactNode;
};

type Notice = {kind: 'error' | 'status'; text: string};

/**
 * Two-step sign-in: an email address, then the one-time code sent to it. A
 * cool-down stops repeated resends, and too many attempts lock the page for
 * the time the backend says.
 */
export function LoginEmailCode({
  onRequestCode,
  onVerifyCode,
  brand,
  brandPanel,
  codeLength = 6,
  resendCooldown = 30,
  title,
  description,
  codeTitle,
  codeDescription,
  defaultEmail = '',
  defaultStep = 'email',
  onStepChange,
  footer,
}: LoginEmailCodeProps) {
  const t = useMessages();
  const id = useId();
  const [step, setStep] = useState<LoginEmailCodeStep>(defaultEmail ? defaultStep : 'email');
  const [email, setEmail] = useState(defaultEmail);
  const [code, setCode] = useState('');
  const [isSending, setSending] = useState(false);
  const [isChecking, setChecking] = useState(false);
  const [notice, setNotice] = useState<Notice | null>(null);
  const [resendAt, setResendAt] = useState(0);
  const [lockedUntil, setLockedUntil] = useState(0);
  const [lockMessage, setLockMessage] = useState('');
  const [now, setNow] = useState(() => Date.now());
  const isBusy = useRef(false);
  const emailRef = useRef<HTMLInputElement>(null);

  // One clock for the resend cool-down and the lock, ticking only while either runs.
  const waitUntil = Math.max(resendAt, lockedUntil);
  useEffect(() => {
    if (waitUntil <= Date.now()) return;
    const timer = setInterval(() => {
      const current = Date.now();
      setNow(current);
      if (current >= waitUntil) clearInterval(timer);
    }, 1000);
    return () => clearInterval(timer);
  }, [waitUntil]);

  const isLocked = lockedUntil > now;
  const lockMinutes = Math.max(1, Math.ceil((lockedUntil - now) / 60_000));
  const resendSeconds = Math.max(0, Math.ceil((resendAt - now) / 1000));

  function messageFor(failure: LoginEmailCodeFailure) {
    if (failure.message) return failure.message;
    if (failure.reason === 'invalid-code') return t('@da-facility.loginEmailCode.invalidCode');
    if (failure.reason === 'expired-code') return t('@da-facility.loginEmailCode.expiredCode');
    return t('@da-facility.loginEmailCode.error');
  }

  /** Runs a handler once at a time and turns its outcome into a notice; true when it succeeded. */
  async function attempt(run: () => ReturnType<LoginEmailCodeProps['onRequestCode']>) {
    if (isBusy.current) return false;
    isBusy.current = true;
    setNotice(null);
    try {
      const failure = await run();
      if (!failure) return true;
      if (failure.reason === 'too-many-attempts') {
        // The wait is shown from the lock itself, so the minutes count down.
        const current = Date.now();
        setNow(current);
        setLockedUntil(current + Math.max(1, failure.retryAfterMinutes ?? 1) * 60_000);
        setLockMessage(failure.message ?? '');
        return false;
      }
      setNotice({kind: 'error', text: messageFor(failure)});
      return false;
    } catch (cause) {
      setNotice({kind: 'error', text: cause instanceof Error && cause.message ? cause.message : t('@da-facility.loginEmailCode.error')});
      return false;
    } finally {
      isBusy.current = false;
    }
  }

  function goTo(next: LoginEmailCodeStep, address = email) {
    setStep(next);
    onStepChange?.(next, address);
  }

  async function requestCode(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isLocked) return;
    const address = String(new FormData(event.currentTarget).get('email') ?? '').trim();
    setEmail(address);
    setSending(true);
    const sent = await attempt(() => onRequestCode(address));
    setSending(false);
    if (!sent) return;
    startCooldown();
    setCode('');
    goTo('code', address);
  }

  async function resend() {
    if (isLocked || resendSeconds > 0) return;
    setSending(true);
    const sent = await attempt(() => onRequestCode(email));
    setSending(false);
    if (!sent) return;
    startCooldown();
    setCode('');
    setNotice({kind: 'status', text: t('@da-facility.loginEmailCode.resent')});
  }

  function startCooldown() {
    const current = Date.now();
    setNow(current);
    setResendAt(current + resendCooldown * 1000);
  }

  async function verify(entered: string) {
    if (isLocked) return;
    setChecking(true);
    const signedIn = await attempt(() => onVerifyCode(entered, email));
    // After success the app navigates away; the boxes stay read-only until then.
    if (!signedIn) setChecking(false);
  }

  // Moving between steps moves focus to the new step's heading or field.
  const isFirstRender = useRef(true);
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    if (step === 'email') emailRef.current?.focus();
  }, [step]);

  const error = isLocked
    ? lockMessage || t('@da-facility.loginEmailCode.tooManyAttempts', {minutes: lockMinutes})
    : notice?.kind === 'error' ? notice.text : '';
  const isCodeStep = step === 'code';
  return <main className="login-email-code" data-panel={brandPanel != null || undefined}>
    <section className="login-email-code__card" aria-labelledby={`${id}-title`}>
      {brandPanel != null && <div className="login-email-code__panel">{brandPanel}</div>}
      <div className="login-email-code__body">
        {brand != null && <div className="login-email-code__brand">{brand}</div>}
        {isCodeStep
          ? <div className="login-email-code__step" key="code">
              <header className="login-email-code__heading">
                <h1 id={`${id}-title`}>{codeTitle ?? t('@da-facility.loginEmailCode.codeTitle')}</h1>
                <p>{typeof codeDescription === 'function'
                  ? codeDescription(email)
                  : codeDescription ?? t('@da-facility.loginEmailCode.codeDescription', {email})}</p>
              </header>
              <CodeInput
                length={codeLength}
                value={code}
                onChange={next => {
                  setCode(next);
                  if (notice?.kind === 'error') setNotice(null);
                }}
                onComplete={verify}
                error={error}
                isChecking={isChecking}
                isDisabled={isLocked}
                autoFocus
              />
              {notice?.kind === 'status' && <p className="login-email-code__status" role="status">{notice.text}</p>}
              <div className="login-email-code__links">
                <button type="button" className="login-email-code__link" onClick={resend} disabled={isLocked || resendSeconds > 0 || isSending || isChecking}>
                  {resendSeconds > 0
                    ? t('@da-facility.loginEmailCode.resendIn', {seconds: resendSeconds})
                    : t('@da-facility.loginEmailCode.resend')}
                </button>
                <button type="button" className="login-email-code__link" onClick={() => {
                  setNotice(null);
                  setChecking(false);
                  goTo('email');
                }} disabled={isChecking}>
                  {t('@da-facility.loginEmailCode.changeEmail')}
                </button>
              </div>
            </div>
          : <form className="login-email-code__step" key="email" onSubmit={requestCode} aria-busy={isSending}>
              <header className="login-email-code__heading">
                <h1 id={`${id}-title`}>{title ?? t('@da-facility.loginEmailCode.title')}</h1>
                <p>{description ?? t('@da-facility.loginEmailCode.description')}</p>
              </header>
              {error && <p className="login-email-code__error" id={`${id}-error`} role="alert">{error}</p>}
              <label className="login-email-code__label" htmlFor={`${id}-email`}>{t('@da-facility.loginEmailCode.email')}</label>
              <input
                ref={emailRef}
                id={`${id}-email`}
                className="login-email-code__input"
                name="email"
                type="email"
                autoComplete="username email"
                inputMode="email"
                placeholder={t('@da-facility.loginEmailCode.emailPlaceholder')}
                defaultValue={email}
                autoFocus
                required
                readOnly={isSending}
                disabled={isLocked}
                aria-invalid={error ? true : undefined}
                aria-describedby={error ? `${id}-error` : undefined}
              />
              <Button type="submit" label={t('@da-facility.loginEmailCode.sendCode')} variant="primary" width="100%" isLoading={isSending} isDisabled={isLocked} />
            </form>}
        {footer != null && <div className="login-email-code__footer">{footer}</div>}
      </div>
    </section>
  </main>;
}
