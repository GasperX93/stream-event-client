import { Link } from 'react-router';

import { swarmLogoUrl } from '@/design';
import { DomainSelector } from '@/features/gateway/DomainSelector';

import './MainLayout.scss';

interface MainLayoutProps {
  children: React.ReactNode;
}

export function MainLayout({ children }: MainLayoutProps) {
  return (
    <div className="main-layout">
      <header className="main-layout-header">
        <Link to="/" className="main-layout-logo-link" aria-label="All streams">
          <img src={swarmLogoUrl} alt="Swarm" className="main-layout-logo" />
        </Link>
        <DomainSelector />
      </header>
      <main className="main-layout-content">{children}</main>
    </div>
  );
}
