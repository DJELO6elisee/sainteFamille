import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import reportWebVitals from './reportWebVitals';
import { suppressResizeObserverErrors } from './utils/resizeObserverUtils';
import { applyResizeObserverPolyfill } from './utils/resizeObserverPolyfill';
import { killResizeObserver } from './utils/resizeObserverKiller';

// Suppression immédiate et robuste des erreurs ResizeObserver
(function() {
  const resizeObserverErrors = [
    'ResizeObserver loop completed with undelivered notifications.',
    'ResizeObserver loop limit exceeded',
    'ResizeObserver loop'
  ];

  function isResizeObserverError(message: string): boolean {
    return resizeObserverErrors.some(error => message.includes(error));
  }

  // Suppression de console.error
  const originalConsoleError = console.error;
  console.error = function(...args: any[]) {
    const errorMessage = args.join(' ');
    if (isResizeObserverError(errorMessage)) {
      return;
    }
    originalConsoleError.apply(console, args);
  };

  // Suppression de window.onerror
  const originalWindowError = window.onerror;
  window.onerror = function(message: string | Event, source?: string, lineno?: number, colno?: number, error?: Error): boolean {
    if (message && typeof message === 'string' && isResizeObserverError(message)) {
      return true; // Empêche l'affichage de l'erreur
    }
    if (originalWindowError) {
      return originalWindowError.call(this, message, source, lineno, colno, error);
    }
    return false;
  };

  // Suppression de unhandledrejection
  const originalUnhandledRejection = window.onunhandledrejection;
  window.onunhandledrejection = function(event) {
    const reason = event.reason;
    if (reason && typeof reason === 'string' && isResizeObserverError(reason)) {
      event.preventDefault();
      return;
    }
    if (originalUnhandledRejection) {
      (originalUnhandledRejection as any).call(window, event);
    }
  };

  // Override du constructeur ResizeObserver avec gestion d'erreur robuste
  if (typeof ResizeObserver !== 'undefined') {
    const OriginalResizeObserver = ResizeObserver;
    (window as any).OriginalResizeObserver = OriginalResizeObserver;
    
    (window as any).ResizeObserver = class SafeResizeObserver extends OriginalResizeObserver {
      constructor(callback: ResizeObserverCallback) {
        const safeCallback: ResizeObserverCallback = (entries, observer) => {
          try {
            callback(entries, observer);
          } catch (error) {
            // Gestion silencieuse des erreurs ResizeObserver
            if (error && typeof error === 'string' && isResizeObserverError(error)) {
              return;
            }
            // Re-lancer les erreurs non-ResizeObserver
            throw error;
          }
        };
        super(safeCallback);
      }
    };
  }

  console.log('ResizeObserver error suppression applied successfully');
})();

// Application du polyfill ResizeObserver sécurisé
applyResizeObserverPolyfill();

// Application de la suppression via l'utilitaire (pour la compatibilité)
suppressResizeObserverErrors();

// Solution ultime : désactivation complète de ResizeObserver si les erreurs persistent
setTimeout(() => {
  // Vérifier si des erreurs ResizeObserver se produisent encore
  const errorCount = (window as any).__resizeObserverErrorCount || 0;
  if (errorCount > 0) {
    console.log('Erreurs ResizeObserver détectées, application de la solution ultime...');
    killResizeObserver();
  }
}, 3000);

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
