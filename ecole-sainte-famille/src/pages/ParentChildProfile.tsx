import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Box, Paper, Button, Grid, Typography, IconButton, Badge, Menu, MenuItem, ListItemText, ListItemIcon, Dialog, DialogTitle, DialogContent, DialogActions, Table, TableHead, TableRow, TableCell, TableBody, TableContainer, CircularProgress, Alert, TextField, useTheme, useMediaQuery, Chip, FormControl, InputLabel, Select, Tooltip } from '@mui/material';
import useAuth from '../hooks/useAuth';
import NotesTab from './NotesTab';
import BulletinTab from './BulletinTab';
import ReportCardTab from './ReportCardTab';
import AbsencesTab from './AbsencesTab';
import ScheduleTab from './ScheduleTab';
import AssignmentIcon from '@mui/icons-material/Assignment';
import DescriptionIcon from '@mui/icons-material/Description';
import EventBusyIcon from '@mui/icons-material/EventBusy';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import EventIcon from '@mui/icons-material/Event';
import NotificationsIcon from '@mui/icons-material/Notifications';
import InfoIcon from '@mui/icons-material/Info';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import PaymentIcon from '@mui/icons-material/Payment';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import BarChartIcon from '@mui/icons-material/BarChart';
import StarIcon from '@mui/icons-material/Star';
import axios from 'axios';
import PhotoCameraIcon from '@mui/icons-material/PhotoCamera';
import VideoLibraryIcon from '@mui/icons-material/VideoLibrary';
import { useIsMounted } from '../hooks/useIsMounted';

// Interface pour les paiements
interface Payment {
  id: number;
  amount: number;
  payment_date: string;
  status: string;
  payment_method: string;
  description?: string;
}

interface PaymentSummary {
  total_due: number;
  total_paid: number;
  total_discounts: number;
  remaining_balance: number;
  class_name: string;
  payments: Payment[];
}

// Interface pour les médias
interface MediaItem {
  id: number;
  filename: string;
  original_name: string;
  description?: string;
  uploaded_at?: string;
  created_at?: string;
  source: 'student' | 'admin' | 'admin_class';
  media_url: string;
  media_type: 'photo' | 'video';
}

// Composant PaymentTab pour l'onglet Paiements
const PaymentTab = ({ childId, schoolYear }: { childId: string | undefined, schoolYear: string }) => {
  const [paymentSummary, setPaymentSummary] = useState<PaymentSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isMounted = useIsMounted();

  useEffect(() => {
    let isMounted = true;
    
    const fetchPaymentSummary = async () => {
      if (!childId || !isMounted) return;
      
      setLoading(true);
      setError(null);
      
      try {
        const token = localStorage.getItem('token');
        const { data } = await axios.get(`https://saintefamilleexcellence.ci/api/students/${childId}/payment-summary?school_year=${schoolYear}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        if (isMounted) {
          setPaymentSummary(data);
          console.log('Résumé de paiement récupéré:', data);
        }
      } catch (err: any) {
        if (isMounted) {
          console.error('Erreur lors de la récupération du résumé de paiement:', err);
          
          if (err.response?.status === 403) {
            setError('Vous n\'avez pas l\'autorisation de voir les informations de paiement de cet enfant.');
          } else if (err.response?.status === 404) {
            setError('Aucune information de paiement trouvée pour cet enfant.');
          } else {
            setError('Erreur lors du chargement des informations de paiement. Veuillez réessayer.');
          }
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchPaymentSummary();
    
    return () => {
      isMounted = false;
    };
  }, [childId, schoolYear]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'XOF',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 200 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ p: 4, textAlign: 'center' }}>
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
        <Typography variant="body1" color="text.secondary">
          Impossible de charger les informations de paiement pour le moment.
        </Typography>
      </Box>
    );
  }

  if (!paymentSummary) {
    return (
      <Box sx={{ p: 4, textAlign: 'center' }}>
        <PaymentIcon sx={{ fontSize: 60, color: '#9c27b0', mb: 2 }} />
        <Typography variant="h5" fontWeight={700} color="primary.main" mb={2}>
          Informations de Paiement
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Aucune information de paiement disponible pour le moment.
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h5" fontWeight={700} color="primary.main" mb={3}>
        Résumé de la Scolarité - {paymentSummary.class_name}
      </Typography>
      
      {/* Résumé financier */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Paper elevation={3} sx={{ p: 3, textAlign: 'center', borderTop: '4px solid #ff9800' }}>
            <Typography variant="h6" color="text.secondary" gutterBottom>
              Montant Total
            </Typography>
            <Typography variant="h4" fontWeight={700} color="warning.main">
              {formatCurrency(paymentSummary.total_due)}
            </Typography>
          </Paper>
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <Paper elevation={3} sx={{ p: 3, textAlign: 'center', borderTop: '4px solid #4caf50' }}>
            <Typography variant="h6" color="text.secondary" gutterBottom>
              Montant Payé
            </Typography>
            <Typography variant="h4" fontWeight={700} color="success.main">
              {formatCurrency(paymentSummary.total_paid)}
            </Typography>
          </Paper>
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <Paper elevation={3} sx={{ p: 3, textAlign: 'center', borderTop: '4px solid #2196f3' }}>
            <Typography variant="h6" color="text.secondary" gutterBottom>
              Réductions
            </Typography>
            <Typography variant="h4" fontWeight={700} color="info.main">
              {formatCurrency(paymentSummary.total_discounts)}
            </Typography>
          </Paper>
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <Paper elevation={3} sx={{ p: 3, textAlign: 'center', borderTop: '4px solid #f44336' }}>
            <Typography variant="h6" color="text.secondary" gutterBottom>
              Reste à Payer
            </Typography>
            <Typography variant="h4" fontWeight={700} color="error.main">
              {formatCurrency(paymentSummary.remaining_balance)}
            </Typography>
          </Paper>
        </Grid>
      </Grid>

      {/* Barre de progression */}
      <Paper elevation={2} sx={{ p: 3, mb: 4 }}>
        <Typography variant="h6" fontWeight={600} mb={2}>
          Progression du Paiement
        </Typography>
        <Box sx={{ width: '100%', bgcolor: '#e0e0e0', borderRadius: 1, height: 20, position: 'relative' }}>
          <Box
            sx={{
              width: `${Math.min(100, ((paymentSummary.total_paid + paymentSummary.total_discounts) / paymentSummary.total_due) * 100)}%`,
              bgcolor: 'success.main',
              height: '100%',
              borderRadius: 1,
              transition: 'width 0.3s ease'
            }}
          />
          <Typography
            variant="body2"
            sx={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              color: 'white',
              fontWeight: 600,
              textShadow: '1px 1px 2px rgba(0,0,0,0.5)'
            }}
          >
            {Math.round(((paymentSummary.total_paid + paymentSummary.total_discounts) / paymentSummary.total_due) * 100)}%
          </Typography>
        </Box>
      </Paper>

      {/* Historique des paiements */}
      <Paper elevation={2} sx={{ p: 3 }}>
        <Typography variant="h6" fontWeight={600} mb={3}>
          Historique des Paiements
        </Typography>
        
        {paymentSummary.payments.length === 0 ? (
          <Typography color="text.secondary" sx={{ textAlign: 'center', py: 4 }}>
            Aucun paiement enregistré pour cette année scolaire.
          </Typography>
        ) : (
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow sx={{ '& .MuiTableCell-root': { bgcolor: '#f4f6f8', fontWeight: 'bold' } }}>
                  <TableCell>Date</TableCell>
                  <TableCell>Montant</TableCell>
                  <TableCell>Méthode</TableCell>
                  <TableCell>Statut</TableCell>
                  <TableCell>Description</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {paymentSummary.payments.map((payment) => (
                  <TableRow key={payment.id} hover>
                    <TableCell>
                      <Typography fontWeight={500}>
                        {formatDate(payment.payment_date)}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography fontWeight={600} color="success.main">
                        {formatCurrency(payment.amount)}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip 
                        label={payment.payment_method || 'Non spécifié'} 
                        color="primary" 
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      <Chip 
                        label={payment.status === 'completed' ? 'Complété' : payment.status === 'pending' ? 'En attente' : 'Échoué'} 
                        color={payment.status === 'completed' ? 'success' : payment.status === 'pending' ? 'warning' : 'error'} 
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" color="text.secondary">
                        {payment.description || '-'}
                      </Typography>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Paper>
    </Box>
  );
};

// Composant PhotoVideoTab pour l'onglet Photos & Vidéos
const PhotoVideoTab = ({ childId, schoolYear, user }: { childId: string | undefined, schoolYear: string, user: any }) => {
  const [media, setMedia] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedMedia, setSelectedMedia] = useState<MediaItem | null>(null);
  const [openDialog, setOpenDialog] = useState(false);
  const isMounted = useIsMounted();

  // Fonction pour créer une URL de média avec authentification
  const getAuthenticatedMediaUrl = (mediaUrl: string) => {
    const token = localStorage.getItem('token');
    if (!token) return mediaUrl;
    // Ajoute le token en query string, gère déjà la présence d'autres paramètres
    if (mediaUrl.includes('?')) {
      return `${mediaUrl}&token=${token}`;
    }
    return `${mediaUrl}?token=${token}`;
  };

  useEffect(() => {
    let isMounted = true;
    
    const fetchMedia = async () => {
      if (!childId || !isMounted) return;
      
      setLoading(true);
      setError(null);
      
      try {
        const token = localStorage.getItem('token');
        const { data } = await axios.get(`https://saintefamilleexcellence.ci/api/students/${childId}/media`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        if (isMounted) {
          setMedia(data);
          console.log('Médias récupérés avec succès:', data.length, 'média(s)');
          console.log('Premier média:', data[0]);
          
          // Log détaillé pour déboguer
          data.forEach((item: MediaItem, index: number) => {
            console.log(`Média ${index + 1}:`, {
              id: item.id,
              source: item.source,
              uploaded_at: item.uploaded_at,
              created_at: item.created_at,
              original_name: item.original_name,
              media_type: item.media_type
            });
          });
        }
      } catch (err: any) {
        if (isMounted) {
          console.error('Erreur lors de la récupération des médias:', err);
          
          if (err.response?.status === 403) {
            setError('Vous n\'avez pas l\'autorisation de voir les médias de cet enfant. Seuls les parents peuvent voir les médias de leurs propres enfants.');
          } else if (err.response?.status === 404) {
            setError('Aucun média trouvé pour cet enfant.');
          } else {
            setError('Erreur lors du chargement des médias. Veuillez réessayer.');
          }
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchMedia();
    
    return () => {
      isMounted = false;
    };
  }, [childId, schoolYear]);

  const handleMediaClick = (mediaItem: MediaItem) => {
    setSelectedMedia(mediaItem);
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setSelectedMedia(null);
  };

  const formatDate = (dateString: string | null | undefined) => {
    try {
      // Si la date est déjà formatée (contient '/' ou 'à'), on la retourne telle quelle
      if (typeof dateString === 'string' && (dateString.includes('à') || dateString.includes('/'))) {
        return dateString;
      }
      
      // Si la date est null ou undefined, retourner une chaîne vide
      if (!dateString) {
        return '';
      }
      
      // Vérifier si c'est une date valide
      const date = new Date(dateString);
      if (isNaN(date.getTime())) {
        console.error('Date invalide:', dateString);
        return '';
      }
      
      // Formater la date
      return date.toLocaleDateString('fr-FR', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (error) {
      console.error('Erreur de formatage de date:', error, 'Date reçue:', dateString);
      return '';
    }
  };

  const handleImageError = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
    console.error('Erreur de chargement de l\'image:', e.currentTarget.src);
    e.currentTarget.style.display = 'none';
    e.currentTarget.nextElementSibling?.classList.remove('hidden');
  };

  // Fonction pour désactiver le clic droit et autres interactions
  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    return false;
  };

  // Fonction pour désactiver la sélection de texte
  const handleSelectStart = (e: React.MouseEvent) => {
    e.preventDefault();
    return false;
  };

  // Fonction pour désactiver le glisser-déposer
  const handleDragStart = (e: React.DragEvent) => {
    e.preventDefault();
    return false;
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 200 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ p: 4, textAlign: 'center' }}>
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
        <Typography variant="body1" color="text.secondary">
          Impossible de charger les médias pour le moment.
        </Typography>
      </Box>
    );
  }

  if (media.length === 0) {
    return (
      <Box sx={{ p: 4, textAlign: 'center' }}>
        <PhotoCameraIcon sx={{ fontSize: 60, color: '#1976d2', mb: 2 }} />
        <VideoLibraryIcon sx={{ fontSize: 60, color: '#1976d2', mb: 2, ml: 2 }} />
        <Typography variant="h5" fontWeight={700} color="primary.main" mb={2}>
          Galerie Photos & Vidéos
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Aucune photo ou vidéo n'a encore été publiée pour votre enfant.
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }} onContextMenu={handleContextMenu}>
      <Typography variant="h5" fontWeight={700} color="primary.main" mb={3}>
        Galerie Photos & Vidéos ({media.length} média{media.length > 1 ? 'x' : ''})
      </Typography>
      
      <Grid container spacing={3}>
        {media.map((item) => (
          <Grid item xs={12} sm={6} md={4} lg={3} key={item.id}>
            <Paper 
              elevation={3} 
              sx={{ 
                cursor: 'pointer',
                transition: 'all 0.2s',
                '&:hover': {
                  transform: 'scale(1.02)',
                  boxShadow: 6
                }
              }}
              onClick={() => handleMediaClick(item)}
            >
              {item.media_type === 'photo' ? (
                <Box sx={{ position: 'relative' }}>
                  <img
                    src={getAuthenticatedMediaUrl(item.media_url)}
                    alt={item.description || 'Photo'}
                    style={{
                      width: '100%',
                      height: 200,
                      objectFit: 'cover',
                      borderTopLeftRadius: 8,
                      borderTopRightRadius: 8,
                      userSelect: 'none',
                      WebkitUserSelect: 'none',
                      MozUserSelect: 'none',
                      msUserSelect: 'none'
                    }}
                    onError={handleImageError}
                    crossOrigin="anonymous"
                    onContextMenu={handleContextMenu}
                    onDragStart={handleDragStart}
                    draggable={false}
                  />
                  <Box
                    className="hidden"
                    sx={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      right: 0,
                      bottom: 0,
                      display: 'none',
                      alignItems: 'center',
                      justifyContent: 'center',
                      backgroundColor: '#f5f5f5',
                      borderTopLeftRadius: 8,
                      borderTopRightRadius: 8
                    }}
                  >
                    <PhotoCameraIcon sx={{ fontSize: 40, color: '#ccc' }} />
                    <Typography variant="caption" color="text.secondary" sx={{ ml: 1 }}>
                      Image non disponible
                    </Typography>
                  </Box>
                </Box>
              ) : (
                <Box
                  sx={{
                    width: '100%',
                    height: 200,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: '#f5f5f5',
                    borderTopLeftRadius: 8,
                    borderTopRightRadius: 8,
                    userSelect: 'none',
                    WebkitUserSelect: 'none',
                    MozUserSelect: 'none',
                    msUserSelect: 'none'
                  }}
                  onContextMenu={handleContextMenu}
                  onDragStart={handleDragStart}
                >
                  <VideoLibraryIcon sx={{ fontSize: 60, color: '#1976d2' }} />
                </Box>
              )}
              
              <Box sx={{ p: 2 }}>
                {item.description && (
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                    {item.description}
                  </Typography>
                )}
                <Typography variant="caption" color="text.secondary" display="block">
                  Par: {item.source === 'admin' || item.source === 'admin_class' ? 'Administration' : 'Enseignant'}
                </Typography>
                <Typography variant="caption" color="text.secondary" display="block">
                  {formatDate(item.uploaded_at || item.created_at)}
                </Typography>
              </Box>
            </Paper>
          </Grid>
        ))}
      </Grid>

      {/* Dialog pour afficher le média en grand */}
      <Dialog
        open={openDialog}
        onClose={handleCloseDialog}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: {
            maxHeight: '90vh',
            borderRadius: 2
          }
        }}
      >
        <DialogTitle sx={{ m: 0, p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h6" component="div">
            Média
          </Typography>
          <IconButton
            aria-label="close"
            onClick={handleCloseDialog}
            sx={{
              position: 'absolute',
              right: 8,
              top: 8,
            }}
          >
            <span style={{ fontWeight: 'bold', fontSize: 18 }}>&times;</span>
          </IconButton>
        </DialogTitle>
        <DialogContent onContextMenu={handleContextMenu}>
          {selectedMedia && (
            <Box sx={{ textAlign: 'center' }}>
              {selectedMedia.media_type === 'photo' ? (
                <img
                  src={getAuthenticatedMediaUrl(selectedMedia.media_url)}
                  alt={selectedMedia.description || 'Photo'}
                  style={{
                    maxWidth: '100%',
                    maxHeight: '70vh',
                    objectFit: 'contain',
                    userSelect: 'none',
                    WebkitUserSelect: 'none',
                    MozUserSelect: 'none',
                    msUserSelect: 'none'
                  }}
                  onError={(e) => {
                    console.error('Erreur de chargement de l\'image dans le dialog:', e.currentTarget.src);
                    e.currentTarget.style.display = 'none';
                    e.currentTarget.nextElementSibling?.classList.remove('hidden');
                  }}
                  onContextMenu={handleContextMenu}
                  onDragStart={handleDragStart}
                  draggable={false}
                />
              ) : (
                <video
                  controls
                  style={{
                    maxWidth: '100%',
                    maxHeight: '70vh',
                    userSelect: 'none',
                    WebkitUserSelect: 'none',
                    MozUserSelect: 'none',
                    msUserSelect: 'none'
                  }}
                  onError={(e) => {
                    console.error('Erreur de chargement de la vidéo:', e.currentTarget.src);
                    console.error('Type d\'erreur:', e.currentTarget.error);
                    console.error('Code d\'erreur:', e.currentTarget.error?.code);
                    console.error('Message d\'erreur:', e.currentTarget.error?.message);
                  }}
                  onLoadStart={() => {
                    console.log('Début du chargement de la vidéo:', selectedMedia.media_url);
                  }}
                  onCanPlay={() => {
                    console.log('Vidéo prête à être lue:', selectedMedia.media_url);
                  }}
                  onLoadedData={() => {
                    console.log('Données vidéo chargées:', selectedMedia.media_url);
                  }}
                  onContextMenu={handleContextMenu}
                  onDragStart={handleDragStart}
                  draggable={false}
                >
                  <source src={getAuthenticatedMediaUrl(selectedMedia.media_url)} type="video/mp4" />
                  <source src={getAuthenticatedMediaUrl(selectedMedia.media_url)} type="video/webm" />
                  <source src={getAuthenticatedMediaUrl(selectedMedia.media_url)} type="video/ogg" />
                  <source src={getAuthenticatedMediaUrl(selectedMedia.media_url)} type="video/avi" />
                  <source src={getAuthenticatedMediaUrl(selectedMedia.media_url)} type="video/mov" />
                  <source src={getAuthenticatedMediaUrl(selectedMedia.media_url)} type="video/x-msvideo" />
                  <source src={getAuthenticatedMediaUrl(selectedMedia.media_url)} type="video/quicktime" />
                  Votre navigateur ne supporte pas la lecture de cette vidéo.
                </video>
              )}
              
              <Box sx={{ mt: 2, textAlign: 'left' }}>
                {selectedMedia.description && (
                  <Typography variant="body1" sx={{ mb: 1 }}>
                    <strong>Légende:</strong> {selectedMedia.description}
                  </Typography>
                )}
                <Typography variant="body2" color="text.secondary">
                  <strong>Publié par:</strong> {selectedMedia.source === 'admin' || selectedMedia.source === 'admin_class' ? 'Administration' : 'Enseignant'}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  <strong>Date:</strong> {formatDate(selectedMedia.uploaded_at || selectedMedia.created_at)}
                </Typography>
                {/* Bouton de téléchargement pour le parent */}
                {user?.role === 'parent' && (
                  <Button
                    variant="contained"
                    color="primary"
                    sx={{ mt: 2 }}
                    href={`${getAuthenticatedMediaUrl(selectedMedia.media_url)}&download=1`}
                    target="_blank"
                    rel="noopener noreferrer"
                    download
                  >
                    Télécharger
                  </Button>
                )}
              </Box>
            </Box>
          )}
        </DialogContent>
      </Dialog>
    </Box>
  );
};

// Options d'onglets incluant les paiements
const tabOptions = [
  {
    label: 'Notes',
    color: '#e91e63',
    icon: <StarIcon sx={{ fontSize: 40 }} />,
  },
  {
    label: 'Bulletins',
    color: '#673ab7',
    icon: <DescriptionIcon sx={{ fontSize: 40 }} />,
  },
  {
    label: 'Absences',
    color: '#ff9800',
    icon: <EventBusyIcon sx={{ fontSize: 40 }} />,
  },
  {
    label: 'Emploi du temps',
    color: '#43a047',
    icon: <CalendarTodayIcon sx={{ fontSize: 40 }} />,
  },
  {
    label: 'Photos & Vidéos',
    color: '#1976d2',
    icon: <PhotoCameraIcon sx={{ fontSize: 40 }} />,
  },
  {
    label: 'Paiements',
    color: '#9c27b0',
    icon: <PaymentIcon sx={{ fontSize: 40 }} />,
  },
];

function getCurrentSchoolYear() {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  if (month >= 9) {
    return `${year}-${year + 1}`;
  } else {
    return `${year - 1}-${year}`;
  }
}

function getSchoolYears(count = 5) {
  const current = getCurrentSchoolYear();
  const startYear = parseInt(current.split('-')[0], 10);
  return Array.from({ length: count }, (_, i) => {
    const start = startYear - i;
    return `${start}-${start + 1}`;
  });
}

const ParentChildProfile = () => {
  const { token } = useAuth(); // Vérification automatique de l'authentification
  const { childId } = useParams();
  const [tab, setTab] = useState(0);
  const navigate = useNavigate();
  const isMounted = useIsMounted();
  
  // Debug: Afficher l'ID de l'enfant
  console.log('🔍 [ParentChildProfile] childId reçu:', childId);
  console.log('🔍 [ParentChildProfile] URL complète:', window.location.href);
  
  // Récupérer les paramètres d'URL pour déterminer l'onglet et le type d'emploi du temps
  const searchParams = new URLSearchParams(window.location.search);
  const tabParam = searchParams.get('tab');
  const typeParam = searchParams.get('type');
  
  // Définir l'onglet initial basé sur les paramètres d'URL
  React.useEffect(() => {
    if (tabParam === 'schedule') {
      setTab(1); // Onglet emploi du temps
    }
  }, [tabParam]);
  
  // État pour le type d'emploi du temps sélectionné (maintenu pour compatibilité avec les paramètres d'URL)
  const [activeScheduleType, setActiveScheduleType] = React.useState<'official' | 'weekly' | null>(null);
  
  React.useEffect(() => {
    if (tabParam === 'schedule') {
      // Définir le type par défaut si spécifié dans l'URL (pour compatibilité)
      if (typeParam === 'official' || typeParam === 'weekly') {
        setActiveScheduleType(typeParam);
      }
    }
  }, [tabParam, typeParam]);

  // Récupérer l'utilisateur courant depuis le localStorage
  const user = React.useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem('user') || '{}');
    } catch {
      return {};
    }
  }, []);

  // Notifications d'absence et médias pour l'enfant courant
  const [childNotifications, setChildNotifications] = useState<any[]>([]);
  const [notifCount, setNotifCount] = useState(0);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const open = Boolean(anchorEl);
  const handleNotifClick = (event: React.MouseEvent<HTMLElement>) => {
    console.log('🔔 [Frontend] Clic sur la cloche de notification');
    console.log('🔔 [Frontend] Nombre de notifications:', childNotifications.length);
    console.log('🔔 [Frontend] Notifications non lues:', notifCount);
    console.log('🔔 [Frontend] Notifications complètes:', childNotifications);
    setAnchorEl(event.currentTarget);
  };
  const handleNotifClose = () => {
    setAnchorEl(null);
  };

  // Fonction pour marquer une notification comme lue
  const markNotificationAsRead = async (notificationId: number) => {
    try {
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      await axios.post('https://saintefamilleexcellence.ci/api/parent/notification/read', {
        userId: user.id,
        notificationId
      });
      if (isMounted) {
        setChildNotifications(prev => prev.map(n =>
          n.id === notificationId ? { ...n, is_read: 1 } : n
        ));
        setNotifCount(prev => Math.max(0, childNotifications.filter(n => !n.is_read && n.id !== notificationId).length));
      }
    } catch (error) {
      console.error('Erreur lors du marquage de la notification:', error);
    }
  };

  // Fonction pour marquer toutes les notifications comme lues
  const markAllNotificationsAsRead = async () => {
    try {
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      await axios.post('https://saintefamilleexcellence.ci/api/parent/notification/read-all', {
        userId: user.id
      });
      if (isMounted) {
        setChildNotifications(prev => prev.map(n => ({ ...n, is_read: 1 })));
        setNotifCount(0);
      }
    } catch (error) {
      console.error('Erreur lors du marquage de toutes les notifications:', error);
    }
  };

  // Fonction pour rafraîchir les notifications
  const refreshNotifications = async () => {
    if (!isMounted) return;
    try {
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      const token = localStorage.getItem('token');
      const { data } = await axios.get(`https://saintefamilleexcellence.ci/api/events/my-notifications`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (isMounted) {
        const previousCount = notifCount;
        setChildNotifications(data);
        const newCount = data.filter((n: any) => !n.is_read).length;
        setNotifCount(newCount);
        
        // Si une nouvelle notification arrive (spécialement pour les bulletins), déclencher un événement de rafraîchissement
        if (newCount > previousCount) {
          const newNotifications = data.filter((n: any) => !n.is_read && (n.title?.toLowerCase().includes('bulletin') || n.message?.toLowerCase().includes('bulletin')));
          if (newNotifications.length > 0 && tab === 1) { // Si on est sur l'onglet Bulletin
            // Déclencher un événement personnalisé pour rafraîchir les compositions
            window.dispatchEvent(new CustomEvent('bulletinPublished', { 
              detail: { compositionName: newNotifications[0].title } 
            }));
          }
        }
      }
    } catch (error) {
      console.error('Erreur lors de la récupération des notifications:', error);
    }
  };

  React.useEffect(() => {
    let isMounted = true;
    
    const fetchChildNotifications = async () => {
      if (!isMounted) return;
      
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      const token = localStorage.getItem('token');
      
      console.log('🔍 [Frontend] Début fetchChildNotifications');
      console.log('🔍 [Frontend] User complet:', user);
      console.log('🔍 [Frontend] User ID:', user.id);
      console.log('🔍 [Frontend] User email:', user.email);
      console.log('🔍 [Frontend] User role:', user.role);
      console.log('🔍 [Frontend] Token:', token ? 'Présent' : 'Absent');
      if (user.id !== 220 && user.id !== 167) {
        console.warn('⚠️ [Frontend] ATTENTION : L\'ID utilisateur n\'est ni 220 ni 167. Il est possible que cet utilisateur n\'ait pas de notifications.');
      }
      try {
        const url = `https://saintefamilleexcellence.ci/api/events/my-notifications`;
        console.log('🔍 [Frontend] URL appelée:', url);
        const { data } = await axios.get(url, {
          headers: { Authorization: `Bearer ${token}` }
        });
        console.log('🔍 [Frontend] Réponse reçue:', data);
        console.log('🔍 [Frontend] Nombre de notifications:', data.length);
        
        if (isMounted) {
          setChildNotifications(data);
          setNotifCount(data.filter((n: any) => !n.is_read).length);
          console.log('🔍 [Frontend] Notifications non lues:', data.filter((n: any) => !n.is_read).length);
        }
      } catch (e: any) {
        if (isMounted) {
          console.error('❌ [Frontend] Erreur lors de la récupération des notifications:', e);
          if (e.response) {
            console.error('❌ [Frontend] Détails de l\'erreur:', e.response.data);
          }
          setChildNotifications([]);
          setNotifCount(0);
        }
      }
    };
    
    fetchChildNotifications();
    const interval = setInterval(refreshNotifications, 30000);
    
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [user.id]);

  // Ajout pour la moyenne annuelle
  const [annualAverage, setAnnualAverage] = useState<{ moyenne_annuelle: number, rank: number, total: number } | null>(null);
  const [schoolYear, setSchoolYear] = useState(getCurrentSchoolYear());
  const SCHOOL_YEARS = getSchoolYears(5);
  const [publishedTrimesters, setPublishedTrimesters] = useState<{ [key: string]: boolean }>({});
  const [studentClassId, setStudentClassId] = useState<number | null>(null);

  React.useEffect(() => {
    let isMounted = true;
    
    if (!childId) return;
    
    const fetchAnnualAverage = async () => {
      if (!isMounted) return;
      
      try {
        const token = localStorage.getItem('token');
        const { data } = await axios.get(`https://saintefamilleexcellence.ci/api/students/${childId}/annual-average?school_year=${schoolYear}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (isMounted) {
          setAnnualAverage(data);
        }
      } catch {
        if (isMounted) {
          setAnnualAverage(null);
        }
      }
    };
    
    fetchAnnualAverage();
    
    return () => {
      isMounted = false;
    };
  }, [childId, schoolYear]);

  // Récupérer la classe de l'élève pour l'année scolaire sélectionnée
  React.useEffect(() => {
    let isMounted = true;
    
    if (!childId) return;
    
    const fetchClassId = async () => {
      if (!isMounted) return;
      
      try {
        const token = localStorage.getItem('token');
        const { data } = await axios.get(`https://saintefamilleexcellence.ci/api/students/${childId}?school_year=${schoolYear}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (isMounted) {
          setStudentClassId(data.class_id);
        }
      } catch {
        if (isMounted) {
          setStudentClassId(null);
        }
      }
    };
    
    fetchClassId();
    
    return () => {
      isMounted = false;
    };
  }, [childId, schoolYear]);

  // Récupérer l'état de publication des bulletins pour chaque trimestre
  React.useEffect(() => {
    let isMounted = true;
    
    if (!studentClassId) return;
    
    const fetchPublished = async () => {
      if (!isMounted) return;
      
      const trimesters = ['1er trimestre', '2e trimestre', '3e trimestre'];
      const token = localStorage.getItem('token');
      const results: { [key: string]: boolean } = {};
      
      await Promise.all(trimesters.map(async (trimester) => {
        if (!isMounted) return;
        
        try {
          const { data } = await axios.get(`https://saintefamilleexcellence.ci/api/report-cards/published?class_id=${studentClassId}&trimester=${encodeURIComponent(trimester)}&school_year=${schoolYear}`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          if (isMounted) {
            results[trimester] = !!data.published;
          }
        } catch {
          if (isMounted) {
            results[trimester] = false;
          }
        }
      }));
      
      if (isMounted) {
        setPublishedTrimesters(results);
      }
    };
    
    fetchPublished();
    
    return () => {
      isMounted = false;
    };
  }, [studentClassId, schoolYear]);

  // Supprime le bloc d'affichage de la moyenne annuelle
  // Juste après le sélecteur d'année scolaire, retire le bloc :
  // {(annualAverage && annualAverage.moyenne_annuelle !== null && allTrimestersPublished) ? ( ... ) : ( ... )}
  // Supprime le bloc d'affichage de la moyenne annuelle

  return (
    <Box sx={{ p: 4 }}>
      {/* Bouton retour */}
      <Button
        variant="outlined"
        startIcon={<ArrowBackIcon />}
        sx={{ mb: 2, fontWeight: 700, fontSize: 16, borderRadius: 3, px: 3 }}
        onClick={() => navigate('/parent/dashboard')}
      >
        Retour au tableau de bord parent
      </Button>
      <Box display="flex" alignItems="center" justifyContent="flex-end" mb={2}>
        <Tooltip title="Notifications et événements">
          <IconButton 
            color="primary" 
            sx={{ 
              ml: 2,
              animation: notifCount > 0 ? 'pulse 2s infinite' : 'none',
              '@keyframes pulse': {
                '0%': {
                  transform: 'scale(1)',
                },
                '50%': {
                  transform: 'scale(1.1)',
                },
                '100%': {
                  transform: 'scale(1)',
                },
              },
            }} 
            onClick={handleNotifClick}
          >
            <Badge badgeContent={notifCount} color="error">
              <NotificationsIcon sx={{ fontSize: 32 }} />
            </Badge>
          </IconButton>
        </Tooltip>
        <Menu
          anchorEl={anchorEl}
          open={open}
          onClose={handleNotifClose}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
          transformOrigin={{ vertical: 'top', horizontal: 'right' }}
          PaperProps={{ sx: { minWidth: 320, borderRadius: 3, boxShadow: 4 } }}
        >
          {(() => {
            console.log('🔍 [Frontend] Rendu du menu de notifications');
            console.log('🔍 [Frontend] childNotifications.length:', childNotifications.length);
            console.log('🔍 [Frontend] open:', open);
            return null;
          })()}
          <Box sx={{ px: 2, pt: 1, pb: 0.5, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h6" color="primary.main" fontWeight={700}>
              Notifications & Événements
            </Typography>
            {childNotifications.length > 0 && (
              <Button
                size="small"
                variant="outlined"
                onClick={(e) => {
                  e.stopPropagation();
                  markAllNotificationsAsRead();
                }}
                sx={{ fontSize: 12, py: 0.5 }}
              >
                Tout marquer comme lu
              </Button>
            )}
          </Box>
          {childNotifications.length === 0 ? (
            <MenuItem disabled>
              <ListItemText primary="Aucune notification ou événement" />
            </MenuItem>
          ) : (
            <>
              {childNotifications.map((notif: any, i: number) => {
                const isBulletinNotification = notif.title?.toLowerCase().includes('bulletin') || notif.message?.toLowerCase().includes('bulletin');
                
                return (
                <MenuItem 
                  key={i} 
                  onClick={() => {
                    markNotificationAsRead(notif.id);
                    handleNotifClose();
                    
                    // Si c'est une notification de bulletin, naviguer vers l'onglet Bulletins
                    if (isBulletinNotification) {
                      setTab(1); // Onglet Bulletins
                      // Déclencher un événement pour rafraîchir les compositions
                      setTimeout(() => {
                        window.dispatchEvent(new CustomEvent('bulletinPublished', { 
                          detail: { compositionName: notif.title } 
                        }));
                      }, 300);
                    }
                  }} 
                  sx={{ 
                    alignItems: 'flex-start',
                    backgroundColor: notif.is_read ? 'transparent' : '#f0f8ff',
                    '&:hover': {
                      backgroundColor: notif.is_read ? '#f5f5f5' : '#e3f2fd'
                    }
                  }}
                >
                  <ListItemIcon sx={{ mt: 0.5 }}>
                    {notif.type === 'public' && <InfoIcon color="primary" />}
                    {notif.type === 'private' && <EventBusyIcon color="warning" />}
                    {notif.type === 'class' && <CheckCircleIcon color="success" />}
                  </ListItemIcon>
                  <ListItemText
                    primary={<span>
                      {notif.title}
                      {!notif.is_read && (
                        <span style={{
                          marginLeft: 8,
                          fontSize: 10,
                          backgroundColor: '#ff4444',
                          color: 'white',
                          borderRadius: '50%',
                          width: 16,
                          height: 16,
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontWeight: 'bold'
                        }}>
                          N
                        </span>
                      )}
                      <span style={{
                        marginLeft: 8,
                        fontSize: 12,
                        fontWeight: 600,
                        color:
                          notif.type === 'public' ? '#1976d2' :
                          notif.type === 'private' ? '#ff9800' :
                          '#43a047',
                        border: '1px solid',
                        borderColor:
                          notif.type === 'public' ? '#1976d2' :
                          notif.type === 'private' ? '#ff9800' :
                          '#43a047',
                        borderRadius: 8,
                        padding: '2px 8px',
                        background:
                          notif.type === 'public' ? '#e3f2fd' :
                          notif.type === 'private' ? '#fff3e0' :
                          '#e8f5e9',
                      }}>
                        {notif.type === 'public' && 'Événement Public'}
                        {notif.type === 'private' && 'Message Privé'}
                        {notif.type === 'class' && 'Événement Classe'}
                      </span>
                    </span>}
                    secondary={
                      <span>
                        {notif.message}
                        {notif.event_date && (
                          <span style={{ display: 'block', marginTop: 4, fontSize: 11, color: '#666' }}>
                            📅 {new Date(notif.event_date).toLocaleDateString('fr-FR')}
                          </span>
                        )}
                      </span>
                    }
                    primaryTypographyProps={{ fontSize: 15 }}
                    secondaryTypographyProps={{ fontSize: 13, color: 'text.secondary' }}
                  />
                </MenuItem>
                );
              })}
              <MenuItem disabled sx={{ borderTop: '1px solid #e0e0e0', mt: 1 }}>
                <ListItemText 
                  primary="Affiche les 20 notifications et événements les plus récents" 
                  primaryTypographyProps={{ fontSize: 12, color: 'text.secondary', fontStyle: 'italic' }}
                />
              </MenuItem>
            </>
          )}
        </Menu>
      </Box>
      <Box sx={{ width: '100%', display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
        <FormControl sx={{ minWidth: 160 }} size="small">
          <InputLabel id="school-year-label">Année scolaire</InputLabel>
          <Select
            labelId="school-year-label"
            value={schoolYear}
            label="Année scolaire"
            onChange={e => setSchoolYear(e.target.value)}
          >
            {SCHOOL_YEARS.map(year => (
              <MenuItem key={year} value={year}>{year}</MenuItem>
            ))}
          </Select>
        </FormControl>
      </Box>
      {/* Supprime le bloc d'affichage de la moyenne annuelle */}
      {/* Juste après le sélecteur d'année scolaire, retire le bloc : */}
      {/* {(annualAverage && annualAverage.moyenne_annuelle !== null && allTrimestersPublished) ? ( ... ) : ( ... )} */}
      {/* Supprime le bloc d'affichage de la moyenne annuelle */}
      <Paper sx={{ mb: 4, p: 3, borderRadius: 4, boxShadow: 4 }}>
        <Grid container spacing={4} justifyContent="center" alignItems="center">
          {tabOptions.map((opt, idx) => (
            <Grid item key={opt.label} xs={12} sm={6} md={3}>
              <Button
                fullWidth
                variant={tab === idx ? 'contained' : 'outlined'}
                onClick={() => setTab(idx)}
                sx={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  height: 120,
                  borderRadius: 4,
                  fontWeight: 700,
                  fontSize: 20,
                  color: tab === idx ? 'white' : opt.color,
                  background: tab === idx ? opt.color : 'white',
                  borderColor: opt.color,
                  boxShadow: tab === idx ? 6 : 2,
                  transition: 'all 0.2s',
                  '&:hover': {
                    background: opt.color,
                    color: 'white',
                    boxShadow: 8,
                  },
                  mb: 1,
                }}
                startIcon={opt.icon}
              >
                {opt.label}
              </Button>
            </Grid>
          ))}
        </Grid>
      </Paper>
      {tab === 0 && <NotesTab childId={childId} schoolYear={schoolYear} />}
      {tab === 1 && <BulletinTab childId={childId} schoolYear={schoolYear} />}
      {tab === 2 && <AbsencesTab childId={childId} schoolYear={schoolYear} />}
      {tab === 3 && (
        <Box>
          {/* Affichage direct des deux emplois du temps */}
          <ScheduleTab 
            childId={childId} 
            schoolYear={schoolYear} 
          />
        </Box>
      )}
      {tab === 4 && <PhotoVideoTab childId={childId} schoolYear={schoolYear} user={user} />}
      {tab === 5 && <PaymentTab childId={childId} schoolYear={schoolYear} />}
    </Box>
  );
};

export default ParentChildProfile; 

