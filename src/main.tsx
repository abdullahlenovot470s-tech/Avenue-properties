import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import { applyTheme } from './theme/applyTheme';
import { ErrorBoundary, ErrorFallbackPage } from './components/common/ErrorBoundary';
import './index.css';

const rootElement = document.getElementById('root');

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
