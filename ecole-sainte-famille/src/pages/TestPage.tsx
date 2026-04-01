import React from 'react';
import { Container, Typography, Button, Box } from '@mui/material';

const TestPage: React.FC = () => {
  const [count, setCount] = React.useState(0);

  return (
    <Container maxWidth="lg" style={{ paddingTop: '32px', paddingBottom: '32px' }}>
      <Typography variant="h3" align="center" style={{ marginBottom: '32px' }}>
        Page de Test
      </Typography>
      
      <Box style={{ textAlign: 'center', marginBottom: '32px' }}>
        <Typography variant="h5" style={{ marginBottom: '16px' }}>
          Compteur: {count}
        </Typography>
        <Button 
          variant="contained" 
          onClick={() => setCount(count + 1)}
          style={{ marginRight: '8px' }}
        >
          Incrémenter
        </Button>
        <Button 
          variant="outlined" 
          onClick={() => setCount(0)}
        >
          Réinitialiser
        </Button>
      </Box>

      <Typography variant="body1" align="center" color="text.secondary">
        Si vous voyez cette page et que le compteur fonctionne, React fonctionne correctement.
      </Typography>
    </Container>
  );
};

export default TestPage; 
