/**
 * URL de base de l'API (même domaine que le frontend : https://saintefamilleexcellence.ci).
 * - Par défaut : même origine → appels relatifs /api/... (pas de CORS).
 * - Définir REACT_APP_API_BASE_URL pour surcharger (ex: en dev).
 */
export const API_BASE = process.env.REACT_APP_API_BASE_URL ?? 'https://saintefamilleexcellence.ci';
