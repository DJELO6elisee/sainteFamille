import React from 'react';

/**
 * Comprehensive ResizeObserver error handling utilities
 * This file provides utilities to suppress and handle ResizeObserver errors
 */

const RESIZE_OBSERVER_ERRORS = [
  'ResizeObserver loop completed with undelivered notifications.',
  'ResizeObserver loop limit exceeded',
  'ResizeObserver loop'
];

/**
 * Check if an error message is a ResizeObserver error
 */
export const isResizeObserverError = (message: string): boolean => {
  return RESIZE_OBSERVER_ERRORS.some(error => message.includes(error));
};

/**
 * Suppress ResizeObserver errors globally
 */
export const suppressResizeObserverErrors = () => {
  // Suppress console.error
  const originalConsoleError = console.error;
  console.error = (...args: any[]) => {
    const errorMessage = args.join(' ');
    if (isResizeObserverError(errorMessage)) {
      return;
    }
    originalConsoleError.apply(console, args);
  };

  // Suppress window.onerror
  const originalWindowError = window.onerror;
  window.onerror = function(message: string | Event, source?: string, lineno?: number, colno?: number, error?: Error): boolean {
    if (message && typeof message === 'string' && isResizeObserverError(message)) {
      return true; // Prevent error display
    }
    if (originalWindowError) {
      return originalWindowError.call(this, message, source, lineno, colno, error);
    }
    return false;
  };

  // Suppress unhandledrejection
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

  // Return cleanup function
  return () => {
    console.error = originalConsoleError;
    window.onerror = originalWindowError;
    window.onunhandledrejection = originalUnhandledRejection;
  };
};

/**
 * Create a safe ResizeObserver wrapper
 */
export const createSafeResizeObserver = (callback: ResizeObserverCallback): ResizeObserver => {
  if (typeof ResizeObserver === 'undefined') {
    // Fallback for environments without ResizeObserver
    return {
      observe: () => {},
      unobserve: () => {},
      disconnect: () => {}
    } as any;
  }

  const safeCallback: ResizeObserverCallback = (entries, observer) => {
    try {
      callback(entries, observer);
    } catch (error) {
      // Silently handle ResizeObserver errors
      if (error && typeof error === 'string' && isResizeObserverError(error)) {
        return;
      }
      // Re-throw non-ResizeObserver errors
      throw error;
    }
  };

  return new ResizeObserver(safeCallback);
};

/**
 * Hook to use safe ResizeObserver
 */
export const useSafeResizeObserver = (callback: ResizeObserverCallback, deps: React.DependencyList = []) => {
  return React.useMemo(() => createSafeResizeObserver(callback), deps);
};
