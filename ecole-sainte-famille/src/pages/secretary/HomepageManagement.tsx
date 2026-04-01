import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Grid,
  Card,
  CardMedia,
  CardContent,
  IconButton,
  Snackbar,
  Alert,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  Divider
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  Add as AddIcon,
  Delete as DeleteIcon,
  PhotoCamera as PhotoCameraIcon,
  CloudUpload as CloudUploadIcon
} from '@mui/icons-material';
import SecretarySidebar from '../../components/SecretarySidebar';
import axios from 'axios';

interface Activity {
  id: number;
  name: string;
  description: string;
  images: string[];
  color: string;
}

interface ActivityImage {
  id: number;
  image_url: string;
  alt_text?: string;
  order_index: number;
  is_active: boolean;
}

interface ActivityWithImages {
  id: number;
  name: string;
  description: string;
  color: string;
  is_active: boolean;
  order_index: number;
  images: ActivityImage[];
}

const HomepageManagement = () => {
  const [activities, setActivities] = useState<ActivityWithImages[]>([]);
  const [loading, setLoading] = useState(true);
  const [openDialog, setOpenDialog] = useState(false);
  const [selectedActivity, setSelectedActivity] = useState<ActivityWithImages | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [altText, setAltText] = useState('');
  const [uploadMethod, setUploadMethod] = useState<'upload' | 'url'>('url');
  const [imageUrl, setImageUrl] = useState('');
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const [uploading, setUploading] = useState(false);

  // Données par défaut si l'API ne fonctionne pas
  const defaultActivities: ActivityWithImages[] = [
    {
      id: 1,
      name: 'Jeux Éducatifs',
      description: 'Apprentissage par le jeu et la découverte',
      color: '#4CAF50',
      is_active: true,
      order_index: 1,
      images: []
    },
    {
      id: 2,
      name: 'Vie Académique',
      description: 'Programme scolaire complet et équilibré',
      color: '#FF9800',
      is_active: true,
      order_index: 2,
      images: []
    },
    {
      id: 3,
      name: 'Activités Extrascolaires',
      description: 'Développement des talents et passions',
      color: '#2196F3',
      is_active: true,
      order_index: 3,
      images: []
    }
  ];

  // Charger les activités depuis l'API
  const loadActivities = async () => {
    try {
      setLoading(true);
      setError('');
      
      const response = await axios.get('https://saintefamilleexcellence.ci/api/homepage/activities');
      
      if (response.data.status === 'success') {
        // S'assurer que chaque activité a un tableau d'images
        const activitiesWithImages = response.data.data.map((activity: any) => ({
          ...activity,
          images: Array.isArray(activity.images) ? activity.images : []
        }));
        setActivities(activitiesWithImages);
      }
    } catch (error) {
      console.error('Erreur lors du chargement des activités:', error);
      setError('Erreur lors du chargement des activités - Utilisation des données par défaut');
      // Utiliser les données par défaut en cas d'erreur
      setActivities(defaultActivities);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadActivities();
  }, []);

  const handleAddImage = (activity: ActivityWithImages) => {
    setSelectedActivity(activity);
    setOpenDialog(true);
    setSelectedFile(null);
    setAltText('');
    setImageUrl('');
    setUploadMethod('upload');
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Vérifier le type de fichier
      if (!file.type.startsWith('image/')) {
        setError('Veuillez sélectionner un fichier image valide');
        return;
      }
      // Vérifier la taille (5MB max)
      if (file.size > 5 * 1024 * 1024) {
        setError('La taille du fichier ne doit pas dépasser 5MB');
        return;
      }
      setSelectedFile(file);
      setError('');
    }
  };

  const handleSubmit = async () => {
    if (!selectedActivity) return;

    setUploading(true);
    setError('');

    try {
      const token = localStorage.getItem('token');
      const headers = {
        'Authorization': `Bearer ${token}`,
        'Content-Type': uploadMethod === 'upload' ? 'multipart/form-data' : 'application/json'
      };

      let response;

      if (uploadMethod === 'upload') {
        if (!selectedFile) {
          setError('Veuillez sélectionner un fichier');
          setUploading(false);
          return;
        }

        const formData = new FormData();
        formData.append('image', selectedFile);
        if (altText) formData.append('alt_text', altText);

        response = await axios.post(
          `https://saintefamilleexcellence.ci/api/homepage/activities/${selectedActivity.id}/images/upload`,
          formData,
          { headers }
        );
      } else {
        if (!imageUrl.trim()) {
          setError('Veuillez saisir une URL d\'image');
          setUploading(false);
          return;
        }

        response = await axios.post(
          `https://saintefamilleexcellence.ci/api/homepage/activities/${selectedActivity.id}/images/url`,
          {
            image_url: imageUrl,
            alt_text: altText || null
          },
          { headers }
        );
      }

      if (response.data.status === 'success') {
        setSuccess('Image ajoutée avec succès');
        setOpenDialog(false);
        loadActivities(); // Recharger les activités
      }
    } catch (error: any) {
      console.error('Erreur lors de l\'ajout de l\'image:', error);
      setError(error.response?.data?.message || 'Erreur lors de l\'ajout de l\'image - Vérifiez que le serveur backend est à jour');
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteImage = async (imageId: number) => {
    if (!window.confirm('Êtes-vous sûr de vouloir supprimer cette image ?')) {
      return;
    }

    try {
      const token = localStorage.getItem('token');
      await axios.delete(
        `https://saintefamilleexcellence.ci/api/homepage/activity-images/${imageId}`,
        {
          headers: { 'Authorization': `Bearer ${token}` }
        }
      );

      setSuccess('Image supprimée avec succès');
      loadActivities(); // Recharger les activités
    } catch (error: any) {
      console.error('Erreur lors de la suppression:', error);
      setError(error.response?.data?.message || 'Erreur lors de la suppression');
    }
  };

  const getImageUrl = (imageUrl: string) => {
    if (imageUrl.startsWith('http')) {
      return imageUrl;
    }
    
    // Si l'URL commence par /img/pages, utiliser le domaine du frontend
    if (imageUrl.startsWith('/img/pages/')) {
      return `https://saintefamilleexcellence.ci${imageUrl}`;
    }
    
    // Si l'URL commence par /uploads/homepage/, utiliser la nouvelle route API
    if (imageUrl.startsWith('/uploads/homepage/')) {
      const filename = imageUrl.split('/').pop();
      return `https://saintefamilleexcellence.ci/api/homepage/images/${filename}`;
    }
    
    // Si l'URL commence par /uploads, utiliser le domaine du backend
    if (imageUrl.startsWith('/uploads/')) {
      return `https://saintefamilleexcellence.ci${imageUrl}`;
    }
    
    // Par défaut, ajouter le domaine du backend
    return `https://saintefamilleexcellence.ci${imageUrl}`;
  };

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: '#f5f7fa' }}>
      <SecretarySidebar />
      <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-start', py: 6, px: 2 }}>
        <Typography variant="h3" fontWeight={900} color="primary.main" mb={4} sx={{ letterSpacing: 1 }}>
          Gestion de la page d'accueil
        </Typography>

        {loading ? (
          <Typography>Chargement...</Typography>
        ) : (
          <Paper elevation={4} sx={{ p: 3, width: '100%', maxWidth: 1200, borderRadius: 3 }}>
            <Typography variant="h5" fontWeight={700} color="primary.main" mb={3}>
              Gestion des Images des Activités
            </Typography>

            {error && (
              <Alert severity="warning" sx={{ mb: 3 }}>
                <Typography variant="body2">
                  {error}
                </Typography>
                <Typography variant="body2" sx={{ mt: 1 }}>
                  Les boutons d'ajout d'images sont disponibles ci-dessous. Assurez-vous que le serveur backend est à jour avec les nouvelles routes.
                </Typography>
              </Alert>
            )}



            {activities.map((activity) => (
              <Accordion key={activity.id} sx={{ mb: 2, borderRadius: 2 }}>
                <AccordionSummary
                  expandIcon={<ExpandMoreIcon />}
                  sx={{
                    bgcolor: activity.color + '10',
                    borderRadius: 2,
                    '&:hover': { bgcolor: activity.color + '20' }
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Box
                      sx={{
                        width: 20,
                        height: 20,
                        borderRadius: '50%',
                        bgcolor: activity.color
                      }}
                    />
                    <Typography variant="h6" fontWeight={600}>
                      {activity.name}
                    </Typography>
                    <Chip
                      label={`${activity.images && Array.isArray(activity.images) ? activity.images.length : 0} image${activity.images && Array.isArray(activity.images) && activity.images.length > 1 ? 's' : ''}`}
                      size="small"
                      color="primary"
                    />
                  </Box>
                </AccordionSummary>
                <AccordionDetails>
                  <Box sx={{ mb: 3 }}>
                    <Button
                      variant="contained"
                      startIcon={<AddIcon />}
                      onClick={() => handleAddImage(activity)}
                      sx={{ mb: 2 }}
                    >
                      Ajouter une image
                    </Button>
                  </Box>

                  {activity.images && Array.isArray(activity.images) && activity.images.length > 0 ? (
                    <Grid container spacing={2}>
                      {activity.images.map((image) => (
                        <Grid item xs={12} sm={6} md={4} lg={3} key={image.id}>
                          <Card sx={{ position: 'relative', borderRadius: 2 }}>
                            <CardMedia
                              component="img"
                              height="200"
                              image={getImageUrl(image.image_url)}
                              alt={image.alt_text || activity.name}
                              sx={{ objectFit: 'cover' }}
                              onError={(e) => {
                                // Utiliser une image de test en cas d'erreur
                                e.currentTarget.src = `https://picsum.photos/400/300?random=${image.id}`;
                                e.currentTarget.style.display = 'block';
                                e.currentTarget.nextElementSibling?.classList.add('hidden');
                              }}
                            />
                            
                            <CardContent sx={{ p: 1 }}>
                              <Typography variant="caption" color="text.secondary">
                                {image.alt_text || 'Aucune description'}
                              </Typography>
                            </CardContent>
                            <IconButton
                              onClick={() => handleDeleteImage(image.id)}
                              sx={{
                                position: 'absolute',
                                top: 8,
                                right: 8,
                                bgcolor: 'rgba(255, 255, 255, 0.9)',
                                '&:hover': { bgcolor: 'rgba(255, 255, 255, 1)' }
                              }}
                              color="error"
                              size="small"
                            >
                              <DeleteIcon />
                            </IconButton>
                          </Card>
                        </Grid>
                      ))}
                    </Grid>
                  ) : (
                    <Typography color="text.secondary" align="center" sx={{ py: 4 }}>
                      Aucune image pour cette activité
                    </Typography>
                  )}
                </AccordionDetails>
              </Accordion>
            ))}
          </Paper>
        )}

        {/* Dialog pour ajouter une image */}
        <Dialog
          open={openDialog}
          onClose={() => setOpenDialog(false)}
          maxWidth="sm"
          fullWidth
          PaperProps={{
            sx: { borderRadius: 4, boxShadow: '0 8px 32px 0 rgba(31,38,135,0.18)' }
          }}
        >
          <DialogTitle sx={{ fontWeight: 900, color: 'primary.main', fontSize: 24, letterSpacing: 1 }}>
            Ajouter une image à {selectedActivity?.name}
          </DialogTitle>
          <DialogContent sx={{ pt: 2 }}>
            <Box sx={{ mb: 3 }}>
              <FormControl fullWidth>
                <InputLabel>Méthode d'ajout</InputLabel>
                <Select
                  value={uploadMethod}
                  label="Méthode d'ajout"
                  onChange={(e) => setUploadMethod(e.target.value as 'upload' | 'url')}
                >
                  <MenuItem value="upload">
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <CloudUploadIcon />
                      Upload de fichier
                    </Box>
                  </MenuItem>
                  <MenuItem value="url">
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <PhotoCameraIcon />
                      URL d'image
                    </Box>
                  </MenuItem>
                </Select>
              </FormControl>
            </Box>

            {uploadMethod === 'upload' ? (
              <Box sx={{ mb: 3 }}>
                <input
                  accept="image/*"
                  style={{ display: 'none' }}
                  id="image-upload"
                  type="file"
                  onChange={handleFileSelect}
                />
                <label htmlFor="image-upload">
                  <Button
                    variant="outlined"
                    component="span"
                    startIcon={<PhotoCameraIcon />}
                    fullWidth
                    sx={{ py: 2, borderStyle: 'dashed' }}
                  >
                    {selectedFile ? selectedFile.name : 'Sélectionner une image'}
                  </Button>
                </label>
                {selectedFile && (
                  <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                    Taille: {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                  </Typography>
                )}
              </Box>
                         ) : (
               <Box>
                 <TextField
                   label="URL de l'image"
                   value={imageUrl}
                   onChange={(e) => setImageUrl(e.target.value)}
                   fullWidth
                   sx={{ mb: 2 }}
                   placeholder="https://example.com/image.jpg"
                 />
                 <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 2 }}>
                   Exemples d'URLs d'images valides :
                 </Typography>
                 <Box sx={{ mb: 2 }}>
                   <Typography variant="caption" color="primary" sx={{ display: 'block', mb: 1 }}>
                     • Images hébergées : https://imgur.com/example.jpg
                   </Typography>
                   <Typography variant="caption" color="primary" sx={{ display: 'block', mb: 1 }}>
                     • Images de votre site : https://saintefamilleexcellence.ci/img/pages/example.jpg
                   </Typography>
                   <Typography variant="caption" color="primary" sx={{ display: 'block' }}>
                     • Images externes : https://picsum.photos/400/300
                   </Typography>
                 </Box>
                 <Button
                   variant="outlined"
                   size="small"
                   onClick={() => setImageUrl('https://picsum.photos/400/300')}
                   sx={{ mr: 1 }}
                 >
                   Tester avec image exemple
                 </Button>
               </Box>
             )}

            <TextField
              label="Description de l'image (optionnel)"
              value={altText}
              onChange={(e) => setAltText(e.target.value)}
              fullWidth
              multiline
              rows={2}
            />
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2, gap: 2 }}>
            <Button
              onClick={() => setOpenDialog(false)}
              variant="outlined"
              disabled={uploading}
            >
              Annuler
            </Button>
            <Button
              onClick={handleSubmit}
              variant="contained"
              disabled={uploading || (uploadMethod === 'upload' ? !selectedFile : !imageUrl.trim())}
            >
              {uploading ? 'Ajout en cours...' : 'Ajouter'}
            </Button>
          </DialogActions>
        </Dialog>

        {/* Snackbars pour les notifications */}
        <Snackbar
          open={!!success}
          autoHideDuration={6000}
          onClose={() => setSuccess('')}
          anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
        >
          <Alert onClose={() => setSuccess('')} severity="success" sx={{ width: '100%' }}>
            {success}
          </Alert>
        </Snackbar>

        <Snackbar
          open={!!error}
          autoHideDuration={6000}
          onClose={() => setError('')}
          anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
        >
          <Alert onClose={() => setError('')} severity="error" sx={{ width: '100%' }}>
            {error}
          </Alert>
        </Snackbar>
      </Box>
    </Box>
  );
};

export default HomepageManagement;

