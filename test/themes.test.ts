// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';

import { parseRuntimeConfig, selectedTheme } from '../src/config/runtimeConfig';
import { applyTheme, DEFAULT_THEME, THEME_NAMES, THEMES } from '../src/design/themes';

const VALID = {
  gatewayUrl: '/bee',
  catalog: { owner: '0x' + '1'.repeat(40), topic: 'event-streams' },
};

describe('choosing a theme', () => {
  it('uses the default theme when the config names none', () => {
    const result = parseRuntimeConfig(VALID);

    expect(result.ok && selectedTheme(result.config)).toBe(DEFAULT_THEME);
  });

  it('uses the theme the config names', () => {
    for (const theme of THEME_NAMES) {
      const result = parseRuntimeConfig({ ...VALID, theme });

      expect(result.ok && selectedTheme(result.config)).toBe(theme);
    }
  });

  it('refuses a theme this build does not carry, naming the ones it does', () => {
    const result = parseRuntimeConfig({ ...VALID, theme: 'no-such-theme' });

    expect(result.ok).toBe(false);
    expect(!result.ok && result.problem).toMatch(new RegExp(`theme: .*${THEME_NAMES.join('.*')}`));
  });

  it('marks the page with the theme, which is what the stylesheet selects on', () => {
    const root = document.createElement('html');

    applyTheme(DEFAULT_THEME, root);

    expect(root.dataset.theme).toBe(DEFAULT_THEME);
  });

  it('gives every theme its logo and page copy', () => {
    for (const name of THEME_NAMES) {
      expect(THEMES[name].logoUrl).toBeTruthy();
      expect(THEMES[name].heroTitle.trim()).not.toBe('');
      expect(THEMES[name].heroSubtitle.trim()).not.toBe('');
    }
  });
});
