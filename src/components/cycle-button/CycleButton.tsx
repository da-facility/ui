import {useRef, useState, type CSSProperties, type PointerEvent, type ReactNode} from 'react';
import {Button, type ButtonSize, type ButtonVariant} from '@astryxdesign/core/Button';
import {SegmentedControl, SegmentedControlItem} from '@astryxdesign/core/SegmentedControl';
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
  /**
   * `cycle` is one button showing the current state. `group` shows every state
   * side by side in a shared track, with only the current one raised; a click,
   * the arrow keys, or dragging across it with a mouse or finger choose a state.
   */
  appearance?: 'cycle' | 'group';
  /** Controlled current state. */
  value?: Value;
  /** Starting state when uncontrolled. Defaults to the first state. */
  defaultValue?: Value;
  /** Called with the state a click moves to, or the state chosen in a group. */
  onChange?: (value: Value) => void;
  /** Show only icons: the current state's in a cycle, every state's in a group. Every state needs an `icon`. */
  isIconOnly?: boolean;
  /** Astryx button variant. Applies to the `cycle` appearance. */
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
 * With `appearance="group"` every state shows side by side instead, as Astryx
 * `SegmentedControl`.
 */
export function CycleButton<Value extends string = string>({label, states, appearance = 'cycle', value: valueProp, defaultValue, onChange, isIconOnly = false, variant = 'secondary', size = 'md', isDisabled = false, className}: CycleButtonProps<Value>) {
  const t = useMessages();
  const [ownValue, setOwnValue] = useState(defaultValue ?? states[0].value);
  const value = valueProp ?? ownValue;
  const index = Math.max(0, states.findIndex(state => state.value === value));
  const current = states[index];
  const next = states[(index + 1) % states.length];
  const name = t('@da-facility.cycleButton.label', {label, state: current.label});
  const hasIcons = states.some(state => state.icon);

  const drag = useRef<{pointerId: number; startX: number; isDragging: boolean} | null>(null);

  const select = (nextValue: Value) => {
    if (nextValue === value) return;
    if (valueProp === undefined) setOwnValue(nextValue);
    onChange?.(nextValue);
  };

  // Dragging sideways across a group selects the segment under the pointer. A
  // tap stays a click, and a vertical swipe still scrolls (`touch-action: pan-y`).
  const dragHandlers = {
    onPointerDown(event: PointerEvent<HTMLDivElement>) {
      if (!isDisabled && event.button === 0) drag.current = {pointerId: event.pointerId, startX: event.clientX, isDragging: false};
    },
    onPointerMove(event: PointerEvent<HTMLDivElement>) {
      const current = drag.current;
      if (current?.pointerId !== event.pointerId) return;
      if (!current.isDragging) {
        if (Math.abs(event.clientX - current.startX) < 4) return;
        current.isDragging = true;
        event.currentTarget.setPointerCapture(event.pointerId);
      }
      const segment = segmentAt(event.currentTarget, event.clientX);
      const state = states.find(state => state.value === segment?.dataset.value);
      if (state) select(state.value);
    },
    onPointerUp: () => { drag.current = null; },
    onPointerCancel: () => { drag.current = null; },
  };

  if (appearance === 'group') {
    return <SegmentedControl
      className={['cycle-button-group', className].filter(Boolean).join(' ')}
      label={label}
      value={current.value}
      onChange={nextValue => select(nextValue as Value)}
      size={size}
      isDisabled={isDisabled}
      {...dragHandlers}>
      {states.map(state => <SegmentedControlItem key={state.value} value={state.value} label={state.label} icon={state.icon} isLabelHidden={isIconOnly} />)}
    </SegmentedControl>;
  }

  return <Button
    className={['cycle-button', isIconOnly && 'cycle-button--icon-only', className].filter(Boolean).join(' ')}
    label={name}
    aria-label={name}
    tooltip={isIconOnly ? name : undefined}
    variant={variant}
    size={size}
    isDisabled={isDisabled}
    isIconOnly={isIconOnly}
    onClick={() => select(next.value)}
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

/** The segment whose span contains `x`, or the nearest end one past either edge. */
function segmentAt(group: HTMLElement, x: number) {
  const segments = [...group.querySelectorAll<HTMLElement>('[role="radio"][data-value]')];
  return segments.find((segment, index) => x < segment.getBoundingClientRect().right || index === segments.length - 1);
}
