import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Button,
  Grid,
  Card,
  CardContent,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Alert,
  CircularProgress,
  Divider,
  IconButton,
  Tooltip
} from '@mui/material';
import {
  Assessment as AssessmentIcon,
  School as SchoolIcon,
  Class as ClassIcon,
  GetApp as DownloadIcon,
  Print as PrintIcon,
  Refresh as RefreshIcon,
  FileDownload as FileDownloadIcon,
  Description as DescriptionIcon
} from '@mui/icons-material';
import axios from 'axios';
import SecretarySidebar from '../../components/SecretarySidebar';
import * as XLSX from 'xlsx';

interface Class {
  id: number;
  name: string;
  level: string;
}

interface Composition {
  id: number;
  name: string;
  date: string;
  description?: string;
}

interface StudentResult {
  id: number;
  first_name: string;
  last_name: string;
  matricule: string;
  gender: string;
  birth_date: string;
  class_name: string;
  subjects: { [subject: string]: SubjectResult };
  total_score: number;
  average: number;
  average_out_of_10: number;
  rank: number;
  max_score: number;
  percentage: number;
  grade: string;
}

interface SubjectResult {
  score: number;
  max_score: number;
  percentage: number;
  grade: string;
}

interface ReportData {
  composition: Composition;
  subjects: string[];
  results: StudentResult[];
  classes?: string[]; // Liste de toutes les classes (pour les rapports école)
  statistics: {
    total_students: number;
    students_with_scores: number;
    average_score: number;
    highest_score: number;
    lowest_score: number;
    pass_rate: number;
    grade_distribution: { [key: string]: number };
    subjects_count: number;
  };
}

const ReportsPage: React.FC = () => {
  const [classes, setClasses] = useState<Class[]>([]);
  const [compositions, setCompositions] = useState<Composition[]>([]);
  const [selectedScope, setSelectedScope] = useState<'class' | 'school'>('class');
  const [selectedClassId, setSelectedClassId] = useState<number | ''>('');
  const [selectedCompositionId, setSelectedCompositionId] = useState<number | ''>('');
  const [reportData, setReportData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    fetchClasses();
  }, []);

  useEffect(() => {
    if (selectedScope === 'class' && selectedClassId) {
      fetchCompositions(selectedClassId as number);
    } else if (selectedScope === 'school') {
      fetchAllCompositions();
    }
  }, [selectedScope, selectedClassId]);

  const fetchClasses = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get('https://saintefamilleexcellence.ci/api/classes', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setClasses(response.data);
    } catch (error) {
      console.error('Erreur lors du chargement des classes:', error);
      setError('Erreur lors du chargement des classes');
    }
  };

  const fetchCompositions = async (classId: number) => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`https://saintefamilleexcellence.ci/api/reports/compositions/${classId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setCompositions(response.data);
    } catch (error) {
      console.error('Erreur lors du chargement des compositions:', error);
      setError('Erreur lors du chargement des compositions');
    }
  };

  const fetchAllCompositions = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get('https://saintefamilleexcellence.ci/api/reports/compositions', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setCompositions(response.data);
    } catch (error) {
      console.error('Erreur lors du chargement des compositions:', error);
      setError('Erreur lors du chargement des compositions');
    }
  };

  const generateReport = async () => {
    if (!selectedCompositionId) {
      setError('Veuillez sélectionner une composition');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const token = localStorage.getItem('token');
      const url = selectedScope === 'class' 
        ? `https://saintefamilleexcellence.ci/api/reports/composition/${selectedCompositionId}/class/${selectedClassId}`
        : `https://saintefamilleexcellence.ci/api/reports/composition/${selectedCompositionId}/school`;

      const response = await axios.get(url, {
        headers: { Authorization: `Bearer ${token}` }
      });

      setReportData(response.data);
    } catch (error) {
      console.error('Erreur lors de la génération du rapport:', error);
      setError('Erreur lors de la génération du rapport');
    } finally {
      setLoading(false);
    }
  };

  const handleScopeChange = (scope: 'class' | 'school') => {
    setSelectedScope(scope);
    setSelectedClassId('');
    setSelectedCompositionId('');
    setCompositions([]);
    setReportData(null);
  };

  const getGradeColor = (grade: string) => {
    switch (grade) {
      case 'A': return 'success';
      case 'B': return 'info';
      case 'C': return 'warning';
      case 'D': return 'error';
      default: return 'default';
    }
  };

  const exportToPDF = () => {
    window.print();
  };

  const exportToExcel = () => {
    if (!reportData) return;

    // Grouper les résultats par classe si on est en mode école
    let groupedResults: { className: string; students: typeof reportData.results }[] = [];
    
    if (selectedScope === 'school') {
      // Utiliser la liste complète des classes depuis le backend
      const allClassNames = reportData.classes || [];
      
      // Créer un Map des résultats par classe
      const classGroups = new Map<string, typeof reportData.results>();
      allClassNames.forEach(className => {
        classGroups.set(className, []);
      });
      
      // Assigner les élèves à leurs classes respectives
      reportData.results.forEach(student => {
        const className = student.class_name || 'Sans classe';
        if (!classGroups.has(className)) {
          classGroups.set(className, []);
        }
        classGroups.get(className)!.push(student);
      });
      
      // Trier les classes et les élèves
      groupedResults = Array.from(classGroups.entries())
        .sort((a, b) => a[0].localeCompare(b[0]))
        .map(([className, students]) => ({
          className,
          students: students.sort((a, b) => (a.rank || 0) - (b.rank || 0))
        }));
    } else {
      groupedResults = [{ className: reportData.results[0]?.class_name || '', students: reportData.results }];
    }

    // Créer un nouveau workbook Excel
    const workbook = XLSX.utils.book_new();

    // Pour chaque groupe (classe)
    groupedResults.forEach((group) => {
      // Préparer les en-têtes
      const headers = [
        'N°',
        'NOM & PRENOMS DE L\'ÉLÈVE',
        'GENRE',
        'DATE DE NAISSANCE',
        ...reportData.subjects.map(subject => String(subject)),
        'TOTAL',
        'MOYENNE/10',
        'RANG'
      ];

      // Compter le nombre total de colonnes
      const totalColumns = headers.length;
      
      // Préparer les données de la feuille
      const sheetData: any[] = [];
      
      // Ajouter les lignes d'en-tête d'informations
      sheetData.push(['IEPP COCODY-DEUX PLATEAUX']);
      sheetData.push(['EPP /EPV : GROUPE SCOLAIRE SAINTE FAMILLE L\'EXECELLENCE', null, null, 'SECTEUR: AGBAN']);
      
      // Créer une ligne pour Code, WhatsApp, Email, et Classe
      const infoRow = new Array(totalColumns).fill(null);
      infoRow[0] = 'Code: 054533';
      const quarterIndex = Math.floor(totalColumns * 0.25);
      infoRow[quarterIndex] = 'whatsapp: 0 78198725';
      const threeQuarterIndex = Math.floor(totalColumns * 0.75);
      infoRow[threeQuarterIndex] = 'Email: epvbethaniemiracles@gmail.com';
      sheetData.push(infoRow);
      
      sheetData.push([null]); // Ligne vide
      
      // Ajouter les en-têtes du tableau
      sheetData.push(headers);
      
      group.students.forEach((student, index) => {
        const row = [
          index + 1,
          `${student.last_name} ${student.first_name}`,
          student.gender,
          student.birth_date,
          ...reportData.subjects.map(subject => {
            const subjectData = student.subjects[String(subject)];
            return subjectData?.score ? Number(subjectData.score).toFixed(1) : '-';
          }),
          Number(student.total_score || 0).toFixed(1),
          Number(student.average_out_of_10 || 0).toFixed(1),
          student.rank
        ];
        sheetData.push(row);
      });

      // Créer la feuille Excel
      const worksheet = XLSX.utils.aoa_to_sheet(sheetData);
      
      // Définir la largeur des colonnes
      const colWidths = [
        { wch: 5 },   // N°
        { wch: 35 },  // NOM & PRENOMS DE L'ÉLÈVE
        { wch: 8 },   // GENRE
        { wch: 15 },  // DATE DE NAISSANCE
        ...reportData.subjects.map(() => ({ wch: 15 })), // Matières
        { wch: 10 },  // TOTAL
        { wch: 12 },  // MOYENNE/10
        { wch: 8 }    // RANG
      ];
      worksheet['!cols'] = colWidths;

      // Nom de la feuille (max 31 caractères pour Excel)
      const sheetName = group.className || 'Classe';
      const validSheetName = sheetName.length > 31 ? sheetName.substring(0, 31) : sheetName;
      
      // Ajouter la feuille au workbook
      XLSX.utils.book_append_sheet(workbook, worksheet, validSheetName);
    });

    // Télécharger le fichier Excel
    const fileName = `rapport_${reportData.composition.name.replace(/\s+/g, '_')}_${selectedScope === 'class' ? reportData.results[0]?.class_name || 'classe' : 'ecole'}.xlsx`;
    XLSX.writeFile(workbook, fileName);
  };

  const exportToWord = () => {
    if (!reportData) return;

    // Grouper les résultats par classe si on est en mode école
    let groupedResults: { className: string; students: typeof reportData.results }[] = [];
    
    if (selectedScope === 'school') {
      // Utiliser la liste complète des classes depuis le backend
      const allClassNames = reportData.classes || [];
      
      // Créer un Map des résultats par classe
      const classGroups = new Map<string, typeof reportData.results>();
      allClassNames.forEach(className => {
        classGroups.set(className, []);
      });
      
      // Assigner les élèves à leurs classes respectives
      reportData.results.forEach(student => {
        const className = student.class_name || 'Sans classe';
        if (!classGroups.has(className)) {
          classGroups.set(className, []);
        }
        classGroups.get(className)!.push(student);
      });
      
      // Trier les classes et les élèves
      groupedResults = Array.from(classGroups.entries())
        .sort((a, b) => a[0].localeCompare(b[0]))
        .map(([className, students]) => ({
          className,
          students: students.sort((a, b) => (a.rank || 0) - (b.rank || 0))
        }));
    } else {
      groupedResults = [{ className: reportData.results[0]?.class_name || '', students: reportData.results }];
    }

    // Créer le contenu HTML pour Word avec groupement par classe
    let htmlContent = `
      <html>
        <head>
          <meta charset="utf-8">
          <title>Rapport de Composition</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            h1 { text-align: center; color: #1976d2; }
            h2 { color: #333; }
            table { width: 100%; border-collapse: collapse; margin: 20px 0; }
            th, td { border: 1px solid #333; padding: 8px; text-align: center; font-size: 12px; }
            th { background-color: #f5f5f5; font-weight: bold; }
            .student-name { text-align: left; }
            .class-header { background-color: #e0e0e0; font-weight: bold; }
          </style>
        </head>
        <body>
          <h1>RÉSULTATS DE LA COMPOSITION ${reportData.composition.name.toUpperCase()}</h1>
          <h2>${selectedScope === 'class' ? `Classe: ${reportData.results[0]?.class_name || 'N/A'}` : 'TOUTE L\'ÉCOLE'}</h2>
          
          <table>
            <thead>
              <tr>
                <th>N°</th>
                <th>NOM & PRENOMS DE L'ÉLÈVE</th>
                <th>GENRE</th>
                <th>DATE DE NAISSANCE</th>
                ${selectedScope === 'school' ? '<th>CLASSE</th>' : ''}
                ${reportData.subjects.map(subject => `<th>${subject}</th>`).join('')}
                <th>TOTAL</th>
                <th>MOYENNE/10</th>
                <th>RANG</th>
              </tr>
            </thead>
            <tbody>
    `;

    // Ajouter les données groupées par classe
    groupedResults.forEach((group, groupIndex) => {
      if (selectedScope === 'school') {
        const colspan = 4 + (selectedScope === 'school' ? 1 : 0) + reportData.subjects.length + 3;
        htmlContent += `
              <tr class="class-header">
                <td colspan="${colspan}">CLASSE: ${group.className}</td>
              </tr>
        `;
      }
      
      group.students.forEach((student, index) => {
        const displayIndex = selectedScope === 'school' ? index + 1 : index + 1;
        htmlContent += `
              <tr>
                <td>${displayIndex}</td>
                <td class="student-name">${student.last_name} ${student.first_name}</td>
                <td>${student.gender}</td>
                <td>${student.birth_date}</td>
                ${selectedScope === 'school' ? `<td>${student.class_name || ''}</td>` : ''}
                ${reportData.subjects.map(subject => {
                  const subjectData = student.subjects[String(subject)];
                  return `<td>${subjectData?.score ? Number(subjectData.score).toFixed(1) : '-'}</td>`;
                }).join('')}
                <td>${Number(student.total_score || 0).toFixed(1)}</td>
                <td>${Number(student.average_out_of_10 || 0).toFixed(1)}</td>
                <td>${student.rank}</td>
              </tr>
        `;
      });
    });

    htmlContent += `
            </tbody>
          </table>
          
          <div style="margin-top: 30px;">
            <h3>Statistiques:</h3>
            <p>Nombre total d'élèves: ${reportData.statistics.total_students}</p>
            <p>Moyenne générale: ${Number(reportData.statistics.average_score || 0).toFixed(2)}/20</p>
            <p>Taux de réussite: ${Number(reportData.statistics.pass_rate || 0).toFixed(1)}%</p>
          </div>
        </body>
      </html>
    `;

    // Télécharger le fichier Word
    const blob = new Blob([htmlContent], { type: 'application/msword' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `rapport_${reportData.composition.name}_${selectedScope === 'class' ? reportData.results[0]?.class_name || 'classe' : 'ecole'}.doc`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <Box sx={{ display: 'flex' }}>
      <SecretarySidebar />
      <Box sx={{ flexGrow: 1, p: 3 }}>
        <Paper elevation={3} sx={{ p: 3, mb: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
            <AssessmentIcon sx={{ fontSize: 40, color: 'primary.main', mr: 2 }} />
            <Typography variant="h4" component="h1" sx={{ fontWeight: 'bold' }}>
              Rapports de Compositions
            </Typography>
          </Box>

          <Grid container spacing={3} sx={{ mb: 3 }}>
            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Portée du Rapport
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 2 }}>
                    <Button
                      variant={selectedScope === 'class' ? 'contained' : 'outlined'}
                      startIcon={<ClassIcon />}
                      onClick={() => handleScopeChange('class')}
                    >
                      Une Classe
                    </Button>
                    <Button
                      variant={selectedScope === 'school' ? 'contained' : 'outlined'}
                      startIcon={<SchoolIcon />}
                      onClick={() => handleScopeChange('school')}
                    >
                      Toute l'École
                    </Button>
                  </Box>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Sélections
                  </Typography>
                  
                  {selectedScope === 'class' && (
                    <FormControl fullWidth sx={{ mb: 2 }}>
                      <InputLabel>Classe</InputLabel>
                      <Select
                        value={selectedClassId}
                        label="Classe"
                        onChange={(e) => setSelectedClassId(e.target.value as number)}
                      >
                        {classes.map((cls) => (
                          <MenuItem key={cls.id} value={cls.id}>
                            {cls.name} - {cls.level}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  )}

                  <FormControl fullWidth sx={{ mb: 2 }}>
                    <InputLabel>Composition</InputLabel>
                    <Select
                      value={selectedCompositionId}
                      label="Composition"
                      onChange={(e) => setSelectedCompositionId(e.target.value as number)}
                      disabled={selectedScope === 'class' && !selectedClassId}
                    >
                      {compositions.map((comp) => (
                        <MenuItem key={comp.id} value={comp.id}>
                          {comp.name} ({new Date(comp.date).toLocaleDateString()})
                          {comp.description && ` - ${comp.description}`}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>

                  <Button
                    variant="contained"
                    fullWidth
                    onClick={generateReport}
                    disabled={loading || !selectedCompositionId}
                    startIcon={loading ? <CircularProgress size={20} /> : <AssessmentIcon />}
                  >
                    {loading ? 'Génération...' : 'Générer le Rapport'}
                  </Button>
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          {error && (
            <Alert severity="error" sx={{ mb: 3 }}>
              {error}
            </Alert>
          )}

          {reportData && (
            <Paper elevation={2} sx={{ p: 3 }}>
              <Box sx={{ display: 'flex', justifyContent: 'between', alignItems: 'center', mb: 3 }}>
                <Typography variant="h5" component="h2">
                  Rapport - {reportData.composition.name}
                </Typography>
                <Box>
                  <Tooltip title="Actualiser">
                    <IconButton onClick={generateReport}>
                      <RefreshIcon />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Exporter vers Excel">
                    <IconButton onClick={exportToExcel} sx={{ color: 'green' }}>
                      <FileDownloadIcon />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Exporter vers Word">
                    <IconButton onClick={exportToWord} sx={{ color: 'blue' }}>
                      <DescriptionIcon />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Imprimer">
                    <IconButton onClick={exportToPDF}>
                      <PrintIcon />
                    </IconButton>
                  </Tooltip>
                </Box>
              </Box>

              <Grid container spacing={3} sx={{ mb: 3 }}>
                <Grid item xs={12} md={3}>
                  <Card>
                    <CardContent sx={{ textAlign: 'center' }}>
                      <Typography variant="h4" color="primary">
                        {reportData.statistics.total_students}
                      </Typography>
                      <Typography variant="body2">Élèves</Typography>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={12} md={3}>
                  <Card>
                    <CardContent sx={{ textAlign: 'center' }}>
                      <Typography variant="h4" color="success.main">
                        {Number(reportData.statistics.average_score || 0).toFixed(1)}
                      </Typography>
                      <Typography variant="body2">Moyenne</Typography>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={12} md={3}>
                  <Card>
                    <CardContent sx={{ textAlign: 'center' }}>
                      <Typography variant="h4" color="info.main">
                        {Number(reportData.statistics.pass_rate || 0).toFixed(1)}%
                      </Typography>
                      <Typography variant="body2">Taux de Réussite</Typography>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={12} md={3}>
                  <Card>
                    <CardContent sx={{ textAlign: 'center' }}>
                      <Typography variant="h4" color="warning.main">
                        {reportData.statistics.highest_score}
                      </Typography>
                      <Typography variant="body2">Meilleure Note</Typography>
                    </CardContent>
                  </Card>
                </Grid>
              </Grid>

              <Divider sx={{ my: 3 }} />

              <Typography variant="h6" gutterBottom>
                Résultats Détaillés
              </Typography>

              <TableContainer component={Paper} variant="outlined" sx={{ maxHeight: 600, overflow: 'auto' }}>
                <Table stickyHeader size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 'bold', backgroundColor: '#f5f5f5' }}>N°</TableCell>
                      <TableCell sx={{ fontWeight: 'bold', backgroundColor: '#f5f5f5', minWidth: 200 }}>
                        NOM & PRENOMS DE L'ÉLÈVE
                      </TableCell>
                      <TableCell align="center" sx={{ fontWeight: 'bold', backgroundColor: '#f5f5f5' }}>
                        GENRE
                      </TableCell>
                      <TableCell align="center" sx={{ fontWeight: 'bold', backgroundColor: '#f5f5f5' }}>
                        DATE DE NAISSANCE
                      </TableCell>
                      {selectedScope === 'school' && (
                        <TableCell align="center" sx={{ fontWeight: 'bold', backgroundColor: '#f5f5f5' }}>
                          CLASSE
                        </TableCell>
                      )}
                      {reportData.subjects.map((subject) => (
                        <TableCell 
                          key={subject} 
                          align="center" 
                          sx={{ fontWeight: 'bold', backgroundColor: '#f5f5f5', minWidth: 80 }}
                        >
                          {subject.toUpperCase()}
                        </TableCell>
                      ))}
                      <TableCell align="center" sx={{ fontWeight: 'bold', backgroundColor: '#f5f5f5' }}>
                        TOTAL
                      </TableCell>
                      <TableCell align="center" sx={{ fontWeight: 'bold', backgroundColor: '#f5f5f5' }}>
                        MOYENNE/10
                      </TableCell>
                      <TableCell align="center" sx={{ fontWeight: 'bold', backgroundColor: '#f5f5f5' }}>
                        RANG
                      </TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {reportData.results.map((result, index) => (
                      <TableRow key={result.id} hover>
                        <TableCell sx={{ fontWeight: 'bold' }}>
                          {index + 1}
                        </TableCell>
                        <TableCell sx={{ fontWeight: 'bold' }}>
                          {result.last_name} {result.first_name}
                        </TableCell>
                        <TableCell align="center">
                          {result.gender}
                        </TableCell>
                        <TableCell align="center">
                          {result.birth_date}
                        </TableCell>
                        {selectedScope === 'school' && (
                          <TableCell align="center">
                            {result.class_name}
                          </TableCell>
                        )}
                        {reportData.subjects.map((subject) => {
                          const subjectData = result.subjects[String(subject)];
                          return (
                            <TableCell key={subject} align="center">
                              {subjectData?.score ? (
                                <span style={{ 
                                  color: subjectData.score >= 10 ? 'green' : 'red',
                                  fontWeight: 'bold'
                                }}>
                                  {Number(subjectData.score).toFixed(1)}
                                </span>
                              ) : (
                                <span style={{ color: '#999' }}>-</span>
                              )}
                            </TableCell>
                          );
                        })}
                        <TableCell align="center" sx={{ fontWeight: 'bold', color: 'primary.main' }}>
                          {Number(result.total_score || 0).toFixed(1)}
                        </TableCell>
                        <TableCell align="center" sx={{ fontWeight: 'bold', fontSize: '1.1em' }}>
                          <span style={{ 
                            color: result.average_out_of_10 >= 5 ? 'green' : 'red'
                          }}>
                            {Number(result.average_out_of_10 || 0).toFixed(2)}
                          </span>
                        </TableCell>
                        <TableCell align="center">
                          <Chip
                            label={result.rank}
                            color={result.rank <= 3 ? 'success' : result.rank <= 10 ? 'info' : 'default'}
                            size="small"
                            sx={{ fontWeight: 'bold' }}
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Paper>
          )}
        </Paper>
      </Box>
    </Box>
  );
};

export default ReportsPage;

