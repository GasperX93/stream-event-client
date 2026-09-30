import swarmLogoUrl from './assets/swarm-logo.svg';
import { type ThemeName } from './themeNames';

export { DEFAULT_THEME, THEME_NAMES, type ThemeName } from './themeNames';

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
