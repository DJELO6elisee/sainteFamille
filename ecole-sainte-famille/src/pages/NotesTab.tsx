import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Box, Typography, Table, TableHead, TableRow, TableCell, TableBody, CircularProgress, Paper, Chip, Avatar } from '@mui/material';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import GradeIcon from '@mui/icons-material/Grade';

const NotesTab = ({ childId, schoolYear }: { childId: string | undefined, schoolYear: string }) => {
  const [grades, setGrades] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    
    const fetchGrades = async () => {
      if (!isMounted) return;
      
      setLoading(true);
      const token = localStorage.getItem('token');
      try {
        const { data } = await axios.get(`https://saintefamilleexcellence.ci/api/students/${childId}/grades?school_year=${schoolYear}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        if (isMounted) {
          setGrades(data);
          setLoading(false);
        }
      } catch (err) {
        if (isMounted) {
          setGrades([]);
          setLoading(false);
        }
      }
    };
    
    if (childId && schoolYear) fetchGrades();
    
    return () => {
      isMounted = false;
    };
  }, [childId, schoolYear]);

  if (loading) return <CircularProgress />;
  if (!grades.length) return <Typography>Aucune note disponible.</Typography>;

  if (!loading && grades.length === 0) return (
    <Typography color="error" fontWeight={700} align="center" sx={{ my: 3 }}>
      Aucune information disponible pour votre enfant en cette année scolaire.
    </Typography>
  );

  // Fonction pour colorer le badge de moyenne
  const moyenneColor = (moy: number) => {
    if (moy >= 15) return 'success';
    if (moy >= 10) return 'primary';
    return 'error';
  };

  return (
    <Box>
      <Box display="flex" alignItems="center" mb={3}>
        <Avatar sx={{ bgcolor: '#f06292', mr: 2 }}>
          <GradeIcon />
        </Avatar>
        <Box>
          <Typography variant="h5" fontWeight={700} color="primary.main">
            Notes de votre enfant
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            ✅ Seules les notes publiées par les enseignants sont affichées
          </Typography>
        </Box>
      </Box>
      <Paper elevation={3} sx={{ borderRadius: 3, overflow: 'hidden' }}>
        <Box
          sx={{
            width: '100%',
            overflowX: 'auto',
            '@media (max-width:600px)': {
              pb: 1,
              mb: 2,
              borderRadius: 2,
              background: '#fff',
              boxShadow: 1,
            },
          }}
        >
          <Table sx={{ minWidth: 500 }}>
            <TableHead>
              <TableRow sx={{ background: 'linear-gradient(90deg, #1976d2 60%, #f06292 100%)' }}>
                <TableCell sx={{ color: 'white', fontWeight: 'bold', fontSize: 16 }}>Matière</TableCell>
                <TableCell sx={{ color: 'white', fontWeight: 'bold', fontSize: 16 }}>Trimestre</TableCell>
                <TableCell sx={{ color: 'white', fontWeight: 'bold', fontSize: 16 }}>Moyenne</TableCell>
                <TableCell sx={{ color: 'white', fontWeight: 'bold', fontSize: 16 }}>Notes détaillées</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {grades.map((g: any, idx: number) => (
                <TableRow key={g.subject_id + g.semester} sx={{ background: idx % 2 === 0 ? '#f8fafd' : '#fff' }}>
                  <TableCell sx={{ fontWeight: 'bold', fontSize: 17, color: '#d81b60' }}>{g.subject_name}</TableCell>
                  <TableCell sx={{ fontWeight: 500 }}>{g.semester}</TableCell>
                  <TableCell>
                    <Chip
                      label={g.moyenne?.toFixed(2)}
                      color={moyenneColor(g.moyenne)}
                      icon={<EmojiEventsIcon />}
                      sx={{ fontWeight: 700, fontSize: 16, px: 1.5, bgcolor: g.moyenne >= 15 ? '#43a047' : g.moyenne >= 10 ? '#1976d2' : '#e53935', color: 'white' }}
                    />
                  </TableCell>
                  <TableCell>
                    {g.notes && g.notes.length > 0 ? (
                      <Box display="flex" flexWrap="wrap" gap={1}>
                        {g.notes.map((note: any, idx: number) => {
                          const isValidDate = note.date && !isNaN(new Date(note.date).getTime());
                          const gradeColor = isNaN(Number(note.grade)) ? '#e53935' : '#f06292';
                          return (
                            <Chip
                              key={idx}
                              label={
                                <span>
                                  <b>Note :</b> {isNaN(Number(note.grade))
                                    ? <span style={{ color: 'red' }}>Erreur donnée</span>
                                    : Number(note.grade).toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                  {note.coefficient && note.coefficient !== 1 && <span style={{ color: '#888' }}> (coef {note.coefficient})</span>}
                                  {isValidDate ? (
                                    <span style={{ marginLeft: 8, color: '#1976d2' }}>{new Date(note.date).toLocaleDateString('fr-FR')}</span>
                                  ) : (
                                    <span style={{ marginLeft: 8, color: '#888' }}>Date inconnue</span>
                                  )}
                                </span>
                              }
                              sx={{ bgcolor: gradeColor, color: 'white', fontWeight: 500, fontSize: 15, mb: 0.5 }}
                            />
                          );
                        })}
                      </Box>
                    ) : (
                      <span style={{ color: '#888' }}>Aucune note</span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Box>
      </Paper>
    </Box>
  );
};

export default NotesTab; 

