import { StrictMode } from 'react';
import ReactDOM from 'react-dom/client';
import { HashRouter } from 'react-router';

import { loadRuntimeConfig } from '@/config/runtimeConfig';

import { AppContextProvider as AppProvider } from './AppProvider';
import { ConfigProblem } from './ConfigProblem';
import BaseRouter from './routes';

import '@/app/styles/globals.scss';

const root = ReactDOM.createRoot(document.getElementById('root') as HTMLElement);

void loadRuntimeConfig().then((result) => {
  root.render(
    <StrictMode>
      {result.ok ? (
        <AppProvider config={result.config}>
          <HashRouter>
            <BaseRouter />
          </HashRouter>
        </AppProvider>
      ) : (
        <ConfigProblem result={result} />
      )}
    </StrictMode>,
  );
});
