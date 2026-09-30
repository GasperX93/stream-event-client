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

export interface FooterLink {
  label: string;
  href: string;
}

export interface FooterColumn {
  title: string;
  links: FooterLink[];
}

/** The footer under the browse page: the brand block, the link columns and the bottom row. */
export interface FooterSettings {
  tagline: string;
  brandLinks: FooterLink[];
  columns: FooterColumn[];
  /** Who the bottom row names, followed by the year. */
  owner: string;
  bottomLinks: FooterLink[];
}

/** What a theme decides that a stylesheet cannot: its images and its words. */
export interface ThemeSettings {
  logoUrl: string;
  heroTitle: string;
  heroSubtitle: string;
  footer: FooterSettings;
}

// The links of the footer msrs-client shows in its Swarm theme, which mirrors the Swarm Foundation's own.
const SWARM_FOOTER: FooterSettings = {
  tagline: 'Swarm is a decentralised storage and communication system for a sovereign digital society.',
  brandLinks: [
    { label: 'ethswarm.org', href: 'https://www.ethswarm.org' },
    { label: 'Documentation', href: 'https://docs.ethswarm.org' },
    { label: 'Blog', href: 'https://blog.ethswarm.org' },
  ],
  columns: [
    {
      title: 'Community',
      links: [
        { label: 'Discord', href: 'https://discord.com/invite/hyCr9BMX9U' },
        { label: 'X (Twitter)', href: 'https://x.com/ethswarm' },
        { label: 'Reddit', href: 'https://www.reddit.com/r/ethswarm/' },
        { label: 'YouTube', href: 'https://www.youtube.com/@EthereumSwarm' },
      ],
    },
    {
      title: 'Development',
      links: [
        { label: 'GitHub', href: 'https://github.com/ethersphere' },
        { label: 'Developer Hub', href: 'https://docs.ethswarm.org/docs/develop/introduction/' },
        { label: 'Research Papers', href: 'https://papers.ethswarm.org/' },
        { label: 'Beeport', href: 'https://beeport.ethswarm.org/' },
      ],
    },
    {
      title: 'Resources',
      links: [
        { label: 'Swarm Hub', href: 'https://links.ethswarm.org/' },
        { label: 'Desktop App', href: 'https://desktop.ethswarm.org/' },
        { label: 'Swarmy', href: 'https://swarmy.cloud/' },
        { label: 'Etherjot', href: 'https://etherjot.eth.limo/' },
      ],
    },
  ],
  owner: 'Swarm Foundation',
  bottomLinks: [
    { label: 'Privacy policy', href: 'https://www.ethswarm.org/privacy' },
    { label: 'Hosted on Swarm', href: 'https://swarm.bzz.link/' },
  ],
};

export const THEMES: Record<ThemeName, ThemeSettings> = {
  swarm: {
    logoUrl: swarmLogoUrl,
    heroTitle: 'Devcon 8 streams',
    heroSubtitle: 'Live talks and recordings from Devcon 8, stored and delivered over the Swarm network.',
    footer: SWARM_FOOTER,
  },
};

/** Marks the page with the theme, which is what every themed variable is selected on. */
export function applyTheme(name: ThemeName, root: HTMLElement = document.documentElement): void {
  root.dataset.theme = name;
}
