import React from 'react';
import { Button, Box, Typography } from '@mui/material';
import { gradeEventManager } from '../utils/gradeUpdateEvents';

interface RealTimeTestButtonProps {
  studentId?: number;
  classId?: number;
  subjectId?: number;
  compositionId?: number;
}

const RealTimeTestButton: React.FC<RealTimeTestButtonProps> = ({
  studentId = 7, // ID par défaut pour les tests
  classId = 7,
  subjectId = 3,
  compositionId = 6
}) => {
  const handleTestUpdate = () => {
    console.log('🧪 [TEST] Simulation d\'une mise à jour de note...');
    
    // Simuler une mise à jour de note
    gradeEventManager.emitGradeUpdate({
      studentId,
      classId,
      subjectId,
      compositionId,
      newGrade: Math.round((Math.random() * 20) * 100) / 100, // Note aléatoire entre 0 et 20
      isPublished: false,
      timestamp: Date.now()
    });
    
    // Simuler une publication après 2 secondes
    setTimeout(() => {
      console.log('🧪 [TEST] Simulation d\'une publication...');
      gradeEventManager.emitGradeUpdate({
        studentId,
        classId,
        subjectId,
        compositionId,
        newGrade: Math.round((Math.random() * 20) * 100) / 100,
        isPublished: true,
        timestamp: Date.now()
      });
    }, 2000);
  };

  const handleTestBulletinRefresh = () => {
    console.log('🧪 [TEST] Simulation d\'un rafraîchissement de bulletin...');
    
    gradeEventManager.triggerBulletinRefresh(
      [studentId],
      classId,
      compositionId,
      subjectId
    );
  };

  // Ne montrer ce bouton qu'en développement
  if (process.env.NODE_ENV !== 'development') {
    return null;
  }

  return (
    <Box sx={{ position: 'fixed', bottom: 16, right: 16, zIndex: 1000 }}>
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
        <Button
          variant="contained"
          color="warning"
          size="small"
          onClick={handleTestUpdate}
          sx={{ fontSize: '0.7rem' }}
        >
          🧪 Test Mise à Jour
        </Button>
        <Button
          variant="outlined"
          color="warning"
          size="small"
          onClick={handleTestBulletinRefresh}
          sx={{ fontSize: '0.7rem' }}
        >
          🔄 Test Rafraîchissement
        </Button>
      </Box>
    </Box>
  );
};

export default RealTimeTestButton;
