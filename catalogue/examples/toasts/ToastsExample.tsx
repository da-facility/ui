import {useRef, useState, type MouseEvent, type ReactNode} from 'react';
import {ArrowDownLeftIcon, ArrowDownRightIcon, ArrowUpLeftIcon, ArrowUpRightIcon, BellIcon, SparklesIcon} from '@heroicons/react/24/outline';
import {Button} from '@astryxdesign/core/Button';
import {Slider} from '@astryxdesign/core/Slider';
import {CycleButton, Toaster, toast, type CycleButtonStates, type ToastPosition} from '@da-facility/ui';
import type {ExampleProps} from '../../types';
import './toasts-example.css';

const positions: CycleButtonStates<ToastPosition> = [
  {value: 'top-left', label: 'Top left', icon: <ArrowUpLeftIcon />},
  {value: 'top-right', label: 'Top right', icon: <ArrowUpRightIcon />},
  {value: 'bottom-left', label: 'Bottom left', icon: <ArrowDownLeftIcon />},
  {value: 'bottom-right', label: 'Bottom right', icon: <ArrowDownRightIcon />},
];

// The neutral theme's accent is near-black in light mode and near-white in dark
// mode; Astryx's categorical blue is the same vivid blue in both.
const trailColors: CycleButtonStates<'blue' | 'accent'> = [
  {value: 'blue', label: 'Blue'},
  {value: 'accent', label: 'Theme accent'},
];

const trailColorTokens = {blue: 'var(--color-data-categorical-blue)', accent: 'var(--color-accent)'};

const stackSizes: CycleButtonStates<'1' | '3' | '5'> = [
  {value: '1', label: '1'},
  {value: '3', label: '3 (default)'},
  {value: '5', label: '5'},
];

export function ToastsExample({tweaks}: ExampleProps) {
  const [position, setPosition] = useState<ToastPosition>('bottom-right');
  const [visible, setVisible] = useState<'1' | '3' | '5'>('3');
  const [trailColor, setTrailColor] = useState<'blue' | 'accent'>('blue');
  const [tailLength, setTailLength] = useState(45);
  const [fadeOut, setFadeOut] = useState(180);
  const ms = (value: number) => `${value} ms`;

  return <main className="toasts-example">
    <h1>Toasts</h1>
    <p className="toasts-example__lead">Sonner, styled with the Astryx theme. Mount a <code>Toaster</code> once, then call <code>toast()</code> from anywhere. Pass <code>from</code> and a star with a fading trail flies from that element to the toast, which grows out of its impact and absorbs the trail.</p>
    <div className="toasts-example__controls">
      {/* Icons only: four labelled corners are wider than a phone. */}
      <CycleButton appearance="group" label="Toast position" states={positions} value={position} onChange={setPosition} isIconOnly />
      <CycleButton appearance="group" label="Visible toasts" states={stackSizes} value={visible} onChange={setVisible} />
    </div>
    <section className="toasts-example__arrival" aria-label="Shooting star">
      <h3>Shooting star</h3>
      <CycleButton appearance="group" label="Trail colour" states={trailColors} value={trailColor} onChange={setTrailColor} size="sm" />
      <Slider label="Tail length" description="Share of the flight the trail covers" min={5} max={100} step={5} value={tailLength} onChange={setTailLength} formatValue={value => `${value}%`} valueDisplay="text" />
      <Slider label="Fade out" description="How long the trail takes to vanish into the toast" min={0} max={500} step={10} value={fadeOut} onChange={setFadeOut} formatValue={ms} valueDisplay="text" />
    </section>
    <Toaster
      position={position}
      visibleToasts={Number(visible)}
      expand={tweaks.expand}
      closeButton={tweaks.closeButton}
      richColors={tweaks.richColors}
      arrival={{color: trailColorTokens[trailColor], tailLength, fadeOut, tintByType: tweaks.tintByType, momentum: tweaks.momentum}}
    />
    <ToastButtons />
  </main>;
}

type Trigger = MouseEvent<HTMLElement>;

const wait = (ms: number) => new Promise<void>(resolve => setTimeout(resolve, ms));

function ToastButtons() {
  const [lastHidden, setLastHidden] = useState('No toast has been hidden yet.');
  const syncCount = useRef(0);
  const hidden = (name: string) => ({
    onDismiss: () => setLastHidden(`“${name}” was hidden by dismissing it.`),
    onAutoClose: () => setLastHidden(`“${name}” was hidden automatically.`),
  });

  return <>
    <div className="toasts-example__groups">
      <ToastGroup title="Types">
        <ToastButton label="Default" note="toast(message)" onClick={event => toast('Event has been created', {from: event.currentTarget, ...hidden('Default')})} />
        <ToastButton label="Success" note="toast.success" onClick={event => toast.success('Changes saved', {from: event.currentTarget, ...hidden('Success')})} />
        <ToastButton label="Info" note="toast.info" onClick={event => toast.info('A new version is available', {from: event.currentTarget, ...hidden('Info')})} />
        <ToastButton label="Warning" note="toast.warning" onClick={event => toast.warning('Your trial ends in 3 days', {from: event.currentTarget, ...hidden('Warning')})} />
        <ToastButton label="Error" note="toast.error" onClick={event => toast.error('Could not save your changes', {from: event.currentTarget, ...hidden('Error')})} />
      </ToastGroup>
      <ToastGroup title="Content">
        <ToastButton label="Description" note="description" onClick={event => toast.message('Event has been created', {description: 'Monday, 13 October at 09:00', from: event.currentTarget, ...hidden('Description')})} />
        <ToastButton label="Action" note="action: {label, onClick}" onClick={event => toast('Message archived', {
          from: event.currentTarget,
          action: {label: 'Undo', onClick: event => toast.success('Message restored', {from: event.currentTarget})},
          ...hidden('Action'),
        })} />
        <ToastButton label="Action and cancel" note="action and cancel" onClick={event => toast('Delete 3 files?', {
          description: 'This cannot be undone.',
          from: event.currentTarget,
          duration: 10_000,
          action: {label: 'Delete', onClick: event => toast.success('3 files deleted', {from: event.currentTarget})},
          cancel: {label: 'Keep', onClick: () => {}},
          ...hidden('Action and cancel'),
        })} />
        <ToastButton label="Custom JSX" note="toast.custom draws the whole card." onClick={event => toast.custom(id => <div className="toasts-example__custom-toast">
          <SparklesIcon aria-hidden="true" />
          <div>
            <strong>New report</strong>
            <span>Your weekly report is ready.</span>
          </div>
          <Button label="Open" size="sm" onClick={() => toast.dismiss(id)} />
        </div>, {from: event.currentTarget, duration: Infinity, ...hidden('Custom JSX')})} />
      </ToastGroup>
      <ToastGroup title="Progress">
        <ToastButton label="Loading" note="toast.loading, dismissed after 3 seconds." onClick={event => {
          const id = toast.loading('Saving…', {from: event.currentTarget, ...hidden('Loading')});
          setTimeout(() => toast.dismiss(id), 3000);
        }} />
        <ToastButton label="Promise that resolves" note="toast.promise" onClick={event => toast.promise(wait(1500).then(() => ({name: 'report.pdf'})), {
          loading: 'Uploading…',
          success: file => `${file.name} uploaded`,
          error: 'Upload failed',
          from: event.currentTarget,
          ...hidden('Promise that resolves'),
        })} />
        <ToastButton label="Promise that rejects" note="toast.promise, error after 1.5 seconds." onClick={event => toast.promise(wait(1500).then(() => Promise.reject(new Error('Connection lost'))), {
          loading: 'Uploading…',
          success: 'Uploaded',
          error: error => `Upload failed: ${(error as Error).message}`,
          from: event.currentTarget,
          ...hidden('Promise that rejects'),
        })} />
      </ToastGroup>
      <ToastGroup title="Timing and stacking">
        <ToastButton label="Persistent" note="duration: Infinity, with a close button." onClick={event => toast('This one waits for you', {from: event.currentTarget, duration: Infinity, closeButton: true, ...hidden('Persistent')})} />
        <ToastButton label="Dismissed from code" note="toast.dismiss(id) after 1.5 seconds." onClick={event => {
          const id = toast('Uploading…', {from: event.currentTarget, duration: Infinity, ...hidden('Dismissed from code')});
          setTimeout(() => toast.dismiss(id), 1500);
        }} />
        <ToastButton label="Replace the same toast" note="The same id updates the toast in place." onClick={event => {
          syncCount.current += 1;
          toast.success(`Synced ${syncCount.current} ${syncCount.current === 1 ? 'time' : 'times'}`, {id: 'sync', from: event.currentTarget, ...hidden('Replace the same toast')});
        }} />
        <ToastButton label="Six at once" note="Shows the stack and the visible limit; hover to expand." onClick={event => {
          const types = [toast, toast.success, toast.info, toast.warning, toast.error, toast.message];
          types.forEach((show, index) => show(`Notification ${index + 1} of 6`, {from: event.currentTarget, ...hidden(`Toast ${index + 1}`)}));
        }} />
      </ToastGroup>
    </div>
    <p className="toasts-example__status" role="status"><BellIcon aria-hidden="true" /> {lastHidden}</p>
  </>;
}

function ToastGroup({title, children}: {title: string; children: ReactNode}) {
  return <section className="toasts-example__group" aria-label={title}>
    <h3>{title}</h3>
    <ul>{children}</ul>
  </section>;
}

function ToastButton({label, note, onClick}: {label: string; note: string; onClick: (event: Trigger) => void}) {
  return <li>
    <Button label={label} onClick={onClick} />
    <small>{note}</small>
  </li>;
}
