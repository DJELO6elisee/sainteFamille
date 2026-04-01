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
                              color: subItem.path === '/scolarite' ? '#FF9800' : 'white',
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
                                color: subItem.path === '/scolarite' ? '#FF9800' : 'white',
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
        
        {/* Bannière bleue - "CRÈCHE/GARDERIE" */}
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
            CRÈCHE/GARDERIE
          </Typography>
        </Box>
        
        {/* Sous-titre - "-MATERNELLE" */}
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
          -MATERNELLE
        </Typography>
      </Box>
    </Box>
  );
};

// Section Crèche/Garderie avec informations et inscription
const CrecheGarderieSection = () => {
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
            {/* Message de bienvenue */}
            <Typography
              variant="h4"
              sx={{
                color: '#1780c2',
                fontWeight: 700,
                fontSize: { xs: 20, md: 24 },
                mb: 3,
                fontFamily: 'Arial, sans-serif'
              }}
            >
              Bienvenue dans notre crèche/garderie !
            </Typography>

            {/* Description */}
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
              Nous accueillons les enfants de 3 mois à 3 ans dans un cadre sécurisé, chaleureux et adapté à chaque âge. 
              Un lieu où les tout-petits découvrent, explorent et grandissent à leur rythme.
            </Typography>

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
              À travers des activités ludiques et éducatives, nous accompagnons pas à pas leur éveil, leur curiosité 
              et leur autonomie, en tissant chaque jour un lien de confiance avec les familles.
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
              Notre crèche/garderie est ouverte toute l'année scolaire.
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
                  primary="• Une copie de l'acte de naissance"
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
                  primary="• 1 certificat de vaccination original, à jour, signé par le pédiatre"
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
                  primary="• 1 fiche d'identification et 1 fiche de santé à retirer à GROUPE SCOLAIRE SAINTE FAMILLE L'EXECELLENCE"
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
                  src="/img/pages/ac2.jpg" // Image des enfants dans la crèche
                  alt="Enfants dans la crèche/garderie"
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
      backgroundColor: '#4CAF50', // Couleur verte
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      py: { xs: 2, md: 3 }
    }}>
      <Container maxWidth="lg">
        <Box sx={{
          bgcolor: 'white',
          borderRadius: 3,
          p: { xs: 2, md: 3 },
          boxShadow: '0 8px 32px rgba(0,0,0,0.1)',
          maxWidth: '100%'
        }}>
          {/* En-tête */}
          <Box sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            mb: 2,
            flexWrap: 'wrap',
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
              p: 0.5
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
                  fontSize: { xs: 20, md: 24 },
                  mb: 1,
                  fontFamily: 'Arial, sans-serif'
                }}
              >
                FICHE DE RENSEIGNEMENTS
              </Typography>
            </Box>
            
            <Typography
              variant="h6"
              sx={{
                color: '#1780c2',
                fontWeight: 600,
                fontSize: { xs: 14, md: 16 },
                fontFamily: 'Arial, sans-serif'
              }}
            >
              ANNÉE SCOLAIRE 2023-2024
            </Typography>
          </Box>

          {/* Section CLASSES */}
          <Box sx={{ mb: 2 }}>
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
              CLASSES
            </Typography>
            
            <TableContainer component={Paper} sx={{ boxShadow: 'none', border: '1px solid #ddd' }}>
              <Table size="small">
                <TableHead>
                  <TableRow sx={{ bgcolor: '#f5f5f5' }}>
                    <TableCell sx={{ fontWeight: 700, fontSize: { xs: 12, md: 14 } }}>CLASSES</TableCell>
                    <TableCell sx={{ fontWeight: 700, fontSize: { xs: 12, md: 14 } }}>1ère tranche<br />(30 Sep 2023)</TableCell>
                    <TableCell sx={{ fontWeight: 700, fontSize: { xs: 12, md: 14 } }}>2ème tranche<br />(05 Jan 2024)</TableCell>
                    <TableCell sx={{ fontWeight: 700, fontSize: { xs: 12, md: 14 } }}>3ème tranche<br />(05 Mar 2024)</TableCell>
                    <TableCell sx={{ fontWeight: 700, fontSize: { xs: 12, md: 14 } }}>TOTAL</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  <TableRow>
                    <TableCell sx={{ fontSize: { xs: 12, md: 14 } }}>TPS (année de naissance 2021)</TableCell>
                    <TableCell sx={{ fontSize: { xs: 12, md: 14 } }}>300,000 CFA</TableCell>
                    <TableCell sx={{ fontSize: { xs: 12, md: 14 } }}>300,000 CFA</TableCell>
                    <TableCell sx={{ fontSize: { xs: 12, md: 14 } }}>300,000 CFA</TableCell>
                    <TableCell sx={{ fontSize: { xs: 12, md: 14 }, fontWeight: 700 }}>1,100,000 CFA</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell sx={{ fontSize: { xs: 12, md: 14 } }}>PS (année de naissance 2020)</TableCell>
                    <TableCell sx={{ fontSize: { xs: 12, md: 14 } }}>300,000 CFA</TableCell>
                    <TableCell sx={{ fontSize: { xs: 12, md: 14 } }}>370,000 CFA</TableCell>
                    <TableCell sx={{ fontSize: { xs: 12, md: 14 } }}>300,000 CFA</TableCell>
                    <TableCell sx={{ fontSize: { xs: 12, md: 14 }, fontWeight: 700 }}>1,150,000 CFA</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell sx={{ fontSize: { xs: 12, md: 14 } }}>MS (année de naissance 2019)</TableCell>
                    <TableCell sx={{ fontSize: { xs: 12, md: 14 } }}>300,000 CFA</TableCell>
                    <TableCell sx={{ fontSize: { xs: 12, md: 14 } }}>370,000 CFA</TableCell>
                    <TableCell sx={{ fontSize: { xs: 12, md: 14 } }}>300,000 CFA</TableCell>
                    <TableCell sx={{ fontSize: { xs: 12, md: 14 }, fontWeight: 700 }}>1,210,000 CFA</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell sx={{ fontSize: { xs: 12, md: 14 } }}>GS (année de naissance 2018)</TableCell>
                    <TableCell sx={{ fontSize: { xs: 12, md: 14 } }}>300,000 CFA</TableCell>
                    <TableCell sx={{ fontSize: { xs: 12, md: 14 } }}>370,000 CFA</TableCell>
                    <TableCell sx={{ fontSize: { xs: 12, md: 14 } }}>300,000 CFA</TableCell>
                    <TableCell sx={{ fontSize: { xs: 12, md: 14 }, fontWeight: 700 }}>1,270,000 CFA</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </TableContainer>
          </Box>

          {/* Section INSCRIPTION ET REINSCRIPTION */}
          <Box sx={{ mb: 2 }}>
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
              INSCRIPTION ET REINSCRIPTION
            </Typography>
            
            <Grid container spacing={2} sx={{ mb: 2 }}>
              <Grid item xs={12} sm={4}>
                <Typography sx={{ fontSize: { xs: 14, md: 16 }, fontWeight: 600 }}>
                  Frais d'inscription: 80,000 CFA
                </Typography>
              </Grid>
              <Grid item xs={12} sm={4}>
                <Typography sx={{ fontSize: { xs: 14, md: 16 }, fontWeight: 600 }}>
                  Frais de réinscription: 50,000 CFA
                </Typography>
              </Grid>
              <Grid item xs={12} sm={4}>
                <Typography sx={{ fontSize: { xs: 14, md: 16 }, fontWeight: 600 }}>
                  Frais diverses: 35,000 CFA
                </Typography>
              </Grid>
            </Grid>

            <List sx={{ pl: 0 }}>
              <ListItem sx={{ px: 0, py: 0.5 }}>
                <ListItemText
                  primary="• Initiation à l'anglais Toute petite section et Petite section"
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
                  primary="• La Moyenne section et grande section sont bilingues."
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
                  primary="• La Moyenne section et la Grande Section (Cours de natation : février-mars)"
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
                  primary="• Grande Section (cours de robotique)"
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

            <Typography sx={{ fontSize: { xs: 14, md: 16 }, mb: 3, fontStyle: 'italic' }}>
              L'inscription d'un enfant n'est effective qu'après le règlement des droits d'inscription (frais d'inscription + frais annexes) et du 1er versement (non remboursables).
            </Typography>
          </Box>

          {/* Section PAIEMENT */}
          <Box sx={{ mb: 2 }}>
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
              PAIEMENT
            </Typography>
            
            {/* Note d'introduction */}
            
            
            {/* Tableau des méthodes de paiement */}
            <TableContainer component={Paper} sx={{ boxShadow: 'none', border: '1px solid #ddd', mb: 2 }}>
              <Table size="small">
                <TableHead>
                  <TableRow sx={{ bgcolor: '#f5f5f5' }}>
                    <TableCell sx={{ fontWeight: 700, fontSize: { xs: 12, md: 14 } }}>MÉTHODE</TableCell>
                    <TableCell sx={{ fontWeight: 700, fontSize: { xs: 12, md: 14 } }}>BÉNÉFICIAIRE</TableCell>
                    <TableCell sx={{ fontWeight: 700, fontSize: { xs: 12, md: 14 } }}>COMPTE</TableCell>
                    <TableCell sx={{ fontWeight: 700, fontSize: { xs: 12, md: 14 } }}>BANQUE</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  <TableRow>
                    <TableCell sx={{ fontSize: { xs: 12, md: 14 }, fontWeight: 600 }}>CHÈQUE</TableCell>
                    <TableCell sx={{ fontSize: { xs: 12, md: 14 } }}>A L'ORDRE DE GROUPE SCOLAIRE SAINTE FAMILLE L'EXECELLENCE-GROUPE SCOLAIRE SAINTE FAMILLE L'EXECELLENCE</TableCell>
                    <TableCell sx={{ fontSize: { xs: 12, md: 14 } }}>-</TableCell>
                    <TableCell sx={{ fontSize: { xs: 12, md: 14 } }}>-</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell sx={{ fontSize: { xs: 12, md: 14 }, fontWeight: 600 }}>DÉPÔT BANCAIRE</TableCell>
                    <TableCell sx={{ fontSize: { xs: 12, md: 14 } }}>GROUPE SCOLAIRE SAINTE FAMILLE L'EXECELLENCE-GROUPE SCOLAIRE SAINTE FAMILLE L'EXECELLENCE</TableCell>
                    <TableCell sx={{ fontSize: { xs: 12, md: 14 } }}>
                      <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                        <Typography sx={{ fontSize: { xs: 12, md: 14 }, fontWeight: 600 }}>CI032</Typography>
                        <Typography sx={{ fontSize: { xs: 12, md: 14 }, fontWeight: 600 }}>01014</Typography>
                        <Typography sx={{ fontSize: { xs: 12, md: 14 }, fontWeight: 600 }}>006383560002</Typography>
                        <Typography sx={{ fontSize: { xs: 12, md: 14 }, fontWeight: 600 }}>50</Typography>
                      </Box>
                    </TableCell>
                    <TableCell sx={{ fontSize: { xs: 12, md: 14 } }}>BANK OF AFRICA COTE D'IVOIRE</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </TableContainer>
            
            {/* Note sur les frais de timbre */}
            <Typography sx={{ fontSize: { xs: 14, md: 16 }, mb: 2, fontStyle: 'italic' }}>
              Pour le dépôt à la banque, il faut prévoir la somme de 100 FCFA pour les frais de timbre.
            </Typography>
            
            {/* Instructions de justification */}
            <Typography sx={{ fontSize: { xs: 14, md: 16 }, mb: 2, lineHeight: 1.6 }}>
              Toujours préciser sur le bordereau du versement le nom, le prénom et la classe de l'enfant. Se présenter avec le justificatif du versement sur le compte, à la caisse de l'école de GROUPE SCOLAIRE SAINTE FAMILLE L'EXECELLENCE -GROUPE SCOLAIRE SAINTE FAMILLE L'EXECELLENCE ou le transmettre par mail ou par WhatsApp dans un bref délais au service comptable (infos@lapetiteacademie.ci) afin de valider le paiement et rendre effective l'admission en classe.
            </Typography>
            
            {/* Frais de chèques impayés */}
            <Typography sx={{ fontSize: { xs: 14, md: 16 }, mb: 2 }}>
              Frais de chèques impayés: 30.000F CFA
            </Typography>
            
            {/* Réduction pour familles nombreuses */}
            <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
              <Box sx={{
                width: 16,
                height: 16,
                border: '1px solid #333',
                borderRadius: 1,
                mt: 0.5,
                flexShrink: 0
              }} />
              <Typography sx={{ fontSize: { xs: 14, md: 16 }, lineHeight: 1.6 }}>
                Une réduction de la scolarité de 05%, hors frais d'inscription, est accordée aux familles à partir du 2 ème enfant
              </Typography>
            </Box>
          </Box>

          {/* Section LISTE DES PIECES OBLIGATOIRES ET FOURNITURES */}
          <Box sx={{ mb: 2 }}>
            <Grid container spacing={2}>
              {/* Colonne gauche - LISTE DES PIECES OBLIGATOIRES */}
              <Grid item xs={12} md={6}>
                <Box sx={{
                  border: '1px solid #ddd',
                  borderLeft: '4px solid #4CAF50',
                  p: 2,
                  height: '100%'
                }}>
                  <Typography
                    variant="h5"
                    sx={{
                      color: '#1780c2',
                      fontWeight: 700,
                      fontSize: { xs: 16, md: 18 },
                      mb: 2,
                      fontFamily: 'Arial, sans-serif',
                      textDecoration: 'underline'
                    }}
                  >
                    LISTE DES PIECES OBLIGATOIRES A FOURNIR
                  </Typography>
                  
                  <List sx={{ pl: 0 }}>
                    <ListItem sx={{ px: 0, py: 0.5 }}>
                      <ListItemText
                        primary="• 1 extrait de naissance original"
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
                        primary="• 1 photocopie du carnet de vaccination à jour"
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
                        primary="• 1 Fiche d'identification à récupérer à GROUPE SCOLAIRE SAINTE FAMILLE L'EXECELLENCE"
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
                        primary="• 1 fiche Sanitaire à récupérer à GROUPE SCOLAIRE SAINTE FAMILLE L'EXECELLENCE"
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
                </Box>
              </Grid>

              {/* Colonne droite - FOURNITURES */}
              <Grid item xs={12} md={6}>
                <Box sx={{
                  border: '1px solid #ddd',
                  borderRight: '4px solid #4CAF50',
                  p: 2,
                  height: '100%'
                }}>
                  <Typography
                    variant="h5"
                    sx={{
                      color: '#1780c2',
                      fontWeight: 700,
                      fontSize: { xs: 16, md: 18 },
                      mb: 2,
                      fontFamily: 'Arial, sans-serif',
                      textDecoration: 'underline'
                    }}
                  >
                    Fournitures
                  </Typography>
                  
                  <List sx={{ pl: 0, mb: 2 }}>
                    <ListItem sx={{ px: 0, py: 0.5 }}>
                      <ListItemText
                        primary="• Grande section : 95.000f CFA"
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
                        primary="• Moyenne section : 85.000F CFA"
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
                        primary="• Petite section : 80.000F CFA"
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
                        primary="• Toute petite section : 75.000f CFA"
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

                  <Typography sx={{ 
                    fontSize: { xs: 14, md: 16 },
                    color: '#333',
                    fontFamily: 'Arial, sans-serif',
                    fontWeight: 600
                  }}>
                    Tenues scolaires : 30.000 le kit (2 uniformes et une tenue de sport)
                  </Typography>
                </Box>
              </Grid>
            </Grid>
          </Box>

          {/* Section CANTINE */}
          <Box sx={{ mb: 2 }}>
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
              CANTINE (facultative)
            </Typography>
            
            <TableContainer component={Paper} sx={{ boxShadow: 'none', border: '1px solid #ddd', mb: 2 }}>
              <Table size="small" sx={{ 
                tableLayout: 'fixed',
                width: '100%'
              }}>
                <TableHead>
                  <TableRow sx={{ bgcolor: '#f5f5f5' }}>
                    <TableCell sx={{ fontWeight: 700, fontSize: { xs: 9, md: 10 }, width: '12%', px: 0.5 }}>CLASSES</TableCell>
                    <TableCell sx={{ fontWeight: 700, fontSize: { xs: 9, md: 10 }, width: '12%', px: 0.5 }}>MODALITE</TableCell>
                    <TableCell sx={{ fontWeight: 700, fontSize: { xs: 9, md: 10 }, width: '6%', px: 0.5 }}>SEP</TableCell>
                    <TableCell sx={{ fontWeight: 700, fontSize: { xs: 9, md: 10 }, width: '6%', px: 0.5 }}>OCT</TableCell>
                    <TableCell sx={{ fontWeight: 700, fontSize: { xs: 9, md: 10 }, width: '6%', px: 0.5 }}>NOV</TableCell>
                    <TableCell sx={{ fontWeight: 700, fontSize: { xs: 9, md: 10 }, width: '6%', px: 0.5 }}>DEC</TableCell>
                    <TableCell sx={{ fontWeight: 700, fontSize: { xs: 9, md: 10 }, width: '6%', px: 0.5 }}>JAN</TableCell>
                    <TableCell sx={{ fontWeight: 700, fontSize: { xs: 9, md: 10 }, width: '6%', px: 0.5 }}>FEB</TableCell>
                    <TableCell sx={{ fontWeight: 700, fontSize: { xs: 9, md: 10 }, width: '6%', px: 0.5 }}>MAR</TableCell>
                    <TableCell sx={{ fontWeight: 700, fontSize: { xs: 9, md: 10 }, width: '6%', px: 0.5 }}>AVR</TableCell>
                    <TableCell sx={{ fontWeight: 700, fontSize: { xs: 9, md: 10 }, width: '6%', px: 0.5 }}>MAI</TableCell>
                    <TableCell sx={{ fontWeight: 700, fontSize: { xs: 9, md: 10 }, width: '6%', px: 0.5 }}>JUN</TableCell>
                    <TableCell sx={{ fontWeight: 700, fontSize: { xs: 9, md: 10 }, width: '6%', px: 0.5 }}>JUL</TableCell>
                    <TableCell sx={{ fontWeight: 700, fontSize: { xs: 9, md: 10 }, width: '10%', px: 0.5 }}>TOTAL</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  <TableRow>
                    <TableCell sx={{ fontSize: { xs: 9, md: 10 }, px: 0.5 }}>CRÈCHE</TableCell>
                    <TableCell sx={{ fontSize: { xs: 9, md: 10 }, px: 0.5 }}>Mensuel</TableCell>
                    <TableCell sx={{ fontSize: { xs: 9, md: 10 }, px: 0.5 }}>50,000</TableCell>
                    <TableCell sx={{ fontSize: { xs: 9, md: 10 }, px: 0.5 }}>50,000</TableCell>
                    <TableCell sx={{ fontSize: { xs: 9, md: 10 }, px: 0.5 }}>50,000</TableCell>
                    <TableCell sx={{ fontSize: { xs: 9, md: 10 }, px: 0.5 }}>50,000</TableCell>
                    <TableCell sx={{ fontSize: { xs: 9, md: 10 }, px: 0.5 }}>50,000</TableCell>
                    <TableCell sx={{ fontSize: { xs: 9, md: 10 }, px: 0.5 }}>50,000</TableCell>
                    <TableCell sx={{ fontSize: { xs: 9, md: 10 }, px: 0.5 }}>50,000</TableCell>
                    <TableCell sx={{ fontSize: { xs: 9, md: 10 }, px: 0.5 }}>50,000</TableCell>
                    <TableCell sx={{ fontSize: { xs: 9, md: 10 }, px: 0.5 }}>50,000</TableCell>
                    <TableCell sx={{ fontSize: { xs: 9, md: 10 }, px: 0.5 }}>50,000</TableCell>
                    <TableCell sx={{ fontSize: { xs: 9, md: 10 }, px: 0.5 }}>50,000</TableCell>
                    <TableCell sx={{ fontSize: { xs: 9, md: 10 }, fontWeight: 700, px: 0.5 }}>550,000 CFA</TableCell>
                  </TableRow>
                  {/* <TableRow>
                    <TableCell sx={{ fontSize: { xs: 9, md: 10 }, px: 0.5 }}>MATERNELLE</TableCell>
                    <TableCell sx={{ fontSize: { xs: 9, md: 10 }, px: 0.5 }}>Mensuel</TableCell>
                    <TableCell sx={{ fontSize: { xs: 9, md: 10 }, px: 0.5 }}>50,000</TableCell>
                    <TableCell sx={{ fontSize: { xs: 9, md: 10 }, px: 0.5 }}>50,000</TableCell>
                    <TableCell sx={{ fontSize: { xs: 9, md: 10 }, px: 0.5 }}>50,000</TableCell>
                    <TableCell sx={{ fontSize: { xs: 9, md: 10 }, px: 0.5 }}>50,000</TableCell>
                    <TableCell sx={{ fontSize: { xs: 9, md: 10 }, px: 0.5 }}>50,000</TableCell>
                    <TableCell sx={{ fontSize: { xs: 9, md: 10 }, px: 0.5 }}>50,000</TableCell>
                    <TableCell sx={{ fontSize: { xs: 9, md: 10 }, px: 0.5 }}>50,000</TableCell>
                    <TableCell sx={{ fontSize: { xs: 9, md: 10 }, px: 0.5 }}>50,000</TableCell>
                    <TableCell sx={{ fontSize: { xs: 9, md: 10 }, px: 0.5 }}>50,000</TableCell>
                    <TableCell sx={{ fontSize: { xs: 9, md: 10 }, px: 0.5 }}>50,000</TableCell>
                    <TableCell sx={{ fontSize: { xs: 9, md: 10 }, fontWeight: 700, px: 0.5 }}>500,000 CFA</TableCell>
                  </TableRow> */}
                  <TableRow>
                    <TableCell sx={{ fontSize: { xs: 9, md: 10 }, px: 0.5 }}>TPS-GS</TableCell>
                    <TableCell sx={{ fontSize: { xs: 9, md: 10 }, px: 0.5 }}>Par tranche (3 mois)</TableCell>
                    <TableCell sx={{ fontSize: { xs: 9, md: 10 }, px: 0.5 }}>150,000</TableCell>
                    <TableCell sx={{ fontSize: { xs: 9, md: 10 }, px: 0.5 }}>-</TableCell>
                    <TableCell sx={{ fontSize: { xs: 9, md: 10 }, px: 0.5 }}>-</TableCell>
                    <TableCell sx={{ fontSize: { xs: 9, md: 10 }, px: 0.5 }}>150,000</TableCell>
                    <TableCell sx={{ fontSize: { xs: 9, md: 10 }, px: 0.5 }}>-</TableCell>
                    <TableCell sx={{ fontSize: { xs: 9, md: 10 }, px: 0.5 }}>-</TableCell>
                    <TableCell sx={{ fontSize: { xs: 9, md: 10 }, px: 0.5 }}>150,000</TableCell>
                    <TableCell sx={{ fontSize: { xs: 9, md: 10 }, px: 0.5 }}>-</TableCell>
                    <TableCell sx={{ fontSize: { xs: 9, md: 10 }, px: 0.5 }}>-</TableCell>
                    <TableCell sx={{ fontSize: { xs: 9, md: 10 }, px: 0.5 }}>50,000</TableCell>
                    <TableCell sx={{ fontSize: { xs: 9, md: 10 }, px: 0.5 }}>-</TableCell>
                    <TableCell sx={{ fontSize: { xs: 9, md: 10 }, fontWeight: 700, px: 0.5 }}>500,000 CFA</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </TableContainer>

            <Typography sx={{ fontSize: { xs: 14, md: 16 }, mb: 2, fontStyle: 'italic' }}>
              Pour tout enfant inscrit à la cantine mais restant toute la journée, un droit d'hébergement de 15.000 FCFA est à payer chaque mois.
            </Typography>
          </Box>

          {/* Informations de contact */}
          <Box sx={{ mb: 2 }}>
            <Typography sx={{ fontSize: { xs: 14, md: 16 }, mb: 1 }}>
              Crèche/maternelle GROUPE SCOLAIRE SAINTE FAMILLE L'EXECELLENCE-GROUPE SCOLAIRE SAINTE FAMILLE L'EXECELLENCE, Angré 8è tranche, 06 BP 1980 Abidjan 06
            </Typography>
            <Typography sx={{ fontSize: { xs: 14, md: 16 }, mb: 1, fontWeight: 600 }}>
              CONTACTS : 27 22 51 50 04 / 07 89 02 24 24 / Email : info@lapetiteacademie.ci
            </Typography>
          </Box>

          {/* Bouton de téléchargement */}
          <Box sx={{ textAlign: 'center' }}>
            <Button
              variant="contained"
              sx={{
                bgcolor: '#1780c2',
                color: 'white',
                fontSize: { xs: 14, md: 16 },
                fontWeight: 600,
                py: 2,
                px: 4,
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
      </Container>
    </Box>
  );
};

// Composant principal Scolarité
const Scolarite = () => {
  return (
    <>
      <Helmet>
        <title>Crèche Garderie TPS Abidjan - GROUPE SCOLAIRE SAINTE FAMILLE L'EXECELLENCE | Inscription 2025-2026</title>
        <meta name="description" content="Crèche et garderie TPS à Abidjan Cocody II Plateau Agban. Le GROUPE SCOLAIRE SAINTE FAMILLE L'EXECELLENCE accueille les tout-petits de 3 mois à 3 ans dans un environnement bienveillant avec pédagogie alternative et programme bilingue français-anglais. École sans distinction. Inscription 2025-2026." />
        <meta name="keywords" content="crèche TPS Abidjan, garderie TPS Cocody, crèche 3 mois 3 ans, garderie bébé Abidjan, pédagogie alternative crèche, programme bilingue crèche, inscription crèche 2025, GROUPE SCOLAIRE SAINTE FAMILLE L'EXECELLENCE, crèche privée Plateau Agban, éveil bébé, développement tout-petit, école sans distinction" />
        <meta property="og:title" content="Crèche Garderie TPS Abidjan - GROUPE SCOLAIRE SAINTE FAMILLE L'EXECELLENCE | Inscription 2025-2026" />
        <meta property="og:description" content="Crèche et garderie TPS à Abidjan Cocody II Plateau Agban. Le GROUPE SCOLAIRE SAINTE FAMILLE L'EXECELLENCE accueille les tout-petits de 3 mois à 3 ans avec pédagogie alternative et programme bilingue." />
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://saintefamilleexcellence.ci/scolarite" />
        <link rel="canonical" href="https://saintefamilleexcellence.ci/scolarite" />
      </Helmet>
      <Box sx={{ 
        width: '100%',
        margin: 0,
        padding: 0
      }}>
        <ContactBanner />
        <NavigationBar />
        <ScolariteHero />
        <CrecheGarderieSection />
        <FicheRenseignementsSection />
        
        <SiteFooter />
      </Box>
    </>
  );
};

export default Scolarite;

