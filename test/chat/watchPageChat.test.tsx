// @vitest-environment jsdom
import { act, createElement } from 'react';
import { MemoryRouter, Route, Routes } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { ChatConfig } from '../../src/config/runtimeConfig';
import { StreamWatcher } from '../../src/features/player/StreamWatcher/StreamWatcher';
import { ChatUserProvider } from '../../src/features/chat/User';
import { CHAT_LOAD_FALLBACK_MS } from '../../src/features/chat/WatchChat';
import { FakeSwarmChat } from '../helpers/fakeSwarmChat';
import { mount, settle, text, waitFor, type Mounted } from '../helpers/dom';

vi.mock('@solarpunkltd/swarm-chat-js', async (importActual) => {
  const actual = await importActual<typeof import('@solarpunkltd/swarm-chat-js')>();
  const { FakeSwarmChat } = await import('../helpers/fakeSwarmChat');
  return { ...actual, SwarmChat: FakeSwarmChat };
});

const appContext = vi.hoisted(() => ({
  value: { streamList: [], isStreamListLoaded: true, chat: null as ChatConfig | null },
}));

vi.mock('../../src/app/AppProvider', () => ({ useAppContext: () => appContext.value }));
vi.mock('../../src/features/catalog/useCatalogPoll', () => ({ useCatalogPoll: () => {} }));
vi.mock('../../src/features/player/SwarmHlsPlayer', () => ({
  SwarmHlsPlayer: ({ onPlaying }: { onPlaying?: () => void }) =>
    createElement('video', { 'data-testid': 'player', onPlaying }),
}));

const CHAT: ChatConfig = {
  enabled: true,
  readUrl: '/chat-read',
  writeUrl: '/chat-write',
  gsocResourceId: 'd'.repeat(64),
  gsocTopic: 'gsoc-topic',
  feedOwner: '0x' + 'b'.repeat(40),
  pollIntervalMs: 500,
};

let mounted: Mounted | null = null;

function openWatchPage() {
  mounted = mount(
    createElement(
      ChatUserProvider,
      null,
      createElement(
        MemoryRouter,
        { initialEntries: [`/watch/video/${'a'.repeat(40)}/stream-one`] },
        createElement(
          Routes,
          null,
          createElement(Route, { path: '/watch/:mediatype/:owner/:topic', element: createElement(StreamWatcher) }),
        ),
      ),
    ),
  );
}

function playerStarts() {
  const video = document.querySelector('video');
  act(() => {
    video?.dispatchEvent(new Event('playing'));
  });
}

beforeEach(() => {
  FakeSwarmChat.reset();
  localStorage.clear();
});

afterEach(() => {
  mounted?.unmount();
  mounted = null;
  document.body.innerHTML = '';
  vi.useRealTimers();
});

describe('the chat on the watch page', () => {
  it('is not there at all when the config switches chat off', async () => {
    appContext.value = { ...appContext.value, chat: null };
    openWatchPage();
    playerStarts();
    await settle();
    expect(document.querySelector('.watch-layout-side')).toBeNull();
    expect(document.querySelector('.watch-layout.with-side')).toBeNull();
    expect(FakeSwarmChat.instances).toHaveLength(0);
  });

  it('keeps its place beside the player and loads once the player starts', async () => {
    appContext.value = { ...appContext.value, chat: CHAT };
    openWatchPage();
    await settle();
    expect(document.querySelector('.watch-layout-side')).not.toBeNull();
    expect(FakeSwarmChat.instances).toHaveLength(0);

    playerStarts();
    await waitFor(() => FakeSwarmChat.instances[0]);
    expect(FakeSwarmChat.latest().settings.infra.chatTopic).toBe('chat-stream-one');
    expect(text()).toContain('Chat');
  });

  it('loads anyway when the player has not started in a few seconds', async () => {
    vi.useFakeTimers();
    appContext.value = { ...appContext.value, chat: CHAT };
    openWatchPage();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(CHAT_LOAD_FALLBACK_MS - 1);
    });
    expect(FakeSwarmChat.instances).toHaveLength(0);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1);
    });
    // Runs the chat's own start, a tick later, if the chat module was already loaded.
    await act(async () => {
      await vi.advanceTimersByTimeAsync(10);
    });
    vi.useRealTimers();
    await waitFor(() => FakeSwarmChat.instances[0]);
  });
});
