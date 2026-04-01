import React, { useEffect } from 'react';
import { useResizeObserverFix } from '../hooks/useResizeObserverFix';

interface ResizeObserverWrapperProps {
  children: React.ReactNode;
}

const ResizeObserverWrapper: React.FC<ResizeObserverWrapperProps> = ({ children }) => {
  useResizeObserverFix();

  // Additional global error handling for ResizeObserver
  useEffect(() => {
    // Handle any remaining ResizeObserver errors that might slip through
    const handleError = (event: ErrorEvent) => {
      if (event.message && event.message.includes('ResizeObserver')) {
        event.preventDefault();
        return false;
      }
    };

    // Handle unhandled promise rejections
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      if (event.reason && typeof event.reason === 'string' && event.reason.includes('ResizeObserver')) {
        event.preventDefault();
      }
    };

    window.addEventListener('error', handleError);
    window.addEventListener('unhandledrejection', handleUnhandledRejection);

    return () => {
      window.removeEventListener('error', handleError);
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
    };
  }, []);

  return <>{children}</>;
};

export default ResizeObserverWrapper;
