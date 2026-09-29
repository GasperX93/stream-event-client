import {
  ChatMessageError,
  countCharacters,
  encodeChatMessage,
  MAX_MESSAGE_BYTES,
  MAX_TEXT_CHARACTERS,
  MESSAGE_VERSION,
  type MessageType,
} from '@solarpunkltd/swarm-chat-js';

export const TOO_MANY_CHARACTERS = `A message is at most ${MAX_TEXT_CHARACTERS} characters.`;
export const TOO_MANY_BYTES = 'This message is too long to send. Shorten it a little.';

/** Fields the library fills in when it signs, at the lengths they always have, so a draft measures as sent. */
const ID_PLACEHOLDER = '0'.repeat(32);
const ADDRESS_PLACEHOLDER = '0'.repeat(40);
const SIGNATURE_PLACEHOLDER = '0'.repeat(130);

export interface Draft {
  topic: string;
  name: string;
  type: MessageType;
  /** The message a reply refers to. */
  target?: string;
  text: string;
}

/**
 * Why the chat would refuse this draft, or null when it would take it. The caps are the library's: the text in
 * characters as it counts them, and the whole message in bytes as it is sent.
 */
export function draftProblem({ topic, name, type, target = '', text }: Draft): string | null {
  if (countCharacters(text) > MAX_TEXT_CHARACTERS) {
    return TOO_MANY_CHARACTERS;
  }
  const bytes = encodeChatMessage({
    v: MESSAGE_VERSION,
    topic,
    id: ID_PLACEHOLDER,
    type,
    target,
    text,
    name,
    addr: ADDRESS_PLACEHOLDER,
    ts: Date.now(),
    sig: SIGNATURE_PLACEHOLDER,
  }).length;
  return bytes > MAX_MESSAGE_BYTES ? TOO_MANY_BYTES : null;
}

/** What to tell the viewer about a message the library refused, or null for any other failure. */
export function refusalProblem(error: unknown): string | null {
  if (!(error instanceof ChatMessageError)) {
    return null;
  }
  return error.reason === 'too-large' ? TOO_MANY_BYTES : null;
}
