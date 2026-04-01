import React, { useState } from 'react';
import {
  Box,
  Button,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';

interface Grade {
  id: number;
  studentName: string;
  subject: string;
  grade: number;
  date: string;
  comments: string;
}

const Grades = () => {
  const [grades, setGrades] = useState<Grade[]>([
    { id: 1, studentName: 'Jean Dupont', subject: 'Mathématiques', grade: 15, date: '2024-03-15', comments: 'Bon travail' },
    { id: 2, studentName: 'Marie Martin', subject: 'Français', grade: 18, date: '2024-03-15', comments: 'Excellent' },
    { id: 3, studentName: 'Pierre Durand', subject: 'Histoire', grade: 12, date: '2024-03-15', comments: 'Peut mieux faire' },
  ]);

  const [open, setOpen] = useState(false);
  const [newGrade, setNewGrade] = useState<Omit<Grade, 'id'>>({
    studentName: '',
    subject: '',
    grade: 0,
    date: new Date().toISOString().split('T')[0],
    comments: '',
  });

  const handleClickOpen = () => {
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
  };

  const handleAddGrade = () => {
    const grade: Grade = {
      id: grades.length + 1,
      ...newGrade,
    };
    setGrades([...grades, grade]);
    setOpen(false);
    setNewGrade({
      studentName: '',
      subject: '',
      grade: 0,
      date: new Date().toISOString().split('T')[0],
      comments: '',
    });
  };

  return (
    <Box sx={{ flexGrow: 1 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
        <Typography variant="h4">Gestion des Notes</Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={handleClickOpen}
        >
          Ajouter une note
        </Button>
      </Box>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>ID</TableCell>
              <TableCell>Élève</TableCell>
              <TableCell>Matière</TableCell>
              <TableCell>Note</TableCell>
              <TableCell>Date</TableCell>
              <TableCell>Commentaires</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {grades.map((grade) => (
              <TableRow key={grade.id}>
                <TableCell>{grade.id}</TableCell>
                <TableCell>{grade.studentName}</TableCell>
                <TableCell>{grade.subject}</TableCell>
                <TableCell>{grade.grade}/20</TableCell>
                <TableCell>{grade.date}</TableCell>
                <TableCell>{grade.comments}</TableCell>
                <TableCell>
                  <Button color="primary" size="small">
                    Modifier
                  </Button>
                  <Button color="error" size="small">
                    Supprimer
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog open={open} onClose={handleClose}>
        <DialogTitle>Ajouter une nouvelle note</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Nom de l'élève"
            fullWidth
            value={newGrade.studentName}
            onChange={(e) => setNewGrade({ ...newGrade, studentName: e.target.value })}
          />
          <FormControl fullWidth margin="dense">
            <InputLabel>Matière</InputLabel>
            <Select
              value={newGrade.subject}
              label="Matière"
              onChange={(e) => setNewGrade({ ...newGrade, subject: e.target.value })}
            >
              <MenuItem value="Mathématiques">Mathématiques</MenuItem>
              <MenuItem value="Français">Français</MenuItem>
              <MenuItem value="Histoire">Histoire</MenuItem>
              <MenuItem value="Géographie">Géographie</MenuItem>
              <MenuItem value="Anglais">Anglais</MenuItem>
            </Select>
          </FormControl>
          <TextField
            margin="dense"
            label="Note"
            type="number"
            fullWidth
            inputProps={{ min: 0, max: 20 }}
            value={newGrade.grade}
            onChange={(e) => setNewGrade({ ...newGrade, grade: parseInt(e.target.value) })}
          />
          <TextField
            margin="dense"
            label="Date"
            type="date"
            fullWidth
            value={newGrade.date}
            onChange={(e) => setNewGrade({ ...newGrade, date: e.target.value })}
            InputLabelProps={{ shrink: true }}
          />
          <TextField
            margin="dense"
            label="Commentaires"
            fullWidth
            multiline
            rows={2}
            value={newGrade.comments}
            onChange={(e) => setNewGrade({ ...newGrade, comments: e.target.value })}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose}>Annuler</Button>
          <Button onClick={handleAddGrade} variant="contained">
            Ajouter
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Grades; 
