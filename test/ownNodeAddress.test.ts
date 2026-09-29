import { describe, expect, it } from 'vitest';

import { checkOwnNodeAddress, gatewayLabel, OWN_NODE_DEFAULT_ADDRESS } from '../src/features/gateway/gatewayProbe';

function acceptedUrl(input: string): string {
  const result = checkOwnNodeAddress(input);
  if (!result.ok) {
    throw new Error(`expected ${JSON.stringify(input)} to be accepted, got: ${result.text}`);
  }
  return result.url;
}

function refusal(input: string): string {
  const result = checkOwnNodeAddress(input);
  if (result.ok) {
    throw new Error(`expected ${JSON.stringify(input)} to be refused, got ${result.url}`);
  }
  return result.text;
}

describe('the address of a Bee node on the viewer’s own machine', () => {
  it('is prefilled with the Bee API on this machine', () => {
    expect(OWN_NODE_DEFAULT_ADDRESS).toBe('http://localhost:1633');
    expect(acceptedUrl(OWN_NODE_DEFAULT_ADDRESS)).toBe('http://localhost:1633');
  });

  it('accepts another port on localhost', () => {
    expect(acceptedUrl('http://localhost:1733')).toBe('http://localhost:1733');
  });

  it('accepts 127.0.0.1 and [::1]', () => {
    expect(acceptedUrl('http://127.0.0.1:1633')).toBe('http://127.0.0.1:1633');
    expect(acceptedUrl('http://[::1]:1633')).toBe('http://[::1]:1633');
  });

  it('accepts https on the same hosts', () => {
    expect(acceptedUrl('https://localhost:1633')).toBe('https://localhost:1633');
  });

  it('adds http:// to a bare host and port, and drops whitespace and a trailing slash', () => {
    expect(acceptedUrl('  localhost:1633/ ')).toBe('http://localhost:1633');
  });

  it('accepts the host in any case', () => {
    expect(acceptedUrl('http://LOCALHOST:1633')).toBe('http://localhost:1633');
  });

  it('refuses a node on another machine, and says which hosts it takes', () => {
    for (const input of ['http://192.168.1.20:1633', 'http://bee.example.com:1633', 'http://10.0.0.5:1633']) {
      const text = refusal(input);
      expect(text).toContain('localhost');
      expect(text).toContain('127.0.0.1');
      expect(text).toContain('[::1]');
    }
  });

  it('refuses the loopback lookalikes a browser would not treat as this machine', () => {
    for (const input of ['http://127.0.0.2:1633', 'http://localhost.example.com:1633', 'http://my.localhost:1633']) {
      expect(refusal(input)).toContain('localhost');
    }
  });

  it('refuses a scheme other than http or https', () => {
    expect(refusal('ftp://localhost:1633')).toMatch(/http/);
  });

  it('refuses an address carrying a path, a query or credentials', () => {
    for (const input of ['http://localhost:1633/bzz', 'http://localhost:1633?x=1', 'http://user:pw@localhost:1633']) {
      expect(checkOwnNodeAddress(input).ok).toBe(false);
    }
  });

  it('refuses a path on this site, which is not a node on the viewer’s machine', () => {
    expect(checkOwnNodeAddress('/bee').ok).toBe(false);
  });

  it('asks for an address when there is none', () => {
    expect(refusal('   ')).toContain('http://localhost:1633');
  });

  it('refuses something that is not an address at all', () => {
    expect(checkOwnNodeAddress('http://').ok).toBe(false);
  });
});

describe('the name the header shows for the gateway in use', () => {
  it('calls the configured gateway the event gateway', () => {
    expect(gatewayLabel('/bee', '/bee')).toBe('Event gateway');
  });

  it('shows a viewer’s own node as its host', () => {
    expect(gatewayLabel('http://localhost:1633', '/bee')).toBe('localhost:1633');
  });
});
