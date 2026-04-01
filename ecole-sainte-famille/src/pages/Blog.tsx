import React, { useState } from 'react';
import { Box, Container, Typography, useTheme, useMediaQuery, Button, Menu, MenuItem, IconButton } from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { ContactBanner, SiteFooter } from './Home';
import MenuIcon from '@mui/icons-material/Menu';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';

// Composant de navigation avec onglets (réutilisé de Home.tsx)
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
                        color: item.label === 'BLOG' ? '#FF9800' : 'white',
                        fontWeight: 600,
                        fontSize: { md: 12, lg: 14 },
                        textTransform: 'uppercase',
                        letterSpacing: 0.5,
                        px: { md: 1.5, lg: 2 },
                        py: 1,
                        borderBottom: item.label === 'BLOG' ? '2px solid #FF9800' : '2px solid transparent',
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
                          color: item.label === 'BLOG' ? '#FF9800' : 'white',
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

// Section Hero pour le Blog
const BlogHeroSection = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  return (
    <Box sx={{
      position: 'relative',
      width: '100%',
      height: '40vh',
      backgroundImage: 'url(/img/pages/ac.jpg)', // Image de fond du bâtiment
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
        bgcolor: 'rgba(0, 0, 0, 0.6)',
        zIndex: 1
      }} />

      {/* Contenu principal */}
      <Box sx={{
        position: 'relative',
        zIndex: 3,
        textAlign: 'center',
        color: 'white'
      }}>
        <Typography
          variant="h1"
          sx={{
            color: 'white',
            fontWeight: 'bold',
            fontSize: { xs: 32, md: 48, lg: 64 },
            textShadow: '2px 2px 4px rgba(0,0,0,0.8)',
            mb: 2,
            textTransform: 'uppercase',
            letterSpacing: 2,
            fontFamily: 'Arial, sans-serif'
          }}
        >
          BLOG
        </Typography>
        
        <Typography
          variant="h4"
          sx={{
            color: 'white',
            fontWeight: 400,
            fontSize: { xs: 16, md: 20, lg: 24 },
            textShadow: '2px 2px 4px rgba(0,0,0,0.8)',
            fontFamily: 'Arial, sans-serif'
          }}
        >
          Découvrez nos articles sur l'éducation et le développement des enfants
        </Typography>
      </Box>
    </Box>
  );
};

// Section des articles de blog
const BlogArticlesSection = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const articles = [
    {
      title: "Les avantages des jeux éducatifs pour les enfants de la maternelle",
      image: "/img/pages/53.jpg", // Image de puzzle éducatif
      description: "L'éducation des tout-petits est une étape essentielle dans leur développement global. À la maternelle, les enfants découvrent le monde qui les entoure à travers le jeu, un outil naturel d'apprentissage.",
      readMore: "Lire plus"
    },
    {
      title: "Les bienfaits de la lecture pour les enfants de 3 à 5 ans",
      image: "/img/pages/107.jpg", // Image d'enfants lisant
      description: "L'un des principaux avantages de la lecture est l'enrichissement du langage. À travers les histoires, les enfants découvrent de nouveaux mots, de nouvelles expressions et des structures grammaticales variées.",
      readMore: "Lire plus"
    },
    {
      title: "L'importance des activités en plein air pour les enfants de la maternelle",
      image: "/img/pages/142.jpg", // Image de jeux en plein air
      description: "Le développement des enfants de maternelle ne se limite pas aux activités en classe ou aux jeux éducatifs.",
      readMore: "Lire plus"
    }
  ];

  return (
    <Box sx={{
      bgcolor: 'white',
      py: { xs: 4, md: 6 },
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
        backgroundImage: 'url(/img/pages/doodles.png)', // Motifs décoratifs (fleurs, étoiles, lettres)
        backgroundSize: '200px',
        backgroundRepeat: 'repeat',
        opacity: 0.1,
        zIndex: 0
      }} />

      {/* Forme décorative verte sur le côté */}
      <Box sx={{
        position: 'absolute',
        right: 0,
        top: '10%',
        width: { xs: '80px', md: '150px' },
        height: { xs: '200px', md: '350px' },
        bgcolor: '#32CD32',
        borderRadius: '50% 0 0 50%',
        opacity: 0.8,
        zIndex: 1
      }} />

      <Container maxWidth="lg" sx={{ position: 'relative', zIndex: 2 }}>
        {/* Liste des articles */}
        <Box sx={{
          display: 'flex',
          flexDirection: 'column',
          maxWidth: { xs: '100%', md: '70%' } // Pour laisser de l'espace à la forme verte
        }}>
          {articles.map((article, index) => (
            <Box
              key={index}
              sx={{
                display: 'flex',
                flexDirection: { xs: 'column', md: 'row' },
                gap: { xs: 2, md: 3 },
                alignItems: 'flex-start',
                mb: { xs: 4, md: 5 }
              }}
            >
              {/* Image de l'article */}
              <Box sx={{
                width: { xs: '100%', md: '250px' },
                height: { xs: 150, md: 150 },
                flexShrink: 0,
                overflow: 'hidden',
                borderRadius: 2,
                border: '2px solid #1780c2'
              }}>
                <img
                  src={article.image}
                  alt={article.title}
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                    display: 'block'
                  }}
                />
              </Box>

              {/* Contenu de l'article */}
              <Box sx={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                gap: 2
              }}>
                {/* Titre */}
                <Typography
                  variant="h5"
                  sx={{
                    color: '#1780c2',
                    fontWeight: 700,
                    fontSize: { xs: 18, md: 20 },
                    fontFamily: 'Arial, sans-serif',
                    lineHeight: 1.3,
                    textDecoration: 'underline',
                    textDecorationColor: '#1780c2'
                  }}
                >
                  {article.title}
                </Typography>

                {/* Description */}
                <Typography
                  variant="body1"
                  sx={{
                    color: '#333',
                    fontSize: { xs: 14, md: 16 },
                    lineHeight: 1.6,
                    fontFamily: 'Arial, sans-serif'
                  }}
                >
                  {article.description}
                </Typography>

                {/* Lien "Lire plus" */}
                <Button
                  sx={{
                    color: '#1780c2',
                    fontWeight: 600,
                    fontSize: { xs: 14, md: 16 },
                    textTransform: 'none',
                    textDecoration: 'underline',
                    textDecorationColor: '#1780c2',
                    alignSelf: 'flex-start',
                    p: 0,
                    minWidth: 'auto',
                    '&:hover': {
                      bgcolor: 'transparent',
                      textDecoration: 'underline',
                      textDecorationColor: '#FF9800',
                      color: '#FF9800'
                    }
                  }}
                >
                  {article.readMore}
                </Button>
              </Box>
            </Box>
          ))}
        </Box>
      </Container>
    </Box>
  );
};

// Section Actualités de l'établissement
const ActualitesSection = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const actualites = [
    {
      title: "Rentrée scolaire 2025/2026",
      image: "/img/pages/MTC.jpeg", // Image de graduation/rentrée
      description: "Préparez-vous pour une nouvelle année scolaire riche en découvertes et apprentissages."
    },
    {
      title: "Programme des activités",
      image: "/img/pages/107.jpg", // Image d'enfant avec livre
      description: "Découvrez notre programme d'activités éducatives et ludiques pour cette année."
    },
    {
      title: "Sortie découverte",
      image: "/img/pages/65.jpg", // Image de sortie éducative
      description: "Nos sorties éducatives permettent aux enfants d'explorer le monde qui les entoure."
    }
  ];

  return (
    <Box sx={{
      bgcolor: 'white',
      py: { xs: 4, md: 6 },
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
        backgroundImage: 'url(/img/pages/doodles.png)', // Motifs décoratifs scolaires
        backgroundSize: '200px',
        backgroundRepeat: 'repeat',
        opacity: 0.1,
        zIndex: 0
      }} />

      {/* Forme décorative verte en bas à gauche */}
      <Box sx={{
        position: 'absolute',
        left: 0,
        bottom: 0,
        width: { xs: '80px', md: '150px' },
        height: { xs: '80px', md: '120px' },
        bgcolor: '#32CD32',
        borderRadius: '0 50% 0 0',
        opacity: 0.8,
        zIndex: 1
      }} />

      <Container maxWidth="lg" sx={{ position: 'relative', zIndex: 2 }}>
        {/* Titre de la section */}
        <Typography
          variant="h2"
          sx={{
            color: '#1780c2',
            fontWeight: 700,
            fontSize: { xs: 24, md: 32, lg: 36 },
            textAlign: 'center',
            mb: 6,
            fontFamily: 'Arial, sans-serif'
          }}
        >
          Actualités de l'établissement
        </Typography>

        {/* Grille des 3 actualités */}
        <Box sx={{
          display: 'grid',
          gridTemplateColumns: { 
            xs: '1fr', 
            sm: 'repeat(2, 1fr)', 
            md: 'repeat(3, 1fr)' 
          },
          gap: { xs: 4, md: 6 },
          alignItems: 'start'
        }}>
          {actualites.map((actualite, index) => (
            <Box
              key={index}
              sx={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                textAlign: 'center'
              }}
            >
              {/* Image de l'actualité */}
              <Box sx={{
                width: '100%',
                height: { xs: 200, sm: 250, md: 300 },
                overflow: 'hidden',
                borderRadius: 2,
                border: '2px solid #1780c2',
                mb: 3,
                position: 'relative',
                boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
              }}>
                <img
                  src={actualite.image}
                  alt={actualite.title}
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                    display: 'block'
                  }}
                />
              </Box>

              {/* Titre de l'actualité */}
              <Typography
                variant="h6"
                sx={{
                  color: '#333',
                  fontWeight: 700,
                  fontSize: { xs: 16, md: 18 },
                  fontFamily: 'Arial, sans-serif',
                  lineHeight: 1.3,
                  textAlign: 'center',
                  mb: 2,
                  textDecoration: 'underline',
                  textDecorationColor: '#333'
                }}
              >
                {actualite.title}
              </Typography>

              {/* Description */}
              <Typography
                variant="body2"
                sx={{
                  color: '#666',
                  fontSize: { xs: 14, md: 15 },
                  lineHeight: 1.5,
                  textAlign: 'center',
                  fontFamily: 'Arial, sans-serif'
                }}
              >
                {actualite.description}
              </Typography>
            </Box>
          ))}
        </Box>
      </Container>
    </Box>
  );
};

// Composant principal Blog
const Blog = () => {
  return (
    <>
      <Helmet>
        <title>Blog Éducation et Actualités - GROUPE SCOLAIRE SAINTE FAMILLE L'EXECELLENCE Abidjan</title>
        <meta name="description" content="Blog éducatif de GROUPE SCOLAIRE SAINTE FAMILLE L'EXECELLENCE à Abidjan : articles sur l'éducation des enfants, jeux éducatifs, lecture, activités plein air, actualités de l'établissement. Conseils pédagogiques et informations sur notre crèche et maternelle bilingue." />
        <meta name="keywords" content="blog éducation Abidjan, articles éducation enfants, jeux éducatifs maternelle, lecture enfants, activités plein air, actualités école, conseils pédagogiques, GROUPE SCOLAIRE SAINTE FAMILLE L'EXECELLENCE, crèche maternelle bilingue" />
        <meta property="og:title" content="Blog Éducation et Actualités - GROUPE SCOLAIRE SAINTE FAMILLE L'EXECELLENCE Abidjan" />
        <meta property="og:description" content="Blog éducatif de GROUPE SCOLAIRE SAINTE FAMILLE L'EXECELLENCE à Abidjan : articles sur l'éducation des enfants, jeux éducatifs, lecture, activités plein air, actualités de l'établissement." />
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://saintefamilleexcellence.ci/blog" />
        <link rel="canonical" href="https://saintefamilleexcellence.ci/blog" />
      </Helmet>
      <Box sx={{ 
        width: '100%',
        margin: 0,
        padding: 0
      }}>
        <ContactBanner />
        <NavigationBar />
        <BlogHeroSection />
        <BlogArticlesSection />
        <ActualitesSection />
        <SiteFooter />
      </Box>
    </>
  );
};

export default Blog;

