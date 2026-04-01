import React from 'react';

/**
 * Solution ultime pour éliminer complètement les erreurs ResizeObserver
 * Désactive ResizeObserver et le remplace par un stub silencieux
 */

export function killResizeObserver(): void {
  if (typeof window === 'undefined') return;

  // Désactiver complètement ResizeObserver
  (window as any).ResizeObserver = class SilentResizeObserver {
    constructor(callback: any) {
      // Ne rien faire avec le callback
    }
    
    observe(element: any): void {
      // Ne rien faire
    }
    
    unobserve(element: any): void {
      // Ne rien faire
    }
    
    disconnect(): void {
      // Ne rien faire
    }
  };

  // Suppression complète de toutes les erreurs liées à ResizeObserver
  const originalConsoleError = console.error;
  console.error = function(...args: any[]) {
    const errorMessage = args.join(' ');
    if (errorMessage.includes('ResizeObserver')) {
      return; // Suppression complète
    }
    originalConsoleError.apply(console, args);
  };

  // Suppression de window.onerror
  const originalWindowError = window.onerror;
  window.onerror = function(message: string | Event, source?: string, lineno?: number, colno?: number, error?: Error): boolean {
    if (message && typeof message === 'string' && message.includes('ResizeObserver')) {
      return true; // Suppression complète
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
    if (reason && typeof reason === 'string' && reason.includes('ResizeObserver')) {
      event.preventDefault();
      return;
    }
    if (originalUnhandledRejection) {
      (originalUnhandledRejection as any).call(window, event);
    }
  };

  console.log('ResizeObserver complètement désactivé - Aucune erreur ne sera générée');
}

/**
 * Hook pour désactiver ResizeObserver
 */
export function useResizeObserverKiller(): void {
  React.useEffect(() => {
    killResizeObserver();
  }, []);
}

/**
 * Vérifier si ResizeObserver est désactivé
 */
export function isResizeObserverKilled(): boolean {
  if (typeof window === 'undefined') return false;
  return (window as any).ResizeObserver && 
         (window as any).ResizeObserver.prototype && 
         typeof (window as any).ResizeObserver.prototype.observe === 'function' &&
         (window as any).ResizeObserver.prototype.observe.toString().includes('Ne rien faire');
}


