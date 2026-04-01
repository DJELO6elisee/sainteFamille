import { useEffect, useRef } from 'react';

export const useIsMounted = () => {
  const isMounted = useRef(true);

  useEffect(() => {
    return () => {
      isMounted.current = false;
    };
  }, []);

  return isMounted;
};

/**
 * Custom hook for async operations with mounted check
 */
export const useAsyncOperation = () => {
  const isMounted = useIsMounted();

  const safeSetState = <T>(setter: (value: T) => void, value: T) => {
    if (isMounted) {
      setter(value);
    }
  };

  return { isMounted, safeSetState };
}; 
