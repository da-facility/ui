import type {MouseEvent} from 'react';
import {useMessages} from '../../i18n';
import './pocket-id-button.css';

export type PocketIdButtonProps = {
  /**
   * Where the button goes, usually the app's route that starts the Pocket ID
   * sign-in. With `href` the button is a link; without it, a `<button>`.
   */
  href?: string;
  /** Called when the button is pressed. With `href` the link still navigates unless the handler calls `preventDefault()`. */
  onClick?: (event: MouseEvent<HTMLAnchorElement | HTMLButtonElement>) => void;
  /** Button text. Defaults to "Sign in with Pocket ID". */
  label?: string;
  /** Stretches the button to its container instead of its usual 280px. */
  isFullWidth?: boolean;
  /**
   * Focuses the button when the page loads, as Pocket ID does on its own
   * sign-in page, so Enter signs in and the focus ring fades in as the page
   * opens.
   * Use it only where the button is the page's main action.
   */
  autoFocus?: boolean;
};

/**
 * Pocket ID's sign-in button, styled like the "Sign in with Apple" and Google
 * buttons: Pocket ID's logo pinned left and a centred label, in Pocket ID's own
 * black pill, which turns light in dark mode.
 */
export function PocketIdButton({href, onClick, label, isFullWidth, autoFocus}: PocketIdButtonProps) {
  const t = useMessages();
  const className = `pocket-id-button${isFullWidth ? ' pocket-id-button--full-width' : ''}${autoFocus ? ' pocket-id-button--autofocus' : ''}`;
  const content = <>
    <PocketIdLogo />
    <span className="pocket-id-button__label">{label || t('@da-facility.pocketIdButton.label')}</span>
  </>;
  return href != null
    ? <a className={className} href={href} onClick={onClick} autoFocus={autoFocus}>{content}</a>
    : <button className={className} type="button" onClick={onClick} autoFocus={autoFocus}>{content}</button>;
}

/** Pocket ID's mark, inlined so pages with a strict CSP need no image source. */
function PocketIdLogo() {
  return <svg className="pocket-id-button__logo" aria-hidden="true" viewBox="-346.211 -706.48 712.96 712.96">
    <path fill="currentColor" d="M-250.368,-706.48C-166.912,-706.48 -83.456,-706.48 0,-706.48C149.377,-706.48 270.906,-584.953 270.906,-435.576C270.906,-376.876 252.438,-321.028 217.506,-274.062C183.258,-228.019 136.385,-194.563 81.955,-177.305C76.939,-175.715 71.924,-174.124 66.908,-172.534C54.955,-231.481 43.003,-290.429 31.05,-349.376C34.355,-350.974 37.661,-352.571 40.966,-354.169C73.345,-369.822 94.269,-403.156 94.269,-439.094C94.269,-491.073 51.982,-533.36 0,-533.36C-51.978,-533.36 -94.267,-491.073 -94.267,-439.094C-94.267,-403.156 -73.344,-369.822 -40.963,-354.169C-37.718,-352.6 -34.473,-351.032 -31.228,-349.463C-50.48,-230.815 -69.733,-112.167 -88.985,6.48C-142.779,6.48 -196.574,6.48 -250.368,6.48Z" />
  </svg>;
}
