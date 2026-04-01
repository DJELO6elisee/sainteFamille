import React, { useEffect } from 'react';
import { killResizeObserver } from '../utils/resizeObserverKiller';

interface SecretaryLoginWrapperProps {
  children: React.ReactNode;
}

/**
 * Wrapper spécifique pour la page SecretaryLogin qui applique une suppression agressive
 * des erreurs ResizeObserver dès le montage du composant
 */
const SecretaryLoginWrapper: React.FC<SecretaryLoginWrapperProps> = ({ children }) => {
  useEffect(() => {
    // Suppression immédiate et agressive des erreurs ResizeObserver
    const resizeObserverErrors = [
      'ResizeObserver loop completed with undelivered notifications.',
      'ResizeObserver loop limit exceeded',
      'ResizeObserver loop'
    ];

    // Fonction pour vérifier si c'est une erreur ResizeObserver
    const isResizeObserverError = (message: string): boolean => {
      return resizeObserverErrors.some(error => message.includes(error));
    };

    // Suppression complète de console.error
    const originalConsoleError = console.error;
    console.error = function(...args: any[]) {
      const errorMessage = args.join(' ');
      if (isResizeObserverError(errorMessage)) {
        return; // Suppression complète
      }
      originalConsoleError.apply(console, args);
    };

    // Suppression complète de window.onerror
    const originalWindowError = window.onerror;
    window.onerror = function(message: string | Event, source?: string, lineno?: number, colno?: number, error?: Error): boolean {
      if (message && typeof message === 'string' && isResizeObserverError(message)) {
        return true; // Suppression complète
      }
      if (originalWindowError) {
        return originalWindowError.call(this, message, source, lineno, colno, error);
      }
      return false;
    };

    // Suppression complète de unhandledrejection
    const originalUnhandledRejection = window.onunhandledrejection;
    window.onunhandledrejection = function(event) {
      const reason = event.reason;
      if (reason && typeof reason === 'string' && isResizeObserverError(reason)) {
        event.preventDefault();
        return; // Suppression complète
      }
      if (originalUnhandledRejection) {
        (originalUnhandledRejection as any).call(window, event);
      }
    };

         // Suppression des erreurs d'événements
     const originalAddEventListener = EventTarget.prototype.addEventListener;
     EventTarget.prototype.addEventListener = function(this: EventTarget, type: string, listener: EventListener, options?: boolean | AddEventListenerOptions) {
       if (type === 'error') {
         const wrappedListener = function(this: EventTarget, event: Event) {
           const target = event.target as any;
           if (target && target.error && typeof target.error === 'string') {
             if (isResizeObserverError(target.error)) {
               return; // Suppression complète
             }
           }
           try {
             listener.call(this, event);
           } catch (error: any) {
             if (isResizeObserverError(error.message || error)) {
               return; // Suppression complète
             }
             throw error;
           }
         };
         return originalAddEventListener.call(this, type, wrappedListener as EventListener, options);
       }
       return originalAddEventListener.call(this, type, listener, options);
     };

    // Application de la solution ultime
    killResizeObserver();

    console.log('Suppression agressive des erreurs ResizeObserver appliquée pour SecretaryLogin');

    // Cleanup function
    return () => {
      console.error = originalConsoleError;
      window.onerror = originalWindowError;
      window.onunhandledrejection = originalUnhandledRejection;
      EventTarget.prototype.addEventListener = originalAddEventListener;
    };
  }, []);

  return <>{children}</>;
};

export default SecretaryLoginWrapper;
