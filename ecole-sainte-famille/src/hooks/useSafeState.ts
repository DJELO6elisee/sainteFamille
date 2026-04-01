import { useState, useRef, useEffect } from 'react';

/**
 * Hook pour gérer les états de manière sûre et éviter les erreurs DOM
 * Vérifie si le composant est toujours monté avant de mettre à jour l'état
 */
export function useSafeState<T>(initialValue: T) {
  const [state, setState] = useState<T>(initialValue);
  const isMounted = useRef(true);

  useEffect(() => {
    return () => {
      isMounted.current = false;
    };
  }, []);

  const safeSetState = (value: T | ((prev: T) => T)) => {
    if (isMounted.current) {
      setState(value);
    }
  };

  return [state, safeSetState] as const;
}

/**
 * Hook pour gérer les états asynchrones de manière sûre
 */
export function useSafeAsyncState<T>(initialValue: T) {
  const [state, setState] = useState<T>(initialValue);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isMounted = useRef(true);

  useEffect(() => {
    return () => {
      isMounted.current = false;
    };
  }, []);

  const safeSetState = (value: T | ((prev: T) => T)) => {
    if (isMounted.current) {
      setState(value);
    }
  };

  const safeSetLoading = (value: boolean) => {
    if (isMounted.current) {
      setLoading(value);
    }
  };

  const safeSetError = (value: string | null) => {
    if (isMounted.current) {
      setError(value);
    }
  };

  return {
    state,
    setState: safeSetState,
    loading,
    setLoading: safeSetLoading,
    error,
    setError: safeSetError,
    isMounted: () => isMounted.current
  };
} 
