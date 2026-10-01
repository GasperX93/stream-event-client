import { StrictMode } from 'react';
import ReactDOM from 'react-dom/client';
import { HashRouter } from 'react-router';

import { loadRuntimeConfig, selectedTheme } from '@/config/runtimeConfig';
import { applyTheme } from '@/design';
import { ChatUserProvider } from '@/features/chat/User';

import { AppContextProvider as AppProvider } from './AppProvider';
import { ConfigProblem } from './ConfigProblem';
import BaseRouter from './routes';

import '@/design';

const root = ReactDOM.createRoot(document.getElementById('root') as HTMLElement);

void loadRuntimeConfig().then((result) => {
  if (result.ok) {
    applyTheme(selectedTheme(result.config));
  }
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
