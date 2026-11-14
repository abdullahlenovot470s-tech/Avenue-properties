import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import { applyTheme } from './theme/applyTheme';
import './index.css';

applyTheme();

createRoot(document.getElementById('root')!).render(<App />);
