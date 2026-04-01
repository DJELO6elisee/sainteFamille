import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  InputAdornment,
  Button,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Grid,
  Alert,
  Snackbar,
  CircularProgress,
  Chip,
  Breadcrumbs,
  Link,
  Container
} from '@mui/material';
import {
  Save as SaveIcon,
  Assignment as AssignmentIcon,
  School as SchoolIcon,
  Person as PersonIcon,
  ArrowBack as ArrowBackIcon,
  NavigateNext as NavigateNextIcon,
  Publish as PublishIcon,
  Refresh as RefreshIcon
} from '@mui/icons-material';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import axios from 'axios';
import { gradeEventManager } from '../../utils/gradeUpdateEvents';

interface Class {
  id: number;
  name: string;
}

interface Student {
  id: number;
  first_name: string;
  last_name: string;
}

interface Subject {
  // IMPORTANT: `id` is the unique bulletin_subject_id and is used everywhere (state/API)
  id: number;
  name: string;
  type: string;
  level_groups?: string;
  // Keep legacy mapping for debugging/compat but NEVER use it as a key
  legacySubjectId?: number; // historical `subjects.id` (may collide across bulletin subjects)
  bulletinSubjectId?: number; // duplicate of id for clarity
}

interface Grade {
  student_id: number;
  subject_id: number;
  grade: number;
  composition_id: number;
  coefficient?: number;
}

interface Composition {
  id: number;
  name: string;
  description: string;
  composition_date: string;
  status: string;
  is_active: boolean;
  days_until_composition?: number;
  grade_entry_start_date?: string;
  grade_entry_end_date?: string;
  days_remaining_for_grades?: number;
  can_enter_grades?: number;
}

const GradeManagement: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { classId } = useParams<{ classId: string }>();
  
  // Détecter si c'est un accès admin depuis la gestion des bulletins
  // Fallback : détecter automatiquement si l'utilisateur est admin
  const userToken = localStorage.getItem('token');
  let userRole = 'teacher'; // Par défaut
  if (userToken) {
    try {
      const payload = JSON.parse(atob(userToken.split('.')[1]));
      userRole = payload.role || 'teacher';
    } catch (e) {
      console.warn('Impossible de décoder le token pour déterminer le rôle');
    }
  }
  
  const isAdminAccess = location.state?.isAdminAccess || (userRole === 'admin' || userRole === 'secretary' || userRole === 'directrice' || userRole === 'informaticien');
  // Les admins peuvent TOUJOURS modifier les notes, même publiées
  const adminCanModifyNotes = isAdminAccess ? true : (location.state?.canModifyNotes !== false);
  const adminClassName = location.state?.className || '';
  const adminLevelName = location.state?.levelName || '';
  const adminPublications = location.state?.publications || [];
  const preSelectedStudentId = location.state?.preSelectedStudentId || null;
  const preSelectedStudentName = location.state?.preSelectedStudentName || '';

  // Debug logs pour vérifier les paramètres reçus
  console.log('🔍 [GRADE MANAGEMENT] Paramètres reçus:', {
    userRole,
    isAdminAccess,
    adminCanModifyNotes,
    adminClassName,
    preSelectedStudentId,
    preSelectedStudentName,
    locationState: location.state
  });
  
  const [classInfo, setClassInfo] = useState<Class | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [selectedSubject, setSelectedSubject] = useState<number | null>(null);
  // Nouveau mode: sélection par élève puis saisie de toutes ses matières
  const [selectedStudent, setSelectedStudent] = useState<number | null>(null);
  const [selectedComposition, setSelectedComposition] = useState<number | null>(null);
  // notes par matière (clé = bulletinSubjectId) pour l'élève sélectionné
  const [subjectGrades, setSubjectGrades] = useState<{ [bulletinSubjectId: number]: number }>({});
  const [existingSubjectGrades, setExistingSubjectGrades] = useState<{ [bulletinSubjectId: number]: { grade: number, is_published: boolean } }>({});
  const [compositions, setCompositions] = useState<Composition[]>([]);
  const [grades, setGrades] = useState<{ [key: number]: number }>({});
  const [existingGrades, setExistingGrades] = useState<{ [key: number]: { grade: number, is_published: boolean } }>({});
  const [recentlyUpdated, setRecentlyUpdated] = useState<Set<number>>(new Set());
  // Notes par matière pour TOUTE la classe (vue par élève): gradesBySubject[subjectId][studentId] = raw grade on subject scale
  const [gradesBySubject, setGradesBySubject] = useState<{ [subjectId: number]: { [studentId: number]: number } }>({});
  // Moyennes et rangs calculés pour tous les élèves de la classe (clé = studentId)
  const [studentAverages, setStudentAverages] = useState<{ [studentId: number]: { averageLabel: string; average20: number } }>({});
  const [studentRanks, setStudentRanks] = useState<{ [studentId: number]: number }>({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success' as 'success' | 'error' | 'info' | 'warning'
  });

  // ===================== Helpers: barèmes et calculs (alignés avec StudentBulletin) =====================
  const getClassLabel = (): string => {
    return (classInfo?.name || '').toUpperCase();
  };

  const isCELevel = (classeName: string): boolean => {
    const label = (classeName || '').toUpperCase();
    return label.startsWith('CE');
  };

  const getSubjectMaxScore = (subjectName: string): number => {
    const cls = getClassLabel();
    if (cls.startsWith('CP')) {
      return 10; // CP: toutes les matières sur 10
    }
    const isCE1 = cls.startsWith('CE1');
    const isCE2 = cls.startsWith('CE2');
    const isCM1CM2 = cls.startsWith('CM1') || cls.startsWith('CM2');
    const name = (subjectName || '').toUpperCase();
    
    // CE1: barèmes spécifiques
    if (isCE1) {
      if (name.includes('EXPLOITATION DE TEXTE')) return 30;
      if (name.includes('A.E.M')) return 30;
      if (name.includes('ORTHOGRAPHE') || name.includes('DICTEE') || name.includes('DICTÉE')) return 20;
      if (name.includes('MATHEMATIQUE') || name.includes('MATHÉMATIQUE')) return 30;
      if (name.includes('LECTURE')) return 10;
      if (name.includes('ANGLAIS')) return 10;
      if (name.includes('CONDUITE')) return 10;
    }
    
    // CE2 utilise les mêmes barèmes que CM1
    if (isCE2 || isCM1CM2) {
      if (name.includes('EXPLOITATION DE TEXTE')) return 50;
      if (name.includes('A.E.M')) return 50;
      if (name.includes('ORTHOGRAPHE') || name.includes('DICTEE') || name.includes('DICTÉE')) return 20;
      if (name.includes('MATHEMATIQUE') || name.includes('MATHÉMATIQUE')) return 50;
      if (name.includes('EPS') || name.includes('E.P.S')) return 20;
      if (name.includes('LECTURE')) return 10;
      if (name.includes('ANGLAIS')) return 10;
      if (name.includes('CONDUITE')) return 10;
    }
    
    // Autres classes CE (si elles existent sans numéro spécifique)
    if (isCELevel(cls)) {
      if (name.includes('EXPLOITATION DE TEXTE')) return 30;
      if (name.includes('A.E.M')) return 30;
      if (name.includes('ORTHOGRAPHE') || name.includes('DICTEE') || name.includes('DICTÉE')) return 20;
      if (name.includes('MATHEMATIQUE') || name.includes('MATHÉMATIQUE')) return 30;
      if (name.includes('EPS') || name.includes('E.P.S')) return 20;
      return 10;
    }
    
    return 20; // barème par défaut
  };

  const computeStudentTotals = (): { total: number; totalMax: number; average: string } => {
    const cls = getClassLabel();
    if (!selectedStudent || subjects.length === 0) {
      return { total: 0, totalMax: 0, average: '' };
    }

    // Construire la map des notes courantes (/20), priorisant les modifications locales
    const currentGrades: { [sid: number]: number } = {};
    subjects.forEach(subj => {
      const edited = subjectGrades[subj.id];
      const existing = existingSubjectGrades[subj.id]?.grade;
      // Normalize to /20 for computation (existing is now RAW on subject scale)
      if (typeof edited === 'number') {
        currentGrades[subj.id] = convertDisplayToBackend(edited, subj.name);
      } else if (typeof existing === 'number') {
        currentGrades[subj.id] = convertDisplayToBackend(existing, subj.name);
      }
    });

    // Conversion standard: points = (note / 20) * barème
    const toPoints = (subjectId: number, subjectName: string): number => {
      const note20 = currentGrades[subjectId];
      if (typeof note20 !== 'number') return 0;
      const max = getSubjectMaxScore(subjectName);
      return (note20 / 20) * max;
    };

    // CP: total sur 6 matières spécifiques, moyenne sur 10
    if (cls.startsWith('CP')) {
      const targeted = [
        'GRAPHISME/ECRITURE', 'GRAPHISME/ÉCRITURE', 'DISCRIMINATION VISUELLE',
        'EDHC', 'MATHEMATIQUE', 'MATHÉMATIQUE', 'CHANT/POESIE', 'CHANT/POÉSIE', 'DESSIN'
      ];
      const selectedSubjects = subjects.filter(s => targeted.some(k => (s.name || '').toUpperCase().includes(k)));
      const total = selectedSubjects.reduce((sum, s) => sum + toPoints(s.id, s.name), 0);
      const average = (total / 6).toFixed(2) + '/10';
      return { total: Number(total.toFixed(2)), totalMax: 60, average };
    }

    // CE1: total sur 4 matières principales, moyenne sur 10
    if (cls.startsWith('CE1')) {
      const targeted = ['EXPLOITATION DE TEXTE','A.E.M','ORTHOGRAPHE','DICTEE','DICTÉE','MATHEMATIQUE','MATHÉMATIQUE'];
      const selectedSubjects = subjects.filter(s => targeted.some(k => (s.name || '').toUpperCase().includes(k)));
      const total = selectedSubjects.reduce((sum, s) => sum + toPoints(s.id, s.name), 0);
      const average = (total / 11).toFixed(2) + '/10';
      return { total: Number(total.toFixed(2)), totalMax: 110, average };
    }

    // CE2/CM1/CM2: exclure certaines matières du total, total imposé 170
    // CE2 utilise les mêmes barèmes et la même logique que CM1
    // EPS est maintenant inclus dans les calculs (sur 20)
    if (cls.startsWith('CE2') || cls.startsWith('CM1') || cls.startsWith('CM2')) {
      const excluded = ['LECTURE', 'ANGLAIS', 'CONDUITE'];
      const included = subjects.filter(s => !excluded.some(ex => (s.name || '').toUpperCase().includes(ex)));
      const total = included.reduce((sum, s) => sum + toPoints(s.id, s.name), 0);
      // CE2 et CM1 utilisent le même diviseur (17) pour la moyenne sur 10
      const average = (cls.startsWith('CE2') || cls.startsWith('CM1'))
        ? (total / 17).toFixed(2) + '/10'
        : (total / 8.5).toFixed(2) + '/20'; // CM2 sur 20
      return { total: Number(total.toFixed(2)), totalMax: 170, average };
    }

    // Par défaut: somme des points et moyenne arithmétique sur barème courant
    const pointsArray: number[] = subjects.map(s => toPoints(s.id, s.name)).filter(v => typeof v === 'number');
    const total = pointsArray.reduce((a, b) => a + b, 0);
    const grades20 = Object.values(currentGrades);
    const avg20 = grades20.length > 0 ? (grades20.reduce((a, b) => a + b, 0) / grades20.length).toFixed(2) : '';
    const totalMax = subjects.reduce((sum, s) => sum + getSubjectMaxScore(s.name), 0);
    const average = avg20 ? `${avg20}/20` : '';
    return { total: Number(total.toFixed(2)), totalMax, average };
  };

  // Conversion entre affichage (barème classe) et backend (/20)
  const convertDisplayToBackend = (displayGrade: number, subjectName: string): number => {
    const max = getSubjectMaxScore(subjectName);
    if (!max || isNaN(displayGrade)) return 0;
    return Number(((displayGrade / max) * 20).toFixed(2));
  };

  const convertBackendToDisplay = (backendGrade20: number, subjectName: string): number => {
    const max = getSubjectMaxScore(subjectName);
    if (!max || isNaN(backendGrade20)) return 0;
    return Number((((backendGrade20 || 0) / 20) * max).toFixed(2));
  };

  // Charger les données de la classe au montage
  useEffect(() => {
    if (classId) {
      fetchClassInfo();
      fetchAuthorizedSubjects();
      fetchClassStudents();
    }
  }, [classId]);

  // Charger les notes existantes pour la matière/composition sélectionnées (vue tableau par matière)
  useEffect(() => {
    if (classId && selectedSubject && selectedComposition) {
      fetchExistingGrades();
    }
  }, [classId, selectedSubject, selectedComposition]);

  // Charger les compositions quand une classe est sélectionnée
  useEffect(() => {
    if (classId) {
      fetchCompositions();
    }
  }, [classId]);

  // Charger les notes existantes quand un élève et une composition sont sélectionnés
  useEffect(() => {
    if (classId && selectedStudent && selectedComposition) {
      fetchExistingGradesForStudent();
    }
  }, [classId, selectedStudent, selectedComposition]);

  // Quand une composition est sélectionnée (mode par élève), charger toutes les notes pour la classe afin de calculer moyennes et rangs
  useEffect(() => {
    if (classId && selectedComposition && !selectedSubject && subjects.length > 0) {
      fetchAllGradesForComposition();
    } else {
      setGradesBySubject({});
      setStudentAverages({});
      setStudentRanks({});
    }
  }, [classId, selectedComposition, selectedSubject, subjects]);

  const fetchClassInfo = async () => {
    if (!classId) return;
    
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`https://saintefamilleexcellence.ci/api/classes/${classId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setClassInfo(response.data);
    } catch (error) {
      console.error('Erreur lors du chargement des informations de la classe:', error);
      setSnackbar({
        open: true,
        message: 'Erreur lors du chargement des informations de la classe',
        severity: 'error'
      });
    }
  };

  const fetchExistingGrades = async () => {
    if (!classId || !selectedSubject || !selectedComposition) return;
    try {
      const response = await axios.get(`https://saintefamilleexcellence.ci/api/debug/grades`, {
        params: {
          class_id: classId,
          subject_id: selectedSubject,
          composition_id: selectedComposition
        }
      });
      const list = response.data.filtered_grades || response.data.grades || [];
      const map: { [key: number]: { grade: number; is_published: boolean } } = {};
      list.forEach((g: any) => {
        if (g && typeof g.student_id === 'number') {
          // Store RAW grade as received (subject scale)
          map[g.student_id] = { grade: Number(g.grade), is_published: !!g.is_published };
        }
      });
      setExistingGrades(map);
    } catch (error) {
      console.error("Erreur lors du chargement des notes existantes:", error);
      setExistingGrades({});
    }
  };

  const fetchAuthorizedSubjects = async () => {
    if (!classId) return;
    
    try {
      const token = localStorage.getItem('token');
      console.log('🔍 [FETCH SUBJECTS] Chargement des matières bulletin pour la classe', classId);

      const response = await axios.get(`https://saintefamilleexcellence.ci/api/bulletin-subjects/class/${classId}` , {
        headers: { Authorization: `Bearer ${token}` }
      });

      const mapped: Subject[] = (response.data.subjects || []).map((s: any) => ({
        // Always use the bulletin_subject_id as the unique identifier
        id: s.bulletin_subject_id,
        name: s.name,
        type: 'bulletin',
        level_groups: s.level_group, // comes directly from bulletin_subjects
        bulletinSubjectId: s.bulletin_subject_id,
        legacySubjectId: s.subject_id
      }));

      if (mapped.length === 0) {
        console.warn('⚠️ Aucune correspondance trouvée entre bulletin_subjects et subjects. Vérifiez la migration.');
      }

      setSubjects(mapped);
      setSelectedStudent(null);
      setSelectedComposition(null);
    } catch (error: any) {
      console.error('Erreur lors du chargement des matières bulletin:', error);
      setSnackbar({
        open: true,
        message: `Erreur lors du chargement des matières du bulletin (${error.response?.status || 'Erreur réseau'})`,
        severity: 'error'
      });
    }
  };

  const fetchClassStudents = async () => {
    if (!classId) return;
    
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await axios.get(`https://saintefamilleexcellence.ci/api/classes/${classId}/students`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setStudents(response.data);
    } catch (error) {
      console.error('Erreur lors du chargement des élèves:', error);
      setSnackbar({
        open: true,
        message: 'Erreur lors du chargement des élèves',
        severity: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchCompositions = async () => {
    if (!classId) return;
    
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`https://saintefamilleexcellence.ci/api/compositions/class/${classId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setCompositions(response.data);
      setSelectedComposition(null); // Reset composition selection
    } catch (error) {
      console.error('Erreur lors du chargement des compositions:', error);
      setSnackbar({
        open: true,
        message: 'Erreur lors du chargement des compositions',
        severity: 'error'
      });
    }
  };

  const fetchExistingGradesForStudent = async () => {
    if (!classId || !selectedStudent || !selectedComposition || subjects.length === 0) return;
    try {
      const requests = subjects.map((subj) =>
        axios.get(`https://saintefamilleexcellence.ci/api/debug/grades`, {
          params: {
            class_id: classId,
            subject_id: subj.id,
            composition_id: selectedComposition
          }
        }).then(res => ({ subjId: subj.id, data: res.data }))
      );
      const results = await Promise.all(requests);
      // Utiliser une map de notes AU FORMAT D'AFFICHAGE (désormais RAW sur barème matière)
      const gradesMap: { [sid: number]: number } = {};
      const existingMap: { [sid: number]: { grade: number, is_published: boolean } } = {};
      results.forEach(r => {
        const list = r.data.filtered_grades || r.data.grades || [];
        const found = list.find((g: any) => g.student_id === selectedStudent);
        if (found) {
          // Conserver RAW (le backend doit désormais retourner/attendre la note brute)
          gradesMap[r.subjId] = Number(found.grade);
          existingMap[r.subjId] = { grade: Number(found.grade), is_published: !!found.is_published };
        }
      });
      setSubjectGrades(gradesMap);
      setExistingSubjectGrades(existingMap);
    } catch (error) {
      console.error('Erreur lors du chargement des notes de l\'élève:', error);
      setSubjectGrades({});
      setExistingSubjectGrades({});
    }
  };

  // Récupère toutes les notes (par matière) pour la composition sélectionnée, puis calcule moyennes et rangs
  const fetchAllGradesForComposition = async () => {
    if (!classId || !selectedComposition || subjects.length === 0) return;
    try {
      // Charger toutes les matières en parallèle
      const results = await Promise.all(subjects.map((subj) =>
        axios.get(`https://saintefamilleexcellence.ci/api/debug/grades`, {
          params: { class_id: classId, subject_id: subj.id, composition_id: selectedComposition }
        }).then(res => ({ subjId: subj.id, data: res.data }))
      ));

      const bySubject: { [subjectId: number]: { [studentId: number]: number } } = {};
      results.forEach(r => {
        const list = r.data.filtered_grades || r.data.grades || [];
        const map: { [studentId: number]: number } = {};
        list.forEach((g: any) => {
          if (g && typeof g.student_id === 'number' && g.grade !== undefined) {
            map[g.student_id] = Number(g.grade); // RAW grade, subject scale
          }
        });
        bySubject[r.subjId] = map;
      });
      setGradesBySubject(bySubject);

      // Calculer moyennes pour chaque élève
      const averages: { [studentId: number]: { averageLabel: string; average20: number } } = {};
      students.forEach(st => {
        const agg = computeTotalsForStudentFromAllSubjects(st.id, bySubject);
        averages[st.id] = agg;
      });
      setStudentAverages(averages);

      // Calculer rangs (sur base average20, décroissant)
      const rankingArray = students.map(st => ({ id: st.id, avg20: averages[st.id]?.average20 ?? -1 }));
      rankingArray.sort((a, b) => (b.avg20 - a.avg20));
      const ranks: { [studentId: number]: number } = {};
      let currentRank = 1;
      rankingArray.forEach((item, index) => {
        if (index > 0 && item.avg20 !== rankingArray[index - 1].avg20) {
          currentRank = index + 1;
        }
        if (item.avg20 >= 0) ranks[item.id] = currentRank;
      });
      setStudentRanks(ranks);
    } catch (e) {
      console.error('Erreur lors du chargement global des notes:', e);
      setGradesBySubject({});
      setStudentAverages({});
      setStudentRanks({});
    }
  };

  // Calcule total/moyenne pour un élève à partir de gradesBySubject
  const computeTotalsForStudentFromAllSubjects = (studentId: number, bySubject: { [subjectId: number]: { [studentId: number]: number } }): { averageLabel: string; average20: number } => {
    const cls = getClassLabel();
    // Conversion standard vers points (note/20 * barème)
    const toPoints = (subjectId: number, subjectName: string): number => {
      const raw = bySubject[subjectId]?.[studentId];
      if (raw === undefined) return 0;
      const max = getSubjectMaxScore(subjectName);
      // raw is already on subject scale (0..max)
      return Number(raw);
    };

    if (cls.startsWith('CP')) {
      const targeted = [
        'GRAPHISME/ECRITURE', 'GRAPHISME/ÉCRITURE', 'DISCRIMINATION VISUELLE',
        'EDHC', 'MATHEMATIQUE', 'MATHÉMATIQUE', 'CHANT/POESIE', 'CHANT/POÉSIE', 'DESSIN'
      ];
      const selectedSubjects = subjects.filter(s => targeted.some(k => (s.name || '').toUpperCase().includes(k)));
      const total = selectedSubjects.reduce((sum, s) => sum + toPoints(s.id, s.name), 0);
      const average10 = total / 6; // moyenne sur 10
      return { averageLabel: `${average10.toFixed(2)}/10`, average20: Number((average10 * 2).toFixed(2)) };
    }

    // CE1: total sur 4 matières principales, moyenne sur 10
    if (cls.startsWith('CE1')) {
      const targeted = ['EXPLOITATION DE TEXTE','A.E.M','ORTHOGRAPHE','DICTEE','DICTÉE','MATHEMATIQUE','MATHÉMATIQUE'];
      const selectedSubjects = subjects.filter(s => targeted.some(k => (s.name || '').toUpperCase().includes(k)));
      const total = selectedSubjects.reduce((sum, s) => sum + toPoints(s.id, s.name), 0);
      const average10 = total / 11; // moyenne sur 10
      return { averageLabel: `${average10.toFixed(2)}/10`, average20: Number((average10 * 2).toFixed(2)) };
    }

    // CE2/CM1/CM2: exclure certaines matières du total
    // CE2 utilise les mêmes barèmes et la même logique que CM1
    // EPS est maintenant inclus dans les calculs (sur 20)
    if (cls.startsWith('CE2') || cls.startsWith('CM1') || cls.startsWith('CM2')) {
      const excluded = ['LECTURE', 'ANGLAIS', 'CONDUITE'];
      const included = subjects.filter(s => !excluded.some(ex => (s.name || '').toUpperCase().includes(ex)));
      const total = included.reduce((sum, s) => sum + toPoints(s.id, s.name), 0);
      // CE2 et CM1 utilisent le même diviseur (17) pour la moyenne sur 10
      if (cls.startsWith('CE2') || cls.startsWith('CM1')) {
        const average10 = total / 17; // sur 10
        return { averageLabel: `${average10.toFixed(2)}/10`, average20: Number((average10 * 2).toFixed(2)) };
      }
      // CM2 utilise un diviseur différent (8.5) pour la moyenne sur 20
      const average20 = total / 8.5; // CM2 sur 20
      return { averageLabel: `${average20.toFixed(2)}/20`, average20: Number(average20.toFixed(2)) };
    }

    // Par défaut: moyenne arithmétique sur 20 à partir des notes converties
    const grades20: number[] = subjects.map(s => {
      const raw = bySubject[s.id]?.[studentId];
      if (raw === undefined) return undefined as any;
      const max = getSubjectMaxScore(s.name);
      const to20 = (raw / max) * 20;
      return Number(to20.toFixed(2));
    }).filter(v => typeof v === 'number');
    if (grades20.length === 0) return { averageLabel: '--', average20: -1 };
    const avg20 = grades20.reduce((a, b) => a + b, 0) / grades20.length;
    return { averageLabel: `${avg20.toFixed(2)}/20`, average20: Number(avg20.toFixed(2)) };
  };

  const handleGradeChange = (studentId: number, value: string) => {
    const numericValue = parseFloat(value);
    if (isNaN(numericValue)) {
      setGrades(prev => {
        const newGrades = { ...prev };
        delete newGrades[studentId];
        return newGrades;
      });
    } else {
      const max = getSubjectMaxScore(selectedSubjectName || '');
      const bounded = Math.max(0, Math.min(numericValue, max || 20));
      setGrades(prev => ({
        ...prev,
        [studentId]: bounded
      }));
      
      // Marquer cet élève comme ayant une modification en cours
      setRecentlyUpdated(prev => new Set([...prev, studentId]));
      
      // Effacer l'indicateur après 3 secondes si pas de sauvegarde
      setTimeout(() => {
        setRecentlyUpdated(prev => {
          const newSet = new Set(prev);
          newSet.delete(studentId);
          return newSet;
        });
      }, 3000);
    }
  };

  const handleSubjectGradeChange = (subjectId: number, value: string) => {
    const numericValue = parseFloat(value);
    if (isNaN(numericValue)) {
      setSubjectGrades(prev => {
        const copy = { ...prev };
        delete copy[subjectId];
        return copy;
      });
    } else {
      const subjectName = subjects.find(s => s.id === subjectId)?.name || '';
      const max = getSubjectMaxScore(subjectName);
      const bounded = Math.max(0, Math.min(numericValue, max || 20));
      setSubjectGrades(prev => ({ ...prev, [subjectId]: bounded }));
    }
  };

  const handleSaveGrades = async () => {
    if (!classId || !selectedSubject || !selectedComposition) {
      setSnackbar({
        open: true,
        message: 'Veuillez sélectionner une matière et une composition',
        severity: 'error'
      });
      return;
    }

    // ============================================
    // VÉRIFICATION DU DÉLAI DE SAISIE - DÉSACTIVÉE
    // Pour réactiver, décommenter le code ci-dessous
    // ============================================
    // Vérifier le délai de saisie (sauf pour les admins)
    // if (!isAdminAccess) {
    //   const selectedComp = compositions.find(c => c.id === selectedComposition);
    //   if (selectedComp && selectedComp.can_enter_grades === 0) {
    //     const daysRemaining = selectedComp.days_remaining_for_grades ?? 0;
    //     let message = '';
    //     if (daysRemaining < 0) {
    //       message = `Le délai de saisie des notes pour cette composition est expiré. Veuillez contacter l'administration.`;
    //     } else {
    //       message = `Le délai de saisie des notes n'a pas encore commencé pour cette composition.`;
    //     }
    //     setSnackbar({
    //       open: true,
    //       message: message,
    //       severity: 'error'
    //     });
    //     return;
    //   }
    // }

    

    // Vérifier les permissions pour les admins
    if (isAdminAccess && !adminCanModifyNotes) {
      setSnackbar({
        open: true,
        message: 'Impossible de modifier les notes : des bulletins ont été publiés pour cette classe.',
        severity: 'error'
      });
      return;
    }

    try {
      setSaving(true);
      const token = localStorage.getItem('token');
      
      let successCount = 0;
      let errorCount = 0;
      const updatedStudentIds: number[] = [];

        // Sauvegarder chaque note individuellement
        for (const [studentId, grade] of Object.entries(grades)) {
          if (grade !== undefined && grade !== null && !isNaN(Number(grade))) {
            // Les admins peuvent modifier même les notes publiées
            if (!isAdminAccess && existingGrades[parseInt(studentId)]?.is_published) {
              continue; // Ignorer les notes déjà publiées seulement pour les enseignants
            }
          
          try {
            // Envoyer la note brute (barème matière)
            await axios.post('https://saintefamilleexcellence.ci/api/teachers/grades', {
              student_id: parseInt(studentId),
              class_id: parseInt(classId),
              subject_id: selectedSubject,
              grade: Number(grade),
              composition_id: selectedComposition,
              coefficient: 1
            }, {
              headers: { Authorization: `Bearer ${token}` }
            });
            
            successCount++;
            updatedStudentIds.push(parseInt(studentId));
            
            // Marquer cet élève comme récemment mis à jour
            setRecentlyUpdated(prev => new Set([...prev, parseInt(studentId)]));
            
            // Émettre un événement de mise à jour pour cette note
            gradeEventManager.emitGradeUpdate({
              studentId: parseInt(studentId),
              classId: parseInt(classId),
              subjectId: selectedSubject,
              compositionId: selectedComposition,
              newGrade: Number(grade),
              isPublished: false, // Note fraîchement sauvegardée, pas encore publiée
              timestamp: Date.now()
            });
            
          } catch (error: any) {
            console.error(`Erreur pour l'élève ${studentId}:`, error);
            errorCount++;
            
            // Gestion spécifique des compositions futures
            if (error.response?.data?.error_type === 'COMPOSITION_FUTURE') {
              setSnackbar({
                open: true,
                message: error.response.data.message,
                severity: 'error'
              });
              return; // Arrêter le processus
            }
            
            // Gestion spécifique des notes déjà publiées
            if (error.response?.status === 403 && error.response?.data?.message?.includes('publiée')) {
              setSnackbar({
                open: true,
                message: `Note de l'élève ${students.find(s => s.id === parseInt(studentId))?.first_name || 'inconnu'} déjà publiée et non modifiable`,
                severity: 'warning'
              });
              // Continuer avec les autres notes
            }
          }
        }
      }

      if (errorCount === 0) {
        setSnackbar({
          open: true,
          message: `${successCount} note(s) sauvegardée(s) avec succès !`,
          severity: 'success'
        });
        
        // Recharger les notes depuis le serveur pour avoir les données à jour
        await fetchExistingGrades();
        
        // Déclencher le rafraîchissement des bulletins pour les élèves mis à jour
        if (updatedStudentIds.length > 0) {
          gradeEventManager.triggerBulletinRefresh(
            updatedStudentIds,
            parseInt(classId),
            selectedComposition,
            selectedSubject
          );
          
          // Effacer les indicateurs de mise à jour après 5 secondes
          setTimeout(() => {
            setRecentlyUpdated(new Set());
          }, 5000);
        }
      } else {
        setSnackbar({
          open: true,
          message: `${successCount} note(s) sauvegardée(s), ${errorCount} erreur(s)`,
          severity: 'info'
        });
        
        // Déclencher le rafraîchissement même en cas d'erreurs partielles
        if (updatedStudentIds.length > 0) {
          gradeEventManager.triggerBulletinRefresh(
            updatedStudentIds,
            parseInt(classId),
            selectedComposition,
            selectedSubject
          );
        }
      }
    } catch (error) {
      console.error('Erreur lors de la sauvegarde:', error);
      setSnackbar({
        open: true,
        message: 'Erreur lors de la sauvegarde des notes',
        severity: 'error'
      });
    } finally {
      setSaving(false);
    }
  };

  const handleSaveGradesForStudent = async () => {
    if (!classId || !selectedStudent || !selectedComposition) {
      setSnackbar({ open: true, message: 'Sélectionnez un élève et une composition', severity: 'error' });
      return;
    }

    // ============================================
    // VÉRIFICATION DU DÉLAI DE SAISIE - DÉSACTIVÉE
    // Pour réactiver, décommenter le code ci-dessous
    // ============================================
    // Vérifier le délai de saisie (sauf pour les admins)
    // if (!isAdminAccess) {
    //   const selectedComp = compositions.find(c => c.id === selectedComposition);
    //   if (selectedComp && selectedComp.can_enter_grades === 0) {
    //     const daysRemaining = selectedComp.days_remaining_for_grades ?? 0;
    //     let message = '';
    //     if (daysRemaining < 0) {
    //       message = `Le délai de saisie des notes pour cette composition est expiré. Veuillez contacter l'administration.`;
    //     } else {
    //       message = `Le délai de saisie des notes n'a pas encore commencé pour cette composition.`;
    //     }
    //     setSnackbar({
    //       open: true,
    //       message: message,
    //       severity: 'error'
    //     });
    //     return;
    //   }
    // }

    try {
      setSaving(true);
      const token = localStorage.getItem('token');
      let success = 0; let errors = 0;
      for (const [subjectIdStr, gradeVal] of Object.entries(subjectGrades)) {
        const subjectId = parseInt(subjectIdStr);
        if (gradeVal === undefined || gradeVal === null || isNaN(Number(gradeVal))) continue;
        if (!isAdminAccess && existingSubjectGrades[subjectId]?.is_published) continue;
        try {
          await axios.post('https://saintefamilleexcellence.ci/api/teachers/grades', {
            student_id: selectedStudent,
            class_id: parseInt(classId),
            subject_id: subjectId,
            grade: Number(gradeVal),
            composition_id: selectedComposition,
            coefficient: 1
          }, { headers: { Authorization: `Bearer ${token}` } });
          success++;
        } catch (err) {
          console.error(`Erreur sauvegarde matière ${subjectId}:`, err);
          errors++;
        }
      }
      if (errors === 0) {
        setSnackbar({ open: true, message: `${success} note(s) sauvegardée(s)`, severity: 'success' });
      } else {
        setSnackbar({ open: true, message: `${success} note(s) sauvegardée(s), ${errors} erreur(s)`, severity: 'info' });
      }
      await fetchExistingGradesForStudent();
      // Recharger toutes les notes pour recalculer les statistiques de la classe (moyennes, rangs)
      await fetchAllGradesForComposition();
      gradeEventManager.triggerBulletinRefresh([selectedStudent], parseInt(classId), selectedComposition, undefined);
    } finally {
      setSaving(false);
    }
  };

  const handlePublishGradesForStudent = async () => {
    if (!classId || !selectedStudent || !selectedComposition) return;
    setPublishing(true);
    try {
      // 1) Sauvegarder d'abord les notes locales non persistées
      if (Object.keys(subjectGrades).length > 0) {
        const tokenSave = localStorage.getItem('token');
        for (const [subjectIdStr, gradeVal] of Object.entries(subjectGrades)) {
          const subjectId = parseInt(subjectIdStr);
          if (gradeVal === undefined || gradeVal === null || isNaN(Number(gradeVal))) continue;
          // Ne pas tenter de modifier une note déjà publiée (sauf admin)
          if (!isAdminAccess && existingSubjectGrades[subjectId]?.is_published) continue;
          await axios.post('https://saintefamilleexcellence.ci/api/teachers/grades', {
            student_id: selectedStudent,
            class_id: parseInt(classId),
            subject_id: subjectId,
            grade: Number(gradeVal),
            composition_id: selectedComposition,
            coefficient: 1
          }, { headers: { Authorization: `Bearer ${tokenSave}` } });
        }
      }

      const token = localStorage.getItem('token');
      // publier par matière où une note existe
      for (const subj of subjects) {
        if (subjectGrades[subj.id] !== undefined || existingSubjectGrades[subj.id]) {
          try {
            await axios.post('https://saintefamilleexcellence.ci/api/teachers/publish-grades', {
              class_id: parseInt(classId),
              subject_id: subj.id,
              composition_id: selectedComposition
            }, { headers: { Authorization: `Bearer ${token}` } });
            // Optimistic update: marquer la matière comme publiée côté client
            setExistingSubjectGrades(prev => ({
              ...prev,
              [subj.id]: {
                grade: prev[subj.id]?.grade ?? (subjectGrades[subj.id] as number),
                is_published: true
              }
            }));
          } catch (e) {
            console.warn('Publication partielle échouée pour sujet', subj.id, e);
          }
        }
      }
      setSnackbar({ open: true, message: 'Notes publiées pour l\'élève sélectionné', severity: 'success' });
      await fetchExistingGradesForStudent();
      // Recharger toutes les notes pour recalculer les statistiques de la classe (moyennes, rangs)
      await fetchAllGradesForComposition();
      // Ne pas notifier les parents lorsqu'un enseignant publie; seulement l'admin déclenche les événements
      if (isAdminAccess) {
        gradeEventManager.triggerBulletinRefresh([selectedStudent], parseInt(classId), selectedComposition, undefined);
      }
    } catch (e:any) {
      setSnackbar({ open: true, message: e.response?.data?.message || 'Erreur lors de la publication', severity: 'error' });
    } finally {
      setPublishing(false);
    }
  };

  // Déterminer si toutes les notes EXISTANTES de l'élève sélectionné sont publiées
  const isSelectedStudentFullyPublished = (): boolean => {
    if (!selectedStudent) return false;
    const subjectIdsWithAnyGrade = Object.keys(existingSubjectGrades).map(Number);
    if (subjectIdsWithAnyGrade.length === 0) return false;
    return subjectIdsWithAnyGrade.every((sid) => !!existingSubjectGrades[sid]?.is_published);
  };

  // Publier toutes les notes de tous les élèves pour toutes les matières d'une composition
  const handlePublishAllGradesForComposition = async () => {
    if (!classId || !selectedComposition) {
      setSnackbar({
        open: true,
        message: 'Veuillez sélectionner une composition',
        severity: 'error'
      });
      return;
    }

    // Vérifier les permissions pour les admins
    if (isAdminAccess && !adminCanModifyNotes) {
      setSnackbar({
        open: true,
        message: 'Impossible de publier les notes : des bulletins ont été publiés pour cette classe.',
        severity: 'error'
      });
      return;
    }

    // Demander confirmation
    if (!window.confirm(`Êtes-vous sûr de vouloir publier toutes les notes de tous les élèves pour la composition "${selectedCompositionName}" ?\n\nCette action publiera toutes les notes de toutes les matières pour tous les élèves de la classe.`)) {
      return;
    }

    setPublishing(true);
    try {
      const token = localStorage.getItem('token');
      let successCount = 0;
      let errorCount = 0;
      const publishedSubjects: number[] = [];

      // Publier pour chaque matière
      for (const subject of subjects) {
        try {
          await axios.post('https://saintefamilleexcellence.ci/api/teachers/publish-grades', {
            class_id: parseInt(classId),
            subject_id: subject.id,
            composition_id: selectedComposition
          }, {
            headers: { Authorization: `Bearer ${token}` }
          });
          successCount++;
          publishedSubjects.push(subject.id);
        } catch (error: any) {
          console.error(`Erreur lors de la publication pour la matière ${subject.name}:`, error);
          errorCount++;
        }
      }

      if (errorCount === 0) {
        setSnackbar({
          open: true,
          message: `Toutes les notes ont été publiées avec succès ! (${successCount} matière(s))`,
          severity: 'success'
        });
      } else {
        setSnackbar({
          open: true,
          message: `${successCount} matière(s) publiée(s), ${errorCount} erreur(s)`,
          severity: 'warning'
        });
      }

      // Recharger toutes les notes pour mettre à jour les statistiques
      await fetchAllGradesForComposition();

      // Émettre des événements pour tous les élèves si admin
      if (isAdminAccess && publishedSubjects.length > 0) {
        students.forEach(student => {
          publishedSubjects.forEach(subjectId => {
            gradeEventManager.emitGradeUpdate({
              studentId: student.id,
              classId: parseInt(classId),
              subjectId: subjectId,
              compositionId: selectedComposition,
              newGrade: 0, // La note réelle sera récupérée par le backend
              isPublished: true,
              timestamp: Date.now()
            });
          });
        });
        
        const allStudentIds = students.map(s => s.id);
        if (allStudentIds.length > 0) {
          gradeEventManager.triggerBulletinRefresh(
            allStudentIds,
            parseInt(classId),
            selectedComposition,
            undefined
          );
        }
      }
    } catch (error: any) {
      console.error('Erreur lors de la publication globale:', error);
      setSnackbar({
        open: true,
        message: error.response?.data?.message || 'Erreur lors de la publication de toutes les notes',
        severity: 'error'
      });
    } finally {
      setPublishing(false);
    }
  };

  const handlePublishGrades = async () => {
    if (!classId || !selectedSubject || !selectedComposition) {
      setSnackbar({
        open: true,
        message: 'Veuillez sélectionner une classe, une matière et une composition',
        severity: 'error'
      });
      return;
    }

    // Vérifier les permissions pour les admins
    if (isAdminAccess && !adminCanModifyNotes) {
      setSnackbar({
        open: true,
        message: 'Impossible de publier les notes : des bulletins ont été publiés pour cette classe.',
        severity: 'error'
      });
      return;
    }

    setPublishing(true);
    try {
      const token = localStorage.getItem('token');

      // 1) Sauvegarder d'abord les notes locales non persistées pour cette matière
      if (Object.keys(grades).length > 0) {
        for (const [studentId, gradeVal] of Object.entries(grades)) {
          if (gradeVal === undefined || gradeVal === null || isNaN(Number(gradeVal))) continue;
          // Ne pas modifier les notes publiées pour les enseignants
          if (!isAdminAccess && existingGrades[parseInt(studentId)]?.is_published) continue;
          await axios.post('https://saintefamilleexcellence.ci/api/teachers/grades', {
            student_id: parseInt(studentId),
            class_id: parseInt(classId),
            subject_id: selectedSubject,
            grade: Number(gradeVal),
            composition_id: selectedComposition,
            coefficient: 1
          }, { headers: { Authorization: `Bearer ${token}` } });
        }
      }
      
      await axios.post('https://saintefamilleexcellence.ci/api/teachers/publish-grades', {
        class_id: parseInt(classId),
        subject_id: selectedSubject,
        composition_id: selectedComposition
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      // Optimistic update: marquer comme publiées côté client pour chaque élève ayant une note
      setExistingGrades(prev => {
        const copy: { [key: number]: { grade: number; is_published: boolean } } = { ...prev };
        Object.keys(copy).forEach(k => {
          const id = parseInt(k);
          if (copy[id]) {
            copy[id] = { ...copy[id], is_published: true };
          }
        });
        return copy;
      });

      setSnackbar({
        open: true,
        message: 'Notes publiées avec succès ! Les parents peuvent maintenant les consulter.',
        severity: 'success'
      });
      
      // Recharger les notes depuis le serveur pour avoir le statut de publication à jour
      await fetchExistingGrades();
      
      // Important: ne notifier que l'administration. Aucun événement pour les parents.
      if (isAdminAccess) {
        // Émettre des événements de publication uniquement en mode admin
        const studentsWithGrades = Object.keys(existingGrades).map(id => parseInt(id));
        studentsWithGrades.forEach(studentId => {
          gradeEventManager.emitGradeUpdate({
            studentId,
            classId: parseInt(classId),
            subjectId: selectedSubject,
            compositionId: selectedComposition,
            newGrade: existingGrades[studentId]?.grade || 0,
            isPublished: true,
            timestamp: Date.now()
          });
        });
        if (studentsWithGrades.length > 0) {
          gradeEventManager.triggerBulletinRefresh(
            studentsWithGrades,
            parseInt(classId),
            selectedComposition,
            selectedSubject
          );
        }
      }
    } catch (error: any) {
      console.error('Erreur lors de la publication:', error);
      setSnackbar({
        open: true,
        message: error.response?.data?.message || 'Erreur lors de la publication des notes',
        severity: 'error'
      });
    } finally {
      setPublishing(false);
    }
  };

  const getSubjectTypeLabel = (type: string) => {
    const typeLabels: { [key: string]: string } = {
      'francais': 'Français',
      'aem': 'A.E.M',
      'mathematiques': 'Mathématiques',
      'langues': 'Langues',
      'sport': 'Sport',
      'autres': 'Autres',
      'bulletin': 'Bulletin'
    };
    return typeLabels[type] || type;
  };

  const selectedSubjectName = subjects.find(s => s.id === selectedSubject)?.name || '';
  const selectedCompositionName = compositions.find(c => c.id === selectedComposition)?.name || '';

  // Style visuel pour un rang (top 3 en couleurs médailles)
  const getRankVisual = (rank: number): { bg: string; color: string; label: string } => {
    if (rank === 1) return { bg: '#FFD700', color: '#000', label: '🥇 1' };
    if (rank === 2) return { bg: '#C0C0C0', color: '#000', label: '🥈 2' };
    if (rank === 3) return { bg: '#CD7F32', color: '#fff', label: '🥉 3' };
    return { bg: '#e0e0e0', color: '#000', label: String(rank) };
  };

  // Fonction pour recharger la page et vider le cache
  const handleReloadPage = () => {
    // Vider le cache du navigateur si l'API est disponible
    if ('caches' in window) {
      caches.keys().then((names) => {
        names.forEach((name) => {
          caches.delete(name);
        });
      });
    }
    // Recharger la page en forçant le rechargement depuis le serveur
    window.location.reload();
  };

  return (
    <Container maxWidth="xl" sx={{ py: { xs: 2, sm: 3, md: 4 }, px: { xs: 1, sm: 2, md: 3 } }}>
      {/* Breadcrumbs */}
      <Breadcrumbs
        separator={<NavigateNextIcon fontSize="small" />}
        sx={{ mb: { xs: 2, md: 3 }, overflowX: 'auto', '& .MuiBreadcrumbs-ol': { flexWrap: 'nowrap' } }}
      >
        <Link
          component="button"
          variant="body1"
          onClick={() => navigate('/teacher')}
          sx={{ textDecoration: 'none' }}
        >
          Tableau de bord
        </Link>
        <Typography color="text.primary">
          Gestion des notes - {classInfo?.name || 'Classe'}
        </Typography>
      </Breadcrumbs>

      <Paper elevation={3} sx={{ p: { xs: 2, sm: 3, md: 4 }, borderRadius: { xs: 2, md: 3 }, overflow: 'hidden' }}>
        {/* En-tête */}
        <Box sx={{ 
          mb: { xs: 2, md: 4 }, 
          display: 'flex', 
          flexDirection: { xs: 'column', sm: 'row' },
          alignItems: { xs: 'flex-start', sm: 'center' }, 
          justifyContent: 'space-between',
          gap: { xs: 2, sm: 0 }
        }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: { xs: 1, sm: 2 }, flex: 1, minWidth: 0 }}>
            <AssignmentIcon fontSize="large" sx={{ color: '#1976d2', fontSize: { xs: '2rem', md: '2.5rem' } }} />
            <Box sx={{ minWidth: 0, flex: 1 }}>
              <Typography variant="h4" component="h1" sx={{ 
                fontWeight: 'bold',
                color: '#1976d2',
                fontSize: { xs: '1.25rem', sm: '1.5rem', md: '2.125rem' },
                wordBreak: 'break-word'
              }}>
                {isAdminAccess 
                  ? (adminCanModifyNotes ? 'Modification des Notes' : 'Consultation des Notes')
                  : 'Gestion des Notes'
                }
              </Typography>
              <Typography variant="h6" color="text.secondary" sx={{ fontSize: { xs: '0.875rem', sm: '1rem', md: '1.25rem' } }}>
                Classe: {adminClassName || classInfo?.name || 'Chargement...'}
              </Typography>
              {isAdminAccess && (
                <Typography variant="body2" color="primary.main" sx={{ mt: 1, fontWeight: 600, fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>
                  🔧 Accès administrateur - {adminCanModifyNotes ? 'Modification autorisée' : 'Lecture seule'}
                </Typography>
              )}
            </Box>
          </Box>
          <Box sx={{ display: 'flex', gap: { xs: 1, sm: 1.5 }, flexDirection: { xs: 'column', sm: 'row' }, width: { xs: '100%', sm: 'auto' }, mt: { xs: 1, sm: 0 } }}>
            <Button
              variant="outlined"
              startIcon={<RefreshIcon />}
              onClick={handleReloadPage}
              sx={{ 
                width: { xs: '100%', sm: 'auto' },
                fontSize: { xs: '0.75rem', sm: '0.875rem' },
                color: 'primary.main',
                borderColor: 'primary.main',
                '&:hover': {
                  borderColor: 'primary.dark',
                  bgcolor: 'primary.light',
                  color: 'primary.dark'
                }
              }}
            >
              Recharger la Page
            </Button>
            <Button
              variant="outlined"
              startIcon={<ArrowBackIcon />}
              onClick={() => {
                if (isAdminAccess) {
                  // Retourner à la gestion des bulletins pour les admins
                  navigate(-1);
                } else {
                  // Retourner au tableau de bord pour les enseignants
                  navigate('/teacher');
                }
              }}
              sx={{ 
                width: { xs: '100%', sm: 'auto' },
                fontSize: { xs: '0.75rem', sm: '0.875rem' }
              }}
            >
              {isAdminAccess ? 'Retour aux bulletins' : 'Retour'}
            </Button>
          </Box>
        </Box>

        {/* Message d'accueil */}
        {classId && !selectedComposition && (
          <Alert severity="info" sx={{ mb: { xs: 2, md: 4 }, fontSize: { xs: '0.875rem', sm: '1rem' } }}>
            <Typography variant="h6" sx={{ fontWeight: 600, mb: 1, fontSize: { xs: '1rem', sm: '1.25rem' } }}>
              {isAdminAccess ? (adminCanModifyNotes ? '🔧 Gestion des Notes' : '👁️ Consultation des Notes') : '📝 Saisie des Notes'}
              {preSelectedStudentName && (
                <Typography component="span" sx={{ fontWeight: 400, color: 'primary.main', ml: { xs: 0.5, sm: 1 }, display: { xs: 'block', sm: 'inline' }, mt: { xs: 0.5, sm: 0 } }}>
                  - {preSelectedStudentName}
                </Typography>
              )}
            </Typography>
            <Typography variant="body2" sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>
              Pour {isAdminAccess ? (adminCanModifyNotes ? 'modifier' : 'consulter') : 'saisir'} les notes{preSelectedStudentName && ` de ${preSelectedStudentName}`}, veuillez suivre ces étapes :
            </Typography>
            <Typography variant="body2" sx={{ mt: 1, ml: { xs: 1, sm: 2 }, fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>
              <strong>1.</strong> Choisissez une composition<br />
              <strong>2.</strong> Cliquez sur un élève<br />
              <strong>3.</strong> {isAdminAccess ? (adminCanModifyNotes ? 'Attribuez/Modifiez' : 'Consultez') : 'Attribuez'} toutes ses notes par matière
            </Typography>
            {isAdminAccess && !adminCanModifyNotes && (
              <Typography variant="body2" sx={{ mt: 2, fontStyle: 'italic', color: 'warning.main', fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>
                ⚠️ Mode lecture seule : Les bulletins de cette classe ont été publiés.
              </Typography>
            )}
          </Alert>
        )}

        {/* Sélecteurs */}
        <Grid container spacing={{ xs: 2, sm: 3 }} sx={{ mb: { xs: 2, md: 4 } }}>
          <Grid item xs={12} md={6}>
            <FormControl fullWidth disabled={!classId}>
              <InputLabel>Composition</InputLabel>
              <Select
                value={selectedComposition || ''}
                onChange={(e) => setSelectedComposition(e.target.value as number)}
                label="Composition"
              >
                {compositions.map((composition) => (
                  <MenuItem 
                    key={composition.id} 
                    value={composition.id}
                    disabled={composition.status === 'À venir'}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1, flexDirection: 'column' }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <span style={{ 
                          color: composition.status === 'À venir' ? '#999' : 'inherit',
                          textDecoration: composition.status === 'À venir' ? 'none' : 'none'
                        }}>
                          {composition.name}
                        </span>
                        <Chip 
                          label={composition.status} 
                          size="small" 
                          color={
                            composition.status === 'Aujourd\'hui' ? 'error' :
                            composition.status === 'À venir' ? 'warning' : 
                            composition.status === 'Terminée' ? 'success' : 'default'
                          }
                          variant={composition.status === 'À venir' ? 'filled' : 'outlined'}
                        />
                      </Box>
                      <Typography 
                        variant="caption" 
                        color={composition.status === 'À venir' ? 'text.disabled' : 'text.secondary'}
                      >
                        {new Date(composition.composition_date).toLocaleDateString('fr-FR', {
                          weekday: 'long',
                          day: 'numeric', 
                          month: 'long'
                        })}
                        {composition.status === 'À venir' && (
                          <span style={{ fontStyle: 'italic', marginLeft: '8px' }}>
                            (Notes non disponibles)
                          </span>
                        )}
                      </Typography>
                    </Box>
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={12} md={6}>
            <FormControl fullWidth disabled={!classId}>
              <InputLabel>Matière du bulletin (optionnel)</InputLabel>
              <Select
                value={selectedSubject || ''}
                onChange={(e) => {
                  setSelectedSubject(e.target.value as number);
                  setSelectedComposition(null);
                }}
                label="Matière du bulletin (optionnel)"
              >
                {subjects.map((subject) => (
                  <MenuItem key={subject.id} value={subject.id}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <span>{subject.name}</span>
                      <Chip label={getSubjectTypeLabel(subject.type)} size="small" variant="outlined" />
                    </Box>
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
        </Grid>

        {/* Messages de guidance pour la sélection */}
        {!selectedComposition && classId && (
          <Alert severity="info" sx={{ mb: 3 }}>
            <Typography variant="body1" sx={{ fontWeight: 600, mb: 1 }}>
              📚 Étape 1 : Sélectionnez une composition
            </Typography>
            <Typography variant="body2">
              Choisissez la composition pour laquelle vous souhaitez {isAdminAccess ? (adminCanModifyNotes ? 'modifier' : 'consulter') : 'gérer'} les notes.
            </Typography>
          </Alert>
        )}

        {selectedComposition && !selectedSubject && (() => {
          const selectedComp = compositions.find(c => c.id === selectedComposition);
          // ============================================
          // VÉRIFICATION DU DÉLAI DE SAISIE - DÉSACTIVÉE
          // Pour réactiver, décommenter le code ci-dessous
          // ============================================
          // const canEnter = selectedComp?.can_enter_grades === 1 || isAdminAccess;
          // const daysRemaining = selectedComp?.days_remaining_for_grades ?? 0;
          // const isExpired = daysRemaining < 0;
          // const notStarted = daysRemaining > 5;
          const canEnter = true; // Toujours autoriser la saisie
          const daysRemaining = 0;
          const isExpired = false;
          const notStarted = false;
          
          return (
            <Alert 
              severity="info"
              sx={{ mb: 3 }}
            >
              <Typography variant="body1" sx={{ fontWeight: 600, mb: 1 }}>
                📝 Étape 2 : Cliquez un élève pour attribuer ses notes
              </Typography>
              <Typography variant="body2">
                Vous pourrez saisir ses notes pour toutes les matières de la classe.
              </Typography>
              {selectedComp && (
                <Box sx={{ mt: 2 }}>
                  {canEnter && daysRemaining >= 0 && daysRemaining <= 5 && (
                    <Typography variant="body2" sx={{ fontWeight: 600, color: daysRemaining <= 2 ? 'error.main' : 'warning.main' }}>
                      ⏰ Délai de saisie : {daysRemaining} jour{daysRemaining > 1 ? 's' : ''} restant{daysRemaining > 1 ? 's' : ''}
                      {selectedComp.grade_entry_end_date && (
                        <span style={{ marginLeft: '8px', fontSize: '0.875rem', fontWeight: 400 }}>
                          (jusqu'au {new Date(selectedComp.grade_entry_end_date).toLocaleDateString('fr-FR', {
                            day: 'numeric',
                            month: 'long',
                            year: 'numeric'
                          })})
                        </span>
                      )}
                    </Typography>
                  )}
                  {/* ============================================
                      MESSAGES D'EXPIRATION - DÉSACTIVÉS
                      Pour réactiver, décommenter le code ci-dessous
                      ============================================ */}
                  {/* {isExpired && !isAdminAccess && (
                    <Typography variant="body2" sx={{ fontWeight: 600, color: 'error.main', mt: 1 }}>
                      ⛔ Le délai de saisie est expiré depuis {Math.abs(daysRemaining)} jour{Math.abs(daysRemaining) > 1 ? 's' : ''}.
                      {selectedComp.grade_entry_end_date && (
                        <span style={{ display: 'block', marginTop: '4px', fontSize: '0.875rem', fontWeight: 400 }}>
                          Le délai était du {selectedComp.grade_entry_start_date ? new Date(selectedComp.grade_entry_start_date).toLocaleDateString('fr-FR', {
                            day: 'numeric',
                            month: 'long'
                          }) : 'N/A'} au {new Date(selectedComp.grade_entry_end_date).toLocaleDateString('fr-FR', {
                            day: 'numeric',
                            month: 'long',
                            year: 'numeric'
                          })}.
                        </span>
                      )}
                      Veuillez contacter l'administration pour toute modification.
                    </Typography>
                  )} */}
                  {/* {notStarted && !isAdminAccess && (
                    <Typography variant="body2" sx={{ fontWeight: 600, color: 'warning.main', mt: 1 }}>
                      ⏳ Le délai de saisie n'a pas encore commencé.
                      {selectedComp.grade_entry_start_date && (
                        <span style={{ display: 'block', marginTop: '4px', fontSize: '0.875rem', fontWeight: 400 }}>
                          La saisie sera possible à partir du {new Date(selectedComp.grade_entry_start_date).toLocaleDateString('fr-FR', {
                            day: 'numeric',
                            month: 'long',
                            year: 'numeric'
                          })}.
                        </span>
                      )}
                    </Typography>
                  )} */}
                  {/* ============================================
                      MESSAGE ADMIN - DÉSACTIVÉ
                      Pour réactiver, décommenter le code ci-dessous
                      ============================================ */}
                  {/* {isAdminAccess && (isExpired || notStarted) && (
                    <Typography variant="body2" sx={{ fontWeight: 600, color: 'info.main', mt: 1, fontStyle: 'italic' }}>
                      🔧 Accès administrateur : Vous pouvez modifier les notes même après l'expiration du délai.
                    </Typography>
                  )} */}
                </Box>
              )}
            </Alert>
          );
        })()}

        {/* Informations de sélection pour mode par matière */}
        {classId && selectedSubject && selectedComposition && (
          <Alert severity="success" sx={{ mb: 3 }}>
            <Typography variant="body2">
              <strong>Classe:</strong> {classInfo?.name} | 
              <strong> Matière:</strong> {selectedSubjectName} | 
              <strong> Composition:</strong> {selectedCompositionName}
            </Typography>
            {Object.keys(existingGrades).length > 0 && (
              <Typography variant="body2" sx={{ mt: 1 }}>
                <strong>Notes publiées:</strong> {Object.values(existingGrades).filter(g => g.is_published).length} sur {Object.keys(existingGrades).length}
                {Object.values(existingGrades).every(g => g.is_published) && Object.keys(existingGrades).length > 0 && (
                  <Chip 
                    label="🔒 Toutes les notes sont publiées et protégées" 
                    color="success" 
                    size="small" 
                    sx={{ ml: 1 }}
                  />
                )}
                {Object.values(existingGrades).some(g => g.is_published) && !Object.values(existingGrades).every(g => g.is_published) && (
                  <Chip 
                    label="⚠️ Certaines notes sont protégées" 
                    color="warning" 
                    size="small" 
                    sx={{ ml: 1 }}
                  />
                )}
                {Object.keys(existingGrades).length > 0 && !Object.values(existingGrades).some(g => g.is_published) && (
                  <Chip 
                    label="📝 Aucune note publiée" 
                    color="info" 
                    size="small" 
                    sx={{ ml: 1 }}
                  />
                )}
              </Typography>
            )}
          </Alert>
        )}

        {/* Mode par matière (optionnel) */}
        {classId && selectedSubject && selectedComposition && (
          <Paper elevation={2} sx={{ mt: 3 }}>
            <Box sx={{ p: 2, borderBottom: '1px solid #e0e0e0' }}>
              <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <PersonIcon />
                {preSelectedStudentName 
                  ? `Notes de ${preSelectedStudentName} - ${selectedSubjectName} - ${selectedCompositionName}`
                  : `Saisie des notes - ${classInfo?.name} - ${selectedSubjectName} - ${selectedCompositionName}`
                }
              </Typography>
            </Box>

            {loading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', p: { xs: 2, md: 4 } }}>
                <CircularProgress />
              </Box>
            ) : (
              <Box sx={{ width: '100%', overflowX: 'auto', '-webkit-overflow-scrolling': 'touch' }}>
                <Table sx={{ minWidth: 600 }}>
                  <TableHead>
                    <TableRow sx={{ '& .MuiTableCell-root': { bgcolor: '#f5f5f5', fontWeight: 'bold', fontSize: { xs: '0.75rem', sm: '0.875rem' }, py: { xs: 1, sm: 1.5 }, px: { xs: 0.5, sm: 1 } } }}>
                      <TableCell sx={{ minWidth: { xs: 40, sm: 50 } }}>N°</TableCell>
                      <TableCell sx={{ minWidth: { xs: 120, sm: 150 } }}>Nom et Prénom</TableCell>
                      <TableCell align="center" sx={{ minWidth: { xs: 100, sm: 120 } }}>Note (/{getSubjectMaxScore(selectedSubjectName)})</TableCell>
                      <TableCell align="center" sx={{ minWidth: { xs: 80, sm: 100 } }}>Statut</TableCell>
                      <TableCell align="center" sx={{ minWidth: { xs: 100, sm: 120 } }}>Publication</TableCell>
                    </TableRow>
                  </TableHead>
                <TableBody>
                  {(() => {
                    const filteredStudents = preSelectedStudentId ? students.filter(s => s.id === preSelectedStudentId) : students;
                    
                    if (filteredStudents.length === 0 && preSelectedStudentId) {
                      return [
                        <TableRow key="no-student">
                          <TableCell colSpan={5} align="center">
                            <Typography variant="body2" color="text.secondary" sx={{ py: 4 }}>
                              📚 Élève "{preSelectedStudentName}" non trouvé dans cette classe.
                              <br />
                              Veuillez vérifier que l'élève est bien inscrit pour cette année scolaire.
                            </Typography>
                          </TableCell>
                        </TableRow>
                      ];
                    }
                    
                    return filteredStudents.map((student, index) => (
                      <TableRow 
                        key={student.id} 
                        hover
                        sx={{
                          backgroundColor: recentlyUpdated.has(student.id) 
                            ? 'rgba(76, 175, 80, 0.1)' // Vert clair pour les récemment mis à jour
                            : 'inherit',
                          border: recentlyUpdated.has(student.id)
                            ? '2px solid rgba(76, 175, 80, 0.3)'
                            : 'none',
                          transition: 'all 0.3s ease'
                        }}
                      >
                      <TableCell sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' }, py: { xs: 1, sm: 1.5 }, px: { xs: 0.5, sm: 1 } }}>{index + 1}</TableCell>
                      <TableCell sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' }, py: { xs: 1, sm: 1.5 }, px: { xs: 0.5, sm: 1 } }}>
                        <Typography fontWeight={500} sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, alignItems: { xs: 'flex-start', sm: 'center' }, gap: { xs: 0.5, sm: 1 }, fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>
                          <span>{student.last_name} {student.first_name}</span>
                          {recentlyUpdated.has(student.id) && (
                            <Chip 
                              label="✨ Mis à jour" 
                              size="small" 
                              color="success"
                              variant="outlined"
                              sx={{ 
                                fontSize: { xs: '0.6rem', sm: '0.65rem' },
                                height: { xs: '18px', sm: '20px' },
                                animation: 'glow 2s ease-in-out infinite',
                                '@keyframes glow': {
                                  '0%, 100%': { boxShadow: '0 0 5px rgba(76, 175, 80, 0.5)' },
                                  '50%': { boxShadow: '0 0 10px rgba(76, 175, 80, 0.8)' }
                                }
                              }}
                            />
                          )}
                        </Typography>
                      </TableCell>
                      <TableCell align="center" sx={{ py: { xs: 1, sm: 1.5 }, px: { xs: 0.5, sm: 1 } }}>
                        <TextField
                          type="number"
                          size="small"
                          value={
                            grades[student.id] !== undefined
                              ? grades[student.id]
                              : (existingGrades[student.id]?.grade !== undefined
                                  ? existingGrades[student.id].grade
                                  : '')
                          }
                          onChange={(e) => handleGradeChange(student.id, e.target.value)}
                          disabled={
                            (() => {
                              // Les admins peuvent toujours modifier, même les notes publiées
                              if (isAdminAccess) return false;
                              
                              // ============================================
                              // VÉRIFICATION DU DÉLAI DE SAISIE - DÉSACTIVÉE
                              // Pour réactiver, décommenter le code ci-dessous
                              // ============================================
                              // Vérifier le délai de saisie
                              // const selectedComp = compositions.find(c => c.id === selectedComposition);
                              // if (selectedComp && selectedComp.can_enter_grades === 0) {
                              //   return true; // Désactiver si délai expiré
                              // }
                              
                              // Désactiver si publié
                              return existingGrades[student.id]?.is_published || false;
                            })()
                          }
                          InputProps={{
                            endAdornment: (
                              <InputAdornment position="end" sx={{ fontSize: { xs: '0.7rem', sm: '0.875rem' } }}>
                                /{getSubjectMaxScore(selectedSubjectName)}
                              </InputAdornment>
                            )
                          }}
                          inputProps={{ 
                            min: 0, 
                            max: getSubjectMaxScore(selectedSubjectName), 
                            step: 0.25,
                            style: { textAlign: 'center' }
                          }}
                          sx={{ 
                            width: { xs: 90, sm: 120 },
                            '& .MuiInputBase-input': {
                              fontSize: { xs: '0.75rem', sm: '0.875rem' },
                              padding: { xs: '6px 8px', sm: '8px 12px' }
                            },
                            '& .MuiInputBase-input:disabled': {
                              backgroundColor: '#f0f0f0',
                              color: '#666'
                            }
                          }}
                          placeholder="--"
                          helperText={existingGrades[student.id]?.is_published ? 'Publié' : ''}
                        />
                      </TableCell>
                      <TableCell align="center" sx={{ py: { xs: 1, sm: 1.5 }, px: { xs: 0.5, sm: 1 } }}>
                        {(() => {
                          const max = getSubjectMaxScore(selectedSubjectName);
                          const value = grades[student.id] !== undefined
                            ? grades[student.id]
                            : (existingGrades[student.id]?.grade !== undefined ? existingGrades[student.id].grade : undefined);
                          return value !== undefined ? (
                          <Chip 
                            label={Number(value) >= (max / 2) ? 'Admis' : 'Échec'} 
                            color={Number(value) >= (max / 2) ? 'success' : 'error'}
                            size="small"
                            sx={{ fontSize: { xs: '0.65rem', sm: '0.75rem' }, height: { xs: '20px', sm: '24px' } }}
                          />
                          ) : (
                          <Chip label="Non noté" color="default" size="small" sx={{ fontSize: { xs: '0.65rem', sm: '0.75rem' }, height: { xs: '20px', sm: '24px' } }} />
                          );
                        })()}
                      </TableCell>
                      <TableCell align="center" sx={{ py: { xs: 1, sm: 1.5 }, px: { xs: 0.5, sm: 1 } }}>
                        {existingGrades[student.id] ? (
                          <Chip 
                            label={
                              existingGrades[student.id].is_published 
                                ? (isAdminAccess ? '✏️ Publié' : '🔒 Publié') 
                                : '📝 Non publié'
                            } 
                            color={
                              existingGrades[student.id].is_published 
                                ? (isAdminAccess ? 'info' : 'success') 
                                : 'warning'
                            }
                            size="small"
                            icon={existingGrades[student.id].is_published ? <PublishIcon sx={{ fontSize: { xs: '0.875rem', sm: '1rem' } }} /> : undefined}
                            sx={{
                              fontWeight: existingGrades[student.id].is_published ? 600 : 400,
                              fontSize: { xs: '0.65rem', sm: '0.75rem' },
                              height: { xs: '20px', sm: '24px' },
                              '& .MuiChip-label': {
                                padding: { xs: '0 6px', sm: '0 8px' }
                              }
                            }}
                          />
                        ) : (
                          <Chip label="Pas de note" color="default" size="small" sx={{ fontSize: { xs: '0.65rem', sm: '0.75rem' }, height: { xs: '20px', sm: '24px' } }} />
                        )}
                      </TableCell>
                      </TableRow>
                    ));
                  })()}
                </TableBody>
              </Table>
              </Box>
            )}

            {/* Actions - Conditionnelles selon les permissions */}
            <Box sx={{ 
              p: { xs: 1, sm: 2 }, 
              display: 'flex', 
              flexDirection: { xs: 'column', sm: 'row' },
              justifyContent: 'flex-end', 
              gap: { xs: 1, sm: 2 } 
            }}>
              {/* Les admins ont toujours accès aux boutons de modification */}
              {isAdminAccess ? (
                // Mode admin : toujours accès aux modifications
                <>
                  <Alert severity="success" sx={{ flexGrow: 1, mr: { xs: 0, sm: 2 }, mb: { xs: 1, sm: 0 }, fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>
                    <Typography variant="body2" sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>
                      🔧 Mode Administrateur : Vous pouvez modifier toutes les notes, même publiées.
                    </Typography>
                  </Alert>
                  <Button
                    variant="contained"
                    startIcon={saving ? <CircularProgress size={20} /> : <SaveIcon />}
                    onClick={handleSaveGrades}
                    disabled={saving || Object.keys(grades).length === 0}
                    color="primary"
                    sx={{ 
                      fontSize: { xs: '0.75rem', sm: '0.875rem' },
                      width: { xs: '100%', sm: 'auto' },
                      minWidth: { xs: '100%', sm: 'auto' }
                    }}
                  >
                    {saving ? 'Sauvegarde...' : 'Sauvegarder les notes'}
                  </Button>
                  <Button
                    variant="contained"
                    startIcon={publishing ? <CircularProgress size={20} /> : <PublishIcon />}
                    onClick={handlePublishGrades}
                    disabled={
                      publishing || 
                      saving || 
                      (Object.keys(grades).length === 0 && Object.keys(existingGrades).length === 0)
                    }
                    color="success"
                    sx={{
                      bgcolor: 'success.main',
                      '&:hover': { bgcolor: 'success.dark' },
                      '&.Mui-disabled': {
                        bgcolor: '#ccc',
                        color: '#666'
                      },
                      fontSize: { xs: '0.75rem', sm: '0.875rem' },
                      width: { xs: '100%', sm: 'auto' },
                      minWidth: { xs: '100%', sm: 'auto' }
                    }}
                  >
                    {publishing ? 'Publication...' : 'Publier les notes'}
                  </Button>
                </>
              ) : (
                // Mode modification normal
                <>
                  <Button
                    variant="contained"
                    startIcon={saving ? <CircularProgress size={20} /> : <SaveIcon />}
                    onClick={handleSaveGrades}
                    disabled={(() => {
                      // ============================================
                      // VÉRIFICATION DU DÉLAI DE SAISIE - DÉSACTIVÉE
                      // Pour réactiver, décommenter le code ci-dessous
                      // ============================================
                      // const selectedComp = compositions.find(c => c.id === selectedComposition);
                      // const deadlineExpired = selectedComp && selectedComp.can_enter_grades === 0 && !isAdminAccess;
                      // return saving || Object.keys(grades).length === 0 || deadlineExpired;
                      return saving || Object.keys(grades).length === 0;
                    })()}
                    color="primary"
                    sx={{ 
                      fontSize: { xs: '0.75rem', sm: '0.875rem' },
                      width: { xs: '100%', sm: 'auto' },
                      minWidth: { xs: '100%', sm: 'auto' }
                    }}
                  >
                    {saving ? 'Sauvegarde...' : 'Sauvegarder les notes'}
                  </Button>
                  <Button
                    variant="contained"
                    startIcon={publishing ? <CircularProgress size={20} /> : <PublishIcon />}
                    onClick={handlePublishGrades}
                    disabled={(() => {
                      // ============================================
                      // VÉRIFICATION DU DÉLAI DE SAISIE - DÉSACTIVÉE
                      // Pour réactiver, décommenter le code ci-dessous
                      // ============================================
                      // const selectedComp = compositions.find(c => c.id === selectedComposition);
                      // const deadlineExpired = selectedComp && selectedComp.can_enter_grades === 0 && !isAdminAccess;
                      return publishing || 
                        saving || 
                        (Object.keys(grades).length === 0 && Object.keys(existingGrades).length === 0) ||
                        (Object.keys(existingGrades).length > 0 && Object.values(existingGrades).every(g => g.is_published));
                        // || deadlineExpired;
                    })()}
                    color="success"
                    sx={{
                      bgcolor: 'success.main',
                      '&:hover': { bgcolor: 'success.dark' },
                      '&.Mui-disabled': {
                        bgcolor: '#ccc',
                        color: '#666'
                      },
                      fontSize: { xs: '0.75rem', sm: '0.875rem' },
                      width: { xs: '100%', sm: 'auto' },
                      minWidth: { xs: '100%', sm: 'auto' }
                    }}
                  >
                    {publishing ? 'Publication...' : 
                     (Object.keys(existingGrades).length > 0 && Object.values(existingGrades).every(g => g.is_published)) ? 
                     'Notes déjà publiées' : 'Publier les notes'}
                  </Button>
                </>
              )}
            </Box>
            
            {/* Message d'aide pour la publication */}
            <Box sx={{ p: { xs: 1.5, sm: 2 }, bgcolor: '#f5f5f5', borderTop: '1px solid #e0e0e0' }}>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1, fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>
                📝 <strong>Processus :</strong> 1) Saisissez les notes → 2) Sauvegardez → 3) Publiez pour les parents
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1, fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>
                ⚠️ Les parents ne verront les notes qu'après publication. Vous pouvez publier même si toutes les notes ne sont pas saisies.
              </Typography>
              <Typography variant="body2" color="error.main" sx={{ fontWeight: 600, fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>
                🔒 <strong>Important :</strong> Une fois publiées, les notes ne peuvent plus être modifiées ou supprimées !
              </Typography>
            </Box>
          </Paper>
        )}

        {/* Mode par élève: choisir un élève puis saisir toutes ses matières */}
        {classId && selectedComposition && !selectedSubject && (
          <Grid container spacing={{ xs: 2, sm: 3 }} sx={{ mt: { xs: 2, sm: 3 } }}>
            <Grid item xs={12} md={6}>
              <Paper elevation={2} sx={{ mt: { xs: 0, md: 3 } }}>
                <Box sx={{ p: { xs: 1.5, sm: 2 }, borderBottom: '1px solid #e0e0e0' }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: { xs: 1, sm: 2 }, mb: 1 }}>
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1, fontSize: { xs: '1rem', sm: '1.25rem' } }}>
                        <PersonIcon sx={{ fontSize: { xs: '1.25rem', sm: '1.5rem' } }} /> Élèves de {classInfo?.name}
                      </Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' }, mt: 0.5 }}>
                        Cliquez sur un élève pour saisir toutes ses notes ({selectedCompositionName}).
                      </Typography>
                    </Box>
                    <Button
                      variant="contained"
                      color="success"
                      startIcon={publishing ? <CircularProgress size={20} /> : <PublishIcon />}
                      onClick={handlePublishAllGradesForComposition}
                      disabled={publishing || subjects.length === 0}
                      sx={{
                        bgcolor: 'success.main',
                        '&:hover': { bgcolor: 'success.dark' },
                        '&.Mui-disabled': {
                          bgcolor: '#ccc',
                          color: '#666'
                        },
                        fontSize: { xs: '0.7rem', sm: '0.75rem' },
                        minWidth: { xs: 'auto', sm: '180px' },
                        whiteSpace: 'nowrap',
                        mt: { xs: 1, sm: 0 }
                      }}
                    >
                      {publishing ? 'Publication...' : 'Publier Toutes les Notes'}
                    </Button>
                  </Box>
                </Box>
                {loading ? (
                  <Box sx={{ display: 'flex', justifyContent: 'center', p: { xs: 2, sm: 4 } }}>
                    <CircularProgress />
                  </Box>
                ) : (
                  <Box sx={{ width: '100%', overflowX: 'auto', '-webkit-overflow-scrolling': 'touch' }}>
                    <Table sx={{ minWidth: 500 }}>
                      <TableHead>
                        <TableRow sx={{ '& .MuiTableCell-root': { bgcolor: '#f5f5f5', fontWeight: 'bold', fontSize: { xs: '0.75rem', sm: '0.875rem' }, py: { xs: 1, sm: 1.5 }, px: { xs: 0.5, sm: 1 } } }}>
                          <TableCell sx={{ minWidth: { xs: 40, sm: 50 } }}>N°</TableCell>
                          <TableCell sx={{ minWidth: { xs: 120, sm: 150 } }}>Nom et Prénom</TableCell>
                          <TableCell align="center" sx={{ minWidth: { xs: 80, sm: 100 } }}>Moyenne</TableCell>
                          <TableCell align="center" sx={{ minWidth: { xs: 70, sm: 90 } }}>Rang</TableCell>
                          <TableCell align="right" sx={{ minWidth: { xs: 100, sm: 120 } }}>Action</TableCell>
                        </TableRow>
                      </TableHead>
                    <TableBody>
                      {students.map((student, index) => (
                        <TableRow key={student.id} hover selected={selectedStudent === student.id}>
                          <TableCell sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' }, py: { xs: 1, sm: 1.5 }, px: { xs: 0.5, sm: 1 } }}>{index + 1}</TableCell>
                          <TableCell sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' }, py: { xs: 1, sm: 1.5 }, px: { xs: 0.5, sm: 1 } }}>
                            <Typography fontWeight={500} sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>{student.last_name} {student.first_name}</Typography>
                          </TableCell>
                          <TableCell align="center" sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' }, py: { xs: 1, sm: 1.5 }, px: { xs: 0.5, sm: 1 } }}>
                            {studentAverages[student.id]?.averageLabel || '--'}
                          </TableCell>
                          <TableCell align="center" sx={{ py: { xs: 1, sm: 1.5 }, px: { xs: 0.5, sm: 1 } }}>
                            {(() => {
                              const r = studentRanks[student.id];
                              if (!r) return '--';
                              const visual = getRankVisual(r);
                              return (
                                <Chip
                                  label={visual.label}
                                  size="small"
                                  sx={{ bgcolor: visual.bg, color: visual.color, fontWeight: 700, fontSize: { xs: '0.65rem', sm: '0.75rem' }, height: { xs: '20px', sm: '24px' } }}
                                />
                              );
                            })()}
                          </TableCell>
                          <TableCell align="right" sx={{ py: { xs: 1, sm: 1.5 }, px: { xs: 0.5, sm: 1 } }}>
                            {(() => {
                              // ============================================
                              // VÉRIFICATION DU DÉLAI DE SAISIE - DÉSACTIVÉE
                              // Pour réactiver, décommenter le code ci-dessous
                              // ============================================
                              // const selectedComp = compositions.find(c => c.id === selectedComposition);
                              // const deadlineExpired = selectedComp && selectedComp.can_enter_grades === 0 && !isAdminAccess;
                              return (
                                <Button 
                                  variant={selectedStudent === student.id ? 'contained' : 'outlined'} 
                                  size="small" 
                                  onClick={() => setSelectedStudent(student.id)}
                                  sx={{ fontSize: { xs: '0.7rem', sm: '0.875rem' }, minWidth: { xs: 'auto', sm: '120px' }, px: { xs: 1, sm: 2 } }}
                                  // disabled={deadlineExpired && selectedStudent !== student.id}
                                  // title={deadlineExpired ? 'Le délai de saisie est expiré' : ''}
                                >
                                  {selectedStudent === student.id ? 'Sélectionné' : 'Attribuer'}
                                </Button>
                              );
                            })()}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  </Box>
                )}
              </Paper>
            </Grid>

            <Grid item xs={12} md={6}>
              <Paper elevation={2} sx={{ mt: { xs: 2, md: 3 } }}>
                <Box sx={{ p: { xs: 1.5, sm: 2 }, borderBottom: '1px solid #e0e0e0' }}>
                  <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1, fontSize: { xs: '1rem', sm: '1.25rem' }, flexWrap: 'wrap' }}>
                    <AssignmentIcon sx={{ fontSize: { xs: '1.25rem', sm: '1.5rem' } }} />
                    <span style={{ wordBreak: 'break-word' }}>
                      {selectedStudent
                        ? (() => {
                            const st = students.find(s => s.id === selectedStudent);
                            return `Notes de ${st?.last_name || ''} ${st?.first_name || ''} - ${selectedCompositionName}`.trim();
                          })()
                        : 'Sélectionnez un élève pour commencer'}
                    </span>
                  </Typography>
                </Box>
                {!selectedStudent ? (
                  <Box sx={{ p: { xs: 2, sm: 3 } }}>
                    <Alert severity="info" sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>Choisissez un élève à gauche pour saisir ses notes.</Alert>
                  </Box>
                ) : (
                  <>
                    <Box sx={{ width: '100%', overflowX: 'auto', '-webkit-overflow-scrolling': 'touch' }}>
                      <Table sx={{ minWidth: 400 }}>
                        <TableHead>
                          <TableRow sx={{ '& .MuiTableCell-root': { bgcolor: '#f5f5f5', fontWeight: 'bold', fontSize: { xs: '0.75rem', sm: '0.875rem' }, py: { xs: 1, sm: 1.5 }, px: { xs: 0.5, sm: 1 } } }}>
                            <TableCell sx={{ minWidth: { xs: 150, sm: 200 } }}>Matière</TableCell>
                            <TableCell align="center" sx={{ minWidth: { xs: 100, sm: 120 } }}>Note</TableCell>
                            <TableCell align="center" sx={{ minWidth: { xs: 100, sm: 120 } }}>Statut</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {subjects.map((subj) => (
                            <TableRow key={subj.id}>
                              <TableCell sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' }, py: { xs: 1, sm: 1.5 }, px: { xs: 0.5, sm: 1 } }}>
                                <Typography fontWeight={500} sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' }, wordBreak: 'break-word' }}>{subj.name}</Typography>
                              </TableCell>
                              <TableCell align="center" sx={{ py: { xs: 1, sm: 1.5 }, px: { xs: 0.5, sm: 1 } }}>
                                <TextField
                                  type="number"
                                  size="small"
                                  value={
                                    subjectGrades[subj.id] !== undefined
                                      ? subjectGrades[subj.id]
                                      : (existingSubjectGrades[subj.id]?.grade !== undefined
                                          ? existingSubjectGrades[subj.id]!.grade
                                          : '')
                                  }
                                  onChange={(e) => handleSubjectGradeChange(subj.id, e.target.value)}
                                  disabled={(() => {
                                    // Les admins peuvent toujours modifier
                                    if (isAdminAccess) return false;
                                    
                                    // ============================================
                                    // VÉRIFICATION DU DÉLAI DE SAISIE - DÉSACTIVÉE
                                    // Pour réactiver, décommenter le code ci-dessous
                                    // ============================================
                                    // Vérifier le délai de saisie
                                    // const selectedComp = compositions.find(c => c.id === selectedComposition);
                                    // if (selectedComp && selectedComp.can_enter_grades === 0) {
                                    //   return true; // Désactiver si délai expiré
                                    // }
                                    
                                    // Désactiver si publié
                                    return !!existingSubjectGrades[subj.id]?.is_published;
                                  })()}
                                  InputProps={{
                                    endAdornment: (
                                      <InputAdornment position="end" sx={{ fontSize: { xs: '0.7rem', sm: '0.875rem' } }}>
                                        /{getSubjectMaxScore(subj.name)}
                                      </InputAdornment>
                                    )
                                  }}
                                  inputProps={{ min: 0, max: getSubjectMaxScore(subj.name), step: 0.25, style: { textAlign: 'center' } }}
                                  sx={{ 
                                    width: { xs: 90, sm: 120 },
                                    '& .MuiInputBase-input': {
                                      fontSize: { xs: '0.75rem', sm: '0.875rem' },
                                      padding: { xs: '6px 8px', sm: '8px 12px' }
                                    }
                                  }}
                                  placeholder="--"
                                />
                              </TableCell>
                              <TableCell align="center" sx={{ py: { xs: 1, sm: 1.5 }, px: { xs: 0.5, sm: 1 } }}>
                                {existingSubjectGrades[subj.id] ? (
                                  <Chip
                                    label={existingSubjectGrades[subj.id].is_published ? (isAdminAccess ? '✏️ Publié' : '🔒 Publié') : '📝 Non publié'}
                                    color={existingSubjectGrades[subj.id].is_published ? (isAdminAccess ? 'info' : 'success') : 'warning'}
                                    size="small"
                                    sx={{ fontSize: { xs: '0.65rem', sm: '0.75rem' }, height: { xs: '20px', sm: '24px' } }}
                                  />
                                ) : (
                                  <Chip label="Pas de note" size="small" sx={{ fontSize: { xs: '0.65rem', sm: '0.75rem' }, height: { xs: '20px', sm: '24px' } }} />
                                )}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </Box>
                    {/* Résumé Total et Moyenne avec Statistiques de Classe */}
                    {(() => {
                      const { total, totalMax, average } = computeStudentTotals();
                      const st = students.find(s => s.id === selectedStudent);
                      
                      // Calculer les statistiques de la classe
                      // Parcourir tous les élèves de la classe pour calculer les statistiques
                      let totalAverages = 0;
                      let studentsWithGrades = 0;
                      
                      // Trouver la moyenne la plus forte (premier de la classe - rang 1)
                      let highestAverage = 0;
                      let highestStudentId: number | null = null;
                      
                      // Trouver la moyenne la plus faible (dernier de la classe - rang le plus élevé)
                      let lowestAverage = 0;
                      let lowestStudentId: number | null = null;
                      let maxRank = 0;
                      
                      // Parcourir tous les élèves de la classe
                      students.forEach(student => {
                        const avg = studentAverages[student.id];
                        const rank = studentRanks[student.id];
                        
                        // Pour la moyenne de classe : additionner toutes les moyennes (0 si l'élève n'a pas de notes)
                        const studentAverage = (avg && avg.average20 >= 0) ? avg.average20 : 0;
                        totalAverages += studentAverage;
                        
                        // Compter les élèves qui ont des notes
                        if (avg && avg.average20 >= 0) {
                          studentsWithGrades++;
                        }
                        
                        // Trouver l'élève avec le rang 1 (premier de la classe)
                        if (rank === 1 && avg && avg.average20 >= 0) {
                          highestAverage = avg.average20;
                          highestStudentId = student.id;
                        }
                        
                        // Trouver l'élève avec le rang le plus élevé (dernier de la classe)
                        if (rank && rank > maxRank && avg && avg.average20 >= 0) {
                          maxRank = rank;
                          lowestAverage = avg.average20;
                          lowestStudentId = student.id;
                        }
                      });
                      
                      // Calculer la moyenne de la classe : somme de toutes les moyennes / effectif total de la classe
                      const classAverage = students.length > 0
                        ? totalAverages / students.length
                        : 0;
                      
                      // Obtenir le rang de l'élève sélectionné
                      const studentRank = selectedStudent ? studentRanks[selectedStudent] : null;
                      
                      // Formatage selon le type de classe
                      const cls = getClassLabel();
                      const formatAverage = (avg20: number): string => {
                        if (cls.startsWith('CP') || isCELevel(cls) || cls.startsWith('CM1')) {
                          return `${(avg20 / 2).toFixed(2)}/10`;
                        } else if (cls.startsWith('CM2')) {
                          return `${avg20.toFixed(2)}/20`;
                        }
                        return `${avg20.toFixed(2)}/20`;
                      };
                      
                      return (
                        <Box sx={{ p: { xs: 1.5, sm: 2 }, borderTop: '2px solid #e0e0e0', bgcolor: '#f9f9f9' }}>
                          {/* Informations de l'élève sélectionné */}
                          <Box sx={{ mb: { xs: 1.5, sm: 2 }, pb: { xs: 1.5, sm: 2 }, borderBottom: '1px solid #e0e0e0' }}>
                            <Typography variant="body1" sx={{ fontWeight: 700, mb: 1, color: '#1976d2', fontSize: { xs: '0.875rem', sm: '1rem' } }}>
                              Élève sélectionné: {st?.last_name} {st?.first_name}
                            </Typography>
                            <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, justifyContent: 'space-between', alignItems: { xs: 'flex-start', sm: 'center' }, flexWrap: 'wrap', gap: { xs: 1, sm: 2 } }}>
                              <Typography variant="body2" sx={{ fontWeight: 600, fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>
                                Total: {totalMax > 0 ? `${total.toFixed(2)}/${totalMax}` : '--'}
                              </Typography>
                              {average && (
                                <Typography variant="body2" sx={{ fontWeight: 600, color: '#1976d2', fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>
                                  Moyenne: {average}
                                </Typography>
                              )}
                              {studentRank && (
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                  <Typography variant="body2" sx={{ fontWeight: 600, fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>
                                    Rang:
                                  </Typography>
                                  {(() => {
                                    const visual = getRankVisual(studentRank);
                                    return (
                                      <Chip
                                        label={visual.label}
                                        size="small"
                                        sx={{ bgcolor: visual.bg, color: visual.color, fontWeight: 700, fontSize: { xs: '0.65rem', sm: '0.75rem' }, height: { xs: '20px', sm: '24px' } }}
                                      />
                                    );
                                  })()}
                                  <Typography variant="body2" color="text.secondary" sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>
                                    /{students.length}
                                  </Typography>
                                </Box>
                              )}
                            </Box>
                          </Box>
                          
                          {/* Statistiques de la classe */}
                          <Box sx={{ 
                            p: { xs: 1.5, sm: 2 }, 
                            bgcolor: 'white', 
                            borderRadius: { xs: 1, sm: 2 }, 
                            border: '1px solid #e0e0e0',
                            boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
                          }}>
                            <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: { xs: 1.5, sm: 2 }, color: '#1976d2', textTransform: 'uppercase', letterSpacing: 0.5, fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>
                              Statistiques de la Classe ({selectedCompositionName})
                            </Typography>
                            <Grid container spacing={{ xs: 1.5, sm: 2 }}>
                              <Grid item xs={12} sm={6} md={3}>
                                <Paper elevation={1} sx={{ p: { xs: 1, sm: 1.5 }, bgcolor: '#e3f2fd', borderRadius: { xs: 1, sm: 2 } }}>
                                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5, fontSize: { xs: '0.65rem', sm: '0.75rem' } }}>
                                    Moyenne de la Classe
                                  </Typography>
                                  <Typography variant="h6" sx={{ fontWeight: 700, color: '#1976d2', fontSize: { xs: '1rem', sm: '1.25rem' } }}>
                                    {studentsWithGrades > 0 ? formatAverage(classAverage) : '--'}
                                  </Typography>
                                </Paper>
                              </Grid>
                              <Grid item xs={12} sm={6} md={3}>
                                <Paper elevation={1} sx={{ p: { xs: 1, sm: 1.5 }, bgcolor: '#fff3e0', borderRadius: { xs: 1, sm: 2 } }}>
                                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5, fontSize: { xs: '0.65rem', sm: '0.75rem' } }}>
                                    Moyenne la Plus Forte
                                  </Typography>
                                  <Typography variant="h6" sx={{ fontWeight: 700, color: '#f57c00', fontSize: { xs: '1rem', sm: '1.25rem' } }}>
                                    {highestStudentId !== null ? formatAverage(highestAverage) : '--'}
                                  </Typography>
                                </Paper>
                              </Grid>
                              <Grid item xs={12} sm={6} md={3}>
                                <Paper elevation={1} sx={{ p: { xs: 1, sm: 1.5 }, bgcolor: '#ffebee', borderRadius: { xs: 1, sm: 2 } }}>
                                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5, fontSize: { xs: '0.65rem', sm: '0.75rem' } }}>
                                    Moyenne la Plus Faible
                                  </Typography>
                                  <Typography variant="h6" sx={{ fontWeight: 700, color: '#c62828', fontSize: { xs: '1rem', sm: '1.25rem' } }}>
                                    {lowestStudentId !== null ? formatAverage(lowestAverage) : '--'}
                                  </Typography>
                                </Paper>
                              </Grid>
                              <Grid item xs={12} sm={6} md={3}>
                                <Paper elevation={1} sx={{ p: { xs: 1, sm: 1.5 }, bgcolor: '#f1f8e9', borderRadius: { xs: 1, sm: 2 } }}>
                                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5, fontSize: { xs: '0.65rem', sm: '0.75rem' } }}>
                                    Nombre d'Élèves Notés
                                  </Typography>
                                  <Typography variant="h6" sx={{ fontWeight: 700, color: '#558b2f', fontSize: { xs: '1rem', sm: '1.25rem' } }}>
                                    {studentsWithGrades}/{students.length}
                                  </Typography>
                                </Paper>
                              </Grid>
                            </Grid>
                          </Box>
                        </Box>
                      );
                    })()}
                    <Box sx={{ p: { xs: 1.5, sm: 2 }, display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, justifyContent: 'flex-end', gap: { xs: 1, sm: 2 } }}>
                      {(() => {
                        // ============================================
                        // VÉRIFICATION DU DÉLAI DE SAISIE - DÉSACTIVÉE
                        // Pour réactiver, décommenter le code ci-dessous
                        // ============================================
                        // const selectedComp = compositions.find(c => c.id === selectedComposition);
                        // const deadlineExpired = selectedComp && selectedComp.can_enter_grades === 0 && !isAdminAccess;
                        return (
                          <>
                            <Button
                              variant="contained"
                              startIcon={saving ? <CircularProgress size={20} /> : <SaveIcon />}
                              onClick={handleSaveGradesForStudent}
                              disabled={saving || Object.keys(subjectGrades).length === 0}
                              color="primary"
                              sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' }, width: { xs: '100%', sm: 'auto' }, minWidth: { xs: '100%', sm: 'auto' } }}
                            >
                              {saving ? 'Sauvegarde...' : 'Sauvegarder les notes'}
                            </Button>
                            <Button
                              variant="contained"
                              startIcon={publishing ? <CircularProgress size={20} /> : <PublishIcon />}
                              onClick={handlePublishGradesForStudent}
                              disabled={publishing || saving || isSelectedStudentFullyPublished()}
                              color="success"
                              sx={{ bgcolor: 'success.main', '&:hover': { bgcolor: 'success.dark' }, fontSize: { xs: '0.75rem', sm: '0.875rem' }, width: { xs: '100%', sm: 'auto' }, minWidth: { xs: '100%', sm: 'auto' } }}
                            >
                              {publishing ? 'Publication...' : (isSelectedStudentFullyPublished() ? 'Déjà publié' : 'Publier les notes')}
                            </Button>
                          </>
                        );
                      })()}
                    </Box>
                  </>
                )}
              </Paper>
            </Grid>
          </Grid>
        )}

        {/* Messages d'instruction */}
        {classId && !selectedSubject && subjects.length === 0 && (
          <Alert severity="warning" sx={{ mt: 3 }}>
            <Typography variant="body2" sx={{ mb: 2 }}>
              <strong>Aucune matière trouvée pour la classe {classInfo?.name}</strong>
            </Typography>
            <Typography variant="body2" sx={{ mb: 1 }}>
              Cela peut être dû à:
            </Typography>
            <Typography variant="body2" component="div">
              • Vous n'avez pas d'emploi du temps configuré pour cette classe
              <br />
              • Aucune matière ne vous est assignée pour cette classe
              <br />
              • L'emploi du temps n'a pas encore été créé par l'administration
            </Typography>
            <Typography variant="body2" sx={{ mt: 2, fontStyle: 'italic' }}>
              Contactez l'administration pour configurer votre emploi du temps.
            </Typography>
          </Alert>
        )}

        {classId && subjects.length > 0 && !selectedSubject && (
          <Alert severity="info" sx={{ mt: 3 }}>
            <Typography variant="body2" sx={{ mb: 1 }}>
              <strong>Sélectionnez une matière pour commencer la saisie des notes.</strong>
            </Typography>
            <Typography variant="body2">
              <strong>Vos matières dans {classInfo?.name}:</strong> {subjects.map(s => s.name).join(', ')}
            </Typography>
            <Typography variant="body2" sx={{ mt: 1, fontStyle: 'italic', fontSize: '0.85rem' }}>
              Vous ne voyez que les matières pour lesquelles vous avez un emploi du temps dans cette classe.
            </Typography>
          </Alert>
        )}

        {classId && selectedSubject && compositions.length === 0 && (
          <Alert severity="warning" sx={{ mt: 3 }}>
            <Typography variant="body2">
              Aucune composition trouvée pour cette classe.
              <br />
              Contactez l'administration pour créer des compositions.
            </Typography>
          </Alert>
        )}

        {classId && selectedSubject && compositions.length > 0 && compositions.every(c => c.status === 'À venir') && (
          <Alert severity="info" sx={{ mt: 3 }}>
            <Typography variant="body2" sx={{ mb: 1 }}>
              <strong>Toutes les compositions sont futures</strong>
            </Typography>
            <Typography variant="body2" sx={{ mb: 1 }}>
              Les compositions suivantes ne sont pas encore disponibles pour la saisie de notes :
            </Typography>
            <Typography variant="body2" component="div">
              {compositions.map((comp, index) => (
                <div key={comp.id} style={{ marginLeft: '16px' }}>
                  • <strong>{comp.name}</strong> - {new Date(comp.composition_date).toLocaleDateString('fr-FR', {
                    weekday: 'long',
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric'
                  })}
                </div>
              ))}
            </Typography>
            <Typography variant="body2" sx={{ mt: 1, fontStyle: 'italic' }}>
              La saisie des notes sera possible à partir de la date de chaque composition.
            </Typography>
          </Alert>
        )}

        {classId && selectedSubject && compositions.length > 0 && !selectedComposition && (
          <Alert severity="info" sx={{ mt: 3 }}>
            <Typography variant="body2" sx={{ mb: 1 }}>
              Sélectionnez une composition pour saisir les notes.
            </Typography>
            <Typography variant="body2" sx={{ mb: 1 }}>
              <strong>Compositions disponibles:</strong> {compositions.filter(c => c.status !== 'À venir').map(c => c.name).join(', ') || 'Aucune'}
            </Typography>
            {compositions.some(c => c.status === 'À venir') && (
              <Typography variant="body2" sx={{ fontStyle: 'italic', color: 'text.secondary' }}>
                ⚠️ Les compositions futures ({compositions.filter(c => c.status === 'À venir').map(c => c.name).join(', ')}) ne sont pas disponibles pour la saisie de notes.
              </Typography>
            )}
          </Alert>
        )}
      </Paper>

      {/* Snackbar pour les notifications */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert 
          onClose={() => setSnackbar({ ...snackbar, open: false })} 
          severity={snackbar.severity}
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Container>
  );
};

export default GradeManagement;

