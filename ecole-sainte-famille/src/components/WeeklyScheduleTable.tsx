import React from 'react';
import {
  Box,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
  useTheme
} from '@mui/material';

       interface WeeklyScheduleEntry {
         id: number;
         day_of_week: string;
         course_description: string;
         title?: string;
         start_time?: string;
         end_time?: string;
         subject_name?: string;
         time_of_day?: string;
         domain?: string;
       }

interface WeeklyScheduleTableProps {
  schedule: WeeklyScheduleEntry[];
  title?: string;
}

const WeeklyScheduleTable: React.FC<WeeklyScheduleTableProps> = ({ schedule, title = "Emploi du Temps Hebdomadaire" }) => {
  const theme = useTheme();

  // Définir les domaines d'activités (comme sur l'image)
  const domains = [
    { key: 'rituel', label: 'RITUEL', color: '#f5f5f5' },
    { key: 'langage_oral', label: 'LANGAGE ORAL', color: '#ff9800' },
    { key: 'langage_ecrit', label: 'LANGAGE ÉCRIT', color: '#2196f3' },
    { key: 'activite_motrice', label: 'ACTIVITÉ MOTRICE', color: '#4caf50' },
    { key: 'activite_artistique', label: 'ACTIVITÉ ARTISTIQUE', color: '#ffeb3b' },
    { key: 'eveil_mathematique', label: 'ÉVEIL MATHÉMATIQUE', color: '#f44336' },
    { key: 'explorer_monde', label: 'EXPLORER LE MONDE', color: '#9c27b0' }
  ];

  // Définir les jours de la semaine
  const days = [
    { key: 'Monday', label: 'LUNDI', color: '#e3f2fd' },
    { key: 'Tuesday', label: 'MARDI', color: '#f3e5f5' },
    { key: 'Wednesday', label: 'MERCREDI', color: '#e8f5e8' },
    { key: 'Thursday', label: 'JEUDI', color: '#fff3e0' },
    { key: 'Friday', label: 'VENDREDI', color: '#fce4ec' },
  ];

           // Fonction pour organiser les données par domaine et jour
         const organizeScheduleData = () => {
           const organized: { [domain: string]: { [day: string]: WeeklyScheduleEntry[] } } = {};

           // Initialiser la structure
           domains.forEach(domain => {
             organized[domain.key] = {};
             days.forEach(day => {
               organized[domain.key][day.key] = [];
             });
           });

           // Organiser les données
           schedule.forEach(entry => {
             // Utiliser le domaine stocké en base de données ou déterminer par description
             let domainKey = entry.domain || 'explorer_monde'; // domaine par défaut

             // Si pas de domaine en base, déterminer par description
             if (!entry.domain) {
               const description = entry.course_description?.toLowerCase() || '';
               const subject = entry.subject_name?.toLowerCase() || '';

               if (description.includes('rituel') || subject.includes('rituel')) {
                 domainKey = 'rituel';
               } else if (description.includes('oral') || description.includes('débat') || description.includes('livre') || subject.includes('oral')) {
                 domainKey = 'langage_oral';
               } else if (description.includes('écrit') || description.includes('lettre') || description.includes('trait') || description.includes('ligne') || subject.includes('écrit')) {
                 domainKey = 'langage_ecrit';
               } else if (description.includes('motrice') || description.includes('jeu') || description.includes('course') || description.includes('fil') || subject.includes('motrice')) {
                 domainKey = 'activite_motrice';
               } else if (description.includes('artistique') || description.includes('peinture') || description.includes('collage') || description.includes('cahier') || subject.includes('artistique')) {
                 domainKey = 'activite_artistique';
               } else if (description.includes('mathématique') || description.includes('nombre') || description.includes('couleur') || description.includes('dénombrement') || subject.includes('mathématique')) {
                 domainKey = 'eveil_mathematique';
               }
             }

             if (organized[domainKey] && organized[domainKey][entry.day_of_week]) {
               organized[domainKey][entry.day_of_week].push(entry);
             }
           });

           return organized;
         };

  const organizedData = organizeScheduleData();

  return (
    <Paper sx={{ p: 2, borderRadius: 2, boxShadow: 2 }}>
      {schedule.length > 0 && schedule[0].title ? (
        <Box sx={{ mb: 2, p: 2, bgcolor: 'primary.light', color: 'white', borderRadius: 1 }}>
          <Typography variant="h6" sx={{ fontWeight: 600, textAlign: 'center' }}>
            {schedule[0].title}
          </Typography>
          <Typography variant="body2" sx={{ textAlign: 'center', opacity: 0.9, mt: 0.5 }}>
            Titre de la semaine
          </Typography>
        </Box>
      ) : (
        <Typography variant="h6" sx={{ mb: 2, fontWeight: 600, textAlign: 'center' }}>
          {title}
        </Typography>
      )}

      <TableContainer>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell
                sx={{
                  backgroundColor: '#f5f5f5',
                  fontWeight: 600,
                  textAlign: 'center',
                  border: '1px solid #ddd'
                }}
              >
                <Typography variant="body2" fontWeight="bold">
                  JOURS
                </Typography>
                <Typography variant="body2" fontWeight="bold">
                  DOMAINE
                </Typography>
              </TableCell>
              {days.map((day) => (
                <TableCell
                  key={day.key}
                  sx={{
                    backgroundColor: day.color,
                    fontWeight: 600,
                    textAlign: 'center',
                    border: '1px solid #ddd',
                    minWidth: 120
                  }}
                >
                  <Typography variant="body2" fontWeight="bold" color="text.primary">
                    {day.label}
                  </Typography>
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {domains.map((domain) => (
              <TableRow key={domain.key}>
                <TableCell
                  sx={{
                    backgroundColor: domain.color,
                    fontWeight: 600,
                    border: '1px solid #ddd',
                    verticalAlign: 'top'
                  }}
                >
                  <Typography variant="body2" fontWeight="bold">
                    {domain.label}
                  </Typography>
                </TableCell>
                {days.map((day) => {
                  const entries = organizedData[domain.key]?.[day.key] || [];
                  return (
                    <TableCell
                      key={`${domain.key}-${day.key}`}
                      sx={{
                        border: '1px solid #ddd',
                        verticalAlign: 'top',
                        minHeight: 80
                      }}
                    >
                      {entries.length > 0 ? (
                        entries.map((entry, index) => (
                          <Box key={index} sx={{ mb: 1 }}>
                            <Typography
                              variant="body2"
                              sx={{
                                fontSize: '0.75rem',
                                lineHeight: 1.2
                              }}
                            >
                              {entry.course_description}
                            </Typography>
                          </Box>
                        ))
                      ) : (
                        <Typography
                          variant="body2"
                          color="text.secondary"
                          sx={{ fontSize: '0.75rem' }}
                        >
                          -
                        </Typography>
                      )}
                    </TableCell>
                  );
                })}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Paper>
  );
};

export default WeeklyScheduleTable; 
