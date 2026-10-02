import {useEffect, useRef, useState, type KeyboardEvent, type ReactNode} from 'react';
import {BottomSheet} from '@astryxdesign/core/BottomSheet';
import {Icon} from '@astryxdesign/core/Icon';
import {IconButton} from '@astryxdesign/core/IconButton';
import {useMediaQuery} from '@astryxdesign/core/hooks';
import {useMessages} from '../../i18n';
import {ScrollArea} from '../scroll/ScrollArea';
import './assistant.css';

export type AssistantProps = {
  /** Called with each message the person sends, including a chosen suggestion. */
  onSubmit: (message: string) => void;
  /** The conversation, rendered by the app. */
  children?: ReactNode;
  /** Starter prompts, shown above the message box until there is a conversation. */
  suggestions?: string[];
  /** Label of the collapsed bar and title of the open chat. */
  label?: string;
  placeholder?: string;
  /** What the assistant can see, such as the current page. Shown as a tag in the message box. */
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
 * reveals the chat below the page on desktop (inside `SidebarLayout`, the page
 * card's bottom edge rises to make room) and a bottom sheet on phones.
 */
export function Assistant({
  onSubmit,
  children,
  suggestions = [],
  label: labelProp,
  placeholder: placeholderProp,
  context,
  actions,
  isOpen: controlledOpen,
  onOpenChange,
}: AssistantProps) {
  const t = useMessages();
  const label = labelProp ?? t('@da-facility.assistant.label');
  const placeholder = placeholderProp ?? t('@da-facility.assistant.placeholder');
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false);
  const isOpen = controlledOpen ?? uncontrolledOpen;
  const setOpen = (open: boolean) => {
    setUncontrolledOpen(open);
    onOpenChange?.(open);
  };
  const isNarrow = useMediaQuery(NARROW_VIEWPORT);
  const toggleRef = useRef<HTMLButtonElement>(null);
  // `false` or `null` from a conditional counts as no conversation yet.
  const hasConversation = Boolean(children);

  const chat = <>
    <Messages>{hasConversation && <div className="assistant__column">{children}</div>}</Messages>
    <div className="assistant__column assistant__compose">
      {!hasConversation && suggestions.length > 0 && <div className="assistant__suggestions" role="group" aria-label={t('@da-facility.assistant.suggestions')}>
        {suggestions.map(suggestion => <button key={suggestion} type="button" onClick={() => onSubmit(suggestion)}>{suggestion}</button>)}
      </div>}
      <Composer label={label} placeholder={placeholder} context={context} onSubmit={onSubmit} autoFocus={isOpen} />
    </div>
  </>;

  function close() {
    setOpen(false);
    toggleRef.current?.focus({preventScroll: true});
  }

  const closeButton = (onClick: () => void) =>
    <IconButton label={t('@da-facility.assistant.close')} icon={<Icon icon="close" />} variant="ghost" size="sm" onClick={onClick} />;

  return <section
    className="assistant"
    aria-label={label}
    data-open={isOpen || undefined}
    onKeyDown={(event: KeyboardEvent) => {
      if (event.key === 'Escape' && isOpen && !isNarrow) close();
    }}>
    <div className="assistant__panel" inert={!isOpen || isNarrow}>{!isNarrow && chat}</div>
    <div className="assistant__bar">
      {/* Opens and closes the chat. While open, hovering shows that a click will close it. */}
      <button
        ref={toggleRef}
        className="assistant__toggle"
        type="button"
        aria-expanded={isOpen}
        onClick={() => isOpen ? close() : setOpen(true)}>
        <span className="assistant__toggle-icon"><SparkleIcon /><ChevronDownIcon /></span>
        <span className="assistant__toggle-label">
          <span>{label}</span>
          <span aria-hidden="true">{t('@da-facility.assistant.close')}</span>
        </span>
      </button>
      {actions && <div className="assistant__actions">{actions}</div>}
    </div>
    {isNarrow && <BottomSheet label={label} isOpen={isOpen} onOpenChange={setOpen} height="tall">
      <div className="assistant__sheet">
        <header className="assistant__sheet-header">
          <span><SparkleIcon />{label}</span>
          {closeButton(() => setOpen(false))}
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
  const t = useMessages();
  const [message, setMessage] = useState('');
  const inputRef = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    if (autoFocus) inputRef.current?.focus({preventScroll: true});
  }, [autoFocus]);

  // Grows with its text, up to the height the CSS allows.
  useEffect(() => {
    const input = inputRef.current;
    // A hidden box (the sheet before it opens) measures 0; CSS keeps it one line tall.
    if (!input || input.scrollHeight === 0) return;
    input.style.height = 'auto';
    input.style.height = `${input.scrollHeight}px`;
  }, [message]);

  function send(event?: {preventDefault: () => void}) {
    event?.preventDefault();
    const text = message.trim();
    if (!text) return;
    onSubmit(text);
    setMessage('');
  }

  return <form className="assistant__composer" onSubmit={send}>
    <textarea
      ref={inputRef}
      rows={1}
      aria-label={label}
      placeholder={placeholder}
      value={message}
      onChange={event => setMessage(event.target.value)}
      onKeyDown={event => {
        // Enter sends; Shift+Enter starts a new line; composing input methods keep Enter.
        if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) send(event);
      }}
    />
    <div className="assistant__composer-row">
      {context && <span className="assistant__context">
        <span className="assistant__visually-hidden">{t('@da-facility.assistant.context')}: </span>
        <PageIcon />
        {context}
      </span>}
      <button className="assistant__send" type="submit" aria-label={t('@da-facility.assistant.send')} disabled={!message.trim()}>
        <Icon icon="arrowUp" size="sm" color="inherit" />
      </button>
    </div>
  </form>;
}

function SparkleIcon() {
  return <svg className="assistant__icon" viewBox="0 0 16 16" aria-hidden="true">
    <path d="M8 1.5c.4 2.9 1.6 4.1 4.5 4.5-2.9.4-4.1 1.6-4.5 4.5C7.6 7.6 6.4 6.4 3.5 6c2.9-.4 4.1-1.6 4.5-4.5ZM12.5 10c.2 1.4.8 2 2.2 2.2-1.4.2-2 .8-2.2 2.3-.2-1.5-.8-2.1-2.2-2.3 1.4-.2 2-.8 2.2-2.2Z" fill="currentColor" />
  </svg>;
}

function ChevronDownIcon() {
  return <svg className="assistant__icon" viewBox="0 0 16 16" aria-hidden="true">
    <path d="M4 6l4 4 4-4" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>;
}

function PageIcon() {
  return <svg className="assistant__icon" viewBox="0 0 16 16" aria-hidden="true">
    <path d="M4.5 1.75h4.75L12.5 5v8.25a1 1 0 0 1-1 1h-7a1 1 0 0 1-1-1v-10.5a1 1 0 0 1 1-1Z M9 1.75V5.25h3.5" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" />
  </svg>;
}
