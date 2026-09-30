import swarmLogoUrl from './assets/swarm-logo.svg';

/**
 * Every theme this build carries, by the name a deployment selects it with in config.json. The
 * stylesheet defines one `:root[data-theme]` block for each, in `themes/_index.scss`, and the tokens
 * test holds the two lists to each other.
 */
export const THEME_NAMES = ['swarm'] as const;

export type ThemeName = (typeof THEME_NAMES)[number];

/** Used when the config names no theme, and applied by the stylesheet before any is chosen. */
export const DEFAULT_THEME: ThemeName = 'swarm';

/** What a theme decides that a stylesheet cannot: its images and its words. */
export interface ThemeSettings {
  logoUrl: string;
  heroTitle: string;
  heroSubtitle: string;
}

export const THEMES: Record<ThemeName, ThemeSettings> = {
  swarm: {
    logoUrl: swarmLogoUrl,
    heroTitle: 'Devcon 8 streams',
    heroSubtitle: 'Live talks and recordings from Devcon 8, stored and delivered over the Swarm network.',
  },
};

/** Marks the page with the theme, which is what every themed variable is selected on. */
export function applyTheme(name: ThemeName, root: HTMLElement = document.documentElement): void {
  root.dataset.theme = name;
}
