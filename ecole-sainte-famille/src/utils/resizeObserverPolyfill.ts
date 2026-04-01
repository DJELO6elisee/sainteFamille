import React from 'react';

/**
 * Polyfill ResizeObserver robuste pour éviter les erreurs
 * Cette implémentation utilise requestAnimationFrame pour éviter les boucles infinies
 */

interface ResizeObserverEntry {
  target: Element;
  contentRect: DOMRectReadOnly;
  borderBoxSize: ReadonlyArray<ResizeObserverSize>;
  contentBoxSize: ReadonlyArray<ResizeObserverSize>;
  devicePixelContentBoxSize: ReadonlyArray<ResizeObserverSize>;
}

interface ResizeObserverSize {
  blockSize: number;
  inlineSize: number;
}

type ResizeObserverCallback = (entries: ResizeObserverEntry[], observer: ResizeObserver) => void;

class SafeResizeObserver {
  private callback: ResizeObserverCallback;
  private elements: Map<Element, { width: number; height: number }>;
  private animationFrameId: number | null = null;

  constructor(callback: ResizeObserverCallback) {
    this.callback = callback;
    this.elements = new Map();
  }

  observe(element: Element): void {
    if (!this.elements.has(element)) {
      const rect = element.getBoundingClientRect();
      this.elements.set(element, { width: rect.width, height: rect.height });
      this.scheduleCallback();
    }
  }

  unobserve(element: Element): void {
    this.elements.delete(element);
    if (this.elements.size === 0 && this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }

  disconnect(): void {
    this.elements.clear();
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }

  private scheduleCallback(): void {
    if (this.animationFrameId) return;

    this.animationFrameId = requestAnimationFrame(() => {
      this.animationFrameId = null;
      this.checkResizes();
    });
  }

  private checkResizes(): void {
    const entries: ResizeObserverEntry[] = [];

    for (const [element, previousSize] of this.elements) {
      const rect = element.getBoundingClientRect();
      const currentSize = { width: rect.width, height: rect.height };

      if (currentSize.width !== previousSize.width || currentSize.height !== previousSize.height) {
        // Mettre à jour la taille stockée
        this.elements.set(element, currentSize);

        // Créer une entrée ResizeObserver
        const entry: ResizeObserverEntry = {
          target: element,
          contentRect: rect,
          borderBoxSize: [{ blockSize: rect.height, inlineSize: rect.width }],
          contentBoxSize: [{ blockSize: rect.height, inlineSize: rect.width }],
          devicePixelContentBoxSize: [{ blockSize: rect.height, inlineSize: rect.width }]
        };

        entries.push(entry);
      }
    }

    if (entries.length > 0) {
      try {
        this.callback(entries, this);
      } catch (error) {
        // Gestion silencieuse des erreurs dans le callback
        console.warn('Erreur dans le callback ResizeObserver:', error);
      }
    }

    // Programmer la prochaine vérification si il y a encore des éléments observés
    if (this.elements.size > 0) {
      this.scheduleCallback();
    }
  }
}

/**
 * Applique le polyfill ResizeObserver si nécessaire
 */
export function applyResizeObserverPolyfill(): void {
  if (typeof window === 'undefined') return;

  // Vérifier si ResizeObserver existe et fonctionne correctement
  if (typeof ResizeObserver === 'undefined' || !ResizeObserver.prototype) {
    (window as any).ResizeObserver = SafeResizeObserver;
    console.log('Polyfill ResizeObserver appliqué');
    return;
  }

  // Si ResizeObserver existe, créer une version sécurisée
  const OriginalResizeObserver = ResizeObserver;
  
  (window as any).ResizeObserver = class SecureResizeObserver extends OriginalResizeObserver {
    constructor(callback: ResizeObserverCallback) {
      const secureCallback: ResizeObserverCallback = (entries, observer) => {
        try {
          callback(entries, observer);
        } catch (error) {
          // Gestion silencieuse des erreurs ResizeObserver
          if (error && typeof error === 'string' && error.includes('ResizeObserver')) {
            return;
          }
          // Re-lancer les erreurs non-ResizeObserver
          throw error;
        }
      };
      super(secureCallback);
    }
  };

  console.log('Version sécurisée de ResizeObserver appliquée');
}

/**
 * Hook pour utiliser le polyfill ResizeObserver
 */
export function useResizeObserverPolyfill(): void {
  React.useEffect(() => {
    applyResizeObserverPolyfill();
  }, []);
}
