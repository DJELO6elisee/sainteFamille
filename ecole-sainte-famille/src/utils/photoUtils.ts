/**
 * Utilitaires pour la gestion des photos des élèves
 */

export interface PhotoConfig {
  type: 'student' | 'garderie' | 'media';
  filename: string;
  fallback?: string;
}

/**
 * Génère l'URL correcte pour une photo selon son type
 */
export const getPhotoUrl = (config: PhotoConfig): string => {
  const { type, filename, fallback } = config;
  
  if (!filename) {
    return fallback || '/icons/default-avatar.webp';
  }

  // Si c'est déjà une URL complète, la retourner
  if (filename.startsWith('http://') || filename.startsWith('https://')) {
    return filename;
  }

  // Si c'est un blob URL, la retourner
  if (filename.startsWith('blob:')) {
    return filename;
  }

  const baseUrl = 'https://saintefamilleexcellence.ci';

  switch (type) {
    case 'student':
      return `${baseUrl}/api/students/photo/${filename}`;
    
    case 'garderie':
      return `${baseUrl}/api/garderie/photo/${filename}`;
    
    case 'media':
      return `${baseUrl}/api/media/${filename}`;
    
    default:
      return fallback || '/icons/default-avatar.webp';
  }
};

/**
 * Fonction pour tester l'accès à une photo
 */
export const testPhotoAccess = async (config: PhotoConfig): Promise<boolean> => {
  try {
    const url = getPhotoUrl(config);
    const response = await fetch(url, { method: 'HEAD' });
    return response.ok;
  } catch (error) {
    console.error('Erreur lors du test d\'accès à la photo:', error);
    return false;
  }
};

/**
 * Fonction pour obtenir les informations d'une photo
 */
export const getPhotoInfo = (config: PhotoConfig) => {
  return {
    url: getPhotoUrl(config),
    filename: config.filename,
    type: config.type,
    isExternal: config.filename?.startsWith('http'),
    isBlob: config.filename?.startsWith('blob:'),
  };
};

