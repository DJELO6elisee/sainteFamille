import React, { useState, useCallback, useEffect } from 'react';
import SliderSlick from 'react-slick';
import 'slick-carousel/slick/slick.css';
import 'slick-carousel/slick/slick-theme.css';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import Registration from './Registration';
import axios from 'axios';
import {
  Box,
  Container,
  Grid,
  Typography,
  Button,
  IconButton,
  useTheme,
  useMediaQuery,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TableContainer,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  Paper,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  CircularProgress,
} from '@mui/material';
import FacebookIcon from '@mui/icons-material/Facebook';
import EmailIcon from '@mui/icons-material/Email';
import PhoneIcon from '@mui/icons-material/Phone';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import MenuIcon from '@mui/icons-material/Menu';
import CloseIcon from '@mui/icons-material/Close';
import LoginIcon from '@mui/icons-material/Login';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import SchoolIcon from '@mui/icons-material/School';
import InfoIcon from '@mui/icons-material/Info';
import TouchAppIcon from '@mui/icons-material/TouchApp';
import SportsEsportsIcon from '@mui/icons-material/SportsEsports';
import BookIcon from '@mui/icons-material/Book';
import PaletteIcon from '@mui/icons-material/Palette';
import PsychologyIcon from '@mui/icons-material/Psychology';
import BrushIcon from '@mui/icons-material/Brush';
import GroupIcon from '@mui/icons-material/Group';
import TranslateIcon from '@mui/icons-material/Translate';
import CalculateIcon from '@mui/icons-material/Calculate';
import PublicIcon from '@mui/icons-material/Public';
import MusicNoteIcon from '@mui/icons-material/MusicNote';
import FlagIcon from '@mui/icons-material/Flag';
import HandshakeIcon from '@mui/icons-material/Handshake';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import AssessmentIcon from '@mui/icons-material/Assessment';
import ChildCareIcon from '@mui/icons-material/ChildCare';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import ContactPhoneIcon from '@mui/icons-material/ContactPhone';

// Bannière de contact (réutilisable sur d'autres pages)
export const ContactBanner = () => (
  <Box sx={{ 
    bgcolor: '#1780c2', 
    color: 'white', 
    py: 1,
    fontSize: { xs: 12, md: 14 }
  }}>
    <Container maxWidth="lg">
      <Box sx={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: 1
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
            Siège social: Abidjan, Cocody Riviera 3 - Crèche & Garderie
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
              (+225) 27 22 51 69 04
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
              (+225) 07 08 02 24 24
            </Button>
          </Box>
        </Box>
      </Box>
    </Container>
  </Box>
);

// Header Component
const Header = ({ onOpenLogin, onShowGarderie }: { onOpenLogin: () => void; onShowGarderie: () => void }) => {
  const [openMenu, setOpenMenu] = React.useState(false);
  const [openScolarite, setOpenScolarite] = React.useState(false);
  const [openMaternelleModal, setOpenMaternelleModal] = React.useState(false);
  const theme = useTheme();
  const isMdUp = useMediaQuery(theme.breakpoints.up('md'));

  const menuItems = [
    { label: 'ACCUEIL', to: '/' },
    { label: 'ACTIVITÉS ÉDUCATIVES', to: '/jeux-educatifs' },
    { label: 'GALERIE', to: '/gallery/jeux' },
  ];

  return (
    <Box>
      {/* Barre bleue supérieure */}
      <ContactBanner />

      {/* Section blanche avec logo et navigation */}
    <Box sx={{ bgcolor: 'white', borderBottom: '1px solid #eee', py: 2 }}>
      <Container maxWidth="lg">
        <Box sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          {/* Logo */}
          <Box sx={{ minWidth: 180 }}>
            <img 
              src="/img/pages/vrailogo.jpg" 
              alt="Logo GROUPE SCOLAIRE SAINTE FAMILLE L'EXECELLENCE" 
              style={{ height: 70, maxWidth: '100%' }} 
            />
          </Box>
          
          {/* Menu Desktop */}
          <Box sx={{
            display: { xs: 'none', md: 'flex' },
            gap: 2,
            alignItems: 'center',
          }}>
            {menuItems.map((item) => (
              <Button 
                key={item.label} 
                color="inherit" 
                component={RouterLink} 
                to={item.to}
                sx={{ 
                  fontWeight: 700, 
                  fontSize: 15, 
                  color: '#222', 
                  px: 2 
                }}
              >
                {item.label}
              </Button>
            ))}
              
              {/* Bouton SCOLARITÉ avec menu déroulant */}
              <Box sx={{ position: 'relative' }}>
                <Button
                  onClick={() => setOpenScolarite(!openScolarite)}
                  sx={{ 
                    fontWeight: 700, 
                    fontSize: 15, 
                    color: '#222', 
                    px: 2,
                    '&:hover': {
                      bgcolor: 'rgba(23, 128, 194, 0.1)',
                    },
                  }}
                >
                  SCOLARITÉ
                </Button>
                
                {/* Menu déroulant SCOLARITÉ */}
                {openScolarite && (
                  <Box sx={{
                    position: 'absolute',
                    top: '100%',
                    left: 0,
                    right: 0,
                    bgcolor: 'white',
                    borderRadius: 2,
                    boxShadow: '0 8px 32px rgba(0,0,0,0.15)',
                    border: '1px solid #eee',
                    zIndex: 1000,
                    mt: 1,
                    p: 2,
                    minWidth: 200
                  }}>
                    <Button
                      fullWidth
                      variant="contained"
                      onClick={() => {
                        onShowGarderie();
                        setOpenScolarite(false);
                      }}
                      sx={{
                        bgcolor: '#1780c2',
                        color: 'white',
                        fontWeight: 600,
                        py: 2,
                        mb: 1,
                        '&:hover': {
                          bgcolor: '#1565c0',
                        },
                      }}
                    >
                      Garderie
                    </Button>
                    <Button
                      fullWidth
                      variant="contained"
                      onClick={() => {
                        setOpenScolarite(false);
                        setOpenMaternelleModal(true);
                      }}
                      sx={{
                        bgcolor: '#FF9800',
                        color: 'white',
                        fontWeight: 600,
                        py: 2,
                        '&:hover': {
                          bgcolor: '#F57C00',
                        },
                      }}
                    >
                      Maternelle
                    </Button>
                  </Box>
                )}
              </Box>
            
            <Button
              variant="contained"
              color="primary"
              onClick={onOpenLogin}
              sx={{
                fontWeight: 700,
                fontSize: 15,
                px: 3,
                py: 1,
                ml: 2,
                bgcolor: '#1780c2',
                '&:hover': {
                  bgcolor: '#1565c0',
                },
              }}
              startIcon={<LoginIcon />}
            >
              Connexion
            </Button>
          </Box>

          {/* Menu Mobile */}
          <Box sx={{ display: { xs: 'flex', md: 'none' }, alignItems: 'center', gap: 1 }}>
            <Button
              variant="contained"
              color="primary"
              onClick={onOpenLogin}
              size="small"
              sx={{
                fontWeight: 700,
                fontSize: 12,
                px: 2,
                py: 0.5,
                bgcolor: '#1780c2',
                '&:hover': {
                  bgcolor: '#1565c0',
                },
              }}
              startIcon={<LoginIcon />}
            >
              Connexion
            </Button>
            
            <IconButton
              onClick={() => setOpenMenu(!openMenu)}
              sx={{ color: '#222' }}
            >
              {openMenu ? <CloseIcon /> : <MenuIcon />}
            </IconButton>
          </Box>
        </Box>

        {/* Menu Mobile Déroulant */}
        {openMenu && (
          <Box sx={{
            display: { xs: 'block', md: 'none' },
            mt: 2,
            bgcolor: 'white',
            borderRadius: 2,
            boxShadow: 3,
            border: '1px solid #eee',
          }}>
            {menuItems.map((item) => (
              <Button
                key={item.label}
                fullWidth
                component={RouterLink}
                to={item.to}
                onClick={() => setOpenMenu(false)}
                sx={{
                  justifyContent: 'flex-start',
                  px: 3,
                  py: 2,
                  color: '#222',
                  fontWeight: 600,
                  borderBottom: '1px solid #f0f0f0',
                  '&:hover': { bgcolor: 'grey.50' },
                }}
              >
                {item.label}
              </Button>
            ))}
              
              {/* Bouton SCOLARITÉ mobile */}
              <Button
                fullWidth
                onClick={() => setOpenScolarite(!openScolarite)}
                sx={{
                  justifyContent: 'flex-start',
                  px: 3,
                  py: 2,
                  color: '#222',
                  fontWeight: 600,
                  borderBottom: '1px solid #f0f0f0',
                  '&:hover': { bgcolor: 'grey.50' },
                }}
              >
                SCOLARITÉ
              </Button>
              
              {/* Sous-menu SCOLARITÉ mobile */}
              {openScolarite && (
                <Box sx={{ pl: 3, bgcolor: '#f8f9fa' }}>
                  <Button
                    fullWidth
                    variant="contained"
                    onClick={() => {
                      onShowGarderie();
                      setOpenMenu(false);
                      setOpenScolarite(false);
                    }}
                    sx={{
                      bgcolor: '#1780c2',
                      color: 'white',
                      fontWeight: 600,
                      py: 1.5,
                      mb: 1,
                      mx: 1,
                      '&:hover': {
                        bgcolor: '#1565c0',
                      },
                    }}
                  >
                    Garderie
                  </Button>
                  <Button
                    fullWidth
                    variant="contained"
                    onClick={() => {
                      setOpenMenu(false);
                      setOpenScolarite(false);
                      setOpenMaternelleModal(true);
                    }}
                    sx={{
                      bgcolor: '#FF9800',
                      color: 'white',
                      fontWeight: 600,
                      py: 1.5,
                      mx: 1,
                      '&:hover': {
                        bgcolor: '#F57C00',
                      },
                    }}
                  >
                    Maternelle
                  </Button>
                </Box>
              )}
          </Box>
        )}
      </Container>
      </Box>

      {/* Modal Maternelle */}
      <Dialog 
        open={openMaternelleModal} 
        onClose={() => setOpenMaternelleModal(false)}
        maxWidth="lg"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 3,
            maxHeight: '90vh',
            overflow: 'hidden'
          }
        }}
      >
        <DialogTitle sx={{ 
          bgcolor: '#FF9800', 
          color: 'white',
          textAlign: 'center',
          fontSize: { xs: 18, md: 24 },
          fontWeight: 'bold'
        }}>
          FICHE DE RENSEIGNEMENTS - ANNÉE SCOLAIRE 2025-2026
        </DialogTitle>
        <DialogContent sx={{ p: 0 }}>
          <Box sx={{ p: 3, maxHeight: '70vh', overflow: 'auto' }}>
            {/* VERSEMENT PAR TRANCHE */}
            <Box sx={{ mb: 4 }}>
              <Typography variant="h5" sx={{ color: '#FF9800', fontWeight: 'bold', mb: 2 }}>
                VERSEMENT PAR TRANCHE (F CFA)
              </Typography>
              
              <TableContainer component={Paper} sx={{ mb: 2 }}>
                <Table size="small">
                  <TableHead>
                    <TableRow sx={{ bgcolor: '#f5f5f5' }}>
                      <TableCell sx={{ fontWeight: 'bold' }}>CLASSES</TableCell>
                      <TableCell sx={{ fontWeight: 'bold' }}>1ère tranche</TableCell>
                      <TableCell sx={{ fontWeight: 'bold' }}>2ème tranche</TableCell>
                      <TableCell sx={{ fontWeight: 'bold' }}>3ème tranche</TableCell>
                      <TableCell sx={{ fontWeight: 'bold' }}>4ème tranche</TableCell>
                      <TableCell sx={{ fontWeight: 'bold' }}>TOTAL</TableCell>
                    </TableRow>
                    <TableRow sx={{ bgcolor: '#f8f9fa' }}>
                      <TableCell></TableCell>
                      <TableCell sx={{ textAlign: 'center', fontSize: '0.8rem', py: 1 }}>
                        à compter du 03 avr.2025
                      </TableCell>
                      <TableCell sx={{ textAlign: 'center', fontSize: '0.8rem', py: 1 }}>
                        05 sept. au 05 oct.
                      </TableCell>
                      <TableCell sx={{ textAlign: 'center', fontSize: '0.8rem', py: 1 }}>
                        05 jan. au 05 fév. 2026
                      </TableCell>
                      <TableCell sx={{ textAlign: 'center', fontSize: '0.8rem', py: 1 }}>
                        05 mars au 05 avr.2026
                      </TableCell>
                      <TableCell></TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 'bold' }}>TPS (année de naissance 2023)</TableCell>
                      <TableCell>300.000</TableCell>
                      <TableCell>300.000</TableCell>
                      <TableCell>300.000</TableCell>
                      <TableCell>250.000</TableCell>
                      <TableCell sx={{ fontWeight: 'bold', color: '#FF9800' }}>1.150.000</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 'bold' }}>PS (année de naissance 2022)</TableCell>
                      <TableCell>300.000</TableCell>
                      <TableCell>300.000</TableCell>
                      <TableCell>300.000</TableCell>
                      <TableCell>250.000</TableCell>
                      <TableCell sx={{ fontWeight: 'bold', color: '#FF9800' }}>1.150.000</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 'bold' }}>MS (année de naissance 2021)</TableCell>
                      <TableCell>300.000</TableCell>
                      <TableCell>370.000</TableCell>
                      <TableCell>300.000</TableCell>
                      <TableCell>300.000</TableCell>
                      <TableCell sx={{ fontWeight: 'bold', color: '#FF9800' }}>1.270.000</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 'bold' }}>GS (année de naissance 2020)</TableCell>
                      <TableCell>300.000</TableCell>
                      <TableCell>350.000</TableCell>
                      <TableCell>320.000</TableCell>
                      <TableCell>300.000</TableCell>
                      <TableCell sx={{ fontWeight: 'bold', color: '#FF9800' }}>1.270.000</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </TableContainer>
            </Box>

            {/* INSCRIPTION ET REINSCRIPTION */}
            <Box sx={{ mb: 4 }}>
              <Typography variant="h5" sx={{ color: '#FF9800', fontWeight: 'bold', mb: 2 }}>
                INSCRIPTION ET REINSCRIPTION
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={12} md={4}>
                  <Paper sx={{ p: 2, textAlign: 'center', bgcolor: '#f8f9fa' }}>
                    <Typography variant="h6" sx={{ color: '#FF9800', fontWeight: 'bold' }}>
                      Frais d'inscription
                    </Typography>
                    <Typography variant="h4" sx={{ color: '#1780c2', fontWeight: 'bold' }}>
                      80.000 F CFA
                    </Typography>
                  </Paper>
                </Grid>
                <Grid item xs={12} md={4}>
                  <Paper sx={{ p: 2, textAlign: 'center', bgcolor: '#f8f9fa' }}>
                    <Typography variant="h6" sx={{ color: '#FF9800', fontWeight: 'bold' }}>
                      Frais de réinscription
                    </Typography>
                    <Typography variant="h4" sx={{ color: '#1780c2', fontWeight: 'bold' }}>
                      50.000 F CFA
                    </Typography>
                  </Paper>
                </Grid>
                <Grid item xs={12} md={4}>
                  <Paper sx={{ p: 2, textAlign: 'center', bgcolor: '#f8f9fa' }}>
                    <Typography variant="h6" sx={{ color: '#FF9800', fontWeight: 'bold' }}>
                      Frais annexes
                    </Typography>
                    <Typography variant="h4" sx={{ color: '#1780c2', fontWeight: 'bold' }}>
                      35.000 F CFA
                    </Typography>
                  </Paper>
                </Grid>
              </Grid>
            </Box>

            {/* Offre éducative */}
            <Box sx={{ mb: 4 }}>
              <Typography variant="h5" sx={{ color: '#FF9800', fontWeight: 'bold', mb: 2 }}>
                Offre éducative
              </Typography>
              <Paper sx={{ p: 3, bgcolor: '#f8f9fa' }}>
                <Typography variant="body1" sx={{ mb: 2 }}>
                  • Initiation à l'anglais Toute petite section et Petite section
                </Typography>
                <Typography variant="body1" sx={{ mb: 2 }}>
                  • La Moyenne section et la grande section sont bilingues
                </Typography>
                <Typography variant="body1" sx={{ mb: 2 }}>
                  • La Moyenne section et la grande section: Cours de robotique et de natation (février-mars)
                </Typography>
              </Paper>
            </Box>

            {/* Note importante */}
            <Box sx={{ mb: 4 }}>
              <Typography variant="h6" sx={{ color: '#FF9800', fontWeight: 'bold', mb: 2 }}>
                Note importante
              </Typography>
              <Paper sx={{ p: 3, bgcolor: '#fff3e0' }}>
                <Typography variant="body1" sx={{ fontWeight: 'bold' }}>
                  L'inscription d'un enfant n'est effective qu'après le règlement des droits d'inscription (frais d'inscription + frais annexes) et du 1er versement (non remboursables).
                </Typography>
              </Paper>
            </Box>

            {/* LISTE DES PIECES OBLIGATOIRES */}
            <Box sx={{ mb: 4 }}>
              <Typography variant="h5" sx={{ color: '#FF9800', fontWeight: 'bold', mb: 2 }}>
                LISTE DES PIECES OBLIGATOIRES A FOURNIR
              </Typography>
              <Paper sx={{ p: 3, bgcolor: '#f8f9fa' }}>
                <List>
                  <ListItem sx={{ display: 'flex', alignItems: 'flex-start' }}>
                    <ListItemIcon>
                      <CheckCircleIcon sx={{ color: '#4caf50' }} />
                    </ListItemIcon>
                    <ListItemText primary="1 extrait de naissance original" />
                  </ListItem>
                  <ListItem sx={{ display: 'flex', alignItems: 'flex-start' }}>
                    <ListItemIcon>
                      <CheckCircleIcon sx={{ color: '#4caf50' }} />
                    </ListItemIcon>
                    <ListItemText primary="3 photos d'identité récentes de même tirage" />
                  </ListItem>
                  <ListItem sx={{ display: 'flex', alignItems: 'flex-start' }}>
                    <ListItemIcon>
                      <CheckCircleIcon sx={{ color: '#4caf50' }} />
                    </ListItemIcon>
                    <ListItemText primary="1 photocopie du carnet de vaccinations à jour" />
                  </ListItem>
                  <ListItem sx={{ display: 'flex', alignItems: 'flex-start' }}>
                    <ListItemIcon>
                      <CheckCircleIcon sx={{ color: '#4caf50' }} />
                    </ListItemIcon>
                    <ListItemText primary="1 fiche d'identification à récupérer à GROUPE SCOLAIRE SAINTE FAMILLE L'EXECELLENCE" />
                  </ListItem>
                  <ListItem sx={{ display: 'flex', alignItems: 'flex-start' }}>
                    <ListItemIcon>
                      <CheckCircleIcon sx={{ color: '#4caf50' }} />
                    </ListItemIcon>
                    <ListItemText primary="1 fiche sanitaire à récupérer à GROUPE SCOLAIRE SAINTE FAMILLE L'EXECELLENCE" />
                  </ListItem>
                </List>
              </Paper>
            </Box>

            {/* PAIEMENT */}
            <Box sx={{ mb: 4 }}>
              <Typography variant="h6" sx={{ color: '#FF9800', fontWeight: 'bold', mb: 2 }}>
                PAIEMENT
              </Typography>
              <Paper sx={{ p: 3, bgcolor: '#f8f9fa' }}>
                <Typography variant="body1" sx={{ mb: 2 }}>
                  Pour le dépôt à la banque, il faut prévoir la somme de <strong>100 FCFA</strong> pour les frais de timbre.
                </Typography>
                
                <TableContainer component={Paper} sx={{ mb: 2 }}>
                  <Table size="small">
                    <TableHead>
                      <TableRow sx={{ bgcolor: '#f5f5f5' }}>
                        <TableCell sx={{ fontWeight: 'bold' }}>MODE DE PAIEMENT</TableCell>
                        <TableCell sx={{ fontWeight: 'bold' }}>CODE BANQUE</TableCell>
                        <TableCell sx={{ fontWeight: 'bold' }}>CODE AGENCE</TableCell>
                        <TableCell sx={{ fontWeight: 'bold' }}>NUMÉRO COMPTE</TableCell>
                        <TableCell sx={{ fontWeight: 'bold' }}>CLÉ</TableCell>
                        <TableCell sx={{ fontWeight: 'bold' }}>NOM BANQUE</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      <TableRow>
                        <TableCell sx={{ fontWeight: 'bold', bgcolor: '#f8f9fa' }}>CHEQUE</TableCell>
                        <TableCell sx={{ bgcolor: '#f8f9fa' }} colSpan={5}>
                          A L'ORDRE DE GROUPE SCOLAIRE SAINTE FAMILLE L'EXECELLENCE-GROUPE SCOLAIRE SAINTE FAMILLE L'EXECELLENCE
                        </TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell sx={{ fontWeight: 'bold' }}>DEPOT BANCAIRE</TableCell>
                        <TableCell sx={{ fontWeight: 'bold' }}>CI032</TableCell>
                        <TableCell sx={{ fontWeight: 'bold' }}>01014</TableCell>
                        <TableCell sx={{ fontWeight: 'bold' }}>006383560002</TableCell>
                        <TableCell sx={{ fontWeight: 'bold' }}>50</TableCell>
                        <TableCell sx={{ fontWeight: 'bold' }}>BANK OF AFRICA COTE D'IVOIRE</TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </TableContainer>

                <TableContainer component={Paper} sx={{ mb: 2 }}>
                  <Table size="small">
                    <TableHead>
                      <TableRow sx={{ bgcolor: '#e3f2fd' }}>
                        <TableCell sx={{ fontWeight: 'bold' }}>INFORMATIONS IMPORTANTES</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      <TableRow>
                        <TableCell>
                          <Typography variant="body2" sx={{ mb: 1 }}>
                            <strong>• Bordereau de versement :</strong> Toujours préciser le nom, le prénom et la classe de l'enfant.
                          </Typography>
                          <Typography variant="body2" sx={{ mb: 1 }}>
                            <strong>• Justificatif :</strong> Se présenter avec le justificatif du versement sur le compte, à la caisse de l'école de <strong>GROUPE SCOLAIRE SAINTE FAMILLE L'EXECELLENCE -GROUPE SCOLAIRE SAINTE FAMILLE L'EXECELLENCE</strong> ou le transmettre par mail ou par WhatsApp dans un bref délais au service comptable <strong>(infos@lapetiteacademie.ci)</strong> afin de valider le paiement et rendre effective l'admission en classe.
                          </Typography>
                          <Typography variant="body2" sx={{ mb: 1 }}>
                            <strong>• Frais de chèques impayés :</strong> 30.000F CFA
                          </Typography>
                          <Typography variant="body2">
                            <strong>• Réduction :</strong> Une réduction de la scolarité de <strong>05%</strong>, hors frais d'inscription, est accordée aux familles à partir du 2ème enfant.
                          </Typography>
                        </TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </TableContainer>
              </Paper>
            </Box>

            {/* Fournitures */}
            <Box sx={{ mb: 4 }}>
              <Typography variant="h5" sx={{ color: '#FF9800', fontWeight: 'bold', mb: 2 }}>
                Fournitures
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={6} md={3}>
                  <Paper sx={{ p: 2, textAlign: 'center', bgcolor: '#fff3e0' }}>
                    <Typography variant="h6" sx={{ fontWeight: 'bold' }}>Grande section</Typography>
                    <Typography variant="h5" sx={{ color: '#FF9800', fontWeight: 'bold' }}>95.000 F CFA</Typography>
                  </Paper>
                </Grid>
                <Grid item xs={6} md={3}>
                  <Paper sx={{ p: 2, textAlign: 'center', bgcolor: '#fff3e0' }}>
                    <Typography variant="h6" sx={{ fontWeight: 'bold' }}>Moyenne section</Typography>
                    <Typography variant="h5" sx={{ color: '#FF9800', fontWeight: 'bold' }}>85.000 F CFA</Typography>
                  </Paper>
                </Grid>
                <Grid item xs={6} md={3}>
                  <Paper sx={{ p: 2, textAlign: 'center', bgcolor: '#fff3e0' }}>
                    <Typography variant="h6" sx={{ fontWeight: 'bold' }}>Petite section</Typography>
                    <Typography variant="h5" sx={{ color: '#FF9800', fontWeight: 'bold' }}>80.000 F CFA</Typography>
                  </Paper>
                </Grid>
                <Grid item xs={6} md={3}>
                  <Paper sx={{ p: 2, textAlign: 'center', bgcolor: '#fff3e0' }}>
                    <Typography variant="h6" sx={{ fontWeight: 'bold' }}>Toute petite section</Typography>
                    <Typography variant="h5" sx={{ color: '#FF9800', fontWeight: 'bold' }}>75.000 F CFA</Typography>
                  </Paper>
                </Grid>
              </Grid>
              <Typography variant="body1" sx={{ mt: 2, textAlign: 'center', fontWeight: 'bold' }}>
                Tenues scolaires: 30.000 F CFA le kit (2 uniformes et une tenue de sport)
              </Typography>
            </Box>

            {/* CANTINE */}
            <Box sx={{ mb: 4 }}>
              <Typography variant="h5" sx={{ color: '#FF9800', fontWeight: 'bold', mb: 2 }}>
                CANTINE (facultative)
              </Typography>
              <TableContainer component={Paper}>
                <Table size="small">
                  <TableHead>
                    <TableRow sx={{ bgcolor: '#e8f5e8' }}>
                      <TableCell sx={{ fontWeight: 'bold' }}>CLASSES</TableCell>
                      <TableCell sx={{ fontWeight: 'bold' }}>MODALITE</TableCell>
                      <TableCell sx={{ fontWeight: 'bold' }}>SEP.</TableCell>
                      <TableCell sx={{ fontWeight: 'bold' }}>OCT.</TableCell>
                      <TableCell sx={{ fontWeight: 'bold' }}>NOV.</TableCell>
                      <TableCell sx={{ fontWeight: 'bold' }}>DEC.</TableCell>
                      <TableCell sx={{ fontWeight: 'bold' }}>JAN.</TableCell>
                      <TableCell sx={{ fontWeight: 'bold' }}>FEV.</TableCell>
                      <TableCell sx={{ fontWeight: 'bold' }}>MARS</TableCell>
                      <TableCell sx={{ fontWeight: 'bold' }}>AVR.</TableCell>
                      <TableCell sx={{ fontWeight: 'bold' }}>MAI</TableCell>
                      <TableCell sx={{ fontWeight: 'bold' }}>JUIN</TableCell>
                      <TableCell sx={{ fontWeight: 'bold' }}>JUIL.</TableCell>
                      <TableCell sx={{ fontWeight: 'bold' }}>TOTAL</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    <TableRow>
                      <TableCell rowSpan={2} sx={{ fontWeight: 'bold' }}>GARDERIE</TableCell>
                      <TableCell>MENSUEL</TableCell>
                      <TableCell>50.000</TableCell>
                      <TableCell>50.000</TableCell>
                      <TableCell>50.000</TableCell>
                      <TableCell>50.000</TableCell>
                      <TableCell>50.000</TableCell>
                      <TableCell>50.000</TableCell>
                      <TableCell>50.000</TableCell>
                      <TableCell>50.000</TableCell>
                      <TableCell>50.000</TableCell>
                      <TableCell>50.000</TableCell>
                      <TableCell>50.000</TableCell>
                      <TableCell sx={{ fontWeight: 'bold', color: '#4caf50' }}>550.000</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>TRANCHE</TableCell>
                      <TableCell colSpan={10} sx={{ textAlign: 'center' }}>
                        1ère: 150.000 | 2ème: 150.000 | 3ème: 150.000 | 4ème: 50.000
                      </TableCell>
                      <TableCell sx={{ fontWeight: 'bold', color: '#4caf50' }}>500.000</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell rowSpan={2} sx={{ fontWeight: 'bold' }}>TPS-GS</TableCell>
                      <TableCell>TRANCHE</TableCell>
                      <TableCell colSpan={10} sx={{ textAlign: 'center' }}>
                        1ère tranche (05 sept.- 05 oct. 2025): 150.000 | 2ème tranche (05 déc. 24-05 janv. 20): 150.000 | 3ème tranche (05 mars-05 av.): 150.000 | 4ème tranche (05 mai-05 juin): 50.000
                      </TableCell>
                      <TableCell sx={{ fontWeight: 'bold', color: '#4caf50' }}>500.000</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </TableContainer>
              
              {/* Note cantine */}
              <Paper sx={{ p: 2, bgcolor: '#fff3e0', mt: 2 }}>
                <Typography variant="body2" sx={{ fontWeight: 'bold', color: '#FF9800' }}>
                  Note importante :
                </Typography>
                <Typography variant="body2">
                  Pour tout enfant non inscrit à la cantine mais restant toute la journée, une somme de 15.000 F CFA doit être versée chaque mois.
                </Typography>
              </Paper>
            </Box>

            {/* Contact Section */}
            <Box sx={{ textAlign: 'center', p: 3, bgcolor: '#f5f5f5', borderRadius: 2 }}>
              <Typography variant="h6" sx={{ color: '#FF9800', fontWeight: 'bold', mb: 2 }}>
                CONTACTS
              </Typography>
              <Typography variant="body1" sx={{ mb: 1 }}>
                <strong>Adresse:</strong> Crèche-maternelle GROUPE SCOLAIRE SAINTE FAMILLE L'EXECELLENCE-GROUPE SCOLAIRE SAINTE FAMILLE L'EXECELLENCE - Riviéra 3, Cité PALM-INDUSRIE, carrefour BON PASTEUR
              </Typography>
              <Typography variant="body1" sx={{ mb: 1 }}>
                <strong>Téléphone:</strong> 27 22 51 69 04 / 07 08 02 24 24
              </Typography>
              <Typography variant="body1">
                <strong>Email:</strong> infos@lapetiteacademie.ci
              </Typography>
            </Box>
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 2, bgcolor: '#f5f5f5' }}>
          <Button onClick={() => setOpenMaternelleModal(false)} variant="contained" sx={{ bgcolor: '#FF9800' }}>
            Fermer
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

// Slider Component avec deux images
const Slider = () => {
  const [openModal, setOpenModal] = useState<number | null>(null);

  const settings = {
    dots: true,
    infinite: true,
    speed: 700,
    slidesToShow: 1,
    slidesToScroll: 1,
    autoplay: true,
    autoplaySpeed: 4000,
    arrows: false,
    fade: true,
  };

  const sliderImages = [
    { 
      src: '/img/pages/1860530846.png', 
      alt: 'Pré-inscription',
      title: 'FICHE DE RENSEIGNEMENTS - ANNÉE SCOLAIRE 2025-2026',
      type: 'scolarite'
    },
    { 
      src: '/img/pages/ecoleaf.jpg', 
      alt: 'Crèche - Garderie',
      title: 'MODE D\'INSCRIPTION DE LA CRECHE',
      type: 'creche'
    },
  ];

  const handleImageClick = (index: number) => {
    setOpenModal(index);
  };

  const handleCloseModal = () => {
    setOpenModal(null);
  };


  return (
    <Box sx={{ 
      width: '100%', 
      position: 'relative', 
      bgcolor: '#1780c2',
    }}>
      <SliderSlick {...settings}>
        {sliderImages.map((image, idx) => (
          <Box key={idx} sx={{ position: 'relative' }}>
            {/* Background cover to make slide full width while keeping foreground image fully visible */}
            <Box sx={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundImage: `url(${image.src})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              filter: 'blur(10px)',
              transform: 'scale(1.08)',
              zIndex: 0
            }} />
            <Box sx={{
              width: '100%',
              height: { xs: 360, md: 560 },
              overflow: 'hidden',
              cursor: 'pointer',
              lineHeight: 0,
              bgcolor: 'transparent',
              position: 'relative',
              zIndex: 1
            }}
            onClick={() => handleImageClick(idx)}
            >
              <img
                src={image.src}
                alt={image.alt}
                style={{ 
                  width: '100%', 
                  height: '100%', 
                  objectFit: 'contain',
                  display: 'block',
                  backgroundColor: 'transparent'
                }}
              />
            </Box>
            {/* Overlay avec texte */}
            
          </Box>
        ))}
      </SliderSlick>
      
    </Box>
  );
};

// Section Nos Activités
const ActivitesSection = () => {
  const navigate = useNavigate();
  const [activities, setActivities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const loadActivities = async () => {
      try {
        setLoading(true);
        const response = await axios.get('https://saintefamilleexcellence.ci/api/homepage/activities');
        if (response.data.status === 'success') {
          setActivities(response.data.data);
        }
      } catch (error) {
        console.error('Erreur lors du chargement des activités:', error);
        setError('Erreur lors du chargement des activités');
      } finally {
        setLoading(false);
      }
    };

    loadActivities();
  }, []);

  const handleCardClick = (route: string) => {
    navigate(route);
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

  const getActivityImage = (activityId: number) => {
    const activity = activities.find(a => a.id === activityId);
    if (activity && activity.images && activity.images.length > 0) {
      return getImageUrl(activity.images[0].image_url);
    }
    return null;
  };

  const activityConfig = [
    {
      id: 1,
      route: '/jeux-educatifs',
      title: 'Jeux éducatifs',
      description: 'Activités pédagogiques innovantes pour stimuler le développement cognitif et créatif de votre enfant',
      color: '#1780c2',
      fallbackImage: '/img/pages/402446821_.png'
    },
    {
      id: 2,
      route: '/vie-academique',
      title: 'Vie académique',
      description: 'Programme éducatif complet et structuré pour préparer votre enfant à l\'école maternelle',
      color: '#FF9800',
      fallbackImage: '/img/pages/1839560463_.jpeg'
    },
    {
      id: 3,
      route: '/activites-extrascolaires',
      title: 'Activités extrascolaires',
      description: 'Découvrez nos activités créatives et sportives pour l\'épanouissement complet de votre enfant',
      color: '#1780c2',
      fallbackImage: '/img/pages/434000183.jpg'
    }
  ];

  return (
    <Box sx={{ 
      py: { xs: 6, md: 12 }, 
      bgcolor: 'white',
      background: 'linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%)',
    }}>
      <Container maxWidth="lg">
        <Typography 
          variant="h3" 
          sx={{ 
            textAlign: 'center', 
            mb: 2, 
            fontWeight: 700, 
            color: '#1780c2',
            fontSize: { xs: 28, md: 36, lg: 42 }
          }}
        >
          Nos Activités Éducatives
        </Typography>
        <Typography 
          variant="h6" 
          sx={{ 
            textAlign: 'center', 
            mb: 6, 
            color: '#666',
            fontSize: { xs: 16, md: 18 },
            fontStyle: 'italic'
          }}
        >
          Crèche & Garderie - Développement complet de votre enfant
        </Typography>
        
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress />
          </Box>
        ) : error ? (
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <Typography variant="h6" sx={{ color: '#666', mb: 2 }}>
              Erreur de chargement
            </Typography>
            <Typography variant="body2" sx={{ color: '#999' }}>
              {error}
            </Typography>
          </Box>
        ) : (
          <Grid container spacing={4}>
            {activityConfig.map((activity) => {
              const dynamicImage = getActivityImage(activity.id);
              const imageUrl = dynamicImage || activity.fallbackImage;
              
              return (
                <Grid item xs={12} md={4} key={activity.id}>
                  <Box 
                    onClick={() => handleCardClick(activity.route)}
                    sx={{ 
                      textAlign: 'center', 
                      boxShadow: '0 8px 32px rgba(0,0,0,0.1)', 
                      borderRadius: 4, 
                      p: 4, 
                      bgcolor: 'white', 
                      height: '100%',
                      transition: 'all 0.3s ease',
                      cursor: 'pointer',
                      '&:hover': {
                        transform: 'translateY(-8px)',
                        boxShadow: `0 12px 40px ${activity.color}20`,
                      }
                    }}
                  >
                    <Box sx={{ 
                      mb: 3,
                      borderRadius: 3,
                      overflow: 'hidden',
                      boxShadow: '0 4px 16px rgba(0,0,0,0.1)',
                      position: 'relative'
                    }}>
                      <img 
                        src={imageUrl} 
                        alt={activity.title} 
                        style={{ 
                          width: '100%', 
                          height: 200, 
                          objectFit: 'cover'
                        }}
                        onError={(e) => {
                          // Utiliser une image de test en cas d'erreur
                          e.currentTarget.src = `https://picsum.photos/400/300?random=${activity.id}`;
                          e.currentTarget.style.display = 'block';
                        }}
                      />
                      {!dynamicImage && (
                        <Box sx={{
                          position: 'absolute',
                          top: 0,
                          left: 0,
                          right: 0,
                          bottom: 0,
                          bgcolor: 'rgba(0,0,0,0.1)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}>
                          <Typography variant="body2" sx={{ color: 'white', fontWeight: 600 }}>
                            Image par défaut
                          </Typography>
                        </Box>
                      )}
                    </Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', mb: 2, gap: 1 }}>
                      {activity.id === 1 && <SportsEsportsIcon sx={{ color: activity.color, fontSize: 28 }} />}
                      {activity.id === 2 && <BookIcon sx={{ color: activity.color, fontSize: 28 }} />}
                      {activity.id === 3 && <PaletteIcon sx={{ color: activity.color, fontSize: 28 }} />}
                      <Typography 
                        variant="h5" 
                        sx={{ 
                          fontWeight: 700, 
                          color: activity.color
                        }}
                      >
                        {activity.title}
                      </Typography>
                    </Box>
                    <Typography variant="body2" sx={{ color: '#666', lineHeight: 1.6 }}>
                      {activity.description}
                    </Typography>
                  </Box>
                </Grid>
              );
            })}
          </Grid>
        )}
      </Container>
    </Box>
  );
};

// Section Mot de la Directrice avec image circulaire et crayons décoratifs
const DirectriceSection = () => (
  <Box sx={{ 
    py: { xs: 6, md: 12 }, 
    bgcolor: 'white',
    position: 'relative',
    overflow: 'hidden'
  }}>
    <Container maxWidth="lg">
      <Box sx={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: { xs: 2, md: 4 },
        position: 'relative',
        zIndex: 2
      }}>
        
        {/* Crayons à gauche */}
        <Box sx={{
          flexShrink: 0,
          display: { xs: 'none', md: 'block' },
          width: 200,
          textAlign: 'center'
        }}>
          <img 
            src="/img/pages/crayond.png" 
            alt="Crayons décoratifs" 
            style={{ 
              width: 200,
              height: 'auto',
              transform: 'rotate(-15deg)'
            }}
          />
        </Box>

        {/* Contenu texte au centre */}
        <Box sx={{
          flex: 1,
          maxWidth: { xs: '100%', md: '50%' }
        }}>
          {/* Titre sur deux lignes */}
          <Box sx={{ mb: 3 }}>
            <Typography 
              variant="h3" 
              sx={{ 
                fontWeight: 700, 
                mb: 0, 
                color: '#4A148C',
                fontSize: { xs: 24, md: 28, lg: 32 },
                textAlign: { xs: 'center', md: 'left' }
              }}
            >
              Mot de la Directrice
            </Typography>
            <Typography 
              variant="h3" 
              sx={{ 
                fontWeight: 700, 
                mb: 2, 
                color: '#4A148C',
                fontSize: { xs: 20, md: 24, lg: 28 },
                textAlign: { xs: 'center', md: 'left' },
                pl: { xs: 0, md: 4 },
                lineHeight: 1.2
              }}
            >
              Crèche & Garderie
            </Typography>
            
            {/* Ligne de soulignement sous "Garderie" */}
            <Box sx={{ 
              width: 60,
              height: 2,
              bgcolor: '#4A148C',
              mb: 4,
              ml: { xs: 'auto', md: 4 },
              mr: { xs: 'auto', md: 0 }
            }} />
          </Box>
          
          <Typography 
            variant="body1" 
            sx={{ 
              color: '#666', 
              lineHeight: 1.8,
              fontSize: { xs: 16, md: 18 },
              mb: 4,
              textAlign: { xs: 'center', md: 'left' }
            }}
          >
            Des années durant, j'ai consacré ma vie active à la petite enfance et en ai fait ma passion. 
            Diplômée de l'éducation de la petite Enfance de l'université du Quebec à Trois Rivières, 
            j'ai travaillé pendant plus de 10 ans au Canada et en Côte d'Ivoire. Fort de ces années d'expérience, 
            j'ai donc décidé de faire profiter mes acquis aux enfants de mon pays. GROUPE SCOLAIRE SAINTE FAMILLE L'EXECELLENCE 
            GROUPE SCOLAIRE SAINTE FAMILLE L'EXECELLENCE, votre crèche et garderie de confiance à Abidjan, a donc vu le jour.
          </Typography>
          
          <Box sx={{
            textAlign: { xs: 'center', md: 'left' }
          }}>
            <Button
              variant="text"
              sx={{
                color: '#FF9800',
                fontWeight: 600,
                fontSize: { xs: 16, md: 18 },
                textDecoration: 'underline',
                textTransform: 'none',
                p: 0,
                minWidth: 'auto',
                '&:hover': {
                  bgcolor: 'transparent',
                  color: '#F57C00',
                },
              }}
            >
              Lire la suite
            </Button>
          </Box>
        </Box>

        {/* Image circulaire au centre-droit */}
        <Box sx={{ 
          flexShrink: 0,
          display: { xs: 'none', md: 'block' },
          width: 300
        }}>
          <Box sx={{
            width: 300,
            height: 300,
            borderRadius: '50%',
            overflow: 'hidden',
            boxShadow: '0 8px 32px rgba(0,0,0,0.15)',
            border: '4px solid white',
            position: 'relative'
          }}>
            <img 
              src="/img/pages/rond.jpg" 
              alt="Bâtiment de l'école avec palmier" 
              style={{ 
                width: '100%', 
                height: '100%', 
                objectFit: 'cover'
              }}
            />
          </Box>
        </Box>

        {/* Crayons à droite */}
        <Box sx={{
          flexShrink: 0,
          display: { xs: 'none', md: 'block' },
          width: 150,
          textAlign: 'center'
        }}>
          <img 
            src="/img/pages/pencils.png" 
            alt="Crayons décoratifs" 
            style={{ 
              width: 200,
              height: 'auto',
              transform: 'rotate(15deg)'
            }}
          />
        </Box>
      </Box>
    </Container>
  </Box>
);

// Section Services avec trois cartes
const ServicesSection = () => (
  <Box sx={{ 
    py: { xs: 6, md: 12 }, 
    position: 'relative',
    overflow: 'hidden',
    backgroundImage: 'url(/img/pages/cercle.webp)',
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    backgroundRepeat: 'no-repeat',
    '&::before': {
      content: '""',
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(107, 114, 128, 0.4)',
      zIndex: 1
    }
  }}>
    {/* Illustrations d'arrière-plan */}
    <Box sx={{
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      opacity: 0.1,
      zIndex: 1
    }}>
      {/* Enfants et adultes en style cartoon */}
      <Box sx={{
        position: 'absolute',
        top: '10%',
        left: '5%',
        width: 60,
        height: 60,
        borderRadius: '50%',
        bgcolor: '#FFB6C1',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: 24
      }}>
        
      </Box>
      <Box sx={{
        position: 'absolute',
        top: '20%',
        right: '10%',
        width: 50,
        height: 50,
        borderRadius: '50%',
        bgcolor: '#87CEEB',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: 20
      }}>
        
      </Box>
      <Box sx={{
        position: 'absolute',
        bottom: '15%',
        left: '15%',
        width: 70,
        height: 70,
        borderRadius: '50%',
        bgcolor: '#98FB98',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: 28
      }}>
        
      </Box>
      <Box sx={{
        position: 'absolute',
        bottom: '25%',
        right: '5%',
        width: 55,
        height: 55,
        borderRadius: '50%',
        bgcolor: '#DDA0DD',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: 22
      }}>
        
      </Box>
    </Box>

    <Container maxWidth="lg" sx={{ position: 'relative', zIndex: 2 }}>
      {/* Titre principal */}
      <Typography 
        variant="h2" 
              sx={{
          textAlign: 'center', 
          mb: 6, 
          fontWeight: 700, 
                  color: 'white',
          fontSize: { xs: 28, md: 36, lg: 48 },
          textShadow: '2px 2px 4px rgba(0,0,0,0.3)'
        }}
      >
        Crèche & Garderie - À partir de 3 mois
      </Typography>
      
      {/* Cartes de services */}
      <Grid container spacing={4}>
        <Grid item xs={12} md={4}>
          <Box sx={{ 
            bgcolor: 'white',
            borderRadius: 3,
            p: 4,
            height: '100%',
            boxShadow: '0 8px 32px rgba(0,0,0,0.15)',
            transition: 'all 0.3s ease',
            '&:hover': {
              transform: 'translateY(-8px)',
              boxShadow: '0 12px 40px rgba(0,0,0,0.25)',
            }
          }}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2, gap: 1 }}>
              <PsychologyIcon sx={{ color: '#333', fontSize: 24 }} />
              <Typography 
                variant="h5" 
                sx={{ 
                  fontWeight: 700, 
                  color: '#333',
                  fontSize: { xs: 20, md: 24 }
                }}
              >
                Approche pédagogique
              </Typography>
            </Box>
            <Typography 
              variant="body1" 
              sx={{ 
                color: '#666', 
                lineHeight: 1.6,
                mb: 3,
                fontSize: { xs: 14, md: 16 }
              }}
            >
              Méthode éducative innovante pour notre crèche et garderie
            </Typography>
            <Box sx={{
              width: '100%',
              height: 3,
              bgcolor: '#FF9800',
              borderRadius: 2
            }} />
          </Box>
        </Grid>
        
        <Grid item xs={12} md={4}>
          <Box sx={{ 
            bgcolor: 'white',
            borderRadius: 3,
            p: 4,
            height: '100%',
            boxShadow: '0 8px 32px rgba(0,0,0,0.15)',
            transition: 'all 0.3s ease',
            '&:hover': {
              transform: 'translateY(-8px)',
              boxShadow: '0 12px 40px rgba(0,0,0,0.25)',
            }
          }}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2, gap: 1 }}>
              <ChildCareIcon sx={{ color: '#333', fontSize: 24 }} />
              <Typography 
                variant="h5" 
                sx={{ 
                  fontWeight: 700, 
                  color: '#333',
                  fontSize: { xs: 20, md: 24 }
                }}
              >
                Halte garderie
              </Typography>
            </Box>
            <Typography 
              variant="body1" 
              sx={{ 
                color: '#666', 
                lineHeight: 1.6,
                mb: 3,
                fontSize: { xs: 14, md: 16 }
              }}
            >
              Service de garderie flexible pour les parents
            </Typography>
            <Box sx={{
                width: '100%', 
              height: 3,
              bgcolor: '#FF9800',
              borderRadius: 2
            }} />
          </Box>
        </Grid>
        
        <Grid item xs={12} md={4}>
          <Box sx={{ 
            bgcolor: 'white',
            borderRadius: 3,
            p: 4,
                height: '100%', 
            boxShadow: '0 8px 32px rgba(0,0,0,0.15)',
            transition: 'all 0.3s ease',
            '&:hover': {
              transform: 'translateY(-8px)',
              boxShadow: '0 12px 40px rgba(0,0,0,0.25)',
            }
          }}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2, gap: 1 }}>
              <SchoolIcon sx={{ color: '#333', fontSize: 24 }} />
              <Typography 
                variant="h5" 
                sx={{ 
                  fontWeight: 700, 
                  color: '#333',
                  fontSize: { xs: 20, md: 24 }
                }}
              >
                École maternelle
              </Typography>
            </Box>
            <Typography 
              variant="body1" 
              sx={{ 
                color: '#666', 
                lineHeight: 1.6,
                mb: 3,
                fontSize: { xs: 14, md: 16 }
              }}
            >
              Programme préscolaire complet pour enfants de 3 à 6 ans
            </Typography>
            <Box sx={{
              width: '100%',
              height: 3,
              bgcolor: '#FF9800',
              borderRadius: 2
            }} />
          </Box>
        </Grid>
      </Grid>
    </Container>
  </Box>
);

// Section Contact avec formulaire et carte
const ContactSection = () => (
  <Box sx={{ 
    py: { xs: 6, md: 12 }, 
    bgcolor: '#E3F2FD',
    minHeight: '100vh'
  }}>
    <Container maxWidth="lg">
      <Grid container spacing={6}>
        {/* Formulaire "Nous écrire" - Colonne gauche */}
        <Grid item xs={12} md={6}>
          <Box sx={{ 
            bgcolor: 'white',
            borderRadius: 3,
            p: 4,
            boxShadow: '0 8px 32px rgba(0,0,0,0.1)',
            height: 'fit-content'
          }}>
            {/* Titre du formulaire */}
        <Typography 
              variant="h4" 
          sx={{ 
            fontWeight: 700,
                mb: 1, 
                color: '#1780c2',
                fontSize: { xs: 24, md: 28 }
          }}
        >
              Nous écrire
        </Typography>
            
            {/* Ligne de soulignement */}
            <Box sx={{
              width: 60,
              height: 3,
              bgcolor: '#1780c2',
              mb: 4
            }} />
            
                         {/* Formulaire */}
             <Box component="form" sx={{ mt: 3 }}>
               <Grid container spacing={3}>
                 {/* Première ligne - Nom & Prénoms et Email en deux colonnes */}
                 <Grid item xs={12} md={6}>
        <Typography 
                     variant="body1" 
          sx={{ 
                       fontWeight: 600, 
                       mb: 1, 
                       color: '#333',
                       fontSize: { xs: 14, md: 16 }
                     }}
                   >
                     Nom & Prénoms *
        </Typography>
                   <Box sx={{
                     border: '1px solid #ddd',
                     borderRadius: 2,
                     p: 2,
                     bgcolor: '#fafafa'
                   }}>
                     <input
                       type="text"
                       placeholder="Votre nom et prénoms"
                       style={{
                         width: '100%',
                         border: 'none',
                         outline: 'none',
                         background: 'transparent',
                         fontSize: '16px'
                       }}
                     />
                   </Box>
                 </Grid>
                 
                 <Grid item xs={12} md={6}>
                   <Typography 
                     variant="body1" 
                     sx={{ 
                       fontWeight: 600, 
                       mb: 1, 
                       color: '#333',
                       fontSize: { xs: 14, md: 16 }
                     }}
                   >
                     Email *
                   </Typography>
                   <Box sx={{
                     border: '1px solid #ddd',
                     borderRadius: 2,
                     p: 2,
                     bgcolor: '#fafafa'
                   }}>
                     <input
                       type="email"
                       placeholder="Votre adresse email"
                       style={{
                         width: '100%',
                         border: 'none',
                         outline: 'none',
                         background: 'transparent',
                         fontSize: '16px'
                       }}
                     />
                   </Box>
                 </Grid>
                 
                 {/* Deuxième ligne - Contact et Objet en deux colonnes */}
                 <Grid item xs={12} md={6}>
                   <Typography 
                     variant="body1" 
                     sx={{ 
                       fontWeight: 600, 
                       mb: 1, 
                       color: '#333',
                       fontSize: { xs: 14, md: 16 }
                     }}
                   >
                     Contact *
                   </Typography>
                   <Box sx={{
                     border: '1px solid #ddd',
                     borderRadius: 2,
                     p: 2,
                     bgcolor: '#fafafa'
                   }}>
                     <input
                       type="tel"
                       placeholder="Votre numéro de téléphone"
                       style={{
                         width: '100%',
                         border: 'none',
                         outline: 'none',
                         background: 'transparent',
                         fontSize: '16px'
                       }}
                     />
                   </Box>
                 </Grid>
                 
                 <Grid item xs={12} md={6}>
                   <Typography 
                     variant="body1" 
                     sx={{ 
                       fontWeight: 600, 
                       mb: 1, 
                       color: '#333',
                       fontSize: { xs: 14, md: 16 }
                     }}
                   >
                     Objet
                   </Typography>
                   <Box sx={{
                     border: '1px solid #ddd',
                     borderRadius: 2,
                     p: 2,
                     bgcolor: '#fafafa'
                   }}>
                     <input
                       type="text"
                       placeholder="Sujet de votre message"
                       style={{
                         width: '100%',
                         border: 'none',
                         outline: 'none',
                         background: 'transparent',
                         fontSize: '16px'
                       }}
                     />
                   </Box>
                 </Grid>
                 
                 {/* Troisième ligne - Message en pleine largeur */}
                 <Grid item xs={12}>
                   <Typography 
                     variant="body1" 
                     sx={{ 
                       fontWeight: 600, 
                       mb: 1, 
                       color: '#333',
                       fontSize: { xs: 14, md: 16 }
                     }}
                   >
                     Message *
                   </Typography>
                   <Box sx={{
                     border: '1px solid #ddd',
                     borderRadius: 2,
                     p: 2,
                     bgcolor: '#fafafa',
                     minHeight: 120
                   }}>
                     <textarea
                       placeholder="Votre message..."
                       style={{
                         width: '100%',
                         border: 'none',
                         outline: 'none',
                         background: 'transparent',
                         fontSize: '16px',
                         minHeight: '100px',
                         resize: 'vertical',
                         fontFamily: 'inherit'
                       }}
                     />
                   </Box>
                 </Grid>
                 
                 {/* Bouton d'envoi */}
                 <Grid item xs={12}>
        <Button
          variant="contained"
                     fullWidth
          sx={{
                       bgcolor: '#1780c2',
            color: 'white',
            fontWeight: 700,
            py: 2,
                       borderRadius: 2,
            fontSize: { xs: 16, md: 18 },
                       textTransform: 'uppercase',
            '&:hover': {
                         bgcolor: '#1565c0',
            },
          }}
        >
                     ENVOYER UN MESSAGE
        </Button>
                 </Grid>
               </Grid>
      </Box>
          </Box>
        </Grid>
        
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
                    infos@lapetiteacademie.ci
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
                    (+225) 27 22 51 69 04
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
                    (+225) 07 08 02 24 24
                  </Typography>
                </Box>
              </Box>
            </Box>
            
            {/* Carte Google Maps */}
            <Box sx={{ 
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
            </Box>
          </Box>
        </Grid>
      </Grid>
    </Container>
  </Box>
);

// Footer (réutilisable sur d'autres pages)
export const SiteFooter = () => (
  <Box sx={{ 
    bgcolor: '#333', 
    color: 'white', 
    py: 4,
    textAlign: 'center'
  }}>
    <Container maxWidth="lg">
      <Typography variant="body2" sx={{ opacity: 0.8 }}>
        Copyrights ® 2025 GROUPE SCOLAIRE SAINTE FAMILLE L'EXECELLENCE GROUPE SCOLAIRE SAINTE FAMILLE L'EXECELLENCE. All rights reserved
      </Typography>
    </Container>
  </Box>
);

// Composant principal Home
const Home = () => {
  const navigate = useNavigate();
  const [openLogin, setOpenLogin] = React.useState(false);
  const [showGarderie, setShowGarderie] = React.useState(false);
  const [openRegistrationModal, setOpenRegistrationModal] = React.useState(false);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [showAdminButton, setShowAdminButton] = React.useState(false);

  // Optimisation des callbacks pour éviter les re-renders inutiles
  const handleOpenLogin = useCallback(() => navigate('/login'), [navigate]);
  const handleShowGarderie = useCallback(() => setShowGarderie(true), []);
  const handleOpenRegistrationModal = useCallback(() => setOpenRegistrationModal(true), []);
  const handleCloseRegistrationModal = useCallback(() => setOpenRegistrationModal(false), []);
  const handleNavigateToSecretaryLogin = useCallback(() => navigate('/secretary-login'), [navigate]);

  // Reveal Admin button only when pressing Ctrl + Alt + A (Windows and Mac)
  React.useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const isCtrlAltA = event.ctrlKey && event.altKey && (event.key === 'a' || event.key === 'A');
      if (isCtrlAltA) {
        setShowAdminButton(true);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  // Page Garderie
  const GarderiePage = () => (
    <Box sx={{ 
      py: { xs: 3, sm: 4, md: 6, lg: 8 }, 
      bgcolor: '#f8f9fa',
      minHeight: '100vh'
    }}>
      <Container maxWidth="lg">
        {/* En-tête de la page */}
        <Box sx={{ 
          textAlign: 'center', 
          mb: { xs: 4, sm: 5, md: 6 },
          bgcolor: 'white',
          borderRadius: { xs: 2, md: 3 },
          p: { xs: 3, sm: 4, md: 4 },
          boxShadow: '0 4px 20px rgba(0,0,0,0.1)'
        }}>
          <Typography 
            variant="h2" 
            sx={{ 
              fontWeight: 700, 
              color: '#1780c2',
              fontSize: { xs: 24, sm: 28, md: 32, lg: 36, xl: 42 },
              mb: { xs: 1, md: 2 },
              lineHeight: 1.2
            }}
          >
            MODE D'INSCRIPTION
          </Typography>
          <Typography 
            variant="h4" 
            sx={{ 
              color: '#FF9800',
              fontWeight: 600,
              fontSize: { xs: 18, sm: 20, md: 22, lg: 24 },
              lineHeight: 1.3
            }}
          >
            Garderie - GROUPE SCOLAIRE SAINTE FAMILLE L'EXECELLENCE
          </Typography>
        </Box>

        <Grid container spacing={{ xs: 2, sm: 3, md: 4 }}>
          {/* Colonne gauche - Informations principales */}
          <Grid item xs={12} lg={8}>
            {/* Droits d'inscription */}
            <Box sx={{ 
              bgcolor: 'white',
              borderRadius: { xs: 2, md: 3 },
              p: { xs: 3, sm: 4, md: 4 },
              mb: { xs: 3, md: 4 },
              boxShadow: '0 4px 20px rgba(0,0,0,0.1)'
            }}>
              <Typography 
                variant="h5" 
                sx={{ 
                  fontWeight: 700, 
                  color: '#1780c2',
                  mb: { xs: 2, md: 3 },
                  textAlign: 'center',
                  fontSize: { xs: 18, sm: 20, md: 22 }
                }}
              >
                DROIT D'INSCRIPTION
              </Typography>
              <Typography 
                variant="h4" 
                sx={{ 
                  color: '#FF9800',
                  fontWeight: 700,
                  textAlign: 'center',
                  fontSize: { xs: 20, sm: 24, md: 28, lg: 32 },
                  lineHeight: 1.2
                }}
              >
                50.000 F CFA
              </Typography>
            </Box>

            {/* Tarifs mensuels */}
            <Box sx={{ 
              bgcolor: 'white',
              borderRadius: { xs: 2, md: 3 },
              p: { xs: 3, sm: 4, md: 4 },
              mb: { xs: 3, md: 4 },
              boxShadow: '0 4px 20px rgba(0,0,0,0.1)'
            }}>
              <Typography 
                variant="h5" 
                sx={{ 
                  fontWeight: 700, 
                  color: '#1780c2',
                  mb: { xs: 2, md: 3 },
                  textAlign: 'center',
                  fontSize: { xs: 18, sm: 20, md: 22 }
                }}
              >
                TARIFS MENSUELS
              </Typography>
              
              {/* Tableau des tarifs */}
              <Box sx={{ 
                overflowX: 'auto',
                bgcolor: '#f8f9fa',
                borderRadius: 2,
                p: { xs: 1, sm: 2 }
              }}>
                <Grid container sx={{ 
                  borderBottom: '2px solid #1780c2',
                  pb: 1,
                  mb: 2
                }}>
                  <Grid item xs={4} sm={3}>
                    <Typography sx={{ 
                      fontWeight: 700, 
                      color: '#1780c2',
                      fontSize: { xs: 14, sm: 16 }
                    }}>
                      Période
                    </Typography>
                  </Grid>
                  <Grid item xs={8} sm={9}>
                    <Typography sx={{ 
                      fontWeight: 700, 
                      color: '#1780c2',
                      fontSize: { xs: 14, sm: 16 }
                    }}>
                      Tarif (F CFA)
                    </Typography>
                  </Grid>
                </Grid>
                
                {['Sept.', 'Oct.', 'Nov.', 'Déc.', 'Janv.', 'Fév.', 'Mars', 'Avril', 'Mai', 'Juin', 'Juil.'].map((mois) => (
                  <Grid container key={mois} sx={{ 
                    borderBottom: '1px solid #e0e0e0',
                    py: { xs: 0.5, sm: 1 }
                  }}>
                    <Grid item xs={4} sm={3}>
                      <Typography sx={{ 
                        fontWeight: 600,
                        fontSize: { xs: 13, sm: 14, md: 16 }
                      }}>
                        {mois}
                      </Typography>
                    </Grid>
                    <Grid item xs={8} sm={9}>
                      <Typography sx={{ 
                        fontWeight: 600, 
                        color: '#FF9800',
                        fontSize: { xs: 13, sm: 14, md: 16 }
                      }}>
                        100.000
                      </Typography>
                    </Grid>
                  </Grid>
                ))}
              </Box>
            </Box>

            {/* Horaires */}
            <Box sx={{ 
              bgcolor: 'white',
              borderRadius: { xs: 2, md: 3 },
              p: { xs: 3, sm: 4, md: 4 },
              mb: { xs: 3, md: 4 },
              boxShadow: '0 4px 20px rgba(0,0,0,0.1)'
            }}>
              <Typography 
                variant="h5" 
                sx={{ 
                  fontWeight: 700, 
                  color: '#1780c2',
                  mb: { xs: 1, md: 2 },
                  fontSize: { xs: 18, sm: 20, md: 22 }
                }}
              >
                HORAIRE
              </Typography>
              <Typography 
                variant="body1" 
                sx={{ 
                  fontSize: { xs: 14, sm: 16, md: 18 },
                  color: '#333',
                  fontWeight: 600,
                  lineHeight: 1.4
                }}
              >
                Lundi au vendredi de 07h00-11h30 et de 13h30-18h00
              </Typography>
            </Box>
          </Grid>

          {/* Colonne droite - Documents et fournitures */}
          <Grid item xs={12} lg={4}>
            {/* Documents à fournir */}
            <Box sx={{ 
              bgcolor: 'white',
              borderRadius: { xs: 2, md: 3 },
              p: { xs: 3, sm: 4, md: 4 },
              mb: { xs: 3, md: 4 },
              boxShadow: '0 4px 20px rgba(0,0,0,0.1)'
            }}>
              <Typography 
                variant="h5" 
                sx={{ 
                  fontWeight: 700, 
                  color: '#1780c2',
                  mb: { xs: 2, md: 3 },
                  fontSize: { xs: 18, sm: 20, md: 22 }
                }}
              >
                LISTE DES PIÈCES À FOURNIR
              </Typography>
              
              <Box component="ul" sx={{ pl: { xs: 1.5, md: 2 }, m: 0 }}>
                <Box component="li" sx={{ mb: { xs: 1.5, md: 2 }, color: '#333' }}>
                  <Typography sx={{ 
                    fontSize: { xs: 13, sm: 14, md: 16 },
                    lineHeight: 1.4
                  }}>
                    Une copie de l'extrait de naissance
                  </Typography>
                </Box>
                <Box component="li" sx={{ mb: { xs: 1.5, md: 2 }, color: '#333' }}>
                  <Typography sx={{ 
                    fontSize: { xs: 13, sm: 14, md: 16 },
                    lineHeight: 1.4
                  }}>
                    3 photos d'identité récentes de même tirage
                  </Typography>
                </Box>
                <Box component="li" sx={{ mb: { xs: 1.5, md: 2 }, color: '#333' }}>
                  <Typography sx={{ 
                    fontSize: { xs: 13, sm: 14, md: 16 },
                    lineHeight: 1.4
                  }}>
                    1 Certificat de vaccinations original à jour signé par le pédiatre
                  </Typography>
                </Box>
                <Box component="li" sx={{ color: '#333' }}>
                  <Typography sx={{ 
                    fontSize: { xs: 13, sm: 14, md: 16 },
                    lineHeight: 1.4
                  }}>
                    1 Fiche d'Identification et 1 fiche Sanitaire à récupérer à GROUPE SCOLAIRE SAINTE FAMILLE L'EXECELLENCE
                  </Typography>
                </Box>
              </Box>
            </Box>

            {/* Fournitures */}
            <Box sx={{ 
              bgcolor: 'white',
              borderRadius: { xs: 2, md: 3 },
              p: { xs: 3, sm: 4, md: 4 },
              mb: { xs: 3, md: 4 },
              boxShadow: '0 4px 20px rgba(0,0,0,0.1)'
            }}>
              <Typography 
                variant="h5" 
                sx={{ 
                  fontWeight: 700, 
                  color: '#1780c2',
                  mb: { xs: 2, md: 3 },
                  fontSize: { xs: 18, sm: 20, md: 22 }
                }}
              >
                EFFETS À FOURNIR
              </Typography>
              
              <Box component="ul" sx={{ pl: { xs: 1.5, md: 2 }, m: 0 }}>
                {[
                  '1 porte vue de 160 vues',
                  '1 cahier de 50 pages avec couverture transparente',
                  '1 grand cahier de 200 pages (24*32)',
                  'Le conquérant couverture transparente',
                  '1 paquet de rame A3',
                  '1 pot de peinture',
                  '1 grand pot de colle',
                  '3 boîtes de mouchoirs 200 renouvelables',
                  '1 boîte de gants',
                  '2 savons liquide gel Main',
                  '1 vieux tee-shirt adulte pour la peinture',
                  'Couches et lingettes renouvelables',
                  'Vêtements de rechange',
                  '1 gant de toilettes et 1 petite serviette marqués au nom de l\'enfant',
                  'Chaussures d\'intérieur',
                  '1 brosse à cheveux pour les filles',
                  '2 paquets de papier toilettes'
                ].map((item, index) => (
                  <Box component="li" key={index} sx={{ 
                    mb: { xs: 0.5, sm: 1 }, 
                    color: '#333' 
                  }}>
                    <Typography sx={{ 
                      fontSize: { xs: 12, sm: 13, md: 15 },
                      lineHeight: 1.3
                    }}>
                      {item}
                    </Typography>
                  </Box>
                ))}
              </Box>
            </Box>
          </Grid>
        </Grid>

        {/* Informations supplémentaires */}
        <Grid container spacing={{ xs: 2, sm: 3, md: 4 }}>
          <Grid item xs={12} md={6}>
            <Box sx={{ 
              bgcolor: 'white',
              borderRadius: { xs: 2, md: 3 },
              p: { xs: 3, sm: 4, md: 4 },
              boxShadow: '0 4px 20px rgba(0,0,0,0.1)'
            }}>
              <Typography 
                variant="h5" 
                sx={{ 
                  fontWeight: 700, 
                  color: '#1780c2',
                  mb: { xs: 1, md: 2 },
                  fontSize: { xs: 18, sm: 20, md: 22 }
                }}
              >
                CANTINE
              </Typography>
              <Typography 
                variant="body1" 
                sx={{ 
                  fontSize: { xs: 14, sm: 16, md: 18 },
                  color: '#333',
                  mb: { xs: 1, md: 2 },
                  lineHeight: 1.4
                }}
              >
                <strong>Facultative</strong> - Tarif 50.000 francs/mois
              </Typography>
              <Typography 
                variant="body2" 
                sx={{ 
                  color: '#666',
                  fontStyle: 'italic',
                  fontSize: { xs: 13, sm: 14, md: 16 }
                }}
              >
                Les collations sont offertes
              </Typography>
            </Box>
          </Grid>
          
          <Grid item xs={12} md={6}>
            <Box sx={{ 
              bgcolor: 'white',
              borderRadius: { xs: 2, md: 3 },
              p: { xs: 3, sm: 4, md: 4 },
              boxShadow: '0 4px 20px rgba(0,0,0,0.1)'
            }}>
              <Typography 
                variant="h5" 
                sx={{ 
                  fontWeight: 700, 
                  color: '#1780c2',
                  mb: { xs: 1, md: 2 },
                  fontSize: { xs: 18, sm: 20, md: 22 }
                }}
              >
                FRAIS ANNEXES
              </Typography>
              <Typography 
                variant="h6" 
                sx={{ 
                  color: '#FF9800',
                  fontWeight: 700,
                  mb: { xs: 1, md: 2 },
                  fontSize: { xs: 16, sm: 18, md: 20 }
                }}
              >
                35.000 F CFA
              </Typography>
              <Typography 
                variant="body2" 
                sx={{ 
                  color: '#666',
                  fontSize: { xs: 13, sm: 14, md: 16 },
                  lineHeight: 1.4
                }}
              >
                La garderie reste ouverte sur toute l'année sauf les congés de Noël.
              </Typography>
            </Box>
          </Grid>
        </Grid>

        {/* Notes importantes */}
        <Box sx={{ 
          bgcolor: '#fff3e0',
          borderRadius: { xs: 2, md: 3 },
          p: { xs: 3, sm: 4, md: 4 },
          mt: { xs: 3, md: 4 },
          border: '2px solid #FF9800'
        }}>
          <Typography 
            variant="h6" 
            sx={{ 
              fontWeight: 700, 
              color: '#FF9800',
              mb: { xs: 1, md: 2 },
              fontSize: { xs: 16, sm: 18, md: 20 }
            }}
          >
            Notes importantes :
          </Typography>
          <Box component="ul" sx={{ pl: { xs: 1.5, md: 2 }, m: 0 }}>
            <Box component="li" sx={{ mb: { xs: 0.5, md: 1 }, color: '#333' }}>
              <Typography sx={{ 
                fontSize: { xs: 13, sm: 14, md: 16 },
                lineHeight: 1.4
              }}>
                Tout mois entamé est dû et payable au plus tard le 05 du mois en cours.
              </Typography>
            </Box>
            <Box component="li" sx={{ color: '#333' }}>
              <Typography sx={{ 
                fontSize: { xs: 13, sm: 14, md: 16 },
                lineHeight: 1.4
              }}>
                L'inscription n'est pas remboursable.
              </Typography>
            </Box>
          </Box>
        </Box>

        {/* Message de fin */}
        <Box sx={{ 
          textAlign: 'center', 
          mt: { xs: 4, sm: 5, md: 6 },
          bgcolor: 'white',
          borderRadius: { xs: 2, md: 3 },
          p: { xs: 3, sm: 4, md: 4 },
          boxShadow: '0 4px 20px rgba(0,0,0,0.1)'
        }}>
          <Typography 
            variant="h5" 
            sx={{ 
              fontWeight: 700, 
              color: '#1780c2',
              fontStyle: 'italic',
              fontSize: { xs: 18, sm: 20, md: 22, lg: 24 }
            }}
          >
            Nous avons hâte de vous recevoir !
          </Typography>
        </Box>

        {/* Bouton retour */}
        <Box sx={{ textAlign: 'center', mt: { xs: 3, md: 4 } }}>
          <Button
            variant="contained"
            onClick={() => setShowGarderie(false)}
            sx={{
              bgcolor: '#1780c2',
              color: 'white',
              fontWeight: 700,
              px: { xs: 3, sm: 4, md: 4 },
              py: { xs: 1.5, sm: 2, md: 2 },
              borderRadius: { xs: 2, md: 3 },
              fontSize: { xs: 14, sm: 16, md: 18 },
              '&:hover': {
                bgcolor: '#1565c0',
              },
            }}
          >
            Retour à l'accueil
          </Button>
        </Box>
      </Container>
    </Box>
  );

  return (
    <Box>
      <Header onOpenLogin={handleOpenLogin} onShowGarderie={handleShowGarderie} />
      {showGarderie ? (
        <GarderiePage />
      ) : (
        <>
      <Slider />
      <ActivitesSection />
      <DirectriceSection />
      
      {/* Section Inscription */}
      <Box sx={{ 
        py: { xs: 6, md: 12 }, 
        background: 'linear-gradient(135deg, #1780c2 0%, #1565c0 100%)',
        position: 'relative',
        overflow: 'hidden'
      }}>
        <Container maxWidth="lg">
          <Box sx={{
            textAlign: 'center',
            color: 'white'
          }}>
            <Typography 
              variant="h2" 
              sx={{ 
                fontWeight: 700, 
                mb: 2, 
                fontSize: { xs: 28, md: 36, lg: 42 },
                textShadow: '2px 2px 4px rgba(0,0,0,0.3)'
              }}
            >
              Inscrivez votre enfant à notre crèche et garderie !
            </Typography>
            
            <Typography 
              variant="h5" 
              sx={{ 
                mb: 6, 
                opacity: 0.9,
                fontSize: { xs: 16, md: 18, lg: 20 },
                fontWeight: 400
              }}
            >
              Crèche, garderie et école maternelle à Abidjan - Inscription ouverte
            </Typography>
            
            {/* Boutons d'action */}
            <Box sx={{
              display: 'flex',
              flexDirection: { xs: 'column', md: 'row' },
              gap: 3,
              justifyContent: 'center',
              alignItems: 'center'
            }}>
              <Button
                variant="contained"
                size="large"
                onClick={handleOpenRegistrationModal}
                sx={{
                  bgcolor: '#0d47a1',
                  color: 'white',
                  fontWeight: 700,
                  px: 4,
                  py: 2,
                  borderRadius: 3,
                  fontSize: { xs: 16, md: 18 },
                  textTransform: 'none',
                  boxShadow: '0 8px 32px rgba(13, 71, 161, 0.4)',
                  '&:hover': {
                    bgcolor: '#002171',
                    transform: 'translateY(-2px)',
                    boxShadow: '0 12px 40px rgba(13, 71, 161, 0.5)',
                  },
                  transition: 'all 0.3s ease',
                  minWidth: { xs: '100%', md: 'auto' }
                }}
                startIcon={<TouchAppIcon />}
              >
                Pré-Inscription Crèche & Garderie
              </Button>
              
              {showAdminButton && (
                <Button
                  variant="contained"
                  size="large"
                  onClick={handleNavigateToSecretaryLogin}
                  sx={{
                    background: 'linear-gradient(135deg, #d32f2f 0%, #b71c1c 50%, #4a148c 100%)',
                    color: 'white',
                    fontWeight: 700,
                    px: 4,
                    py: 2,
                    borderRadius: 3,
                    fontSize: { xs: 16, md: 18 },
                    textTransform: 'none',
                    boxShadow: '0 8px 32px rgba(211, 47, 47, 0.4)',
                    '&:hover': {
                      background: 'linear-gradient(135deg, #c62828 0%, #8e0000 50%, #311b92 100%)',
                      transform: 'translateY(-2px)',
                      boxShadow: '0 12px 40px rgba(211, 47, 47, 0.5)',
                    },
                    transition: 'all 0.3s ease',
                    minWidth: { xs: '100%', md: 'auto' }
                  }}
                  startIcon={<LoginIcon />}
                >
                  Connexion Admin
                </Button>
              )}
            </Box>
          </Box>
        </Container>
      </Box>
      
      <ServicesSection />
      <ContactSection />
      
      
        </>
      )}
              <SiteFooter />
      
      {/* Modal de pré-inscription - Desktop uniquement */}
      {!isMobile && (
        <Dialog
          open={openRegistrationModal}
          onClose={() => setOpenRegistrationModal(false)}
          maxWidth="md"
          fullWidth
          PaperProps={{
            sx: {
              borderRadius: 3,
              maxHeight: '90vh',
              overflow: 'auto'
            }
          }}
        >
                  <DialogContent sx={{ p: 0, overflow: 'auto' }}>
          <Registration onClose={handleCloseRegistrationModal} isMobile={isMobile} />
        </DialogContent>
        </Dialog>
      )}
      
      {/* Formulaire plein écran - Mobile uniquement */}
      {isMobile && openRegistrationModal && (
        <Box sx={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          bgcolor: 'white',
          zIndex: 9999,
          overflow: 'auto'
        }}>
          <Registration onClose={handleCloseRegistrationModal} isMobile={isMobile} />
        </Box>
      )}
    </Box>
  );
};

export default Home;

// Export vide pour éviter l'erreur de module global
export {};

