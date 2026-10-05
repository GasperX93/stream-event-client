import { useAppContext } from '@/app/AppProvider';
import type { FooterLink } from '@/design/themes';

import './Footer.scss';

function LinkList({ links }: { links: FooterLink[] }) {
  return (
    <ul className="footer-link-list">
      {links.map((link) => (
        <li key={link.href}>
          <a className="footer-link" href={link.href} target="_blank" rel="noreferrer">
            {link.label}
          </a>
        </li>
      ))}
    </ul>
  );
}

/** The footer under the browse page, laid out as msrs-client's Swarm theme lays out its own. */
export function Footer() {
  const { theme } = useAppContext();
  const { tagline, brandLinks, columns, owner, bottomText, bottomLinks, social } = theme.footer;

  return (
    <footer className={social ? 'footer footer--split' : 'footer'}>
      <div className="footer-container">
        <div className="footer-middle">
          <div className="footer-brand">
            <img className="footer-logo" src={theme.logoUrl} alt={theme.logoAlt} />
            {tagline && <p className="footer-tagline">{tagline}</p>}
            {brandLinks && <LinkList links={brandLinks} />}
          </div>

          {columns.map((column) => (
            <section key={column.title ?? column.links[0]?.href} className="footer-section">
              {column.title && <h3 className="footer-heading">{column.title}</h3>}
              <LinkList links={column.links} />
            </section>
          ))}

          {social ? (
            <section className="footer-social">
              <p className="footer-social-heading">{social.heading}</p>
              <ul className="footer-social-list">
                {social.links.map((link) => (
                  <li key={link.href}>
                    <a
                      className="footer-social-link"
                      href={link.href}
                      target="_blank"
                      rel="noreferrer"
                      aria-label={link.label}
                    >
                      {/* Drawn as a mask, so the icon takes the link's colour whatever colours its file uses. Quoted,
                          because a small icon is inlined as a data URL whose quotes and spaces break a bare url(). */}
                      <span
                        className="footer-social-icon"
                        style={{ maskImage: `url("${link.iconUrl}")`, WebkitMaskImage: `url("${link.iconUrl}")` }}
                        aria-hidden="true"
                      />
                    </a>
                  </li>
                ))}
              </ul>
            </section>
          ) : (
            // Held for the newsletter form, which waits on the owner's decision about where it posts.
            <div className="footer-newsletter-slot" aria-hidden="true" />
          )}
        </div>
      </div>

      <div className="footer-container">
        <div className="footer-bottom">
          <span>{bottomText ?? `${owner}, ${new Date().getFullYear()}`}</span>
          <span className="footer-bottom-separator" aria-hidden="true">
            ·
          </span>
          {bottomLinks.map((link) => (
            <a key={link.href} className="footer-bottom-link" href={link.href} target="_blank" rel="noreferrer">
              {link.label}
            </a>
          ))}
        </div>
      </div>
    </footer>
  );
}
