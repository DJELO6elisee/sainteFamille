import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Grid,
  Button,
  Card,
  CardContent,
  CardMedia,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  Alert,
  CircularProgress,
  Stack,
  Container,
  Tabs,
  Tab
} from '@mui/material';
import {
  CloudUpload as UploadIcon,
  Delete as DeleteIcon,
  Visibility as ViewIcon,
  Send as SendIcon,
  PhotoCamera as PhotoIcon,
  Videocam as VideoIcon,
  Group as GroupIcon,
  Person as PersonIcon
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import SecretarySidebar from '../../components/SecretarySidebar';

interface Media {
  id: number;
  filename: string;
  original_name: string;
  media_type: 'photo' | 'video';
  uploaded_at: string;
  description?: string;
  student_id?: number;
  student_name?: string;
  class_id?: number;
  class_name?: string;
}

interface Class {
  id: number;
  name: string;
  level: string;
  students_count: number;
}

const MediaManagementPage = () => {
  const navigate = useNavigate();
  const [media, setMedia] = useState<Media[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [openUpload, setOpenUpload] = useState(false);
  const [openView, setOpenView] = useState(false);
  const [selectedMedia, setSelectedMedia] = useState<Media | null>(null);
  const [students, setStudents] = useState<any[]>([]);
  const [classes, setClasses] = useState<Class[]>([]);
  const [selectedStudent, setSelectedStudent] = useState('');
  const [selectedClass, setSelectedClass] = useState('');
  const [description, setDescription] = useState('');
  const [mediaType, setMediaType] = useState<'photo' | 'video'>('photo');
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [sendTab, setSendTab] = useState(0); // 0: Classe, 1: Élève spécifique
  const [viewMode, setViewMode] = useState<'all' | 'byStudent'>('all'); // Mode d'affichage
  const [selectedStudentForView, setSelectedStudentForView] = useState('');
  const [mediaByStudent, setMediaByStudent] = useState<{[key: string]: Media[]}>({});

  useEffect(() => {
    let isMounted = true;
    
    const loadData = async () => {
      if (!isMounted) return;
      
      try {
        await fetchMedia();
        await fetchStudents();
        await fetchClasses();
      } catch (error) {
        if (isMounted) {
          console.error('Erreur lors du chargement des données:', error);
        }
      }
    };
    
    loadData();
    
    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    let isMounted = true;
    
    if (media.length > 0 && isMounted) {
      organizeMediaByStudent();
    }
    
    return () => {
      isMounted = false;
    };
  }, [media]);

  const fetchMedia = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get('https://saintefamilleexcellence.ci/api/media/admin/all', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setMedia(response.data);
    } catch (error) {
      console.error('Erreur lors de la récupération des médias:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStudents = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get('https://saintefamilleexcellence.ci/api/students?include_all=true', {
        headers: { Authorization: `Bearer ${token}` }
      });
      console.log('[DEBUG] Élèves récupérés pour les médias:', response.data.length);
      setStudents(response.data);
    } catch (error) {
      console.error('Erreur lors de la récupération des élèves:', error);
    }
  };

  const fetchClasses = async () => {
    try {
      const token = localStorage.getItem('token');
      const user = localStorage.getItem('user');
      console.log('[DEBUG] Récupération des classes...');
      console.log('[DEBUG] Token:', token);
      console.log('[DEBUG] User:', user);
      
      const response = await axios.get('https://saintefamilleexcellence.ci/api/classes', {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      console.log('[DEBUG] Réponse classes:', response.data);
      setClasses(response.data);
    } catch (error: any) {
      console.error('Erreur lors de la récupération des classes:', error);
      console.error('[DEBUG] Détails erreur:', error.response?.status, error.response?.data);
      console.error('[DEBUG] Message d\'erreur:', error.response?.data?.message);
    }
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setError('');
    }
  };

  const handleUpload = async () => {
    if (!file) {
      setError('Veuillez sélectionner un fichier');
      return;
    }

    setUploading(true);
    setError('');

    try {
      const formData = new FormData();
      formData.append('media', file);
      formData.append('media_type', mediaType);
      formData.append('description', description);
      
      // Ajouter l'ID de la classe ou de l'élève selon le tab sélectionné
      if (sendTab === 0 && selectedClass) {
        formData.append('class_id', selectedClass);
      } else if (sendTab === 1 && selectedStudent) {
        formData.append('student_id', selectedStudent);
      }

      const token = localStorage.getItem('token');
      await axios.post('https://saintefamilleexcellence.ci/api/media/upload', formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data'
        }
      });

      setSuccess('Média uploadé avec succès !');
      setOpenUpload(false);
      setFile(null);
      setDescription('');
      setSelectedStudent('');
      setSelectedClass('');
      setMediaType('photo');
      fetchMedia();

      setTimeout(() => setSuccess(''), 3000);
    } catch (error: any) {
      setError(error.response?.data?.message || 'Erreur lors de l\'upload');
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (mediaId: number) => {
    if (!window.confirm('Êtes-vous sûr de vouloir supprimer ce média ?')) return;

    try {
      const token = localStorage.getItem('token');
      await axios.delete(`https://saintefamilleexcellence.ci/api/media/${mediaId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setSuccess('Média supprimé avec succès !');
      fetchMedia();
      setTimeout(() => setSuccess(''), 3000);
    } catch (error: any) {
      setError(error.response?.data?.message || 'Erreur lors de la suppression');
    }
  };

  const handleSendToParents = async (mediaId: number) => {
    try {
      const token = localStorage.getItem('token');
      await axios.post(`https://saintefamilleexcellence.ci/api/media/${mediaId}/send-to-parents`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setSuccess('Média envoyé aux parents avec succès !');
      setTimeout(() => setSuccess(''), 3000);
    } catch (error: any) {
      setError(error.response?.data?.message || 'Erreur lors de l\'envoi');
    }
  };

  const getMediaUrl = (media: Media) => {
    const token = localStorage.getItem('token');
    return `https://saintefamilleexcellence.ci/api/media/${media.id}?token=${token}`;
  };

  const isVideo = (filename: string): boolean => {
    return filename.toLowerCase().match(/\.(mp4|avi|mov|wmv|flv|webm)$/) !== null;
  };

  const organizeMediaByStudent = () => {
    const organized: {[key: string]: Media[]} = {};
    
    media.forEach(item => {
      if (item.student_id && item.student_name) {
        const studentKey = `${item.student_id}-${item.student_name}`;
        if (!organized[studentKey]) {
          organized[studentKey] = [];
        }
        organized[studentKey].push(item);
      }
    });
    
    setMediaByStudent(organized);
  };

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      <SecretarySidebar />
      <Box component="main" sx={{ p: 3, flexGrow: 1, bgcolor: '#f0f7ff' }}>
        <Container maxWidth="lg">
          <Box sx={{ 
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            borderRadius: 3,
            p: 3,
            mb: 4,
            boxShadow: '0 8px 32px rgba(0,0,0,0.1)'
          }}>
            <Stack direction="row" justifyContent="space-between" alignItems="center">
              <Box>
                <Typography variant="h4" sx={{ 
                  fontWeight: 'bold', 
                  color: 'white',
                  textShadow: '0 2px 4px rgba(0,0,0,0.3)',
                  mb: 0.5
                }}>
                  📁 Gestion des Médias
                </Typography>
                <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.9)' }}>
                  Organisez et gérez tous vos médias par élève
            </Typography>
              </Box>
              <Stack direction="row" spacing={2}>
                <Button
                  variant={viewMode === 'all' ? 'contained' : 'outlined'}
                  onClick={() => setViewMode('all')}
                  sx={{ 
                    fontWeight: 600,
                    borderRadius: 2,
                    px: 3,
                    py: 1,
                    backgroundColor: viewMode === 'all' ? 'rgba(255,255,255,0.2)' : 'transparent',
                    color: 'white',
                    borderColor: 'rgba(255,255,255,0.3)',
                    '&:hover': {
                      backgroundColor: 'rgba(255,255,255,0.1)',
                      borderColor: 'rgba(255,255,255,0.5)'
                    }
                  }}
                >
                  📋 Tous les médias
                </Button>
                <Button
                  variant={viewMode === 'byStudent' ? 'contained' : 'outlined'}
                  onClick={() => setViewMode('byStudent')}
                  sx={{ 
                    fontWeight: 600,
                    borderRadius: 2,
                    px: 3,
                    py: 1,
                    backgroundColor: viewMode === 'byStudent' ? 'rgba(255,255,255,0.2)' : 'transparent',
                    color: 'white',
                    borderColor: 'rgba(255,255,255,0.3)',
                    '&:hover': {
                      backgroundColor: 'rgba(255,255,255,0.1)',
                      borderColor: 'rgba(255,255,255,0.5)'
                    }
                  }}
                >
                  👥 Par élève
                </Button>
            <Button
              variant="contained"
              startIcon={<UploadIcon />}
              onClick={() => setOpenUpload(true)}
                  sx={{ 
                    fontWeight: 600,
                    borderRadius: 2,
                    px: 3,
                    py: 1,
                    background: 'linear-gradient(45deg, #4CAF50 30%, #45a049 90%)',
                    boxShadow: '0 3px 15px rgba(76,175,80,0.3)',
                    '&:hover': {
                      background: 'linear-gradient(45deg, #45a049 30%, #4CAF50 90%)',
                      boxShadow: '0 5px 20px rgba(76,175,80,0.4)'
                    }
                  }}
                >
                  📤 Uploader
            </Button>
          </Stack>
            </Stack>
          </Box>

          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
          {success && <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>}

          {loading ? (
            <Box display="flex" justifyContent="center" p={4}>
              <CircularProgress />
            </Box>
          ) : (
            <>
              {viewMode === 'all' ? (
                <Grid container spacing={2}>
              {media.map((item) => (
                    <Grid item xs={12} sm={6} md={4} lg={3} key={item.id}>
                      <Card sx={{ 
                        height: '100%', 
                        position: 'relative', 
                        maxHeight: '280px',
                        borderRadius: 3,
                        boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
                        transition: 'all 0.3s ease',
                        '&:hover': {
                          transform: 'translateY(-4px)',
                          boxShadow: '0 8px 30px rgba(0,0,0,0.15)'
                        }
                      }}>
                    <CardMedia
                      component={isVideo(item.filename) ? 'video' : 'img'}
                          height="140"
                      image={getMediaUrl(item)}
                      alt={item.original_name}
                          sx={{ 
                            objectFit: 'cover',
                            borderTopLeftRadius: 12,
                            borderTopRightRadius: 12
                          }}
                      controls={isVideo(item.filename) ? true : undefined}
                    />
                        <CardContent sx={{ p: 1.5 }}>
                          <Typography variant="subtitle2" noWrap sx={{ 
                            fontSize: '0.875rem',
                            fontWeight: 600,
                            color: '#2c3e50'
                          }}>
                        {item.original_name}
                      </Typography>
                          <Typography variant="caption" color="text.secondary" sx={{ 
                            mb: 0.5,
                            display: 'block',
                            fontSize: '0.75rem'
                          }}>
                            📅 {new Date(item.uploaded_at).toLocaleDateString('fr-FR')}
                      </Typography>
                      {item.description && (
                            <Typography variant="caption" sx={{ 
                              mb: 0.5, 
                              display: 'block',
                              fontSize: '0.75rem',
                              color: '#7f8c8d'
                            }}>
                              📝 {item.description}
                        </Typography>
                      )}
                      {item.student_name && (
                        <Chip 
                              label={`👤 ${item.student_name}`} 
                          size="small" 
                          color="primary" 
                              sx={{ 
                                mb: 0.5, 
                                fontSize: '0.7rem',
                                borderRadius: 1,
                                backgroundColor: '#e3f2fd',
                                color: '#1976d2'
                              }}
                        />
                      )}
                      {item.class_name && (
                        <Chip 
                              label={`🏫 ${item.class_name}`} 
                          size="small" 
                          color="secondary" 
                              sx={{ 
                                mb: 0.5, 
                                fontSize: '0.7rem',
                                borderRadius: 1,
                                backgroundColor: '#f3e5f5',
                                color: '#7b1fa2'
                              }}
                            />
                          )}
                          <Stack direction="row" spacing={0.5} sx={{ mt: 1 }}>
                            <IconButton
                              size="small"
                              onClick={() => {
                                setSelectedMedia(item);
                                setOpenView(true);
                              }}
                              sx={{
                                color: '#3498db',
                                '&:hover': {
                                  backgroundColor: '#e3f2fd',
                                  transform: 'scale(1.1)'
                                }
                              }}
                            >
                              <ViewIcon />
                            </IconButton>
                            <IconButton
                              size="small"
                              color="primary"
                              onClick={() => handleSendToParents(item.id)}
                              sx={{
                                color: '#27ae60',
                                '&:hover': {
                                  backgroundColor: '#e8f5e8',
                                  transform: 'scale(1.1)'
                                }
                              }}
                            >
                              <SendIcon />
                            </IconButton>
                            <IconButton
                              size="small"
                              color="error"
                              onClick={() => handleDelete(item.id)}
                              sx={{
                                color: '#e74c3c',
                                '&:hover': {
                                  backgroundColor: '#ffebee',
                                  transform: 'scale(1.1)'
                                }
                              }}
                            >
                              <DeleteIcon />
                            </IconButton>
                          </Stack>
                        </CardContent>
                      </Card>
                    </Grid>
                  ))}
                </Grid>
              ) : (
                <Box>
                  {/* Sélecteur d'élève */}
                  <FormControl fullWidth sx={{ mb: 3 }}>
                    <InputLabel>Sélectionner un élève</InputLabel>
                    <Select
                      value={selectedStudentForView}
                      onChange={(e) => setSelectedStudentForView(e.target.value)}
                      label="Sélectionner un élève"
                    >
                      <MenuItem value="">Tous les élèves</MenuItem>
                      {Object.keys(mediaByStudent).map((studentKey) => {
                        const [studentId, studentName] = studentKey.split('-');
                        return (
                          <MenuItem key={studentKey} value={studentKey}>
                            {studentName} ({mediaByStudent[studentKey].length} médias)
                          </MenuItem>
                        );
                      })}
                    </Select>
                  </FormControl>

                  {/* Affichage par élève */}
                  {Object.keys(mediaByStudent).map((studentKey) => {
                    const [studentId, studentName] = studentKey.split('-');
                    const studentMedia = mediaByStudent[studentKey];
                    
                    // Filtrer si un élève spécifique est sélectionné
                    if (selectedStudentForView && selectedStudentForView !== studentKey) {
                      return null;
                    }

                    return (
                      <Box key={studentKey} sx={{ mb: 4 }}>
                                                 <Box sx={{
                           background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                           borderRadius: 2,
                           p: 2,
                           mb: 3,
                           boxShadow: '0 4px 20px rgba(0,0,0,0.1)'
                         }}>
                           <Typography variant="h5" sx={{ 
                             mb: 0.5, 
                             color: 'white', 
                             fontWeight: 'bold',
                             textShadow: '0 2px 4px rgba(0,0,0,0.3)'
                           }}>
                             📁 Dossier de {studentName}
                           </Typography>
                           <Typography variant="body2" sx={{ 
                             color: 'rgba(255,255,255,0.9)',
                             fontSize: '0.9rem'
                           }}>
                             {studentMedia.length} média{studentMedia.length > 1 ? 's' : ''} disponible{studentMedia.length > 1 ? 's' : ''}
                           </Typography>
                         </Box>
                        <Grid container spacing={2}>
                          {studentMedia.map((item) => (
                            <Grid item xs={12} sm={6} md={4} lg={3} key={item.id}>
                                                               <Card sx={{ 
                                   height: '100%', 
                                   position: 'relative', 
                                   maxHeight: '280px',
                                   borderRadius: 3,
                                   boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
                                   transition: 'all 0.3s ease',
                                   '&:hover': {
                                     transform: 'translateY(-4px)',
                                     boxShadow: '0 8px 30px rgba(0,0,0,0.15)'
                                   }
                                 }}>
                                   <CardMedia
                                     component={isVideo(item.filename) ? 'video' : 'img'}
                                     height="140"
                                     image={getMediaUrl(item)}
                                     alt={item.original_name}
                                     sx={{ 
                                       objectFit: 'cover',
                                       borderTopLeftRadius: 12,
                                       borderTopRightRadius: 12
                                     }}
                                     controls={isVideo(item.filename) ? true : undefined}
                                   />
                                   <CardContent sx={{ p: 1.5 }}>
                                     <Typography variant="subtitle2" noWrap sx={{ 
                                       fontSize: '0.875rem',
                                       fontWeight: 600,
                                       color: '#2c3e50'
                                     }}>
                                       {item.original_name}
                                     </Typography>
                                     <Typography variant="caption" color="text.secondary" sx={{ 
                                       mb: 0.5,
                                       display: 'block',
                                       fontSize: '0.75rem'
                                     }}>
                                       📅 {new Date(item.uploaded_at).toLocaleDateString('fr-FR')}
                                     </Typography>
                                     {item.description && (
                                       <Typography variant="caption" sx={{ 
                                         mb: 0.5, 
                                         display: 'block',
                                         fontSize: '0.75rem',
                                         color: '#7f8c8d'
                                       }}>
                                         📝 {item.description}
                                       </Typography>
                                     )}
                                     <Stack direction="row" spacing={0.5} sx={{ mt: 1 }}>
                        <IconButton
                          size="small"
                          onClick={() => {
                            setSelectedMedia(item);
                            setOpenView(true);
                          }}
                        >
                          <ViewIcon />
                        </IconButton>
                        <IconButton
                          size="small"
                          color="primary"
                          onClick={() => handleSendToParents(item.id)}
                        >
                          <SendIcon />
                        </IconButton>
                        <IconButton
                          size="small"
                          color="error"
                          onClick={() => handleDelete(item.id)}
                        >
                          <DeleteIcon />
                        </IconButton>
                      </Stack>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
                      </Box>
                    );
                  })}
                </Box>
              )}
            </>
          )}

          {/* Dialog d'upload */}
          <Dialog open={openUpload} onClose={() => setOpenUpload(false)} maxWidth="sm" fullWidth>
            <DialogTitle>Uploader un média</DialogTitle>
            <DialogContent>
              <Stack spacing={3} sx={{ mt: 1 }}>
                <FormControl fullWidth>
                  <InputLabel>Type de média</InputLabel>
                  <Select
                    value={mediaType}
                    onChange={(e) => setMediaType(e.target.value as 'photo' | 'video')}
                    label="Type de média"
                  >
                    <MenuItem value="photo">Photo</MenuItem>
                    <MenuItem value="video">Vidéo</MenuItem>
                  </Select>
                </FormControl>

                <Box>
                  <Tabs value={sendTab} onChange={(e, newValue) => setSendTab(newValue)}>
                    <Tab 
                      icon={<GroupIcon />} 
                      label="Envoyer à une classe" 
                      iconPosition="start"
                    />
                    <Tab 
                      icon={<PersonIcon />} 
                      label="Envoyer à un élève" 
                      iconPosition="start"
                    />
                  </Tabs>
                </Box>

                {sendTab === 0 ? (
                  <FormControl fullWidth>
                    <InputLabel>Classe</InputLabel>
                    <Select
                      value={selectedClass}
                      onChange={(e) => setSelectedClass(e.target.value)}
                      label="Classe"
                    >
                      <MenuItem value="">Sélectionner une classe</MenuItem>
                      {classes.map((cls) => (
                        <MenuItem key={cls.id} value={cls.id}>
                          {cls.name} ({cls.students_count} élèves)
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                ) : (
                  <FormControl fullWidth>
                    <InputLabel>Élève</InputLabel>
                    <Select
                      value={selectedStudent}
                      onChange={(e) => setSelectedStudent(e.target.value)}
                      label="Élève"
                    >
                      <MenuItem value="">Sélectionner un élève</MenuItem>
                      {students.map((student) => (
                        <MenuItem key={student.id} value={student.id}>
                          {student.first_name} {student.last_name}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                )}

                <TextField
                  fullWidth
                  label="Description (optionnel)"
                  multiline
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />

                <Box>
                  <input
                    accept={mediaType === 'photo' ? 'image/*' : 'video/*'}
                    style={{ display: 'none' }}
                    id="media-upload"
                    type="file"
                    onChange={handleFileChange}
                  />
                  <label htmlFor="media-upload">
                    <Button
                      variant="outlined"
                      component="span"
                      startIcon={mediaType === 'photo' ? <PhotoIcon /> : <VideoIcon />}
                      fullWidth
                      sx={{ py: 2 }}
                    >
                      {file ? file.name : `Sélectionner un ${mediaType === 'photo' ? 'image' : 'vidéo'}`}
                    </Button>
                  </label>
                </Box>
              </Stack>
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setOpenUpload(false)}>Annuler</Button>
              <Button
                onClick={handleUpload}
                variant="contained"
                disabled={!file || uploading || (sendTab === 0 && !selectedClass) || (sendTab === 1 && !selectedStudent)}
                startIcon={uploading ? <CircularProgress size={20} /> : <UploadIcon />}
              >
                {uploading ? 'Upload en cours...' : 'Uploader'}
              </Button>
            </DialogActions>
          </Dialog>

          {/* Dialog de visualisation */}
          <Dialog open={openView} onClose={() => setOpenView(false)} maxWidth="md" fullWidth>
            {selectedMedia && (
              <>
                <DialogTitle>{selectedMedia.original_name}</DialogTitle>
                <DialogContent>
                  <Box sx={{ textAlign: 'center' }}>
                    {isVideo(selectedMedia.filename) ? (
                      <video
                        controls
                        width="100%"
                        src={getMediaUrl(selectedMedia)}
                        style={{ maxHeight: '70vh' }}
                      />
                    ) : (
                      <img
                        src={getMediaUrl(selectedMedia)}
                        alt={selectedMedia.original_name}
                        style={{ maxWidth: '100%', maxHeight: '70vh', objectFit: 'contain' }}
                      />
                    )}
                    {selectedMedia.description && (
                      <Typography sx={{ mt: 2 }}>
                        {selectedMedia.description}
                      </Typography>
                    )}
                  </Box>
                </DialogContent>
                <DialogActions>
                  <Button onClick={() => setOpenView(false)}>Fermer</Button>
                  <Button
                    variant="contained"
                    onClick={() => {
                      handleSendToParents(selectedMedia.id);
                      setOpenView(false);
                    }}
                    startIcon={<SendIcon />}
                  >
                    Envoyer aux parents
                  </Button>
                </DialogActions>
              </>
            )}
          </Dialog>
        </Container>
      </Box>
    </Box>
  );
};

export default MediaManagementPage; 

