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

interface OfficialScheduleEntry {
  id: number;
  day_of_week: string;
  start_time: string;
  end_time: string;
  subject_name?: string;
  teacher_name?: string;
  class_name?: string;
}

interface OfficialScheduleTableProps {
  schedule: OfficialScheduleEntry[];
  title?: string;
}

const OfficialScheduleTable: React.FC<OfficialScheduleTableProps> = ({ schedule, title = "Emploi du Temps Officiel" }) => {
  const theme = useTheme();

  // Définir les heures de cours
  const hours = [
    '08:00 - 09:00',
    '09:00 - 10:00',
    '10:00 - 11:00',
    '11:00 - 12:00',
    '12:00 - 13:00',
    '13:00 - 14:00',
    '14:00 - 15:00',
    '15:00 - 16:00',
    '16:00 - 17:00',
    '17:00 - 18:00',
  ];

  // Définir les jours de la semaine
  const days = [
    { key: 'Monday', label: 'LUNDI', color: '#e3f2fd' },
    { key: 'Tuesday', label: 'MARDI', color: '#f3e5f5' },
    { key: 'Wednesday', label: 'MERCREDI', color: '#e8f5e8' },
    { key: 'Thursday', label: 'JEUDI', color: '#fff3e0' },
    { key: 'Friday', label: 'VENDREDI', color: '#fce4ec' },
  ];

  // Fonction pour organiser les données par heure et jour
  const organizeScheduleData = () => {
    const organized: { [hour: string]: { [day: string]: OfficialScheduleEntry[] } } = {};
    
    // Initialiser la structure
    hours.forEach(hour => {
      organized[hour] = {};
      days.forEach(day => {
        organized[hour][day.key] = [];
      });
    });

    // Organiser les données
    schedule.forEach(entry => {
      const startTime = entry.start_time?.slice(0, 5) || '08:00';
      const endTime = entry.end_time?.slice(0, 5) || '09:00';
      const hourKey = `${startTime} - ${endTime}`;
      
      if (organized[hourKey] && organized[hourKey][entry.day_of_week]) {
        organized[hourKey][entry.day_of_week].push(entry);
      }
    });

    return organized;
  };

  const organizedData = organizeScheduleData();

  return (
    <Paper sx={{ p: 2, borderRadius: 2, boxShadow: 2 }}>
      <Typography variant="h6" sx={{ mb: 2, fontWeight: 600, textAlign: 'center' }}>
        {title}
      </Typography>
      
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
                  HEURES
                </Typography>
                <Typography variant="body2" fontWeight="bold">
                  JOURS
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
            {hours.map((hour) => (
              <TableRow key={hour}>
                <TableCell 
                  sx={{ 
                    backgroundColor: '#f5f5f5', 
                    fontWeight: 600,
                    border: '1px solid #ddd',
                    verticalAlign: 'top'
                  }}
                >
                  <Typography variant="body2" fontWeight="bold">
                    {hour}
                  </Typography>
                </TableCell>
                {days.map((day) => {
                  const entries = organizedData[hour]?.[day.key] || [];
                  return (
                    <TableCell 
                      key={`${hour}-${day.key}`}
                      sx={{ 
                        border: '1px solid #ddd',
                        verticalAlign: 'top',
                        minHeight: 60
                      }}
                    >
                      {entries.length > 0 ? (
                        entries.map((entry, index) => (
                          <Box key={index} sx={{ mb: 1 }}>
                            <Typography 
                              variant="body2" 
                              sx={{ 
                                fontSize: '0.75rem',
                                lineHeight: 1.2,
                                fontWeight: 600
                              }}
                            >
                              {entry.subject_name || 'Cours'}
                            </Typography>
                            {entry.teacher_name && (
                              <Typography 
                                variant="body2" 
                                sx={{ 
                                  fontSize: '0.65rem',
                                  color: 'text.secondary',
                                  lineHeight: 1.1
                                }}
                              >
                                {entry.teacher_name}
                              </Typography>
                            )}
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

export default OfficialScheduleTable; 
