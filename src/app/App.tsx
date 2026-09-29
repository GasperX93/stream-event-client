import { StrictMode } from 'react';
import ReactDOM from 'react-dom/client';
import { HashRouter } from 'react-router';

import { AppContextProvider as AppProvider } from './AppProvider';
import BaseRouter from './routes';

import '@/app/styles/globals.scss';

const root = ReactDOM.createRoot(document.getElementById('root') as HTMLElement);

root.render(
  <StrictMode>
    <AppProvider>
      <HashRouter>
        <BaseRouter />
      </HashRouter>
    </AppProvider>
  </StrictMode>,
);
