import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { AppProvider } from './data/store';
import App from './App';
import '@fontsource-variable/lexend';
import './styles/app.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AppProvider>
      <App />
    </AppProvider>
  </StrictMode>,
);
