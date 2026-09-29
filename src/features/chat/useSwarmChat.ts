import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  type ChatEvent,
  type ChatEventPayloads,
  type ChatSettings,
  EVENTS,
  FeedStatus,
  type MessageData,
  MessageType,
  SwarmChat,
} from '@solarpunkltd/swarm-chat-js';

import { groupReactions, type ReactionsByMessage } from './reactions';

/** Where a message stands on its way from this browser to the chat feed. */
interface DeliveryState {
  /** The send began. */
  requested?: boolean;
  /** Written to the sender's own feed, and on its way to the aggregator. */
  uploaded?: boolean;
  /** Read back from the chat feed, so everyone watching can see it. */
  received?: boolean;
  error?: boolean;
}

export interface VisibleMessage extends MessageData, DeliveryState {}

export const CHAT_LOADING = 'loading';
export const CHAT_READY = 'ready';
export const CHAT_UNREACHABLE = 'unreachable';

export type ChatStatus = typeof CHAT_LOADING | typeof CHAT_READY | typeof CHAT_UNREACHABLE;

function byTimestamp(a: MessageData, b: MessageData): number {
  return a.timestamp - b.timestamp;
}

/** One entry per message id, the latest delivery state laid over what was known, in the order written. */
export function mergeMessage(
  messages: VisibleMessage[],
  incoming: MessageData,
  delivery: DeliveryState,
): VisibleMessage[] {
  const index = messages.findIndex((message) => message.id === incoming.id);
  const merged =
    index === -1
      ? [...messages, { ...incoming, ...delivery }]
      : messages.map((message, at) => (at === index ? { ...message, ...incoming, ...delivery } : message));
  return merged.sort(byTimestamp);
}

/**
 * The chat is started a tick after the effect runs rather than inside it. StrictMode mounts every
 * effect, unmounts it and mounts it again in one go, and a start inside the effect would open a second
 * chat, with its own polling, for each of those passes.
 */
const START_DELAY_MS = 0;

/**
 * One chat for the settings given, stopped when they change and when the component goes away. The
 * settings are compared by value, so a caller may build a new object on every render.
 *
 * A new name restarts the chat too, because the library takes its key once, when it is created. The
 * messages on screen stay through that restart, since it is the same chat read again, and only a
 * different stream's chat starts from an empty list.
 */
export function useSwarmChat(settings: ChatSettings, ownAddress: string | null) {
  const settingsKey = JSON.stringify(settings);
  const chatKey = JSON.stringify(settings.infra);
  const chatRef = useRef<SwarmChat | null>(null);
  const shownChatKeyRef = useRef(chatKey);

  const [restarts, setRestarts] = useState(0);
  const [messages, setMessages] = useState<VisibleMessage[]>([]);
  const [status, setStatus] = useState<ChatStatus>(CHAT_LOADING);
  const [isLoadingOlder, setIsLoadingOlder] = useState(false);
  const [hasOlder, setHasOlder] = useState(false);
  const [feedStatus, setFeedStatus] = useState<FeedStatus | null>(null);

  useEffect(() => {
    const current = JSON.parse(settingsKey) as ChatSettings;
    const currentChatKey = JSON.stringify(current.infra);
    if (shownChatKeyRef.current !== currentChatKey) {
      shownChatKeyRef.current = currentChatKey;
      setMessages([]);
      setStatus(CHAT_LOADING);
      setHasOlder(false);
      setIsLoadingOlder(false);
    } else {
      // A chat started again, for a new name or on request, has not failed yet.
      setStatus((previous) => (previous === CHAT_UNREACHABLE ? CHAT_LOADING : previous));
    }
    let stopped = false;
    let chat: SwarmChat | null = null;
    /** The library keeps its listeners through a stop, so each one added here is taken off again here. */
    const removeListeners: Array<() => void> = [];

    setFeedStatus(null);

    const timer = setTimeout(() => {
      const started = new SwarmChat(current);
      chat = started;
      chatRef.current = started;

      const { on, off } = started.getEmitter();
      const listen = <E extends ChatEvent>(event: E, listener: (data: ChatEventPayloads[E]) => void) => {
        on(event, listener);
        removeListeners.push(() => off(event, listener));
      };
      const onMessage = (delivery: DeliveryState) => (data: MessageData) => {
        if (!stopped) {
          setMessages((previous) => mergeMessage(previous, data, delivery));
        }
      };

      listen(EVENTS.MESSAGE_REQUEST_INITIATED, onMessage({ error: false, requested: true }));
      listen(EVENTS.MESSAGE_REQUEST_UPLOADED, onMessage({ error: false, uploaded: true }));
      listen(EVENTS.MESSAGE_RECEIVED, onMessage({ error: false, received: true }));
      listen(EVENTS.MESSAGE_REQUEST_ERROR, onMessage({ error: true }));
      listen(EVENTS.LOADING_INIT, (loading: boolean) => {
        if (stopped) {
          return;
        }
        if (!loading) {
          setHasOlder(started.hasPreviousMessages());
        }
        // The library keeps trying after a critical error, so the end of a load shows the chat whatever came
        // before. Once a chat has shown, a restart for a new name reads it again behind what is on screen.
        setStatus((previous) =>
          !loading ? CHAT_READY : previous === CHAT_UNREACHABLE || previous === CHAT_READY ? previous : CHAT_LOADING,
        );
      });
      listen(EVENTS.LOADING_PREVIOUS_MESSAGES, (loading: boolean) => {
        if (stopped) {
          return;
        }
        setIsLoadingOlder(loading);
        if (!loading) {
          setHasOlder(started.hasPreviousMessages());
        }
      });
      listen(EVENTS.STATUS, (next) => {
        if (!stopped) {
          setFeedStatus(next);
        }
      });
      listen(EVENTS.CRITICAL_ERROR, () => {
        if (!stopped) {
          setStatus(CHAT_UNREACHABLE);
        }
      });

      started.start().then(
        () => {
          // Library 6.x began polling at the end of start() even after a stop, and a second stop costs
          // nothing, so a chat whose start finished after its stop is stopped once more.
          if (stopped) {
            void started.stop();
          }
        },
        () => {
          if (!stopped) {
            setStatus(CHAT_UNREACHABLE);
          }
        },
      );
    }, START_DELAY_MS);

    return () => {
      stopped = true;
      clearTimeout(timer);
      for (const removeListener of removeListeners.splice(0)) {
        removeListener();
      }
      if (chat) {
        if (chatRef.current === chat) {
          chatRef.current = null;
        }
        void chat.stop();
      }
    };
  }, [settingsKey, restarts]);

  const grouped = useMemo(() => {
    const text: VisibleMessage[] = [];
    const reactions: MessageData[] = [];
    const replies: VisibleMessage[] = [];
    for (const message of messages) {
      if (message.type === MessageType.TEXT) {
        text.push(message);
      } else if (message.type === MessageType.REACTION) {
        reactions.push(message);
      } else if (message.type === MessageType.THREAD) {
        replies.push(message);
      }
    }
    return { text, reactions, replies };
  }, [messages]);

  const reactionsByMessage: ReactionsByMessage = useMemo(
    () => groupReactions(grouped.reactions, ownAddress),
    [grouped.reactions, ownAddress],
  );

  const repliesTo = useCallback(
    (parentId: string) => grouped.replies.filter((reply) => reply.targetMessageId === parentId),
    [grouped.replies],
  );

  const send = useCallback(async (text: string, type: MessageType, targetMessageId?: string) => {
    await chatRef.current?.sendMessage(text, type, targetMessageId);
  }, []);

  const sendMessage = useCallback((text: string) => send(text, MessageType.TEXT), [send]);
  const sendReaction = useCallback(
    (targetMessageId: string, emoji: string) => send(emoji, MessageType.REACTION, targetMessageId),
    [send],
  );
  const sendReply = useCallback((parentId: string, text: string) => send(text, MessageType.THREAD, parentId), [send]);

  const fetchOlderMessages = useCallback(async () => {
    try {
      await chatRef.current?.fetchPreviousMessages();
    } catch {
      // A snapshot that cannot be read now is offered again: the button stays while there is more.
    }
  }, []);

  /** A message that failed, or one still waiting to be read back, is sent again with its identical bytes. */
  const retrySendMessage = useCallback((message: VisibleMessage) => {
    chatRef.current?.retrySendMessage(message);
  }, []);

  const restart = useCallback(() => setRestarts((count) => count + 1), []);

  return {
    status,
    feedStatus,
    isLoadingOlder,
    hasOlder,
    messages: grouped.text,
    reactionsByMessage,
    repliesTo,
    sendMessage,
    sendReaction,
    sendReply,
    fetchOlderMessages,
    retrySendMessage,
    restart,
  };
}
