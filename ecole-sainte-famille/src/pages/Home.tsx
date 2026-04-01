//modelisation de la page d'accueil
import React, { useState, useCallback, useEffect, memo, useMemo, Suspense } from 'react';
import { Helmet } from 'react-helmet-async';
import { Link as RouterLink } from 'react-router-dom';
import Registration from './Registration';
import {
  Box,
  Container,
  Typography,
  Button,
  IconButton,
  AppBar,
  Toolbar,
  useTheme,
  useMediaQuery,
  Menu,
  MenuItem,
  Grid,
  Modal,
  Backdrop,
  Fade,
} from '@mui/material';
import FacebookIcon from '@mui/icons-material/Facebook';
import EmailIcon from '@mui/icons-material/Email';
import PhoneIcon from '@mui/icons-material/Phone';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import MenuIcon from '@mui/icons-material/Menu';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import InstagramIcon from '@mui/icons-material/Instagram';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import UpdateButton from '../components/UpdateButton';

// Composant de navigation avec onglets
const NavigationBar = memo(() => {
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

  const navigationItems = [
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
              alt="GROUPE SCOLAIRE SAINTE FAMILLE L'EXECELLENCE"
              loading="eager"
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
                {(item as any).hasSubmenu ? (
                  <>
                    <Button
                      onClick={handleScolariteMenuOpen}
                      sx={{
                        color: 'white',
                        fontWeight: 600,
                        fontSize: { md: 12, lg: 14 },
                        textTransform: 'uppercase',
                        letterSpacing: 0.5,
                        px: { md: 1.5, lg: 2 },
                        py: 1,
                        borderRadius: 0,
                        borderBottom: '2px solid transparent',
                        bgcolor: 'transparent',
                        '&:hover': {
                          bgcolor: 'transparent',
                          borderBottom: '2px solid #FF9800',
                          color: '#FF9800',
                        },
                        '&.active': {
                          borderBottom: '2px solid #FF9800',
                          color: '#FF9800',
                        }
                      }}
                    >
                      {item.label}
                      <KeyboardArrowDownIcon sx={{ ml: 0.5, fontSize: 16 }} />
                    </Button>
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
                      {(item as any).submenu?.map((subItem: any) => (
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
                  <Button
                    onClick={handleContactsClick}
                    sx={{
                      color: 'white',
                      fontWeight: 600,
                      fontSize: { md: 12, lg: 14 },
                      textTransform: 'uppercase',
                      letterSpacing: 0.5,
                      px: { md: 1.5, lg: 2 },
                      py: 1,
                      borderRadius: 0,
                      borderBottom: '2px solid transparent',
                      bgcolor: 'transparent',
                      '&:hover': {
                        bgcolor: 'transparent',
                        borderBottom: '2px solid #FF9800',
                        color: '#FF9800',
                      },
                      '&.active': {
                        borderBottom: '2px solid #FF9800',
                        color: '#FF9800',
                      }
                    }}
                  >
                    {item.label}
                  </Button>
                ) : (
                  <Button
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
                      borderRadius: 0,
                      borderBottom: '2px solid transparent',
                      bgcolor: 'transparent',
                      '&:hover': {
                        bgcolor: 'transparent',
                        borderBottom: '2px solid #FF9800',
                        color: '#FF9800',
                      },
                      '&.active': {
                        borderBottom: '2px solid #FF9800',
                        color: '#FF9800',
                      }
                    }}
                  >
                    {item.label}
                  </Button>
                )}
              </Box>
            ))}
          </Box>
        )}

        {/* Menu Mobile - Masqué car géré dans ContactBanner */}
        {false && isMobile && (
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
                  {(item as any).hasSubmenu ? (
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
                        {(item as any).submenu?.map((subItem: any) => (
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
                      onClick={() => {
                        if (handleMobileMenuClose) handleMobileMenuClose();
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
                  )}
                </Box>
              ))}
            </Menu>
          </>
        )}
      </Toolbar>
    </AppBar>
  );
});

// Bannière de contact (réutilisable sur d'autres pages)
export const ContactBanner = memo(({ 
  showMobileMenu = false, 
  mobileMenuAnchor = null, 
  handleMobileMenuOpen = null, 
  handleMobileMenuClose = null, 
  navigationItems = [] 
}: {
  showMobileMenu?: boolean;
  mobileMenuAnchor?: HTMLElement | null;
  handleMobileMenuOpen?: ((event: React.MouseEvent<HTMLElement>) => void) | null;
  handleMobileMenuClose?: (() => void) | null;
  navigationItems?: Array<{
    label: string;
    path: string;
    hasSubmenu?: boolean;
    submenu?: Array<{ label: string; path: string; }>;
    isScroll?: boolean;
  }>;
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  return (
    <Box sx={{ 
      bgcolor: '#1780c2', 
      color: 'white', 
      py: 1,
      fontSize: { xs: 12, md: 14 },
      position: 'relative'
    }}>
      <Container maxWidth="lg">
        <Box sx={{
          display: 'flex',
          flexDirection: { xs: 'column', md: 'row' },
          alignItems: { xs: 'flex-start', md: 'center' },
          justifyContent: { xs: 'space-between', md: 'space-between' },
          gap: { xs: 1, md: 2 },
          width: '100%',
          position: 'relative',
          pr: { xs: 8, md: 0 } // Espace réduit pour le menu mobile repositionné
        }}>
        {/* Contenu principal - Localisation et contact */}
        <Box sx={{
          display: 'flex',
          flexDirection: { xs: 'column', md: 'row' },
          alignItems: { xs: 'flex-start', md: 'center' },
          gap: { xs: 1, md: 2 },
          flex: { xs: '1 1 auto', md: '1 1 auto' }
        }}>
          {/* Localisation */}
          <Box sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 1,
            flexWrap: 'wrap'
          }}>
            <LocationOnIcon sx={{ fontSize: 16 }} />
            <Typography sx={{ fontSize: 'inherit' }}>
              Siège social: Abidjan, Yopougon cité verte face au collège LOUIS LAGRANGE
            </Typography>
          </Box>

          {/* Réseaux sociaux et contact */}
          <Box sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 2,
            flexWrap: 'wrap'
          }}>
            {/* Nous suivre */}
            <Box sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1
            }}>
              <Typography sx={{ fontSize: 'inherit' }}>
                Nous suivre
              </Typography>
              <IconButton size="small" sx={{ color: 'white', p: 0.5 }}>
                <FacebookIcon sx={{ fontSize: 18 }} />
              </IconButton>
              <IconButton
                size="small"
                sx={{ color: 'white', p: 0.5 }}
                component="a"
                href="https://saintefamilleexcellence.ci:2096/"
                target="_blank"
                rel="noopener noreferrer"
              >
                <EmailIcon sx={{ fontSize: 18 }} />
              </IconButton>
            </Box>

            {/* Boutons téléphone */}
            <Box sx={{
              display: 'flex',
              gap: 1,
              flexWrap: 'wrap'
            }}>
              <Button
                variant="contained"
                size="small"
                sx={{
                  bgcolor: '#FF9800',
                  color: 'white',
                  px: 2,
                  py: 0.5,
                  fontSize: 'inherit',
                  fontWeight: 600,
                  minWidth: 'auto',
                  '&:hover': {
                    bgcolor: '#F57C00',
                  },
                }}
                startIcon={<PhoneIcon sx={{ fontSize: 16 }} />}
              >
                (+225) 01 41 60 00 05
              </Button>
              <Button
                variant="contained"
                size="small"
                sx={{
                  bgcolor: '#FF9800',
                  color: 'white',
                  px: 2,
                  py: 0.5,
                  fontSize: 'inherit',
                  fontWeight: 600,
                  minWidth: 'auto',
                  '&:hover': {
                    bgcolor: '#F57C00',
                  },
                }}
                startIcon={<PhoneIcon sx={{ fontSize: 16 }} />}
              >
                {/* (+225) 01 41 27 61 85 */}
              </Button>
            </Box>
          </Box>
        </Box>

      </Box>


    {/* Menu déroulant - en dehors du container principal */}
    {showMobileMenu && isMobile && (
      <>
        <Menu
          anchorEl={mobileMenuAnchor}
          open={Boolean(mobileMenuAnchor)}
          onClose={handleMobileMenuClose || (() => {})}
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
                    onClick={() => {
                      // Gérer le sous-menu ici si nécessaire
                      if (handleMobileMenuClose) handleMobileMenuClose();
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
                    <KeyboardArrowDownIcon sx={{ ml: 0.5, fontSize: 16 }} />
                  </MenuItem>
                  {/* Sous-menu pour SCOLARITE */}
                        {(item as any).submenu?.map((subItem: any) => (
                    <MenuItem
                      key={subItem.label}
                      component={RouterLink}
                      to={subItem.path}
                      onClick={() => {
                        if (handleMobileMenuClose) handleMobileMenuClose();
                      }}
                      sx={{
                        color: 'white',
                        fontWeight: 500,
                        fontSize: 13,
                        textTransform: 'uppercase',
                        pl: 4,
                        '&:hover': {
                          bgcolor: 'rgba(255, 255, 255, 0.1)',
                        }
                      }}
                    >
                      {subItem.label}
                    </MenuItem>
                  ))}
                </>
              ) : item.isScroll ? (
                <MenuItem
                  onClick={() => {
                    const footerElement = document.getElementById('footer');
                    if (footerElement) {
                      footerElement.scrollIntoView({ behavior: 'smooth' });
                    }
                    if (handleMobileMenuClose) handleMobileMenuClose();
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
                  onClick={() => {
                    if (handleMobileMenuClose) handleMobileMenuClose();
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
              )}
            </Box>
          ))}
        </Menu>
      </>
    )}
    </Container>
    
  </Box>
  );
});

// Footer (réutilisable sur d'autres pages)
export const SiteFooter = memo(() => (
  <Box id="footer" sx={{ 
    bgcolor: '#1780c2', 
    py: 6
  }}>
    <Container maxWidth="lg">
      <Grid container spacing={4}>
        {/* Informations de contact et carte - Colonne droite */}
        <Grid item xs={12} md={6}>
          <Box sx={{ height: '100%' }}>
            {/* Section Contact */}
            <Box sx={{ 
              bgcolor: 'white',
              borderRadius: 3,
              p: 4,
              boxShadow: '0 8px 32px rgba(0,0,0,0.1)',
              mb: 4
            }}>
              <Typography 
                variant="h4" 
                sx={{ 
                  fontWeight: 700, 
                  mb: 1, 
                  color: '#1780c2',
                  fontSize: { xs: 24, md: 28 }
                }}
              >
                Contact
              </Typography>
              
              {/* Ligne de soulignement */}
              <Box sx={{
                width: 60,
                height: 3,
                bgcolor: '#1780c2',
                mb: 4
              }} />
              
              {/* Informations de contact */}
              <Box sx={{ space: 3 }}>
                <Box sx={{
                  display: 'flex',
                  alignItems: 'center',
                  mb: 3,
                  gap: 2
                }}>
                  <EmailIcon sx={{ color: '#1780c2', fontSize: 24 }} />
                  <Typography sx={{ 
                    color: '#333',
                    fontSize: { xs: 14, md: 16 }
                  }}>
                    epvbethaniemiracles@gmail.com
                  </Typography>
                </Box>
                
                <Box sx={{
                  display: 'flex',
                  alignItems: 'center',
                  mb: 3,
                  gap: 2
                }}>
                  <PhoneIcon sx={{ color: '#1780c2', fontSize: 24 }} />
                  <Typography sx={{ 
                    color: '#333',
                    fontSize: { xs: 14, md: 16 }
                  }}>
                    (+225) 01 41 60 00 05
                  </Typography>
                </Box>
                
                <Box sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 2
                }}>
                  <PhoneIcon sx={{ color: '#1780c2', fontSize: 24 }} />
                  <Typography sx={{ 
                    color: '#333',
                    fontSize: { xs: 14, md: 16 }
                  }}>
                    {/* (+225) 01 41 27 61 85 */}
                  </Typography>
                </Box>
              </Box>
            </Box>
            
            {/* Carte Google Maps */}
            {/* <Box sx={{ 
              bgcolor: 'white',
              borderRadius: 3,
              overflow: 'hidden',
              boxShadow: '0 8px 32px rgba(0,0,0,0.1)',
              height: 400
            }}>
              <iframe
                src="https://www.google.com/maps/embed?pb=!1m14!1m8!1m3!1d7944.808854936596!2d-3.9521382!3d5.3550939!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0xfc1ed731c611de7%3A0xe55521e75b8421cb!2sLA%20MAISON%20DES%20ENFANTS%20-%20LA%20PETITE%20ACADEMIE!5e0!3m2!1sfr!2sci!4v1657296019947!5m2!1sfr!2sci"
                width="100%"
                height="100%"
                style={{ border: 0 }}
                allowFullScreen
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                title="GROUPE SCOLAIRE SAINTE FAMILLE L'EXECELLENCE - Abidjan"
              />
            </Box> */}
          </Box>
        </Grid>

        {/* Colonne gauche - Informations de l'école */}
        <Grid item xs={12} md={6}>
          <Box sx={{ height: '100%' }}>
            {/* Section Informations */}
            <Box sx={{ 
              bgcolor: 'white',
              borderRadius: 3,
              p: 4,
              boxShadow: '0 8px 32px rgba(0,0,0,0.1)',
              mb: 4
            }}>
              <Typography 
                variant="h4" 
                sx={{ 
                  fontWeight: 700, 
                  mb: 1, 
                  color: '#1780c2',
                  fontSize: { xs: 24, md: 28 }
                }}
              >
                GROUPE SCOLAIRE SAINTE FAMILLE L'EXECELLENCE
              </Typography>
              
              {/* Ligne de soulignement */}
              <Box sx={{
                width: 60,
                height: 3,
                bgcolor: '#1780c2',
                mb: 4
              }} />
              
              <Typography sx={{ 
                color: '#333',
                fontSize: { xs: 14, md: 16 },
                lineHeight: 1.6,
                mb: 3
              }}>
                Le GROUPE SCOLAIRE SAINTE FAMILLE L'EXECELLENCE est une école sans disctinction de race ni de religion
              </Typography>
              
              <Typography sx={{ 
                color: '#333',
                fontSize: { xs: 14, md: 16 },
                lineHeight: 1.6,
                mb: 3
              }}>
                Nous offrons un environnement bienveillant et sécurisé où les enfants peuvent 
                apprendre, grandir et s'épanouir à leur rythme.
              </Typography>

              {/* Réseaux sociaux */}
              <Box sx={{ mt: 4 }}>
                <Typography sx={{ 
                  color: '#1780c2',
                  fontWeight: 600,
                  mb: 2,
                  fontSize: { xs: 14, md: 16 }
                }}>
                  Suivez-nous
                </Typography>
                <Box sx={{ display: 'flex', gap: 2 }}>
                  <IconButton sx={{ color: '#1877F2' }}>
                    <FacebookIcon />
                  </IconButton>
                  <IconButton sx={{ color: '#E4405F' }}>
                    <InstagramIcon />
                  </IconButton>
                </Box>
              </Box>
            </Box>

            {/* Copyright */}
            <Box sx={{ 
              bgcolor: '#333',
              color: 'white',
              borderRadius: 3,
              p: 3,
              textAlign: 'center'
            }}>
              <Typography variant="body2" sx={{ opacity: 0.8 }}>
                Copyrights ® 2025 GROUPE SCOLAIRE SAINTE FAMILLE L'EXECELLENCE. All rights reserved
              </Typography>
            </Box>
          </Box>
        </Grid>
      </Grid>
    </Container>
  </Box>
));

// Carrousel d'images hero (remplace la vidéo)
const SLIDE_INTERVAL_MS = 5000;
const HERO_IMAGES = [
  '/img/sainte/eco1.jpg',
  '/img/sainte/classe1.jpg',
  '/img/sainte/classe2.jpg',
];

const ImageCarouselHero = memo(() => {
  const [index, setIndex] = useState(0);

  const goNext = useCallback(() => {
    setIndex((i) => (i + 1) % HERO_IMAGES.length);
  }, []);

  const goPrev = useCallback(() => {
    setIndex((i) => (i - 1 + HERO_IMAGES.length) % HERO_IMAGES.length);
  }, []);

  useEffect(() => {
    const t = setInterval(goNext, SLIDE_INTERVAL_MS);
    return () => clearInterval(t);
  }, [goNext]);

  return (
    <Box sx={{
      width: '100%',
      maxWidth: '100vw',
      mx: 0,
      height: { xs: '50vh', sm: '60vh', md: '70vh', lg: '100vh' },
      minHeight: { xs: 250, sm: 350, md: 500 },
      position: 'relative',
      bgcolor: '#1780c2',
      overflow: 'hidden',
      boxSizing: 'border-box',
      display: 'block',
    }}>
      {/* Slides superposés : une seule visible à la fois (opacité + transition) */}
      {HERO_IMAGES.map((src, i) => (
        <Box
          key={src}
          sx={{
            position: 'absolute',
            left: 0,
            top: 0,
            right: 0,
            bottom: 0,
            width: '100%',
            height: '100%',
            opacity: i === index ? 1 : 0,
            transition: 'opacity 0.6s ease-in-out',
            pointerEvents: i === index ? 'auto' : 'none',
          }}
        >
          <img
            src={src}
            alt={`École GROUPE SCOLAIRE SAINTE FAMILLE L'EXECELLENCE ${i + 1}`}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              objectPosition: 'center',
              display: 'block',
            }}
          />
        </Box>
      ))}

      {/* Overlay sombre */}
      <Box
        sx={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          bgcolor: 'rgba(0, 0, 0, 0.2)',
          zIndex: 1,
          pointerEvents: 'none',
        }}
      />

      {/* Flèches prev/next */}
      <IconButton
        onClick={goPrev}
        sx={{
          position: 'absolute',
          left: { xs: 8, md: 16 },
          top: '50%',
          transform: 'translateY(-50%)',
          zIndex: 2,
          bgcolor: 'rgba(0, 0, 0, 0.5)',
          color: 'white',
          '&:hover': { bgcolor: 'rgba(0, 0, 0, 0.7)' },
          width: { xs: 40, md: 48 },
          height: { xs: 40, md: 48 },
        }}
        aria-label="Image précédente"
      >
        <ChevronLeftIcon />
      </IconButton>
      <IconButton
        onClick={goNext}
        sx={{
          position: 'absolute',
          right: { xs: 8, md: 16 },
          top: '50%',
          transform: 'translateY(-50%)',
          zIndex: 2,
          bgcolor: 'rgba(0, 0, 0, 0.5)',
          color: 'white',
          '&:hover': { bgcolor: 'rgba(0, 0, 0, 0.7)' },
          width: { xs: 40, md: 48 },
          height: { xs: 40, md: 48 },
        }}
        aria-label="Image suivante"
      >
        <ChevronRightIcon />
      </IconButton>

      {/* Indicateurs (points) */}
      <Box
        sx={{
          position: 'absolute',
          bottom: { xs: 16, md: 24 },
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 2,
          display: 'flex',
          gap: 1,
        }}
      >
        {HERO_IMAGES.map((_, i) => (
          <Box
            key={i}
            onClick={() => setIndex(i)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === 'Enter' && setIndex(i)}
            sx={{
              width: 10,
              height: 10,
              borderRadius: '50%',
              bgcolor: i === index ? '#FF9800' : 'rgba(255, 255, 255, 0.5)',
              cursor: 'pointer',
              transition: 'background-color 0.3s',
              '&:hover': { bgcolor: i === index ? '#FF9800' : 'rgba(255, 255, 255, 0.8)' },
            }}
            aria-label={`Aller à l'image ${i + 1}`}
          />
        ))}
      </Box>
    </Box>
  );
});

// Section d'informations avec les trois cartes
const InfoSection = memo(() => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const cards = useMemo(() => [
    {
      title: "CRÈCHE/GARDERIE TPS",
      paragraphs: [
        "Bienvenue dans notre crèche/garderie et maternelle, un lieu où chaque enfant s'épanouit dans la bienveillance et la joie d'apprendre.",
        "Nous offrons un cadre sécurisé, chaleureux et adapté à chaque âge, où les tout-petits découvrent, explorent et grandissent à leur rythme.",
        "À travers des activités ludiques et éducatives, nous accompagnons pas à pas leur éveil, leur curiosité et leur autonomie, en tissant chaque jour un lien de confiance avec les familles"
      ]
    },
    {
      title: "MATERNELLE",
      paragraphs: [
        "La maternelle est le premier pas vers le monde scolaire. Au GROUPE SCOLAIRE SAINTE FAMILLE L'EXECELLENCE, nous mettons l'accent sur l'éveil intellectuel, la créativité et la socialisation.",
        "Grâce à des méthodes pédagogiques adaptées, vos enfants acquièrent les bases de la lecture, de l'écriture, du langage et des mathématiques, tout en développant leur curiosité et leur autonomie."
      ]
    },
    {
      title: "PRIMAIRE (CP1 - CM2)",
      paragraphs: [
        "Notre école primaire accueille les enfants de 6 à 11 ans dans un environnement stimulant et bienveillant. Nous offrons un enseignement de qualité qui respecte le programme officiel ivoirien.",
        "Nos enseignants qualifiés accompagnent chaque élève dans l'apprentissage des matières fondamentales tout en développant leur autonomie et leur confiance en eux."
      ]
    }
  ], []);

  return (
    <Box sx={{
      position: 'relative',
      width: '100%',
      minHeight: { xs: '80vh', md: '100vh' },
      backgroundImage: 'url(/img/pages/38.jpg)', // Image de fond d'école
      backgroundSize: 'cover',
      backgroundPosition: 'center',
      backgroundAttachment: 'local',
      backgroundRepeat: 'no-repeat',
      // Fallback background si l'image ne se charge pas
      backgroundColor: '#f0f8ff', // Bleu très clair comme fallback
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      py: { xs: 4, md: 6 }
    }}>
      {/* Overlay sombre pour la lisibilité */}
      <Box sx={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        bgcolor: 'rgba(0, 0, 0, 0.3)',
        zIndex: 1
      }} />

      {/* Container des cartes */}
      <Container maxWidth="lg" sx={{ position: 'relative', zIndex: 2 }}>
        <Box sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' },
          gap: { xs: 2, md: 3 },
          alignItems: 'stretch',
          maxWidth: '1200px',
          mx: 'auto'
        }}>
          {cards.map((card, index) => (
            <Box
              key={index}
              sx={{
                bgcolor: '#1a4d73', // Bleu plus foncé comme sur l'image
                borderRadius: '0 0 30px 30px', // Haut carré, bas arrondi
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column',
                height: '100%',
                minHeight: { xs: 400, md: 450 }
              }}
            >
              {/* Header orange */}
              <Box sx={{
                bgcolor: '#FF9800',
                py: { xs: 1.5, md: 2 },
                px: { xs: 2, md: 2.5 },
                textAlign: 'center',
                border: '4px solid white'
              }}>
                <Typography
                  variant="h6"
                  sx={{
                    color: 'white',
                    fontWeight: 700,
                    fontSize: { xs: 16, md: 18 },
                    textTransform: 'uppercase',
                    letterSpacing: 0.5,
                    lineHeight: 1.2,
                    fontFamily: 'Arial, sans-serif'
                  }}
                >
                  {card.title}
                </Typography>
              </Box>

              {/* Contenu */}
              <Box sx={{
                flex: 1,
                p: { xs: 2, md: 2.5 },
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'flex-start',
                pt: { xs: 2.5, md: 3 }
              }}>
                {card.paragraphs.map((paragraph, paragraphIndex) => (
                  <Typography
                    key={paragraphIndex}
                    variant="body1"
                    sx={{
                      color: 'white',
                      fontSize: { xs: 15, md: 16 },
                      lineHeight: 1.6,
                      textAlign: 'left',
                      mb: paragraphIndex < card.paragraphs.length - 1 ? 2 : 0,
                      fontFamily: 'Arial, sans-serif',
                      fontWeight: 400
                    }}
                  >
                    {paragraph}
                  </Typography>
                ))}
              </Box>
            </Box>
          ))}
        </Box>
      </Container>
    </Box>
  );
});

// Section Mot de la Directrice
const DirectorSection = memo(() => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  return (
    <Box sx={{
      width: '100%',
      bgcolor: 'white',
      position: 'relative'
    }}>
      {/* Header jaune avec motifs */}
      <Box sx={{
        bgcolor: '#FFD700', // Jaune vif
        py: 2,
        position: 'relative',
        overflow: 'hidden'
      }}>
        {/* Motifs décoratifs */}
        <Box sx={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundImage: 'url(/primaire1.jpg)', // Utiliser une image de motifs
          backgroundSize: 'contain',
          backgroundRepeat: 'repeat-x',
          backgroundPosition: 'center',
          opacity: 0.3
        }} />
      </Box>

      {/* Contenu principal */}
      <Container maxWidth="lg" sx={{ py: { xs: 4, md: 6 } }}>
        <Box sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' },
          gap: { xs: 4, md: 6 },
          alignItems: 'center'
        }}>
          {/* Texte à gauche */}
          <Box sx={{
            position: 'relative',
            bgcolor: 'white',
            p: { xs: 3, md: 4 },
            borderRadius: 2,
          
          }}>
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
              MOT DU FONDATEUR
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
              C'est avec une immense joie et une passion profonde pour l'éducation de la petite enfance que je vous accueille dans notre établissement. Mon parcours, enrichi par des expériences au Canada et en Côte d'Ivoire, m'a permis de développer une approche pédagogique unique qui place l'enfant au cœur de son apprentissage.
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
              Au GROUPE SCOLAIRE SAINTE FAMILLE L'EXECELLENCE, nous croyons fermement que chaque enfant possède un potentiel extraordinaire. Notre mission est de créer un environnement bienveillant, stimulant et sécurisé où chaque petit peut s'épanouir, découvrir et grandir à son rythme.
            </Typography>

            <Typography
              variant="body1"
              sx={{
                color: '#333',
                fontSize: { xs: 14, md: 16 },
                lineHeight: 1.7,
                mb: 3,
                fontFamily: 'Arial, sans-serif'
              }}
            >
              Nous nous engageons à accompagner vos enfants dans leur développement global, en cultivant leur curiosité, leur créativité et leur confiance en eux. Ensemble, construisons l'avenir de nos petits champions !
            </Typography>

            <Typography
              variant="h6"
              sx={{
                color: '#1780c2',
                fontWeight: 600,
                fontSize: { xs: 16, md: 18 },
                textAlign: 'right',
                fontFamily: 'Arial, sans-serif'
              }}
            >
              Fondateur<br />
            </Typography>
          </Box>

          {/* Image à droite */}
          <Box sx={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center'
          }}>
            <Box sx={{
              position: 'relative',
              borderRadius: 2,
              overflow: 'hidden',
              border: '8px solid rgb(50, 91, 205)', // Vert lime
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.15)',
              maxWidth: { xs: '100%', md: '400px' },
              width: '100%'
            }}>
              <img
                src="/img/sainte/directrice.jpg"
                alt="Mme. Binaté Bakayoko, Directrice"
                loading="lazy"
                style={{
                  width: '100%',
                  height: 'auto',
                  display: 'block',
                  objectFit: 'cover'
                }}
              />
            </Box>
          </Box>
        </Box>
      </Container>

      {/* Footer bleu avec motifs */}
      <Box sx={{
        bgcolor: '#1780c2',
        py: 2,
        position: 'relative',
        overflow: 'hidden'
      }}>
        {/* Motifs décoratifs */}
        <Box sx={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundImage: 'url(/img/pages/colors.png)',
          backgroundSize: 'contain',
          backgroundRepeat: 'repeat-x',
          backgroundPosition: 'center',
          opacity: 0.2
        }} />
      </Box>
    </Box>
  );
});

// Section Programme Bilingue
const BilingualProgramSection = memo(() => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const activities = useMemo(() => [
    "Approche alternative",
    "Activités périscolaires",
    "Initiation à l'anglais à partir de CP1",
    "Sorties éducatives et découvertes"
  ], []);

  return (
    <Box sx={{
      position: 'relative',
      width: '100%',
      minHeight: { xs: '80vh', md: '100vh' },
      backgroundImage: 'url(/img/pages/38.jpg)', // Image de fond avec jouets
      backgroundSize: 'cover',
      backgroundPosition: 'center',
      backgroundAttachment: 'local',
      backgroundRepeat: 'no-repeat',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      py: { xs: 4, md: 6 }
    }}>
      {/* Header bleu avec icônes */}
      <Box sx={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: '80px',
        bgcolor: '#1780c2',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden'
      }}>
        {/* Icônes décoratives */}
        <Box sx={{
          display: 'flex',
          gap: 3,
          alignItems: 'center',
          opacity: 0.8
        }}>
          <Box sx={{ color: 'white', fontSize: 24 }}>🏠</Box>
          <Box sx={{ color: 'white', fontSize: 24 }}>🌳</Box>
          <Box sx={{ color: 'white', fontSize: 24 }}>⭐</Box>
          <Box sx={{ color: 'white', fontSize: 24 }}>☁️</Box>
          <Box sx={{ color: 'white', fontSize: 24 }}>👤</Box>
          <Box sx={{ color: 'white', fontSize: 24 }}>🎨</Box>
          <Box sx={{ color: 'white', fontSize: 24 }}>📚</Box>
          <Box sx={{ color: 'white', fontSize: 24 }}>🎯</Box>
        </Box>
      </Box>

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

      {/* Contenu principal */}
      <Container maxWidth="lg" sx={{ 
        position: 'relative', 
        zIndex: 2,
        mt: 10, // Pour éviter le header
        mb: 4
      }}>
        {/* Titre */}
        <Typography
          variant="h2"
          sx={{
            color: 'white',
            fontWeight: 700,
            fontSize: { xs: 28, md: 40, lg: 48 },
            textAlign: 'center',
            mb: 4,
            fontFamily: 'Arial, sans-serif',
            textShadow: '2px 2px 4px rgba(0,0,0,0.5)'
          }}
        >
          PROGRAMME BILINGUE
        </Typography>

        {/* Description */}
        <Typography
          variant="body1"
          sx={{
            color: 'white',
            fontSize: { xs: 16, md: 18 },
            lineHeight: 1.7,
            textAlign: 'left',
            mb: 6,
            fontFamily: 'Arial, sans-serif',
            maxWidth: '800px',
            mx: 'auto',
            textShadow: '1px 1px 2px rgba(0,0,0,0.5)'
          }}
        >
          Nous proposons un programme bilingue français-anglais, pensé pour éveiller naturellement les enfants à la richesse de deux cultures. À travers des jeux, des chansons, des histoires et des activités quotidiennes, ils découvrent et pratiquent une seconde langue dans un cadre ludique et immersif, favorisant leur ouverture au monde et leur confiance en soi.
        </Typography>

        {/* Grille des activités */}
        <Box sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)' },
          gap: { xs: 2, md: 3 },
          maxWidth: '800px',
          mx: 'auto',
          gridTemplateRows: 'repeat(3, 1fr)'
        }}>
          {activities.map((activity, index) => (
            <Button
              key={index}
              variant="contained"
              sx={{
                bgcolor: '#32CD32', // Vert lime
                color: 'white',
                py: { xs: 2, md: 2.5 },
                px: 3,
                fontSize: { xs: 14, md: 16 },
                fontWeight: 600,
                textTransform: 'none',
                borderRadius: 2,
                fontFamily: 'Arial, sans-serif',
                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.2)',
                '&:hover': {
                  bgcolor: '#28B828',
                  transform: 'translateY(-2px)',
                  boxShadow: '0 6px 16px rgba(0, 0, 0, 0.3)',
                },
                transition: 'all 0.3s ease'
              }}
            >
              {activity}
            </Button>
          ))}
        </Box>
      </Container>

      {/* Indicateur de scroll */}
      <Box sx={{
        position: 'absolute',
        bottom: 20,
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 2
      }}>
        <Box sx={{
          color: 'white',
          fontSize: 24,
          animation: 'bounce 2s infinite',
          '@keyframes bounce': {
            '0%, 20%, 50%, 80%, 100%': {
              transform: 'translateY(0)',
            },
            '40%': {
              transform: 'translateY(-10px)',
            },
            '60%': {
              transform: 'translateY(-5px)',
            },
          }
        }}>
          ▼
        </Box>
      </Box>
    </Box>
  );
});

// Section Galerie d'activités
const ActivitiesGallerySection = memo(() => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const activities = useMemo(() => [
    {
      title: "La journée des stars",
      image: "/img/sainte/star.jpg"
    },
    {
      title: "Cérémonie de graduation promotion 2025",
      image: "/img/sainte/graduation.jpg"
    },
    {
      title: "Sortie à hopital général de Yopougon",
      image: "/img/sainte/hopital.jpg"
    },
    {
      title: "Instant conte",
      image: "/img/sainte/conte.jpg"
    }
  ], []);

  return (
    <Box sx={{
      width: '100%',
      bgcolor: 'white',
      position: 'relative'
    }}>
      {/* Header vert clair avec motifs */}
      <Box sx={{
        bgcolor: '#ADFF2F', // Vert lime plus vibrant
        py: 4,
        position: 'relative',
        overflow: 'hidden'
      }}>
        {/* Motifs décoratifs organiques */}
        <Box sx={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundImage: 'url(/img/pages/colors.png)',
          backgroundSize: '180px',
          backgroundRepeat: 'repeat',
          backgroundPosition: 'center',
          opacity: 0.2,
          filter: 'blur(0.3px)'
        }} />

        {/* Titre principal */}
        <Container maxWidth="lg">
          <Typography
            variant="h2"
            sx={{
              color: 'white',
              fontWeight: 700,
              fontSize: { xs: 24, md: 32, lg: 36 },
              textAlign: 'center',
              fontFamily: 'Arial, sans-serif',
              textShadow: '2px 2px 4px rgba(0,0,0,0.4)',
              position: 'relative',
              zIndex: 2,
              lineHeight: 1.2
            }}
          >
            Découvrez nos dernières activités en images
          </Typography>
        </Container>
      </Box>

      {/* Section des images avec titres */}
      <Container maxWidth="lg" sx={{ py: { xs: 4, md: 6 } }}>
        <Box sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', lg: 'repeat(4, 1fr)' },
          gap: 0, // Pas d'espacement entre les images
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
              {/* Image de l'activité */}
              <Box sx={{
                width: '100%',
                height: { xs: 250, md: 350 },
                overflow: 'hidden',
                border: '4px solid white', // Bordure blanche épaisse comme sur l'image
                mb: 2
              }}>
                <img
                  src={activity.image}
                  alt={activity.title}
                  loading="lazy"
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
                  color: '#1A4D73', // Bleu foncé comme sur l'image
                  fontWeight: 'bold',
                  fontSize: { xs: 16, md: 25 },
                  fontFamily: 'Arial, sans-serif',
                  lineHeight: 1.3,
                  textAlign: 'center',
                  mt: 1
                }}
              >
                {activity.title}
              </Typography>
            </Box>
          ))}
        </Box>
      </Container>

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
});

// Section Call-to-Action Inscription
const RegistrationCTASection = memo(({ showAdminButton }: { showAdminButton: boolean }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [openRegistrationModal, setOpenRegistrationModal] = useState(false);

  return (
    <Box sx={{
      position: 'relative',
      width: '100%',
      height: { xs: '40vh', md: '50vh' }, // Section plus petite
      backgroundImage: 'url(/img/pages/38.jpg)', // Image de fond de classe
      backgroundSize: 'cover',
      backgroundPosition: 'center',
      backgroundAttachment: 'local',
      backgroundRepeat: 'no-repeat',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      overflow: 'hidden'
    }}>
      {/* Overlay bleu sombre pour la lisibilité */}
      <Box sx={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        bgcolor: 'rgba(23, 128, 194, 0.6)', // Overlay bleu comme dans l'image
        zIndex: 1
      }} />

      {/* Boutons centrés */}
      <Box sx={{
        position: 'relative',
        zIndex: 2,
        textAlign: 'center',
        display: 'flex',
        flexDirection: 'column',
        gap: 2,
        alignItems: 'center'
      }}>
        {/* Bouton d'inscription principal */}
        <Button
          variant="contained"
          onClick={() => setOpenRegistrationModal(true)}
          sx={{
            bgcolor: '#F7931E', // Orange exact de l'image
            color: 'white',
            fontSize: { xs: 18, md: 22, lg: 26 },
            fontWeight: 700,
            py: { xs: 2, md: 2.5 },
            px: { xs: 4, md: 5 },
            borderRadius: 3, // Coins plus arrondis comme sur l'image
            textTransform: 'none',
            fontFamily: 'Arial, sans-serif',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)',
            minWidth: { xs: 220, md: 280 },
            border: '2px solid white', // Bordure blanche comme sur l'image
            '&:hover': {
              bgcolor: '#E8893A',
              transform: 'translateY(-1px)',
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.25)',
            },
            transition: 'all 0.3s ease'
          }}
        >
          J'inscris mon enfant
        </Button>

        {/* Bouton d'administration (caché par défaut) */}
        {showAdminButton && (
          <Button
            variant="contained"
            component={RouterLink}
            to="/secretary-login"
            sx={{
              bgcolor: '#dc3545', // Rouge pour l'administration
              color: 'white',
              fontSize: { xs: 14, md: 16 },
              fontWeight: 600,
              py: { xs: 1.5, md: 2 },
              px: { xs: 3, md: 4 },
              borderRadius: 2,
              textTransform: 'none',
              fontFamily: 'Arial, sans-serif',
              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)',
              minWidth: { xs: 180, md: 200 },
              border: '2px solid white',
              animation: 'fadeIn 0.5s ease-in',
              '&:hover': {
                bgcolor: '#c82333',
                transform: 'translateY(-1px)',
                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.25)',
              },
              transition: 'all 0.3s ease'
            }}
          >
            Connexion Admin
          </Button>
        )}
      </Box>

      {/* Animation CSS pour le bouton admin */}
      <style>
        {`
          @keyframes fadeIn {
            from { opacity: 0; transform: translateY(10px); }
            to { opacity: 1; transform: translateY(0); }
          }
        `}
      </style>

      {/* Modal de pré-inscription */}
      <Modal
        open={openRegistrationModal}
        onClose={() => setOpenRegistrationModal(false)}
        closeAfterTransition
        BackdropComponent={Backdrop}
        BackdropProps={{
          timeout: 500,
          sx: {
            backgroundColor: 'rgba(0, 0, 0, 0.7)',
            backdropFilter: 'blur(4px)',
          }
        }}
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          p: { xs: 1, sm: 2 },
        }}
      >
        <Fade in={openRegistrationModal}>
          <Box
            sx={{
              width: '100%',
              maxWidth: { xs: '100%', sm: '90%', md: '80%', lg: '70%' },
              maxHeight: { xs: '95vh', sm: '90vh' },
              overflow: 'auto',
              outline: 'none',
              backgroundColor: 'white',
              borderRadius: { xs: 0, sm: 2 },
              boxShadow: 24,
              '&::-webkit-scrollbar': {
                width: '8px',
              },
              '&::-webkit-scrollbar-track': {
                backgroundColor: '#f1f1f1',
                borderRadius: '4px',
              },
              '&::-webkit-scrollbar-thumb': {
                backgroundColor: '#1976d2',
                borderRadius: '4px',
                '&:hover': {
                  backgroundColor: '#1565c0',
                },
              },
            }}
          >
            <Suspense fallback={
              <Box sx={{ 
                display: 'flex', 
                justifyContent: 'center', 
                alignItems: 'center', 
                height: '200px',
                color: '#1976d2',
                fontSize: '18px'
              }}>
                Chargement...
              </Box>
            }>
              <Registration 
                onClose={() => setOpenRegistrationModal(false)} 
                isMobile={isMobile}
              />
            </Suspense>
          </Box>
        </Fade>
      </Modal>
    </Box>
  );
});

// Composant principal Home
const Home = memo(() => {
  const [showAdminButton, setShowAdminButton] = useState(false);
  const [mobileMenuAnchor, setMobileMenuAnchor] = useState<null | HTMLElement>(null);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  
  // Debug pour vérifier la détection mobile
  useEffect(() => {
    console.log('isMobile:', isMobile);
  }, [isMobile]);

  const handleMobileMenuOpen = useCallback((event: React.MouseEvent<HTMLElement>) => {
    setMobileMenuAnchor(event.currentTarget);
  }, []);

  const handleMobileMenuClose = useCallback(() => {
    setMobileMenuAnchor(null);
  }, []);

  const navigationItems = useMemo(() => [
    { label: 'ACCUEIL', path: '/' },
    // { label: 'PRESENTATION', path: '/presentation' },
    // { 
    //   label: 'SCOLARITE', 
    //   path: '/scolarite',
    //   hasSubmenu: true,
    //   submenu: [
    //     { label: 'CRÈCHE/GARDERIE', path: '/scolarite' },
    //     { label: 'MATERNELLE', path: '/scolarite-maternel' }
    //   ]
    // },
    // { label: 'NOS ACTIVITES', path: '/activites' },
    // { label: 'BLOG', path: '/blog' },
    { label: 'CONTACTS', path: '#footer', isScroll: true },
    { label: 'CONNEXION', path: '/login' },
  ], []);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const isWindows = event.ctrlKey && event.altKey && event.key.toLowerCase() === 'a';
      const isMac = event.metaKey && event.altKey && event.key.toLowerCase() === 'a';
      
      if (isWindows || isMac) {
        event.preventDefault();
        setShowAdminButton(true);
        // Masquer automatiquement après 3 secondes
        setTimeout(() => setShowAdminButton(false), 3000);
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  return (
    <>
      <Helmet>
        <title>Crèche Garderie Maternelle Primaire Bilingue Abidjan - GROUPE SCOLAIRE SAINTE FAMILLE L'EXECELLENCE</title>
        <meta name="description" content="GROUPE SCOLAIRE SAINTE FAMILLE L'EXECELLENCE : Crèche, garderie, maternelle et primaire bilingue à Abidjan Cocody II Plateau Agban. École sans distinction de race ni de religion, programme bilingue français-anglais, éveil et développement harmonieux des enfants. Inscription 2025-2026." />
        <meta name="keywords" content="crèche Abidjan, garderie Abidjan, école maternelle Abidjan, école primaire Abidjan, GROUPE SCOLAIRE SAINTE FAMILLE L'EXECELLENCE, programme bilingue, français-anglais, éveil intellectuel, développement harmonieux, pédagogie alternative, autonomie, bienveillance, activités ludiques, jeux éducatifs, initiation robotique, sorties éducatives, Cocody II Plateau Agban, école sans distinction" />
        <meta property="og:title" content="Crèche Garderie Maternelle Primaire Bilingue Abidjan - GROUPE SCOLAIRE SAINTE FAMILLE L'EXECELLENCE" />
        <meta property="og:description" content="GROUPE SCOLAIRE SAINTE FAMILLE L'EXECELLENCE : Crèche, garderie, maternelle et primaire bilingue à Abidjan Cocody II Plateau Agban. École sans distinction de race ni de religion, programme bilingue français-anglais, éveil et développement harmonieux des enfants." />
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://saintefamilleexcellence.ci" />
        <link rel="canonical" href="https://saintefamilleexcellence.ci" />
      </Helmet>
      <Box sx={{ 
        width: '100%',
        margin: 0,
        padding: 0
      }}>
        <ContactBanner 
          showMobileMenu={false}
          mobileMenuAnchor={mobileMenuAnchor}
          handleMobileMenuOpen={handleMobileMenuOpen}
          handleMobileMenuClose={handleMobileMenuClose}
          navigationItems={navigationItems}
        />
        
        {/* Menu Mobile - Bouton flottant distinctif repositionné */}
        <Box sx={{
          position: 'fixed',
          top: { xs: 70, sm: 80 }, // Positionné sous la bannière de contact
          right: 15,
          zIndex: 99999,
          display: { xs: 'flex', md: 'none' },
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'column',
          gap: 0.5
        }}>
          {/* Label pour clarifier la fonction */}
          <Typography sx={{
            color: '#1780c2',
            fontSize: 10,
            fontWeight: 'bold',
            textAlign: 'center',
            textShadow: '1px 1px 2px rgba(255,255,255,0.8)',
            backgroundColor: 'rgba(255,255,255,0.9)',
            px: 1,
            py: 0.5,
            borderRadius: 1,
            border: '1px solid #1780c2'
          }}>
            MENU
          </Typography>
          
          <Button
            variant="contained"
            onClick={handleMobileMenuOpen}
            sx={{ 
              color: 'white',
              p: 0,
              bgcolor: '#1780c2', // Bleu cohérent avec le design du site
              borderRadius: '50%',
              border: '3px solid white',
              boxShadow: '0 8px 25px rgba(23, 128, 194, 0.8)',
              width: 60,
              height: 60,
              minWidth: 60,
              minHeight: 60,
              '&:hover': {
                bgcolor: '#1565c0',
                border: '3px solid #87CEEB',
                transform: 'scale(1.1)',
                boxShadow: '0 12px 35px rgba(23, 128, 194, 1)'
              },
              transition: 'all 0.3s ease'
            }}
          >
            <MenuIcon sx={{ fontSize: 28, fontWeight: 'bold' }} />
          </Button>
        </Box>
        
        {/* Menu déroulant mobile */}
        <Menu
          anchorEl={mobileMenuAnchor}
          open={Boolean(mobileMenuAnchor)}
          onClose={handleMobileMenuClose}
          sx={{
            display: { xs: 'block', md: 'none' },
            '& .MuiPaper-root': {
              bgcolor: 'rgba(23, 128, 194, 0.95)',
              color: 'white',
              mt: 1,
              backdropFilter: 'blur(10px)'
            }
          }}
        >
          {navigationItems.map((item) => (
            <MenuItem
              key={item.label}
              component={item.isScroll ? 'div' : RouterLink}
              to={item.isScroll ? undefined : item.path}
              onClick={() => {
                if (item.isScroll) {
                  const footerElement = document.getElementById('footer');
                  if (footerElement) {
                    footerElement.scrollIntoView({ behavior: 'smooth' });
                  }
                }
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
          ))}
        </Menu>
        
        <NavigationBar />
        <ImageCarouselHero />
        <InfoSection />
        <DirectorSection />
        <BilingualProgramSection />
        <ActivitiesGallerySection />
        <RegistrationCTASection showAdminButton={showAdminButton} />
        <SiteFooter />
        <UpdateButton position="fixed" />
      </Box>
    </>
  );
});

export default Home;

