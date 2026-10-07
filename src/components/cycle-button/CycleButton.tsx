import {useState, type CSSProperties, type ReactNode} from 'react';
import {Button, type ButtonSize, type ButtonVariant} from '@astryxdesign/core/Button';
import {useMessages} from '../../i18n';
import './cycle-button.css';

/** One state the button can be in. */
export type CycleButtonState<Value extends string = string> = {
  /** Identifies the state in `value` and `onChange`. */
  value: Value;
  /** Shown on the button, and read out after the button's `label`. */
  label: string;
  /** Shown before the label, or alone when `isIconOnly` is set. */
  icon?: ReactNode;
};

/** Two, three or four states, in the order a click steps through them. */
export type CycleButtonStates<Value extends string = string> =
  | [CycleButtonState<Value>, CycleButtonState<Value>]
  | [CycleButtonState<Value>, CycleButtonState<Value>, CycleButtonState<Value>]
  | [CycleButtonState<Value>, CycleButtonState<Value>, CycleButtonState<Value>, CycleButtonState<Value>];

export type CycleButtonProps<Value extends string = string> = {
  /** What the button controls, such as “Theme”. Read out before the current state. */
  label: string;
  /** Two to four states. A click moves to the next one and wraps from the last to the first. */
  states: CycleButtonStates<Value>;
  /** Controlled current state. */
  value?: Value;
  /** Starting state when uncontrolled. Defaults to the first state. */
  defaultValue?: Value;
  /** Called with the state a click moves to. */
  onChange?: (value: Value) => void;
  /** Show only the current state's icon. Every state needs an `icon`. */
  isIconOnly?: boolean;
  /** Astryx button variant. */
  variant?: ButtonVariant;
  /** Astryx button size. */
  size?: ButtonSize;
  isDisabled?: boolean;
  className?: string;
};

/**
 * A button that steps through two to four states, such as light, dark and
 * system theme. The icon turns over between states, the width stays that of
 * the longest label, and dots after the label show where in the cycle it is.
 * For choices people should see side by side, use Astryx `SegmentedControl`.
 */
export function CycleButton<Value extends string = string>({label, states, value: valueProp, defaultValue, onChange, isIconOnly = false, variant = 'secondary', size = 'md', isDisabled = false, className}: CycleButtonProps<Value>) {
  const t = useMessages();
  const [ownValue, setOwnValue] = useState(defaultValue ?? states[0].value);
  const value = valueProp ?? ownValue;
  const index = Math.max(0, states.findIndex(state => state.value === value));
  const current = states[index];
  const next = states[(index + 1) % states.length];
  const name = t('@da-facility.cycleButton.label', {label, state: current.label});
  const hasIcons = states.some(state => state.icon);

  const advance = () => {
    if (valueProp === undefined) setOwnValue(next.value);
    onChange?.(next.value);
  };

  return <Button
    className={['cycle-button', isIconOnly && 'cycle-button--icon-only', className].filter(Boolean).join(' ')}
    label={name}
    aria-label={name}
    tooltip={isIconOnly ? name : undefined}
    variant={variant}
    size={size}
    isDisabled={isDisabled}
    isIconOnly={isIconOnly}
    onClick={advance}
    icon={hasIcons ? <span className="cycle-button__stack" aria-hidden="true">
      {states.map((state, stateIndex) => <span key={state.value} className="cycle-button__icon" data-state={stateStep(stateIndex, index, states.length)}>{state.icon}</span>)}
    </span> : undefined}
    endContent={<span className="cycle-button__steps" aria-hidden="true" style={{'--cycle-button-steps': states.length} as CSSProperties}>
      {states.map((state, stateIndex) => <span key={state.value} className="cycle-button__step" data-current={stateIndex === index || undefined} />)}
    </span>}
  >
    {/* Every label sits in the same cell so the button is as wide as the longest. */}
    <span className="cycle-button__stack" aria-hidden="true">
      {states.map((state, stateIndex) => <span key={state.value} className="cycle-button__label" data-state={stateStep(stateIndex, index, states.length)}>{state.label}</span>)}
    </span>
  </Button>;
}

/** Where a state sits relative to the current one, so it can enter and leave in the cycle's direction. */
function stateStep(stateIndex: number, currentIndex: number, count: number) {
  if (stateIndex === currentIndex) return 'current';
  return stateIndex === (currentIndex + count - 1) % count ? 'previous' : 'upcoming';
}
