import { createRoot } from 'react-dom/client';
import '@fontsource/manrope/latin-300.css';
import '@fontsource/manrope/latin-400.css';
import '@fontsource/manrope/latin-500.css';
import '@fontsource/manrope/latin-600.css';
import '@fontsource/unbounded/latin-500.css';
import '@fontsource/unbounded/latin-600.css';
import '@fontsource/unbounded/latin-700.css';
import '@fontsource/unbounded/latin-800.css';
import '@fontsource/unbounded/latin-900.css';
import App from './App.tsx';
import { applyTheme } from './theme/applyTheme';
import { ErrorBoundary, ErrorFallbackPage } from './components/common/ErrorBoundary';
import './index.css';

const rootElement = document.getElementById('root');

if (typeof window !== 'undefined' && window.location.hash.startsWith('#/')) {
  const targetPath = window.location.hash.slice(1);
  const normalizedPath = targetPath.startsWith('/') ? targetPath : `/${targetPath}`;
  window.history.replaceState(null, '', normalizedPath);
}

if (rootElement) {
  const root = createRoot(rootElement);
  try {
    applyTheme();
    root.render(
      <ErrorBoundary fullViewport>
        <App />
      </ErrorBoundary>
    );
  } catch (err) {
    root.render(
      <ErrorFallbackPage error={err instanceof Error ? err : new Error(String(err))} fullViewport />
    );
  }
}
