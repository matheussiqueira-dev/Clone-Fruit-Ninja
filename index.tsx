import React from 'react';
import ReactDOM from 'react-dom/client';
import '@fontsource-variable/ibm-plex-sans/wght.css';
import App from './App';
import ErrorBoundary from './components/ErrorBoundary';
import { installGlobalErrorReporting } from './lib/errors';
import './index.css';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

installGlobalErrorReporting();

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>
);
