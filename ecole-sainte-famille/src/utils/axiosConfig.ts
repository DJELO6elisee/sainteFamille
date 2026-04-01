import axios from 'axios';
import { API_BASE } from '../config/api';

axios.defaults.baseURL = API_BASE;

// Fonction pour réinitialiser le timeout d'inactivité
const resetInactivityTimeout = () => {
  // Émettre un événement personnalisé pour réinitialiser le timeout
  const event = new Event('userActivity');
  document.dispatchEvent(event);
};

// Intercepteur pour les requêtes - réinitialiser le timeout d'inactivité
axios.interceptors.request.use(
  (config) => {
    resetInactivityTimeout();
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Intercepteur pour gérer automatiquement les erreurs d'authentification
axios.interceptors.response.use(
  (response) => {
    resetInactivityTimeout();
    return response;
  },
  (error) => {
    // Vérifier si c'est une erreur d'authentification
    if (error.response?.status === 401) {
      console.log('Erreur 401 détectée, nettoyage des données d\'authentification');
      
      // Nettoyer le localStorage
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      
      // Rediriger vers la page de connexion
      if (window.location.pathname !== '/login' && window.location.pathname !== '/secretary-login') {
        // Déterminer le type de connexion basé sur l'URL actuelle
        if (window.location.pathname.startsWith('/secretary/') || window.location.pathname.startsWith('/teacher/')) {
          window.location.href = '/secretary-login';
        } else {
          window.location.href = '/login';
        }
      }
    }
    
    return Promise.reject(error);
  }
);

export default axios;
