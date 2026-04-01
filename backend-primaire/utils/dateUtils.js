/**
 * Utilitaires pour la gestion des dates sans problème de timezone
 * Ces fonctions garantissent que les dates sont affichées de manière cohérente
 * peu importe le fuseau horaire du serveur
 */

/**
 * Formate une date pour l'affichage (format DD/MM/YYYY) sans problème de timezone
 * @param {string|null|undefined} dateString - Chaîne de date à formater
 * @returns {string} String au format DD/MM/YYYY ou 'N/A' si date invalide
 */
const formatDateForDisplay = (dateString) => {
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
 * Formate une date pour l'affichage dans un template HTML
 * Version spéciale pour les templates avec gestion d'erreur
 * @param {string|null|undefined} dateString - Chaîne de date à formater
 * @param {string} fallback - Texte de remplacement si date invalide
 * @returns {string} String formatée ou fallback si date invalide
 */
const formatDateForTemplate = (dateString, fallback = 'Non renseignée') => {
    if (!dateString) return fallback;

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
        if (isNaN(date.getTime())) return fallback;

        const day = String(date.getDate()).padStart(2, '0');
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const year = date.getFullYear();

        return `${day}/${month}/${year}`;
    } catch (error) {
        console.error('Erreur lors du formatage de la date:', error);
        return fallback;
    }
};

/**
 * Formate une date pour l'API (format YYYY-MM-DD) sans problème de timezone
 * @param {Date|null} date - Date à formater
 * @returns {string} String au format YYYY-MM-DD ou chaîne vide si date est null
 */
const formatDateForAPI = (date) => {
    if (!date) return '';

    // Utiliser les méthodes getFullYear, getMonth, getDate pour éviter les problèmes de timezone
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0'); // getMonth() retourne 0-11
    const day = String(date.getDate()).padStart(2, '0');

    return `${year}-${month}-${day}`;
};

/**
 * Parse une date string en objet Date sans problème de timezone
 * @param {string} dateString - Chaîne de date à parser
 * @returns {Date|null} Date parsée ou null si invalide
 */
const parseDateSafe = (dateString) => {
    if (!dateString) return null;

    try {
        // Si c'est au format YYYY-MM-DD, créer la date directement
        if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
            const [year, month, day] = dateString.split('-');
            // Créer la date en UTC puis la convertir en local pour éviter les décalages
            return new Date(Date.UTC(parseInt(year), parseInt(month) - 1, parseInt(day)));
        }

        // Si c'est au format DD/MM/YYYY, le convertir
        if (/^\d{2}\/\d{2}\/\d{4}$/.test(dateString)) {
            const [day, month, year] = dateString.split('/');
            return new Date(Date.UTC(parseInt(year), parseInt(month) - 1, parseInt(day)));
        }

        // Fallback: parser normalement
        const date = new Date(dateString);
        return isNaN(date.getTime()) ? null : date;
    } catch (error) {
        console.error('Erreur lors du parsing de la date:', error);
        return null;
    }
};

module.exports = {
    formatDateForDisplay,
    formatDateForTemplate,
    formatDateForAPI,
    parseDateSafe
};