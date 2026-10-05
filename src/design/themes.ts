import swarmLogoUrl from './assets/swarm-logo.svg';
import web3privacyLogoUrl from './assets/web3privacy-logo.png';
import { type ThemeName } from './themeNames';

export { DEFAULT_THEME, THEME_NAMES, type ThemeName } from './themeNames';

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
  /** What the logo says, for a reader who cannot see it. */
  logoAlt: string;
  heroTitle: string;
  heroSubtitle: string;
  /** Optional lines for an event page: a label over the title, the date, a tagline and a paragraph. */
  heroEyebrow?: string;
  heroDate?: string;
  heroTagline?: string;
  heroBody?: string;
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

const WEB3PRIVACY_FOOTER: FooterSettings = {
  tagline: 'Web3Privacy Now: privacy and internet freedoms, streamed over Swarm.',
  brandLinks: [
    { label: 'web3privacy.info', href: 'https://web3privacy.info' },
    { label: 'Manifesto', href: 'https://docs.web3privacy.info/about-us/manifesto/' },
    { label: 'News', href: 'https://news.web3privacy.info' },
  ],
  columns: [
    {
      title: 'Community',
      links: [
        { label: 'Forum', href: 'https://forum.web3privacy.info/' },
        { label: 'YouTube', href: 'https://www.youtube.com/@Web3PrivacyNow' },
        { label: 'Bluesky', href: 'https://bsky.app/profile/web3privacy.info' },
        { label: 'LinkedIn', href: 'https://www.linkedin.com/company/web3privacynow' },
      ],
    },
    {
      title: 'Explore',
      links: [
        { label: 'Explorer', href: 'https://explorer.web3privacy.info' },
        { label: 'Academy', href: 'https://academy.web3privacy.info' },
        { label: 'Stacks', href: 'https://stacks.web3privacy.info' },
        { label: 'GitHub', href: 'https://github.com/web3privacy' },
      ],
    },
    {
      title: 'Streamed on Swarm',
      links: [
        { label: 'ethswarm.org', href: 'https://www.ethswarm.org' },
        { label: 'Swarm docs', href: 'https://docs.ethswarm.org' },
      ],
    },
  ],
  owner: 'Web3Privacy Now',
  bottomLinks: [{ label: 'Hosted on Swarm', href: 'https://swarm.bzz.link/' }],
};

export const THEMES: Record<ThemeName, ThemeSettings> = {
  swarm: {
    logoUrl: swarmLogoUrl,
    logoAlt: 'Swarm',
    heroTitle: 'Devcon 8 streams',
    heroSubtitle: 'Live talks and recordings from Devcon 8, stored and delivered over the Swarm network.',
    footer: SWARM_FOOTER,
  },
  web3privacy: {
    logoUrl: web3privacyLogoUrl,
    logoAlt: 'Web3Privacy Now',
    heroEyebrow: 'Livestream',
    heroTitle: 'Cypherpunk Congress 3 · Mumbai 2026',
    heroSubtitle: "The world's largest cypherpunk and human rights event",
    heroDate: 'Nov 2, 9am (IST)',
    heroTagline: 'Privacy loves equality',
    heroBody:
      '5000 people are gathering in Mumbai to celebrate privacy and internet freedoms in dialogue with Global South. Past editions featured visionaries like Richard Stallman, Chelsea Manning, Vitalik Buterin, Roger Dingledine, Eva Galperin, Renata Avila, David Chaum, Juan Benet & many others.',
    footer: WEB3PRIVACY_FOOTER,
  },
};

/** Marks the page with the theme, which is what every themed variable is selected on. */
export function applyTheme(name: ThemeName, root: HTMLElement = document.documentElement): void {
  root.dataset.theme = name;
}
