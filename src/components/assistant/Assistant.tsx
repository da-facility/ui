import {useEffect, useRef, useState, type FormEvent, type KeyboardEvent, type ReactNode} from 'react';
import {BottomSheet} from '@astryxdesign/core/BottomSheet';
import {Icon} from '@astryxdesign/core/Icon';
import {IconButton} from '@astryxdesign/core/IconButton';
import {useMediaQuery} from '@astryxdesign/core/hooks';
import {ScrollArea} from '../scroll/ScrollArea';
import './assistant.css';

export type AssistantProps = {
  /** Called with each message the person sends, including a chosen suggestion. */
  onSubmit: (message: string) => void;
  /** The conversation, rendered by the app. Until there is one, `suggestions` show instead. */
  children?: ReactNode;
  /** Starter prompts shown while there is no conversation. */
  suggestions?: string[];
  /** Label of the collapsed bar and title of the open chat. */
  label?: string;
  placeholder?: string;
  /** Small chip in the message box, such as the page the assistant can see. */
  context?: ReactNode;
  /** Extra buttons at the end of the bar, such as a history button. */
  actions?: ReactNode;
  /** Controlled open state. */
  isOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
};

const NARROW_VIEWPORT = '(max-width: 768px), (max-height: 600px)';

/**
 * A chat bar that stays out of the way at the bottom of the screen. Opening it
 * reveals the chat below the page on desktop (inside `SidebarLayout`, the whole
 * layout contracts to make room) and a bottom sheet on phones.
 */
export function Assistant({
  onSubmit,
  children,
  suggestions = [],
  label = 'Ask anything',
  placeholder = 'What can I do for you today?',
  context,
  actions,
  isOpen: controlledOpen,
  onOpenChange,
}: AssistantProps) {
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false);
  const isOpen = controlledOpen ?? uncontrolledOpen;
  const setOpen = (open: boolean) => {
    setUncontrolledOpen(open);
    onOpenChange?.(open);
  };
  const isNarrow = useMediaQuery(NARROW_VIEWPORT);
  const toggleRef = useRef<HTMLButtonElement>(null);

  // `false` or `null` from a conditional counts as no conversation yet.
  const conversation = children || (suggestions.length > 0 && <ol className="assistant__suggestions">
    {suggestions.map((suggestion, index) => <li key={suggestion}>
      <button type="button" onClick={() => onSubmit(suggestion)}>
        <span className="assistant__index" aria-hidden="true">{index + 1}</span>
        {suggestion}
      </button>
    </li>)}
  </ol>);

  const chat = <>
    <Messages>{conversation}</Messages>
    <Composer label={label} placeholder={placeholder} context={context} onSubmit={onSubmit} autoFocus={isOpen} />
  </>;

  function close() {
    setOpen(false);
    toggleRef.current?.focus({preventScroll: true});
  }

  return <section
    className="assistant"
    aria-label={label}
    data-open={isOpen || undefined}
    onKeyDown={(event: KeyboardEvent) => {
      if (event.key === 'Escape' && isOpen && !isNarrow) close();
    }}>
    <div className="assistant__panel" inert={!isOpen || isNarrow}>{!isNarrow && chat}</div>
    <div className="assistant__bar">
      <button ref={toggleRef} className="assistant__toggle" type="button" aria-expanded={isOpen} onClick={() => setOpen(true)}>
        <PlusIcon />
        {label}
      </button>
      <div className="assistant__actions">
        {actions}
        {isOpen && !isNarrow && <IconButton label="Close chat" icon={<Icon icon="close" />} variant="ghost" size="sm" onClick={close} />}
      </div>
    </div>
    {isNarrow && <BottomSheet label={label} isOpen={isOpen} onOpenChange={setOpen} height="tall">
      <div className="assistant__sheet">
        <header className="assistant__sheet-header">
          <span>{label}</span>
          <IconButton label="Close chat" icon={<Icon icon="close" />} variant="ghost" size="sm" onClick={() => setOpen(false)} />
        </header>
        {chat}
      </div>
    </BottomSheet>}
  </section>;
}

/** Keeps the newest message in view as the conversation grows. */
function Messages({children}: {children: ReactNode}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const element = ref.current;
    if (element) element.scrollTop = element.scrollHeight;
  }, [children]);
  return <ScrollArea ref={ref} className="assistant__messages">{children}</ScrollArea>;
}

function Composer({label, placeholder, context, onSubmit, autoFocus}: {
  label: string;
  placeholder: string;
  context?: ReactNode;
  onSubmit: (message: string) => void;
  autoFocus: boolean;
}) {
  const [message, setMessage] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (autoFocus) inputRef.current?.focus({preventScroll: true});
  }, [autoFocus]);

  function submit(event: FormEvent) {
    event.preventDefault();
    const text = message.trim();
    if (!text) return;
    onSubmit(text);
    setMessage('');
  }

  return <form className="assistant__composer" onSubmit={submit}>
    <span className="assistant__prompt" aria-hidden="true">›</span>
    <input
      ref={inputRef}
      aria-label={label}
      placeholder={placeholder}
      autoComplete="off"
      value={message}
      onChange={event => setMessage(event.target.value)}
    />
    {context && <span className="assistant__context">{context}</span>}
    <IconButton type="submit" label="Send" icon={<Icon icon="arrowUp" />} variant="ghost" size="sm" isDisabled={!message.trim()} />
  </form>;
}

function PlusIcon() {
  return <svg className="assistant__plus" viewBox="0 0 16 16" aria-hidden="true">
    <path d="M8 3v10M3 8h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
  </svg>;
}
