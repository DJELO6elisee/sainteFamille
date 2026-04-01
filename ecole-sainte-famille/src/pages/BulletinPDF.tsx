import React, { forwardRef } from 'react';
import { Box, Typography, Table, TableHead, TableRow, TableCell, TableBody, Divider, Grid, Paper, useTheme, useMediaQuery, Button } from '@mui/material';

interface BulletinPDFProps {
  student: any;
  bulletin: any[];
  trimester: string;
  rangClasse: string | number | null;
  appreciation: string;
  moyenneClasse: number | null;
  showDownloadButton?: boolean;
  onDownload?: () => void;
}

const BulletinPDF = forwardRef<HTMLDivElement, BulletinPDFProps>(
  (props, ref) => {
    const { student, bulletin, trimester, rangClasse, appreciation, moyenneClasse, showDownloadButton = true, onDownload } = props;
  // Calculs totaux
  const totalCoef = bulletin.reduce((acc: number, m: any) => acc + (m.coefficient || 1), 0);
  const totalMoyCoef = bulletin.reduce((acc: number, m: any) => acc + ((m.moyenne || 0) * (m.coefficient || 1)), 0);

  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  return (
    <Box ref={ref} sx={{ p: { xs: 1, sm: 4 }, fontSize: { xs: 13, sm: 16 }, width: '100%' }}>
      {/* Header */}
      <Box sx={{ textAlign: 'center', mb: 2 }}>
        <img src="/logo192.png" alt="logo" style={{ width: 60, marginBottom: 8 }} />
        <Typography variant="h4" fontWeight={700} color="primary">ÉCOLE MON ÉTABLISSEMENT</Typography>
        <Typography color="text.secondary">Excellence • Discipline • Réussite</Typography>
        <Typography fontSize={14}>BP 123 - Téléphone : +123 456 789 - Email : contact@monetablissement.com</Typography>
      </Box>
      <Divider sx={{ my: 2 }} />
      <Typography variant="h5" align="center" fontWeight={700} mb={2} fontSize={{ xs: 18, sm: 24 }}>
        {(() => {
          if (trimester === '1er trimestre') return 'BULLETIN PREMIER TRIMESTRE';
          if (trimester === '2e trimestre') return 'BULLETIN DEUXIÈME TRIMESTRE';
          if (trimester === '3e trimestre') return 'BULLETIN TROISIÈME TRIMESTRE';
          return 'BULLETIN PARTICULIER';
        })()}
      </Typography>
      {/* Infos élève */}
      <Grid container spacing={1} sx={{ mb: 2 }}>
        <Grid item xs={6}>
          <Typography><b>Nom :</b> {student.last_name} {student.first_name}</Typography>
          <Typography><b>Civilité :</b> {student.gender || '-'}</Typography>
          <Typography><b>Matricule :</b> {student.registration_number || '-'}</Typography>
          <Typography><b>Classe :</b> {student.classe_name || '-'}</Typography>
          <Typography><b>Date de naissance :</b> {student.date_of_birth ? new Date(student.date_of_birth).toLocaleDateString('fr-FR') : '-'}</Typography>
        </Grid>
        <Grid item xs={6}>
          <Typography><b>Sexe :</b> {student.gender || '-'}</Typography>
          <Typography><b>Nationalité :</b> -</Typography>
        </Grid>
      </Grid>
      {/* Tableau des notes */}
      <Box sx={{ overflowX: 'auto', mb: 2 }}>
        <Table size="small" sx={{ minWidth: 400 }}>
          <TableHead>
            <TableRow sx={{ background: '#f3eaff' }}>
              <TableCell><b>Discipline</b></TableCell>
              <TableCell align="center"><b>Moy/20</b></TableCell>
              <TableCell align="center"><b>Coef.</b></TableCell>
              <TableCell align="center"><b>Moy x Coef</b></TableCell>
              <TableCell align="center"><b>Rang</b></TableCell>
              <TableCell align="center"><b>Appréciation</b></TableCell>
              <TableCell><b>Professeur</b></TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {bulletin.map((m: any, idx: number) => (
              <TableRow key={idx}>
                <TableCell>{m.subject_name}</TableCell>
                <TableCell align="center">{Number(m.moyenne).toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</TableCell>
                <TableCell align="center">{m.coefficient || 1}</TableCell>
                <TableCell align="center">{(Number(m.moyenne) * (m.coefficient || 1)).toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</TableCell>
                <TableCell align="center">{m.rang || '-'}</TableCell>
                <TableCell align="center">{m.appreciation || ''}</TableCell>
                <TableCell>{m.teacher_name || ''}</TableCell>
              </TableRow>
            ))}
            <TableRow sx={{ background: '#f3eaff' }}>
              <TableCell><b>TOTAUX</b></TableCell>
              <TableCell></TableCell>
              <TableCell align="center"><b>{totalCoef}</b></TableCell>
              <TableCell align="center"><b>{totalMoyCoef.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</b></TableCell>
              <TableCell></TableCell>
              <TableCell></TableCell>
              <TableCell></TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </Box>
      {/* Moyenne, appréciation, rang */}
      <Box sx={{ mb: 2 }}>
        <Typography><b>Moyenne trimestrielle :</b> {moyenneClasse !== null && moyenneClasse !== undefined ? Number(moyenneClasse).toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '-'} / 20</Typography>
        <Typography><b>Appréciation du conseil :</b> {appreciation || '-'}</Typography>
        <Typography><b>Rang dans la classe :</b> {rangClasse || '-'}</Typography>
      </Box>
      <Divider sx={{ my: 2 }} />
      <Typography align="center" sx={{ fontStyle: 'italic', mb: 2 }}>L'effort fait des forts</Typography>
      {/* Signatures */}
      <Box display="flex" flexDirection={{ xs: 'column', sm: 'row' }} gap={2} mb={2}>
        <Button fullWidth={isMobile} variant="outlined" sx={{ fontSize: { xs: 13, sm: 16 }, py: { xs: 1, sm: 2 } }}>Signature du Professeur Principal</Button>
        <Button fullWidth={isMobile} variant="outlined" sx={{ fontSize: { xs: 13, sm: 16 }, py: { xs: 1, sm: 2 } }}>Signature du Chef d'établissement</Button>
      </Box>
      {showDownloadButton && (
        <Button
          variant="contained"
          color="secondary"
          fullWidth={isMobile}
          sx={{
            fontSize: { xs: 15, sm: 18 },
            py: { xs: 1, sm: 2 },
            mt: 2,
          }}
            onClick={onDownload || (() => window.print())}
        >
            IMPRIMER
        </Button>
      )}
      <Divider sx={{ my: 2 }} />
      <Typography align="center" fontSize={12} color="text.secondary">
        École Mon Établissement • BP 123 • Téléphone : +123 456 789 • Email : contact@monetablissement.com<br />
        Bulletin généré le {new Date().toLocaleDateString('fr-FR')} à {new Date().toLocaleTimeString('fr-FR')}
      </Typography>
    </Box>
  );
  }
);

export default BulletinPDF; 
