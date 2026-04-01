import React, { useState, useEffect, useRef } from 'react';
import {
  Box,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Grid,
  Alert,
  CircularProgress,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  Button,
  IconButton,
  Tooltip
} from '@mui/material';
import DescriptionIcon from '@mui/icons-material/Description';
import PrintIcon from '@mui/icons-material/Print';
import DownloadIcon from '@mui/icons-material/Download';
import axios from 'axios';
import useAuth from '../hooks/useAuth';
import { gradeEventManager } from '../utils/gradeUpdateEvents';
import { useReactToPrint } from 'react-to-print';

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
}

interface Subject {
  id: number;
  name: string;
  type?: string;
  notes?: number | string; // Peut être un nombre ou une chaîne format "note/max"
  raw_note?: number; // Note brute pour les calculs
  max_score?: number; // Score maximum pour cette matière
  appreciation?: string;
}

interface SubjectGroup {
  name: string;
  subjects: Subject[];
}

interface Composition {
  id: number;
  name: string;
  composition_date: string;
  description?: string;
  notes_count: number;
  is_published: boolean;
  published_at?: string;
  status_label: 'Publié' | 'Non publié';
}

const BulletinTab = ({ childId, schoolYear }: { childId: string | undefined, schoolYear: string }) => {
  const { token } = useAuth(); // Vérification automatique de l'authentification
  const [student, setStudent] = useState<Student | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [subjectGroups, setSubjectGroups] = useState<SubjectGroup[]>([]);
  const [allSubjects, setAllSubjects] = useState<Subject[]>([]);
  const [subjectsLoaded, setSubjectsLoaded] = useState(false);
  
  // États pour le filtrage par compositions
  const [compositions, setCompositions] = useState<Composition[]>([]);
  const [selectedComposition, setSelectedComposition] = useState<string>('');
  
  // État pour les notifications de mise à jour en temps réel
  const [updateNotification, setUpdateNotification] = useState<{
    show: boolean;
    message: string;
    timestamp: number;
  }>({ show: false, message: '', timestamp: 0 });

  // Référence pour l'impression
  const bulletinRef = useRef<HTMLDivElement>(null);

  const [bulletinData, setBulletinData] = useState({
    schoolYear: '2025-2026',
    total: '', // Total des points (ex: "90.00/110")
    moyenneGenerale: '', // Moyenne de l'élève (ex: "8.18/10")
    rangGeneral: '',
    moyennePlusElevee: '',
    moyennePlusFaible: '',
    moyenneClasse: '' // Moyenne de la classe (ex: "7.50/10")
  });

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

  useEffect(() => {
    if (childId) {
      fetchStudentData();
      fetchSubjects();
      fetchCompositions();
    }
  }, [childId, schoolYear]);

  // Rafraîchir automatiquement les compositions toutes les 30 secondes pour détecter les nouvelles publications
  useEffect(() => {
    if (!childId) return;
    
    const interval = setInterval(() => {
      fetchCompositions();
    }, 30000); // Rafraîchir toutes les 30 secondes
    
    return () => clearInterval(interval);
  }, [childId, schoolYear]);

  // Écouter les événements de publication de bulletin
  useEffect(() => {
    if (!childId) return;

    const handleBulletinPublished = (event: CustomEvent) => {
      console.log('🔔 [BULLETIN TAB] Événement de publication reçu:', event.detail);
      
      // Rafraîchir immédiatement les compositions
      fetchCompositions();
      
      // Afficher une notification de succès
      setUpdateNotification({
        show: true,
        message: 'Nouveau bulletin disponible ! Les compositions ont été mises à jour.',
        timestamp: Date.now()
      });
      
      // Masquer la notification après 5 secondes
      setTimeout(() => {
        setUpdateNotification(prev => ({ ...prev, show: false }));
      }, 5000);
    };

    window.addEventListener('bulletinPublished', handleBulletinPublished as EventListener);
    
    return () => {
      window.removeEventListener('bulletinPublished', handleBulletinPublished as EventListener);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [childId, schoolYear]);

  useEffect(() => {
    if (childId && subjectsLoaded && subjectGroups.length > 0 && selectedComposition) {
      setError(null); // Réinitialiser l'erreur
      fetchStudentGrades();
    }
  }, [childId, subjectsLoaded, selectedComposition]);

  // Écouter les événements de mise à jour des notes en temps réel
  useEffect(() => {
    if (!childId) return;

    console.log('🎧 [BULLETIN TAB] Mise en place de l\'écoute des événements pour élève:', childId);

    // Écouter les mises à jour de notes individuelles
    const unsubscribeGradeUpdate = gradeEventManager.onGradeUpdate((data) => {
      console.log('🔔 [BULLETIN TAB] Événement de mise à jour de note reçu:', data);
      
      // Vérifier si cet événement concerne cet élève
      if (data.studentId === parseInt(childId)) {
        console.log('✅ [BULLETIN TAB] Mise à jour concernant cet élève, rafraîchissement...');
        
        // Afficher une notification de mise à jour (seulement si publié pour les parents)
        if (data.isPublished) {
          setUpdateNotification({
            show: true,
            message: 'Bulletin mis à jour avec de nouvelles notes !',
            timestamp: data.timestamp
          });
        }
        
        // Rafraîchir les données du bulletin avec un petit délai
        setTimeout(() => {
          if (selectedComposition) {
            fetchStudentGrades();
            // Masquer la notification après le rafraîchissement
            if (data.isPublished) {
              setTimeout(() => {
                setUpdateNotification(prev => ({ ...prev, show: false }));
              }, 4000);
            }
          }
        }, 100);
      }
    });

    // Écouter les demandes de rafraîchissement de bulletin
    const unsubscribeBulletinRefresh = gradeEventManager.onBulletinRefresh((data) => {
      console.log('🔄 [BULLETIN TAB] Événement de rafraîchissement bulletin reçu:', data);
      
      // Vérifier si cet élève est dans la liste des élèves à rafraîchir
      if (data.studentIds.includes(parseInt(childId))) {
        console.log('✅ [BULLETIN TAB] Rafraîchissement demandé pour cet élève');
        
        // Rafraîchir les données du bulletin
        setTimeout(() => {
          if (selectedComposition) {
            fetchStudentGrades();
          }
        }, 200);
      }
    });

    // Fonction de nettoyage
    return () => {
      console.log('🧹 [BULLETIN TAB] Nettoyage des écouteurs d\'événements');
      unsubscribeGradeUpdate();
      unsubscribeBulletinRefresh();
    };
  }, [childId, selectedComposition]);

  const fetchStudentData = async () => {
    try {
      setLoading(true);
      
      if (!token) {
        throw new Error('Token d\'authentification manquant');
      }

      const response = await axios.get(`https://saintefamilleexcellence.ci/api/students/${childId}?school_year=${schoolYear}`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      console.log('Données de l\'élève récupérées:', response.data);
      setStudent(response.data);
    } catch (error: any) {
      console.error('Erreur lors de la récupération des données de l\'élève:', error);
      setError(error.response?.data?.message || 'Erreur lors du chargement des données');
    } finally {
      setLoading(false);
    }
  };

  const fetchCompositions = async () => {
    if (!childId) return;

    try {
      const response = await axios.get(`https://saintefamilleexcellence.ci/api/students/${childId}/compositions?school_year=${schoolYear}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      console.log('🎯 [BULLETIN TAB] Compositions récupérées:', response.data);
      const newCompositions = response.data;
      setCompositions(newCompositions);
      
      // Si une nouvelle composition publiée apparaît et qu'aucune n'est sélectionnée, sélectionner automatiquement la dernière publiée
      if (!selectedComposition && newCompositions.length > 0) {
        const publishedCompositions = newCompositions.filter((c: Composition) => c.is_published);
        if (publishedCompositions.length > 0) {
          // Sélectionner la dernière composition publiée (la plus récente)
          const latestPublished = publishedCompositions.sort((a: Composition, b: Composition) => 
            new Date(b.composition_date).getTime() - new Date(a.composition_date).getTime()
          )[0];
          setSelectedComposition(latestPublished.id.toString());
          console.log('✅ [BULLETIN TAB] Composition publiée sélectionnée automatiquement:', latestPublished.name);
        }
      }
    } catch (error: any) {
      console.error('Erreur lors de la récupération des compositions:', error);
      setCompositions([]);
    }
  };

  const fetchSubjects = async () => {
    try {
      if (!token) {
        throw new Error('Token d\'authentification manquant');
      }

      console.log('Récupération des matières depuis l\'API bulletin-subjects...');
      
      // Utiliser bulletin-subjects pour avoir les mêmes noms que le backend
      const allResp = await axios.get('https://saintefamilleexcellence.ci/api/bulletin-subjects', {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      const allBulletinSubjects = Array.isArray(allResp.data) ? allResp.data : [];
      
      // Déterminer le level_group selon la classe
      const className = (student?.classe_name || student?.class_name || student?.classe || '').toUpperCase();
      const isCP = /^CP(\s|\d|$)/.test(className);
      
      // Filtrer selon le level_group
      let filtered: any[] = [];
      if (isCP) {
        filtered = allBulletinSubjects
          .filter((s: any) => s.level_group === 'cp')
          .sort((a: any, b: any) => (a.display_order || 0) - (b.display_order || 0));
      } else {
        filtered = allBulletinSubjects
          .filter((s: any) => s.level_group === 'ce_cm')
          .sort((a: any, b: any) => (a.display_order || 0) - (b.display_order || 0));
      }
      
      const mapped: Subject[] = filtered.map((s: any) => ({
        id: s.subject_id || s.id,
        name: s.name,
        type: 'bulletin',
      }));

      console.log('Réponse API bulletin-subjects:', allBulletinSubjects);
      console.log('Matières filtrées:', filtered);
      
      if (!Array.isArray(mapped) || mapped.length === 0) {
        console.warn('Aucune matière bulletin trouvée, utilisation des matières par défaut');
        throw new Error('Aucune matière bulletin trouvée');
      }

      setAllSubjects(mapped);
      const groupedSubjects = groupSubjectsByCategory(mapped, student?.classe_name || student?.class_name || student?.classe);
      setSubjectGroups(groupedSubjects);
      setSubjectsLoaded(true);
      
      console.log('Matières récupérées depuis bulletin-subjects:', mapped);
      console.log('Groupes de matières créés:', groupedSubjects);
    } catch (error: any) {
      console.error('Erreur lors de la récupération des matières:', error);
      const defaultSubjects = createDefaultSubjects();
      setAllSubjects(defaultSubjects);
      const defaultGroupedSubjects = groupSubjectsByCategory(defaultSubjects, student?.classe_name || student?.class_name || student?.classe);
      setSubjectGroups(defaultGroupedSubjects);
      setSubjectsLoaded(true);
      
      console.log('Matières par défaut utilisées:', defaultSubjects);
      console.log('Groupes par défaut créés:', defaultGroupedSubjects);
    }
  };

  const createDefaultSubjects = (): Subject[] => {
    return [
      { id: 1, name: 'Lecture', type: 'francais' },
      { id: 3, name: 'Expression Écrite', type: 'francais' },
      { id: 3, name: 'Orthographe/Dictée', type: 'francais' },
      { id: 4, name: 'Grammaire/Conjugaison', type: 'francais' },
      { id: 5, name: 'Vocabulaire', type: 'francais' },
      { id: 7, name: 'Exploitation de Textes', type: 'francais' },
      { id: 8, name: 'Histoire/Géographie', type: 'aem' },
      { id: 8, name: 'Sciences', type: 'aem' },
      { id: 9, name: 'EDHC', type: 'aem' },
      { id: 10, name: 'Mathématiques', type: 'mathematiques' },
      { id: 11, name: 'Chant/Poésie', type: 'autres' },
      { id: 12, name: 'Anglais', type: 'langues' },
      { id: 13, name: 'E.P.S', type: 'sport' }
    ];
  };

  const groupSubjectsByCategory = (subjects: Subject[], className?: string): SubjectGroup[] => {
    // Déterminer quelles matières afficher selon la classe
    let allowedSubjects = subjects;
    
    if (className) {
      if (['CP1', 'CP2'].includes(className)) {
        // CP1-CP2: matières simplifiées
        allowedSubjects = subjects.filter(s => 
          ['Lecture', 'Expression Écrite', 'Orthographe/Dictée', 'Mathématiques', 'Chant/Poésie', 'E.P.S'].includes(s.name)
        );
      } else if (['CE1', 'CE2'].includes(className)) {
        // CE1-CE2: toutes les matières SAUF EPS avec toutes les variantes
        allowedSubjects = subjects.filter(s => {
          const name = (s.name || '').toUpperCase().trim();
          // Exclure explicitement EPS pour CE1/CE2 avec toutes les variantes
          const isEPS = name === 'EPS' || 
                       name === 'E.P.S' || 
                       name === 'E.P.S.' ||
                       name === 'E PS' ||
                       name.includes('EPS');
          if (isEPS) {
            console.log(`🚫 [BULLETIN TAB] EPS exclu dans groupSubjectsByCategory: "${s.name}"`);
            return false;
          }
          // Inclure toutes les autres matières disponibles
          return true;
        });
      } else if (['CM1', 'CM2'].includes(className)) {
        // CM1-CM2: toutes les matières
        allowedSubjects = subjects.filter(s => 
          ['Lecture', 'Expression Écrite', 'Orthographe/Dictée', 'Grammaire/Conjugaison', 'Vocabulaire', 'Exploitation de Textes', 'Histoire/Géographie', 'Sciences', 'EDHC', 'Anglais', 'Mathématiques', 'Chant/Poésie', 'E.P.S', 'Leçon/Problème'].includes(s.name)
        );
      }
    }
    
    const francaisSubjects = allowedSubjects.filter(s => 
      s.type === 'francais' || 
      ['Lecture', 'Expression Écrite', 'Orthographe/Dictée', 'Grammaire/Conjugaison', 'Vocabulaire', 'Exploitation de Textes'].includes(s.name)
    );
    
    const aemSubjects = allowedSubjects.filter(s => 
      s.type === 'aem' || 
      ['Histoire/Géographie', 'Sciences', 'EDHC'].includes(s.name)
    );
    
    const otherSubjects = allowedSubjects.filter(s => 
      !['francais', 'aem'].includes(s.type || '') &&
      !['Lecture', 'Expression Écrite', 'Orthographe/Dictée', 'Grammaire/Conjugaison', 'Vocabulaire', 'Exploitation de Textes', 'Histoire/Géographie', 'Sciences', 'EDHC'].includes(s.name)
    );

    const groups = [];
    
    if (francaisSubjects.length > 0) {
      groups.push({ name: 'FRANÇAIS', subjects: francaisSubjects });
    }
    
    if (aemSubjects.length > 0) {
      groups.push({ name: 'A.E.M', subjects: aemSubjects });
    }
    
    if (otherSubjects.length > 0) {
      groups.push({ name: 'AUTRES', subjects: otherSubjects });
    }

    return groups;
  };

  const fetchStudentGrades = async () => {
    try {
      console.log('🔥 [BULLETIN TAB] === DÉBUT RÉCUPÉRATION NOTES ===');
      console.log('🔥 [BULLETIN TAB] Composition sélectionnée:', selectedComposition);
      
      // Vérifier d'abord si la composition sélectionnée est publiée
      const selectedCompositionData = compositions.find(c => c.id.toString() === selectedComposition);
      
      if (selectedCompositionData && !selectedCompositionData.is_published) {
        console.log('🚨 [BULLETIN TAB] Composition non publiée détectée');
        setError('Le bulletin de cette composition n\'est pas encore disponible. Il sera publié par l\'administration.');
        setBulletinData(prev => ({
          ...prev,
          total: '—',
          moyenneGenerale: '—',
          moyenneClasse: '—',
          rangGeneral: '—'
        }));
        return;
      }
      
      let url = `https://saintefamilleexcellence.ci/api/students/${childId}/bulletin?school_year=${schoolYear}`;
      
      if (selectedComposition) {
        url += `&composition_id=${selectedComposition}`;
      }

      console.log('🔥 [BULLETIN TAB] URL API:', url);

      const response = await axios.get(url, {
        headers: { Authorization: `Bearer ${token}` }
      });

      console.log('🔥 [BULLETIN TAB] === DONNÉES REÇUES ===');
      console.log('🔥 [BULLETIN TAB] Données complètes:', response.data);
      
      if (response.data.subjects && Array.isArray(response.data.subjects)) {
        console.log('🔥 [BULLETIN TAB] Nombre de matières:', response.data.subjects.length);
        console.log('🔥 [BULLETIN TAB] Détail des matières:', response.data.subjects);
        
        // Mapper les notes reçues vers les groupes de matières
        // Filtrer d'abord pour exclure EPS pour CE1/CE2
        const className = student?.class_name || '';
        const isCE1OrCE2 = className.includes('CE1') || className.includes('CE2');
        
        const updatedGroups = subjectGroups.map(group => ({
          ...group,
          subjects: group.subjects
            // Exclure EPS pour CE1/CE2 avec toutes les variantes
            .filter(subject => {
              const name = (subject.name || '').toUpperCase().trim();
              const isEPS = name === 'EPS' || 
                           name === 'E.P.S' || 
                           name === 'E.P.S.' ||
                           name === 'E PS' ||
                           name.includes('EPS');
              
              if (isCE1OrCE2 && isEPS) {
                console.log(`🚫 [BULLETIN TAB] EPS exclu côté frontend: "${subject.name}"`);
                return false;
              }
              return true;
            })
            .map(subject => {
              const matchingSubject = response.data.subjects.find((s: any) => 
                s.subject_name === subject.name
              );
              
              console.log(`🔥 [MAPPING] Matière: "${subject.name}" <-> Note trouvée:`, matchingSubject);
              
              if (matchingSubject) {
                console.log(`✅ [MAPPING] MATCH! ${subject.name} = ${matchingSubject.average}`);
                // Formater la note avec le maximum si disponible (format "note/max")
                const noteValue = matchingSubject.average !== undefined && matchingSubject.average !== null 
                  ? matchingSubject.average 
                  : undefined;
                const maxScore = matchingSubject.max_score || undefined;
                const formattedNote = noteValue !== undefined 
                  ? (maxScore ? `${noteValue}/${maxScore}` : noteValue.toString())
                  : undefined;
                
                return {
                  ...subject,
                  notes: formattedNote,
                  raw_note: noteValue, // Garder la note brute pour les calculs
                  max_score: maxScore,
                  appreciation: matchingSubject.notes && matchingSubject.notes.length > 0 
                    ? `${matchingSubject.notes.length} note(s)` 
                    : undefined
                };
              } else {
                console.log(`❌ [MAPPING] PAS DE MATCH pour ${subject.name}`);
                return {
                  ...subject,
                  notes: undefined,
                  raw_note: undefined,
                  max_score: undefined,
                  appreciation: undefined
                };
              }
            })
        }));
        
        console.log('🔥 [BULLETIN TAB] Groupes mis à jour:', updatedGroups);
        setSubjectGroups(updatedGroups);
        
        // Mettre à jour les données générales du bulletin depuis le backend
        // Le backend calcule déjà le total et la moyenne selon les règles CE1/CE2
        const totalPoints = response.data.total_points !== undefined ? response.data.total_points : null;
        const totalMaxPoints = response.data.total_max_points !== undefined ? response.data.total_max_points : null;
        
        // Utiliser les valeurs isCE1 et isCE2 du backend si disponibles (dans _debug), sinon détecter localement
        const backendDebug = response.data._debug || {};
        const isCE1 = backendDebug.isCE1 !== undefined ? backendDebug.isCE1 : (className.includes('CE1') || className.startsWith('CE1'));
        const isCE2 = backendDebug.isCE2 !== undefined ? backendDebug.isCE2 : (className.includes('CE2') || className.startsWith('CE2'));
        
        console.log('🔥 [BULLETIN TAB] Détection classe:', {
          className,
          isCE1_from_backend: backendDebug.isCE1,
          isCE2_from_backend: backendDebug.isCE2,
          isCE1_detected: isCE1,
          isCE2_detected: isCE2,
          calculation_method: response.data.calculation_method
        });
        
        // Formater le total (pour affichage, pas la moyenne)
        let totalFormatted = '—';
        if (totalPoints !== null) {
          if (isCE1 || isCE2) {
            // Pour CE1/CE2: total/110 (somme des 4 matières principales: 30+30+20+30)
            totalFormatted = `${totalPoints.toFixed(2)}/110`;
          } else {
            // Pour les autres classes: utiliser total_max_points du backend
            totalFormatted = totalMaxPoints !== null 
              ? `${totalPoints.toFixed(2)}/${totalMaxPoints}` 
              : totalPoints.toFixed(2);
          }
        }
        
        // IMPORTANT: La moyenne générale de l'élève vient de general_average du backend (déjà calculée et formatée sur /10)
        const studentAverage = response.data.general_average !== undefined && response.data.general_average !== null
          ? parseFloat(response.data.general_average)
          : null;
        const studentAverageFormatted = studentAverage !== null ? `${studentAverage.toFixed(2)}/10` : '—';
        
        // La moyenne de la classe vient de class_average du backend
        const classAverage = response.data.class_average !== undefined && response.data.class_average !== null
          ? parseFloat(response.data.class_average)
          : null;
        const classAverageFormatted = classAverage !== null ? `${classAverage.toFixed(2)}/10` : '—';
        
        console.log('🔥 [BULLETIN TAB] ═══ CALCULS MOYENNES ═══');
        console.log('🔥 [BULLETIN TAB] Moyenne élève (general_average):', studentAverage, '→', studentAverageFormatted);
        console.log('🔥 [BULLETIN TAB] Moyenne classe (class_average):', classAverage, '→', classAverageFormatted);
        console.log('🔥 [BULLETIN TAB] Total points:', totalFormatted);
        console.log('🔥 [BULLETIN TAB] Highest average:', response.data.highest_average);
        console.log('🔥 [BULLETIN TAB] Lowest average:', response.data.lowest_average);
        
        setBulletinData(prev => ({
          ...prev,
          schoolYear: response.data.school_year || schoolYear,
          total: totalFormatted, // Total des points (ex: "90.00/110")
          moyenneGenerale: studentAverageFormatted, // Moyenne de l'élève sur /10 depuis le backend
          moyenneClasse: classAverageFormatted, // Moyenne de la classe sur /10 depuis le backend
          rangGeneral: response.data.general_rank > 0 ? `${response.data.general_rank}/${response.data.total_class_students || 0}` : '—',
          moyennePlusElevee: response.data.highest_average !== undefined && response.data.highest_average !== null
            ? `${parseFloat(response.data.highest_average).toFixed(2)}/10`
            : '—',
          moyennePlusFaible: response.data.lowest_average !== undefined && response.data.lowest_average !== null
            ? `${parseFloat(response.data.lowest_average).toFixed(2)}/10`
            : '—'
        }));
        
        console.log('🔥 [BULLETIN TAB] Données du bulletin mises à jour:', {
          moyenneGenerale: studentAverageFormatted,
          moyenneClasse: classAverageFormatted,
          totalFormatted,
          isCE1,
          isCE2,
          totalPoints,
          totalMaxPoints,
          general_average_backend: response.data.general_average,
          class_average_backend: response.data.class_average
        });
      } else {
        console.log('🚨 [BULLETIN TAB] Aucune matière dans la réponse');
        setError('Aucune note disponible pour cette période.');
      }
    } catch (error: any) {
      console.error('Erreur lors de la récupération des notes:', error);
      if (error.response?.status === 404) {
        setError('Aucun bulletin disponible pour cette période.');
      } else if (error.response?.status === 403) {
        setError('Le bulletin n\'est pas encore publié pour cette période.');
      } else {
        setError('Erreur lors du chargement du bulletin. Veuillez réessayer.');
      }
    }
  };

  const calculateTotalAndAverage = (groups: SubjectGroup[]) => {
    console.log('🧮 [CALCUL PARENT] === FONCTION APPELÉE ===');
    console.log('🧮 [CALCUL PARENT] Groupes reçus:', groups);
    
    // Déterminer la classe de l'élève pour appliquer les bonnes règles
    const className = student?.class_name || '';
    const isCE1 = className.includes('CE1');
    const isCE2 = className.includes('CE2');
    
    // Utiliser les notes brutes (raw_note) ou extraire depuis notes si format "note/max"
    let totalPoints = 0;
    let totalMaxPoints = 0;
    
    if (isCE1 || isCE2) {
      // Pour CE1/CE2: prendre UNIQUEMENT les 4 matières principales
      const targetedSubjects = ['EXPLOITATION DE TEXTE', 'A.E.M', 'ORTHOGRAPHE', 'DICTEE', 'DICTÉE', 'MATHEMATIQUE', 'MATHÉMATIQUE'];
      
      groups.forEach(group => {
        group.subjects.forEach(subject => {
          const subjectName = (subject.name || '').toUpperCase();
          const isTargeted = targetedSubjects.some(target => subjectName.includes(target));
          
          if (isTargeted) {
            let noteValue: number | undefined = undefined;
            
            if (subject.raw_note !== undefined && subject.raw_note !== null) {
              noteValue = typeof subject.raw_note === 'number' ? subject.raw_note : parseFloat(subject.raw_note);
            } else if (subject.notes !== undefined && subject.notes !== null) {
              if (typeof subject.notes === 'string' && subject.notes.includes('/')) {
                const parts = subject.notes.split('/');
                noteValue = parseFloat(parts[0]);
              } else if (typeof subject.notes === 'number') {
                noteValue = subject.notes;
              }
            }
            
            if (noteValue !== undefined && !isNaN(noteValue)) {
              totalPoints += noteValue;
              console.log(`✅ [CALCUL PARENT] Matière incluse: ${subject.name} = ${noteValue}`);
            }
          } else {
            console.log(`❌ [CALCUL PARENT] Matière exclue: ${subject.name}`);
          }
        });
      });
      
      // CE1: moyenne = total / 11, CE2: moyenne = total / 17
      const moyenne = isCE1 ? (totalPoints / 11) : (totalPoints / 17);
      const totalFormatted = `${totalPoints.toFixed(2)}/110`; // Total max = 110 pour CE1/CE2
      
      console.log(`🧮 [CALCUL PARENT] Total points (4 matières): ${totalPoints}`);
      console.log(`🧮 [CALCUL PARENT] Diviseur: ${isCE1 ? '11' : '17'}`);
      console.log(`🧮 [CALCUL PARENT] RÉSULTAT - Total: ${totalFormatted}, Moyenne: ${moyenne.toFixed(2)}/10`);
      
      setBulletinData(prev => ({
        ...prev,
        moyenneGenerale: prev.moyenneGenerale || totalFormatted, // Utiliser celui du backend si disponible
        moyenneClasse: prev.moyenneClasse || `${moyenne.toFixed(2)}/10`
      }));
    } else {
      // Pour les autres classes: calcul normal
      groups.forEach(group => {
        group.subjects.forEach(subject => {
          let noteValue: number | undefined = undefined;
          let maxValue: number | undefined = undefined;
          
          if (subject.raw_note !== undefined && subject.raw_note !== null) {
            noteValue = typeof subject.raw_note === 'number' ? subject.raw_note : parseFloat(subject.raw_note);
            maxValue = subject.max_score;
          } else if (subject.notes !== undefined && subject.notes !== null) {
            if (typeof subject.notes === 'string' && subject.notes.includes('/')) {
              const parts = subject.notes.split('/');
              noteValue = parseFloat(parts[0]);
              maxValue = parseFloat(parts[1]);
            } else if (typeof subject.notes === 'number') {
              noteValue = subject.notes;
              maxValue = subject.max_score || 20;
            }
          }
          
          if (noteValue !== undefined && !isNaN(noteValue)) {
            totalPoints += noteValue;
            totalMaxPoints += maxValue || 20;
            console.log(`✅ [CALCUL PARENT] Note ajoutée: ${subject.name} = ${noteValue}${maxValue ? `/${maxValue}` : ''}`);
          }
        });
      });
      
      if (totalPoints > 0 && totalMaxPoints > 0) {
        const moyenne = (totalPoints / totalMaxPoints) * 10;
        const totalFormatted = `${totalPoints.toFixed(2)}/${totalMaxPoints}`;
        
        console.log(`🧮 [CALCUL PARENT] RÉSULTAT - Total: ${totalFormatted}, Moyenne: ${moyenne.toFixed(2)}/10`);
        
        setBulletinData(prev => ({
          ...prev,
          moyenneGenerale: prev.moyenneGenerale || totalFormatted,
          moyenneClasse: prev.moyenneClasse || `${moyenne.toFixed(2)}/10`
        }));
      }
    }
  };

  // Fonction d'impression
  const handlePrint = useReactToPrint({
    contentRef: bulletinRef,
    documentTitle: `Bulletin_${student?.last_name}_${student?.first_name}_${selectedComposition ? compositions.find(c => c.id.toString() === selectedComposition)?.name : schoolYear}`,
    pageStyle: `
      @page {
        size: A4;
        margin: 1cm;
      }
      @media print {
        body { -webkit-print-color-adjust: exact; }
        .no-print { display: none !important; }
      }
    `
  });

  // Fonction de téléchargement PDF
  const handleDownloadPDF = async () => {
    if (!selectedComposition || !student) return;

    try {
      const selectedComp = compositions.find(c => c.id.toString() === selectedComposition);
      if (!selectedComp?.is_published) {
        alert('Ce bulletin n\'est pas encore publié');
        return;
      }

      // Utiliser la fonction d'impression qui génère un PDF
      handlePrint();
    } catch (error) {
      console.error('Erreur lors du téléchargement:', error);
      alert('Erreur lors du téléchargement du bulletin');
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}>
        <CircularProgress size={60} />
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ p: 4, textAlign: 'center' }}>
        <Alert severity="warning" sx={{ mb: 2 }}>
          {error}
        </Alert>
        <Typography variant="body1" color="text.secondary">
          Le bulletin sera disponible une fois publié par l'administration.
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ p: { xs: 1, sm: 2, md: 3 } }}>
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
        >
          <Typography variant="body2" sx={{ fontWeight: 600 }}>
            🔄 {updateNotification.message}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Mis à jour à {new Date(updateNotification.timestamp).toLocaleTimeString('fr-FR')}
          </Typography>
        </Alert>
      )}

      {/* Contrôles de filtrage */}
      <Paper elevation={2} sx={{ p: { xs: 2, sm: 3 }, mb: 3 }}>
        <Typography variant="h6" fontWeight={600} mb={2} sx={{ fontSize: { xs: '1.1rem', sm: '1.25rem' } }}>
          Filtres du Bulletin
        </Typography>
        <Grid container spacing={{ xs: 2, sm: 3 }} alignItems="center">
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
                      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                        <Box>
                          <Typography variant="body2" fontWeight={600}>
                            {composition.name}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {new Date(composition.composition_date).toLocaleDateString('fr-FR')}
                          </Typography>
                        </Box>
                        <Chip 
                          label={composition.status_label}
                          size="small"
                          color={composition.is_published ? 'success' : 'default'}
                          variant={composition.is_published ? 'filled' : 'outlined'}
                          sx={{ ml: 1 }}
                        />
                      </Box>
                    </MenuItem>
                  ))}
              </Select>
            </FormControl>
          </Grid>

          {/* Informations sur les compositions disponibles */}
          <Grid item xs={12} sm={6} md={4}>
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
              <Chip 
                label={`${compositions.length} composition${compositions.length > 1 ? 's' : ''} disponible${compositions.length > 1 ? 's' : ''}`}
                color="info"
                variant="outlined"
                size="small"
              />
              <Chip 
                label={`${compositions.filter(c => c.is_published).length} publié${compositions.filter(c => c.is_published).length > 1 ? 's' : ''}`}
                color="success"
                variant="outlined"
                size="small"
              />
              <Chip 
                label={`${compositions.filter(c => !c.is_published).length} non publié${compositions.filter(c => !c.is_published).length > 1 ? 's' : ''}`}
                color="default"
                variant="outlined"
                size="small"
              />
            </Box>
          </Grid>
        </Grid>
      </Paper>

      {/* Information sur le bulletin affiché avec boutons d'action */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Alert severity="info" sx={{ flexGrow: 1, mr: 2 }}>
          <Typography variant="body2">
            {selectedComposition 
              ? `Bulletin de composition - ${compositions.find(c => c.id.toString() === selectedComposition)?.name || 'Composition sélectionnée'}`
              : 'Sélectionnez une composition pour afficher le bulletin'
            }
          </Typography>
        </Alert>
        
        {/* Boutons d'action - visibles seulement si une composition publiée est sélectionnée */}
        {selectedComposition && compositions.find(c => c.id.toString() === selectedComposition)?.is_published && (
          <Box sx={{ display: 'flex', gap: 1 }} className="no-print">
            <Tooltip title="Imprimer le bulletin">
              <IconButton
                onClick={handlePrint}
                color="primary"
                sx={{
                  bgcolor: 'primary.main',
                  color: 'white',
                  '&:hover': { bgcolor: 'primary.dark' }
                }}
              >
                <PrintIcon />
              </IconButton>
            </Tooltip>
            <Tooltip title="Télécharger en PDF">
              <IconButton
                onClick={handleDownloadPDF}
                color="success"
                sx={{
                  bgcolor: 'success.main',
                  color: 'white',
                  '&:hover': { bgcolor: 'success.dark' }
                }}
              >
                <DownloadIcon />
              </IconButton>
            </Tooltip>
          </Box>
        )}
      </Box>

      {/* Contenu du bulletin - Affichage conditionnel selon le statut */}
      {selectedComposition && compositions.find(c => c.id.toString() === selectedComposition)?.is_published ? (
        /* Contenu imprimable du bulletin - FORMAT EXACT IDENTIQUE À L'ADMINISTRATION */
        <div ref={bulletinRef}>
          <Paper sx={{ 
            border: '2px solid #000', 
            borderRadius: 2,
            // Styles responsifs pour mobile
            '@media (max-width: 600px)': {
              fontSize: '0.8rem',
              '& .MuiTableCell-root': {
                padding: '4px',
                fontSize: '0.7rem'
              }
            }
          }}>
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
                    <strong>Classe:</strong> {student?.classe_name || student?.class_name || student?.classe || '........................'}
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2" sx={{ mb: 1 }}>
                    <strong>Date de naissance:</strong> {student?.date_of_birth ? new Date(student.date_of_birth).toLocaleDateString('fr-FR') : '........................'}
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

            {/* Tableau des matières avec structure correcte - FORMAT EXACT IDENTIQUE */}
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
                {/* Calculer le nombre total de lignes pour la colonne Appréciations */}
                {(() => {
                  const totalRows = subjectGroups.reduce((total, g) => {
                    if (g.name === 'FRANÇAIS' || g.name === 'A.E.M') {
                      return total + 1; // 1 ligne pour chaque groupe groupé
                    }
                    return total + g.subjects.length; // 1 ligne par matière individuelle
                  }, 0) + 4; // +4 pour Total et les 3 lignes de moyennes
                  
                  let isFirstRow = true;
                  
                  return subjectGroups.flatMap((group, groupIndex) => {
                    if (group.subjects.length === 0) return [];
                    
                    // Pour les groupes avec plusieurs matières (Français, A.E.M), utiliser un sous-tableau
                    if (group.subjects.length > 1 && (group.name === 'FRANÇAIS' || group.name === 'A.E.M')) {
                      const currentIsFirstRow = isFirstRow;
                      if (isFirstRow) isFirstRow = false;
                      
                      return [(
                        <TableRow key={groupIndex}>
                          <TableCell sx={{ p: 0, border: 'none' }}>
                            <Table sx={{ '& td': { border: '1px solid #000' } }}>
                              <TableBody>
                                {group.subjects.map((subject, idx) => (
                                  <TableRow key={idx}>
                                    {idx === 0 && (
                                      <TableCell 
                                        rowSpan={group.subjects.length}
                                        sx={{ 
                                          fontWeight: 'bold', 
                                          fontSize: '0.9rem',
                                          textAlign: 'center',
                                          verticalAlign: 'middle',
                                          writingMode: 'vertical-rl',
                                          textOrientation: 'mixed',
                                          backgroundColor: '#f8f9fa',
                                          width: '80px'
                                        }}
                                      >
                                        {group.name}
                                      </TableCell>
                                    )}
                                    <TableCell sx={{ fontSize: '0.85rem', py: 0.5, width: '200px' }}>
                                      {subject.name}
                                    </TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          </TableCell>
                          <TableCell sx={{ p: 0, border: 'none' }}>
                            <Table sx={{ '& td': { border: '1px solid #000' } }}>
                              <TableBody>
                                {group.subjects.map((subject, idx) => (
                                  <TableRow key={idx}>
                                    <TableCell sx={{ textAlign: 'center', fontSize: '0.85rem', py: 0.5, width: '60px' }}>
                                      {subject.notes !== undefined && subject.notes !== null 
                                        ? subject.notes
                                        : '—'}
                                    </TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          </TableCell>
                          {currentIsFirstRow && (
                            <TableCell 
                              rowSpan={totalRows}
                              sx={{ 
                                fontWeight: 'bold', 
                                fontSize: '0.9rem',
                                textAlign: 'center',
                                verticalAlign: 'top',
                                fontStyle: 'italic',
                                backgroundColor: '#f8f9fa',
                                p: 2,
                                position: 'relative'
                              }}
                            >
                              <Box sx={{ position: 'absolute', top: '40%', left: '50%', transform: 'translate(-50%, -50%)' }}>
                                Visa du Directeur
                              </Box>
                              <Box sx={{ position: 'absolute', bottom: '10%', left: '50%', transform: 'translateX(-50%)' }}>
                                Visa des Parents
                              </Box>
                            </TableCell>
                          )}
                        </TableRow>
                      )];
                    }
                    
                    // Pour les autres matières individuelles (non groupées)
                    return group.subjects.map((subject, subjectIndex) => {
                      const currentIsFirstRow = isFirstRow;
                      if (isFirstRow) isFirstRow = false;
                      
                      return (
                        <TableRow key={`${groupIndex}-${subjectIndex}`}>
                          <TableCell sx={{ fontSize: '0.85rem', py: 0.5 }}>
                            {subject.name}
                          </TableCell>
                        <TableCell sx={{ textAlign: 'center', fontSize: '0.85rem', py: 0.5 }}>
                          {subject.notes !== undefined && subject.notes !== null 
                            ? subject.notes
                            : '—'}
                        </TableCell>
                          {currentIsFirstRow && (
                            <TableCell 
                              rowSpan={totalRows}
                              sx={{ 
                                fontWeight: 'bold', 
                                fontSize: '0.9rem',
                                textAlign: 'center',
                                verticalAlign: 'top',
                                fontStyle: 'italic',
                                backgroundColor: '#f8f9fa',
                                p: 2,
                                position: 'relative'
                              }}
                            >
                              <Box sx={{ position: 'absolute', top: '40%', left: '50%', transform: 'translate(-50%, -50%)' }}>
                                Visa du Directeur
                              </Box>
                              <Box sx={{ position: 'absolute', bottom: '10%', left: '50%', transform: 'translateX(-50%)' }}>
                                Visa des Parents
                              </Box>
                            </TableCell>
                          )}
                        </TableRow>
                      );
                    });
                  });
                })()}

                {/* Ligne Total */}
                <TableRow>
                  <TableCell sx={{ fontWeight: 'bold', fontSize: '0.9rem', py: 0.5 }}>
                    Total
                  </TableCell>
                  <TableCell sx={{ textAlign: 'center', fontWeight: 'bold', fontSize: '0.9rem', py: 0.5 }}>
                    {bulletinData.total || '—'}
                  </TableCell>
                  {/* La colonne Appréciations continue - pas de cellule ici si déjà définie */}
                </TableRow>

                {/* Section moyennes */}
                <TableRow>
                  <TableCell colSpan={2} sx={{ fontSize: '0.8rem', py: 0.5, fontStyle: 'italic' }}>
                    <strong>Moyenne:</strong> {bulletinData.moyenneGenerale || '......'} &nbsp;&nbsp;&nbsp; <strong>Rang:</strong> {bulletinData.rangGeneral || '......'}
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell colSpan={2} sx={{ fontSize: '0.8rem', py: 0.5, fontStyle: 'italic' }}>
                    <strong>Moyenne la plus élevée:</strong> {bulletinData.moyennePlusElevee || '......../......'}
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell colSpan={2} sx={{ fontSize: '0.8rem', py: 0.5, fontStyle: 'italic' }}>
                    <strong>Moyenne la plus faible:</strong> {bulletinData.moyennePlusFaible || '......../......'}
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell colSpan={2} sx={{ fontSize: '0.8rem', py: 0.5, fontStyle: 'italic' }}>
                    <strong>Moyenne de la classe:</strong> {bulletinData.moyenneClasse || '......../......'}
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </Paper>
        </div>
      ) : selectedComposition && !compositions.find(c => c.id.toString() === selectedComposition)?.is_published ? (
        /* Message pour composition non publiée */
        <Paper elevation={2} sx={{ p: 4, textAlign: 'center', borderRadius: 2 }}>
          <Alert severity="warning" sx={{ mb: 2 }}>
            <Typography variant="h6" fontWeight={600} gutterBottom>
              Bulletin non disponible
            </Typography>
            <Typography variant="body1">
              Le bulletin de cette composition n'est pas encore disponible.
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              Il sera publié par l'administration une fois les évaluations terminées.
            </Typography>
          </Alert>
          <Box sx={{ mt: 3 }}>
            <Typography variant="body2" color="text.secondary">
              Composition sélectionnée : <strong>{compositions.find(c => c.id.toString() === selectedComposition)?.name}</strong>
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Date : {compositions.find(c => c.id.toString() === selectedComposition)?.composition_date 
                ? new Date(compositions.find(c => c.id.toString() === selectedComposition)!.composition_date).toLocaleDateString('fr-FR')
                : 'Non définie'
              }
            </Typography>
          </Box>
        </Paper>
      ) : (
        /* Message de sélection */
        <Paper elevation={2} sx={{ p: 4, textAlign: 'center', borderRadius: 2 }}>
          <DescriptionIcon sx={{ fontSize: 80, color: '#673ab7', mb: 2, opacity: 0.5 }} />
          <Typography variant="h5" fontWeight={700} color="primary.main" mb={2}>
            Sélectionnez une composition
          </Typography>
          <Typography variant="body1" color="text.secondary" mb={2}>
            Choisissez une composition dans la liste déroulante ci-dessus pour afficher le bulletin correspondant.
          </Typography>
          {compositions.length > 0 && (
            <Box sx={{ mt: 3 }}>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                Compositions disponibles :
              </Typography>
              <Box sx={{ display: 'flex', justifyContent: 'center', gap: 1, flexWrap: 'wrap' }}>
                {compositions.slice(0, 3).map((comp) => (
                  <Chip
                    key={comp.id}
                    label={`${comp.name} (${comp.status_label})`}
                    size="small"
                    color={comp.is_published ? 'success' : 'default'}
                    variant="outlined"
                  />
                ))}
                {compositions.length > 3 && (
                  <Chip
                    label={`+${compositions.length - 3} autres`}
                    size="small"
                    color="info"
                    variant="outlined"
                  />
                )}
              </Box>
            </Box>
          )}
        </Paper>
      )}
    </Box>
  );
};

export default BulletinTab;

export {};

