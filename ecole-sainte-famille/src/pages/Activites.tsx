import React, { useState, useCallback, useEffect } from 'react';
import {
  Box,
  Container,
  Typography,
  useTheme,
  useMediaQuery,
  Menu,
  MenuItem,
  IconButton,
  Dialog,
  DialogContent,
} from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { ContactBanner, SiteFooter } from './Home';
import MenuIcon from '@mui/icons-material/Menu';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import CloseIcon from '@mui/icons-material/Close';

type NavSubItem = { label: string; path: string };
interface NavItem {
  label: string;
  path: string;
  isScroll?: boolean;
  hasSubmenu?: boolean;
  submenu?: NavSubItem[];
}

interface ActivityItem {
  title: string;
  image: string;
  images: string[];
  description: string;
}

interface GalleryModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  images: string[];
  initialIndex?: number;
}

const GalleryModal = ({ open, onClose, title, images, initialIndex = 0 }: GalleryModalProps) => {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  useEffect(() => {
    setCurrentIndex(initialIndex);
  }, [initialIndex, open]);

  const goNext = useCallback(() => {
    setCurrentIndex((i) => (i + 1) % images.length);
  }, [images.length]);

  const goPrev = useCallback(() => {
    setCurrentIndex((i) => (i - 1 + images.length) % images.length);
  }, [images.length]);

  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowRight') goNext();
      if (e.key === 'ArrowLeft') goPrev();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose, goNext, goPrev]);

  if (!images.length) return null;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth={false}
      fullScreen={isMobile}
      PaperProps={{
        sx: {
          bgcolor: 'rgba(0,0,0,0.92)',
          maxWidth: isMobile ? '100%' : '90vw',
          maxHeight: isMobile ? '100%' : '90vh',
          m: isMobile ? 0 : 2,
          borderRadius: isMobile ? 0 : 2,
          boxShadow: 24,
        },
      }}
      BackdropProps={{ sx: { bgcolor: 'rgba(0,0,0,0.85)' } }}
    >
      <DialogContent
        sx={{
          p: 0,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
          overflow: 'hidden',
          minHeight: isMobile ? '100vh' : 400,
        }}
      >
        <IconButton
          onClick={onClose}
          sx={{
            position: 'absolute',
            top: 8,
            right: 8,
            color: 'white',
            zIndex: 2,
            '&:hover': { bgcolor: 'rgba(255,255,255,0.1)' },
          }}
          size="large"
        >
          <CloseIcon />
        </IconButton>

        <Typography
          sx={{
            position: 'absolute',
            top: 16,
            left: '50%',
            transform: 'translateX(-50%)',
            color: 'white',
            fontWeight: 600,
            fontSize: { xs: 14, sm: 16 },
            zIndex: 2,
          }}
        >
          {title} — {currentIndex + 1} / {images.length}
        </Typography>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, width: '100%', flex: 1, px: { xs: 0, sm: 6 } }}>
          {images.length > 1 && (
            <IconButton
              onClick={goPrev}
              sx={{
                color: 'white',
                '&:hover': { bgcolor: 'rgba(255,255,255,0.15)' },
                flexShrink: 0,
              }}
              size="large"
            >
              <ChevronLeftIcon fontSize="large" />
            </IconButton>
          )}

          <Box
            sx={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              minHeight: { xs: 250, sm: 400 },
              overflow: 'hidden',
            }}
          >
            <img
              src={images[currentIndex]}
              alt={`${title} ${currentIndex + 1}`}
              style={{
                maxWidth: '100%',
                maxHeight: isMobile ? '70vh' : '80vh',
                objectFit: 'contain',
                borderRadius: 8,
              }}
            />
          </Box>

          {images.length > 1 && (
            <IconButton
              onClick={goNext}
              sx={{
                color: 'white',
                '&:hover': { bgcolor: 'rgba(255,255,255,0.15)' },
                flexShrink: 0,
              }}
              size="large"
            >
              <ChevronRightIcon fontSize="large" />
            </IconButton>
          )}
        </Box>

        {images.length > 1 && (
          <Box sx={{ display: 'flex', gap: 0.5, pb: 2, flexWrap: 'wrap', justifyContent: 'center' }}>
            {images.map((_, idx) => (
              <Box
                key={idx}
                onClick={() => setCurrentIndex(idx)}
                sx={{
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  bgcolor: idx === currentIndex ? '#FF9800' : 'rgba(255,255,255,0.4)',
                  cursor: 'pointer',
                  '&:hover': { bgcolor: idx === currentIndex ? '#FF9800' : 'rgba(255,255,255,0.7)' },
                }}
              />
            ))}
          </Box>
        )}
      </DialogContent>
    </Dialog>
  );
};

// Composant de navigation avec onglets (réutilisé de Home.tsx)
const NavigationBar = () => {
  const [mobileMenuAnchor, setMobileMenuAnchor] = useState<null | HTMLElement>(null);
  const [scolariteMenuAnchor, setScolariteMenuAnchor] = useState<null | HTMLElement>(null);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const handleMobileMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setMobileMenuAnchor(event.currentTarget);
  };

  const handleMobileMenuClose = () => {
    setMobileMenuAnchor(null);
  };

  const handleScolariteMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setScolariteMenuAnchor(event.currentTarget);
  };

  const handleScolariteMenuClose = () => {
    setScolariteMenuAnchor(null);
  };

  const handleContactsClick = () => {
    const footerElement = document.getElementById('footer');
    if (footerElement) {
      footerElement.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const navigationItems: NavItem[] = [
    { label: 'ACCUEIL', path: '/' },
    { label: 'PRESENTATION', path: '/presentation' },
    // { 
    //   label: 'SCOLARITE', 
    //   path: '/scolarite',
    //   hasSubmenu: true,
    //   submenu: [
    //     { label: 'CRÈCHE/GARDERIE', path: '/scolarite' },
    //     { label: 'MATERNELLE', path: '/scolarite-maternel' }
    //   ]
    // },
    { label: 'NOS ACTIVITES', path: '/activites' },
    // { label: 'BLOG', path: '/blog' },
    { label: 'CONTACTS', path: '#footer', isScroll: true },
    { label: 'CONNEXION', path: '/login' },
  ];

  return (
    <Box 
      position="absolute" 
      sx={{ 
        bgcolor: 'transparent',
        boxShadow: 'none',
        zIndex: 10,
        top: '60px',
        width: '100%'
      }}
    >
      <Container maxWidth="lg">
        <Box sx={{ 
          display: 'flex',
          justifyContent: { xs: 'flex-end', md: 'space-between' },
          alignItems: 'center',
          py: { xs: 1, md: 2 },
          px: { xs: 2, md: 0 },
          minHeight: { xs: 56, md: 64 }
        }}>
          {/* Logo - Masqué sur mobile */}
          <Box sx={{ 
            display: { xs: 'none', md: 'flex' },
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <Box sx={{
              width: 60,
              height: 60,
              border: '2px solid #87CEEB',
              borderRadius: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              bgcolor: 'white',
              overflow: 'hidden',
              p: 0.5,
              boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
            }}>
              <img
                src="/img/sainte/logo.jpg"
                alt="GROUPE SCOLAIRE SAINTE FAMILLE L'EXECELLENCE GROUPE SCOLAIRE SAINTE FAMILLE L'EXECELLENCE"
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'contain',
                  display: 'block'
                }}
              />
            </Box>
          </Box>

          {/* Navigation Desktop */}
          {!isMobile && (
            <Box sx={{ 
              display: 'flex', 
              gap: { md: 2, lg: 3 },
              alignItems: 'center'
            }}>
              {navigationItems.map((item) => (
                <Box key={item.label}>
                  {item.hasSubmenu ? (
                    <>
                      <Typography
                        onClick={handleScolariteMenuOpen}
                        sx={{
                          color: 'white',
                          fontWeight: 600,
                          fontSize: { md: 12, lg: 14 },
                          textTransform: 'uppercase',
                          letterSpacing: 0.5,
                          px: { md: 1.5, lg: 2 },
                          py: 1,
                          borderBottom: '2px solid transparent',
                          cursor: 'pointer',
                          '&:hover': {
                            color: '#FF9800',
                            borderBottom: '2px solid #FF9800',
                          }
                        }}
                      >
                        {item.label}
                      </Typography>
                      <Menu
                        anchorEl={scolariteMenuAnchor}
                        open={Boolean(scolariteMenuAnchor)}
                        onClose={handleScolariteMenuClose}
                        sx={{
                          '& .MuiPaper-root': {
                            bgcolor: 'rgba(23, 128, 194, 0.95)',
                            color: 'white',
                            mt: 1,
                            backdropFilter: 'blur(10px)',
                            minWidth: 200
                          }
                        }}
                      >
                        {item.submenu?.map((subItem) => (
                          <MenuItem
                            key={subItem.label}
                            component={RouterLink}
                            to={subItem.path}
                            onClick={handleScolariteMenuClose}
                            sx={{
                              color: 'white',
                              fontWeight: 600,
                              fontSize: 14,
                              textTransform: 'uppercase',
                              '&:hover': {
                                bgcolor: 'rgba(255, 255, 255, 0.1)',
                              }
                            }}
                          >
                            {subItem.label}
                          </MenuItem>
                        ))}
                      </Menu>
                    </>
                  ) : item.isScroll ? (
                    <Typography
                      onClick={handleContactsClick}
                      sx={{
                        color: 'white',
                        fontWeight: 600,
                        fontSize: { md: 12, lg: 14 },
                        textTransform: 'uppercase',
                        letterSpacing: 0.5,
                        px: { md: 1.5, lg: 2 },
                        py: 1,
                        borderBottom: '2px solid transparent',
                        cursor: 'pointer',
                        '&:hover': {
                          color: '#FF9800',
                          borderBottom: '2px solid #FF9800',
                        }
                      }}
                    >
                      {item.label}
                    </Typography>
                  ) : (
                    <Typography
                      component={RouterLink}
                      to={item.path}
                      sx={{
                        color: item.label === 'NOS ACTIVITES' ? '#FF9800' : 'white',
                        fontWeight: 600,
                        fontSize: { md: 12, lg: 14 },
                        textTransform: 'uppercase',
                        letterSpacing: 0.5,
                        px: { md: 1.5, lg: 2 },
                        py: 1,
                        borderBottom: item.label === 'NOS ACTIVITES' ? '2px solid #FF9800' : '2px solid transparent',
                        cursor: 'pointer',
                        textDecoration: 'none',
                        '&:hover': {
                          color: '#FF9800',
                          borderBottom: '2px solid #FF9800',
                        }
                      }}
                    >
                      {item.label}
                    </Typography>
                  )}
                </Box>
              ))}
            </Box>
          )}

          {/* Menu Mobile */}
          {isMobile && (
            <>
              <IconButton
                color="inherit"
                onClick={handleMobileMenuOpen}
                sx={{ color: 'white' }}
              >
                <MenuIcon />
              </IconButton>
              <Menu
                anchorEl={mobileMenuAnchor}
                open={Boolean(mobileMenuAnchor)}
                onClose={handleMobileMenuClose}
                sx={{
                  '& .MuiPaper-root': {
                    bgcolor: 'rgba(23, 128, 194, 0.95)',
                    color: 'white',
                    mt: 1,
                    backdropFilter: 'blur(10px)'
                  }
                }}
              >
                {navigationItems.map((item) => (
                  <Box key={item.label}>
                    {item.hasSubmenu ? (
                      <>
                        <MenuItem
                          onClick={handleScolariteMenuOpen}
                          sx={{
                            color: 'white',
                            fontWeight: 600,
                            fontSize: 14,
                            textTransform: 'uppercase',
                            '&:hover': {
                              bgcolor: 'rgba(255, 255, 255, 0.1)',
                            }
                          }}
                        >
                          {item.label}
                          <KeyboardArrowDownIcon sx={{ ml: 0.5, fontSize: 16 }} />
                        </MenuItem>
                        <Menu
                          anchorEl={scolariteMenuAnchor}
                          open={Boolean(scolariteMenuAnchor)}
                          onClose={handleScolariteMenuClose}
                          sx={{
                            '& .MuiPaper-root': {
                              bgcolor: 'rgba(23, 128, 194, 0.95)',
                              color: 'white',
                              mt: 1,
                              backdropFilter: 'blur(10px)',
                              minWidth: 200
                            }
                          }}
                        >
                          {item.submenu?.map((subItem) => (
                            <MenuItem
                              key={subItem.label}
                              component={RouterLink}
                              to={subItem.path}
                              onClick={() => {
                                handleScolariteMenuClose();
                                handleMobileMenuClose();
                              }}
                              sx={{
                                color: 'white',
                                fontWeight: 600,
                                fontSize: 14,
                                textTransform: 'uppercase',
                                '&:hover': {
                                  bgcolor: 'rgba(255, 255, 255, 0.1)',
                                }
                              }}
                            >
                              {subItem.label}
                            </MenuItem>
                          ))}
                        </Menu>
                      </>
                    ) : item.isScroll ? (
                      <MenuItem
                        onClick={() => {
                          handleContactsClick();
                          handleMobileMenuClose();
                        }}
                        sx={{
                          color: 'white',
                          fontWeight: 600,
                          fontSize: 14,
                          textTransform: 'uppercase',
                          '&:hover': {
                            bgcolor: 'rgba(255, 255, 255, 0.1)',
                          }
                        }}
                      >
                        {item.label}
                      </MenuItem>
                    ) : (
                      <MenuItem
                        component={RouterLink}
                        to={item.path}
                        onClick={handleMobileMenuClose}
                        sx={{
                          color: item.label === 'NOS ACTIVITES' ? '#FF9800' : 'white',
                          fontWeight: 600,
                          fontSize: 14,
                          textTransform: 'uppercase',
                          '&:hover': {
                            bgcolor: 'rgba(255, 255, 255, 0.1)',
                          }
                        }}
                      >
                        {item.label}
                      </MenuItem>
                    )}
                  </Box>
                ))}
              </Menu>
            </>
          )}
        </Box>
      </Container>
    </Box>
  );
};

// Section Hero basée sur l'image
const HeroSection = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  return (
    <Box sx={{
      position: 'relative',
      width: '100%',
      height: '100vh',
      backgroundImage: 'url(/img/sainte/bat.jpg)', // Image de fond du bâtiment
      backgroundSize: 'cover',
      backgroundPosition: 'center',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      overflow: 'hidden'
    }}>
      {/* Overlay sombre semi-transparent */}
      <Box sx={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        bgcolor: 'rgba(0, 0, 0, 0.6)', // Overlay sombre comme sur l'image
        zIndex: 1
      }} />

      {/* Texte de fond "GROUPE SCOLAIRE SAINTE FAMILLE L'EXECELLENCE GROUPE SCOLAIRE SAINTE FAMILLE L'EXECELLENCE" */}
      <Typography
        sx={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          color: 'rgba(0, 0, 0, 0.8)',
          fontSize: { xs: 24, md: 36, lg: 48 },
          fontWeight: 'bold',
          textAlign: 'center',
          zIndex: 1,
          fontFamily: 'Arial, sans-serif',
          letterSpacing: 1,
          textShadow: 'none'
        }}
      >
      </Typography>

      {/* Contenu principal - Texte blanc en avant-plan */}
      <Box sx={{
        position: 'relative',
        zIndex: 3,
        textAlign: 'center',
        color: 'white'
      }}>
        {/* Titre principal "NOS ACTIVITES" */}
        <Typography
          variant="h1"
          sx={{
            color: 'white',
            fontWeight: 'bold',
            fontSize: { xs: 32, md: 48, lg: 64 },
            textShadow: '2px 2px 4px rgba(0,0,0,0.8)',
            mb: 3,
            textTransform: 'uppercase',
            letterSpacing: 2,
            fontFamily: 'Arial, sans-serif'
          }}
        >
          NOS ACTIVITES
        </Typography>
        
        {/* Sous-titres */}
        <Box sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 1
        }}>
          <Typography
            variant="h4"
            sx={{
              color: 'white',
              fontWeight: 600,
              fontSize: { xs: 18, md: 24, lg: 28 },
              textShadow: '2px 2px 4px rgba(0,0,0,0.8)',
              textTransform: 'uppercase',
              letterSpacing: 1,
              fontFamily: 'Arial, sans-serif'
            }}
          >
            VIE ACADÉMIQUE
          </Typography>
          
          <Typography
            variant="h4"
            sx={{
              color: 'white',
              fontWeight: 600,
              fontSize: { xs: 18, md: 24, lg: 28 },
              textShadow: '2px 2px 4px rgba(0,0,0,0.8)',
              textTransform: 'uppercase',
              letterSpacing: 1,
              fontFamily: 'Arial, sans-serif'
            }}
          >
            MOMENTS FORTS
          </Typography>
        </Box>
      </Box>
    </Box>
  );
};

// Section VIE ACADÉMIQUE avec les 4 images
const ActivitiesContent = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [galleryOpen, setGalleryOpen] = useState(false);
  const [galleryActivity, setGalleryActivity] = useState<ActivityItem | null>(null);

  const activities: ActivityItem[] = [
    {
      title: "Sortie à lhopital général de Yopougon",
      image: "/img/sainte/hopital.jpg",
      images: ["/img/sainte/hopital1.jpg", "/img/sainte/hopital.jpg"],
      description: "Découverte de l'hopital général de Yopougon"
    },
    {
      title: "Sortie chez les sapeurs pompiers",
      image: "/img/sainte/pompier1.jpg",
      images: ["/img/sainte/pompier2.jpg", "/img/sainte/pompier3.jpg", "/img/sainte/pompier4.jpg"],
      description: "Visite des sapeurs pompiers pour découvrir leur travail"
    },
    {
      title: "Découverte de la culture des plantes",
      image: "/img/sainte/plante1.jpg",
      images: ["/img/sainte/plante2.jpg", "/img/sainte/plante1.jpg"],
      description: "Découverte de la culture des plantes"
    },
    {
      title: "Activités extrascolaires",
      image: "/img/sainte/extrascolaire1.jpg",
      images: ["/img/sainte/extrascolaire2.jpg", "/img/sainte/extrascolaire3.jpg", "/img/sainte/extrascolaire4.jpg"],
      description: "Découverte d'activités extrascolaires"
    }
  ];

  const openGallery = (activity: ActivityItem) => {
    setGalleryActivity(activity);
    setGalleryOpen(true);
  };

  return (
    <Box sx={{
      bgcolor: 'white',
      py: { xs: 6, md: 8 },
      position: 'relative',
      overflow: 'hidden'
    }}>
      {/* Motifs décoratifs en arrière-plan */}
      <Box sx={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundImage: 'url(/img/pages/doodles.png)', // Image avec nuages, voitures, étoiles
        backgroundSize: '200px',
        backgroundRepeat: 'repeat',
        opacity: 0.1,
        zIndex: 0
      }} />

      <Container maxWidth="lg" sx={{ position: 'relative', zIndex: 1 }}>
        {/* Titre principal */}
        <Typography
          variant="h2"
          sx={{
            color: '#1780c2',
            fontWeight: 700,
            fontSize: { xs: 28, md: 36, lg: 42 },
            textAlign: 'center',
            mb: 6,
            fontFamily: 'Arial, sans-serif'
          }}
        >
          VIE ACADÉMIQUE
        </Typography>

        {/* Grille des 4 images */}
        <Box sx={{
          display: 'grid',
          gridTemplateColumns: { 
            xs: '1fr', 
            sm: 'repeat(2, 1fr)', 
            md: 'repeat(4, 1fr)' 
          },
          gap: { xs: 3, md: 4 },
          alignItems: 'start'
        }}>
          {activities.map((activity, index) => (
            <Box
              key={index}
              sx={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                textAlign: 'center'
              }}
            >
              {/* Image de l'activité - cliquable pour ouvrir la galerie */}
              <Box
                onClick={() => openGallery(activity)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => e.key === 'Enter' && openGallery(activity)}
                sx={{
                  width: '100%',
                  height: { xs: 200, sm: 250, md: 300 },
                  overflow: 'hidden',
                  borderRadius: 2,
                  border: '3px solid #1780c2',
                  mb: 2,
                  position: 'relative',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                  cursor: 'pointer',
                  '&:hover': { opacity: 0.9, boxShadow: '0 6px 16px rgba(23,128,194,0.3)' },
                  '&::after': {
                    content: '"Voir plus d\'images"',
                    position: 'absolute',
                    bottom: 0,
                    left: 0,
                    right: 0,
                    py: 0.75,
                    bgcolor: 'rgba(23,128,194,0.85)',
                    color: 'white',
                    fontSize: 12,
                    fontWeight: 600,
                    textAlign: 'center',
                    opacity: 0,
                    transition: 'opacity 0.2s',
                  },
                  '&:hover::after': { opacity: 1 },
                }}
              >
                <img
                  src={activity.image}
                  alt={activity.title}
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                    display: 'block'
                  }}
                />
              </Box>

              {/* Titre de l'activité */}
              <Typography
                variant="h6"
                sx={{
                  color: '#1780c2',
                  fontWeight: 700,
                  fontSize: { xs: 14, md: 16 },
                  fontFamily: 'Arial, sans-serif',
                  lineHeight: 1.3,
                  textAlign: 'center',
                  mb: 1,
                  minHeight: { xs: 'auto', md: '40px' },
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                {activity.title}
              </Typography>

              {/* Description (optionnelle, peut être masquée sur mobile) */}
              <Typography
                variant="body2"
                sx={{
                  color: '#666',
                  fontSize: { xs: 12, md: 14 },
                  lineHeight: 1.4,
                  textAlign: 'center',
                  display: { xs: 'none', md: 'block' }
                }}
              >
                {activity.description}
              </Typography>
            </Box>
          ))}
        </Box>

        {galleryActivity && (
          <GalleryModal
            open={galleryOpen}
            onClose={() => { setGalleryOpen(false); setGalleryActivity(null); }}
            title={galleryActivity.title}
            images={galleryActivity.images}
          />
        )}
      </Container>
    </Box>
  );
};

// Section MOMENTS FORTS avec les 4 cartes d'activités
const MomentsFortsSection = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [galleryOpen, setGalleryOpen] = useState(false);
  const [galleryActivity, setGalleryActivity] = useState<ActivityItem | null>(null);

  const momentsForts: ActivityItem[] = [
    {
      title: "Cérémonie de graduation promotion 2025",
      image: "/img/sainte/graduation.jpg",
      images: ["/img/sainte/graduation1.jpg", "/img/sainte/graduation.jpg", "/img/sainte/graduation2.jpg", "/img/sainte/graduation3.jpg"],
      description: "Célébration des réussites et passage vers la maternelle"
    },
    {
      title: "Journée mondiale de l'enfance",
      image: "/img/sainte/enfance.jpg",
      images: ["/img/sainte/enfance.jpg", "/img/sainte/enfance1.jpg", "/img/sainte/enfance2.jpg", "/img/sainte/enfance3.jpg"],
      description: "Journée mondiale de l'enfance"
    },
    {
      title: "Journée des stars",
      image: "/img/sainte/star.jpg",
      images: ["/img/sainte/star.jpg", "/img/sainte/star1.jpg", "/img/sainte/star2.jpg"],
      description: "Les enfants se transforment en vedettes le temps d'une journée"
    },
    {
      title: "Piscine party",
      image: "/img/sainte/piscine.jpg",
      images: ["/img/sainte/piscine.jpg", "/img/sainte/piscine1.jpg", "/img/sainte/piscine2.jpg", "/img/sainte/piscine3.jpg"],
      description: "Jeux aquatiques et moments de détente en piscine"
    }
  ];

  const openGallery = (activity: ActivityItem) => {
    setGalleryActivity(activity);
    setGalleryOpen(true);
  };

  return (
    <Box sx={{
      bgcolor: '#f8f9fa',
      pt: { xs: 6, md: 8 },
      pb: 0,
      position: 'relative',
      overflow: 'hidden'
    }}>
      {/* Motifs décoratifs en arrière-plan */}
      <Box sx={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundImage: 'url(/img/pages/doodles.png)', // Motifs légers
        backgroundSize: '200px',
        backgroundRepeat: 'repeat',
        opacity: 0.05,
        zIndex: 0
      }} />

      <Container maxWidth="lg" sx={{ position: 'relative', zIndex: 1 }}>
        {/* Titre principal */}
        <Typography
          variant="h2"
          sx={{
            color: '#1780c2',
            fontWeight: 700,
            fontSize: { xs: 28, md: 36, lg: 42 },
            textAlign: 'center',
            mb: 6,
            fontFamily: 'Arial, sans-serif'
          }}
        >
          MOMENTS FORTS
        </Typography>

        {/* Grille des 4 cartes */}
        <Box sx={{
          display: 'grid',
          gridTemplateColumns: { 
            xs: '1fr', 
            sm: 'repeat(2, 1fr)', 
            md: 'repeat(4, 1fr)' 
          },
          gap: { xs: 3, md: 4 },
          alignItems: 'start'
        }}>
          {momentsForts.map((moment, index) => (
            <Box
              key={index}
              sx={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                textAlign: 'center'
              }}
            >
              {/* Image de l'activité - cliquable pour ouvrir la galerie */}
              <Box
                onClick={() => openGallery(moment)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => e.key === 'Enter' && openGallery(moment)}
                sx={{
                  width: '100%',
                  height: { xs: 200, sm: 250, md: 300 },
                  overflow: 'hidden',
                  borderRadius: 2,
                  border: '2px solid #1780c2',
                  mb: 2,
                  position: 'relative',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                  cursor: 'pointer',
                  '&:hover': { opacity: 0.9, boxShadow: '0 6px 16px rgba(23,128,194,0.3)' },
                  '&::after': {
                    content: '"Voir plus d\'images"',
                    position: 'absolute',
                    bottom: 0,
                    left: 0,
                    right: 0,
                    py: 0.75,
                    bgcolor: 'rgba(23,128,194,0.85)',
                    color: 'white',
                    fontSize: 12,
                    fontWeight: 600,
                    textAlign: 'center',
                    opacity: 0,
                    transition: 'opacity 0.2s',
                  },
                  '&:hover::after': { opacity: 1 },
                }}
              >
                <img
                  src={moment.image}
                  alt={moment.title}
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                    display: 'block'
                  }}
                />
              </Box>

              {/* Titre de l'activité */}
              <Typography
                variant="h6"
                sx={{
                  color: '#1780c2',
                  fontWeight: 700,
                  fontSize: { xs: 14, md: 16 },
                  fontFamily: 'Arial, sans-serif',
                  lineHeight: 1.3,
                  textAlign: 'center',
                  mb: 1,
                  minHeight: { xs: 'auto', md: '40px' },
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                {moment.title}
              </Typography>

              {/* Description (masquée sur mobile) */}
              <Typography
                variant="body2"
                sx={{
                  color: '#666',
                  fontSize: { xs: 12, md: 14 },
                  lineHeight: 1.4,
                  textAlign: 'center',
                  display: { xs: 'none', md: 'block' }
                }}
              >
                {moment.description}
              </Typography>
            </Box>
          ))}
        </Box>

        {galleryActivity && (
          <GalleryModal
            open={galleryOpen}
            onClose={() => { setGalleryOpen(false); setGalleryActivity(null); }}
            title={galleryActivity.title}
            images={galleryActivity.images}
          />
        )}
      </Container>

      {/* Section décorative en bas avec motifs scolaires */}
      <Box sx={{
        bgcolor: '#1780c2',
        py: 4,
        position: 'relative',
        overflow: 'hidden'
      }}>
        {/* Motifs scolaires en blanc */}
        <Box sx={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundImage: 'url(/img/pages/1.jpg)', // Motifs scolaires (crayons, règles, formules)
          backgroundSize: '250px',
          backgroundRepeat: 'repeat',
          opacity: 0.3,
          zIndex: 0
        }} />

        
      </Box>
    </Box>
  );
};

// Composant principal Activites
const Activites = () => {
  return (
    <>
      <Helmet>
        <title>Activités Éducatives et Moments Forts - GROUPE SCOLAIRE SAINTE FAMILLE L'EXECELLENCE Abidjan</title>
        <meta name="description" content="Découvrez les activités éducatives et moments forts de GROUPE SCOLAIRE SAINTE FAMILLE L'EXECELLENCE à Abidjan : sorties éducatives, kermesse, contes, initiation robotique, graduation, brunch party, journée des stars, piscine party. Vie académique et moments de convivialité." />
        <meta name="keywords" content="activités éducatives Abidjan, sorties éducatives, kermesse école, contes enfants, initiation robotique, graduation maternelle, brunch party, journée des stars, piscine party, vie académique, moments forts école, GROUPE SCOLAIRE SAINTE FAMILLE L'EXECELLENCE" />
        <meta property="og:title" content="Activités Éducatives et Moments Forts - GROUPE SCOLAIRE SAINTE FAMILLE L'EXECELLENCE Abidjan" />
        <meta property="og:description" content="Découvrez les activités éducatives et moments forts de GROUPE SCOLAIRE SAINTE FAMILLE L'EXECELLENCE à Abidjan : sorties éducatives, kermesse, contes, initiation robotique, graduation, brunch party." />
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://saintefamilleexcellence.ci/activites" />
        <link rel="canonical" href="https://saintefamilleexcellence.ci/activites" />
      </Helmet>
      <Box sx={{ 
        width: '100%',
        margin: 0,
        padding: 0
      }}>
        <ContactBanner />
        <NavigationBar />
        <HeroSection />
        <ActivitiesContent />
        <MomentsFortsSection />
        <SiteFooter />
      </Box>
    </>
  );
};

export default Activites;

