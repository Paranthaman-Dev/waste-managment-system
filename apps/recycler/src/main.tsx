import React from 'react';
import ReactDOM from 'react-dom/client';
import 'leaflet/dist/leaflet.css';
import '@wm/shared/styles.css';
import { RootProviders } from '@wm/shared/providers';
import { RecyclerApp } from './App';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <RootProviders>
      <RecyclerApp />
    </RootProviders>
  </React.StrictMode>,
);
