import { StreamList } from '@/features/catalog/StreamList/StreamList';
import { useAppContext } from '@/app/AppProvider';
import { CATALOG_POLL_INTERVAL_MS } from '@/features/catalog/catalogPoll';
import { useCatalogPoll } from '@/features/catalog/useCatalogPoll';
import { Spinner } from '@/shared/components/Spinner/Spinner';

import { CATALOG_VIEW_MESSAGE, catalogViewFrom } from './catalogView';

import './StreamBrowser.scss';

export function StreamBrowser() {
  const { streamList, isStreamListFromCurrentGateway } = useAppContext();
  // `error` and `isLoading` used to be dropped here, which is why a gateway nobody could reach looked
  // exactly like a gateway with nothing on it.
  const { error, isLoading } = useCatalogPoll(CATALOG_POLL_INTERVAL_MS);

  const view = catalogViewFrom({
    isLoading,
    hasError: Boolean(error),
    streamCount: streamList.length,
    isFromCurrentGateway: isStreamListFromCurrentGateway,
  });

  return (
    <div className="stream-browser">
      <div className="stream-browser-hero">
        <h1 className="stream-browser-title">Devcon 8 streams</h1>
        <p className="stream-browser-subtitle">Live talks and recordings, delivered over the Swarm network.</p>
      </div>
      {view === 'streams' ? (
        <StreamList />
      ) : (
        <div className={`stream-browser-notice ${view}`} role={view === 'unreachable' ? 'alert' : 'status'}>
          {view === 'loading' && <Spinner />}
          <p>{CATALOG_VIEW_MESSAGE[view]}</p>
        </div>
      )}
    </div>
  );
}
