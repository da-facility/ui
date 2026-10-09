import {useId, type MouseEvent, type ReactNode} from 'react';
import {PocketIdButton} from '../../components/pocket-id-button/PocketIdButton';
import {useMessages} from '../../i18n';
import './login-pocket-id.css';

export type LoginPocketIdProps = {
  /**
   * Where the button goes, usually the app's route that starts the Pocket ID
   * sign-in. Leave out both `href` and `onSignIn` to show the page without a
   * button, such as when signing in again would not help.
   */
  href?: string;
  /** Called when the button is pressed, for apps that start the sign-in themselves. */
  onSignIn?: (event: MouseEvent<HTMLAnchorElement | HTMLButtonElement>) => void;
  /** Logo or product name above the title. */
  brand?: ReactNode;
  /** Heading, such as "Sign-in took too long". Without it the page is named "Sign in". */
  title?: ReactNode;
  /** Text under the title. */
  description?: ReactNode;
  /** Button text. Defaults to "Sign in with Pocket ID". */
  buttonLabel?: string;
  /** Content below the button, such as a help link. */
  footer?: ReactNode;
  /**
   * Focuses the button when the page loads, as Pocket ID's own sign-in page
   * does, so Enter signs in and its focus ring shows. Defaults to true.
   */
  autoFocus?: boolean;
};

/**
 * Full-page sign-in with only a Pocket ID button, centred on a blank page. An
 * optional title and description explain why someone is here, such as an
 * expired or failed sign-in.
 */
export function LoginPocketId({href, onSignIn, brand, title, description, buttonLabel, footer, autoFocus = true}: LoginPocketIdProps) {
  const t = useMessages();
  const id = useId();
  const hasButton = href != null || onSignIn != null;
  const hasTitle = title != null && title !== false;
  return <main
    className="login-pocket-id"
    aria-labelledby={hasTitle ? `${id}-title` : undefined}
    aria-label={hasTitle ? undefined : t('@da-facility.loginPocketId.label')}
  >
    <div className="login-pocket-id__content">
      {brand != null && <div className="login-pocket-id__brand">{brand}</div>}
      {hasTitle && <h1 id={`${id}-title`}>{title}</h1>}
      {description != null && <p className="login-pocket-id__description">{description}</p>}
      {hasButton && <PocketIdButton href={href} onClick={onSignIn} label={buttonLabel} autoFocus={autoFocus} />}
      {footer != null && <div className="login-pocket-id__footer">{footer}</div>}
    </div>
  </main>;
}
