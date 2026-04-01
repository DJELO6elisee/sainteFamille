import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Box, Paper, Typography, Table, TableHead, TableRow, TableCell, TableBody, CircularProgress, Button, Divider, Stack, Grid, Alert } from '@mui/material';
import axios from 'axios';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

const MyReportCard = () => {
  const { trimester } = useParams();
  const navigate = useNavigate();
  const [student, setStudent] = useState<any>(null);
  const [grades, setGrades] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [trimesterRank, setTrimesterRank] = useState<{ rank: number; total: number; moyenne: number | null } | null>(null);
  const bulletinRef = useRef<HTMLDivElement>(null);
  const [isPublished, setIsPublished] = useState<boolean | null>(null);

  // Helper pour l'année scolaire
  function getCurrentSchoolYear() {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;
    if (month >= 9) {
      return `${year}-${year + 1}`;
    } else {
      return `${year - 1}-${year}`;
    }
  }

  useEffect(() => {
    let isMounted = true;
    
    const fetchData = async () => {
      if (!isMounted) return;
      setLoading(true);
      setError(null);
      
      const token = localStorage.getItem('token');
      if (!token) {
        if (isMounted) navigate('/login');
        return;
      }
      
      try {
        // 1. Charger l'élève d'abord
        const studentRes = await axios.get('https://saintefamilleexcellence.ci/api/students/me', {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (!isMounted) return;
        console.log('DEBUG REPONSE /api/students/me', studentRes.data);
        setStudent(studentRes.data.student);

        // 2. Déduire class_id et school_year
        const studentObj = studentRes.data.student;
        console.log('DEBUG BULLETIN', { student: studentObj });
        const class_id = studentObj.class_id || studentObj.classe_id || studentObj.classId;
        const school_year = studentObj.school_year || getCurrentSchoolYear();
        console.log('DEBUG AVANT /published', { class_id, school_year, trimester });
        if (!class_id) {
          setLoading(false);
          setError("Impossible de déterminer la classe de l'élève. Veuillez contacter l'administration.");
          return;
        }

        // 3. Vérifier la publication du bulletin
        let pubRes;
        try {
          pubRes = await axios.get('https://saintefamilleexcellence.ci/api/report-cards/published', {
            params: {
              class_id,
              trimester,
              school_year
            },
            headers: { Authorization: `Bearer ${token}` }
          });
        } catch (err: any) {
          setLoading(false);
          setError(`Erreur publication bulletin : ${err?.response?.data?.message || err.message} (class_id=${class_id}, school_year=${school_year}, trimester=${trimester})`);
          return;
        }
        if (!isMounted) return;
        setIsPublished(!!pubRes.data.published);
        if (!pubRes.data.published) {
          setLoading(false);
          setError("Le bulletin de ce trimestre n’a pas encore été publié par l’administration.");
          return;
        }

        // 4. Récupérer toutes les notes de l'élève
        const gradesRes = await axios.get(`https://saintefamilleexcellence.ci/api/students/${studentRes.data.student.id}/grades`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (isMounted) {
          // Filtrer les notes par trimestre si spécifié
          const allGrades = gradesRes.data;
          const filteredGrades = trimester 
            ? allGrades.filter((g: any) => g.semester === trimester)
            : allGrades;
          setGrades(filteredGrades);
        }

        // 5. Récupérer le rang global du trimestre
        if (typeof trimester === 'string') {
          const rankRes = await axios.get(
            `https://saintefamilleexcellence.ci/api/students/${studentRes.data.student.id}/trimester-rank?semester=${encodeURIComponent(trimester)}`,
            { headers: { Authorization: `Bearer ${token}` } }
          );
          if (isMounted) {
            setTrimesterRank(rankRes.data);
          }
        } else {
          setTrimesterRank(null);
        }
      } catch (err: any) {
        if (isMounted) {
          if (err.response?.status === 403) {
            setError("Le bulletin de ce trimestre n’a pas encore été publié par l’administration.");
          } else {
            console.error('Erreur lors du chargement des données:', err);
            setError(err.response?.data?.message || 'Erreur lors du chargement des données.');
          }
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchData();
    
    return () => {
      isMounted = false;
    };
  }, [navigate, trimester]);

  // Calculs totaux
  const totalCoef = grades.reduce((acc, g) => acc + (g.coefficient || 1), 0);
  const totalMoyCoef = grades.reduce((acc, g) => acc + (g.moyenne * (g.coefficient || 1)), 0);
  const moyenneTrimestrielle = totalCoef ? (totalMoyCoef / totalCoef) : 0;

  // Fonction pour déterminer si un trimestre est terminé
  const isTrimesterCompleted = (trimesterName: string) => {
    const now = new Date();
    const currentMonth = now.getMonth() + 1; // getMonth() retourne 0-11
    
    switch (trimesterName) {
      case '1er trimestre':
        // Le 1er trimestre se termine généralement en décembre (mois 12)
        return currentMonth > 12;
      case '2e trimestre':
        // Le 2e trimestre se termine généralement en mars (mois 3)
        return currentMonth > 3;
      case '3e trimestre':
        // Le 3e trimestre se termine généralement en juin (mois 6)
        return currentMonth > 6;
      default:
        return false;
    }
  };

  const isCompleted = trimester ? isTrimesterCompleted(trimester) : false;
  const bulletinTitle = isCompleted ? `BULLETIN DE NOTES - ${trimester?.toUpperCase()}` : `BULLETIN PARTIEL - ${trimester?.toUpperCase()}`;

  const handleDownload = async () => {
    if (!bulletinRef.current) return;
    const input = bulletinRef.current;
    const canvas = await html2canvas(input, { scale: 2 });
    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF('p', 'mm', 'a4');
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
    pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
    pdf.save(`Bulletin-${student?.last_name || ''}-${student?.first_name || ''}-${trimester || ''}.pdf`);
  };

  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', mt: 8 }}><CircularProgress /></Box>;
  if (error) return <Box sx={{ display: 'flex', justifyContent: 'center', mt: 8 }}><Alert severity="info">{error}</Alert></Box>;
  return (
    <Box sx={{ p: 4, minHeight: '100vh', background: 'linear-gradient(135deg, #e3f0ff 0%, #f8e1ff 100%)' }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Button variant="outlined" onClick={() => navigate('/student/choose-trimester')}>
          ← Retour à la sélection des trimestres
        </Button>
        {(!loading && !error) && (
          <Button variant="contained" color="primary" onClick={handleDownload}>
            Télécharger le bulletin
          </Button>
        )}
      </Box>
      <Paper ref={bulletinRef} sx={{ p: 4, borderRadius: 5, maxWidth: 900, mx: 'auto', boxShadow: '0 8px 32px rgba(80, 36, 204, 0.10)', background: 'white' }}>
        {/* En-tête avec logo et nom de l'école */}
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', mb: 3, pb: 2, borderBottom: '2px solid #e0e0e0' }}>
          <img 
            src="/logo192.png" 
            alt="Logo établissement" 
            style={{ 
              height: 80, 
              marginRight: 20,
              borderRadius: '8px',
              boxShadow: '0 4px 8px rgba(0,0,0,0.1)'
            }} 
          />
          <Box sx={{ textAlign: 'center' }}>
            <Typography variant="h4" fontWeight={800} color="primary.main" sx={{ mb: 1, letterSpacing: 1 }}>
              ÉCOLE MON ÉTABLISSEMENT
            </Typography>
            <Typography variant="h6" color="text.secondary" sx={{ fontWeight: 500 }}>
              Excellence • Discipline • Réussite
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              BP 123 • Téléphone: +123 456 789 • Email: contact@monetablissement.com
            </Typography>
          </Box>
        </Box>
        
        <Typography variant="h5" fontWeight={700} align="center" sx={{ mb: 2 }}>
          {bulletinTitle}
        </Typography>
        <Divider sx={{ mb: 2 }} />
        
        <Stack direction="row" spacing={4} sx={{ mb: 2 }}>
          <Box>
            <Typography><b>Nom :</b> {student?.last_name} {student?.first_name}</Typography>
            <Typography><b>Civilité :</b> {student?.gender_label === 'Féminin' ? 'Madame' : student?.gender_label === 'Masculin' ? 'Monsieur' : ''}</Typography>
            <Typography><b>Matricule :</b> {student?.registration_number}</Typography>
            <Typography><b>Classe :</b> {student?.class_name || student?.classe_name}</Typography>
            <Typography>
              <b>Date de naissance :</b> {student?.date_of_birth ? (() => {
                try {
                  // Si c'est au format DD/MM/YYYY (format du backend)
                  if (/^\d{2}\/\d{2}\/\d{4}$/.test(student.date_of_birth)) {
                    return student.date_of_birth;
                  }
                  // Sinon, convertir en date et formater
                  const date = new Date(student.date_of_birth);
                  return isNaN(date.getTime()) ? '' : date.toLocaleDateString('fr-FR');
                } catch (error) {
                  return '';
                }
              })() : ''}
            </Typography>
          </Box>
          <Box>
            <Typography><b>Sexe :</b> {student?.gender_label}</Typography>
            <Typography><b>Nationalité :</b> {student?.nationality || '-'}</Typography>
          </Box>
        </Stack>
        <Divider sx={{ mb: 2 }} />
        
        <Table size="small" sx={{ mb: 2 }}>
          <TableHead>
            <TableRow sx={{ background: '#f3e5f5' }}>
              <TableCell>Discipline</TableCell>
              <TableCell align="center">Moy/20</TableCell>
              <TableCell align="center">Coef. (pondération)</TableCell>
              <TableCell align="center">Moy x Coef</TableCell>
              <TableCell align="center">Rang</TableCell>
              <TableCell align="center">Appréciation</TableCell>
              <TableCell align="center">Professeur</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {grades.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} align="center">
                  <Typography color="text.secondary">
                    Aucune note publiée pour le {trimester}.
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              grades.map((g) => (
                <TableRow key={g.subject_id}>
                  <TableCell>{g.subject_name}</TableCell>
                  <TableCell align="center">{g.moyenne?.toFixed(2)}</TableCell>
                  <TableCell align="center"><b>{g.coefficient || 1}</b></TableCell>
                  <TableCell align="center">{(g.moyenne * (g.coefficient || 1)).toFixed(2)}</TableCell>
                  <TableCell align="center">{g.rang || '-'}</TableCell>
                  <TableCell align="center">{g.appreciation || ''}</TableCell>
                  <TableCell align="center">{g.teacher_name || ''}</TableCell>
                </TableRow>
              ))
            )}
            {grades.length > 0 && (
              <TableRow sx={{ background: '#ede7f6' }}>
                <TableCell><b>TOTAUX</b></TableCell>
                <TableCell></TableCell>
                <TableCell align="center"><b>{totalCoef}</b></TableCell>
                <TableCell align="center"><b>{totalMoyCoef.toFixed(2)}</b></TableCell>
                <TableCell colSpan={3}></TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
        {grades.length > 0 && (
          <Typography variant="caption" color="text.secondary" align="center" sx={{ display: 'block', mb: 2 }}>
            La moyenne trimestrielle est calculée en fonction des coefficients de chaque matière de la classe.
          </Typography>
        )}
        
        <Stack direction="row" spacing={4} sx={{ mt: 2, mb: 0 }}>
          <Box>
            <Typography><b>Moyenne trimestrielle :</b> {moyenneTrimestrielle.toFixed(2)} / 20</Typography>
          </Box>
          <Box>
            <Typography><b>Appréciation du conseil :</b> Passable</Typography>
          </Box>
          {trimesterRank && trimesterRank.total > 0 && (
            <Box>
              <Typography><b>Rang dans la classe :</b> {trimesterRank.rank} / {trimesterRank.total}</Typography>
            </Box>
          )}
        </Stack>
        
        <Divider sx={{ my: 2 }} />
        <Typography variant="body2" align="center" sx={{ mt: 2, color: 'text.secondary' }}>
          L'effort fait des forts
        </Typography>
        
        {/* Pied de page avec signatures */}
        <Box sx={{ mt: 4, pt: 3, borderTop: '1px solid #e0e0e0' }}>
          <Grid container spacing={4}>
            <Grid item xs={12} md={4}>
              <Box sx={{ textAlign: 'center', p: 2, border: '1px solid #e0e0e0', borderRadius: 2, minHeight: 120 }}>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  Signature du Professeur Principal
                </Typography>
                <Box sx={{ height: 60, borderBottom: '1px solid #ccc', mb: 1 }}></Box>
                <Typography variant="caption" color="text.secondary">
                  Cachet et signature
                </Typography>
              </Box>
            </Grid>
            <Grid item xs={12} md={4}>
              <Box sx={{ textAlign: 'center', p: 2, border: '1px solid #e0e0e0', borderRadius: 2, minHeight: 120 }}>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  Signature du Directeur
                </Typography>
                <Box sx={{ height: 60, borderBottom: '1px solid #ccc', mb: 1 }}></Box>
                <Typography variant="caption" color="text.secondary">
                  Cachet et signature
                </Typography>
              </Box>
            </Grid>
            <Grid item xs={12} md={4}>
              <Box sx={{ textAlign: 'center', p: 2, border: '1px solid #e0e0e0', borderRadius: 2, minHeight: 120 }}>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  Signature des Parents
                </Typography>
                <Box sx={{ height: 60, borderBottom: '1px solid #ccc', mb: 1 }}></Box>
                <Typography variant="caption" color="text.secondary">
                  Vu et approuvé
                </Typography>
              </Box>
            </Grid>
          </Grid>
          
          {/* Informations de l'établissement */}
          <Box sx={{ mt: 3, textAlign: 'center', p: 2, bgcolor: '#f5f5f5', borderRadius: 2 }}>
            <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 500 }}>
              École Mon Établissement • BP 123 • Téléphone: +123 456 789 • Email: contact@monetablissement.com
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Bulletin généré le {new Date().toLocaleDateString('fr-FR')} à {new Date().toLocaleTimeString('fr-FR')}
            </Typography>
          </Box>
        </Box>
      </Paper>
    </Box>
  );
};

export default MyReportCard; 

