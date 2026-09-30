import type {CSSProperties, ReactNode} from 'react';
import './status-bar.css';

export type StatusBarProps = {
  /** What kind of site this is, such as a deployment or environment name. Repeated across the bar. */
  label: string;
  /** Bar colour. Text turns white or dark to contrast with it unless `foreground` is set. */
  color?: string;
  foreground?: string;
  /** Shown over the middle of the bar, such as a development sign-in code. */
  notice?: ReactNode;
};

/**
 * A loud, full-width bar that tells people which kind of site they are on, such
 * as staging or an admin console. Place it above the page, or pass it to
 * `SidebarLayout`'s `statusBar`.
 */
export function StatusBar({label, color = '#ff5f00', foreground, notice}: StatusBarProps) {
  const style = {'--status-bar-color': color, ...(foreground && {'--status-bar-foreground': foreground})} as CSSProperties;
  return <div className="status-bar" role="status" aria-label={notice ? undefined : label} style={style}>
    <div className="status-bar__track" aria-hidden="true">
      {[0, 1].map(group => <div key={group} className="status-bar__group">
        {Array.from({length: 32}, (_, index) => <span key={index}>{label}</span>)}
      </div>)}
    </div>
    {notice && <div className="status-bar__notice">{notice}</div>}
  </div>;
}
