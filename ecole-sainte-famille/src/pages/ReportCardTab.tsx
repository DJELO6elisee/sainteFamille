import React, { useEffect, useState, useRef } from 'react';
import axios from 'axios';
import { Box, Typography, Button, CircularProgress, Grid, Paper, Chip } from '@mui/material';
import SchoolIcon from '@mui/icons-material/School';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import BarChartIcon from '@mui/icons-material/BarChart';
import BulletinPDF from './BulletinPDF';
import { useReactToPrint } from 'react-to-print';

const trimesterCards = [
  {
    label: '1er Trimestre',
    value: '1er trimestre',
    color: '#1976d2',
    icon: <SchoolIcon sx={{ fontSize: 38, color: '#1976d2' }} />,
    bg: 'linear-gradient(135deg, #e3f0fc 0%, #fff 100%)',
    chip: <Chip label="En cours" color="warning" size="small" sx={{ fontWeight: 700, mb: 1 }} />,
  },
  {
    label: '2e Trimestre',
    value: '2e trimestre',
    color: '#43a047',
    icon: <TrendingUpIcon sx={{ fontSize: 38, color: '#43a047' }} />,
    bg: 'linear-gradient(135deg, #e8f5e9 0%, #fff 100%)',
    chip: null,
  },
  {
    label: '3e Trimestre',
    value: '3e trimestre',
    color: '#ff9800',
    icon: <BarChartIcon sx={{ fontSize: 38, color: '#ff9800' }} />,
    bg: 'linear-gradient(135deg, #fff3e0 0%, #fff 100%)',
    chip: null,
  },
];

const ReportCardTab = ({ childId, schoolYear }: { childId: string | undefined, schoolYear: string }) => {
  const [bulletins, setBulletins] = useState<{ [key: string]: any[] }>({});
  const [student, setStudent] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const [rangClasse, setRangClasse] = useState<string | number | null>(null);
  const [moyenneClasse, setMoyenneClasse] = useState<number | null>(null);
  const [appreciation, setAppreciation] = useState<string>('Passable');
  const pdfRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [publishedTrimesters, setPublishedTrimesters] = useState<{ [key: string]: boolean }>({});

  useEffect(() => {
    // Récupérer infos élève
    const fetchStudent = async () => {
      if (!childId) return;
      const token = localStorage.getItem('token');
      try {
        const { data } = await axios.get(`https://saintefamilleexcellence.ci/api/students/${childId}?school_year=${schoolYear}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setStudent(data);
        setError(null);
      } catch (e: any) {
        setStudent(null);
        setError("Aucune donnée pour cet élève sur l'année scolaire sélectionnée.");
      }
    };
    fetchStudent();
    // Précharger les bulletins pour chaque trimestre
    const fetchAllBulletins = async () => {
      if (!childId) return;
      setLoading(true);
      const token = localStorage.getItem('token');
      const { data } = await axios.get(`https://saintefamilleexcellence.ci/api/students/${childId}/grades?school_year=${schoolYear}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const byTrimester: { [key: string]: any[] } = {};
      trimesterCards.forEach(t => {
        byTrimester[t.value] = data.filter((g: any) => g.semester === t.value);
      });
      setBulletins(byTrimester);

      // Nouvelle logique : vérifier la publication via la route backend
      // On a besoin du class_id de l'élève pour l'année scolaire sélectionnée
      let classId = null;
      try {
        const studentRes = await axios.get(`https://saintefamilleexcellence.ci/api/students/${childId}?school_year=${schoolYear}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        classId = studentRes.data.class_id;
        console.log('studentRes.data', studentRes.data);
        console.log('classId utilisé pour publication bulletin:', classId);
      } catch {
        classId = null;
      }
      const published: { [key: string]: boolean } = {};
      if (classId) {
        for (const t of ['1er trimestre', '2e trimestre', '3e trimestre']) {
          try {
            const res = await axios.get(`https://saintefamilleexcellence.ci/api/report-cards/published?class_id=${classId}&trimester=${encodeURIComponent(t)}&school_year=${schoolYear}`, {
              headers: { Authorization: `Bearer ${token}` }
            });
            published[t] = !!res.data.published;
          } catch {
            published[t] = false;
          }
        }
      } else {
        // Si pas de classe, aucun bulletin publié
        published['1er trimestre'] = false;
        published['2e trimestre'] = false;
        published['3e trimestre'] = false;
      }
      setPublishedTrimesters(published);
      setLoading(false);
    };
    fetchAllBulletins();
  }, [childId, schoolYear]);

  const fetchClasseInfo = async (trimester: string) => {
    setLoading(true);
    const token = localStorage.getItem('token');
    try {
      const res = await axios.get(`https://saintefamilleexcellence.ci/api/students/${childId}/trimester-rank?semester=${encodeURIComponent(trimester)}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setRangClasse(res.data.rank + ' / ' + res.data.total);
      setMoyenneClasse(res.data.moyenne);
    } catch {
      setRangClasse(null);
      setMoyenneClasse(null);
    }
    setLoading(false);
  };

  const handlePrint = useReactToPrint({
    content: () => pdfRef.current,
    documentTitle: `Bulletin_${student?.last_name || ''}_${student?.first_name || ''}`,
  } as any);

  return (
    <Box>
      <Typography variant="h5" fontWeight={700} mb={3} color="primary.main">Bulletin</Typography>
      {error && (
        <Box sx={{ my: 3 }}>
          <Typography color="error" fontWeight={700} align="center">{error}</Typography>
        </Box>
      )}
      {!error && Object.values(bulletins).every(arr => arr.length === 0) && (
        <Box sx={{ my: 3 }}>
          <Typography color="error" fontWeight={700} align="center">
            Aucune information disponible pour votre enfant en cette année scolaire.
          </Typography>
        </Box>
      )}
      <Grid container spacing={3}>
        {trimesterCards.map((trim, idx) => {
          const isPublished = publishedTrimesters[trim.value];
          const notes = bulletins[trim.value] || [];
          const hasNotes = notes.length > 0;
          const isSelected = selected === trim.value;
          return (
            <Grid item xs={12} md={4} key={trim.value}>
              <Paper
                elevation={isSelected ? 8 : 3}
                sx={{
                  p: 3,
                  borderRadius: 4,
                  minHeight: 340,
                  background: isPublished ? trim.bg : '#f5f5f5',
                  boxShadow: isSelected ? '0 8px 32px #1976d233' : '0 2px 8px #0001',
                  border: isSelected ? `2.5px solid ${trim.color}` : 'none',
                  transition: 'all 0.2s',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'flex-start',
                  opacity: isPublished ? 1 : 0.6,
                  filter: isPublished ? 'none' : 'grayscale(0.7)',
                }}
              >
                {trim.icon}
                <Typography variant="h6" fontWeight={700} color={trim.color} mt={1} mb={0.5}>{trim.label}</Typography>
                {trim.chip}
                <Typography variant="body2" color="text.secondary" mb={2}>
                  Bulletin du {trim.label.toLowerCase()} de l'année scolaire
                </Typography>
                {isPublished ? (
                  loading && isSelected ? <CircularProgress /> : hasNotes ? (
                    <>
                      <Typography variant="h3" fontWeight={700} color={trim.color} mb={0.5}>
                        {notes.length > 0 ? Number(notes.reduce((acc: number, g: any) => acc + (g.moyenne || 0), 0) / notes.length).toFixed(2) : '-'}
                      </Typography>
                      <Typography variant="body2" color="text.secondary" mb={1}>
                        Moyenne générale
                      </Typography>
                      <Box width="100%" mb={1}>
                        <Box
                          sx={{
                            width: '100%',
                            height: 10,
                            borderRadius: 5,
                            background: '#e3e3e3',
                            mb: 0.5,
                          }}
                        >
                          <Box
                            sx={{
                              width: `${Math.min(100, Math.max(0, (notes.reduce((acc: number, g: any) => acc + (g.moyenne || 0), 0) / notes.length) * 5))}%`,
                              height: '100%',
                              borderRadius: 5,
                              background: trim.color,
                            }}
                          />
                        </Box>
                        <Typography align="center" fontWeight={600} color={trim.color}>
                          {notes.length} matière{notes.length > 1 ? 's' : ''}
                        </Typography>
                      </Box>
                      <Button
                        variant="contained"
                        color="primary"
                        sx={{ mt: 2, fontWeight: 700, fontSize: 16, borderRadius: 2, boxShadow: 2, px: 3 }}
                        onClick={async () => {
                          setSelected(trim.value);
                          await fetchClasseInfo(trim.value);
                        }}
                      >
                        Consulter le bulletin
                      </Button>
                    </>
                  ) : (
                    <>
                      <Paper variant="outlined" sx={{ p: 2, mb: 2, width: '100%', textAlign: 'center', color: '#888', background: '#fff8', borderRadius: 2, borderStyle: 'dashed' }}>
                        Aucune note publiée pour ce trimestre
                      </Paper>
                      <Button variant="contained" color="primary" sx={{ fontWeight: 700, fontSize: 16, borderRadius: 2, color: '#fff', background: trim.color, opacity: 0.7 }} disabled>
                        Consulter le bulletin
                      </Button>
                    </>
                  )
                ) : (
                  <>
                    <Paper variant="outlined" sx={{ p: 2, mb: 2, width: '100%', textAlign: 'center', color: '#aaa', background: '#fff8', borderRadius: 2, borderStyle: 'dashed' }}>
                      Bulletin non publié pour ce trimestre
                    </Paper>
                    <Button variant="outlined" disabled sx={{ fontWeight: 700, fontSize: 16, borderRadius: 2, color: '#aaa', borderColor: '#eee' }}>
                      Non disponible
                    </Button>
                  </>
                )}
              </Paper>
            </Grid>
          );
        })}
      </Grid>
      {selected && bulletins[selected] && bulletins[selected].length > 0 && student && (
        <Box mt={4}>
          <div style={{ display: 'none' }}>
            <BulletinPDF
              ref={pdfRef}
              student={student}
              bulletin={bulletins[selected]}
              trimester={selected as string}
              rangClasse={rangClasse}
              appreciation={appreciation}
              moyenneClasse={moyenneClasse}
              showDownloadButton={false}
            />
          </div>
          <BulletinPDF
            student={student}
            bulletin={bulletins[selected]}
            trimester={selected as string}
            rangClasse={rangClasse}
            appreciation={appreciation}
            moyenneClasse={moyenneClasse}
            showDownloadButton={true}
            onDownload={handlePrint}
          />
        </Box>
      )}
    </Box>
  );
};

export default ReportCardTab; 

