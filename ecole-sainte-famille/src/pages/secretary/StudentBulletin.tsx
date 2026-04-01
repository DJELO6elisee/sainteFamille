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
  Button,
  Breadcrumbs,
  Link,
  Grid,
  useTheme,
  Alert,
  CircularProgress,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  Assignment as AssignmentIcon,
  NavigateNext as NavigateNextIcon,
  Print as PrintIcon
} from '@mui/icons-material';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import SecretarySidebar from '../../components/SecretarySidebar';
import axios from 'axios';
import { gradeEventManager } from '../../utils/gradeUpdateEvents';

interface Student {
  id: number;
  first_name: string;
  last_name: string;
  registration_number: string;
  gender: string;
  date_of_birth: string;
  class_name?: string;
  classe_name?: string;
  classe?: string;
  class_id?: number;
}

interface Subject {
  id: number;
  name: string;
  type?: string;
  notes?: number;
  appreciation?: string;
}

interface SubjectGroup {
  name: string;
  subjects: Subject[];
}

const StudentBulletin: React.FC = () => {
  const [student, setStudent] = useState<Student | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const { studentId } = useParams<{ studentId: string }>();
  const location = useLocation();
  const studentName = location.state?.studentName || 'Élève';
  const className = location.state?.className || 'Classe';
  const classIdFromState: number | undefined = location.state?.classId;
  const levelName = useLocation().state?.levelName || 'Niveau';
  const theme = useTheme();
  const bulletinRef = React.useRef<HTMLDivElement>(null);

  const getClassLabel = (): string => {
    return (student?.classe_name || student?.class_name || student?.classe || className || '').toUpperCase();
  };

  // Fonction pour formater la date de composition en français
  const formatCompositionDate = (): string => {
    if (!selectedComposition) {
      return '........................20.....';
    }
    
    const selectedComp = compositions.find(c => c.id.toString() === selectedComposition);
    if (!selectedComp || !selectedComp.composition_date) {
      return '........................20.....';
    }

    try {
      const date = new Date(selectedComp.composition_date);
      if (isNaN(date.getTime())) {
        return '........................20.....';
      }

      const months = [
        'janvier', 'février', 'mars', 'avril', 'mai', 'juin',
        'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'
      ];

      const month = months[date.getMonth()];
      const year = date.getFullYear();
      
      return `${month} ${year}`;
    } catch (error) {
      return '........................20.....';
    }
  };

  const [subjectGroups, setSubjectGroups] = useState<SubjectGroup[]>([]);
  const [allSubjects, setAllSubjects] = useState<Subject[]>([]);

  const [bulletinData, setBulletinData] = useState({
    schoolYear: '',
    moyenneGenerale: '',
    moyenneEleve: '', // Moyenne de l'élève (pour affichage)
    rangGeneral: '',
    moyennePlusElevee: '',
    moyennePlusFaible: '',
    moyenneClasse: '' // Moyenne de toute la classe
  });

  
  const [subjectsLoaded, setSubjectsLoaded] = useState(false);
  
  // États pour le filtrage par compositions
  const [compositions, setCompositions] = useState<any[]>([]);
  const [selectedComposition, setSelectedComposition] = useState<string>('');
  
  // État pour stocker l'effectif total de la classe
  const [totalClassStudents, setTotalClassStudents] = useState<number>(0);
  
  // État pour les notifications de mise à jour en temps réel
  const [updateNotification, setUpdateNotification] = useState<{
    show: boolean;
    message: string;
    timestamp: number;
  }>({ show: false, message: '', timestamp: 0 });

  useEffect(() => {
    if (studentId) {
      fetchStudentData();
      fetchCompositions();
    }
  }, [studentId]);

  // Charger les matières une fois que la classe est connue (élève chargé ou classe en state)
  useEffect(() => {
    if (!studentId) return;
    const label = getClassLabel();
    if (label && label !== 'CLASSE') {
      fetchSubjects();
    }
  }, [studentId, student, className, classIdFromState]);

  useEffect(() => {
    // Charger les notes une fois que les matières sont chargées OU si une composition est sélectionnée
    // On peut charger même si subjectGroups est vide car fetchStudentGrades peut créer les matières manquantes
    if (studentId && subjectsLoaded && selectedComposition) {
      console.log('🔄 [STUDENT BULLETIN] Déclenchement fetchStudentGrades - Composition:', selectedComposition);
      fetchStudentGrades();
      // Forcer la récupération de l'effectif à chaque changement de composition
      if (student) {
        fetchClassStudentsCount();
      }
    }
  }, [studentId, subjectsLoaded, selectedComposition, student]);

  // Écouter les événements de mise à jour des notes en temps réel
  useEffect(() => {
    if (!studentId) return;

    console.log('🎧 [STUDENT BULLETIN] Mise en place de l\'écoute des événements pour élève:', studentId);

    // Écouter les mises à jour de notes individuelles
    const unsubscribeGradeUpdate = gradeEventManager.onGradeUpdate((data) => {
      console.log('🔔 [STUDENT BULLETIN] Événement de mise à jour de note reçu:', data);
      
      // Vérifier si cet événement concerne cet élève
      if (data.studentId === parseInt(studentId)) {
        console.log('✅ [STUDENT BULLETIN] Mise à jour concernant cet élève, rafraîchissement...');
        
        // Afficher une notification de mise à jour
        setUpdateNotification({
          show: true,
          message: `Note ${data.isPublished ? 'publiée' : 'mise à jour'} en temps réel !`,
          timestamp: data.timestamp
        });
        
        // Rafraîchir les données du bulletin avec un petit délai
        setTimeout(() => {
          fetchStudentGrades();
          // Masquer la notification après le rafraîchissement
          setTimeout(() => {
            setUpdateNotification(prev => ({ ...prev, show: false }));
          }, 3000);
        }, 100);
      }
    });

    // Écouter les demandes de rafraîchissement de bulletin
    const unsubscribeBulletinRefresh = gradeEventManager.onBulletinRefresh((data) => {
      console.log('🔄 [STUDENT BULLETIN] Événement de rafraîchissement bulletin reçu:', data);
      
      // Vérifier si cet élève est dans la liste des élèves à rafraîchir
      if (data.studentIds.includes(parseInt(studentId))) {
        console.log('✅ [STUDENT BULLETIN] Rafraîchissement demandé pour cet élève');
        
        // Rafraîchir les données du bulletin
        setTimeout(() => {
          fetchStudentGrades();
        }, 200);
      }
    });

    // Fonction de nettoyage
    return () => {
      console.log('🧹 [STUDENT BULLETIN] Nettoyage des écouteurs d\'événements');
      unsubscribeGradeUpdate();
      unsubscribeBulletinRefresh();
    };
  }, [studentId]);

  const fetchClassStudentsCount = async (studentData?: Student | null) => {
    const studentToUse = studentData || student;
    if (!studentToUse) return;
    
    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      const getCurrentSchoolYear = () => {
        const now = new Date();
        const year = now.getFullYear();
        const month = now.getMonth();
        
        if (month >= 8) {
          return `${year}-${year + 1}`;
        } else {
          return `${year - 1}-${year}`;
        }
      };

      const currentSchoolYear = getCurrentSchoolYear();
      
      // Récupérer l'ID de la classe depuis les données de l'élève
      const classId = studentToUse.class_id || classIdFromState;
      if (!classId) {
        console.warn('⚠️ [STUDENT BULLETIN] Impossible de récupérer l\'ID de la classe');
        return;
      }

      // Récupérer les élèves de la classe - essayer d'abord avec tous les élèves
      let response;
      try {
        // Essayer d'abord avec un endpoint qui retourne tous les élèves (sans filtre de statut)
        response = await axios.get(`https://saintefamilleexcellence.ci/api/classes/${classId}/students?school_year=${currentSchoolYear}&include_all=true`, {
          headers: { Authorization: `Bearer ${token}` }
        });
      } catch (err: any) {
        // Si ça échoue, utiliser l'endpoint standard
        response = await axios.get(`https://saintefamilleexcellence.ci/api/classes/${classId}/students?school_year=${currentSchoolYear}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
      }

      console.log('🔍 [STUDENT BULLETIN] Réponse API élèves de la classe:', response.data);
      
      const students = Array.isArray(response.data) ? response.data : response.data?.students || [];
      const count = students.length;
      
      // Si on a moins que prévu, essayer aussi de récupérer tous les élèves de la classe sans filtre
      if (count < 43) {
        console.log('⚠️ [STUDENT BULLETIN] Effectif semble incomplet, vérification supplémentaire...');
        try {
          // Essayer de récupérer via l'endpoint students avec filtre classe
          const allStudentsResp = await axios.get(`https://saintefamilleexcellence.ci/api/students?class_id=${classId}&school_year=${currentSchoolYear}&include_all=true`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          const allStudents = Array.isArray(allStudentsResp.data) ? allStudentsResp.data : allStudentsResp.data?.data || [];
          console.log('🔍 [STUDENT BULLETIN] Tous les élèves de la classe (sans filtre):', allStudents.length);
          if (allStudents.length > count) {
            console.log('✅ [STUDENT BULLETIN] Effectif corrigé:', allStudents.length, 'au lieu de', count);
            setTotalClassStudents(allStudents.length);
            return allStudents.length;
          }
        } catch (err2: any) {
          console.warn('⚠️ [STUDENT BULLETIN] Impossible de récupérer tous les élèves:', err2);
        }
      }
      
      // Toujours mettre à jour l'effectif même s'il est différent
      console.log('📊 [STUDENT BULLETIN] Nombre d\'élèves trouvés:', count, 'sur', students.length, 'total');
      setTotalClassStudents(count);
      console.log('📊 [STUDENT BULLETIN] Effectif total de la classe mis à jour:', count);
      return count;
    } catch (error: any) {
      console.error('Erreur lors de la récupération de l\'effectif de la classe:', error);
      return 0;
    }
  };

  const fetchStudentData = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      
      if (!token) {
        throw new Error('Token d\'authentification manquant');
      }

      const getCurrentSchoolYear = () => {
        const now = new Date();
        const year = now.getFullYear();
        const month = now.getMonth();
        
        if (month >= 8) {
          return `${year}-${year + 1}`;
        } else {
          return `${year - 1}-${year}`;
        }
      };
      
      const currentSchoolYear = getCurrentSchoolYear();
      const response = await axios.get(`https://saintefamilleexcellence.ci/api/students/${studentId}?school_year=${currentSchoolYear}`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      console.log('Données de l\'élève récupérées:', response.data);
      const studentData = response.data;
      setStudent(studentData);
      
      // Récupérer l'effectif de la classe une fois l'élève chargé
      if (studentData) {
        await fetchClassStudentsCount(studentData);
      }
    } catch (error: any) {
      console.error('Erreur lors de la récupération des données de l\'élève:', error);
      setError(error.response?.data?.message || 'Erreur lors du chargement des données');
    } finally {
      setLoading(false);
    }
  };

  const fetchCompositions = async () => {
    if (!studentId) return;

    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`https://saintefamilleexcellence.ci/api/students/${studentId}/compositions?school_year=2025-2026`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      console.log('🎯 [STUDENT BULLETIN] Compositions récupérées:', response.data);
      const list = Array.isArray(response.data) ? response.data : [];
      setCompositions(list);

      // S'il n'y a pas encore de composition sélectionnée, choisir la plus récente
      if (!selectedComposition && list.length > 0) {
        const latest = [...list].sort((a: any, b: any) => {
          const da = new Date(a.composition_date).getTime();
          const db = new Date(b.composition_date).getTime();
          return db - da; // plus récent en premier
        })[0];
        if (latest?.id) {
          setSelectedComposition(String(latest.id));
        }
      }
    } catch (error: any) {
      console.error('Erreur lors de la récupération des compositions:', error);
      setCompositions([]);
    }
  };

  const calculateStudentRank = async (studentAverage: number) => {
    if (!studentId || !student) {
      console.log('⚠️ [STUDENT BULLETIN] Impossible de calculer le rang - données manquantes');
      return;
    }
    
    // Permettre le calcul même si la moyenne est 0 ou faible
    if (studentAverage < 0 || isNaN(studentAverage)) {
      console.log('⚠️ [STUDENT BULLETIN] Moyenne invalide pour le calcul du rang:', studentAverage);
      return;
    }

    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      const getCurrentSchoolYear = () => {
        const now = new Date();
        const year = now.getFullYear();
        const month = now.getMonth();
        
        if (month >= 8) {
          return `${year}-${year + 1}`;
        } else {
          return `${year - 1}-${year}`;
        }
      };

      const currentSchoolYear = getCurrentSchoolYear();
      const classId = student.class_id || classIdFromState;
      
      if (!classId) {
        console.warn('⚠️ [STUDENT BULLETIN] Impossible de calculer le rang - ID de classe manquant');
        return;
      }

      // Calculer le rang pour la composition sélectionnée (ou toutes les compositions si aucune sélectionnée)
      if (selectedComposition) {
        // L'endpoint API n'existe pas, on calcule directement les moyennes
        let classAverages: Array<{ student_id: number; average: number }> = [];
        
        // Essayer d'abord l'API si elle existe, sinon utiliser le calcul manuel
        try {
          const response = await axios.get(`https://saintefamilleexcellence.ci/api/debug/class-composition-averages/${classId}`, {
            params: {
              composition_id: selectedComposition,
              school_year: currentSchoolYear
            },
            headers: { Authorization: `Bearer ${token}` }
          });

          // Si l'API retourne directement les moyennes
          if (Array.isArray(response.data)) {
            classAverages = response.data;
          } else if (response.data?.averages && Array.isArray(response.data.averages)) {
            classAverages = response.data.averages;
          }
        } catch (apiError: any) {
          // L'API n'existe pas (404), utiliser le calcul manuel
          console.log('ℹ️ [STUDENT BULLETIN] API class-composition-averages non disponible, calcul manuel...');
        }
        
        // Si on n'a pas de moyennes de l'API, calculer manuellement
        if (classAverages.length === 0) {
          // Sinon, récupérer tous les élèves et calculer leurs moyennes
          const studentsResp = await axios.get(`https://saintefamilleexcellence.ci/api/classes/${classId}/students?school_year=${currentSchoolYear}`, {
            headers: { Authorization: `Bearer ${token}` }
          });

          const studentsList = Array.isArray(studentsResp.data) ? studentsResp.data : studentsResp.data?.students || [];
          
          // Calculer la moyenne pour chaque élève
          const averagesPromises = studentsList.map(async (s: any) => {
            try {
              const studentApiUrl = `https://saintefamilleexcellence.ci/api/debug/student-bulletin/${s.id}?trimester=1er trimestre&school_year=${currentSchoolYear}&composition_id=${selectedComposition}`;
              const studentData = await axios.get(studentApiUrl, {
                headers: { Authorization: `Bearer ${token}` }
              });

              const bulletinGrades = Array.isArray(studentData.data?.bulletin_grades) ? studentData.data.bulletin_grades : [];
              
              if (bulletinGrades.length === 0) {
                return { student_id: s.id, average: 0 };
              }

              // Calculer la moyenne de l'élève de la même manière que pour l'élève actuel
              const cls = (student?.classe_name || student?.class_name || student?.classe || '').toUpperCase();
              const isCE = cls.startsWith('CE');
              const isCE2 = cls.startsWith('CE2');
              const isCP = cls.startsWith('CP');
              
              let totalPoints = 0;
              let totalMax = 0;
              let count = 0;

              if (isCE) {
                const targeted = ['EXPLOITATION DE TEXTE','A.E.M','ORTHOGRAPHE','DICTEE','DICTÉE','MATHEMATIQUE','MATHÉMATIQUE'];
                bulletinGrades.forEach((bg: any) => {
                  const name = (bg.subject_name || '').toUpperCase();
                  if (targeted.some(key => name.includes(key))) {
                    // Utiliser la note brute telle qu'elle a été saisie
                    const raw = Number(bg.average) || 0;
                    totalPoints += raw;
                    // Estimer le max selon le nom de la matière (même logique que getSubjectMaxScore)
                    let maxScore = 10;
                    if (name.includes('EXPLOITATION DE TEXTE') || name.includes('A.E.M') || name.includes('MATHEMATIQUE')) {
                      maxScore = 30;
                    } else if (name.includes('ORTHOGRAPHE') || name.includes('DICTEE') || name.includes('DICTÉE')) {
                      maxScore = 20;
                    }
                    totalMax += maxScore;
                    count++;
                  }
                });
                // Calculer la moyenne proportionnelle sur 10: (total / totalMax) * 10
                // Fallback sur les diviseurs fixes si totalMax est incorrect
                const average = count > 0 
                  ? (totalMax > 0 ? (totalPoints / totalMax) * 10 : totalPoints / (isCE2 ? 17 : 11))
                  : 0;
                return { student_id: s.id, average };
              } else if (isCP) {
                const targeted = ['GRAPHISME/ECRITURE','GRAPHISME/ÉCRITURE','DISCRIMINATION VISUELLE','EDHC','MATHEMATIQUE','MATHÉMATIQUE','CHANT/POESIE','CHANT/POÉSIE','DESSIN'];
                bulletinGrades.forEach((bg: any) => {
                  const name = (bg.subject_name || '').toUpperCase();
                  if (targeted.some(key => name.includes(key))) {
                    const raw = Number(bg.average) || 0;
                    totalPoints += (raw / 20) * 10;
                    count++;
                  }
                });
                const average = count > 0 ? totalPoints / 6 : 0;
                return { student_id: s.id, average };
              } else {
                bulletinGrades.forEach((bg: any) => {
                  totalPoints += Number(bg.average) || 0;
                  count++;
                });
                const average = count > 0 ? totalPoints / count : 0;
                return { student_id: s.id, average };
              }
            } catch (err) {
              console.error(`Erreur calcul moyenne élève ${s.id}:`, err);
              return { student_id: s.id, average: 0 };
            }
          });

          classAverages = await Promise.all(averagesPromises);
          console.log('📊 [STUDENT BULLETIN] Moyennes calculées pour', classAverages.length, 'élèves');
        }

        // S'assurer que la moyenne de l'élève actuel est incluse
        const currentStudentInAverages = classAverages.find(a => a.student_id === Number(studentId));
        if (!currentStudentInAverages && studentAverage > 0) {
          console.log('➕ [STUDENT BULLETIN] Ajout de la moyenne de l\'élève actuel au classement');
          classAverages.push({ student_id: Number(studentId), average: studentAverage });
        } else if (currentStudentInAverages && currentStudentInAverages.average === 0 && studentAverage > 0) {
          // Mettre à jour si la moyenne calculée est différente
          currentStudentInAverages.average = studentAverage;
          console.log('🔄 [STUDENT BULLETIN] Mise à jour de la moyenne de l\'élève actuel:', studentAverage);
        }

        // Filtrer les élèves qui ont une moyenne valide (> 0)
        const validAverages = classAverages.filter(a => a.average > 0);
        console.log('📊 [STUDENT BULLETIN] Élèves avec moyenne valide (>0):', validAverages.length, 'sur', classAverages.length);
        
        // Si l'élève est le seul avec une moyenne, son rang est 1
        if (validAverages.length === 1 && validAverages[0].student_id === Number(studentId)) {
          const singleAverage = validAverages[0].average.toFixed(2);
          setBulletinData(prev => ({ 
            ...prev, 
            rangGeneral: '1',
            moyennePlusElevee: singleAverage,
            moyennePlusFaible: singleAverage,
            moyenneClasse: singleAverage
          }));
          console.log('🏆 [STUDENT BULLETIN] Élève seul avec moyenne - Rang: 1, Moyennes extrêmes:', singleAverage);
          return;
        }

        // Trier par moyenne décroissante
        validAverages.sort((a, b) => b.average - a.average);
        console.log('📊 [STUDENT BULLETIN] Classement (3 premiers):', validAverages.slice(0, 3).map(a => ({ id: a.student_id, avg: a.average })));
        
        // Trouver le rang de l'élève
        const studentIndex = validAverages.findIndex(a => a.student_id === Number(studentId));
        const rank = studentIndex >= 0 ? studentIndex + 1 : 0;
        
        if (rank > 0) {
          // Calculer les moyennes la plus élevée et la plus faible à partir du classement
          const highestAvg = validAverages[0].average.toFixed(2);
          const lowestAvg = validAverages[validAverages.length - 1].average.toFixed(2);
          
          // Calculer la moyenne de la classe (somme de toutes les moyennes / nombre d'élèves)
          const totalClassAverage = validAverages.reduce((sum, a) => sum + a.average, 0);
          const classAverage = validAverages.length > 0 ? (totalClassAverage / validAverages.length).toFixed(2) : '0.00';
          
          setBulletinData(prev => ({ 
            ...prev, 
            rangGeneral: String(rank),
            moyennePlusElevee: highestAvg,
            moyennePlusFaible: lowestAvg,
            moyenneClasse: classAverage
          }));
          console.log('🏆 [STUDENT BULLETIN] Rang calculé:', rank, 'sur', validAverages.length, 'élèves avec moyenne');
          console.log('📊 [STUDENT BULLETIN] Moyenne de l\'élève:', studentAverage, '| Index dans le classement:', studentIndex);
          console.log('📊 [STUDENT BULLETIN] Liste complète des rangs:', validAverages.slice(0, 10).map((a, idx) => `#${idx+1}: Élève ${a.student_id} (${a.average.toFixed(2)})`).join(', '));
          console.log('📊 [STUDENT BULLETIN] Moyennes extrêmes recalculées - Plus élevée:', highestAvg, '| Plus faible:', lowestAvg, '| Moyenne classe:', classAverage);
        } else {
          console.warn('⚠️ [STUDENT BULLETIN] Élève non trouvé dans le classement. StudentId:', studentId);
          console.warn('⚠️ [STUDENT BULLETIN] IDs dans validAverages:', validAverages.map(a => a.student_id));
          // Si l'élève a une moyenne mais n'est pas dans le classement, l'ajouter
          if (studentAverage > 0) {
            console.log('🔄 [STUDENT BULLETIN] Tentative de recalcul avec moyenne fournie...');
            validAverages.push({ student_id: Number(studentId), average: studentAverage });
            validAverages.sort((a, b) => b.average - a.average);
            const newRank = validAverages.findIndex(a => a.student_id === Number(studentId)) + 1;
            if (newRank > 0) {
              setBulletinData(prev => ({ ...prev, rangGeneral: String(newRank) }));
              console.log('✅ [STUDENT BULLETIN] Rang recalculé:', newRank);
            }
          }
        }
      } else {
        // Pas de composition sélectionnée, utiliser le rang du backend s'il existe
        console.log('ℹ️ [STUDENT BULLETIN] Aucune composition sélectionnée, calcul du rang pour toutes les compositions');
        
        // Calculer le rang même sans composition spécifique
        // Récupérer tous les élèves et calculer leurs moyennes générales
        try {
          const studentsResp = await axios.get(`https://saintefamilleexcellence.ci/api/classes/${classId}/students?school_year=${currentSchoolYear}`, {
            headers: { Authorization: `Bearer ${token}` }
          });

          const studentsList = Array.isArray(studentsResp.data) ? studentsResp.data : studentsResp.data?.students || [];
          
          // Calculer la moyenne pour chaque élève (sans composition spécifique)
          const averagesPromises = studentsList.map(async (s: any) => {
            try {
              const studentApiUrl = `https://saintefamilleexcellence.ci/api/debug/student-bulletin/${s.id}?trimester=1er trimestre&school_year=${currentSchoolYear}`;
              const studentData = await axios.get(studentApiUrl, {
                headers: { Authorization: `Bearer ${token}` }
              });

              const bulletinGrades = Array.isArray(studentData.data?.bulletin_grades) ? studentData.data.bulletin_grades : [];
              
              if (bulletinGrades.length === 0) {
                return { student_id: s.id, average: 0 };
              }

              // Calculer la moyenne de l'élève de la même manière
              const cls = (student?.classe_name || student?.class_name || student?.classe || '').toUpperCase();
              const isCE = cls.startsWith('CE');
              const isCE2 = cls.startsWith('CE2');
              const isCP = cls.startsWith('CP');
              
              let totalPoints = 0;
              let totalMax = 0;
              let count = 0;

              if (isCE) {
                const targeted = ['EXPLOITATION DE TEXTE','A.E.M','ORTHOGRAPHE','DICTEE','DICTÉE','MATHEMATIQUE','MATHÉMATIQUE'];
                bulletinGrades.forEach((bg: any) => {
                  const name = (bg.subject_name || '').toUpperCase();
                  if (targeted.some(key => name.includes(key))) {
                    const raw = Number(bg.average) || 0;
                    totalPoints += raw;
                    // Estimer le max selon le nom de la matière
                    let maxScore = 10;
                    if (name.includes('EXPLOITATION DE TEXTE') || name.includes('A.E.M') || name.includes('MATHEMATIQUE')) {
                      maxScore = 30;
                    } else if (name.includes('ORTHOGRAPHE') || name.includes('DICTEE') || name.includes('DICTÉE')) {
                      maxScore = 20;
                    }
                    totalMax += maxScore;
                    count++;
                  }
                });
                // Calculer la moyenne proportionnelle sur 10: (total / totalMax) * 10
                // Fallback sur les diviseurs fixes si totalMax est incorrect
                const average = count > 0 
                  ? (totalMax > 0 ? (totalPoints / totalMax) * 10 : totalPoints / (isCE2 ? 17 : 11))
                  : 0;
                return { student_id: s.id, average };
              } else if (isCP) {
                const targeted = ['GRAPHISME/ECRITURE','GRAPHISME/ÉCRITURE','DISCRIMINATION VISUELLE','EDHC','MATHEMATIQUE','MATHÉMATIQUE','CHANT/POESIE','CHANT/POÉSIE','DESSIN'];
                bulletinGrades.forEach((bg: any) => {
                  const name = (bg.subject_name || '').toUpperCase();
                  if (targeted.some(key => name.includes(key))) {
                    const raw = Number(bg.average) || 0;
                    totalPoints += (raw / 20) * 10;
                    count++;
                  }
                });
                const average = count > 0 ? totalPoints / 6 : 0;
                return { student_id: s.id, average };
              } else {
                bulletinGrades.forEach((bg: any) => {
                  totalPoints += Number(bg.average) || 0;
                  count++;
                });
                const average = count > 0 ? totalPoints / count : 0;
                return { student_id: s.id, average };
              }
            } catch (err) {
              console.error(`Erreur calcul moyenne élève ${s.id}:`, err);
              return { student_id: s.id, average: 0 };
            }
          });

          const allAverages = await Promise.all(averagesPromises);
          const validAverages = allAverages.filter(a => a.average > 0);
          
          if (validAverages.length === 1 && validAverages[0].student_id === Number(studentId)) {
            const singleAverage = validAverages[0].average.toFixed(2);
            setBulletinData(prev => ({ 
              ...prev, 
              rangGeneral: '1',
              moyennePlusElevee: singleAverage,
              moyennePlusFaible: singleAverage
            }));
            console.log('🏆 [STUDENT BULLETIN] Élève seul avec moyenne - Rang: 1, Moyennes extrêmes:', singleAverage);
          } else {
            validAverages.sort((a, b) => b.average - a.average);
            const studentIndex = validAverages.findIndex(a => a.student_id === Number(studentId));
            const rank = studentIndex >= 0 ? studentIndex + 1 : 0;
            
            if (rank > 0) {
              setBulletinData(prev => ({ ...prev, rangGeneral: String(rank) }));
              console.log('🏆 [STUDENT BULLETIN] Rang calculé (sans composition):', rank, 'sur', validAverages.length);
              
              // Les moyennes la plus élevée et la plus faible sont maintenant calculées par le backend
              // et transmises via l'API dans fetchStudentGrades
            }
          }
        } catch (err) {
          console.error('Erreur calcul rang sans composition:', err);
        }
      }
    } catch (error: any) {
      console.error('Erreur lors du calcul du rang:', error);
      // Ne pas mettre à jour le rang en cas d'erreur
    }
  };

  const fetchSubjects = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('Token d\'authentification manquant');
      }
      // Toujours utiliser l'API bulletin-subjects
      const allResp = await axios.get('https://saintefamilleexcellence.ci/api/bulletin-subjects', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const allBulletinSubjects = Array.isArray(allResp.data) ? allResp.data : [];
      // Filtrer selon la classe de l'élève puis level_group strictement
      const classLabel = getClassLabel();
      const isCP = /^CP(\s|\d|$)/.test(classLabel); // gère CP, CP1, CP1 A, CP2 B, etc.
      let filtered: any[] = [];
      if (isCP) {
        // Stricte : CP -> uniquement level_group === 'cp'
        filtered = allBulletinSubjects
          .filter((s: any) => s.level_group === 'cp')
          .sort((a: any, b: any) => (a.display_order || 0) - (b.display_order || 0));
      } else {
        // CE/CM -> uniquement level_group === 'ce_cm'
        filtered = allBulletinSubjects
          .filter((s: any) => s.level_group === 'ce_cm')
          .sort((a: any, b: any) => (a.display_order || 0) - (b.display_order || 0));
      }
      const mapped: Subject[] = filtered.map((s: any) => ({
        id: s.subject_id || s.id,
        name: s.name,
        type: 'bulletin',
      }));
      setAllSubjects(mapped);
      const groupedSubjects = groupSubjectsByCategory(mapped, student?.classe_name || student?.class_name || student?.classe);
      setSubjectGroups(groupedSubjects);
      setSubjectsLoaded(true);
      console.log('Matières bulletin strictement filtrées pour cette classe :', mapped);
    } catch (error: any) {
      console.error('Erreur lors de la récupération des matières (bulletin_subjects):', error);
      setAllSubjects([]);
      setSubjectGroups([]);
      setSubjectsLoaded(true);
    }
  };

  const groupSubjectsByCategory = (subjects: Subject[], className?: string): SubjectGroup[] => {
    // Les matières fournies par l'API bulletin sont déjà filtrées par niveau/classe
    return subjects.length > 0 ? [{ name: 'MATIÈRES', subjects }] : [];
  };

  const fetchStudentGrades = async () => {
    try {
      console.log('🔥 [STUDENT BULLETIN] === RÉCUPÉRATION NOTES (bulletin_subjects) ===');
      console.log('📚 [STUDENT BULLETIN] SubjectGroups actuel:', subjectGroups);

      // Paramètres du backend (le backend attend un trimestre et une année scolaire)
      const trimester = '1er trimestre';
      const schoolYear = '2025-2026';

      // Construire l'URL avec composition si sélectionnée
      let apiUrl = `https://saintefamilleexcellence.ci/api/debug/student-bulletin/${studentId}?trimester=${encodeURIComponent(trimester)}&school_year=${encodeURIComponent(schoolYear)}`;
      if (selectedComposition) {
        apiUrl += `&composition_id=${selectedComposition}`;
      }

      // Appel unique: récupère les moyennes par matière (liées à bulletin_subjects)
      const { data } = await axios.get(apiUrl);

      console.log('📥 [STUDENT BULLETIN] Données reçues de l\'API:', data);

      // Extraire le rang de la réponse API (mais on va le recalculer)
      const generalRank = data?.general_rank || data?.rank || null;
      
      // Ne pas utiliser l'effectif de l'API car il peut être incorrect
      // On récupérera toujours depuis la classe directement

      const bulletinGrades: Array<{ subject_id: number; average: number; subject_name?: string }>
        = Array.isArray(data?.bulletin_grades) ? data.bulletin_grades : [];

      console.log('📊 [STUDENT BULLETIN] Bulletin grades:', bulletinGrades);

      // Construire des dictionnaires pour correspondance par ID et par nom
      // IMPORTANT: Certaines matières peuvent partager le même ID, donc on utilise aussi un mapping combiné ID+nom
      const subjectIdToAverage: Record<number, number> = {};
      const subjectNameToAverage: Record<string, number> = {};
      const subjectIdNameToAverage: Record<string, number> = {}; // Mapping combiné ID+nom pour éviter les conflits
      
      // Fonction pour normaliser les noms de matières (enlever accents, espaces, etc.)
      const normalizeSubjectName = (name: string): string => {
        return name
          .toUpperCase()
          .trim()
          .replace(/[ÉÈÊË]/g, 'E')
          .replace(/[ÀÂÄ]/g, 'A')
          .replace(/[ÎÏ]/g, 'I')
          .replace(/[ÔÖ]/g, 'O')
          .replace(/[ÙÛÜ]/g, 'U')
          .replace(/[Ç]/g, 'C')
          .replace(/\s+/g, ' ')
          .replace(/\//g, '/');
      };
      
      bulletinGrades.forEach((row) => {
        const sid = Number(row.subject_id);
        const avg = Number(row.average);
        const originalName = (row.subject_name || '').toUpperCase().trim();
        const normalizedName = normalizeSubjectName(row.subject_name || '');
        
        if (!isNaN(sid) && !isNaN(avg)) {
          // Stocker par ID (mais attention, plusieurs matières peuvent avoir le même ID)
          if (subjectIdToAverage[sid] === undefined) {
            subjectIdToAverage[sid] = avg;
          }
          
          // Stocker par ID+nom combiné (clé unique pour éviter les conflits)
          const idNameKey = `${sid}:${normalizedName}`;
          subjectIdNameToAverage[idNameKey] = avg;
        }
        
        if (normalizedName && !isNaN(avg)) {
          // Stocker à la fois le nom normalisé et le nom original (au cas où)
          subjectNameToAverage[normalizedName] = avg;
          subjectNameToAverage[originalName] = avg;
        }
      });

      console.log('🔑 [STUDENT BULLETIN] Mappings créés - Par ID:', subjectIdToAverage);
      console.log('🔑 [STUDENT BULLETIN] Mappings créés - Par Nom:', subjectNameToAverage);
      console.log('🔑 [STUDENT BULLETIN] Mappings créés - Par ID+Nom:', subjectIdNameToAverage);

      // Assurer la présence de toutes les matières renvoyées par l'API bulletin_grades
      const existingSubjects = subjectGroups.flatMap(g => g.subjects);
      const existingIds = new Set(existingSubjects.map(s => s.id));
      const existingNames = new Set(existingSubjects.map(s => (s.name || '').toUpperCase().trim()));
      const existingNormalizedNames = new Set(existingSubjects.map(s => normalizeSubjectName(s.name || '')));
      
      console.log('📝 [STUDENT BULLETIN] Matières existantes - IDs:', Array.from(existingIds));
      console.log('📝 [STUDENT BULLETIN] Matières existantes - Noms:', Array.from(existingNames));
      console.log('📝 [STUDENT BULLETIN] Matières existantes - Noms normalisés:', Array.from(existingNormalizedNames));

      const missingSubjects: Subject[] = bulletinGrades
        .filter(bg => {
          const bgId = Number(bg.subject_id);
          const bgName = (bg.subject_name || '').toUpperCase().trim();
          const bgNormalizedName = normalizeSubjectName(bg.subject_name || '');
          return !existingIds.has(bgId) && !existingNames.has(bgName) && !existingNormalizedNames.has(bgNormalizedName);
        })
        .map(bg => ({
          id: Number(bg.subject_id),
          name: bg.subject_name || String(bg.subject_id),
          type: 'bulletin'
        }));

      console.log('➕ [STUDENT BULLETIN] Matières manquantes à ajouter:', missingSubjects);

      let mergedGroups = subjectGroups;
      if (missingSubjects.length > 0) {
        if (mergedGroups.length === 0) {
          mergedGroups = [{ name: 'MATIÈRES', subjects: [] }];
        }
        mergedGroups = mergedGroups.map((g, idx) => idx === 0 ? { ...g, subjects: [...g.subjects, ...missingSubjects] } : g);
      }

      // Fonction pour normaliser les noms de matières (enlever accents, espaces, etc.)
      const normalizeSubjectNameForMatch = (name: string): string => {
        return name
          .toUpperCase()
          .trim()
          .replace(/[ÉÈÊË]/g, 'E')
          .replace(/[ÀÂÄ]/g, 'A')
          .replace(/[ÎÏ]/g, 'I')
          .replace(/[ÔÖ]/g, 'O')
          .replace(/[ÙÛÜ]/g, 'U')
          .replace(/[Ç]/g, 'C')
          .replace(/\s+/g, ' ')
          .replace(/\//g, '/');
      };

      // Appliquer les moyennes aux matières
      // PRIORITÉ: 1) ID+Nom combiné (le plus précis), 2) Nom (spécifique), 3) ID (peut être ambigu)
      const updatedGroups = mergedGroups.map(group => ({
        ...group,
        subjects: group.subjects.map(subject => {
          const subjectId = subject.id;
          const subjectName = (subject.name || '').toUpperCase().trim();
          const normalizedName = normalizeSubjectNameForMatch(subject.name || '');
          
          let note: number | undefined = undefined;
          let matchMethod = '';
          
          // PRIORITÉ 1: Chercher d'abord par ID+Nom combiné (le plus précis, évite les conflits)
          const idNameKey = `${subjectId}:${normalizedName}`;
          if (subjectIdNameToAverage[idNameKey] !== undefined) {
            note = subjectIdNameToAverage[idNameKey];
            matchMethod = 'ID+Nom combiné';
          }
          
          // PRIORITÉ 2: Chercher par nom normalisé (spécifique et unique généralement)
          if (note === undefined && normalizedName) {
            if (subjectNameToAverage[normalizedName] !== undefined) {
              note = subjectNameToAverage[normalizedName];
              matchMethod = 'Nom normalisé';
            }
          }
          
          // PRIORITÉ 3: Chercher par nom original (au cas où)
          if (note === undefined && subjectName) {
            if (subjectNameToAverage[subjectName] !== undefined) {
              note = subjectNameToAverage[subjectName];
              matchMethod = 'Nom original';
            }
          }
          
          // PRIORITÉ 4: En dernier recours, chercher par ID seulement (peut être ambigu)
          if (note === undefined) {
            if (subjectIdToAverage[subjectId] !== undefined) {
              note = subjectIdToAverage[subjectId];
              matchMethod = 'ID (peut être ambigu)';
              console.warn(`⚠️ [STUDENT BULLETIN] Note trouvée par ID uniquement pour "${subject.name}" (ID: ${subjectId}). Cela peut être ambigu si plusieurs matières partagent cet ID.`);
            }
          }
          
          // Log pour debug
          if (note !== undefined) {
            console.log(`✅ [STUDENT BULLETIN] Note trouvée pour "${subject.name}" (ID: ${subjectId}): ${note} [Méthode: ${matchMethod}]`);
            
            // Les notes sont déjà au bon barème dans la base de données, pas besoin de conversion
            // const maxScore = getSubjectMaxScore(subject.name);
            // if (maxScore && note) {
            //   note = (note / 20) * maxScore;
            //   console.log(`🔄 [STUDENT BULLETIN] Note convertie de /20 vers barème: ${note}/${maxScore}`);
            // }
          } else {
            console.log(`❌ [STUDENT BULLETIN] Aucune note trouvée pour "${subject.name}" (ID: ${subjectId})`);
            console.log(`   Recherche effectuée avec: ID+Nom="${idNameKey}", Nom="${subjectName}", Nom normalisé="${normalizedName}"`);
            console.log(`   IDs disponibles dans les notes:`, Object.keys(subjectIdToAverage).map(k => Number(k)));
            console.log(`   Noms disponibles dans les notes:`, Object.keys(subjectNameToAverage));
          }
          
          return {
            ...subject,
            notes: note,
            appreciation: undefined
          };
        })
      }));

      console.log('✅ [STUDENT BULLETIN] Groupes mis à jour avec les notes:', updatedGroups);

      setSubjectGroups(updatedGroups);
      const calculatedAverage = calculateTotalAndAverage(updatedGroups);

      // Calculer le rang dynamiquement en fonction de la composition sélectionnée
      // Cette fonction calcule aussi les moyennes extrêmes et la moyenne de classe
      await calculateStudentRank(calculatedAverage);

      // Normaliser quelques champs d'entête si absents
      const cls = (student?.classe_name || student?.class_name || student?.classe || '').toUpperCase();
      setBulletinData(prev => ({
        ...prev,
        schoolYear: prev.schoolYear || schoolYear
        // Ne pas écraser les valeurs calculées par calculateStudentRank
      }));
      
      // Toujours récupérer l'effectif depuis la classe pour s'assurer qu'il est correct
      // Attendre que l'effectif soit récupéré avant d'afficher
      const effectifCount = await fetchClassStudentsCount();
      console.log('📊 [STUDENT BULLETIN] Effectif récupéré après fetch:', effectifCount);
    } catch (error: any) {
      console.error('Erreur lors de la récupération des notes:', error);
      
      // En cas d'erreur, afficher un bulletin vide pour l'admin
      const emptyGroups = subjectGroups.map(group => ({
        ...group,
        subjects: group.subjects.map(subject => ({
          ...subject,
          notes: undefined,
          appreciation: undefined
        }))
      }));
      
      setSubjectGroups(emptyGroups);
      const cls = (student?.classe_name || student?.class_name || student?.classe || '').toUpperCase();
      setBulletinData(prev => ({
        ...prev,
        moyenneGenerale: '—',
        moyenneEleve: '—',
        moyenneClasse: '—',
        rangGeneral: '',
        moyennePlusElevee: (cls.startsWith('CE') || cls.startsWith('CP')) ? '00/10' : '00/20',
        moyennePlusFaible: (cls.startsWith('CE') || cls.startsWith('CP')) ? '00/10' : '00/20'
      }));
    }
  };

  const calculateTotalAndAverage = (groups: SubjectGroup[]) => {
    const cls = (student?.classe_name || student?.class_name || student?.classe || '').toUpperCase();
    const isCE = isCELevel(cls);
    const isCP = cls.startsWith('CP');

    if (isCP) {
      // CP: Total uniquement sur 6 matières, toutes notées sur 10
      const targeted = [
        'GRAPHISME/ECRITURE',
        'GRAPHISME/ÉCRITURE',
        'DISCRIMINATION VISUELLE',
        'EDHC',
        'MATHEMATIQUE',
        'MATHÉMATIQUE',
        'CHANT/POESIE',
        'CHANT/POÉSIE',
        'DESSIN'
      ];
      let totalPoints = 0;
      groups.forEach(g => g.subjects.forEach(subject => {
        const name = (subject.name || '').toUpperCase();
        if (targeted.some(key => name.includes(key))) {
          const note = typeof subject.notes === 'number' ? subject.notes : 0; // déjà au bon barème
          totalPoints += note;
        }
      }));
      const moyenne = (totalPoints / 6).toFixed(2); // moyenne sur 10
      const moyenneNum = parseFloat(moyenne);
      setBulletinData(prev => ({
        ...prev,
        moyenneGenerale: totalPoints.toFixed(2), // total sur 60
        moyenneEleve: moyenne
        // Ne pas écraser moyenneClasse ici, elle sera mise à jour par calculateStudentRank
      }));
      return moyenneNum;
    }

    
    if (isCE) {
      // On prend uniquement 4 matières pour le total
      const targeted = ['EXPLOITATION DE TEXTE','A.E.M','ORTHOGRAPHE','DICTEE','DICTÉE','MATHEMATIQUE','MATHÉMATIQUE'];
      const isCE2 = cls.startsWith('CE2');
      let totalPoints = 0;
      let totalMax = 0;
      groups.forEach(g => g.subjects.forEach(subject => {
        const name = (subject.name||'').toUpperCase();
        if (targeted.some(key => name.includes(key))) {
          // Prend la note telle qu'affichée, sur le bon barème
          const note = typeof subject.notes === 'number' ? subject.notes : 0;
          totalPoints += note;
          // Calculer le total maximum pour cette matière
          const maxScore = getSubjectMaxScore(subject.name);
          totalMax += maxScore;
        }
      }));

      // Calculer la moyenne proportionnelle sur 10: (total / totalMax) * 10
      // Pour CE1: totalMax devrait être 110 (30+30+20+30), pour CE2: 110 aussi (mais diviseur 17)
      // Si totalMax est 0 ou incorrect, utiliser les diviseurs par défaut
      let moyenneEleve = '0.00';
      if (totalMax > 0) {
        moyenneEleve = ((totalPoints / totalMax) * 10).toFixed(2);
      } else {
        // Fallback: utiliser les diviseurs par défaut si totalMax n'est pas calculable
        moyenneEleve = (totalPoints / (isCE2 ? 17 : 11)).toFixed(2);
      }
      const moyenneNum = parseFloat(moyenneEleve);
      setBulletinData(prev => ({
        ...prev,
        moyenneGenerale: totalPoints.toFixed(2),
        moyenneEleve: moyenneEleve
        // Ne pas écraser moyenneClasse ici, elle sera mise à jour par calculateStudentRank
      }));
      return moyenneNum;
    }
    // Calcule le total/moyenne en respectant le barème saisi par les enseignants
    const subjectsWithGrades = groups.flatMap(g => g.subjects).filter(s => typeof s.notes === 'number') as Array<Subject & { notes: number }>;

    if (subjectsWithGrades.length === 0) {
      setBulletinData(prev => ({ ...prev, moyenneGenerale: '—', moyenneEleve: '—', moyenneClasse: '—' }));
      return 0;
    }

    let totalPoints = 0;

    if (cls.startsWith('CM1') || cls.startsWith('CM2')) {
      // Pour CM1/CM2: on exclut LECTURE, ANGLAIS, EPS et CONDUITE du total
      const excluded = ['LECTURE', 'ANGLAIS', 'EPS', 'E.P.S', 'CONDUITE'];
      totalPoints = subjectsWithGrades.reduce((sum, s) => {
        const name = (s.name || '').toUpperCase();
        if (excluded.some(ex => name.includes(ex))) {
          return sum; // ne pas compter ces matières dans le total 170
        }
        return sum + (s.notes || 0);
      }, 0);
    } else {
      // Autres classes: les notes sont déjà au bon barème, on les additionne directement
      totalPoints = subjectsWithGrades.reduce((sum, s) => {
        // Pas besoin de conversion, les notes sont déjà au bon barème
        return sum + (s.notes || 0);
      }, 0);
    }

    let moyenneAffichee = '';
    let moyenneNum = 0;
    if (cls.startsWith('CM1')) {
      moyenneAffichee = (totalPoints / 17).toFixed(2); // moyenne sur 10
      moyenneNum = parseFloat(moyenneAffichee);
    } else if (cls.startsWith('CM2')) {
      moyenneAffichee = (totalPoints / 8.5).toFixed(2); // moyenne sur 20
      moyenneNum = parseFloat(moyenneAffichee);
    } else {
      const allGrades = subjectsWithGrades.map(s => s.notes);
      moyenneNum = allGrades.reduce((a, b) => a + b, 0) / allGrades.length;
      moyenneAffichee = moyenneNum.toFixed(2);
    }

    setBulletinData(prev => ({
      ...prev,
      moyenneGenerale: totalPoints.toFixed(2),
      moyenneEleve: moyenneAffichee
      // Ne pas écraser moyenneClasse ici, elle sera mise à jour par calculateStudentRank
    }));
    return moyenneNum;
  };

  const handlePrint = () => {
    if (bulletinRef.current) {
      const printContents = bulletinRef.current.innerHTML;
      
      const printWindow = window.open('', '', 'height=700,width=900');
      if (printWindow) {
        printWindow.document.write(`
          <html>
            <head>
              <title>Bulletin Scolaire - ${student?.first_name} ${student?.last_name}</title>
              <style>
                body { 
                  font-family: Arial, sans-serif; 
                  margin: 20px;
                  font-size: 12px;
                }
                table { 
                  border-collapse: collapse; 
                  width: 100%;
                  margin: 10px 0;
                }
                td, th { 
                  border: 1px solid #000; 
                  padding: 6px;
                  text-align: left;
                }
                th {
                  background-color: #f5f5f5;
                  font-weight: bold;
                  text-align: center;
                }
                .vertical-text {
                  writing-mode: vertical-rl;
                  text-orientation: mixed;
                  text-align: center;
                  font-weight: bold;
                  background-color: #f8f9fa;
                }
                .center { text-align: center; }
                .bold { font-weight: bold; }
                .italic { font-style: italic; }
                @media print {
                  body { margin: 0; }
                  .no-print { display: none; }
                }
              </style>
            </head>
            <body>
              ${printContents}
            </body>
          </html>
        `);
        printWindow.document.close();
        printWindow.focus();
        
        setTimeout(() => {
          printWindow.print();
          printWindow.close();
        }, 500);
      }
    }
  };

  // Détermine si la classe est CE (CE1/CE2)
  const isCELevel = (classeName: string): boolean => {
    const label = (classeName || '').toUpperCase();
    return label.startsWith('CE');
  };

  // Détermine le barème à afficher pour une matière selon la classe
  const getSubjectMaxScore = (subjectName: string): number => {
    const cls = (student?.classe_name || student?.class_name || student?.classe || '').toUpperCase();
    if (cls.startsWith('CP')) {
      return 10; // CP: toutes les matières sur 10
    }
    if (isCELevel(cls)) {
      const name = (subjectName || '').toUpperCase();
      if (name.includes('EXPLOITATION DE TEXTE')) return 30;
      if (name.includes('A.E.M')) return 30;
      if (name.includes('ORTHOGRAPHE') || name.includes('DICTEE') || name.includes('DICTÉE')) return 20;
      if (name.includes('MATHEMATIQUE') || name.includes('MATHÉMATIQUE')) return 30;
      // Autres : 10 sauf EPS = 20
      if (name.includes('EPS') || name.includes('E.P.S')) return 20;
      return 10;
    }
    const isCE1CE2 = cls.startsWith('CE1') || cls.startsWith('CE2');
    const isCM1CM2 = cls.startsWith('CM1') || cls.startsWith('CM2');
    if (isCE1CE2) {
      const name = (subjectName || '').toUpperCase();
      if (name.includes('EXPLOITATION DE TEXTE')) return 30;
      if (name.includes('A.E.M')) return 30;
      if (name.includes('ORTHOGRAPHE') || name.includes('DICTEE') || name.includes('DICTÉE')) return 20;
      if (name.includes('MATHEMATIQUE') || name.includes('MATHÉMATIQUE')) return 30;
      if (name.includes('LECTURE')) return 10;
      if (name.includes('ANGLAIS')) return 10;
      if (name.includes('CONDUITE')) return 10;
    }
    if (isCM1CM2) {
      const name = (subjectName || '').toUpperCase();
      if (name.includes('EXPLOITATION DE TEXTE')) return 50;
      if (name.includes('A.E.M')) return 50;
      if (name.includes('ORTHOGRAPHE') || name.includes('DICTEE') || name.includes('DICTÉE')) return 20;
      if (name.includes('MATHEMATIQUE') || name.includes('MATHÉMATIQUE')) return 50;
      if (name.includes('LECTURE')) return 10;
      if (name.includes('ANGLAIS')) return 10;
      if (name.includes('CONDUITE')) return 10;
    }
    return 20; // barème par défaut
  };

  const getTotalMaxScoreForClass = (): number => {
    const cls = (student?.classe_name || student?.class_name || student?.classe || '').toUpperCase();
    if (cls.startsWith('CP')) return 60; // 6 matières x 10
    if (isCELevel(cls)) return 110;
    const isCM1CM2 = cls.startsWith('CM1') || cls.startsWith('CM2');
    if (isCM1CM2) return 170; // total imposé pour CM1–CM2
    // Par défaut, somme des barèmes des matières affichées
    const subjects = subjectGroups.flatMap(g => g.subjects);
    return subjects.reduce((sum, s) => sum + getSubjectMaxScore(s.name), 0);
  };

  const handleBack = () => {
    navigate(-1);
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex' }}>
        <SecretarySidebar />
        <Box component="main" sx={{ flexGrow: 1, p: 3, backgroundColor: '#f5f5f5', minHeight: '100vh' }}>
          <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
            <CircularProgress size={60} />
          </Box>
        </Box>
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ display: 'flex' }}>
        <SecretarySidebar />
        <Box component="main" sx={{ flexGrow: 1, p: 3, backgroundColor: '#f5f5f5', minHeight: '100vh' }}>
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
          <Button
            variant="outlined"
            startIcon={<ArrowBackIcon />}
            onClick={handleBack}
          >
            Retour
          </Button>
        </Box>
      </Box>
    );
  }

  return (
    <Box sx={{ display: 'flex' }}>
      <SecretarySidebar />
      <Box component="main" sx={{ flexGrow: 1, p: 3, backgroundColor: '#f5f5f5', minHeight: '100vh' }}>
        <Paper elevation={3} sx={{ p: 4, borderRadius: 3, boxShadow: '0 8px 32px rgba(0,0,0,0.1)' }}>
          {/* Breadcrumbs - Non imprimable */}
          <Breadcrumbs
            separator={<NavigateNextIcon fontSize="small" />}
            sx={{ mb: 3 }}
            className="no-print"
          >
            <Link
              component="button"
              variant="body1"
              onClick={() => navigate('/secretary/bulletins')}
              sx={{ textDecoration: 'none' }}
            >
              Gestion des Bulletins
            </Link>
            <Link
              component="button"
              variant="body1"
              onClick={handleBack}
              sx={{ textDecoration: 'none' }}
            >
              {levelName}
            </Link>
            <Typography color="text.primary">Bulletin - {studentName}</Typography>
          </Breadcrumbs>

          {/* Notification de mise à jour en temps réel */}
          {updateNotification.show && (
            <Alert 
              severity="success" 
              sx={{ 
                mb: 3,
                animation: 'pulse 1s ease-in-out',
                '@keyframes pulse': {
                  '0%': { transform: 'scale(1)' },
                  '50%': { transform: 'scale(1.02)' },
                  '100%': { transform: 'scale(1)' }
                }
              }}
              className="no-print"
            >
              <Typography variant="body2" sx={{ fontWeight: 600 }}>
                🔄 {updateNotification.message}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Mis à jour à {new Date(updateNotification.timestamp).toLocaleTimeString('fr-FR')}
              </Typography>
            </Alert>
          )}

          {/* Contrôles de filtrage - Non imprimable */}
          <Paper elevation={2} sx={{ p: 3, mb: 3 }} className="no-print">
            <Typography variant="h6" fontWeight={600} mb={2}>
              Filtres du Bulletin
            </Typography>
            <Grid container spacing={3} alignItems="center">
              {/* Sélecteur de composition */}
              <Grid item xs={12} sm={6} md={4}>
                <FormControl fullWidth>
                  <InputLabel>Composition</InputLabel>
                  <Select
                    value={selectedComposition}
                    label="Composition"
                    onChange={(e) => setSelectedComposition(e.target.value)}
                  >
                    <MenuItem value="">Sélectionner une composition</MenuItem>
                    {compositions.map((composition) => (
                      <MenuItem key={composition.id} value={composition.id.toString()}>
                        {composition.name} ({new Date(composition.composition_date).toLocaleDateString('fr-FR')})
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>

              {/* Informations sur les compositions disponibles */}
              <Grid item xs={12} sm={6} md={4}>
                <Chip 
                  label={`${compositions.length} composition${compositions.length > 1 ? 's' : ''} disponible${compositions.length > 1 ? 's' : ''}`}
                  color="info"
                  variant="outlined"
                />
              </Grid>
            </Grid>
          </Paper>

          {/* En-tête - Non imprimable */}
          <Box sx={{ mb: 4, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }} className="no-print">
            <Box>
              <Typography variant="h4" component="h1" gutterBottom sx={{ 
                fontWeight: 'bold', 
                background: 'linear-gradient(45deg, #2e7d32 30%, #4caf50 90%)',
                backgroundClip: 'text',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                display: 'flex',
                alignItems: 'center',
                gap: 2,
                mb: 2
              }}>
                <AssignmentIcon fontSize="large" sx={{ color: '#2e7d32' }} />
                Bulletin Scolaire
              </Typography>
              <Typography variant="h6" color="text.secondary" gutterBottom>
                {student?.first_name} {student?.last_name} - {student?.classe_name || student?.class_name || student?.classe || (className !== 'Classe' ? className : 'Classe non définie')}
              </Typography>
              <Typography variant="body2" color="primary.main" fontWeight={600}>
                {selectedComposition 
                  ? `Bulletin de composition - ${compositions.find(c => c.id.toString() === selectedComposition)?.name || 'Composition sélectionnée'}`
                  : 'Sélectionnez une composition pour afficher le bulletin'
                }
              </Typography>
            </Box>
            
            <Box sx={{ display: 'flex', gap: 2 }}>
              <Button
                variant="outlined"
                startIcon={<ArrowBackIcon />}
                onClick={handleBack}
              >
                Retour
              </Button>
              <Button
                variant="outlined"
                startIcon={<PrintIcon />}
                onClick={handlePrint}
                color="primary"
              >
                Imprimer
              </Button>
            </Box>
          </Box>

          {/* Debug info - Non imprimable */}
          {process.env.NODE_ENV === 'development' && (
            <Alert severity="info" sx={{ mb: 2 }} className="no-print">
              Debug: {subjectGroups.length} groupes de matières trouvés. 
              Total matières: {allSubjects.length}
            </Alert>
          )}

          {/* Contenu imprimable du bulletin */}
          <div ref={bulletinRef}>
            <Paper sx={{ border: '2px solid #000', borderRadius: 2 }}>
              {/* En-tête avec Mois et Nombre d'absences */}
              <Box sx={{ display: 'flex', borderBottom: '1px solid #000' }}>
                <Box sx={{ flex: 1, p: 1, borderRight: '1px solid #000', textAlign: 'center' }}>
                  <Typography variant="body2" sx={{ fontStyle: 'italic', fontWeight: 'bold' }}>
                    Mois de: {formatCompositionDate()}
                  </Typography>
                </Box>
                <Box sx={{ flex: 1, p: 1, textAlign: 'center' }}>
                  <Typography variant="body2" sx={{ fontStyle: 'italic', fontWeight: 'bold' }}>
                    Nombre d'absences: ........................
                  </Typography>
                </Box>
              </Box>

              {/* Informations personnelles de l'enfant */}
              <Box sx={{ p: 2, borderBottom: '1px solid #000' }}>
                <Grid container spacing={2}>
                  <Grid item xs={6}>
                    <Typography variant="body2" sx={{ mb: 1 }}>
                      <strong>Nom & Prénoms:</strong> {student?.last_name} {student?.first_name}
                    </Typography>
                    <Typography variant="body2" sx={{ mb: 1 }}>
                      <strong>Matricule:</strong> {student?.registration_number}
                    </Typography>
                    <Typography variant="body2" sx={{ mb: 1 }}>
                      <strong>Classe:</strong> {student?.classe_name || student?.class_name || student?.classe || (className !== 'Classe' ? className : '........................')}
                    </Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="body2" sx={{ mb: 1 }}>
                      <strong>Date de naissance:</strong> {student?.date_of_birth ? (() => {
                        try {
                          // Si c'est au format DD/MM/YYYY (format du backend)
                          if (/^\d{2}\/\d{2}\/\d{4}$/.test(student.date_of_birth)) {
                            return student.date_of_birth;
                          }
                          // Sinon, convertir en date et formater
                          const date = new Date(student.date_of_birth);
                          return isNaN(date.getTime()) ? '........................' : date.toLocaleDateString('fr-FR');
                        } catch (error) {
                          return '........................';
                        }
                      })() : '........................'}
                    </Typography>
                    <Typography variant="body2" sx={{ mb: 1 }}>
                      <strong>Genre:</strong> {student?.gender === 'M' ? 'Masculin' : student?.gender === 'F' ? 'Féminin' : '........................'}
                    </Typography>
                  </Grid>
                </Grid>
              </Box>

              {/* Titre Composition Mensuelle */}
              <Box sx={{ p: 2, borderBottom: '1px solid #000', textAlign: 'center' }}>
                <Typography variant="h6" sx={{ fontWeight: 'bold', fontStyle: 'italic' }}>
                  Composition Mensuelle
                </Typography>
              </Box>

              {/* Tableau des matières avec structure correcte */}
              <Table sx={{ '& td, & th': { border: '1px solid #000' } }}>
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 'bold', textAlign: 'center', fontSize: '0.9rem', width: '50%' }}>
                      Matières
                    </TableCell>
                    <TableCell sx={{ fontWeight: 'bold', textAlign: 'center', fontSize: '0.9rem', width: '15%' }}>
                      Notes
                    </TableCell>
                    <TableCell sx={{ fontWeight: 'bold', textAlign: 'center', fontSize: '0.9rem', width: '35%' }}>
                      Appréciations et Visa du Maître
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {(() => {
                    const cls = (student?.classe_name || student?.class_name || student?.classe || '').toUpperCase();
                    const allSubjectsFlat = subjectGroups.flatMap(g => g.subjects);
                    const subjectsToDisplay = cls.startsWith('CE')
                      ? allSubjectsFlat.filter(s => {
                          const n = (s.name || '').toUpperCase();
                          return !(n.includes('EPS') || n.includes('E.P.S'));
                        })
                      : allSubjectsFlat;
                    return subjectsToDisplay.map((subject, idx) => (
                      <TableRow key={`${subject.name}-${idx}`}>
                        <TableCell sx={{ fontSize: '0.85rem', py: 0.5 }}>{subject.name}</TableCell>
                        <TableCell sx={{ textAlign: 'center', fontSize: '0.85rem', py: 0.5 }}>
                          {typeof subject.notes === 'number' 
                            ? `${subject.notes}/${getSubjectMaxScore(subject.name)}`
                            : '—'}
                        </TableCell>
                        {idx === 0 && (
                          <TableCell 
                            rowSpan={Math.max(1, subjectsToDisplay.length)}
                            sx={{ 
                              fontWeight: 'bold', 
                              fontSize: '0.9rem',
                              textAlign: 'center',
                              verticalAlign: 'middle',
                              fontStyle: 'italic',
                              backgroundColor: '#f8f9fa'
                            }}
                          >
                            Visa du Directeur
                          </TableCell>
                        )}
                      </TableRow>
                    ));
                  })()}

                  {/* Ligne Total */}
                  <TableRow>
                    <TableCell sx={{ fontWeight: 'bold', fontSize: '0.9rem', py: 0.5 }}>
                      Total
                    </TableCell>
                    <TableCell sx={{ textAlign: 'center', fontWeight: 'bold', fontSize: '0.9rem', py: 0.5 }}>
                      {bulletinData.moyenneGenerale || '—'}{bulletinData.moyenneGenerale ? `/${getTotalMaxScoreForClass()}` : ''}
                    </TableCell>
                    <TableCell 
                      rowSpan={4}
                      sx={{ 
                        fontWeight: 'bold', 
                        fontSize: '0.9rem',
                        textAlign: 'center',
                        verticalAlign: 'middle',
                        fontStyle: 'italic',
                        backgroundColor: '#f8f9fa'
                      }}
                    >
                      Visa des Parents
                    </TableCell>
                  </TableRow>

                  {/* Section moyennes */}
                  <TableRow>
                    <TableCell colSpan={2} sx={{ fontSize: '0.8rem', py: 0.5, fontStyle: 'italic' }}>
                      <strong>Moyenne:</strong> {bulletinData.moyenneEleve || bulletinData.moyenneClasse || '......'}{(bulletinData.moyenneEleve || bulletinData.moyenneClasse) ? ((() => {
                        const cls = (student?.classe_name || student?.class_name || student?.classe || '').toUpperCase();
                        if (cls.startsWith('CP')) return '/10';
                        if (cls.startsWith('CM1')) return '/10';
                        if (cls.startsWith('CM2')) return '/20';
                        if (cls.startsWith('CE')) return '/10';
                        return '';
                      })()) : ''} &nbsp;&nbsp;&nbsp; <strong>Rang:</strong> {(() => {
                        // Si on a un rang, afficher avec l'effectif
                        if (bulletinData.rangGeneral) {
                          return totalClassStudents > 0 
                            ? `${bulletinData.rangGeneral}/${totalClassStudents}` 
                            : `${bulletinData.rangGeneral}/0`;
                        }
                        // Sinon, afficher 00/effectif (par défaut 00/0 si effectif non connu)
                        return totalClassStudents > 0 ? `00/${totalClassStudents}` : '00/0';
                      })()}
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell colSpan={2} sx={{ fontSize: '0.8rem', py: 0.5, fontStyle: 'italic' }}>
                      <strong>Moyenne la plus élevée:</strong> {bulletinData.moyennePlusElevee || '......'}
                      {(() => {
                        // Ne pas ajouter le suffixe si la valeur contient déjà "/" (ex: "00/10")
                        if (bulletinData.moyennePlusElevee && !bulletinData.moyennePlusElevee.includes('/')) {
                          const cls = (student?.classe_name || student?.class_name || student?.classe || '').toUpperCase();
                          if (cls.startsWith('CP')) return '/10';
                          if (cls.startsWith('CE')) return '/10';
                          return '/20';
                        }
                        return '';
                      })()}
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell colSpan={2} sx={{ fontSize: '0.8rem', py: 0.5, fontStyle: 'italic' }}>
                      <strong>Moyenne la plus faible:</strong> {bulletinData.moyennePlusFaible || '......'}
                      {(() => {
                        // Ne pas ajouter le suffixe si la valeur contient déjà "/" (ex: "00/10")
                        if (bulletinData.moyennePlusFaible && !bulletinData.moyennePlusFaible.includes('/')) {
                          const cls = (student?.classe_name || student?.class_name || student?.classe || '').toUpperCase();
                          if (cls.startsWith('CP')) return '/10';
                          if (cls.startsWith('CE')) return '/10';
                          return '/20';
                        }
                        return '';
                      })()}
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell colSpan={2} sx={{ fontSize: '0.8rem', py: 0.5, fontStyle: 'italic' }}>
                      <strong>Moyenne de la classe:</strong> {bulletinData.moyenneClasse || '......'}{bulletinData.moyenneClasse ? ((() => {
                        const cls = (student?.classe_name || student?.class_name || student?.classe || '').toUpperCase();
                        if (cls.startsWith('CP')) return '/10';
                        if (cls.startsWith('CE')) return '/10';
                        return '';
                      })()) : ''}
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </Paper>
          </div>

        </Paper>
      </Box>
    </Box>
  );
};

export default StudentBulletin;

