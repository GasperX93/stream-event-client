import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

import {
  CONFIG_URL,
  configProblemText,
  loadRuntimeConfig,
  parseRuntimeConfig,
  type RuntimeConfigResult,
} from '../src/config/runtimeConfig';

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));

const OWNER = '0x' + '1'.repeat(40);

const VALID = {
  gatewayUrl: '/bee',
  catalog: { owner: OWNER, topic: 'event-streams' },
};

const CHAT = {
  enabled: true,
  beeUrl: 'http://localhost:1633',
  gsocResourceId: 'a'.repeat(64),
  gsocTopic: 'chat',
  feedOwner: OWNER,
  pollIntervalMs: 500,
};

function problemOf(result: RuntimeConfigResult): string {
  if (result.ok) {
    throw new Error('expected the config to be refused');
  }
  return result.problem;
}

function answering(body: string, status = 200): typeof fetch {
  return (async () => new Response(body, { status })) as typeof fetch;
}

describe('checking the runtime config', () => {
  it('accepts a gateway path on this site, a feed owner and a topic', () => {
    const result = parseRuntimeConfig(VALID);

    expect(result).toEqual({ ok: true, config: VALID });
  });

  it('accepts an absolute http or https gateway', () => {
    for (const gatewayUrl of ['http://localhost:1633', 'https://gateway.example.com/']) {
      expect(parseRuntimeConfig({ ...VALID, gatewayUrl }).ok).toBe(true);
    }
  });

  it('accepts an owner written without the 0x prefix', () => {
    expect(parseRuntimeConfig({ ...VALID, catalog: { ...VALID.catalog, owner: '2'.repeat(40) } }).ok).toBe(true);
  });

  it('accepts a chat block, and no chat block at all', () => {
    expect(parseRuntimeConfig({ ...VALID, chat: CHAT }).ok).toBe(true);
    expect(parseRuntimeConfig(VALID).ok).toBe(true);
  });

  it('refuses a config that is not an object', () => {
    for (const raw of [null, 'config', 42, []]) {
      expect(parseRuntimeConfig(raw).ok).toBe(false);
    }
  });

  it('refuses a gateway that is neither a path on this site nor an http address', () => {
    for (const gatewayUrl of ['', 'bee', 'ftp://gateway.example.com', 'javascript:alert(1)']) {
      expect(problemOf(parseRuntimeConfig({ ...VALID, gatewayUrl }))).toContain('gatewayUrl');
    }
  });

  it('refuses an owner that is not an Ethereum address, naming the field', () => {
    for (const owner of ['', '0x1234', 'z'.repeat(40), '0x' + '1'.repeat(41)]) {
      expect(problemOf(parseRuntimeConfig({ ...VALID, catalog: { ...VALID.catalog, owner } }))).toContain(
        'catalog.owner',
      );
    }
  });

  it('refuses an empty topic, naming the field', () => {
    expect(problemOf(parseRuntimeConfig({ ...VALID, catalog: { ...VALID.catalog, topic: '' } }))).toContain(
      'catalog.topic',
    );
  });

  it('refuses a value still holding the example placeholder, and says so', () => {
    const problem = problemOf(
      parseRuntimeConfig({ ...VALID, catalog: { ...VALID.catalog, topic: '<stream list topic>' } }),
    );

    expect(problem).toContain('catalog.topic');
    expect(problem).toContain('placeholder');
  });

  it('refuses a missing catalog', () => {
    expect(problemOf(parseRuntimeConfig({ gatewayUrl: '/bee' }))).toContain('catalog');
  });

  it('refuses a chat block of the wrong shape, naming the field', () => {
    expect(problemOf(parseRuntimeConfig({ ...VALID, chat: { ...CHAT, pollIntervalMs: 'fast' } }))).toContain(
      'chat.pollIntervalMs',
    );
    expect(problemOf(parseRuntimeConfig({ ...VALID, chat: { ...CHAT, enabled: 'yes' } }))).toContain('chat.enabled');
  });

  it('names every field it refused, not only the first', () => {
    const problem = problemOf(parseRuntimeConfig({ gatewayUrl: '', catalog: { owner: '', topic: '' } }));

    expect(problem).toContain('gatewayUrl');
    expect(problem).toContain('catalog.owner');
    expect(problem).toContain('catalog.topic');
  });
});

describe('the example config the repository ships', () => {
  const example = JSON.parse(readFileSync(join(ROOT, 'public', 'config.json'), 'utf8')) as unknown;

  it('is refused until its placeholders are filled in, so it can never pass for a real deployment', () => {
    expect(problemOf(parseRuntimeConfig(example))).toContain('placeholder');
  });

  it('is valid once the placeholders are filled in', () => {
    const filled = JSON.parse(
      JSON.stringify(example)
        .replace(/"<[^"]*owner[^"]*>"/g, JSON.stringify(OWNER))
        .replace(/"<[^"]*>"/g, '"a-value"'),
    ) as unknown;

    expect(parseRuntimeConfig(filled).ok).toBe(true);
  });
});

describe('loading the runtime config', () => {
  it('reads it from beside the page', () => {
    expect(CONFIG_URL).toBe('./config.json');
  });

  it('asks for it uncached', async () => {
    let asked: RequestInit | undefined;
    const fetchFn = (async (_url: string, init?: RequestInit) => {
      asked = init;
      return new Response(JSON.stringify(VALID));
    }) as typeof fetch;

    await loadRuntimeConfig(fetchFn);

    expect(asked?.cache).toBe('no-store');
  });

  it('hands back the checked config', async () => {
    expect(await loadRuntimeConfig(answering(JSON.stringify(VALID)))).toEqual({ ok: true, config: VALID });
  });

  it('says so when the page cannot reach it', async () => {
    const unreachable = (async () => {
      throw new TypeError('Failed to fetch');
    }) as typeof fetch;

    expect(problemOf(await loadRuntimeConfig(unreachable))).toContain('could not be read');
  });

  it('says so when the server answers with an error, naming the status', async () => {
    expect(problemOf(await loadRuntimeConfig(answering('not here', 404)))).toContain('404');
  });

  it('says so when it is not JSON', async () => {
    expect(problemOf(await loadRuntimeConfig(answering('<!doctype html><html></html>')))).toContain('not JSON');
  });

  it('says so when it does not pass the check', async () => {
    expect(problemOf(await loadRuntimeConfig(answering(JSON.stringify({ gatewayUrl: '/bee' }))))).toContain('catalog');
  });
});

describe('the text a page shows when it has no config', () => {
  it('says the page cannot start and why, instead of showing an empty list', () => {
    const text = configProblemText({ ok: false, problem: 'catalog.owner: not an address' });

    expect(text.title).toMatch(/cannot start/i);
    expect(text.detail).toContain('catalog.owner: not an address');
    expect(text.hint).toContain('config.json');
  });
});
