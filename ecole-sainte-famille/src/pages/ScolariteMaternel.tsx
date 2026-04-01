import React, { useState } from 'react';
import { Box, Container, Typography, Grid, List, ListItem, ListItemText, Button, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, Divider, useTheme, useMediaQuery, Menu, MenuItem, IconButton } from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { ContactBanner, SiteFooter } from './Home';
import MenuIcon from '@mui/icons-material/Menu';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';

// Composant de navigation avec onglets
const NavigationBar = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [mobileMenuAnchor, setMobileMenuAnchor] = useState<null | HTMLElement>(null);
  const [scolariteMenuAnchor, setScolariteMenuAnchor] = useState<null | HTMLElement>(null);

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

  const navigationItems = [
    { label: 'ACCUEIL', path: '/' },
    { label: 'PRESENTATION', path: '/presentation' },
    { 
      label: 'SCOLARITE', 
      path: '/scolarite',
      hasSubmenu: true,
      submenu: [
        { label: 'CRÈCHE/GARDERIE', path: '/scolarite' },
        { label: 'MATERNELLE', path: '/scolarite-maternel' }
      ]
    },
    { label: 'NOS ACTIVITES', path: '/activites' },
    { label: 'BLOG', path: '/blog' },
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
                src="/img/pages/vrailogo.jpg"
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
                          color: item.label === 'SCOLARITE' ? '#FF9800' : 'white',
                          fontWeight: 600,
                          fontSize: { md: 12, lg: 14 },
                          textTransform: 'uppercase',
                          letterSpacing: 0.5,
                          px: { md: 1.5, lg: 2 },
                          py: 1,
                          borderBottom: item.label === 'SCOLARITE' ? '2px solid #FF9800' : '2px solid transparent',
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
                              color: subItem.path === '/scolarite-maternel' ? '#FF9800' : 'white',
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
                        color: 'white',
                        fontWeight: 600,
                        fontSize: { md: 12, lg: 14 },
                        textTransform: 'uppercase',
                        letterSpacing: 0.5,
                        px: { md: 1.5, lg: 2 },
                        py: 1,
                        borderBottom: '2px solid transparent',
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
                                color: subItem.path === '/scolarite-maternel' ? '#FF9800' : 'white',
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
        </Box>
      </Container>
    </Box>
  );
};

// Section Hero pour la page Scolarité
const ScolariteHero = () => {
  return (
    <Box sx={{ 
      width: '100%', 
      height: '100vh',
      position: 'relative', 
      bgcolor: '#1780c2',
      overflow: 'hidden'
    }}>
      {/* Image de fond */}
      <Box sx={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundImage: 'url(/img/pages/ac.jpg)', // Image de l'école
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        zIndex: 1
      }} />

      {/* Overlay pour la lisibilité */}
      <Box sx={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        bgcolor: 'rgba(0, 0, 0, 0.3)',
        zIndex: 2
      }} />

      {/* Contenu textuel */}
      <Box sx={{
        position: 'absolute',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        zIndex: 3,
        textAlign: 'center',
        width: { xs: '90%', md: '80%' }
      }}>
        {/* Titre principal - "SCOLARITÉ" */}
        <Typography
          variant="h1"
          sx={{
            color: 'white',
            fontWeight: 'bold',
            fontSize: { xs: 40, md: 60, lg: 80 },
            textShadow: '2px 2px 4px rgba(0,0,0,0.7)',
            mb: 2,
            textTransform: 'uppercase',
            letterSpacing: 2
          }}
        >
          SCOLARITÉ
        </Typography>
        
        {/* Bannière bleue - "MATERNELLE" */}
        <Box sx={{
          bgcolor: '#1780c2',
          color: 'white',
          py: { xs: 1, md: 1.5 },
          px: { xs: 2, md: 3 },
          borderRadius: 1,
          mb: 2,
          display: 'inline-block',
          border: '2px solid white'
        }}>
          <Typography
            variant="h4"
            sx={{
              color: 'white',
              fontWeight: 700,
              fontSize: { xs: 18, md: 24, lg: 28 },
              textTransform: 'uppercase',
              letterSpacing: 1
            }}
          >
            MATERNELLE
          </Typography>
        </Box>
        
        {/* Sous-titre - "ÉDUCATION PRÉSCOLAIRE" */}
        <Typography
          variant="h3"
          sx={{
            color: 'white',
            fontWeight: 400,
            fontSize: { xs: 20, md: 28, lg: 36 },
            textShadow: '2px 2px 4px rgba(0,0,0,0.7)',
            textTransform: 'uppercase',
            letterSpacing: 1
          }}
        >
          ÉDUCATION PRÉSCOLAIRE
        </Typography>
      </Box>
    </Box>
  );
};

// Section Maternelle avec informations et inscription
const MaternelleSection = () => {
  return (
    <Box sx={{
      position: 'relative',
      width: '100%',
      minHeight: { xs: '80vh', md: '100vh' },
      background: 'linear-gradient(135deg, #e3f2fd 0%, #f3e5f5 25%, #fff3e0 50%, #e8f5e8 75%, #fce4ec 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      py: { xs: 4, md: 6 }
    }}>
      <Container maxWidth="lg">
        <Grid container spacing={4} alignItems="center">
          {/* Colonne gauche - Texte */}
          <Grid item xs={12} md={6}>
            {/* Description de la maternelle */}
            <Typography
              variant="body1"
              sx={{
                color: '#333',
                fontSize: { xs: 14, md: 16 },
                lineHeight: 1.7,
                mb: 2,
                fontFamily: 'Arial, sans-serif'
              }}
            >
              La maternelle est le premier pas vers le monde scolaire. À GROUPE SCOLAIRE SAINTE FAMILLE L'EXECELLENCE - GROUPE SCOLAIRE SAINTE FAMILLE L'EXECELLENCE, nous accueillons les enfants de{' '}
              <Box component="span" sx={{ 
                color: '#4CAF50', 
                fontWeight: 700,
                backgroundColor: 'rgba(76, 175, 80, 0.1)',
                px: 0.5,
                borderRadius: 0.5
              }}>
                3 ans à 5 ans
              </Box>
              {' '}dans un cadre sécurisé et chaleureux.
            </Typography>

            <Typography
              variant="body1"
              sx={{
                color: '#333',
                fontSize: { xs: 14, md: 16 },
                lineHeight: 1.7,
                mb: 4,
                fontFamily: 'Arial, sans-serif'
              }}
            >
              Grâce à des méthodes pédagogiques adaptées, vos enfants acquièrent les bases de la lecture, de l'écriture, du langage et des mathématiques, tout en développant leur curiosité et leur autonomie.
            </Typography>

            {/* Liste des pièces à fournir */}
            <Typography
              variant="h5"
              sx={{
                color: '#1780c2',
                fontWeight: 700,
                fontSize: { xs: 18, md: 20 },
                mb: 2,
                fontFamily: 'Arial, sans-serif'
              }}
            >
              LISTE DES PIÈCES À FOURNIR
            </Typography>

            <List sx={{ pl: 0 }}>
              <ListItem sx={{ px: 0, py: 0.5 }}>
                <ListItemText
                  primary="• Une copie de l'extrait de naissance"
                  sx={{
                    '& .MuiListItemText-primary': {
                      fontSize: { xs: 14, md: 16 },
                      color: '#333',
                      fontFamily: 'Arial, sans-serif'
                    }
                  }}
                />
              </ListItem>
              <ListItem sx={{ px: 0, py: 0.5 }}>
                <ListItemText
                  primary="• 3 photos d'identité récentes de même tirage"
                  sx={{
                    '& .MuiListItemText-primary': {
                      fontSize: { xs: 14, md: 16 },
                      color: '#333',
                      fontFamily: 'Arial, sans-serif'
                    }
                  }}
                />
              </ListItem>
              <ListItem sx={{ px: 0, py: 0.5 }}>
                <ListItemText
                  primary="• 1 certificat de vaccinations original à jour signé par le pédiatre"
                  sx={{
                    '& .MuiListItemText-primary': {
                      fontSize: { xs: 14, md: 16 },
                      color: '#333',
                      fontFamily: 'Arial, sans-serif'
                    }
                  }}
                />
              </ListItem>
              <ListItem sx={{ px: 0, py: 0.5 }}>
                <ListItemText
                  primary="• 1 fiche d'identification et 1 fiche Sanitaire à récupérer à GROUPE SCOLAIRE SAINTE FAMILLE L'EXECELLENCE"
                  sx={{
                    '& .MuiListItemText-primary': {
                      fontSize: { xs: 14, md: 16 },
                      color: '#333',
                      fontFamily: 'Arial, sans-serif'
                    }
                  }}
                />
              </ListItem>
            </List>
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
                borderRadius: 3,
                overflow: 'hidden',
                boxShadow: '0 8px 32px rgba(0,0,0,0.15)',
                maxWidth: '100%',
                width: '100%',
                height: { xs: 300, md: 500 }
              }}>
                <img
                  src="/img/pages/ac2.jpg" // Image des enfants en maternelle
                  alt="Enfants en école maternelle"
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                    display: 'block'
                  }}
                />
              </Box>
            </Box>
          </Grid>
        </Grid>
      </Container>
    </Box>
  );
};

// Section Fiche de renseignements
const FicheRenseignementsSection = () => {
  return (
    <Box sx={{
      position: 'relative',
      width: '100%',
      minHeight: { xs: '50vh', md: '60vh' },
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      py: { xs: 0.5, md: 1 }
    }}>
      <Container maxWidth="lg">
        <Grid container spacing={1} alignItems="stretch">
          {/* Colonne gauche - Notre programme */}
          <Grid item xs={12} md={6}>
            <Box sx={{
              bgcolor: '#1780c2',
              borderRadius: 3,
              p: { xs: 1, md: 1.5 },
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center'
            }}>
              {/* Bannière jaune */}
              <Box sx={{
                bgcolor: '#FFD700',
                borderRadius: 2,
                p: 0.5,
                mb: 1,
                textAlign: 'center'
              }}>
                <Typography
                  variant="h4"
                  sx={{
                    color: '#1780c2',
                    fontWeight: 700,
                    fontSize: { xs: 12, md: 14 },
                    fontFamily: 'Arial, sans-serif'
                  }}
                >
                  Notre programme
                </Typography>
              </Box>

              {/* Horaires */}
              <Box sx={{ pl: 0.5 }}>
                <Typography sx={{ 
                  color: 'white', 
                  fontSize: { xs: 10, md: 12 },
                  mb: 0.3,
                  fontFamily: 'Arial, sans-serif'
                }}>
                  Lundi : 08H30 - 17H30
                </Typography>
                <Typography sx={{ 
                  color: 'white', 
                  fontSize: { xs: 10, md: 12 },
                  mb: 0.3,
                  fontFamily: 'Arial, sans-serif'
                }}>
                  Mardi : 08H30 - 17H30
                </Typography>
                <Typography sx={{ 
                  color: 'white', 
                  fontSize: { xs: 10, md: 12 },
                  mb: 0.3,
                  fontFamily: 'Arial, sans-serif'
                }}>
                  Mercredi : 08H30 - 17H30
                </Typography>
                <Typography sx={{ 
                  color: 'white', 
                  fontSize: { xs: 10, md: 12 },
                  mb: 0.3,
                  fontFamily: 'Arial, sans-serif'
                }}>
                  Jeudi : 08H30 - 17H30
                </Typography>
                <Typography sx={{ 
                  color: 'white', 
                  fontSize: { xs: 10, md: 12 },
                  fontFamily: 'Arial, sans-serif'
                }}>
                  Vendredi : 08H30 - 17H30
                </Typography>
              </Box>
            </Box>
          </Grid>

          {/* Colonne droite - Document d'inscription */}
          <Grid item xs={12} md={6}>
            <Box sx={{
              bgcolor: 'white',
              borderRadius: 3,
              p: { xs: 0.8, md: 1.2 },
              boxShadow: '0 8px 32px rgba(0,0,0,0.1)',
              height: '100%',
              overflow: 'hidden'
            }}>
          {/* En-tête */}
          <Box sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            mb: 0.5,
            flexWrap: 'wrap',
            gap: 0.5
          }}>
            <Box sx={{
              width: 30,
              height: 30,
              border: '2px solid #87CEEB',
              borderRadius: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              bgcolor: 'white',
              overflow: 'hidden',
              p: 0.3
            }}>
              <img
                src="/img/pages/vrailogo.jpg"
                alt="Logo"
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'contain',
                  display: 'block'
                }}
              />
            </Box>
            
            <Box sx={{ textAlign: 'center', flex: 1 }}>
              <Typography
                variant="h4"
                sx={{
                  color: '#1780c2',
                  fontWeight: 700,
                  fontSize: { xs: 12, md: 14 },
                  mb: 0.3,
                  fontFamily: 'Arial, sans-serif'
                }}
              >
                Calendrier scolaire Maternelle 2025-2026
              </Typography>
            </Box>
            
            <Box sx={{ textAlign: 'right' }}>
              <Typography
                variant="body2"
                sx={{
                  color: '#1780c2',
                  fontWeight: 600,
                  fontSize: { xs: 8, md: 10 },
                  fontFamily: 'Arial, sans-serif',
                  mb: 0.3
                }}
              >
                TEL: +225 07 08 33 26 74 / +225 27 21 51 68 08
              </Typography>
              <Typography
                variant="body2"
                sx={{
                  color: '#1780c2',
                  fontWeight: 600,
                  fontSize: { xs: 8, md: 10 },
                  fontFamily: 'Arial, sans-serif'
                }}
              >
                Email: info@lapetiteacademie.ci
              </Typography>
            </Box>
          </Box>

          {/* Section MODE D'INSCRIPTION */}
          <Box sx={{ mb: 0.5 }}>
            <Typography
              variant="h5"
              sx={{
                color: '#1780c2',
                fontWeight: 700,
                fontSize: { xs: 10, md: 12 },
                mb: 0.3,
                fontFamily: 'Arial, sans-serif'
              }}
            >
              MODE D'INSCRIPTION
            </Typography>
            
            <Typography
              variant="h6"
              sx={{
                color: '#1780c2',
                fontWeight: 700,
                fontSize: { xs: 9, md: 11 },
                mb: 0.3,
                fontFamily: 'Arial, sans-serif'
              }}
            >
              DROIT D'INSCRIPTION : 50.000 FCFA
            </Typography>
          </Box>

          {/* Section LISTE DES PIÈCES À FOURNIR */}
          <Box sx={{ mb: 0.5 }}>
            <Typography
              variant="h5"
              sx={{
                color: '#1780c2',
                fontWeight: 700,
                fontSize: { xs: 10, md: 12 },
                mb: 0.3,
                fontFamily: 'Arial, sans-serif'
              }}
            >
              LISTE DES PIÈCES À FOURNIR
            </Typography>
            
            <List sx={{ pl: 0 }}>
              <ListItem sx={{ px: 0, py: 0.1 }}>
                <ListItemText
                  primary="- Une copie de l'extrait de naissance"
                  sx={{
                    '& .MuiListItemText-primary': {
                      fontSize: { xs: 8, md: 10 },
                      color: '#333',
                      fontFamily: 'Arial, sans-serif'
                    }
                  }}
                />
              </ListItem>
              <ListItem sx={{ px: 0, py: 0.1 }}>
                <ListItemText
                  primary="- 3 photos d'identité récentes de même tirage"
                  sx={{
                    '& .MuiListItemText-primary': {
                      fontSize: { xs: 8, md: 10 },
                      color: '#333',
                      fontFamily: 'Arial, sans-serif'
                    }
                  }}
                />
              </ListItem>
              <ListItem sx={{ px: 0, py: 0.1 }}>
                <ListItemText
                  primary="- 1 Certificat de vaccination original à jour signé par le pédiatre"
                  sx={{
                    '& .MuiListItemText-primary': {
                      fontSize: { xs: 8, md: 10 },
                      color: '#333',
                      fontFamily: 'Arial, sans-serif'
                    }
                  }}
                />
              </ListItem>
              <ListItem sx={{ px: 0, py: 0.1 }}>
                <ListItemText
                  primary="- 1 Fiche d'identification et 1 fiche Sanitaire à récupérer à GROUPE SCOLAIRE SAINTE FAMILLE L'EXECELLENCE."
                  sx={{
                    '& .MuiListItemText-primary': {
                      fontSize: { xs: 8, md: 10 },
                      color: '#333',
                      fontFamily: 'Arial, sans-serif'
                    }
                  }}
                />
              </ListItem>
            </List>
          </Box>

          {/* Section EFFETS À FOURNIR */}
          <Box sx={{ mb: 0.5 }}>
            <Typography
              variant="h5"
              sx={{
                color: '#1780c2',
                fontWeight: 700,
                fontSize: { xs: 10, md: 12 },
                mb: 0.3,
                fontFamily: 'Arial, sans-serif'
              }}
            >
              EFFETS À FOURNIR
            </Typography>
            
            <List sx={{ pl: 0 }}>
              <ListItem sx={{ px: 0, py: 0.1 }}>
                <ListItemText
                  primary="- 1 porte-vue de 100 vues"
                  sx={{
                    '& .MuiListItemText-primary': {
                      fontSize: { xs: 8, md: 10 },
                      color: '#333',
                      fontFamily: 'Arial, sans-serif'
                    }
                  }}
                />
              </ListItem>
              <ListItem sx={{ px: 0, py: 0.1 }}>
                <ListItemText
                  primary="- 1 cahier de 100 pages - couverture transparente"
                  sx={{
                    '& .MuiListItemText-primary': {
                      fontSize: { xs: 8, md: 10 },
                      color: '#333',
                      fontFamily: 'Arial, sans-serif'
                    }
                  }}
                />
              </ListItem>
              <ListItem sx={{ px: 0, py: 0.1 }}>
                <ListItemText
                  primary="- 1 grand cahier de 200 pages 24x32 + couvrant + couverture transparente"
                  sx={{
                    '& .MuiListItemText-primary': {
                      fontSize: { xs: 8, md: 10 },
                      color: '#333',
                      fontFamily: 'Arial, sans-serif'
                    }
                  }}
                />
              </ListItem>
              <ListItem sx={{ px: 0, py: 0.1 }}>
                <ListItemText
                  primary="- 1 paquet de rame A4"
                  sx={{
                    '& .MuiListItemText-primary': {
                      fontSize: { xs: 8, md: 10 },
                      color: '#333',
                      fontFamily: 'Arial, sans-serif'
                    }
                  }}
                />
              </ListItem>
              <ListItem sx={{ px: 0, py: 0.1 }}>
                <ListItemText
                  primary="- 1 pot de peinture"
                  sx={{
                    '& .MuiListItemText-primary': {
                      fontSize: { xs: 8, md: 10 },
                      color: '#333',
                      fontFamily: 'Arial, sans-serif'
                    }
                  }}
                />
              </ListItem>
              <ListItem sx={{ px: 0, py: 0.1 }}>
                <ListItemText
                  primary="- 3 boîtes de mouchoirs de 200 renouvelables"
                  sx={{
                    '& .MuiListItemText-primary': {
                      fontSize: { xs: 8, md: 10 },
                      color: '#333',
                      fontFamily: 'Arial, sans-serif'
                    }
                  }}
                />
              </ListItem>
              <ListItem sx={{ px: 0, py: 0.1 }}>
                <ListItemText
                  primary="- 1 Boîte de gants (taille standard)"
                  sx={{
                    '& .MuiListItemText-primary': {
                      fontSize: { xs: 8, md: 10 },
                      color: '#333',
                      fontFamily: 'Arial, sans-serif'
                    }
                  }}
                />
              </ListItem>
              <ListItem sx={{ px: 0, py: 0.1 }}>
                <ListItemText
                  primary="- Les couches et lingettes renouvelables"
                  sx={{
                    '& .MuiListItemText-primary': {
                      fontSize: { xs: 8, md: 10 },
                      color: '#333',
                      fontFamily: 'Arial, sans-serif'
                    }
                  }}
                />
              </ListItem>
              <ListItem sx={{ px: 0, py: 0.1 }}>
                <ListItemText
                  primary="- Un vieux tee-shirt"
                  sx={{
                    '& .MuiListItemText-primary': {
                      fontSize: { xs: 8, md: 10 },
                      color: '#333',
                      fontFamily: 'Arial, sans-serif'
                    }
                  }}
                />
              </ListItem>
              <ListItem sx={{ px: 0, py: 0.1 }}>
                <ListItemText
                  primary="- Des vêtements de rechange, 1 gant, 1 petite serviette marquée au nom de l'enfant"
                  sx={{
                    '& .MuiListItemText-primary': {
                      fontSize: { xs: 8, md: 10 },
                      color: '#333',
                      fontFamily: 'Arial, sans-serif'
                    }
                  }}
                />
              </ListItem>
              <ListItem sx={{ px: 0, py: 0.1 }}>
                <ListItemText
                  primary="- Des chaussures d'intérieur"
                  sx={{
                    '& .MuiListItemText-primary': {
                      fontSize: { xs: 8, md: 10 },
                      color: '#333',
                      fontFamily: 'Arial, sans-serif'
                    }
                  }}
                />
              </ListItem>
            </List>
          </Box>

          {/* Section HORAIRE */}
          <Box sx={{ mb: 0.5 }}>
            <Typography
              variant="h5"
              sx={{
                color: '#1780c2',
                fontWeight: 700,
                fontSize: { xs: 10, md: 12 },
                mb: 0.3,
                fontFamily: 'Arial, sans-serif'
              }}
            >
              HORAIRE
            </Typography>
            
            <Typography sx={{ fontSize: { xs: 8, md: 10 }, mb: 0.3 }}>
              Lundi au vendredi de 07H00-13H30 et de 13H30-18H
            </Typography>
          </Box>

          {/* Section CANTINE */}
          <Box sx={{ mb: 0.5 }}>
            <Typography
              variant="h5"
              sx={{
                color: '#1780c2',
                fontWeight: 700,
                fontSize: { xs: 10, md: 12 },
                mb: 0.3,
                fontFamily: 'Arial, sans-serif'
              }}
            >
              CANTINE
            </Typography>
            
            <Typography sx={{ fontSize: { xs: 8, md: 10 }, mb: 0.2 }}>
              Tarif: 50.000 francs/mois (les collations sont offertes)
            </Typography>
            
            <Typography sx={{ fontSize: { xs: 8, md: 10 }, mb: 0.2, fontStyle: 'italic' }}>
              NB: Tout mois commencé est dû et payable au plus tard le 05 du mois en cours. L'inscription n'est pas remboursable.
            </Typography>
            
            <Typography sx={{ fontSize: { xs: 8, md: 10 }, mb: 0.3, fontWeight: 600 }}>
              FRAIS ANNEXES : 25.000 F CFA
            </Typography>
          </Box>

          {/* Messages de fin */}
          <Box sx={{ mb: 0.5 }}>
            <Typography sx={{ fontSize: { xs: 8, md: 10 }, mb: 0.2, fontStyle: 'italic' }}>
              La garderie reste ouverte sur toute l'année sauf les congés de Noël.
            </Typography>
            <Typography sx={{ fontSize: { xs: 8, md: 10 }, mb: 0.3, fontWeight: 600, color: '#1780c2' }}>
              Nous avons hâte de vous recevoir !
            </Typography>
          </Box>

              {/* Bouton de téléchargement */}
              <Box sx={{ textAlign: 'center' }}>
                <Button
                  variant="contained"
                  sx={{
                    bgcolor: '#1780c2',
                    color: 'white',
                    fontSize: { xs: 8, md: 10 },
                    fontWeight: 600,
                    py: 0.3,
                    px: 1.5,
                    borderRadius: 2,
                    textTransform: 'none',
                    fontFamily: 'Arial, sans-serif',
                    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.2)',
                    '&:hover': {
                      bgcolor: '#1565c0',
                      transform: 'translateY(-2px)',
                      boxShadow: '0 6px 16px rgba(0, 0, 0, 0.3)',
                    },
                    transition: 'all 0.3s ease'
                  }}
                >
                  Téléchargez le PDF
                </Button>
              </Box>
            </Box>
          </Grid>
        </Grid>
      </Container>
    </Box>
  );
};

// Composant principal Scolarité
const ScolariteMaternel = () => {
  return (
    <>
      <Helmet>
        <title>École Maternelle Bilingue Abidjan - GROUPE SCOLAIRE SAINTE FAMILLE L'EXECELLENCE | Méthode Montessori</title>
        <meta name="description" content="École maternelle bilingue à Abidjan Cocody Riviera 3. GROUPE SCOLAIRE SAINTE FAMILLE L'EXECELLENCE propose une pédagogie Montessori pour enfants de 3 à 6 ans avec programme français-anglais, éveil intellectuel et développement de l'autonomie. Inscription 2025-2026." />
        <meta name="keywords" content="école maternelle Abidjan, maternelle bilingue Cocody, méthode Montessori maternelle, programme français-anglais, éveil intellectuel, développement autonomie, inscription maternelle 2025, GROUPE SCOLAIRE SAINTE FAMILLE L'EXECELLENCE, école privée Riviera 3, pédagogie alternative" />
        <meta property="og:title" content="École Maternelle Bilingue Abidjan - GROUPE SCOLAIRE SAINTE FAMILLE L'EXECELLENCE | Méthode Montessori" />
        <meta property="og:description" content="École maternelle bilingue à Abidjan Cocody Riviera 3. GROUPE SCOLAIRE SAINTE FAMILLE L'EXECELLENCE propose une pédagogie Montessori pour enfants de 3 à 6 ans avec programme français-anglais." />
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://saintefamilleexcellence.ci/scolarite-maternel" />
        <link rel="canonical" href="https://saintefamilleexcellence.ci/scolarite-maternel" />
      </Helmet>
      <Box sx={{ 
        width: '100%',
        margin: 0,
        padding: 0
      }}>
        <ContactBanner 
          showMobileMenu={true}
          mobileMenuAnchor={null}
          handleMobileMenuOpen={() => {}}
          handleMobileMenuClose={() => {}}
          navigationItems={[
            { label: 'ACCUEIL', path: '/' },
            { label: 'PRESENTATION', path: '/presentation' },
            { 
              label: 'SCOLARITE', 
              path: '/scolarite',
              hasSubmenu: true,
              submenu: [
                { label: 'CRÈCHE/GARDERIE', path: '/scolarite' },
                { label: 'MATERNELLE', path: '/scolarite-maternel' }
              ]
            },
            { label: 'NOS ACTIVITES', path: '/activites' },
            { label: 'BLOG', path: '/blog' },
            { label: 'CONTACTS', path: '#footer', isScroll: true },
            { label: 'CONNEXION', path: '/login' },
          ]}
        />
        <NavigationBar />
        <ScolariteHero />
        <MaternelleSection />
        <FicheRenseignementsSection />
        
        <SiteFooter />
      </Box>
    </>
  );
};


export default ScolariteMaternel;

