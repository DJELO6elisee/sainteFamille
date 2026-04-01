/**
 * Safely removes a child node from its parent
 * Prevents the "Failed to execute 'removeChild' on 'Node'" error
 */
export const safeRemoveChild = (parent: Node, child: Node): boolean => {
  try {
    if (parent && child && parent.contains(child)) {
      parent.removeChild(child);
      return true;
    }
    return false;
  } catch (error) {
    console.warn('Safe removeChild failed:', error);
    return false;
  }
};

/**
 * Safely removes an element by its ID
 */
export const safeRemoveElementById = (id: string): boolean => {
  try {
    const element = document.getElementById(id);
    if (element && element.parentNode) {
      return safeRemoveChild(element.parentNode, element);
    }
    return false;
  } catch (error) {
    console.warn('Safe removeElementById failed:', error);
    return false;
  }
};

/**
 * Checks if a DOM element is still attached to the document
 */
export const isElementAttached = (element: Element | null): boolean => {
  try {
    return element !== null && document.contains(element);
  } catch (error) {
    return false;
  }
};

/**
 * Safely executes a function only if the component is still mounted
 */
export const createSafeCallback = <T extends (...args: any[]) => any>(
  callback: T,
  isMounted: () => boolean
): T => {
  return ((...args: Parameters<T>) => {
    if (isMounted()) {
      return callback(...args);
    }
  }) as T;
};

/**
 * Debounce function to prevent rapid state updates
 */
export const debounce = <T extends (...args: any[]) => any>(
  func: T,
  wait: number
): ((...args: Parameters<T>) => void) => {
  let timeout: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}; 
