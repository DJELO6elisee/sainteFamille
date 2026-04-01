/**
 * Utility to help identify useEffect hooks that need cleanup
 * This script can be run to find all useEffect hooks without proper cleanup
 */

export const findUseEffectWithoutCleanup = (code: string): string[] => {
  const lines = code.split('\n');
  const issues: string[] = [];
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.includes('useEffect(') && !line.includes('return () =>')) {
      // Check if there's a cleanup function in the next few lines
      let hasCleanup = false;
      for (let j = i + 1; j < Math.min(i + 20, lines.length); j++) {
        if (lines[j].includes('return () =>')) {
          hasCleanup = true;
          break;
        }
        if (lines[j].includes('}, [')) break; // End of useEffect
      }
      
      if (!hasCleanup) {
        issues.push(`Line ${i + 1}: ${line.trim()}`);
      }
    }
  }
  
  return issues;
};

/**
 * Template for fixing useEffect hooks
 */
export const useEffectFixTemplate = `
useEffect(() => {
  let isMounted = true;
  
  const asyncOperation = async () => {
    if (!isMounted) return;
    // ... your async code here
    if (isMounted) {
      setState(data);
    }
  };
  
  asyncOperation();
  
  return () => {
    isMounted = false;
  };
}, [dependencies]);
`;

/**
 * Common patterns that need fixing
 */
export const commonPatterns = {
  // Pattern 1: Simple useEffect with async operation
  simpleAsync: {
    before: `useEffect(() => {
  const fetchData = async () => {
    const data = await api.getData();
    setData(data);
  };
  fetchData();
}, []);`,
    after: `useEffect(() => {
  let isMounted = true;
  
  const fetchData = async () => {
    if (!isMounted) return;
    const data = await api.getData();
    if (isMounted) {
      setData(data);
    }
  };
  fetchData();
  
  return () => {
    isMounted = false;
  };
}, []);`
  },
  
  // Pattern 2: useEffect with multiple async operations
  multipleAsync: {
    before: `useEffect(() => {
  const fetchData = async () => {
    const userData = await api.getUser();
    const settings = await api.getSettings();
    setUser(userData);
    setSettings(settings);
  };
  fetchData();
}, []);`,
    after: `useEffect(() => {
  let isMounted = true;
  
  const fetchData = async () => {
    if (!isMounted) return;
    const userData = await api.getUser();
    if (!isMounted) return;
    const settings = await api.getSettings();
    if (isMounted) {
      setUser(userData);
      setSettings(settings);
    }
  };
  fetchData();
  
  return () => {
    isMounted = false;
  };
}, []);`
  }
}; 
