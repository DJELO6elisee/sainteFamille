/**
 * Utilitaires pour la gestion des dates sans problème de timezone
 * Ces fonctions garantissent que les dates sont affichées de manière cohérente
 * peu importe le fuseau horaire de l'ordinateur
 */

/**
 * Formate une date pour l'API (format YYYY-MM-DD) sans problème de timezone
 * @param date - Date à formater
 * @returns String au format YYYY-MM-DD ou chaîne vide si date est null
 */
export const formatDateForAPI = (date: Date | null): string => {
  if (!date) return '';
  
  // Utiliser les méthodes getFullYear, getMonth, getDate pour éviter les problèmes de timezone
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0'); // getMonth() retourne 0-11
  const day = String(date.getDate()).padStart(2, '0');
  
  return `${year}-${month}-${day}`;
};

/**
 * Parse une date string en objet Date sans problème de timezone
 * @param dateString - Chaîne de date à parser
 * @returns Date ou null si conversion impossible
 */
export const parseDateSafe = (dateString: string): Date | null => {
  if (!dateString) return null;
  
  try {
    // Si c'est au format YYYY-MM-DD, créer la date directement
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
      const [year, month, day] = dateString.split('-');
      // Créer la date en utilisant le constructeur local pour éviter les décalages
      return new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    }
    
    // Si c'est au format DD/MM/YYYY, le convertir
    if (/^\d{2}\/\d{2}\/\d{4}$/.test(dateString)) {
      const [day, month, year] = dateString.split('/');
      return new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    }
    
    // Fallback: parser normalement
    const date = new Date(dateString);
    return isNaN(date.getTime()) ? null : date;
  } catch (error) {
    console.error('Erreur lors de la conversion de la date:', error);
    return null;
  }
};

/**
 * Formate une date pour l'affichage (format DD/MM/YYYY) sans problème de timezone
 * @param dateString - Chaîne de date à formater
 * @returns String au format DD/MM/YYYY ou 'N/A' si date invalide
 */
export const formatDateForDisplay = (dateString: string | null | undefined): string => {
  if (!dateString) return 'N/A';
  
  try {
    // Si c'est déjà au format YYYY-MM-DD, le formater directement
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
      const [year, month, day] = dateString.split('-');
      return `${day}/${month}/${year}`;
    }
    
    // Si c'est une date ISO avec timezone, extraire seulement la partie date
    if (dateString.includes('T')) {
      const datePart = dateString.split('T')[0];
      if (/^\d{4}-\d{2}-\d{2}$/.test(datePart)) {
        const [year, month, day] = datePart.split('-');
        return `${day}/${month}/${year}`;
      }
    }
    
    // Sinon, créer une date et utiliser les méthodes locales
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return 'N/A';
    
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    
    return `${day}/${month}/${year}`;
  } catch (error) {
    console.error('Erreur lors du formatage de la date:', error);
    return 'N/A';
  }
};

/**
 * Formate une date pour l'affichage avec formatage français (format DD MMMM YYYY)
 * @param dateString - Chaîne de date à formater
 * @param format - Fonction de formatage (ex: format de date-fns)
 * @param locale - Locale pour le formatage
 * @returns String formatée ou 'N/A' si date invalide
 */
export const formatDateForDisplayWithLocale = (
  dateString: string | null | undefined,
  format: (date: Date, formatStr: string, options?: { locale: any }) => string,
  locale: any
): string => {
  if (!dateString) return 'N/A';
  
  try {
    let date: Date;
    
    // Si c'est déjà au format YYYY-MM-DD, créer la date directement
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
      const [year, month, day] = dateString.split('-');
      date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    }
    // Si c'est une date ISO avec timezone, extraire seulement la partie date
    else if (dateString.includes('T')) {
      const datePart = dateString.split('T')[0];
      if (/^\d{4}-\d{2}-\d{2}$/.test(datePart)) {
        const [year, month, day] = datePart.split('-');
        date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
      } else {
        date = new Date(dateString);
      }
    }
    // Sinon, créer une date normalement
    else {
      date = new Date(dateString);
    }
    
    if (isNaN(date.getTime())) return 'N/A';
    
    return format(date, 'dd MMMM yyyy', { locale });
  } catch (error) {
    console.error('Erreur lors du formatage de la date:', error);
    return 'N/A';
  }
};


/**
 * Formate une date pour l'affichage dans un reçu (format DD/MM/YYYY)
 * Version inline pour éviter les imports dans les composants
 * @param dateString - Chaîne de date à formater
 * @returns String au format DD/MM/YYYY ou 'N/A' si date invalide
 */
export const formatDateForReceipt = (dateString: string | null | undefined): string => {
  if (!dateString) return 'N/A';
  
  try {
    // Si c'est déjà au format DD/MM/YYYY (format du backend), le retourner tel quel
    if (/^\d{2}\/\d{2}\/\d{4}$/.test(dateString)) {
      return dateString;
    }
    
    // Si c'est déjà au format YYYY-MM-DD, le formater directement
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
      const [year, month, day] = dateString.split('-');
      return `${day}/${month}/${year}`;
    }
    
    // Si c'est une date ISO avec timezone, extraire seulement la partie date
    if (dateString.includes('T')) {
      const datePart = dateString.split('T')[0];
      if (/^\d{4}-\d{2}-\d{2}$/.test(datePart)) {
        const [year, month, day] = datePart.split('-');
        return `${day}/${month}/${year}`;
      }
    }
    
    // Sinon, créer une date et utiliser les méthodes locales
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return 'N/A';
    
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    
    return `${day}/${month}/${year}`;
  } catch (error) {
    console.error('Erreur lors du formatage de la date:', error);
    return 'N/A';
  }
};

/**
 * Formate une date pour les champs input de type date (format YYYY-MM-DD)
 * Gère le format DD/MM/YYYY du backend et les autres formats
 * @param dateString - Chaîne de date à formater
 * @returns String au format YYYY-MM-DD ou chaîne vide si date invalide
 */
export const formatDateForInput = (dateString: string | null | undefined): string => {
  if (!dateString) return '';
  
  try {
    // Si c'est déjà au format YYYY-MM-DD, le retourner tel quel
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
      return dateString;
    }
    
    // Si c'est au format DD/MM/YYYY (format du backend)
    if (/^\d{2}\/\d{2}\/\d{4}$/.test(dateString)) {
      const [day, month, year] = dateString.split('/');
      return `${year}-${month}-${day}`;
    }
    
    // Créer un objet Date à partir de la chaîne
    const date = new Date(dateString);
    
    // Vérifier si la date est valide
    if (isNaN(date.getTime())) {
      return '';
    }
    
    // Si la date contient 'T' et se termine par 'Z', c'est probablement en UTC
    if (dateString.includes('T') && dateString.endsWith('Z')) {
      const isoDate = dateString.split('T')[0];
      
      // Vérifier si on a un décalage d'un jour en comparant avec la date locale
      const localYear = date.getFullYear();
      const localMonth = String(date.getMonth() + 1).padStart(2, '0');
      const localDay = String(date.getDate()).padStart(2, '0');
      const localDateStr = `${localYear}-${localMonth}-${localDay}`;
      
      // Si les dates diffèrent, utiliser la date locale pour éviter le décalage
      if (isoDate !== localDateStr) {
        return localDateStr;
      }
      
      return isoDate;
    }
    
    // Sinon, utiliser les méthodes getFullYear, getMonth, getDate
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    
    return `${year}-${month}-${day}`;
  } catch (error) {
    console.error('Erreur lors du formatage de la date:', error);
    return '';
  }
};

/**
 * Convertit une date DD/MM/YYYY en objet Date
 * @param dateString - Chaîne de date au format DD/MM/YYYY
 * @returns Date ou null si conversion impossible
 */
export const convertDDMMYYYYToDate = (dateString: string): Date | null => {
  return parseDateSafe(dateString);
};
