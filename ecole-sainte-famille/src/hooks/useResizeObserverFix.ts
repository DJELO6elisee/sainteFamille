import { useEffect } from 'react';
import { createSafeResizeObserver } from '../utils/resizeObserverUtils';

export const useResizeObserverFix = () => {
  useEffect(() => {
    // Override ResizeObserver constructor to add error handling
    if (typeof ResizeObserver !== 'undefined') {
      const OriginalResizeObserver = ResizeObserver;
      (window as any).OriginalResizeObserver = OriginalResizeObserver;
      
      (window as any).ResizeObserver = class SafeResizeObserver extends OriginalResizeObserver {
        constructor(callback: ResizeObserverCallback) {
          const safeCallback: ResizeObserverCallback = (entries, observer) => {
            try {
              callback(entries, observer);
            } catch (error) {
              // Silently handle ResizeObserver errors
              if (error && typeof error === 'string' && error.includes('ResizeObserver')) {
                return;
              }
              // Re-throw non-ResizeObserver errors
              throw error;
            }
          };
          super(safeCallback);
        }
      };
    }

    // Cleanup function
    return () => {
      // Restore original ResizeObserver
      if (typeof ResizeObserver !== 'undefined' && (window as any).OriginalResizeObserver) {
        (window as any).ResizeObserver = (window as any).OriginalResizeObserver;
      }
    };
  }, []);
};
