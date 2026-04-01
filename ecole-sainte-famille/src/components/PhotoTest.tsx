import React, { useState } from 'react';
import {
  Box,
  Button,
  Typography,
  Card,
  CardContent,
  Grid,
  TextField,
  Alert,
  CircularProgress
} from '@mui/material';
import { getPhotoUrl, testPhotoAccess, getPhotoInfo } from '../utils/photoUtils';

interface PhotoTestProps {
  onClose?: () => void;
}

const PhotoTest: React.FC<PhotoTestProps> = ({ onClose }) => {
  const [filename, setFilename] = useState('');
  const [photoType, setPhotoType] = useState<'student' | 'garderie' | 'media'>('student');
  const [testResults, setTestResults] = useState<any[]>([]);
  const [isTesting, setIsTesting] = useState(false);

  const handleTestPhoto = async () => {
    if (!filename.trim()) {
      setTestResults([{ success: false, message: 'Veuillez saisir un nom de fichier' }]);
      return;
    }

    setIsTesting(true);
    const results = [];

    try {
      // Test 1: Générer l'URL
      const config = { type: photoType, filename: filename.trim() };
      const url = getPhotoUrl(config);
      const info = getPhotoInfo(config);

      results.push({
        success: true,
        title: 'URL générée',
        message: `URL: ${url}`,
        data: info
      });

      // Test 2: Tester l'accès
      const isAccessible = await testPhotoAccess(config);
      results.push({
        success: isAccessible,
        title: 'Test d\'accès',
        message: isAccessible ? 'Photo accessible' : 'Photo non accessible',
        data: { accessible: isAccessible }
      });

      // Test 3: Afficher l'image
      results.push({
        success: true,
        title: 'Aperçu',
        message: 'Affichage de l\'image',
        data: { url, config }
      });

    } catch (error) {
      results.push({
        success: false,
        title: 'Erreur',
        message: `Erreur lors du test: ${error}`,
        data: { error }
      });
    }

    setTestResults(results);
    setIsTesting(false);
  };

  const handleTestAll = async () => {
    setIsTesting(true);
    const results = [];

    // Tests avec des exemples
    const testCases = [
      { type: 'student' as const, filename: 'student-photo.jpg' },
      { type: 'garderie' as const, filename: 'garderie-photo.jpg' },
      { type: 'media' as const, filename: 'media-photo.jpg' },
      { type: 'student' as const, filename: '' },
      { type: 'student' as const, filename: 'https://example.com/photo.jpg' },
    ];

    for (const testCase of testCases) {
      try {
        const url = getPhotoUrl(testCase);
        const isAccessible = await testPhotoAccess(testCase);
        
        results.push({
          success: isAccessible,
          title: `Test ${testCase.type}`,
          message: `${testCase.filename || 'Aucun fichier'} - ${isAccessible ? 'OK' : 'ÉCHEC'}`,
          data: { url, accessible: isAccessible }
        });
      } catch (error) {
        results.push({
          success: false,
          title: `Test ${testCase.type}`,
          message: `Erreur: ${error}`,
          data: { error }
        });
      }
    }

    setTestResults(results);
    setIsTesting(false);
  };

  return (
    <Box sx={{ p: 3, maxWidth: 800, mx: 'auto' }}>
      <Typography variant="h4" gutterBottom>
        🧪 Test des Photos
      </Typography>

      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Configuration du test
          </Typography>
          
          <Grid container spacing={2}>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Nom du fichier"
                value={filename}
                onChange={(e) => setFilename(e.target.value)}
                placeholder="exemple.jpg"
                helperText="Nom du fichier photo à tester"
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                select
                label="Type de photo"
                value={photoType}
                onChange={(e) => setPhotoType(e.target.value as any)}
                SelectProps={{ native: true }}
              >
                <option value="student">Élève</option>
                <option value="garderie">Garderie</option>
                <option value="media">Média</option>
              </TextField>
            </Grid>
          </Grid>

          <Box sx={{ mt: 2, display: 'flex', gap: 2 }}>
            <Button
              variant="contained"
              onClick={handleTestPhoto}
              disabled={isTesting}
              startIcon={isTesting ? <CircularProgress size={20} /> : null}
            >
              Tester cette photo
            </Button>
            <Button
              variant="outlined"
              onClick={handleTestAll}
              disabled={isTesting}
            >
              Tests automatiques
            </Button>
            {onClose && (
              <Button variant="text" onClick={onClose}>
                Fermer
              </Button>
            )}
          </Box>
        </CardContent>
      </Card>

      {/* Résultats des tests */}
      {testResults.length > 0 && (
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Résultats des tests
            </Typography>
            
            {testResults.map((result, index) => (
              <Box key={index} sx={{ mb: 2 }}>
                <Alert 
                  severity={result.success ? 'success' : 'error'}
                  sx={{ mb: 1 }}
                >
                  <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>
                    {result.title}
                  </Typography>
                  <Typography variant="body2">
                    {result.message}
                  </Typography>
                </Alert>

                {/* Aperçu de l'image si c'est un test d'affichage */}
                {result.title === 'Aperçu' && result.data?.url && (
                  <Box sx={{ mt: 2, textAlign: 'center' }}>
                    <Typography variant="body2" sx={{ mb: 1 }}>
                      Aperçu de l'image:
                    </Typography>
                    <img
                      src={result.data.url}
                      alt="Test"
                      style={{
                        maxWidth: '200px',
                        maxHeight: '200px',
                        border: '1px solid #ccc',
                        borderRadius: '4px'
                      }}
                      onError={(e) => {
                        console.error('Erreur de chargement de l\'image de test:', e);
                        e.currentTarget.style.display = 'none';
                      }}
                    />
                  </Box>
                )}

                {/* Détails techniques */}
                {result.data && (
                  <Box sx={{ mt: 1, p: 1, bgcolor: '#f5f5f5', borderRadius: 1 }}>
                    <Typography variant="caption" sx={{ fontFamily: 'monospace' }}>
                      {JSON.stringify(result.data, null, 2)}
                    </Typography>
                  </Box>
                )}
              </Box>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Informations utiles */}
      <Card sx={{ mt: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            📋 Informations utiles
          </Typography>
          
          <Typography variant="body2" paragraph>
            <strong>URLs générées:</strong>
          </Typography>
          <Box sx={{ fontFamily: 'monospace', fontSize: '0.8rem', bgcolor: '#f5f5f5', p: 1, borderRadius: 1 }}>
            <div>Élève: https://saintefamilleexcellence.ci/api/students/photo/[filename]</div>
            <div>Garderie: https://saintefamilleexcellence.ci/api/garderie/photo/[filename]</div>
            <div>Média: https://saintefamilleexcellence.ci/api/media/[filename]</div>
          </Box>
          
          <Typography variant="body2" sx={{ mt: 2 }}>
            <strong>Note:</strong> Les photos des élèves sont maintenant servies via une route API dédiée pour une meilleure gestion des erreurs et du cache.
          </Typography>
        </CardContent>
      </Card>
    </Box>
  );
};

export default PhotoTest;

