import React from 'react';
import { Box, Typography, Paper } from '@mui/material';

const TestDays = () => {
  return (
    <Paper sx={{ p: 2, m: 2 }}>
      <Typography variant="h6">Test des jours de la semaine</Typography>
      <Box sx={{ mt: 1 }}>
        <Typography variant="body2">Jours configurés :</Typography>
        <Typography variant="body2" color="primary">✅ SAMEDI</Typography>
        <Typography variant="body2" color="primary">✅ DIMANCHE</Typography>
        <Typography variant="body2" color="error">❌ LUNDI (supprimé)</Typography>
        <Typography variant="body2" color="error">❌ MARDI (supprimé)</Typography>
        <Typography variant="body2" color="error">❌ MERCREDI (supprimé)</Typography>
        <Typography variant="body2" color="error">❌ JEUDI (supprimé)</Typography>
        <Typography variant="body2" color="error">❌ VENDREDI (supprimé)</Typography>
      </Box>
    </Paper>
  );
};

export default TestDays;






















