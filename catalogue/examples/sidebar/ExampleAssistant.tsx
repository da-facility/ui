import {useState} from 'react';
import {Icon} from '@astryxdesign/core/Icon';
import {IconButton} from '@astryxdesign/core/IconButton';
import {Assistant} from '@da-facility/ui';
import './example-assistant.css';

type Message = {from: 'you' | 'assistant'; text: string};

const SUGGESTIONS = [
  'Why won’t my settings save?',
  'How do I invite someone to this workspace?',
  'Where can I find old invoices?',
];

/** A pretend assistant that answers every question the same way. */
export function ExampleAssistant({pageLabel}: {pageLabel: string}) {
  const [messages, setMessages] = useState<Message[]>([]);

  function send(text: string) {
    setMessages(current => [...current, {from: 'you', text}]);
    setTimeout(() => setMessages(current => [...current, {
      from: 'assistant',
      text: `This demo cannot answer yet, but a real assistant would know you are looking at ${pageLabel}.`,
    }]), 600);
  }

  return <Assistant
    suggestions={SUGGESTIONS}
    onSubmit={send}
    context={pageLabel}
    actions={messages.length > 0 && <IconButton label="Clear conversation" icon={<Icon icon="clock" />} variant="ghost" size="sm" onClick={() => setMessages([])} />}>
    {messages.length > 0 && <ol className="example-assistant">
      {messages.map((message, index) => <li key={index} data-from={message.from}>{message.text}</li>)}
    </ol>}
  </Assistant>;
}
