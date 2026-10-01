import { useAppContext } from '@/app/AppProvider';
import { Footer } from '@/app/layout/Footer/Footer';
import { CATALOG_POLL_INTERVAL_MS } from '@/features/catalog/catalogPoll';
import { StreamList } from '@/features/catalog/StreamList/StreamList';
import { useCatalogPoll } from '@/features/catalog/useCatalogPoll';
import { Spinner } from '@/shared/components/Spinner/Spinner';

import { CATALOG_VIEW_MESSAGE, catalogViewFrom } from './catalogView';

import './StreamBrowser.scss';

export function StreamBrowser() {
  const { streamList, isStreamListFromCurrentGateway, theme } = useAppContext();
  const { error, isLoading } = useCatalogPoll(CATALOG_POLL_INTERVAL_MS);

  const view = catalogViewFrom({
    isLoading,
    hasError: Boolean(error),
    streamCount: streamList.length,
    isFromCurrentGateway: isStreamListFromCurrentGateway,
  });

  return (
    <div className="stream-browser-page">
      <div className="stream-browser-hero">
        <h1 className="stream-browser-title">{theme.heroTitle}</h1>
        <p className="stream-browser-subtitle">{theme.heroSubtitle}</p>
      </div>
      <div className="stream-browser">
        {view === 'streams' ? (
          <StreamList />
        ) : (
          <div className={`stream-browser-notice ${view}`} role={view === 'unreachable' ? 'alert' : 'status'}>
            {view === 'loading' && <Spinner />}
            <p>{CATALOG_VIEW_MESSAGE[view]}</p>
          </div>
        )}
      </div>
      <Footer />
    </div>
  );
}
