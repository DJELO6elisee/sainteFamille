import React from 'react';
import {
  Box,
  Container,
  Grid,
  Typography,
  Link,
  IconButton,
  Divider,
} from '@mui/material';
import FacebookIcon from '@mui/icons-material/Facebook';
import TwitterIcon from '@mui/icons-material/Twitter';
import InstagramIcon from '@mui/icons-material/Instagram';
import LinkedInIcon from '@mui/icons-material/LinkedIn';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import PhoneIcon from '@mui/icons-material/Phone';
import EmailIcon from '@mui/icons-material/Email';

const Footer = () => {
  return (
    <Box
      component="footer"
      sx={{
        bgcolor: 'primary.main',
        color: 'white',
        py: 6,
        mt: 'auto',
      }}
    >
      <Container maxWidth="lg">
        <Grid container spacing={4}>
          {/* À propos */}
          <Grid item xs={12} md={4}>
            <Typography variant="h6" gutterBottom>
              À propos
            </Typography>
            <Typography variant="body2" sx={{ mb: 2 }}>
              Le Collège Excellence est un établissement d'enseignement secondaire
              reconnu pour son excellence académique et son engagement envers
              le développement des élèves.
            </Typography>
            <Box sx={{ mt: 2 }}>
              <IconButton color="inherit" aria-label="Facebook">
                <FacebookIcon />
              </IconButton>
              <IconButton color="inherit" aria-label="Twitter">
                <TwitterIcon />
              </IconButton>
              <IconButton color="inherit" aria-label="Instagram">
                <InstagramIcon />
              </IconButton>
              <IconButton color="inherit" aria-label="LinkedIn">
                <LinkedInIcon />
              </IconButton>
            </Box>
          </Grid>

          {/* Liens rapides */}
          <Grid item xs={12} md={4}>
            <Typography variant="h6" gutterBottom>
              Liens rapides
            </Typography>
            <Link href="/about" color="inherit" display="block" sx={{ mb: 1 }}>
              À propos de nous
            </Link>
            <Link href="/admission" color="inherit" display="block" sx={{ mb: 1 }}>
              Admission
            </Link>
            <Link href="/programs" color="inherit" display="block" sx={{ mb: 1 }}>
              Programmes
            </Link>
            <Link href="/events" color="inherit" display="block" sx={{ mb: 1 }}>
              Événements
            </Link>
            <Link href="/contact" color="inherit" display="block" sx={{ mb: 1 }}>
              Contact
            </Link>
          </Grid>

          {/* Contact */}
          <Grid item xs={12} md={4}>
            <Typography variant="h6" gutterBottom>
              Contact
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <LocationOnIcon sx={{ mr: 1 }} />
              <Typography variant="body2">
                123 Avenue de l'Éducation, 75000 Paris
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <PhoneIcon sx={{ mr: 1 }} />
              <Typography variant="body2">
                01 23 45 67 89
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <EmailIcon sx={{ mr: 1 }} />
              <Typography variant="body2">
                contact@college-excellence.fr
              </Typography>
            </Box>
          </Grid>
        </Grid>

        <Divider sx={{ my: 3, bgcolor: 'rgba(255, 255, 255, 0.2)' }} />

        <Typography variant="body2" align="center">
          © {new Date().getFullYear()} Collège Excellence. Tous droits réservés.
        </Typography>
      </Container>
    </Box>
  );
};

export default Footer; 
