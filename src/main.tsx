import {createRoot} from 'react-dom/client';
import {registerSW} from 'virtual:pwa-register';
import App from './App.tsx';
import './hooks/usePWAInstall';
import './index.css';

if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
  try {
    registerSW({immediate: true});
  } catch {
    // Ignore SW registration errors in restricted preview frames
  }
}

createRoot(document.getElementById('root')!).render(<App />);
