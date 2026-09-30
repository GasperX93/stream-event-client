import { Link } from 'react-router';

import { useAppContext } from '@/app/AppProvider';
import { LoginButton } from '@/features/chat/LoginButton/LoginButton';
import { DomainSelector } from '@/features/gateway/DomainSelector';

import './MainLayout.scss';

interface MainLayoutProps {
  children: React.ReactNode;
}

export function MainLayout({ children }: MainLayoutProps) {
  const { chat, theme } = useAppContext();

  return (
    <div className="main-layout">
      <header className="main-layout-header">
        <Link to="/" className="main-layout-logo-link" aria-label="All streams">
          <img src={theme.logoUrl} alt="Swarm" className="main-layout-logo" />
        </Link>
        <div className="main-layout-actions">
          <DomainSelector />
          {chat && <LoginButton />}
        </div>
      </header>
      <main className="main-layout-content">{children}</main>
    </div>
  );
}
