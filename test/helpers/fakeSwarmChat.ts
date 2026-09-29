import type { ChatSettings, MessageData } from '@solarpunkltd/swarm-chat-js';
import { vi } from 'vitest';

type Listener = (data: unknown) => void;

class FakeEmitter {
  private listeners = new Map<string, Listener[]>();

  on = (event: string, listener: Listener) => {
    this.listeners.set(event, [...(this.listeners.get(event) ?? []), listener]);
  };

  off = (event: string, listener: Listener) => {
    this.listeners.set(
      event,
      (this.listeners.get(event) ?? []).filter((candidate) => candidate !== listener),
    );
  };

  emit = (event: string, data: unknown) => {
    for (const listener of [...(this.listeners.get(event) ?? [])]) {
      listener(data);
    }
  };

  cleanAll = () => {
    this.listeners.clear();
  };
}

/**
 * Stands in for the chat library's SwarmChat: nothing reaches the network, and a test drives the chat by
 * emitting the library's own events on the instance it created.
 */
export class FakeSwarmChat {
  static instances: FakeSwarmChat[] = [];

  /** What the next chat created answers start() with, so a test can hold a start open. */
  static nextStart: (() => Promise<void>) | null = null;

  static reset() {
    FakeSwarmChat.instances = [];
    FakeSwarmChat.nextStart = null;
  }

  static latest(): FakeSwarmChat {
    const chat = FakeSwarmChat.instances.at(-1);
    if (!chat) {
      throw new Error('no chat was created');
    }
    return chat;
  }

  readonly emitter = new FakeEmitter();
  previousMessages = false;

  start = vi.fn(async () => {});
  stop = vi.fn(async () => {
    this.emitter.cleanAll();
  });
  sendMessage = vi.fn(async () => {});
  retrySendMessage = vi.fn(async () => {});
  retryBroadcastUserMessage = vi.fn(async () => {});
  fetchPreviousMessages = vi.fn(async () => {});
  hasPreviousMessages = vi.fn(() => this.previousMessages);

  constructor(readonly settings: ChatSettings) {
    FakeSwarmChat.instances.push(this);
    const nextStart = FakeSwarmChat.nextStart;
    if (nextStart) {
      FakeSwarmChat.nextStart = null;
      this.start.mockImplementation(nextStart);
    }
  }

  getEmitter() {
    return this.emitter;
  }

  orderMessages(messages: MessageData[]) {
    return [...messages].sort((a, b) => a.timestamp - b.timestamp);
  }
}
