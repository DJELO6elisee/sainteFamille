import React, { useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import {
  Box,
  Container,
  Typography,
  AppBar,
  Toolbar,
  useTheme,
  useMediaQuery,
  Menu,
  MenuItem,
  IconButton,
  Grid,
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import { SiteFooter } from './Home';

type NavSubItem = { label: string; path: string };
interface NavItem {
  label: string;
  path: string;
  isScroll?: boolean;
  hasSubmenu?: boolean;
  submenu?: NavSubItem[];
}

// Composant de navigation avec onglets
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
    <AppBar 
      position="absolute" 
      sx={{ 
        bgcolor: 'transparent',
        boxShadow: 'none',
        zIndex: 10,
        top: '60px' // Ajuster pour éviter le chevauchement avec la bannière de contact
      }}
    >
      <Toolbar sx={{ 
        justifyContent: { xs: 'flex-end', md: 'space-between' },
        px: { xs: 2, md: 4 },
        py: { xs: 0.5, md: 1 },
        minHeight: { xs: 56, md: 64 }
      }}>
        {/* Logo - Masqué sur mobile */}
        <Box sx={{ 
          display: { xs: 'none', md: 'flex' },
          alignItems: 'center',
          gap: 2
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
                      {item.submenu?.map((subItem: NavSubItem) => (
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
                      color: item.path === '/presentation' ? '#FF9800' : 'white',
                      fontWeight: 600,
                      fontSize: { md: 12, lg: 14 },
                      textTransform: 'uppercase',
                      letterSpacing: 0.5,
                      px: { md: 1.5, lg: 2 },
                      py: 1,
                      borderBottom: item.path === '/presentation' ? '2px solid #FF9800' : '2px solid transparent',
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
                        {item.submenu?.map((subItem: NavSubItem) => (
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
                  )}
                </Box>
              ))}
            </Menu>
          </>
        )}
      </Toolbar>
    </AppBar>
  );
};

// Section Présentation
const PresentationSection = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  return (
    <Box sx={{
      width: '100%',
      minHeight: '100vh',
      bgcolor: 'white',
      position: 'relative',
      pt: 8 // Pour éviter la navbar
    }}>
      {/* Header avec titre et image de fond */}
      <Box sx={{
        position: 'relative',
        width: '100%',
        height: { xs: '40vh', md: '50vh' },
        backgroundImage: 'url(/img/pages/38.jpg)', // Image de fond avec enfants en graduation
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden'
      }}>
        {/* Overlay bleu pour la lisibilité */}
        <Box sx={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          bgcolor: 'rgba(23, 128, 194, 0.7)',
          zIndex: 1
        }} />

        {/* Titre principal */}
        <Typography
          variant="h1"
          sx={{
            color: 'white',
            fontWeight: 700,
            fontSize: { xs: 32, md: 48, lg: 56 },
            textAlign: 'center',
            fontFamily: 'Arial, sans-serif',
            textShadow: '2px 2px 4px rgba(0,0,0,0.7)',
            position: 'relative',
            zIndex: 2,
            textTransform: 'uppercase'
          }}
        >
          PRESENTATION
        </Typography>
      </Box>

      {/* Contenu principal */}
      <Box sx={{
        width: '100%',
        bgcolor: 'white', // Fond blanc
        position: 'relative',
        overflow: 'hidden'
      }}>
        {/* Motifs de fond subtils */}
        <Box sx={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: 0,
          opacity: 0.05
        }}>
          {/* Formes géométriques décoratives */}
          <Box sx={{
            position: 'absolute',
            top: '10%',
            left: '5%',
            width: 80,
            height: 80,
            bgcolor: '#E0E0E0',
            borderRadius: '50%'
          }} />
          <Box sx={{
            position: 'absolute',
            top: '25%',
            right: '8%',
            width: 60,
            height: 60,
            bgcolor: '#E0E0E0',
            borderRadius: '50%'
          }} />
          <Box sx={{
            position: 'absolute',
            bottom: '20%',
            left: '10%',
            width: 100,
            height: 100,
            bgcolor: '#E0E0E0',
            borderRadius: '50%'
          }} />
          <Box sx={{
            position: 'absolute',
            top: '60%',
            right: '12%',
            width: 70,
            height: 70,
            bgcolor: '#E0E0E0',
            borderRadius: '50%'
          }} />
        </Box>

        <Container maxWidth="lg" sx={{ py: { xs: 4, md: 6 }, position: 'relative', zIndex: 1 }}>
          <Grid container spacing={4} alignItems="flex-start">
            {/* Colonne gauche - Texte */}
            <Grid item xs={12} md={6}>
              <Box sx={{
                position: 'relative',
                bgcolor: 'transparent',
                p: { xs: 2, md: 3 },
              }}>
                {/* Introduction */}
                <Typography
                  variant="body1"
                  sx={{
                    color: '#2c2c2c', // Gris très foncé
                    fontSize: { xs: 14, md: 16 },
                    lineHeight: 1.7,
                    mb: 3,
                    fontFamily: '"Segoe UI", "Roboto", "Helvetica", "Arial", sans-serif',
                    textAlign: 'justify'
                  }}
                >
                  GROUPE SCOLAIRE SAINTE FAMILLE L'EXECELLENCE est un centre d'accueil de la petite enfance, 
                  dédié à l'éveil et à l'épanouissement des jeunes esprits. Nous accueillons les enfants 
                  de la crèche à la maternelle dans un cadre sécurisé, conçu pour stimuler leur développement.
                </Typography>

                {/* La crèche et la garderie */}
                <Box sx={{ mb: 3, pl: 2 }}>
                  <Typography
                    variant="body1"
                    sx={{
                      color: '#2c2c2c',
                      fontSize: { xs: 14, md: 16 },
                      lineHeight: 1.7,
                      fontFamily: '"Segoe UI", "Roboto", "Helvetica", "Arial", sans-serif',
                      textAlign: 'justify',
                      textIndent: '-1.5em', // Indentation négative pour la première ligne
                      paddingLeft: '1.5em' // Padding pour compenser l'indentation négative
                    }}
                  >
                    <span style={{ fontWeight: 700 }}>• La crèche et la garderie</span> Un environnement bienveillant pour nos tout-petits, axé sur le confort, l'éveil, 
                    les activités sensorielles, les jeux éducatifs et les moments de tendresse pour 
                    un développement harmonieux.
                  </Typography>
                </Box>

                {/* La maternelle */}
                <Box sx={{ mb: 3, pl: 2 }}>
                  <Typography
                    variant="body1"
                    sx={{
                      color: '#2c2c2c',
                      fontSize: { xs: 14, md: 16 },
                      lineHeight: 1.7,
                      fontFamily: '"Segoe UI", "Roboto", "Helvetica", "Arial", sans-serif',
                      textAlign: 'justify',
                      textIndent: '-1.5em', // Indentation négative pour la première ligne
                      paddingLeft: '1.5em' // Padding pour compenser l'indentation négative
                    }}
                  >
                    <span style={{ fontWeight: 700 }}>• La maternelle</span> Premier pas vers le monde scolaire avec une pédagogie active inspirée d'approches 
                    alternatives. Nous encourageons la curiosité, l'autonomie, la créativité, la lecture, 
                    le langage, les mathématiques, les arts et les découvertes, en respectant le rythme 
                    de chaque enfant.
                  </Typography>
                </Box>

                {/* Approche pédagogique */}
                <Typography
                  variant="body1"
                  sx={{
                    color: '#2c2c2c', // Gris très foncé
                    fontSize: { xs: 14, md: 16 },
                    lineHeight: 1.7,
                    mb: 3,
                    fontFamily: '"Segoe UI", "Roboto", "Helvetica", "Arial", sans-serif',
                    textAlign: 'justify'
                  }}
                >
                  Notre approche pédagogique est fondée sur l'action et la découverte. Nous encourageons 
                  l'autonomie et la confiance en soi à travers des activités ludiques, créatives et 
                  sensorielles qui éveillent la curiosité.
                </Typography>

                {/* Programme bilingue */}
                <Typography
                  variant="body1"
                  sx={{
                    color: '#2c2c2c', // Gris très foncé
                    fontSize: { xs: 14, md: 16 },
                    lineHeight: 1.7,
                    fontFamily: '"Segoe UI", "Roboto", "Helvetica", "Arial", sans-serif',
                    textAlign: 'justify'
                  }}
                >
                  En complément, notre programme bilingue français-anglais enrichit leur apprentissage 
                  en les familiarisant avec une deuxième langue.
                </Typography>
              </Box>
            </Grid>

            {/* Colonne droite - Image */}
            <Grid item xs={12} md={6}>
              <Box sx={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                height: '100%',
                p: { xs: 1, md: 2 }
              }}>
                <Box sx={{
                  position: 'relative',
                  overflow: 'hidden',
                  borderTop: 'none', // Pas de bordure en haut
                  maxWidth: { xs: '100%', md: '500px' },
                  width: '100%'
                }}>
                  <img
                    src="/img/sainte/ecole1.jpg"
                    alt="Cérémonie de graduation - GROUPE SCOLAIRE SAINTE FAMILLE L'EXECELLENCE"
                    style={{
                      width: '100%',
                      height: 'auto',
                      display: 'block',
                      objectFit: 'cover'
                    }}
                  />
                </Box>
              </Box>
            </Grid>
          </Grid>
        </Container>

      </Box>

      {/* Section Notre Vision */}
      <Box sx={{
        width: '100%',
        position: 'relative',
        bgcolor: '#F8F9FA' // Fond gris clair comme dans l'image
      }}>
        {/* Bannière verte ondulée en haut */}
        <Box sx={{
          width: '100%',
          height: 40,
          position: 'relative',
          overflow: 'hidden'
        }}>
          {/* Bande verte avec forme ondulée très subtile */}
          <Box sx={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: '100%',
            bgcolor: '#32CD32', // Vert lime vif
            clipPath: 'polygon(0 0%, 0% 95%, 10% 100%, 20% 90%, 30% 100%, 40% 95%, 50% 100%, 60% 90%, 70% 100%, 80% 95%, 90% 100%, 100% 95%, 100% 0%)' // Forme ondulée très subtile
          }} />
        </Box>
        <Container maxWidth="lg" sx={{ py: { xs: 4, md: 6 } }}>
          <Grid container spacing={4} alignItems="center">
            {/* Colonne gauche - Image */}
            <Grid item xs={12} md={6}>
              <Box sx={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                height: '100%'
              }}>
                <Box sx={{
                  position: 'relative',
                  borderRadius: 2,
                  overflow: 'hidden',
                  maxWidth: { xs: '100%', md: '500px' },
                  width: '100%'
                }}>
                  <img
                    src="/img/sainte/pic1.jpg" // Remplacer par l'image des enfants avec l'activité
                    alt="Enfants en activité éducative - GROUPE SCOLAIRE SAINTE FAMILLE L'EXECELLENCE"
                    style={{
                      width: '100%',
                      height: 'auto',
                      display: 'block',
                      objectFit: 'cover'
                    }}
                  />
                </Box>
              </Box>
            </Grid>

            {/* Colonne droite - Texte */}
            <Grid item xs={12} md={6}>
              <Box sx={{
                position: 'relative',
                bgcolor: 'white',
                p: { xs: 3, md: 4 },
                borderRadius: 2,
                
              }}>
                {/* Titre principal */}
                <Typography
                  variant="h3"
                  sx={{
                    color: '#1780c2',
                    fontWeight: 700,
                    fontSize: { xs: 24, md: 32 },
                    mb: 3,
                    fontFamily: 'Arial, sans-serif'
                  }}
                >
                  NOTRE VISION
                </Typography>

                {/* Paragraphe 1 */}
                <Typography
                  variant="body1"
                  sx={{
                    color: '#333',
                    fontSize: { xs: 16, md: 18 },
                    lineHeight: 1.7,
                    mb: 3,
                    fontFamily: 'Arial, sans-serif'
                  }}
                >
                  Au GROUPE SCOLAIRE SAINTE FAMILLE L'EXECELLENCE, nous imaginons un monde où chaque enfant 
                  peut s'épanouir pleinement dès ses premières années.
                </Typography>

                {/* Paragraphe 2 */}
                <Typography
                  variant="body1"
                  sx={{
                    color: '#333',
                    fontSize: { xs: 16, md: 18 },
                    lineHeight: 1.7,
                    mb: 3,
                    fontFamily: 'Arial, sans-serif'
                  }}
                >
                  Notre vision est de créer un environnement bienveillant, stimulant et inclusif, où 
                  l'apprentissage, la curiosité et la créativité sont encouragés à chaque étape du développement.
                </Typography>

                {/* Paragraphe 3 */}
                <Typography
                  variant="body1"
                  sx={{
                    color: '#333',
                    fontSize: { xs: 16, md: 18 },
                    lineHeight: 1.7,
                    fontFamily: 'Arial, sans-serif'
                  }}
                >
                  Nous aspirons à former des enfants confiants, ouverts sur le monde, autonomes et capables 
                  de développer leur plein potentiel, tout en cultivant le respect, la coopération et la joie d'apprendre.
                </Typography>
              </Box>
            </Grid>
          </Grid>
        </Container>
      </Box>

      {/* Section Nos Missions */}
      <Box sx={{
        width: '100%',
        position: 'relative'
      }}>
        {/* Bannière verte incurvée en haut */}
        <Box sx={{
          width: '100%',
          height: 60,
          position: 'relative',
          overflow: 'hidden'
        }}>
          {/* Bande verte avec forme incurvée vers le bas */}
          <Box sx={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: '100%',
            bgcolor: '#32CD32', // Vert lime vif
            clipPath: 'polygon(0 0%, 100% 60%, 100% 100%, 0% 100%)' // Forme incurvée vers le bas
          }} />
        </Box>

        {/* Contenu Nos Missions */}
        <Container maxWidth="lg" sx={{ py: { xs: 4, md: 6 } }}>
          <Grid container spacing={4} alignItems="center">
            {/* Colonne gauche - Texte */}
            <Grid item xs={12} md={6}>
              <Box sx={{
                position: 'relative',
                bgcolor: 'white',
                p: { xs: 3, md: 4 },
                borderRadius: 2,
              
              }}>
                {/* Titre principal */}
                <Typography
                  variant="h3"
                  sx={{
                    color: '#1780c2',
                    fontWeight: 700,
                    fontSize: { xs: 24, md: 32 },
                    mb: 3,
                    fontFamily: 'Arial, sans-serif'
                  }}
                >
                  NOS MISSIONS
                </Typography>

                {/* Liste des missions */}
                <Box sx={{ pl: 2 }}>
                  {/* Mission 1 */}
                  <Box sx={{ display: 'flex', alignItems: 'flex-start', mb: 2 }}>
                    <Box sx={{
                      width: 8,
                      height: 8,
                      borderRadius: '50%',
                      bgcolor: '#1780c2',
                      mt: 1,
                      mr: 2,
                      flexShrink: 0
                    }} />
                    <Typography
                      variant="body1"
                      sx={{
                        color: '#333',
                        fontSize: { xs: 14, md: 16 },
                        lineHeight: 1.7,
                        fontFamily: 'Arial, sans-serif'
                      }}
                    >
                      Offrir un environnement sûr, stimulant et bienveillant, où les tout-petits explorent, découvrent et grandissent à leur rythme, en développant leur curiosité, leur créativité et leur autonomie.
                    </Typography>
                  </Box>

                  {/* Mission 2 */}
                  <Box sx={{ display: 'flex', alignItems: 'flex-start', mb: 2 }}>
                    <Box sx={{
                      width: 8,
                      height: 8,
                      borderRadius: '50%',
                      bgcolor: '#1780c2',
                      mt: 1,
                      mr: 2,
                      flexShrink: 0
                    }} />
                    <Typography
                      variant="body1"
                      sx={{
                        color: '#333',
                        fontSize: { xs: 14, md: 16 },
                        lineHeight: 1.7,
                        fontFamily: 'Arial, sans-serif'
                      }}
                    >
                      Mettre en place des activités ludiques, sensorielles, artistiques et éducatives, inspirées des pédagogies alternatives, afin de favoriser l'apprentissage par l'expérimentation et le plaisir.
                    </Typography>
                  </Box>

                  {/* Mission 3 */}
                  <Box sx={{ display: 'flex', alignItems: 'flex-start', mb: 2 }}>
                    <Box sx={{
                      width: 8,
                      height: 8,
                      borderRadius: '50%',
                      bgcolor: '#1780c2',
                      mt: 1,
                      mr: 2,
                      flexShrink: 0
                    }} />
                    <Typography
                      variant="body1"
                      sx={{
                        color: '#333',
                        fontSize: { xs: 14, md: 16 },
                        lineHeight: 1.7,
                        fontFamily: 'Arial, sans-serif'
                      }}
                    >
                      Proposer un programme français-anglais immersif, permettant aux enfants de s'ouvrir à une deuxième langue dès le plus jeune âge, tout en développant leur confiance et leur communication.
                    </Typography>
                  </Box>

                  {/* Mission 4 */}
                  <Box sx={{ display: 'flex', alignItems: 'flex-start', mb: 2 }}>
                    <Box sx={{
                      width: 8,
                      height: 8,
                      borderRadius: '50%',
                      bgcolor: '#1780c2',
                      mt: 1,
                      mr: 2,
                      flexShrink: 0
                    }} />
                    <Typography
                      variant="body1"
                      sx={{
                        color: '#333',
                        fontSize: { xs: 14, md: 16 },
                        lineHeight: 1.7,
                        fontFamily: 'Arial, sans-serif'
                      }}
                    >
                      Accompagner les parents dans le suivi de l'évolution de leur enfant et offrir un partenariat basé sur l'écoute, la transparence et le respect mutuel.
                    </Typography>
                  </Box>

                  {/* Mission 5 */}
                  <Box sx={{ display: 'flex', alignItems: 'flex-start' }}>
                    <Box sx={{
                      width: 8,
                      height: 8,
                      borderRadius: '50%',
                      bgcolor: '#1780c2',
                      mt: 1,
                      mr: 2,
                      flexShrink: 0
                    }} />
                    <Typography
                      variant="body1"
                      sx={{
                        color: '#333',
                        fontSize: { xs: 14, md: 16 },
                        lineHeight: 1.7,
                        fontFamily: 'Arial, sans-serif'
                      }}
                    >
                      Encourager le respect, la coopération, l'empathie et l'esprit d'initiative pour préparer les enfants à devenir des citoyens confiants, curieux et responsables.
                    </Typography>
                  </Box>
                </Box>
              </Box>
            </Grid>

            {/* Colonne droite - Image */}
            <Grid item xs={12} md={6}>
              <Box sx={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                height: '100%'
              }}>
                <Box sx={{
                  position: 'relative',
                  borderRadius: 2,
                  overflow: 'hidden',
                  border: '2px solid white', // Bordure blanche fine
                  boxShadow: '0 4px 16px rgba(0, 0, 0, 0.1)',
                  maxWidth: { xs: '100%', md: '500px' },
                  width: '100%'
                }}>
                  <img
                    src="/img/sainte/graduation.jpg" // Remplacer par l'image de graduation
                    alt="Cérémonie de graduation - GROUPE SCOLAIRE SAINTE FAMILLE L'EXECELLENCE"
                    style={{
                      width: '100%',
                      height: 'auto',
                      display: 'block',
                      objectFit: 'cover'
                    }}
                  />
                </Box>
              </Box>
            </Grid>
          </Grid>
        </Container>
      </Box>

      {/* Section Nos Valeurs */}
      <Box sx={{
        width: '100%',
        position: 'relative',
        bgcolor: 'white'
      }}>
        {/* Bannière verte ondulée en haut */}
        <Box sx={{
          width: '100%',
          height: 45,
          position: 'relative',
          overflow: 'hidden'
        }}>
          {/* Bande verte avec forme ondulée très subtile */}
          <Box sx={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: '100%',
            bgcolor: '#32CD32', // Vert lime vif
            clipPath: 'polygon(0 0%, 0% 90%, 15% 100%, 30% 85%, 45% 100%, 60% 90%, 75% 100%, 90% 85%, 100% 100%, 100% 0%)' // Forme ondulée très subtile
          }} />
        </Box>

        {/* Contenu Nos Valeurs */}
        <Container maxWidth="lg" sx={{ py: { xs: 2, md: 3 }, position: 'relative', zIndex: 2 }}>
          <Grid container spacing={3} alignItems="stretch">
            {/* Colonne gauche - Image */}
            <Grid item xs={12} md={5}>
              <Box sx={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                height: '100%',
                minHeight: { xs: '250px', md: '280px' }
              }}>
                <Box sx={{
                  position: 'relative',
                  borderRadius: 2,
                  overflow: 'hidden',
                  maxWidth: { xs: '100%', md: '350px' },
                  width: '100%',
                  height: '100%'
                }}>
                  <img
                    src="/img/sainte/valeur.jpg" // Remplacer par l'image de la cour de récréation
                    alt="Cour de récréation - GROUPE SCOLAIRE SAINTE FAMILLE L'EXECELLENCE"
                    style={{
                      width: '100%',
                      height: '100%',
                      display: 'block',
                      objectFit: 'cover'
                    }}
                  />
                </Box>
              </Box>
            </Grid>

            {/* Colonne droite - Texte */}
            <Grid item xs={12} md={7}>
              <Box sx={{
                position: 'relative',
                bgcolor: 'white',
                p: { xs: 2, md: 3 },
                borderRadius: 2,
                height: '100%',
                minHeight: { xs: '250px', md: '280px' },
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center'
              }}>
                {/* Titre principal */}
                <Typography
                  variant="h3"
                  sx={{
                    color: '#1780c2',
                    fontWeight: 700,
                    fontSize: { xs: 20, md: 24 },
                    mb: 2,
                    fontFamily: 'Arial, sans-serif'
                  }}
                >
                  NOS VALEURS
                </Typography>

                {/* Liste des valeurs */}
                <Box>
                  {/* Valeur 1 - Bienveillance */}
                  <Typography
                    variant="body1"
                    sx={{
                      color: '#333',
                      fontSize: { xs: 14, md: 15 },
                      lineHeight: 1.6,
                      mb: 2,
                      fontFamily: 'Arial, sans-serif'
                    }}
                  >
                    <span style={{ fontWeight: 700, color: '#1780c2' }}>Bienveillance</span> Chaque enfant est accueilli avec respect, attention et douceur, dans un environnement sécurisant où il peut s'épanouir sereinement.
                  </Typography>

                  {/* Valeur 2 - Autonomie */}
                  <Typography
                    variant="body1"
                    sx={{
                      color: '#333',
                      fontSize: { xs: 14, md: 15 },
                      lineHeight: 1.6,
                      mb: 2,
                      fontFamily: 'Arial, sans-serif'
                    }}
                  >
                    <span style={{ fontWeight: 700, color: '#1780c2' }}>Autonomie</span> Nous encourageons les enfants à explorer, expérimenter et prendre des initiatives, afin de développer leur confiance en eux et leur capacité à agir par eux-mêmes.
                  </Typography>

                  {/* Valeur 3 - Curiosité et créativité */}
                  <Typography
                    variant="body1"
                    sx={{
                      color: '#333',
                      fontSize: { xs: 14, md: 15 },
                      lineHeight: 1.6,
                      mb: 2,
                      fontFamily: 'Arial, sans-serif'
                    }}
                  >
                    <span style={{ fontWeight: 700, color: '#1780c2' }}>Curiosité et créativité</span> Nous favorisons la découverte, l'imagination et l'expression artistique, pour stimuler l'envie d'apprendre et le plaisir de comprendre le monde.
                  </Typography>

                  {/* Valeur 4 - Respect et coopération */}
                  <Typography
                    variant="body1"
                    sx={{
                      color: '#333',
                      fontSize: { xs: 14, md: 15 },
                      lineHeight: 1.6,
                      mb: 2,
                      fontFamily: 'Arial, sans-serif'
                    }}
                  >
                    <span style={{ fontWeight: 700, color: '#1780c2' }}>Respect et coopération</span> Nous cultivons le respect des autres, la solidarité et l'entraide, afin que chaque enfant grandisse dans un esprit de partage et d'empathie.
                  </Typography>

                  {/* Valeur 5 - Ouverture sur le monde */}
                  <Typography
                    variant="body1"
                    sx={{
                      color: '#333',
                      fontSize: { xs: 14, md: 15 },
                      lineHeight: 1.6,
                      mb: 2,
                      fontFamily: 'Arial, sans-serif'
                    }}
                  >
                    <span style={{ fontWeight: 700, color: '#1780c2' }}>Ouverture sur le monde</span> Grâce à notre programme bilingue et à des activités multiculturelles, nous sensibilisons les enfants à la diversité et à la richesse des langues et des cultures.
                  </Typography>

                  {/* Valeur 6 - Engagement et passion */}
                  <Typography
                    variant="body1"
                    sx={{
                      color: '#333',
                      fontSize: { xs: 16, md: 18 },
                      lineHeight: 1.7,
                      fontFamily: 'Arial, sans-serif'
                    }}
                  >
                    <span style={{ fontWeight: 700, color: '#1780c2' }}>Engagement et passion</span> Notre équipe, formée et passionnée, met tout en œuvre pour accompagner chaque enfant dans son développement et contribuer à son épanouissement global.
                  </Typography>
                </Box>
              </Box>
            </Grid>
          </Grid>
        </Container>
      </Box>

      {/* Section Call-to-Action - Inscription */}
      <Box sx={{
        position: 'relative',
        width: '100%',
        height: { xs: '50vh', md: '60vh' },
        backgroundImage: 'url(/img/pages/38.jpg)', // Image de fond de la salle de classe
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden'
      }}>
        {/* Overlay sombre pour la lisibilité */}
        <Box sx={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          bgcolor: 'rgba(0, 0, 0, 0.6)', // Overlay sombre
          zIndex: 1
        }} />

        {/* Bouton d'inscription centré */}
        <Box sx={{
          position: 'relative',
          zIndex: 2,
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center'
        }}>
          <Box
            component={RouterLink}
            to="/inscription" // Lien vers la page d'inscription
            sx={{
              display: 'inline-block',
              bgcolor: '#FF9800', // Orange vif
              color: 'white',
              px: { xs: 4, md: 6 },
              py: { xs: 2, md: 3 },
              borderRadius: { xs: 3, md: 4 },
              border: '2px solid white',
              textDecoration: 'none',
              fontWeight: 700,
              fontSize: { xs: 16, md: 20 },
              fontFamily: 'Arial, sans-serif',
              textTransform: 'uppercase',
              letterSpacing: 1,
              textAlign: 'center',
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
              transition: 'all 0.3s ease',
              '&:hover': {
                bgcolor: '#F57C00', // Orange plus foncé au survol
                transform: 'translateY(-2px)',
                boxShadow: '0 12px 40px rgba(0, 0, 0, 0.4)',
                textDecoration: 'none',
                color: 'white'
              },
              '&:active': {
                transform: 'translateY(0px)',
                boxShadow: '0 6px 24px rgba(0, 0, 0, 0.3)'
              }
            }}
          >
            J'inscris mon enfant
          </Box>
        </Box>
      </Box>

      {/* Bande verte incurvée en bas */}
      <Box sx={{
        width: '100%',
        height: 60,
        position: 'relative',
        overflow: 'hidden'
      }}>
        {/* Bande verte avec forme incurvée */}
        <Box sx={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          height: '100%',
          bgcolor: '#32CD32', // Vert lime vif
          clipPath: 'polygon(0 40%, 100% 0%, 100% 100%, 0% 100%)' // Forme incurvée
        }} />
      </Box>
    </Box>
  );
};

// Composant principal Presentation
const Presentation = () => {
  return (
    <>
      <Helmet>
        <title>Présentation - École Maternelle et Primaire Bilingue Abidjan | GROUPE SCOLAIRE SAINTE FAMILLE L'EXECELLENCE</title>
        <meta name="description" content="Découvrez le GROUPE SCOLAIRE SAINTE FAMILLE L'EXECELLENCE : notre vision, nos missions et nos valeurs. École sans distinction de race ni de religion, maternelle et primaire bilingue à Abidjan Cocody II Plateau Agban avec pédagogie alternative et programme français-anglais." />
        <meta name="keywords" content="présentation école maternelle Abidjan, présentation école primaire Abidjan, vision pédagogique, missions école, valeurs éducation, pédagogie alternative, programme bilingue, école maternelle privée Cocody, école primaire privée Cocody, GROUPE SCOLAIRE SAINTE FAMILLE L'EXECELLENCE, école sans distinction" />
        <meta property="og:title" content="Présentation - École Maternelle et Primaire Bilingue Abidjan | GROUPE SCOLAIRE SAINTE FAMILLE L'EXECELLENCE" />
        <meta property="og:description" content="Découvrez le GROUPE SCOLAIRE SAINTE FAMILLE L'EXECELLENCE : notre vision, nos missions et nos valeurs. École sans distinction de race ni de religion, maternelle et primaire bilingue à Abidjan." />
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://saintefamilleexcellence.ci/presentation" />
        <link rel="canonical" href="https://saintefamilleexcellence.ci/presentation" />
      </Helmet>
      <Box sx={{ 
        width: '100%',
        margin: 0,
        padding: 0
      }}>
        <NavigationBar />
        <PresentationSection />
        <SiteFooter />
      </Box>
    </>
  );
};

export default Presentation;

