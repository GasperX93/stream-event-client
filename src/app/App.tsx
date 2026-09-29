import { StrictMode } from 'react';
import ReactDOM from 'react-dom/client';
import { HashRouter } from 'react-router';

import { loadRuntimeConfig } from '@/config/runtimeConfig';
import { ChatUserProvider } from '@/features/chat/User';

import { AppContextProvider as AppProvider } from './AppProvider';
import { ConfigProblem } from './ConfigProblem';
import BaseRouter from './routes';

import '@/design';

const root = ReactDOM.createRoot(document.getElementById('root') as HTMLElement);

void loadRuntimeConfig().then((result) => {
  root.render(
    <StrictMode>
      {result.ok ? (
        <AppProvider config={result.config}>
          <ChatUserProvider>
            <HashRouter>
              <BaseRouter />
            </HashRouter>
          </ChatUserProvider>
        </AppProvider>
      ) : (
        <ConfigProblem result={result} />
      )}
    </StrictMode>,
  );
});
