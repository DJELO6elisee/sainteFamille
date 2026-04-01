import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';

const INACTIVITY_TIMEOUT = 30 * 60 * 1000; // 30 minutes en millisecondes

/**
 * Hook pour gérer le timeout d'inactivité
 * Déconnecte l'utilisateur après 30 minutes d'inactivité
 */
export const useInactivityTimeout = () => {
  const navigate = useNavigate();
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastActivityRef = useRef<number>(Date.now());

  const resetTimeout = () => {
    // Vérifier si l'utilisateur est connecté
    const token = localStorage.getItem('token');
    if (!token || token === 'null' || token === 'undefined') {
      return;
    }

    // Mettre à jour le temps de dernière activité
    lastActivityRef.current = Date.now();

    // Nettoyer le timeout précédent
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Créer un nouveau timeout
    timeoutRef.current = setTimeout(() => {
      const timeSinceLastActivity = Date.now() - lastActivityRef.current;
      
      // Vérifier à nouveau si l'utilisateur est toujours connecté
      const currentToken = localStorage.getItem('token');
      if (!currentToken || currentToken === 'null' || currentToken === 'undefined') {
        return;
      }

      // Si le temps d'inactivité dépasse le timeout, déconnecter
      if (timeSinceLastActivity >= INACTIVITY_TIMEOUT) {
        console.log('Timeout d\'inactivité atteint, déconnexion de l\'utilisateur');
        
        // Nettoyer le localStorage
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        
        // Rediriger vers la page d'accueil
        window.location.href = '/';
      }
    }, INACTIVITY_TIMEOUT);
  };

  const handleActivity = () => {
    resetTimeout();
  };

  useEffect(() => {
    // Vérifier si l'utilisateur est connecté au montage
    const token = localStorage.getItem('token');
    if (!token || token === 'null' || token === 'undefined') {
      return;
    }

    // Initialiser le timeout
    resetTimeout();

    // Événements à écouter pour détecter l'activité
    const events = [
      'mousedown',
      'mousemove',
      'keypress',
      'scroll',
      'touchstart',
      'click',
      'keydown'
    ];

    // Ajouter les écouteurs d'événements
    events.forEach(event => {
      document.addEventListener(event, handleActivity, true);
    });

    // Écouter l'événement personnalisé pour les requêtes API
    document.addEventListener('userActivity', handleActivity);

    // Nettoyer les écouteurs et le timeout au démontage
    return () => {
      events.forEach(event => {
        document.removeEventListener(event, handleActivity, true);
      });
      
      document.removeEventListener('userActivity', handleActivity);
      
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [navigate]);

  return null;
};

export default useInactivityTimeout;

