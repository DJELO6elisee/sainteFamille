import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useIsMounted } from '../../hooks/useIsMounted';
import SafeDialog from '../../components/SafeDialog';
import { formatDateForInput, formatDateForReceipt } from '../../utils/dateUtils';
import {
  Box,
  Container,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Button,
  TextField,
  InputAdornment,
  IconButton,
  Chip,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid,
  SelectChangeEvent,
  Tooltip,
  useTheme,
  Fade,
  Zoom,
  Card,
  CardContent,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  CircularProgress,
  Divider,
  Alert,
  Snackbar,
} from '@mui/material';
import {
  Search as SearchIcon,
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  PhotoCamera as PhotoCameraIcon,
  Visibility as VisibilityIcon,
  MonetizationOn as MonetizationOnIcon,
  Print as PrintIcon,
  School as SchoolIcon,
  Check as CheckIcon,
  Payment as PaymentIcon,
  Replay as ReplayIcon,
  History as HistoryIcon
} from '@mui/icons-material';
import SecretarySidebar from '../../components/SecretarySidebar';
import { useNavigate } from 'react-router-dom';
import InscrptionPre from '../InscrptionPre';
import { blue, green, orange, purple } from '@mui/material/colors';
import axios from 'axios';


const genreOptions = ['Tous', 'Masculin', 'Féminin'];
const cantineOptions = ['Tous', 'Oui', 'Non'];

// Fonction utilitaire pour formater une date pour l'API sans décalage de timezone
const formatDateForAPI = (date: Date | null): string => {
  if (!date) return '';
  
  // Utiliser les méthodes getFullYear, getMonth, getDate pour éviter les problèmes de timezone
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0'); // getMonth() retourne 0-11
  const day = String(date.getDate()).padStart(2, '0');
  
  return `${year}-${month}-${day}`;
};


const Students = () => {
  const theme = useTheme();
  const isMounted = useIsMounted();
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedClass, setSelectedClass] = useState('Toutes les classes');
  const [scolariteFilter, setScolariteFilter] = useState('');
  const [scolariteFilterInput, setScolariteFilterInput] = useState('');
  const [scolariteFilterOperator, setScolariteFilterOperator] = useState<'equal' | 'gte' | 'lte'>('gte');
  const [genreFilter, setGenreFilter] = useState('Tous');
  const [cantineFilter, setCantineFilter] = useState('Tous');
  const tableRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const [showRegistrationForm, setShowRegistrationForm] = useState(false);
  const [students, setStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [editStudent, setEditStudent] = useState<any | null>(null);
  const [editLoading, setEditLoading] = useState(false);
  const [editSuccessMessage, setEditSuccessMessage] = useState<string | null>(null);
  const [editErrorMessage, setEditErrorMessage] = useState<string | null>(null);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [snackbarSeverity, setSnackbarSeverity] = useState<'success' | 'error' | 'info' | 'warning'>('info');
  const [editPhotoFile, setEditPhotoFile] = useState<File | null>(null);
  const [editPhotoPreview, setEditPhotoPreview] = useState<string | null>(null);
  const [editPhotoError, setEditPhotoError] = useState<string | null>(null);
  const editStudentPhotoUrl = editPhotoPreview || (editStudent?.child_photo ? `https://saintefamilleexcellence.ci/api/students/photo/${editStudent.child_photo}` : null);

  // State pour la modale de paiement
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [studentToPay, setStudentToPay] = useState<any | null>(null);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [paymentReceiptData, setPaymentReceiptData] = useState<any | null>(null);
  const [showPaymentReceipt, setShowPaymentReceipt] = useState(false);
  const paymentReceiptRef = useRef<HTMLDivElement>(null);
  
  // State pour la modale de confirmation de paiement
  const [paymentConfirmationOpen, setPaymentConfirmationOpen] = useState(false);

  // State pour la modale de finalisation
  const [finalizeModalOpen, setFinalizeModalOpen] = useState(false);
  const [finalizeClassId, setFinalizeClassId] = useState('');

  const [finalizeLoading, setFinalizeLoading] = useState(false);
  const [receiptData, setReceiptData] = useState<any | null>(null);
  const [showReceipt, setShowReceipt] = useState(false);
  const receiptRef = useRef<HTMLDivElement>(null);

  // State pour les classes
  const [classes, setClasses] = useState<{ id: number; name: string; level?: string; amount?: number | string }[]>([]);

  // State pour le rôle utilisateur
  const [userRole, setUserRole] = useState<string>('');

  // Réinscription
  const [reinscriptionOpen, setReinscriptionOpen] = useState(false);
  const [matriculeSearch, setMatriculeSearch] = useState('');
  const [reinscriptionStudent, setReinscriptionStudent] = useState<any | null>(null);
  const [reinscriptionError, setReinscriptionError] = useState<string | null>(null);
  const [reinscriptionLoading, setReinscriptionLoading] = useState(false);
  const [reinscriptionClassId, setReinscriptionClassId] = useState('');
  // const [reinscriptionPayment, setReinscriptionPayment] = useState(''); // Retiré
  const [reinscriptionSubmitting, setReinscriptionSubmitting] = useState(false);
  // Ajout pour édition parent
  const [parentFields, setParentFields] = useState({
    parent_first_name: '',
    parent_last_name: '',
    parent_phone: '',
    parent_email: '',
    parent_contact: ''
  });
  // Ajout pour message d'erreur API réinscription
  const [reinscriptionApiError, setReinscriptionApiError] = useState<string | null>(null);



  // Année scolaire
  const [schoolYear, setSchoolYear] = useState(getCurrentSchoolYear());
  const [availableYears, setAvailableYears] = useState<string[]>([]);

  // Ajout pour le niveau suivant et admission
  const niveaux = ["6ème", "5ème", "4ème", "3ème", "Seconde", "Première", "Terminale"];
  const [annualAverage, setAnnualAverage] = useState<{ moyenne_annuelle: number, rank: number, total: number, isAdmis: boolean } | null>(null);
  const [nextLevel, setNextLevel] = useState<string>("");
  const [targetLevel, setTargetLevel] = useState<string>("");

  // State pour l'historique des reçus
  const [receiptHistoryOpen, setReceiptHistoryOpen] = useState(false);
  const [receiptHistory, setReceiptHistory] = useState<any[]>([]);
  const [receiptHistoryLoading, setReceiptHistoryLoading] = useState(false);
  const [selectedStudentForHistory, setSelectedStudentForHistory] = useState<any | null>(null);
  const [receiptHistorySearch, setReceiptHistorySearch] = useState('');
  const [receiptHistoryFilter, setReceiptHistoryFilter] = useState('all'); // all, inscription, finalisation, reinscription, paiement

  // Fonction pour convertir le genre de la base de données vers l'affichage
  const getGenderDisplay = (gender: string | undefined) => {
    if (!gender) return 'Non renseigné';
    return gender === 'M' ? 'Masculin' : gender === 'F' ? 'Féminin' : gender;
  };

  // Initialiser le rôle utilisateur
  useEffect(() => {
    const role = getUserRole();
    setUserRole(role);
    console.log('=== [DEBUG] Rôle utilisateur détecté:', role);
  }, []);

  useEffect(() => {
    return () => {
      if (editPhotoPreview?.startsWith('blob:')) {
        URL.revokeObjectURL(editPhotoPreview);
      }
    };
  }, [editPhotoPreview]);

  // Utilitaire pour obtenir l'année scolaire courante
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
  // Ajout des useState manquants pour la gestion du reliquat année précédente (dans le composant)
  // const [previousYearDue, setPreviousYearDue] = useState(0); // Retiré
  // const [previousYearPayment, setPreviousYearPayment] = useState(''); // Retiré
  // Fonction utilitaire pour obtenir l'année scolaire précédente
  function getPreviousSchoolYear() {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;
    let previousSchoolYear = '';
    if (month >= 9) {
      previousSchoolYear = `${year - 1}-${year}`;
    } else {
      previousSchoolYear = `${year - 2}-${year - 1}`;
    }
    return previousSchoolYear;
  }

  // Ajout d'un état pour l'erreur de montant
  const [paymentAmountError, setPaymentAmountError] = useState<string>("");

  // Ajout pour reçu de réinscription
  const [reinscriptionReceiptData, setReinscriptionReceiptData] = useState<any | null>(null);
  const [showReinscriptionReceipt, setShowReinscriptionReceipt] = useState(false);
  const reinscriptionReceiptRef = useRef<HTMLDivElement>(null);

  // Ajout des states
  const [showFinalizeForm, setShowFinalizeForm] = useState(false);
  const [studentToFinalize, setStudentToFinalize] = useState<any | null>(null);

  // Ajout des states pour la cantine lors de la finalisation
  const [finalizeCantine, setFinalizeCantine] = useState(false);
  const [finalizeEatsAtCantine, setFinalizeEatsAtCantine] = useState('');
  const [finalizeAllergy, setFinalizeAllergy] = useState('');

  // Ajout des states pour les contacts WhatsApp lors de la finalisation
  const [finalizeFatherContact, setFinalizeFatherContact] = useState('');
  const [finalizeMotherContact, setFinalizeMotherContact] = useState('');
  const [finalizeEmergencyContact, setFinalizeEmergencyContact] = useState('');
  


  // Fonction pour récupérer le rôle utilisateur depuis le token JWT
  const getUserRole = () => {
    try {
      const token = localStorage.getItem('token');
      if (token) {
        const payload = JSON.parse(atob(token.split('.')[1]));
        return payload.role || '';
      }
    } catch (error) {
      console.error('Erreur lors du décodage du token:', error);
    }
    return '';
  };

  const handleChangePage = (event: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const handleClassChange = (event: any) => {
    setSelectedClass(event.target.value);
    setPage(0);
  };

  const handleScolariteFilterChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setScolariteFilterInput(event.target.value);
  };

  const handleApplyScolariteFilter = () => {
    setScolariteFilter(scolariteFilterInput);
    setPage(0);
  };

  const handleScolariteOperatorChange = (event: SelectChangeEvent) => {
    setScolariteFilterOperator(event.target.value as 'equal' | 'gte' | 'lte');
    setPage(0);
  };

  const handleGenreFilterChange = (event: SelectChangeEvent) => {
    setGenreFilter(event.target.value);
    setPage(0);
  };

  const handleCantineFilterChange = (event: SelectChangeEvent) => {
    setCantineFilter(event.target.value);
    setPage(0);
  };

  const handlePrint = () => {
    if (!tableRef.current) return;

    const rowsHtml = filteredStudents.map((student, index) => {
      const remaining =
        Number(student.total_due || 0) -
        Number(student.total_discount || 0) -
        Number(student.total_paid || 0);

      const cantine =
        student.cantine === true ||
        student.cantine === 1 ||
        student.cantine === '1' ||
        student.cantine === 'Oui' ||
        student.cantine === 'oui'
          ? 'Oui'
          : 'Non';

      const status = remaining > 0 ? 'Non soldé' : 'Soldé';

      const statusClass = remaining > 0 ? 'status-not-solded' : 'status-solded';

      return `
        <tr>
          <td>${index + 1}</td>
          <td>${student.registration_number || ''}</td>
          <td>${student.last_name || ''}</td>
          <td>${student.first_name || ''}</td>
          <td>${getGenderDisplay(student.gender)}</td>
          <td>${student.classe || 'Non assigné'}</td>
          <td>${cantine}</td>
          <td class="${statusClass}">${status}</td>
          <td>${Number(remaining || 0).toLocaleString('fr-FR')} F CFA</td>
        </tr>
      `;
    }).join('');

    const printWindow = window.open('', '', 'height=900,width=1200');
    if (!printWindow) return;

    printWindow.document.write(`
      <html>
        <head>
          <title>Liste des élèves filtrés</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; }
            h2 { text-align: center; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th, td { border: 1px solid #ccc; padding: 8px; text-align: left; font-size: 13px; }
            th { background: #1976d2; color: white; }
            .status-solded { color: #2e7d32; font-weight: 600; }
            .status-not-solded { color: #c62828; font-weight: 600; }
          </style>
        </head>
        <body>
          <h2>Liste des élèves (${filteredStudents.length})</h2>
          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>Matricule</th>
                <th>Nom</th>
                <th>Prénoms</th>
                <th>Genre</th>
                <th>Classe</th>
                <th>Cantine</th>
                <th>Status</th>
                <th>Scolarité due</th>
              </tr>
            </thead>
            <tbody>
              ${rowsHtml || `<tr><td colspan="9">Aucun élève ne correspond aux filtres.</td></tr>`}
            </tbody>
          </table>
        </body>
      </html>
    `);

    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 500);
  };

  const fetchStudents = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const params = new URLSearchParams();
      
      if (selectedClass && selectedClass !== 'Toutes les classes') params.append('class_id', selectedClass);
      if (genreFilter && genreFilter !== 'Tous') params.append('gender', genreFilter);
      if (cantineFilter && cantineFilter !== 'Tous') params.append('cantine', cantineFilter);
      if (scolariteFilter) params.append('scolarite', scolariteFilter);
      if (schoolYear) params.append('school_year', schoolYear);

      console.log('=== [DEBUG] fetchStudents - Paramètres:', params.toString());

      const { data } = await axios.get(`https://saintefamilleexcellence.ci/api/students?${params}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      // Debug: vérifier les données reçues
      console.log('=== [DEBUG] Données reçues du backend ===');
      console.log('Nombre total d\'élèves:', data.length);
      if (data.length > 0) {
        console.log('Premier élève:', data[0]);
        console.log('father_contact du premier élève:', data[0].father_contact);
        console.log('mother_contact du premier élève:', data[0].mother_contact);
        console.log('total_paid du premier élève:', data[0].total_paid);
        console.log('reste_a_payer du premier élève:', data[0].reste_a_payer);
        console.log('class_amount du premier élève:', data[0].class_amount);
      }
      console.log('=== [FIN DEBUG] ===');

      setStudents(data);
    } catch (error) {
      console.error('Erreur lors de la récupération des élèves:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchClasses = async (isMounted?: boolean) => {
    if (isMounted === false) return;
    
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get('https://saintefamilleexcellence.ci/api/classes', {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (isMounted === true || isMounted === undefined) {
        setClasses(res.data.map((c: any) => ({ ...c, level: c.level || '' })));
      }
    } catch (err) {
      if (isMounted === true || isMounted === undefined) {
        console.error("Erreur lors de la récupération des classes", err);
      }
    }
  };

  useEffect(() => {
    let isMounted = true;
    
    const fetchData = async () => {
      if (!isMounted) return;
      
      try {
        await fetchStudents();
        await fetchClasses(isMounted);
      } catch (error) {
        if (isMounted) {
          console.error('Erreur lors du chargement des données:', error);
        }
      }
    };
    
    fetchData();
    
    return () => {
      isMounted = false;
    };
  }, []);

  // Ajoute la fonction utilitaire pour générer les 5 dernières années scolaires
  function getSchoolYears(count = 5) {
    const now = new Date();
    const currentYear = now.getMonth() >= 7 ? now.getFullYear() : now.getFullYear() - 1;
    return Array.from({ length: count }, (_, i) => {
      const start = currentYear - (count - 1 - i);
      return `${start}-${start + 1}`;
    }).reverse();
  }
  
  // Remplace le useEffect qui déduisait les années à partir des élèves
  useEffect(() => {
    let isMounted = true;
    
    if (isMounted) {
      setAvailableYears(getSchoolYears(5));
    }
    
    return () => {
      isMounted = false;
    };
  }, []);

  // Modifie le fetch des élèves pour inclure l'année scolaire
  useEffect(() => {
    let isMounted = true;
    
    const fetchData = async () => {
      if (!isMounted) return;
      
      try {
        await fetchStudents();
      } catch (error) {
        if (isMounted) {
          console.error('Erreur lors du chargement des élèves:', error);
        }
      }
    };
    
    fetchData();
    
    return () => {
      isMounted = false;
    };
  }, [schoolYear]);

  useEffect(() => {
    setScolariteFilterInput(scolariteFilter);
  }, [scolariteFilter]);

  // Afficher tous les élèves inscrits pour l'année en cours (présentiel et en ligne)
  console.log('=== [DEBUG] Filtrage Students:', { 
    totalStudents: students.length, 
    genreFilter, 
    cantineFilter, 
    searchTerm 
  });
  
  const filteredStudents = students.filter((student) => {
    const matchClass = selectedClass === 'Toutes les classes' || student.classe === selectedClass;
    const matchSearch =
      (student.registration_number || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (student.last_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (student.first_name || '').toLowerCase().includes(searchTerm.toLowerCase());

    const remainingAmount =
      Number(student.total_due || 0) -
      Number(student.total_discount || 0) -
      Number(student.total_paid || 0);

    const parsedScolariteFilter = parseInt(scolariteFilter, 10);
    const hasScolariteFilter = scolariteFilter !== '' && !Number.isNaN(parsedScolariteFilter);

    let matchScolarite = true;
    if (hasScolariteFilter) {
      if (scolariteFilterOperator === 'equal') {
        matchScolarite = remainingAmount === parsedScolariteFilter;
      } else if (scolariteFilterOperator === 'gte') {
        matchScolarite = remainingAmount >= parsedScolariteFilter;
      } else {
        matchScolarite = remainingAmount <= parsedScolariteFilter;
      }
    }

    const matchGenre = genreFilter === 'Tous' || getGenderDisplay(student.gender) === genreFilter;

    const isStudentCantine =
      student.cantine === true ||
      student.cantine === 1 ||
      student.cantine === '1' ||
      student.cantine === 'Oui' ||
      student.cantine === 'oui';

    const matchCantine =
      cantineFilter === 'Tous' ||
      (cantineFilter === 'Oui' && isStudentCantine) ||
      (cantineFilter === 'Non' && !isStudentCantine);

    return matchClass && matchSearch && matchScolarite && matchGenre && matchCantine;
  });
  
  console.log('=== [DEBUG] Résultat filtrage Students:', { 
    filteredCount: filteredStudents.length,
    genreFilterApplied: genreFilter !== 'Tous'
  });

  // Log filteredStudents juste avant le rendu du tableau
  console.log('filteredStudents:', filteredStudents);

  // Suppression
  const handleDelete = async (studentId: number) => {
    if (window.confirm('Voulez-vous vraiment supprimer cet élève ?')) {
      try {
        const token = localStorage.getItem('token');
        await axios.delete(`https://saintefamilleexcellence.ci/api/students/${studentId}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        fetchStudents();
      } catch (err) {
        alert('Erreur lors de la suppression');
      }
    }
  };

  // Edition
  const handleEditOpen = (student: any) => {
    setEditStudent({ ...student });
    setEditPhotoFile(null);
    setEditPhotoPreview(null);
    setEditPhotoError(null);
    setEditOpen(true);
  };
  const handleEditClose = () => {
    setEditOpen(false);
    setEditStudent(null);
    setEditSuccessMessage(null);
    setEditErrorMessage(null);
    setEditPhotoFile(null);
    setEditPhotoPreview(null);
    setEditPhotoError(null);
  };
  const handleEditChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEditStudent((prev: any) => ({ ...prev, [e.target.name]: e.target.value }));
  };
  const handleEditPhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';

    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setEditPhotoError('Veuillez sélectionner une image (JPG ou PNG).');
      return;
    }

    const maxSize = 5 * 1024 * 1024; // 5 Mo
    if (file.size > maxSize) {
      setEditPhotoError('La photo doit être inférieure à 5 Mo.');
      return;
    }

    setEditPhotoError(null);
    setEditPhotoFile(file);
    setEditPhotoPreview(URL.createObjectURL(file));
  };
  const handleEditPhotoReset = () => {
    setEditPhotoFile(null);
    setEditPhotoPreview(null);
    setEditPhotoError(null);
  };

  const showSnackbar = (message: string, severity: 'success' | 'error' | 'info' | 'warning') => {
    setSnackbarMessage(message);
    setSnackbarSeverity(severity);
    setSnackbarOpen(true);
  };

  const handleSnackbarClose = () => {
    setSnackbarOpen(false);
  };
  const handleEditSubmit = async () => {
    if (!editStudent) return;
    setEditLoading(true);
    setEditSuccessMessage(null);
    setEditErrorMessage(null);
    
    try {
      const token = localStorage.getItem('token');
      console.log('=== [DEBUG] Envoi des données de modification ===');
      console.log('Données envoyées:', editStudent);
      if (editPhotoFile) {
        console.log('Photo sélectionnée pour la mise à jour:', editPhotoFile.name, editPhotoFile.size);
      }
      
      const url = `https://saintefamilleexcellence.ci/api/students/${editStudent.id}`;
      const headers: Record<string, string> = {};
      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }

      let payload: any = editStudent;

      if (editPhotoFile) {
        const formData = new FormData();
        Object.entries(editStudent).forEach(([key, value]) => {
          if (key === 'child_photo') return;

          if (value === null || typeof value === 'undefined') {
            formData.append(key, '');
            return;
          }

          if (typeof value === 'boolean') {
            formData.append(key, value ? '1' : '0');
            return;
          }

          if (value instanceof File) {
            return;
          }

          if (typeof value === 'object') {
            formData.append(key, JSON.stringify(value));
            return;
          }

          formData.append(key, String(value));
        });

        formData.append('child_photo', editPhotoFile);
        payload = formData;
        headers['Content-Type'] = 'multipart/form-data';
      }
      
      const response = await axios.put(url, payload, {
        headers
      });
      
      console.log('=== [DEBUG] Réponse du serveur ===');
      console.log('Statut:', response.status);
      console.log('Données reçues:', response.data);
      
      // Message de succès
      setEditSuccessMessage('Élève modifié avec succès !');
      showSnackbar('Élève modifié avec succès !', 'success');
      
      // Fermer la modale après un délai pour permettre à l'utilisateur de voir le message
      setTimeout(() => {
        handleEditClose();
        fetchStudents();
      }, 1500);
      
    } catch (err: any) {
      console.error('=== [DEBUG] Erreur lors de la modification ===');
      console.error('Erreur complète:', err);
      console.error('Réponse d\'erreur:', err.response?.data);
      console.error('Statut d\'erreur:', err.response?.status);
      
      // Message d'erreur plus détaillé
      const errorMessage = err.response?.data?.message || 
                          err.response?.data?.error || 
                          err.message || 
                          'Erreur lors de la modification de l\'élève';
      setEditErrorMessage(`Erreur : ${errorMessage}`);
      showSnackbar(`Erreur : ${errorMessage}`, 'error');
    } finally {
      setEditLoading(false);
    }
  };

  // Fonctions pour la modale de paiement
  const handlePaymentOpen = (student: any) => {
    setStudentToPay({
      ...student,
      total_due: student.total_due ?? 0,
      total_paid: student.total_paid ?? 0,
      total_discount: student.total_discount ?? 0,
    });
    setPaymentModalOpen(true);
    setPaymentAmount("");
    setPaymentAmountError("");
  };
  const handlePaymentClose = () => {
    setPaymentModalOpen(false);
    setStudentToPay(null);
    setPaymentAmount('');
    setPaymentConfirmationOpen(false);
  };

  const handlePaymentAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    console.log('Saisie:', value); // Ajout du log pour debug
    setPaymentAmount(value);
    if (studentToPay) {
      const totalDue = studentToPay.total_due ?? 0;
      const totalPaid = studentToPay.total_paid ?? 0;
      const remaining = totalDue - totalPaid;
      if (Number(value) > remaining) {
        setPaymentAmountError('Le montant versé ne peut pas être supérieur au montant restant de la scolarité.');
      } else {
        setPaymentAmountError("");
      }
    }
  };

  // Fonction pour ouvrir le modal de confirmation
  const handlePaymentConfirm = () => {
    if (!studentToPay || !paymentAmount || Number(paymentAmount) <= 0) {
      alert('Veuillez saisir un montant valide.');
      return;
    }
    // Empêcher un paiement supérieur au montant dû
    const totalDue = studentToPay.total_due ?? 0;
    const totalPaid = studentToPay.total_paid ?? 0;
    const remaining = totalDue - totalPaid;
    if (Number(paymentAmount) > remaining) {
      alert('Le montant versé ne peut pas être supérieur au montant restant de la scolarité.');
      return;
    }
    // Ouvrir le modal de confirmation
    setPaymentConfirmationOpen(true);
  };

  const handlePaymentSubmit = async () => {
    if (!studentToPay || !paymentAmount || Number(paymentAmount) <= 0) {
      alert('Veuillez saisir un montant valide.');
      return;
    }
    // Empêcher un paiement supérieur au montant dû
    const totalDue = studentToPay.total_due ?? 0;
    const totalPaid = studentToPay.total_paid ?? 0;
    const remaining = totalDue - totalPaid;
    if (Number(paymentAmount) > remaining) {
      alert('Le montant versé ne peut pas être supérieur au montant restant de la scolarité.');
      return;
    }
    setPaymentLoading(true);
    try {
      const token = localStorage.getItem('token');
      console.log({
        student_id: studentToPay.id,
        amount: Number(paymentAmount),
        school_year: schoolYear,
        payment_method: 'cash',
      });
      const { data } = await axios.post(`https://saintefamilleexcellence.ci/api/payments`, {
        student_id: studentToPay.id,
        amount: Number(paymentAmount),
        school_year: schoolYear,
        payment_method: 'cash',
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      // Utiliser directement les données du reçu retournées par le backend
      const receiptData = {
        // Informations de l'élève
        first_name: data.receiptData?.first_name || studentToPay.first_name,
        last_name: data.receiptData?.last_name || studentToPay.last_name,
        registration_number: data.receiptData?.registration_number || studentToPay.registration_number,
        classe: data.receiptData?.classe || studentToPay.classe,
        cantine: data.receiptData?.cantine || studentToPay.cantine,
        child_photo: data.receiptData?.child_photo || studentToPay.child_photo,
        // Informations financières - utiliser les données calculées par le backend
        montant_total_scolarite: data.receiptData?.total_due || data.receiptData?.class_amount || 0,
        total_reductions: data.receiptData?.total_discount || 0,
        montant_du_avant: data.receiptData?.amount_due_before || 0,
        montant_verse: data.receiptData?.amount || Number(paymentAmount),
        total_deja_verse: data.receiptData?.total_paid || 0,
        reste_a_payer: data.receiptData?.remaining_amount || 0,
        date: new Date().toISOString()
      };
      
      setPaymentReceiptData(receiptData);
      setShowPaymentReceipt(true);
      setPaymentConfirmationOpen(false);
      handlePaymentClose();
              fetchStudents();
    } catch (err: any) {
      console.error('Erreur lors du paiement:', err);
      alert(err.response?.data?.message || 'Erreur lors du paiement.');
    } finally {
      setPaymentLoading(false);
    }
  };

  // Handler Finaliser
    const handleFinalizeOpen = (student: any) => {
    try {
      console.log('=== [DEBUG] handleFinalizeOpen DÉBUT ===');
      console.log('=== [DEBUG] Fonction appelée avec student.id:', student?.id);
      console.log('handleFinalizeOpen appelé avec:', student);
      console.log('registration_mode:', student.registration_mode);
      console.log('isToFinalize:', student.registration_mode === 'online');
      
      // Utiliser un timeout pour s'assurer que les états sont mis à jour
      setTimeout(() => {
        if (student.registration_mode === 'online') {
          console.log('Élève en ligne détecté, ouverture du formulaire complet');
          setStudentToFinalize(student);
          setShowFinalizeForm(true);
          setFinalizeModalOpen(false); // Masquer la modale rapide
          console.log('=== [DEBUG] Formulaire complet activé ===');
          console.log('=== [DEBUG] studentToFinalize sera:', student);
          console.log('=== [DEBUG] showFinalizeForm sera: true');
        } else {
          console.log('Élève présentiel, ouverture de la modale rapide');
          setStudentToFinalize(student);
          setShowFinalizeForm(false);
          setFinalizeModalOpen(true);
          console.log('=== [DEBUG] Modale rapide activée ===');
          console.log('=== [DEBUG] studentToFinalize sera:', student);
          console.log('=== [DEBUG] finalizeModalOpen sera: true');
        }
        
        // Ajout des states pour la cantine lors de la finalisation
        setFinalizeCantine(!!student.cantine);
        setFinalizeEatsAtCantine(student.eats_at_cantine === 1 ? 'oui' : student.eats_at_cantine === 0 ? 'non' : '');
        setFinalizeAllergy(student.allergy || '');
        
        
        // Ajout des states pour les contacts WhatsApp lors de la finalisation
        console.log('=== [DEBUG] Élève dans handleFinalizeOpen:', student);
        console.log('=== [DEBUG] student.father_contact:', student.father_contact);
        console.log('=== [DEBUG] student.mother_contact:', student.mother_contact);
        
        // Utiliser des valeurs par défaut si les champs sont undefined
        const fatherContact = student.father_contact || student.parent_contact || '';
        const motherContact = student.mother_contact || '';
        
        setFinalizeFatherContact(fatherContact);
        setFinalizeMotherContact(motherContact);
        setFinalizeEmergencyContact(student.emergency_contact || '');
        
        // Initialiser les champs obligatoires avec des valeurs par défaut
        setFinalizeClassId('');
        setFinalizeLoading(false);
        
        console.log('=== [DEBUG] handleFinalizeOpen FIN ===');
      }, 0);
      
    } catch (error) {
      console.error('=== [ERREUR] dans handleFinalizeOpen:', error);
    }
  };

  const handleFinalizeClose = () => {
    console.log('Fermeture du modal de finalisation');
    // Utiliser setTimeout pour éviter les conflits de state
    setTimeout(() => {
      setFinalizeModalOpen(false);
      setShowFinalizeForm(false);
      setReinscriptionStudent(null);
      setStudentToFinalize(null);
              setFinalizeClassId('');
        setReceiptData(null);
      setShowReceipt(false);
      // Dans handleFinalizeClose, reset les champs cantine
      setFinalizeCantine(false);
      setFinalizeEatsAtCantine('');
      setFinalizeAllergy('');
      // Reset des champs de contacts
      setFinalizeFatherContact('');
      setFinalizeMotherContact('');
      setFinalizeEmergencyContact('');
    }, 0);
  };

  const handleFinalizeSubmit = async () => {
    const student = studentToFinalize;
    if (!student || !finalizeClassId) {
      alert('Veuillez sélectionner une classe.');
      return;
    }
    
    console.log('=== [DEBUG] DÉBUT FINALISATION ===');
    console.log('student:', student);
    console.log('finalizeClassId:', finalizeClassId);
    
    setFinalizeLoading(true);
    
    try {
      const token = localStorage.getItem('token');
      const payload: any = {
        class_id: finalizeClassId,
        cantine: finalizeCantine ? 1 : 0,
        father_contact: finalizeFatherContact || student.father_contact || student.parent_contact || '',
        mother_contact: finalizeMotherContact || student.mother_contact || '',
        emergency_contact: finalizeEmergencyContact || student.emergency_contact || '',
      };
      
      if (finalizeCantine) {
        payload.eats_at_cantine = finalizeEatsAtCantine === 'oui' ? 1 : 0;
        payload.allergy = finalizeAllergy;
      }
      
      console.log('=== [DEBUG FRONTEND] Payload envoyé:', payload);
      
      // Fermer le modal de finalisation AVANT l'appel API
      console.log('Fermeture du modal avant appel API');
      setShowFinalizeForm(false);
      setStudentToFinalize(null);
      
      const { data } = await axios.post(`https://saintefamilleexcellence.ci/api/students/${student.id}/finalize`, payload, {
        headers: { Authorization: `Bearer ${token}` }
      });
      console.log('=== [DEBUG FRONTEND] Réponse reçue:', data);

      const finalizedClass = classes.find(c => String(c.id) === String(finalizeClassId));
      const classAmount = finalizedClass && finalizedClass.amount != null
        ? Number(finalizedClass.amount)
        : null;
      
      console.log('=== [DEBUG] Finalisation réussie - Aucun paiement créé ===');
      
      // Générer le reçu de finalisation avec le matricule
      const receiptData = {
        first_name: student.first_name,
        last_name: student.last_name,
        registration_number: data.registration_number, // Matricule généré par le backend
        date_of_birth: student.date_of_birth,
        classe: finalizedClass?.name || '',
        parent_code: data.parent_code,
        cantine: payload.cantine,
        eats_at_cantine: payload.eats_at_cantine,
        allergy: payload.allergy,
        parent_first_name: student.parent_first_name,
        parent_last_name: student.parent_last_name,
        parent_email: student.parent_email,
        father_contact: payload.father_contact,
        mother_contact: payload.mother_contact,
        emergency_contact: payload.emergency_contact,
        class_amount: classAmount,
        total_discount: 0,
        payment_amount: 0,
        reste_a_payer: classAmount,
        date: new Date().toISOString()
      };
      
      setReceiptData(receiptData);
      setShowReceipt(true);
      
      // Rafraîchir la liste des élèves avec un délai pour laisser le temps au backend
      console.log('=== [DEBUG] Rafraîchissement de la liste des élèves...');
      setTimeout(async () => {
        console.log('=== [DEBUG] Appel de fetchStudents après délai...');
        await fetchStudents();
        console.log('=== [DEBUG] fetchStudents terminé');
        
        // Mise à jour manuelle de l'élève dans la liste pour s'assurer que les montants sont à jour
        setStudents(prevStudents => {
          const updatedStudents = prevStudents.map(s => {
            if (s.id === student.id) {
              console.log('=== [DEBUG] Mise à jour manuelle de l\'élève:', s.first_name, s.last_name);
              return {
                ...s,
                registration_mode: 'finalized',
                student_code: data.student_code,
                parent_code: data.parent_code,
                registration_number: data.registration_number,
                class_amount: data.class_amount,
                total_paid: data.total_paid,
                total_discount: data.total_discount,
                reste_a_payer: data.reste_a_payer,
                father_contact: finalizeFatherContact || data.father_contact,
                mother_contact: finalizeMotherContact || data.mother_contact,
                cantine: payload.cantine,
                eats_at_cantine: payload.eats_at_cantine,
                allergy: payload.allergy
              };
            }
            return s;
          });
          console.log('=== [DEBUG] Liste mise à jour avec', updatedStudents.length, 'élèves');
          return updatedStudents;
        });
      }, 1000);
      
      console.log('=== [DEBUG] FINALISATION TERMINÉE ===');
      
    } catch (error: any) {
      console.error('Erreur lors de la finalisation:', error);
      alert(error.response?.data?.message || 'Erreur lors de la finalisation.');
    } finally {
      setFinalizeLoading(false);
        // Reset des champs
        setTimeout(() => {
        setFinalizeClassId('');
        setFinalizeCantine(false);
        setFinalizeEatsAtCantine('');
        setFinalizeAllergy('');
        setFinalizeFatherContact('');
        setFinalizeMotherContact('');
        setFinalizeEmergencyContact('');
      }, 100);
    }
  };

  const handlePrintReceipt = () => {
    console.log('Impression du reçu...');
    
    // Créer le contenu HTML pour l'impression
    const printContent = `
      <html>
        <head>
          <title>Reçu d'Inscription</title>
          <style>
            @media print {
              body { margin: 0; padding: 10px; font-family: 'Arial', sans-serif; }
              .receipt-container { page-break-inside: avoid; }
            }
            body { 
              font-family: 'Arial', sans-serif; 
              margin: 10px; 
              color: #333; 
              background: white;
              font-size: 12px;
            }
            .receipt-container { 
              border: 2px solid #1976d2; 
              padding: 15px; 
              width: 100%; 
              max-width: 800px; 
              margin: auto; 
              box-shadow: 0 0 20px rgba(0,0,0,0.1);
              border-radius: 12px;
            }
            .header { 
              text-align: center; 
              background: linear-gradient(135deg, #1976d2 0%, #42a5f5 100%);
              color: white;
              padding: 15px;
              border-radius: 10px 10px 0 0;
              margin: -15px -15px 15px -15px;
            }
            .header h1 { 
              margin: 0; 
              font-size: 20px; 
              font-weight: bold; 
              text-shadow: 1px 1px 2px rgba(0,0,0,0.3);
            }
            .header h2 { 
              margin: 3px 0 0 0; 
              font-size: 14px; 
              font-weight: normal; 
              opacity: 0.9;
            }
            .header .title { 
              font-size: 18px; 
              font-weight: bold; 
              margin-top: 10px; 
              text-transform: uppercase; 
              letter-spacing: 1px;
            }
            .section { 
              margin-bottom: 15px; 
              padding: 12px; 
              border-radius: 8px; 
              border: 2px solid;
            }
            .section.student { 
              background-color: #e3f2fd; 
              border-color: #1976d2;
            }
            .section.cantine { 
              background-color: #f3e5f5; 
              border-color: #9c27b0;
            }
            .section.parent { 
              background-color: #e8f5e8; 
              border-color: #4caf50;
            }
            .section.payment { 
              background-color: #fff3e0; 
              border-color: #ff9800;
            }
            .section h3 { 
              margin: 0 0 12px 0; 
              font-size: 14px; 
              font-weight: bold; 
              text-align: center; 
              text-transform: uppercase; 
              letter-spacing: 0.5px;
            }
            .section.student h3 { color: #1976d2; }
            .section.cantine h3 { color: #9c27b0; }
            .section.parent h3 { color: #4caf50; }
            .section.payment h3 { color: #ff9800; }
            .info-grid { 
              display: grid; 
              grid-template-columns: 1fr 1fr; 
              gap: 8px;
            }
            .info-item { 
              margin-bottom: 8px; 
            }
            .info-label { 
              font-weight: bold; 
              color: #555; 
              margin-bottom: 2px;
              font-size: 11px;
            }
            .info-value { 
              font-size: 12px; 
              font-weight: bold;
            }
            .student .info-value { color: #1976d2; }
            .parent .info-value { color: #4caf50; }
            .payment .info-value { color: #1976d2; }
            .payment .info-value.amount { color: #ff9800; }
            .payment .info-value.discount { color: #4caf50; }
            .payment .info-value.remaining { color: #f44336; }
            .chip { 
              display: inline-block; 
              padding: 2px 8px; 
              border-radius: 12px; 
              font-size: 10px; 
              font-weight: bold; 
              margin-left: 4px;
            }
            .chip.success { 
              background-color: #4caf50; 
              color: white;
            }
            .chip.default { 
              background-color: #9e9e9e; 
              color: white;
            }
            .chip.error { 
              background-color: #f44336; 
              color: white;
            }
            .basic-info { 
              display: flex; 
              justify-content: space-between; 
              margin-bottom: 15px; 
              padding: 10px; 
              background-color: #f8f9fa; 
              border-radius: 8px; 
              border: 1px solid #e9ecef;
              font-size: 11px;
            }
            .basic-info div { 
              font-weight: bold; 
              color: #1976d2;
            }
            @media print {
              .no-print { display: none; }
              @page { margin: 10mm; }
            }
          </style>
        </head>
        <body>
          <div class="receipt-container">
            <div class="header">
              <h1>ÉCOLE "GROUPE SCOLAIRE SAINTE FAMILLE L'EXECELLENCE"</h1>
              <div class="title">Reçu d'Inscription</div>
            </div>
            
            <div class="basic-info">
              <div><strong>Date:</strong> ${receiptData?.date || ''}</div>
              <div><strong>Matricule:</strong> ${receiptData?.registration_number || ''}</div>
            </div>
            
            <div class="section student">
              <h3>📚 Informations de l'Élève</h3>
              <div class="info-grid">
                <div class="info-item">
                  <div class="info-label">Nom:</div>
                  <div class="info-value">${receiptData?.last_name || ''}</div>
                </div>
                <div class="info-item">
                  <div class="info-label">Prénoms:</div>
                  <div class="info-value">${receiptData?.first_name || ''}</div>
                </div>
                <div class="info-item">
                  <div class="info-label">Date de naissance:</div>
                  <div class="info-value">${receiptData?.date_of_birth ? new Date(receiptData.date_of_birth).toLocaleDateString('fr-FR') : ''}</div>
                </div>
                <div class="info-item">
                  <div class="info-label">Classe:</div>
                  <div class="info-value">${receiptData?.classe || ''}</div>
                </div>
                <div class="info-item">
                  <div class="info-label">Code parent:</div>
                  <div class="info-value">${receiptData?.parent_code || ''}</div>
                </div>
              </div>
            </div>
            
            <div class="section cantine">
              <h3>🍽️ Informations Cantine</h3>
              <div class="info-grid">
                <div class="info-item">
                  <div class="info-label">Inscrit à la cantine:</div>
                  <div class="info-value">
                    ${(receiptData?.cantine === true || receiptData?.cantine === 1 || receiptData?.cantine === "Oui" || receiptData?.cantine === "oui") 
                      ? '<span class="chip success">Oui</span>' 
                      : '<span class="chip default">Non</span>'}
                  </div>
                </div>
                ${(receiptData?.cantine === true || receiptData?.cantine === 1 || receiptData?.cantine === "Oui" || receiptData?.cantine === "oui") ? `
                <div class="info-item">
                  <div class="info-label">L'enfant mange à la cantine:</div>
                  <div class="info-value">
                    ${(receiptData?.eats_at_cantine === true || receiptData?.eats_at_cantine === 1 || receiptData?.eats_at_cantine === "Oui" || receiptData?.eats_at_cantine === "oui") 
                      ? '<span class="chip success">Oui</span>' 
                      : '<span class="chip default">Non</span>'}
                  </div>
                </div>
                ${receiptData?.allergy ? `
                <div class="info-item" style="grid-column: 1 / -1;">
                  <div class="info-label">Allergie(s):</div>
                  <div class="info-value" style="color: #d32f2f;">${receiptData.allergy}</div>
                </div>
                ` : ''}
                ` : ''}
              </div>
            </div>
            
            <div class="section parent">
              <h3>👨‍👩‍👧‍👦 Informations du Parent</h3>
              <div class="info-grid">
                <div class="info-item">
                  <div class="info-label">Nom du parent:</div>
                  <div class="info-value">${receiptData?.parent_last_name || ''}</div>
                </div>
                <div class="info-item">
                  <div class="info-label">Prénoms du parent:</div>
                  <div class="info-value">${receiptData?.parent_first_name || ''}</div>
                </div>
                <div class="info-item">
                  <div class="info-label">Email:</div>
                  <div class="info-value">${receiptData?.parent_email || ''}</div>
                </div>
                <div class="info-item">
                  <div class="info-label">Contact WhatsApp du père:</div>
                  <div class="info-value" style="color: #25d366;">${receiptData?.father_contact || '—'}</div>
                </div>
                <div class="info-item">
                  <div class="info-label">Contact WhatsApp de la mère:</div>
                  <div class="info-value" style="color: #25d366;">${receiptData?.mother_contact || '—'}</div>
                </div>
                <div class="info-item">
                  <div class="info-label">Contact d'urgence:</div>
                  <div class="info-value" style="color: #ff9800;">${receiptData?.emergency_contact || receiptData?.parent_contact || receiptData?.father_contact || receiptData?.mother_contact || '—'}</div>
                </div>
              </div>
            </div>
            
            <div class="section payment">
              <h3>💰 Détails du Paiement</h3>
              <div class="info-grid">
                <div class="info-item">
                  <div class="info-label">Montant total de la scolarité:</div>
                  <div class="info-value">${Number(receiptData?.class_amount || 0).toLocaleString('fr-FR')} F CFA</div>
                </div>
                <div class="info-item">
                  <div class="info-label">Total des réductions:</div>
                  <div class="info-value discount">${Number(receiptData?.total_discount || 0).toLocaleString('fr-FR')} F CFA</div>
                </div>
                <div class="info-item">
                  <div class="info-label">Montant de ce versement:</div>
                  <div class="info-value amount">${Number(receiptData?.payment_amount || 0).toLocaleString('fr-FR')} F CFA</div>
                </div>
                <div class="info-item">
                  <div class="info-label">Reste à payer:</div>
                  <div class="info-value ${receiptData?.reste_a_payer > 0 ? 'remaining' : 'success'}">
                    ${receiptData?.reste_a_payer > 0 ? `${Number(receiptData.reste_a_payer).toLocaleString('fr-FR')} F CFA` : 'Soldé'}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </body>
      </html>
    `;
    
    const printWindow = window.open('', '_blank', 'height=700,width=800');
    if (printWindow) {
      printWindow.document.write(printContent);
      printWindow.document.close();
      printWindow.focus();
      setTimeout(() => {
        printWindow.print();
        printWindow.close();
      }, 500);
    } else {
      alert('Veuillez autoriser les popups pour imprimer le reçu.');
    }
  };

  // Réinscription
  const handleReinscriptionOpen = () => {
    setReinscriptionOpen(true);
    setMatriculeSearch('');
    setReinscriptionStudent(null);
    setReinscriptionError(null);
    setReinscriptionClassId('');
    // setReinscriptionPayment(''); // Retiré
    setReinscriptionApiError(null); // reset
  };
  const handleReinscriptionClose = () => {
    setReinscriptionOpen(false);
    setMatriculeSearch('');
    setReinscriptionStudent(null);
    setReinscriptionError(null);
    setReinscriptionClassId('');
    // setReinscriptionPayment(''); // Retiré
    setReinscriptionApiError(null); // reset
  };
  const handleMatriculeSearch = async () => {
    setReinscriptionLoading(true);
    setReinscriptionError(null);
    setReinscriptionStudent(null);
    // setPreviousYearDue(0); // reset - Retiré
    // setPreviousYearPayment(''); // reset - Retiré
    try {
      const token = localStorage.getItem('token');
      const { data } = await axios.get(`https://saintefamilleexcellence.ci/api/students/search/registration/${matriculeSearch}`,
        { headers: { Authorization: `Bearer ${token}` } });
      
      if (data && data.found && data.student) {
        setReinscriptionStudent(data.student);
        
        // Calcul du reliquat retiré
        // const prevYear = getPreviousSchoolYear();
        // const totalPaid2023_2024 = data.student.total_paid_2023_2024 || 0;
        // const totalPaid2024_2025 = data.student.total_paid_2024_2025 || 0;
        
        // // Utiliser le montant payé de l'année précédente pour calculer le reliquat
        // let totalDue = 0;
        // if (data.student.total_due) {
        //   totalDue = data.student.total_due;
        // }
        
        // // Calculer le reliquat (montant dû - montant payé pour l'année précédente)
        // const remainingBalance = Math.max(totalDue - totalPaid2023_2024, 0);
        // setPreviousYearDue(remainingBalance);
        
        console.log('[DEBUG] Élève trouvé:', data.student.first_name, data.student.last_name);
        // Variables de paiement retirées
        // console.log('[DEBUG] Total dû:', totalDue);
        // console.log('[DEBUG] Total payé 2023-2024:', totalPaid2023_2024);
        // console.log('[DEBUG] Reliquat calculé:', remainingBalance);
      } else {
        setReinscriptionError("Désolé, ce matricule n'existe pas dans la base de données.");
      }
    } catch (error: any) {
      console.error('[DEBUG] Erreur recherche matricule:', error);
      if (error.response && error.response.status === 404) {
        setReinscriptionError("Désolé, ce matricule n'existe pas dans la base de données.");
      } else {
        setReinscriptionError('Erreur lors de la recherche du matricule.');
      }
    }
    setReinscriptionLoading(false);
  };
  const handleParentFieldChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setParentFields(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };
  const handleReinscriptionSubmit = async () => {
    if (!reinscriptionStudent || !reinscriptionClassId) {
      setReinscriptionApiError('Veuillez remplir tous les champs.');
      return;
    }
    setReinscriptionSubmitting(true);
    setReinscriptionApiError(null);
    try {
      const token = localStorage.getItem('token');
      // Paiement retiré du formulaire de réinscription
      // Si reliquat à payer, enregistrer d'abord le paiement du reliquat
      // if (previousYearDue > 0) {
      //   if (!previousYearPayment || Number(previousYearPayment) < previousYearDue) {
      //     setReinscriptionApiError('Veuillez régler le reliquat de l\'année précédente.');
      //     setReinscriptionSubmitting(false);
      //     return;
      //   }
      //   // Paiement du reliquat
      //   console.log('[DEBUG] Paiement du reliquat:', {
      //     student_id: reinscriptionStudent.id,
      //     amount: previousYearPayment,
      //     school_year: getPreviousSchoolYear(),
      //     description: `Reliquat année ${getPreviousSchoolYear()}`
      //   });
      //   
      //   await axios.post(`https://saintefamilleexcellence.ci/api/payments`, {
      //     student_id: reinscriptionStudent.id,
      //     amount: previousYearPayment,
      //     school_year: getPreviousSchoolYear(),
      //     payment_method: 'cash',
      //     description: `Reliquat année ${getPreviousSchoolYear()}`,
      //     status: 'completed'
      //   }, { headers: { Authorization: `Bearer ${token}` } });
      // }
      // Réinscription pour la nouvelle année (sans paiement)
      const { data } = await axios.post(`https://saintefamilleexcellence.ci/api/students/${reinscriptionStudent.id}/reinscription`, {
        class_id: reinscriptionClassId,
        // payment_amount: reinscriptionPayment, // Retiré
        school_year: schoolYear,
        // payment_method: 'cash', // Retiré
        // previous_year_due: previousYearDue, // Retiré
        // previous_year_payment: previousYearPayment, // Retiré
        ...parentFields
      }, { headers: { Authorization: `Bearer ${token}` } });
      // Préparer les données du reçu
      const classeObj = classes.find(c => c.id === parseInt(reinscriptionClassId));
      const receipt = {
        ...reinscriptionStudent,
        parent: { ...parentFields },
        classe: classeObj?.name || '',
        // payment_amount: reinscriptionPayment, // Retiré
        schoolYear: schoolYear,
        date: new Date().toISOString(),
        student_code: data.student_code,
        parent_code: data.parent_code,
        cantine: reinscriptionStudent.cantine ?? reinscriptionStudent.is_cantine ?? false // Correction pour le reçu
      };
      setReinscriptionReceiptData(receipt);
      setShowReinscriptionReceipt(true);
      handleReinscriptionClose();
              fetchStudents();
      // alert('Réinscription effectuée avec succès !'); // Remplacé par le reçu
    } catch (err: any) {
      if (err.response && err.response.data && err.response.data.message) {
        setReinscriptionApiError(err.response.data.message);
      } else {
        setReinscriptionApiError('Erreur lors de la réinscription ou du paiement du reliquat.');
      }
    }
    setReinscriptionSubmitting(false);
  };

  // Quand on trouve l'élève, préremplir les champs parent
  useEffect(() => {
    if (reinscriptionStudent) {
      setParentFields({
        parent_first_name: reinscriptionStudent.parent_first_name || '',
        parent_last_name: reinscriptionStudent.parent_last_name || '',
        parent_phone: reinscriptionStudent.parent_phone || '',
        parent_email: reinscriptionStudent.parent_email || '',
        parent_contact: reinscriptionStudent.parent_contact || ''
      });
    }
  }, [reinscriptionStudent]);

  // Récupérer la moyenne annuelle et admission à chaque recherche d'élève
  useEffect(() => {
    const fetchAnnualAverage = async () => {
      if (reinscriptionStudent) {
        try {
          const token = localStorage.getItem('token');
          const { data } = await axios.get(`https://saintefamilleexcellence.ci/api/students/${reinscriptionStudent.id}/annual-average`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          // Admis si moyenne >= 10
          setAnnualAverage({ ...data, isAdmis: data.moyenne_annuelle >= 10 });
        } catch {
          setAnnualAverage(null);
        }
      } else {
        setAnnualAverage(null);
      }
    };
    fetchAnnualAverage();
  }, [reinscriptionStudent]);

  // Calcul du niveau suivant et du niveau cible pour la réinscription
  useEffect(() => {
    if (reinscriptionStudent && annualAverage) {
      // On récupère le niveau actuel depuis la classe ou le champ level
      let niveauActuel = reinscriptionStudent.level;
      if (!niveauActuel && reinscriptionStudent.classe) {
        // Extrait le niveau même s'il y a des espaces (ex: "4 ème 1" => "4ème")
        const match = reinscriptionStudent.classe.match(/^((\d+)\s*ème|Seconde|Première|Terminale)/i);
        niveauActuel = match ? match[1].replace(/\s+/g, '') : "";
      }
      const index = niveaux.findIndex(n => n.toLowerCase() === niveauActuel.toLowerCase());
      let suivant = niveauActuel;
      if (annualAverage.isAdmis && index >= 0 && index < niveaux.length - 1) {
        suivant = niveaux[index + 1];
      }
      setNextLevel(suivant);
      // Correction : niveau cible pour la réinscription
      if (annualAverage.isAdmis && index >= 0 && index < niveaux.length - 1) {
        setTargetLevel(niveaux[index + 1]);
      } else {
        setTargetLevel(niveauActuel);
      }
    } else {
      setNextLevel("");
      setTargetLevel("");
    }
  }, [reinscriptionStudent, annualAverage]);

  // Filtrer les classes du niveau cible (redoublement ou passage)
  const classesNiveauCible = targetLevel ? classes.filter(c => c.level && c.level.toLowerCase() === targetLevel.toLowerCase()) : classes;

  // Impression du reçu de paiement
  const handlePrintPaymentReceipt = () => {
    const printContent = paymentReceiptRef.current;
    if (printContent) {
      const printWindow = window.open('', '_blank', 'height=700,width=800');
      if (printWindow) {
        printWindow.document.write('<html><head><title>Reçu de Paiement</title>');
        printWindow.document.write(`
            <style>
                body { font-family: 'Arial', sans-serif; margin: 20px; color: #333; }
                .receipt-container { border: 1px solid #1976d2; padding: 30px; width: 100%; max-width: 650px; margin: auto; box-shadow: 0 0 10px rgba(0,0,0,0.05); }
                .header { text-align: center; border-bottom: 2px solid #1976d2; padding-bottom: 10px; margin-bottom: 30px; }
                .header h2 { margin: 0; color: #1976d2; }
                .header p { margin: 5px 0 0; }
                .content-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 15px 30px; margin-bottom: 30px;}
                .content-grid p { margin: 5px 0; font-size: 1.1em; }
                .content-grid .label { font-weight: bold; color: #555; }
                .content-grid .value { font-weight: bold; color: #1976d2; }
                .footer { text-align: center; margin-top: 40px; font-style: italic; font-size: 0.9em; color: #777; }
                .total { font-size: 1.3em; font-weight: bold; margin-top: 30px; text-align: right; color: #333; }
                .school-stamp { text-align: right; margin-top: 50px; }
                .school-stamp p { margin: 0; }
            </style>
        `);
        printWindow.document.write('</head><body>');
        printWindow.document.write(printContent.innerHTML);
        printWindow.document.write('</body></html>');
        printWindow.document.close();
        printWindow.focus();
        setTimeout(() => {
            printWindow.print();
            printWindow.close();
        }, 250);
      }
    }
  };

  // Impression du reçu de réinscription
  const handlePrintReinscriptionReceipt = () => {
    const printContent = reinscriptionReceiptRef.current;
    if (printContent) {
      const printWindow = window.open('', '_blank', 'height=700,width=800');
      if (printWindow) {
        printWindow.document.write('<html><head><title>Reçu de Réinscription</title>');
        printWindow.document.write(`
            <style>
                body { font-family: 'Arial', sans-serif; margin: 20px; color: #333; }
                .receipt-container { border: 1px solid #1976d2; padding: 30px; width: 100%; max-width: 650px; margin: auto; box-shadow: 0 0 10px rgba(0,0,0,0.05); }
                .header { text-align: center; border-bottom: 2px solid #1976d2; padding-bottom: 10px; margin-bottom: 30px; }
                .header h2 { margin: 0; color: #1976d2; }
                .header p { margin: 5px 0 0; }
                .content-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 15px 30px; margin-bottom: 30px;}
                .content-grid p { margin: 5px 0; font-size: 1.1em; }
                .content-grid .label { font-weight: bold; color: #555; }
                .content-grid .value { font-weight: bold; color: #1976d2; }
                .footer { text-align: center; margin-top: 40px; font-style: italic; font-size: 0.9em; color: #777; }
                .total { font-size: 1.3em; font-weight: bold; margin-top: 30px; text-align: right; color: #333; }
                .school-stamp { text-align: right; margin-top: 50px; }
                .school-stamp p { margin: 0; }
            </style>
        `);
        printWindow.document.write('</head><body>');
        printWindow.document.write(printContent.innerHTML);
        printWindow.document.write('</body></html>');
        printWindow.document.close();
        printWindow.focus();
        setTimeout(() => {
            printWindow.print();
            printWindow.close();
        }, 250);
      }
    }
  };

  const handleShowReceipt = async (paymentId: number | string) => {
    try {
      const token = localStorage.getItem('token');
      const { data } = await axios.get(`https://saintefamilleexcellence.ci/api/payments/${paymentId}/receipt`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      // Utiliser directement les données du reçu retournées par le backend
      const receiptData = {
        // Informations de l'élève
        first_name: data?.first_name || '',
        last_name: data?.last_name || '',
        registration_number: data?.registration_number || '',
        classe: data?.classe || '',
        cantine: data?.cantine || false,
        // Informations financières - utiliser les données calculées par le backend
        montant_total_scolarite: data?.total_due || data?.class_amount || 0,
        total_reductions: data?.total_discount || 0,
        montant_du_avant: data?.amount_due_before || 0,
        montant_verse: data?.amount || 0,
        total_deja_verse: data?.total_paid || 0,
        reste_a_payer: data?.remaining_amount || 0,
        date: data?.date || new Date().toISOString()
      };
      
      setPaymentReceiptData(receiptData);
      setShowPaymentReceipt(true);
    } catch (err) {
      alert('Erreur lors de la récupération du reçu.');
    }
  };

  // Fonctions pour l'historique des reçus
  const handleReceiptHistoryOpen = (student: any) => {
    setSelectedStudentForHistory(student);
    setReceiptHistoryOpen(true);
    fetchReceiptHistory(student.id);
  };

  const handleReceiptHistoryClose = () => {
    setReceiptHistoryOpen(false);
    setSelectedStudentForHistory(null);
    setReceiptHistory([]);
    setReceiptHistorySearch('');
    setReceiptHistoryFilter('all');
  };

  const fetchReceiptHistory = async (studentId: number) => {
    setReceiptHistoryLoading(true);
    try {
      const token = localStorage.getItem('token');
      const { data } = await axios.get(`https://saintefamilleexcellence.ci/api/students/${studentId}/receipt-history`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setReceiptHistory(data || []);
    } catch (err) {
      console.error('Erreur lors de la récupération de l\'historique des reçus:', err);
      setReceiptHistory([]);
    } finally {
      setReceiptHistoryLoading(false);
    }
  };

  const handlePrintReceiptFromHistory = async (receipt: any) => {
    try {
      const token = localStorage.getItem('token');
      let receiptData;
      
      switch (receipt.type) {
        case 'inscription':
          const inscriptionResponse = await axios.get(`https://saintefamilleexcellence.ci/api/students/${receipt.student_id}/inscription-receipt?enrollment_date=${receipt.created_at}`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          receiptData = inscriptionResponse.data.html;
          break;
        case 'finalisation':
        case 'reinscription':
        case 'paiement':
          if (!receipt.payment_id) {
            throw new Error('ID de paiement manquant pour ce type de reçu');
          }
          const paymentResponse = await axios.get(`https://saintefamilleexcellence.ci/api/students/${receipt.student_id}/payment-receipt/${receipt.payment_id}`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          receiptData = paymentResponse.data.html;
          break;
        default:
          throw new Error('Type de reçu non reconnu');
      }

      // Générer et imprimer le reçu
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write(`
          <!DOCTYPE html>
          <html>
            <head>
              <title>Reçu - ${getReceiptTypeLabel(receipt.type)}</title>
              <style>
                body { font-family: Arial, sans-serif; margin: 20px; }
                .receipt { border: 1px solid #ccc; padding: 20px; max-width: 600px; margin: 0 auto; }
                .header { text-align: center; margin-bottom: 20px; }
                .content { margin-bottom: 20px; }
                .footer { text-align: center; margin-top: 20px; }
                @media print { body { margin: 0; } }
              </style>
            </head>
            <body>
              <div class="receipt">
                ${receiptData}
              </div>
            </body>
          </html>
        `);
        printWindow.document.close();
        printWindow.focus();
        setTimeout(() => {
          printWindow.print();
          printWindow.close();
        }, 250);
      }
    } catch (err) {
      console.error('Erreur lors de l\'impression du reçu:', err);
      alert('Erreur lors de l\'impression du reçu.');
    }
  };

  const getReceiptTypeLabel = (type: string) => {
    switch (type) {
      case 'inscription': return 'Inscription';
      case 'finalisation': return 'Finalisation';
      case 'reinscription': return 'Réinscription';
      case 'paiement': return 'Paiement';
      default: return type;
    }
  };

  const getReceiptTypeColor = (type: string) => {
    switch (type) {
      case 'inscription': return 'primary';
      case 'finalisation': return 'success';
      case 'reinscription': return 'warning';
      case 'paiement': return 'info';
      default: return 'default';
    }
  };

  const filteredReceiptHistory = receiptHistory.filter(receipt => {
    const matchesSearch = receipt.description?.toLowerCase().includes(receiptHistorySearch.toLowerCase()) ||
                         receipt.type?.toLowerCase().includes(receiptHistorySearch.toLowerCase());
    const matchesFilter = receiptHistoryFilter === 'all' || receipt.type === receiptHistoryFilter;
    return matchesSearch && matchesFilter;
  });

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', background: 'linear-gradient(135deg, #f5f7fa 0%, #e4e8eb 100%)' }}>
      <SecretarySidebar />
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: 3,
          width: '100%',
        }}
      >
        <Container maxWidth="lg">
          {/* Sélecteur d'année scolaire */}
          <Box sx={{ mb: 2 }}>
            <FormControl size="small" sx={{ minWidth: 180 }}>
              <InputLabel id="school-year-label">Année scolaire</InputLabel>
              <Select
                labelId="school-year-label"
                value={schoolYear}
                label="Année scolaire"
                onChange={e => setSchoolYear(e.target.value)}
              >
                {availableYears.map(year => (
                  <MenuItem key={year} value={year}>{year}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>
          {showRegistrationForm ? (
            <InscrptionPre onClose={() => {
              setShowRegistrationForm(false);
              fetchStudents();
            }} />
          ) : (
            <>
              <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <SchoolIcon sx={{ fontSize: 40, color: theme.palette.primary.main }} />
                  <Typography variant="h4" component="h1" sx={{ 
                    fontWeight: 700,
                    background: `linear-gradient(45deg, ${theme.palette.primary.main}, ${theme.palette.primary.light})`,
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                  }}>
                    Gestion des Élèves
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', gap: 2 }}>
                  <Button
                    variant="contained"
                    color="primary"
                    startIcon={<AddIcon />}
                    onClick={() => setShowRegistrationForm(true)}
                    sx={{
                      background: `linear-gradient(45deg, ${green[500]} 30%, ${green[700]} 90%)`,
                      color: 'white',
                      '&:hover': {
                        background: `linear-gradient(45deg, ${green[600]} 30%, ${green[800]} 90%)`,
                      },
                      px: 3,
                      py: 1,
                    }}
                  >
                    Nouvel Élève
                  </Button>
                  <Button
                    variant="contained"
                    startIcon={<ReplayIcon />}
                    onClick={handleReinscriptionOpen}
                    sx={{
                      background: `linear-gradient(45deg, ${purple[500]} 30%, ${purple[700]} 90%)`,
                      color: 'white',
                      '&:hover': {
                        background: `linear-gradient(45deg, ${purple[600]} 30%, ${purple[800]} 90%)`,
                      },
                      px: 3,
                      py: 1,
                    }}
                  >
                    Réinscription
                  </Button>
                  <Button
                    variant="contained"
                    startIcon={<PrintIcon />}
                    onClick={handlePrint}
                    sx={{
                      background: `linear-gradient(45deg, ${blue[500]} 30%, ${blue[700]} 90%)`,
                      color: 'white',
                      '&:hover': {
                        background: `linear-gradient(45deg, ${blue[600]} 30%, ${blue[800]} 90%)`,
                      },
                      px: 3,
                      py: 1,
                    }}
                  >
                    Imprimer
                  </Button>
                </Box>
              </Box>

              <Card sx={{ mb: 4, borderRadius: 3, boxShadow: 3 }}>
                <CardContent>
                  <Grid container spacing={2}>
                    <Grid item xs={12} md={4}>
                      <TextField
                        fullWidth
                        variant="outlined"
                        placeholder="Rechercher un élève..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        InputProps={{
                          startAdornment: (
                            <InputAdornment position="start">
                              <SearchIcon color="primary" />
                            </InputAdornment>
                          ),
                        }}
                        sx={{
                          '& .MuiOutlinedInput-root': {
                            '&:hover fieldset': {
                              borderColor: theme.palette.primary.main,
                            },
                          },
                        }}
                      />
                    </Grid>
                    <Grid item xs={6} md={2}>
                      <FormControl fullWidth variant="outlined">
                        <InputLabel>Classe</InputLabel>
                        <Select
                          value={selectedClass}
                          onChange={handleClassChange}
                          label="Classe"
                          sx={{
                            '&:hover .MuiOutlinedInput-notchedOutline': {
                              borderColor: theme.palette.primary.main,
                            },
                          }}
                        >
                          <MenuItem value="Toutes les classes">Toutes les classes</MenuItem>
                          {classes.map((classe) => (
                            <MenuItem key={classe.id} value={classe.name}>{classe.name}</MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                    </Grid>
                    <Grid item xs={6} md={2}>
                      <FormControl fullWidth variant="outlined">
                        <InputLabel>Genre</InputLabel>
                        <Select
                          value={genreFilter}
                          onChange={handleGenreFilterChange}
                          label="Genre"
                          sx={{
                            '&:hover .MuiOutlinedInput-notchedOutline': {
                              borderColor: theme.palette.primary.main,
                            },
                          }}
                        >
                          {genreOptions.map((option) => (
                            <MenuItem key={option} value={option}>{option}</MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                    </Grid>
                    <Grid item xs={6} md={2}>
                      <FormControl fullWidth variant="outlined">
                        <InputLabel>Cantine</InputLabel>
                        <Select
                          value={cantineFilter}
                          onChange={e => setCantineFilter(e.target.value)}
                          label="Cantine"
                          sx={{
                            '&:hover .MuiOutlinedInput-notchedOutline': {
                              borderColor: theme.palette.primary.main,
                            },
                          }}
                        >
                          {cantineOptions.map((option) => (
                            <MenuItem key={option} value={option}>{option}</MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                    </Grid>
                    <Grid item xs={12} md={3}>
                      <TextField
                        fullWidth
                        variant="outlined"
                        label="Montant dû (F CFA)"
                        type="number"
                        value={scolariteFilterInput}
                        onChange={handleScolariteFilterChange}
                        sx={{
                          '& .MuiOutlinedInput-root': {
                            '&:hover fieldset': {
                              borderColor: theme.palette.primary.main,
                            },
                          },
                        }}
                      />
                    </Grid>
                    <Grid item xs={12} md={2}>
                      <FormControl fullWidth variant="outlined">
                        <InputLabel>Comparaison</InputLabel>
                        <Select
                          value={scolariteFilterOperator}
                          onChange={handleScolariteOperatorChange}
                          label="Comparaison"
                          sx={{
                            '&:hover .MuiOutlinedInput-notchedOutline': {
                              borderColor: theme.palette.primary.main,
                            },
                          }}
                        >
                          <MenuItem value="gte">Supérieur ou égal</MenuItem>
                          <MenuItem value="lte">Inférieur ou égal</MenuItem>
                          <MenuItem value="equal">Égale</MenuItem>
                        </Select>
                      </FormControl>
                    </Grid>
                    <Grid item xs={12} md={2}>
                      <Button
                        fullWidth
                        variant="contained"
                        color="primary"
                        startIcon={<SearchIcon />}
                        onClick={handleApplyScolariteFilter}
                        sx={{ height: '100%' }}
                      >
                        Rechercher
                      </Button>
                    </Grid>
                  </Grid>
                </CardContent>
              </Card>

              <div ref={tableRef}>
                <Paper sx={{ borderRadius: 3, overflow: 'hidden', boxShadow: 3 }}>
                  <TableContainer>
                    <Table>
                                              <TableHead>
                          <TableRow sx={{ background: `linear-gradient(45deg, ${theme.palette.primary.main} 30%, ${theme.palette.primary.light} 90%)` }}>
                            <TableCell sx={{ color: 'white', fontWeight: 600 }}>Matricule</TableCell>
                            <TableCell sx={{ color: 'white', fontWeight: 600 }}>Nom</TableCell>
                            <TableCell sx={{ color: 'white', fontWeight: 600 }}>Prénoms</TableCell>
                            <TableCell sx={{ color: 'white', fontWeight: 600 }}>Genre</TableCell>
                            <TableCell sx={{ color: 'white', fontWeight: 600 }}>Classe</TableCell>
                            <TableCell sx={{ color: 'white', fontWeight: 600 }}>Cantine</TableCell>
                            <TableCell sx={{ color: 'white', fontWeight: 600 }}>status</TableCell>
                            <TableCell sx={{ color: 'white', fontWeight: 600 }}>Scolarité due (F CFA)</TableCell>
                            <TableCell align="right" sx={{ color: 'white', fontWeight: 600 }}>Actions</TableCell>
                          </TableRow>
                        </TableHead>
                      <TableBody>
                        {loading && (
                          <TableRow>
                            <TableCell colSpan={8} align="center">Chargement...</TableCell>
                          </TableRow>
                        )}
                        {error && (
                          <TableRow>
                            <TableCell colSpan={8} align="center" sx={{ color: 'error.main' }}>{error}</TableCell>
                          </TableRow>
                        )}
                        {filteredStudents
                          .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                          .map((student) => {
                            const remaining = (Number(student.total_due) || 0) - (Number(student.total_discount) || 0) - (Number(student.total_paid) || 0);
                            const isToFinalize = student.registration_mode === 'online' || student.registration_status === 'online' || !student.classe;
                            
                            // Log pour debug
                            console.log('Élève:', student.registration_number, 'registration_mode:', student.registration_mode, 'isToFinalize:', isToFinalize);
                            
                            return (
                              <Zoom in key={student.id}>
                                <TableRow hover>
                                  <TableCell>{student.registration_number}</TableCell>
                                  <TableCell>{student.last_name}</TableCell>
                                  <TableCell>{student.first_name}</TableCell>
                                  <TableCell>
                                    <Chip 
                                      label={getGenderDisplay(student.gender)} 
                                      color={getGenderDisplay(student.gender) === 'Masculin' ? 'primary' : 'secondary'} 
                                      size="small" 
                                    />
                                  </TableCell>
                                  <TableCell>
                                    {student.classe ? (
                                      <Chip label={student.classe} color="primary" size="small" />
                                    ) : (
                                      <Chip label="Non assigné" size="small" />
                                    )}
                                  </TableCell>
                                  <TableCell>
                                    {(() => {
                                      // Log pour debug
                                      console.log('Cantine pour', student.registration_number, ':', student.cantine, 'type:', typeof student.cantine);
                                      // Test robuste pour la cantine
                                      const isCantine = student.cantine === true || student.cantine === 1 || student.cantine === "1" || student.cantine === "Oui" || student.cantine === "oui";
                                      return isCantine ? (
                                        <Chip label="Oui" color="success" size="small" />
                                      ) : (
                                        <Chip label="Non" color="default" size="small" />
                                      );
                                    })()}
                                  </TableCell>
                                  <TableCell>
                                    {isToFinalize ? null : (
                                      <Chip
                                        label={remaining > 0 ? 'Non soldé' : 'Soldé'}
                                        color={remaining > 0 ? 'error' : 'success'}
                                        size="small"
                                        sx={{ fontWeight: 600, '& .MuiChip-label': { px: 2 } }}
                                      />
                                    )}
                                  </TableCell>
                                  <TableCell sx={{ minWidth: '120px' }}>
                                    <Typography sx={{ color: remaining > 0 ? 'error.main' : 'success.main', fontWeight: 600, whiteSpace: 'nowrap' }}>
                                      {(Number(remaining) || 0).toLocaleString('fr-FR')} F CFA
                                    </Typography>
                                  </TableCell>
                                  <TableCell align="right">
                                    {isToFinalize ? (
                                      <Tooltip title="Finaliser l'inscription">
                                        <Button
                                          variant="contained"
                                          color="secondary"
                                          size="small"
                                          onClick={() => handleFinalizeOpen(student)}
                                          startIcon={<CheckIcon />}
                                        >
                                          Finaliser
                                        </Button>
                                      </Tooltip>
                                    ) : (
                                      <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 0.5 }}>
                                        {remaining > 0 && userRole !== 'secretary' && userRole !== 'directrice' &&
                                          <Tooltip title="Effectuer un versement">
                                            <Button
                                              variant="contained"
                                              color="success"
                                              size="small"
                                              onClick={() => handlePaymentOpen(student)}
                                            >
                                              Payer
                                            </Button>
                                          </Tooltip>
                                        }
                                        <Tooltip title="Voir détails">
                                          <IconButton color="primary" size="small" onClick={() => navigate(`/secretary/students/${student.id}`)}>
                                            <VisibilityIcon />
                                          </IconButton>
                                        </Tooltip>
                                        <Tooltip title="Historique des reçus">
                                          <IconButton color="info" size="small" onClick={() => handleReceiptHistoryOpen(student)}>
                                            <HistoryIcon />
                                          </IconButton>
                                        </Tooltip>
                                        {/* Boutons de modification et suppression - Visible uniquement par l'admin */}
                                        {userRole === 'admin' && (
                                          <>
                                            <Tooltip title="Modifier">
                                              <IconButton color="primary" size="small" onClick={() => handleEditOpen(student)}><EditIcon /></IconButton>
                                            </Tooltip>
                                            <Tooltip title="Supprimer">
                                              <IconButton color="error" size="small" onClick={() => handleDelete(student.id)}><DeleteIcon /></IconButton>
                                            </Tooltip>
                                          </>
                                        )}
                                      </Box>
                                    )}
                                  </TableCell>
                                </TableRow>
                              </Zoom>
                            );
                          })}
                      </TableBody>
                    </Table>
                  </TableContainer>

                  <TablePagination
                    rowsPerPageOptions={[5, 10, 25]}
                    component="div"
                    count={filteredStudents.length}
                    rowsPerPage={rowsPerPage}
                    page={page}
                    onPageChange={handleChangePage}
                    onRowsPerPageChange={handleChangeRowsPerPage}
                    sx={{
                      '.MuiTablePagination-select': {
                        borderRadius: 1,
                      },
                      '.MuiTablePagination-selectIcon': {
                        color: theme.palette.primary.main,
                      },
                    }}
                  />
                </Paper>
              </div>

              {/* Modale d'édition */}
              <Dialog open={editOpen} onClose={handleEditClose} maxWidth="md" fullWidth>
                <DialogTitle>Modifier l'élève</DialogTitle>
                <DialogContent>
                  {/* Messages de succès et d'erreur */}
                  {editSuccessMessage && (
                    <Alert severity="success" sx={{ mb: 2 }}>
                      {editSuccessMessage}
                    </Alert>
                  )}
                  {editErrorMessage && (
                    <Alert severity="error" sx={{ mb: 2 }}>
                      {editErrorMessage}
                    </Alert>
                  )}
                  
                  {editStudent && (
                    <Grid container spacing={2} sx={{ mt: 1 }}>
                      <Grid item xs={12} sm={6}>
                        <TextField
                          label="Prénoms"
                          name="first_name"
                          value={editStudent.first_name || editStudent.nom || ''}
                          onChange={handleEditChange}
                          fullWidth
                        />
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <TextField
                          label="Nom"
                          name="last_name"
                          value={editStudent.last_name || editStudent.prenom || ''}
                          onChange={handleEditChange}
                          fullWidth
                        />
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <TextField
                          label="Date de naissance"
                          name="date_of_birth"
                          type="date"
                          value={formatDateForInput(editStudent.date_of_birth)}
                          onChange={handleEditChange}
                          fullWidth
                          InputLabelProps={{
                            shrink: true,
                          }}
                        />
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <FormControl fullWidth>
                          <InputLabel id="edit-gender-label">Genre</InputLabel>
                          <Select
                            labelId="edit-gender-label"
                            name="gender"
                            value={editStudent.gender || ''}
                            label="Genre"
                            onChange={(e) => setEditStudent((prev: any) => ({ ...prev, gender: e.target.value }))}
                          >
                            <MenuItem value="M">Masculin</MenuItem>
                            <MenuItem value="F">Féminin</MenuItem>
                            <MenuItem value="Other">Autre</MenuItem>
                          </Select>
                        </FormControl>
                      </Grid>
                      <Grid item xs={12}>
                        <TextField
                          label="Adresse"
                          name="address"
                          value={editStudent.address || ''}
                          onChange={handleEditChange}
                          fullWidth
                        />
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <TextField
                          label="Ville"
                          name="city"
                          value={editStudent.city || ''}
                          onChange={handleEditChange}
                          fullWidth
                        />
                      </Grid>
                      {/* Champ téléphone de l'élève retiré */}
                      <Grid item xs={12} sm={6}>
                        <TextField
                          label="École précédente"
                          name="previous_school"
                          value={editStudent.previous_school || ''}
                          onChange={handleEditChange}
                          fullWidth
                        />
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <TextField
                          label="Classe précédente"
                          name="previous_class"
                          value={editStudent.previous_class || ''}
                          onChange={handleEditChange}
                          fullWidth
                        />
                      </Grid>
                      <Grid item xs={12}>
                        <Typography variant="h6" sx={{ fontWeight: 600, color: 'primary.main', mt: 2 }}>
                          Photo de l'élève
                        </Typography>
                        <Box
                          sx={{
                            mt: 2,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexDirection: 'column',
                            p: 2,
                            border: '1px dashed',
                            borderColor: 'primary.light',
                            borderRadius: 2,
                            backgroundColor: '#f9f9f9'
                          }}
                        >
                          {editStudentPhotoUrl ? (
                            <Box
                              component="img"
                              src={editStudentPhotoUrl}
                              alt="Photo de l'élève"
                              sx={{
                                width: 150,
                                height: 150,
                                objectFit: 'cover',
                                borderRadius: '50%',
                                border: '3px solid',
                                borderColor: 'primary.light',
                                boxShadow: 2
                              }}
                              onError={(e) => {
                                e.currentTarget.style.display = 'none';
                              }}
                            />
                          ) : (
                            <Typography variant="body2" color="text.secondary">
                              Aucune photo disponible
                            </Typography>
                          )}
                        </Box>
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, mt: 2 }}>
                          <Button
                            variant="contained"
                            color="primary"
                            component="label"
                            startIcon={<PhotoCameraIcon />}
                          >
                            {editPhotoFile
                              ? 'Changer la nouvelle photo'
                              : editStudent?.child_photo
                                ? 'Changer la photo'
                                : 'Ajouter une photo'}
                            <input
                              type="file"
                              accept="image/jpeg,image/png,image/jpg"
                              hidden
                              onChange={handleEditPhotoChange}
                            />
                          </Button>
                          {editPhotoFile && (
                            <Button variant="text" color="secondary" onClick={handleEditPhotoReset}>
                              Annuler la nouvelle photo
                            </Button>
                          )}
                        </Box>
                        {editPhotoFile && (
                          <Typography variant="body2" sx={{ mt: 1 }}>
                            Photo sélectionnée : {editPhotoFile.name}
                          </Typography>
                        )}
                        {editPhotoError && (
                          <Alert severity="error" sx={{ mt: 1 }}>
                            {editPhotoError}
                          </Alert>
                        )}
                        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                          Formats acceptés : JPG ou PNG — taille maximale 5 Mo.
                        </Typography>
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <FormControl fullWidth>
                          <InputLabel>Classe</InputLabel>
                          <Select
                            name="class_id"
                            value={editStudent.class_id || ''}
                            label="Classe"
                            onChange={(e) => setEditStudent((prev: any) => ({ ...prev, class_id: e.target.value }))}
                          >
                            <MenuItem value="">
                              <em>Non assigné</em>
                            </MenuItem>
                            {classes.map((c) => (
                              <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>
                            ))}
                          </Select>
                        </FormControl>
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <FormControl fullWidth>
                          <InputLabel>Inscription à la cantine</InputLabel>
                          <Select
                            name="cantine"
                            value={editStudent.cantine === true || editStudent.cantine === 1 ? 'oui' : 'non'}
                            label="Inscription à la cantine"
                            onChange={(e) => setEditStudent((prev: any) => ({ 
                              ...prev, 
                              cantine: e.target.value === 'oui' ? 1 : 0,
                              eats_at_cantine: e.target.value === 'oui' ? 1 : 0,
                              // Réinitialiser les allergies si on désinscrit
                              ...(e.target.value === 'non' ? {
                                allergy: ''
                              } : {})
                            }))}
                          >
                            <MenuItem value="oui">Oui</MenuItem>
                            <MenuItem value="non">Non</MenuItem>
                          </Select>
                        </FormControl>
                      </Grid>
                      {/* Champ d'allergies conditionnel */}
                      {(editStudent.cantine === true || editStudent.cantine === 1) && (
                        <Grid item xs={12} sm={6}>
                          <TextField
                            label="Allergie(s) éventuelle(s)"
                            name="allergy"
                            value={editStudent.allergy || ''}
                            onChange={handleEditChange}
                            fullWidth
                            placeholder="Ex: Gluten, Lactose, etc."
                          />
                        </Grid>
                      )}
                      <Grid item xs={12} sm={6}>
                        <TextField
                          label="Besoins particuliers"
                          name="special_needs"
                          value={editStudent.special_needs || ''}
                          onChange={handleEditChange}
                          fullWidth
                        />
                      </Grid>
                      <Grid item xs={12}>
                        <TextField
                          label="Informations supplémentaires"
                          name="additional_info"
                          value={editStudent.additional_info || ''}
                          onChange={handleEditChange}
                          fullWidth
                        />
                      </Grid>

                      {/* Section Informations du Parent */}
                      <Grid item xs={12}>
                        <Typography variant="h6" sx={{ 
                          fontWeight: 600, 
                          color: 'primary.main', 
                          mt: 3, 
                          mb: 2, 
                          pb: 1, 
                          borderBottom: '2px solid', 
                          borderColor: 'primary.main' 
                        }}>
                          Informations du Parent
                        </Typography>
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <TextField
                          label="Prénoms du parent"
                          name="parent_first_name"
                          value={editStudent.parent_first_name || ''}
                          onChange={handleEditChange}
                          fullWidth
                        />
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <TextField
                          label="Nom du parent"
                          name="parent_last_name"
                          value={editStudent.parent_last_name || ''}
                          onChange={handleEditChange}
                          fullWidth
                        />
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <TextField
                          label="Téléphone du parent"
                          name="parent_phone"
                          value={editStudent.parent_phone || ''}
                          onChange={(e) => {
                            const value = e.target.value;
                            // N'accepter que les chiffres, +, -, (, ), et espaces
                            const filteredValue = value.replace(/[^0-9+\-\(\)\s]/g, '');
                            setEditStudent((prev: any) => ({ ...prev, parent_phone: filteredValue }));
                          }}
                          inputProps={{ 
                            pattern: "[0-9+\\s\\-\\(\\)]*",
                            title: "Veuillez saisir un numéro de téléphone valide"
                          }}
                          helperText="Format: +225 0123456789 ou 0123456789"
                          fullWidth
                        />
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <TextField
                          label="Email du parent"
                          name="parent_email"
                          type="email"
                          value={editStudent.parent_email || ''}
                          onChange={handleEditChange}
                          fullWidth
                        />
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <TextField
                          label="Contact WhatsApp du père"
                          name="father_contact"
                          value={editStudent.father_contact || ''}
                          onChange={(e) => {
                            const value = e.target.value;
                            // N'accepter que les chiffres, +, -, (, ), et espaces
                            const filteredValue = value.replace(/[^0-9+\-\(\)\s]/g, '');
                            setEditStudent((prev: any) => ({ ...prev, father_contact: filteredValue }));
                          }}
                          inputProps={{ 
                            pattern: "[0-9+\\s\\-\\(\\)]*",
                            title: "Veuillez saisir un numéro de téléphone valide"
                          }}
                          helperText="Format: +225 0123456789 ou 0123456789"
                          fullWidth
                        />
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <TextField
                          label="Contact WhatsApp de la mère"
                          name="mother_contact"
                          value={editStudent.mother_contact || ''}
                          onChange={(e) => {
                            const value = e.target.value;
                            // N'accepter que les chiffres, +, -, (, ), et espaces
                            const filteredValue = value.replace(/[^0-9+\-\(\)\s]/g, '');
                            setEditStudent((prev: any) => ({ ...prev, mother_contact: filteredValue }));
                          }}
                          inputProps={{ 
                            pattern: "[0-9+\\s\\-\\(\\)]*",
                            title: "Veuillez saisir un numéro de téléphone valide"
                          }}
                          helperText="Format: +225 0123456789 ou 0123456789"
                          fullWidth
                        />
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <TextField
                          label="Contact à joindre en cas d'urgence"
                          name="emergency_contact"
                          value={editStudent.emergency_contact || ''}
                          onChange={(e) => {
                            const value = e.target.value;
                            // N'accepter que les chiffres, +, -, (, ), et espaces
                            const filteredValue = value.replace(/[^0-9+\-\(\)\s]/g, '');
                            setEditStudent((prev: any) => ({ ...prev, emergency_contact: filteredValue }));
                          }}
                          inputProps={{ 
                            pattern: "[0-9+\\s\\-\\(\\)]*",
                            title: "Veuillez saisir un numéro de téléphone valide"
                          }}
                          helperText="Format: +225 0123456789 ou 0123456789"
                          fullWidth
                        />
                      </Grid>
                      <Grid item xs={12}>
                        <TextField
                          label="Contact général du parent"
                          name="parent_contact"
                          value={editStudent.parent_contact || ''}
                          onChange={(e) => {
                            const value = e.target.value;
                            // N'accepter que les chiffres, +, -, (, ), et espaces
                            const filteredValue = value.replace(/[^0-9+\-\(\)\s]/g, '');
                            setEditStudent((prev: any) => ({ ...prev, parent_contact: filteredValue }));
                          }}
                          inputProps={{ 
                            pattern: "[0-9+\\s\\-\\(\\)]*",
                            title: "Veuillez saisir un numéro de téléphone valide"
                          }}
                          helperText="Format: +225 0123456789 ou 0123456789"
                          fullWidth
                        />
                      </Grid>
                    </Grid>
                  )}
                </DialogContent>
                <DialogActions>
                  <Button onClick={handleEditClose} color="secondary">Annuler</Button>
                  <Button onClick={handleEditSubmit} color="primary" variant="contained" disabled={editLoading}>
                    {editLoading ? 'Enregistrement...' : 'Enregistrer'}
                  </Button>
                </DialogActions>
              </Dialog>

              {/* Modale de Paiement */}
              <Dialog open={paymentModalOpen} onClose={handlePaymentClose} maxWidth="sm" fullWidth>
                <DialogTitle>Effectuer un Paiement</DialogTitle>
                <DialogContent>
                  {studentToPay && (
                    <Box sx={{ mt: 2 }}>
                      <Typography variant="h6">{`${studentToPay.first_name} ${studentToPay.last_name}`}</Typography>
                      <Typography color="text.secondary" gutterBottom>Matricule: {studentToPay.registration_number}</Typography>
                       <Typography color="error" sx={{mt: 2}}>
                        Reste à payer: <b>{(Number(((studentToPay?.total_due ?? 0) - (studentToPay?.total_discount ?? 0) - (studentToPay?.total_paid ?? 0)) || 0)).toLocaleString('fr-FR')} F CFA</b>
                      </Typography>
                      
                      <TextField
                        label="Montant du versement"
                        type="number"
                        fullWidth
                        placeholder="Saisir le montant..."
                        value={paymentAmount ?? ''}
                        onChange={(e) => {
                          const value = Number(e.target.value) || 0;
                          if (value >= 0) {
                            setPaymentAmount(value.toString());
                          }
                        }}
                        inputProps={{ min: 0 }}
                        sx={{ mt: 3 }}
                        error={!!paymentAmountError}
                        helperText={paymentAmountError}
                        disabled={false}
                      />
                    </Box>
                  )}
                </DialogContent>
                <DialogActions>
                  <Button onClick={handlePaymentClose} color="secondary">Annuler</Button>
                  <Button onClick={handlePaymentConfirm} color="primary" variant="contained" disabled={paymentLoading || !!paymentAmountError}>
                    {paymentLoading ? <CircularProgress size={24} /> : 'Confirmer le Paiement'}
                  </Button>
                </DialogActions>
              </Dialog>

              {/* Modale de confirmation de paiement */}
              <Dialog open={paymentConfirmationOpen} onClose={() => setPaymentConfirmationOpen(false)} maxWidth="sm" fullWidth>
                <DialogTitle>Confirmation de Paiement</DialogTitle>
                <DialogContent>
                  {studentToPay && (
                    <Box sx={{ mt: 2, textAlign: 'center' }}>
                      <Typography variant="h6" sx={{ mb: 2 }}>
                        Confirmez-vous le paiement de :
                      </Typography>
                      <Typography variant="h4" color="primary" sx={{ fontWeight: 'bold', mb: 3 }}>
                        {Number(paymentAmount || 0).toLocaleString('fr-FR')} F CFA
                      </Typography>
                      <Typography variant="body1" sx={{ mb: 2 }}>
                        Pour l'élève : <strong>{studentToPay.first_name} {studentToPay.last_name}</strong>
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Matricule : {studentToPay.registration_number}
                      </Typography>
                    </Box>
                  )}
                </DialogContent>
                <DialogActions sx={{ justifyContent: 'center', gap: 2, pb: 3 }}>
                  <Button 
                    onClick={() => setPaymentConfirmationOpen(false)} 
                    variant="outlined" 
                    color="secondary"
                    size="large"
                    sx={{ minWidth: 120 }}
                  >
                    Non, Modifier
                  </Button>
                  <Button 
                    onClick={handlePaymentSubmit} 
                    variant="contained" 
                    color="primary" 
                    size="large"
                    disabled={paymentLoading}
                    sx={{ minWidth: 120 }}
                  >
                    {paymentLoading ? <CircularProgress size={24} /> : 'Oui, Confirmer'}
                  </Button>
                </DialogActions>
              </Dialog>

              {/* Modale de Finalisation */}
              {(() => {
                console.log('=== [DEBUG] CONDITION MODALE ===');
                console.log('finalizeModalOpen:', finalizeModalOpen);
                console.log('studentToFinalize:', studentToFinalize);
                console.log('studentToFinalize?.registration_mode:', studentToFinalize?.registration_mode);
                console.log('Condition complète:', finalizeModalOpen && studentToFinalize && studentToFinalize.registration_mode !== 'online');
                console.log('=== [FIN DEBUG CONDITION] ===');
                return finalizeModalOpen && studentToFinalize && studentToFinalize.registration_mode !== 'online';
              })() && (
                <Dialog open={finalizeModalOpen} onClose={handleFinalizeClose} maxWidth="sm" fullWidth>
                  <DialogTitle>Finaliser l'Inscription</DialogTitle>
                  <DialogContent>
                    <Box sx={{ mt: 2 }}>
                      <Typography variant="h6">{`${studentToFinalize.first_name} ${studentToFinalize.last_name}`}</Typography>
                      <Typography color="text.secondary" gutterBottom>Matricule: {studentToFinalize.registration_number}</Typography>
                      
                      <FormControl fullWidth sx={{ mt: 3 }}>
                        <InputLabel>Assigner une classe</InputLabel>
                        <Select
                          value={finalizeClassId}
                          label="Assigner une classe"
                          onChange={(e) => setFinalizeClassId(e.target.value)}
                        >
                          {classes.map((c) => (
                            <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>
                          ))}
                        </Select>
                      </FormControl>

                      


                      {/* Section Cantine */}
                      <Typography variant="h6" sx={{ mt: 3, mb: 2, color: 'primary.main', fontWeight: 'bold' }}>Cantine</Typography>
                      <Grid container spacing={2}>
                        <Grid item xs={12} sm={6}>
                          <FormControl fullWidth>
                            <InputLabel>Inscrire à la cantine ?</InputLabel>
                            <Select
                              value={finalizeCantine ? 'oui' : 'non'}
                              label="Inscrire à la cantine ?"
                              onChange={e => {
                                console.log('Cantine changée:', e.target.value);
                                setFinalizeCantine(e.target.value === 'oui');
                              }}
                              disabled={finalizeLoading}
                            >
                              <MenuItem value="oui">Oui</MenuItem>
                              <MenuItem value="non">Non</MenuItem>
                            </Select>
                          </FormControl>
                        </Grid>
                        {finalizeCantine && (
                          <>
                            <Grid item xs={12} sm={6}>
                              <FormControl fullWidth>
                                <InputLabel>L'enfant mange à la cantine ?</InputLabel>
                                <Select
                                  value={finalizeEatsAtCantine}
                                  label="L'enfant mange à la cantine ?"
                                  onChange={e => {
                                    console.log('Mange à la cantine changé:', e.target.value);
                                    setFinalizeEatsAtCantine(e.target.value);
                                  }}
                                  disabled={finalizeLoading}
                                >
                                  <MenuItem value="oui">Oui</MenuItem>
                                  <MenuItem value="non">Non</MenuItem>
                                </Select>
                              </FormControl>
                            </Grid>
                            <Grid item xs={12}>
                              <TextField
                                label="Allergie(s) éventuelle(s)"
                                value={finalizeAllergy}
                                onChange={e => {
                                  console.log('Allergie changée:', e.target.value);
                                  setFinalizeAllergy(e.target.value);
                                }}
                                fullWidth
                                placeholder="Ex: Gluten, Lactose, etc."
                                disabled={finalizeLoading}
                              />
                            </Grid>
                          </>
                        )}
                      </Grid>

                      {/* Section Contacts WhatsApp */}
                      <Typography variant="h6" sx={{ mt: 3, mb: 2, color: 'primary.main', fontWeight: 'bold' }}>Contacts WhatsApp</Typography>
                      <Grid container spacing={2}>
                        <Grid item xs={12} sm={6}>
                          <TextField
                            label="Contact WhatsApp du père"
                            value={finalizeFatherContact}
                            onChange={e => {
                              console.log('Contact père changé:', e.target.value);
                              setFinalizeFatherContact(e.target.value);
                            }}
                            fullWidth
                            placeholder="Ex: 0202022202"
                            disabled={finalizeLoading}
                          />
                        </Grid>
                        <Grid item xs={12} sm={6}>
                          <TextField
                            label="Contact WhatsApp de la mère"
                            value={finalizeMotherContact}
                            onChange={e => {
                              console.log('Contact mère changé:', e.target.value);
                              setFinalizeMotherContact(e.target.value);
                            }}
                            fullWidth
                            placeholder="Ex: 0202022202"
                            disabled={finalizeLoading}
                          />
                        </Grid>
                        <Grid item xs={12} sm={6}>
                          <TextField
                            label="Contact à joindre en cas d'urgence"
                            value={finalizeEmergencyContact}
                            onChange={e => {
                              console.log('Contact urgence changé:', e.target.value);
                              setFinalizeEmergencyContact(e.target.value);
                            }}
                            fullWidth
                            placeholder="Ex: 0202022202"
                            disabled={finalizeLoading}
                          />
                        </Grid>
                      </Grid>
                    </Box>
                  </DialogContent>
                  <DialogActions>
                    <Button onClick={handleFinalizeClose} color="secondary">Annuler</Button>
                    <Button 
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        console.log('=== [DEBUG] BOUTON CONFIRMER ===');
                        console.log('finalizeClassId:', finalizeClassId);
                        console.log('finalizeLoading:', finalizeLoading);
                        console.log('Bouton désactivé:', !finalizeClassId || finalizeLoading);
                        console.log('Bouton Confirmer cliqué');
                        handleFinalizeSubmit();
                      }} 
                      color="primary" 
                      variant="contained" 
                      disabled={!finalizeClassId || finalizeLoading}
                    >
                      {finalizeLoading ? <CircularProgress size={24} /> : 'Confirmer'}
                    </Button>
                  </DialogActions>
                </Dialog>
              )}

              {/* Formulaire complet d'inscription pour les élèves en ligne */}
              {showFinalizeForm && studentToFinalize && (
                <div
                  style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    backgroundColor: 'rgba(0, 0, 0, 0.5)',
                    zIndex: 1300,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '20px'
                  }}
                  onClick={(e) => {
                    if (e.target === e.currentTarget) {
                      handleFinalizeClose();
                    }
                  }}
                >
                  <div
                    style={{
                      backgroundColor: 'white',
                      borderRadius: '8px',
                      maxWidth: '800px',
                      width: '100%',
                      maxHeight: '90vh',
                      overflow: 'auto',
                      padding: '20px'
                    }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                      <h2>Finaliser l'inscription - {studentToFinalize.first_name} {studentToFinalize.last_name}</h2>
                      <button
                        onClick={handleFinalizeClose}
                        style={{
                          background: 'none',
                          border: 'none',
                          fontSize: '24px',
                          cursor: 'pointer',
                          color: '#666'
                        }}
                      >
                        ×
                      </button>
                    </div>
                    <Grid container spacing={2}>
                      <Grid item xs={12} sm={6}>
                        <TextField
                          label="Matricule"
                          value={studentToFinalize.registration_number || ''}
                          fullWidth
                          disabled
                        />
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <TextField
                          label="Nom"
                          value={studentToFinalize.last_name || ''}
                          fullWidth
                          disabled
                        />
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <TextField
                          label="Prénoms"
                          value={studentToFinalize.first_name || ''}
                          fullWidth
                          disabled
                        />
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <TextField
                          label="Date de naissance"
                          value={formatDateForInput(studentToFinalize.date_of_birth)}
                          fullWidth
                          disabled
                        />
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <TextField
                          label="Genre"
                          value={studentToFinalize.gender || ''}
                          fullWidth
                          disabled
                        />
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <TextField
                          label="Ville"
                          value={studentToFinalize.city || ''}
                          fullWidth
                          disabled
                        />
                      </Grid>
                      <Grid item xs={12}>
                        <TextField
                          label="Adresse"
                          value={studentToFinalize.address || ''}
                          fullWidth
                          disabled
                        />
                      </Grid>
                    </Grid>

                    <Typography variant="h6" sx={{ mt: 3, mb: 2 }}>Informations du parent</Typography>
                    <Grid container spacing={2}>
                      <Grid item xs={12} sm={6}>
                        <TextField
                          label="Prénoms du parent"
                          value={studentToFinalize.parent_first_name || ''}
                          fullWidth
                          disabled
                        />
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <TextField
                          label="Nom du parent"
                          value={studentToFinalize.parent_last_name || ''}
                          fullWidth
                          disabled
                        />
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <TextField
                          label="Téléphone du parent"
                          value={studentToFinalize.parent_phone || ''}
                          fullWidth
                          disabled
                        />
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <TextField
                          label="Email du parent"
                          value={studentToFinalize.parent_email || ''}
                          fullWidth
                          disabled
                        />
                      </Grid>
                    </Grid>

                    <Typography variant="h6" sx={{ mt: 3, mb: 2 }}>Finalisation</Typography>
                    <Grid container spacing={2}>
                      <Grid item xs={12} sm={6}>
                        <FormControl fullWidth>
                          <InputLabel>Assigner une classe</InputLabel>
                          <Select
                            value={finalizeClassId}
                            label="Assigner une classe"
                            onChange={(e) => setFinalizeClassId(e.target.value)}
                          >
                            {classes.map((c) => (
                              <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>
                            ))}
                          </Select>
                        </FormControl>
                      </Grid>
                    </Grid>

                    {/* Section Cantine */}
                    <Typography variant="h6" sx={{ mt: 3, mb: 2, color: 'primary.main', fontWeight: 'bold' }}>Cantine</Typography>
                    <Grid container spacing={2}>
                      <Grid item xs={12} sm={6}>
                        <FormControl fullWidth>
                          <InputLabel>Inscrire à la cantine ?</InputLabel>
                          <Select
                            value={finalizeCantine ? 'oui' : 'non'}
                            label="Inscrire à la cantine ?"
                            onChange={e => {
                              console.log('Cantine changée:', e.target.value);
                              setFinalizeCantine(e.target.value === 'oui');
                            }}
                            disabled={finalizeLoading}
                          >
                            <MenuItem value="oui">Oui</MenuItem>
                            <MenuItem value="non">Non</MenuItem>
                          </Select>
                        </FormControl>
                      </Grid>
                      {finalizeCantine && (
                        <>
                          <Grid item xs={12} sm={6}>
                            <FormControl fullWidth>
                              <InputLabel>L'enfant mange à la cantine ?</InputLabel>
                              <Select
                                value={finalizeEatsAtCantine}
                                label="L'enfant mange à la cantine ?"
                                onChange={e => {
                                  console.log('Mange à la cantine changé:', e.target.value);
                                  setFinalizeEatsAtCantine(e.target.value);
                                }}
                                disabled={finalizeLoading}
                              >
                                <MenuItem value="oui">Oui</MenuItem>
                                <MenuItem value="non">Non</MenuItem>
                              </Select>
                            </FormControl>
                          </Grid>
                          <Grid item xs={12}>
                            <TextField
                              label="Allergie(s) éventuelle(s)"
                              value={finalizeAllergy}
                              onChange={e => {
                                console.log('Allergie changée:', e.target.value);
                                setFinalizeAllergy(e.target.value);
                              }}
                              fullWidth
                              placeholder="Ex: Gluten, Lactose, etc."
                              disabled={finalizeLoading}
                            />
                          </Grid>
                        </>
                      )}
                    </Grid>

                    {/* Section Contacts WhatsApp */}
                    <Typography variant="h6" sx={{ mt: 3, mb: 2, color: 'primary.main', fontWeight: 'bold' }}>Contacts WhatsApp</Typography>
                    <Grid container spacing={2}>
                      <Grid item xs={12} sm={6}>
                        <TextField
                          label="Contact WhatsApp du père"
                          value={finalizeFatherContact}
                          onChange={e => {
                            console.log('Contact père changé:', e.target.value);
                            setFinalizeFatherContact(e.target.value);
                          }}
                          fullWidth
                          placeholder="Ex: 0202022202"
                          disabled={finalizeLoading}
                        />
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <TextField
                          label="Contact WhatsApp de la mère"
                          value={finalizeMotherContact}
                          onChange={e => {
                            console.log('Contact mère changé:', e.target.value);
                            setFinalizeMotherContact(e.target.value);
                          }}
                          fullWidth
                          placeholder="Ex: 0202022202"
                          disabled={finalizeLoading}
                        />
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <TextField
                          label="Contact à joindre en cas d'urgence"
                          value={finalizeEmergencyContact}
                          onChange={e => {
                            console.log('Contact urgence changé:', e.target.value);
                            setFinalizeEmergencyContact(e.target.value);
                          }}
                          fullWidth
                          placeholder="Ex: 0202022202"
                          disabled={finalizeLoading}
                        />
                      </Grid>
                    </Grid>
                      
                      {/* Boutons d'action */}
                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px' }}>
                        <Button 
                          onClick={handleFinalizeClose} 
                          variant="outlined" 
                          color="secondary"
                        >
                          Annuler
                        </Button>
                        <Button 
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            console.log('=== [DEBUG] BOUTON CONFIRMER ===');
                            console.log('finalizeClassId:', finalizeClassId);
                            console.log('finalizeLoading:', finalizeLoading);
                            console.log('Bouton désactivé:', !finalizeClassId || finalizeLoading);
                            console.log('Bouton Confirmer cliqué');
                            handleFinalizeSubmit();
                          }} 
                          variant="contained" 
                          color="primary" 
                          disabled={!finalizeClassId || finalizeLoading}
                        >
                          {finalizeLoading ? <CircularProgress size={24} /> : 'Confirmer'}
                        </Button>
                      </div>
                    </div>
                  </div>
                )}

              {/* Modale de reçu de paiement */}
              <Dialog open={showPaymentReceipt} onClose={() => setShowPaymentReceipt(false)} maxWidth="md" fullWidth>
                <DialogTitle>Reçu de Paiement</DialogTitle>
                <DialogContent>
                    {paymentReceiptData && (
                      <Box ref={paymentReceiptRef} sx={{ p: 4, border: '1px solid #ddd', borderRadius: '8px', bgcolor: '#fff' }}>
                        <Box sx={{ textAlign: 'center', mb: 4, pb: 2, borderBottom: '2px solid #1976d2' }}>
                          <Box sx={{ mb: 2 }}>
                            <img 
                              src="/img/pages/vrailogo.jpg" 
                              alt="Logo École" 
                              style={{ 
                                height: 80, 
                                maxWidth: '100%', 
                                objectFit: 'contain',
                                marginBottom: '8px'
                              }} 
                            />
                          </Box>
                          <Typography variant="h4" component="h1" sx={{ color: '#1976d2', fontWeight: 'bold' }}>
                          ECOLE : "GROUPE SCOLAIRE SAINTE FAMILLE L'EXECELLENCE"
                          </Typography>
                        </Box>
                        
                        <Typography variant="h5" align="center" sx={{ my: 2, fontWeight: 'bold' }}>
                          REÇU DE PAIEMENT DE SCOLARITÉ
                        </Typography>

                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
                          <Typography><b>Date:</b> {formatDateForReceipt(paymentReceiptData.date)}</Typography>
                          <Typography><b>Matricule:</b> {paymentReceiptData.registration_number}</Typography>
                        </Box>

                        <Divider sx={{ my: 2 }}><Chip label="Informations de l'Élève" /></Divider>
                        {/* Photo de l'élève */}
                        {paymentReceiptData.child_photo && (
                          <Box sx={{ display: 'flex', justifyContent: 'center', mb: 3 }}>
                            <Box
                              component="img"
                              src={`https://saintefamilleexcellence.ci/api/students/photo/${encodeURIComponent(paymentReceiptData.child_photo)}`}
                              alt={`Photo de ${paymentReceiptData.first_name} ${paymentReceiptData.last_name}`}
                              sx={{
                                width: 140,
                                height: 140,
                                borderRadius: '50%',
                                objectFit: 'cover',
                                border: '3px solid',
                                borderColor: 'primary.main',
                                boxShadow: 2
                              }}
                              onError={(e) => {
                                e.currentTarget.style.display = 'none';
                              }}
                            />
                          </Box>
                        )}
                        {!paymentReceiptData.child_photo && (
                          <Box sx={{ display: 'flex', justifyContent: 'center', mb: 3 }}>
                            <Box
                              sx={{
                                width: 140,
                                height: 140,
                                borderRadius: '50%',
                                backgroundColor: '#e0e0e0',
                                border: '3px solid',
                                borderColor: 'primary.main',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: '#999',
                                fontSize: '12px',
                                textAlign: 'center',
                                padding: '10px'
                              }}
                            >
                              <span>Aucune photo</span>
                            </Box>
                          </Box>
                        )}
                        <Grid container spacing={1}>
                          <Grid item xs={12}><Typography><b>Élève:</b>{paymentReceiptData.last_name} {paymentReceiptData.first_name}</Typography></Grid>
                          <Grid item xs={12}><Typography><b>Classe:</b> {paymentReceiptData.classe}</Typography></Grid>
                          <Grid item xs={12} sm={6}><Typography><b>Cantine :</b> {paymentReceiptData.cantine ? <Chip label="Oui" color="success" size="small" sx={{ ml: 1 }} /> : <Chip label="Non" color="default" size="small" sx={{ ml: 1 }} />}</Typography></Grid>
                        </Grid>
                        
                        <Divider sx={{ my: 2, mt: 3 }}><Chip label="Détails du Paiement" /></Divider>
                        <Table size="small">
                          <TableBody>
                            <TableRow>
                              <TableCell>Montant total de la scolarité</TableCell>
                              <TableCell align="right">{Number(paymentReceiptData.montant_total_scolarite || 0).toLocaleString('fr-FR')} F CFA</TableCell>
                            </TableRow>
                            <TableRow>
                              <TableCell>Total des réductions</TableCell>
                              <TableCell align="right">{Number(paymentReceiptData.total_reductions || 0).toLocaleString('fr-FR')} F CFA</TableCell>
                            </TableRow>
                            <TableRow>
                              <TableCell>Montant dû avant ce paiement</TableCell>
                              <TableCell align="right"><b>{Number(paymentReceiptData.montant_du_avant || 0).toLocaleString('fr-FR')} F CFA</b></TableCell>
                            </TableRow>
                            <TableRow>
                              <TableCell>Montant de ce versement</TableCell>
                              <TableCell align="right"><b>{Number(paymentReceiptData.montant_verse || 0).toLocaleString('fr-FR')} F CFA</b></TableCell>
                            </TableRow>
                            <TableRow>
                              <TableCell>Total déjà versé (ce paiement inclus)</TableCell>
                              <TableCell align="right">{Number(paymentReceiptData.total_deja_verse || 0).toLocaleString('fr-FR')} F CFA</TableCell>
                            </TableRow>
                             <TableRow sx={{ '& td, & th': { border: 0 }, background: (theme) => (paymentReceiptData.reste_a_payer > 0 ? 'rgba(255, 0, 0, 0.05)' : 'rgba(0, 255, 0, 0.05)')}}>
                              <TableCell sx={{ fontWeight: 'bold' }}>Reste à payer</TableCell>
                              <TableCell align="right" sx={{ fontWeight: 'bold' }}>
                                {Number(paymentReceiptData.reste_a_payer || 0).toLocaleString('fr-FR')} F CFA
                              </TableCell>
                            </TableRow>
                          </TableBody>
                        </Table>

                        <Box sx={{ mt: 5, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                          <Typography variant="caption" color="text.secondary">
                             Statut: {paymentReceiptData.reste_a_payer > 0 ? <Chip label="Non soldé" color="error" size="small"/> : <Chip label="Soldé" color="success" size="small"/>}
                          </Typography>
                          <Box sx={{ textAlign: 'center' }}>
                            <Typography>Le secrétariat</Typography>
                          </Box>
                        </Box>
                      </Box>
                    )}
                </DialogContent>
                <DialogActions sx={{ p: 2 }}>
                  <Button onClick={() => setShowPaymentReceipt(false)}>Fermer</Button>
                  <Button color="primary" variant="contained" startIcon={<PrintIcon />} onClick={handlePrintPaymentReceipt}>Imprimer</Button>
                </DialogActions>
              </Dialog>

              {/* Modale de réinscription */}
              <Dialog open={reinscriptionOpen} onClose={handleReinscriptionClose} maxWidth="sm" fullWidth>
                <DialogTitle>Réinscription d'un élève</DialogTitle>
                <DialogContent>
                  <Box sx={{ mt: 2 }}>
                    <TextField
                      label="Matricule de l'élève"
                      value={matriculeSearch}
                      onChange={e => setMatriculeSearch(e.target.value)}
                      fullWidth
                      sx={{ mb: 2 }}
                      onKeyDown={e => { if (e.key === 'Enter') handleMatriculeSearch(); }}
                      disabled={reinscriptionLoading}
                    />
                    <Button
                      variant="contained"
                      color="primary"
                      onClick={handleMatriculeSearch}
                      disabled={reinscriptionLoading || !matriculeSearch}
                      sx={{ mb: 2 }}
                    >
                      {reinscriptionLoading ? <CircularProgress size={22} /> : 'Rechercher'}
                    </Button>
                    {reinscriptionError && (
                      <Typography color="error" sx={{ mt: 1 }}>{reinscriptionError}</Typography>
                    )}
                    {reinscriptionStudent && (
                      <Box sx={{ mt: 2 }}>
                        <Typography variant="h6" mb={2}>Informations de l'élève</Typography>
                        <Grid container spacing={2}>
                          <Grid item xs={12} sm={6}><TextField label="Nom" value={reinscriptionStudent.last_name} fullWidth disabled /></Grid>
                          <Grid item xs={12} sm={6}><TextField label="Prénoms" value={reinscriptionStudent.first_name} fullWidth disabled /></Grid>
                          <Grid item xs={12} sm={6}><TextField label="Date de naissance" value={formatDateForInput(reinscriptionStudent.date_of_birth)} fullWidth disabled /></Grid>
                          <Grid item xs={12} sm={6}><TextField label="Classe actuelle" value={reinscriptionStudent.classe} fullWidth disabled /></Grid>
                          <Grid item xs={12} sm={6}><TextField label="Matricule" value={reinscriptionStudent.registration_number} fullWidth disabled /></Grid>
                          <Grid item xs={12} sm={6}><TextField label="Ville" value={reinscriptionStudent.city} fullWidth disabled /></Grid>
                        </Grid>
                        {/* Affichage du niveau suivant */}
                        {targetLevel && (
                          <Box sx={{ mt: 3 }}>
                            <TextField label="Niveau pour la nouvelle année" value={targetLevel} fullWidth disabled />
                            {annualAverage && (
                              <Typography variant="caption" color={annualAverage.isAdmis ? 'success.main' : 'error.main'}>
                                {annualAverage.isAdmis ? 'Admis en classe supérieure' : 'Non admis, redoublement'}
                              </Typography>
                            )}
                          </Box>
                        )}
                        {/* Section de paiement retirée */}
                        <Typography variant="h6" mt={4} mb={2}>Informations du parent</Typography>
                        <Grid container spacing={2}>
                          <Grid item xs={12} sm={6}><TextField label="Prénoms du parent" name="parent_first_name" value={parentFields.parent_first_name} onChange={handleParentFieldChange} fullWidth /></Grid>
                          <Grid item xs={12} sm={6}><TextField label="Nom du parent" name="parent_last_name" value={parentFields.parent_last_name} onChange={handleParentFieldChange} fullWidth /></Grid>
                          <Grid item xs={12} sm={6}>
                            <TextField 
                              label="Téléphone du parent" 
                              name="parent_phone" 
                              value={parentFields.parent_phone} 
                              onChange={(e) => {
                                const value = e.target.value;
                                // N'accepter que les chiffres, +, -, (, ), et espaces
                                const filteredValue = value.replace(/[^0-9+\-\(\)\s]/g, '');
                                setParentFields((prev: any) => ({ ...prev, parent_phone: filteredValue }));
                              }}
                              inputProps={{ 
                                pattern: "[0-9+\\s\\-\\(\\)]*",
                                title: "Veuillez saisir un numéro de téléphone valide"
                              }}
                              helperText="Format: +225 0123456789 ou 0123456789"
                              fullWidth 
                            />
                          </Grid>
                          <Grid item xs={12} sm={6}><TextField label="Email du parent" name="parent_email" value={parentFields.parent_email} onChange={handleParentFieldChange} fullWidth /></Grid>
                          <Grid item xs={12}>
                            <TextField 
                              label="Contact du parent" 
                              name="parent_contact" 
                              value={parentFields.parent_contact} 
                              onChange={(e) => {
                                const value = e.target.value;
                                // N'accepter que les chiffres, +, -, (, ), et espaces
                                const filteredValue = value.replace(/[^0-9+\-\(\)\s]/g, '');
                                setParentFields((prev: any) => ({ ...prev, parent_contact: filteredValue }));
                              }}
                              inputProps={{ 
                                pattern: "[0-9+\\s\\-\\(\\)]*",
                                title: "Veuillez saisir un numéro de téléphone valide"
                              }}
                              helperText="Format: +225 0123456789 ou 0123456789"
                              fullWidth 
                            />
                          </Grid>
                        </Grid>
                        <FormControl fullWidth sx={{ mt: 3 }}>
                          <InputLabel>Nouvelle classe</InputLabel>
                          <Select
                            value={reinscriptionClassId}
                            label="Nouvelle classe"
                            onChange={e => setReinscriptionClassId(e.target.value)}
                          >
                            {classesNiveauCible.map((c) => (
                              <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>
                            ))}
                          </Select>
                        </FormControl>
                        {/* Champ de paiement retiré */}
                        {/* Affichage du message d'erreur juste en dessous du formulaire */}
                        {reinscriptionApiError && (
                          <Box sx={{ my: 2 }}>
                            <Typography color="error" sx={{ fontWeight: 'bold' }}>
                              {reinscriptionApiError}
                            </Typography>
                          </Box>
                        )}
                      </Box>
                    )}
                  </Box>
                </DialogContent>
                <DialogActions>
                  <Button onClick={handleReinscriptionClose} color="secondary">Annuler</Button>
                  <Button
                    onClick={handleReinscriptionSubmit}
                    color="primary"
                    variant="contained"
                    disabled={
                      !reinscriptionStudent || !reinscriptionClassId || reinscriptionSubmitting
                    }
                  >
                    {reinscriptionSubmitting ? <CircularProgress size={22} /> : 'Valider la réinscription'}
                  </Button>
                </DialogActions>
              </Dialog>

              {/* Modale de reçu de finalisation */}
              {showReceipt && receiptData && (
                <div
                  style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    backgroundColor: 'rgba(0, 0, 0, 0.7)',
                    zIndex: 1400,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '20px'
                  }}
                  onClick={(e) => {
                    if (e.target === e.currentTarget) {
                      setShowReceipt(false);
                    }
                  }}
                >
                  <div
                    style={{
                      backgroundColor: 'white',
                      borderRadius: '16px',
                      maxWidth: '900px',
                      width: '100%',
                      maxHeight: '90vh',
                      overflow: 'auto',
                      boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
                      border: '2px solid #1976d2'
                    }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    {/* En-tête avec logo */}
                    <div style={{
                      background: 'linear-gradient(135deg, #1976d2 0%, #42a5f5 100%)',
                      color: 'white',
                      padding: '30px',
                      borderRadius: '14px 14px 0 0',
                      textAlign: 'center',
                      position: 'relative'
                    }}>
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        marginBottom: '20px'
                      }}>
                        <img 
                          src="/img/pages/vrailogo.jpg" 
                          alt="Logo École" 
                          style={{ 
                            height: 80, 
                            width: 'auto',
                            marginRight: '20px',
                            borderRadius: '8px',
                            border: '3px solid white'
                          }} 
                        />
                        <div>
                          <h1 style={{
                            margin: 0,
                            fontSize: '28px',
                            fontWeight: 'bold',
                            textShadow: '2px 2px 4px rgba(0,0,0,0.3)'
                          }}>
                            ÉCOLE "GROUPE SCOLAIRE SAINTE FAMILLE L'EXECELLENCE"
                          </h1>
              
                        </div>
                      </div>
                      <div style={{
                        fontSize: '24px',
                        fontWeight: 'bold',
                        marginTop: '20px',
                        textTransform: 'uppercase',
                        letterSpacing: '2px'
                      }}>
                        Reçu de Finalisation d'Inscription
                      </div>
                    </div>

                    {/* Contenu du reçu */}
                    <div style={{ padding: '30px' }}>
                      {/* Informations de base */}
                      <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        marginBottom: '30px',
                        padding: '20px',
                        backgroundColor: '#f8f9fa',
                        borderRadius: '12px',
                        border: '1px solid #e9ecef'
                      }}>
                        <div>
                          <strong style={{ color: '#1976d2' }}>Date:</strong> {receiptData.date}
                        </div>
                        <div>
                          <strong style={{ color: '#1976d2' }}>Matricule:</strong> {receiptData.registration_number}
                        </div>
                      </div>

                      {/* Section Informations de l'Élève */}
                      <div style={{
                        marginBottom: '30px',
                        padding: '20px',
                        backgroundColor: '#e3f2fd',
                        borderRadius: '12px',
                        border: '2px solid #1976d2'
                      }}>
                        <h3 style={{
                          margin: '0 0 20px 0',
                          color: '#1976d2',
                          fontSize: '20px',
                          fontWeight: 'bold',
                          textAlign: 'center',
                          textTransform: 'uppercase',
                          letterSpacing: '1px'
                        }}>
                          📚 Informations de l'Élève
                        </h3>
                        <Grid container spacing={3}>
                          <Grid item xs={12} sm={6}>
                            <div style={{ marginBottom: '15px' }}>
                              <strong style={{ color: '#555' }}>Nom:</strong>
                              <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#1976d2' }}>
                                {receiptData.last_name}
                              </div>
                            </div>
                          </Grid>
                          <Grid item xs={12} sm={6}>
                            <div style={{ marginBottom: '15px' }}>
                              <strong style={{ color: '#555' }}>Prénoms:</strong>
                              <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#1976d2' }}>
                                {receiptData.first_name}
                              </div>
                            </div>
                          </Grid>
                          <Grid item xs={12} sm={6}>
                            <div style={{ marginBottom: '15px' }}>
                              <strong style={{ color: '#555' }}>Date de naissance:</strong>
                              <div style={{ fontSize: '16px' }}>
                                {receiptData.date_of_birth ? (() => {
                                  try {
                                    // Si c'est déjà au format YYYY-MM-DD, le formater directement
                                    if (/^\d{4}-\d{2}-\d{2}$/.test(receiptData.date_of_birth)) {
                                      const [year, month, day] = receiptData.date_of_birth.split('-');
                                      return `${day}/${month}/${year}`;
                                    }
                                    // Si c'est une date ISO avec timezone, extraire seulement la partie date
                                    if (receiptData.date_of_birth.includes('T')) {
                                      const datePart = receiptData.date_of_birth.split('T')[0];
                                      if (/^\d{4}-\d{2}-\d{2}$/.test(datePart)) {
                                        const [year, month, day] = datePart.split('-');
                                        return `${day}/${month}/${year}`;
                                      }
                                    }
                                    // Sinon, utiliser les méthodes locales
                                    const date = new Date(receiptData.date_of_birth);
                                    if (isNaN(date.getTime())) return 'N/A';
                                    const day = String(date.getDate()).padStart(2, '0');
                                    const month = String(date.getMonth() + 1).padStart(2, '0');
                                    const year = date.getFullYear();
                                    return `${day}/${month}/${year}`;
                                  } catch (error) {
                                    return 'N/A';
                                  }
                                })() : 'N/A'}
                              </div>
                            </div>
                          </Grid>
                          <Grid item xs={12} sm={6}>
                            <div style={{ marginBottom: '15px' }}>
                              <strong style={{ color: '#555' }}>Classe:</strong>
                              <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#1976d2' }}>
                                {receiptData.classe}
                              </div>
                            </div>
                          </Grid>

                          <Grid item xs={12} sm={6}>
                            <div style={{ marginBottom: '15px' }}>
                              <strong style={{ color: '#555' }}>Code parent:</strong>
                              <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#1976d2' }}>
                                {receiptData.parent_code}
                              </div>
                            </div>
                          </Grid>
                        </Grid>
                      </div>

                      {/* Section Cantine */}
                      <div style={{
                        marginBottom: '30px',
                        padding: '20px',
                        backgroundColor: '#f3e5f5',
                        borderRadius: '12px',
                        border: '2px solid #9c27b0'
                      }}>
                        <h3 style={{
                          margin: '0 0 20px 0',
                          color: '#9c27b0',
                          fontSize: '20px',
                          fontWeight: 'bold',
                          textAlign: 'center',
                          textTransform: 'uppercase',
                          letterSpacing: '1px'
                        }}>
                          🍽️ Informations Cantine
                        </h3>
                        <Grid container spacing={3}>
                          <Grid item xs={12} sm={6}>
                            <div style={{ marginBottom: '15px' }}>
                              <strong style={{ color: '#555' }}>Inscrit à la cantine:</strong>
                              <div style={{ marginTop: '5px' }}>
                                {(receiptData.cantine === true || receiptData.cantine === 1 || receiptData.cantine === "Oui" || receiptData.cantine === "oui")
                                  ? <Chip label="Oui" color="success" size="medium" sx={{ fontWeight: 'bold' }} />
                                  : <Chip label="Non" color="default" size="medium" sx={{ fontWeight: 'bold' }} />}
                              </div>
                            </div>
                          </Grid>
                          {(receiptData.cantine === true || receiptData.cantine === 1 || receiptData.cantine === "Oui" || receiptData.cantine === "oui") && (
                            <>
                              <Grid item xs={12} sm={6}>
                                <div style={{ marginBottom: '15px' }}>
                                  <strong style={{ color: '#555' }}>L'enfant mange à la cantine:</strong>
                                  <div style={{ marginTop: '5px' }}>
                                    {(receiptData.eats_at_cantine === true || receiptData.eats_at_cantine === 1 || receiptData.eats_at_cantine === "Oui" || receiptData.eats_at_cantine === "oui")
                                      ? <Chip label="Oui" color="success" size="medium" sx={{ fontWeight: 'bold' }} />
                                      : <Chip label="Non" color="default" size="medium" sx={{ fontWeight: 'bold' }} />}
                                  </div>
                                </div>
                              </Grid>
                              {receiptData.allergy && (
                                <Grid item xs={12}>
                                  <div style={{ marginBottom: '15px' }}>
                                    <strong style={{ color: '#555' }}>Allergie(s):</strong>
                                    <div style={{ fontSize: '16px', color: '#d32f2f', fontWeight: 'bold' }}>
                                      {receiptData.allergy}
                                    </div>
                                  </div>
                                </Grid>
                              )}
                            </>
                          )}
                        </Grid>
                      </div>

                      {/* Section Informations du Parent */}
                      <div style={{
                        marginBottom: '30px',
                        padding: '20px',
                        backgroundColor: '#e8f5e8',
                        borderRadius: '12px',
                        border: '2px solid #4caf50'
                      }}>
                        <h3 style={{
                          margin: '0 0 20px 0',
                          color: '#4caf50',
                          fontSize: '20px',
                          fontWeight: 'bold',
                          textAlign: 'center',
                          textTransform: 'uppercase',
                          letterSpacing: '1px'
                        }}>
                          👨‍👩‍👧‍👦 Informations du Parent
                        </h3>
                        <Grid container spacing={3}>
                          <Grid item xs={12} sm={6}>
                            <div style={{ marginBottom: '15px' }}>
                              <strong style={{ color: '#555' }}>Nom du parent:</strong>
                              <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#4caf50' }}>
                                {receiptData.parent_last_name}
                              </div>
                            </div>
                          </Grid>
                          <Grid item xs={12} sm={6}>
                            <div style={{ marginBottom: '15px' }}>
                              <strong style={{ color: '#555' }}>Prénoms du parent:</strong>
                              <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#4caf50' }}>
                                {receiptData.parent_first_name}
                              </div>
                            </div>
                          </Grid>
                          <Grid item xs={12} sm={6}>
                            <div style={{ marginBottom: '15px' }}>
                              <strong style={{ color: '#555' }}>Email:</strong>
                              <div style={{ fontSize: '16px' }}>
                                {receiptData.parent_email}
                              </div>
                            </div>
                          </Grid>
                          <Grid item xs={12} sm={6}>
                            <div style={{ marginBottom: '15px' }}>
                              <strong style={{ color: '#555' }}>Contact WhatsApp du père:</strong>
                              <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#25d366' }}>
                                {receiptData.father_contact || '—'}
                              </div>
                            </div>
                          </Grid>
                          <Grid item xs={12} sm={6}>
                            <div style={{ marginBottom: '15px' }}>
                              <strong style={{ color: '#555' }}>Contact WhatsApp de la mère:</strong>
                              <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#25d366' }}>
                                {receiptData.mother_contact || '—'}
                              </div>
                            </div>
                          </Grid>
                          <Grid item xs={12} sm={6}>
                            <div style={{ marginBottom: '15px' }}>
                              <strong style={{ color: '#555' }}>Contact d'urgence:</strong>
                              <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#ff9800' }}>
                                {receiptData.emergency_contact || receiptData.parent_contact || receiptData.father_contact || receiptData.mother_contact || '—'}
                              </div>
                            </div>
                          </Grid>
                        </Grid>
                      </div>

                      {/* Section Détails du Paiement */}
                      <div style={{
                        marginBottom: '30px',
                        padding: '20px',
                        backgroundColor: '#fff3e0',
                        borderRadius: '12px',
                        border: '2px solid #ff9800'
                      }}>
                        <h3 style={{
                          margin: '0 0 20px 0',
                          color: '#ff9800',
                          fontSize: '20px',
                          fontWeight: 'bold',
                          textAlign: 'center',
                          textTransform: 'uppercase',
                          letterSpacing: '1px'
                        }}>
                          💰 Détails du Paiement
                        </h3>
                        <Grid container spacing={3}>
                          <Grid item xs={12} sm={6}>
                            <div style={{ marginBottom: '15px' }}>
                              <strong style={{ color: '#555' }}>Montant total de la scolarité:</strong>
                              <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#1976d2' }}>
                                {Number(receiptData.class_amount || 0).toLocaleString('fr-FR')} F CFA
                              </div>
                            </div>
                          </Grid>
                          <Grid item xs={12} sm={6}>
                            <div style={{ marginBottom: '15px' }}>
                              <strong style={{ color: '#555' }}>Total des réductions:</strong>
                              <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#4caf50' }}>
                                {Number(receiptData.total_discount || 0).toLocaleString('fr-FR')} F CFA
                              </div>
                            </div>
                          </Grid>
                          <Grid item xs={12} sm={6}>
                            <div style={{ marginBottom: '15px' }}>
                              <strong style={{ color: '#555' }}>Montant de ce versement:</strong>
                              <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#ff9800' }}>
                                {Number(receiptData.payment_amount || 0).toLocaleString('fr-FR')} F CFA
                              </div>
                            </div>
                          </Grid>
                          <Grid item xs={12} sm={6}>
                            <div style={{ marginBottom: '15px' }}>
                              <strong style={{ color: '#555' }}>Reste à payer:</strong>
                              <div style={{ 
                                fontSize: '18px', 
                                fontWeight: 'bold', 
                                color: receiptData.reste_a_payer > 0 ? '#f44336' : '#4caf50'
                              }}>
                                {receiptData.reste_a_payer > 0 ? `${Number(receiptData.reste_a_payer || 0).toLocaleString('fr-FR')} F CFA` : 'Soldé'}
                              </div>
                            </div>
                          </Grid>
                        </Grid>
                      </div>

                      {/* Boutons d'action */}
                      <div style={{ 
                        display: 'flex', 
                        justifyContent: 'center', 
                        gap: '20px', 
                        marginTop: '30px',
                        padding: '20px',
                        backgroundColor: '#f5f5f5',
                        borderRadius: '12px'
                      }}>
                        <Button 
                          onClick={() => setShowReceipt(false)} 
                          variant="outlined" 
                          color="secondary"
                          size="large"
                          sx={{ 
                            fontWeight: 'bold',
                            px: 4,
                            py: 1.5,
                            borderRadius: '8px'
                          }}
                        >
                          Fermer
                        </Button>
                        <Button 
                          onClick={handlePrintReceipt} 
                          variant="contained" 
                          color="primary"
                          size="large"
                          sx={{ 
                            fontWeight: 'bold',
                            px: 4,
                            py: 1.5,
                            borderRadius: '8px',
                            background: 'linear-gradient(45deg, #1976d2 30%, #42a5f5 90%)'
                          }}
                        >
                          🖨️ Imprimer
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Modale de reçu de réinscription */}
              <Dialog open={showReinscriptionReceipt} onClose={() => setShowReinscriptionReceipt(false)} maxWidth="md" fullWidth>
                <DialogTitle>Reçu de Réinscription</DialogTitle>
                <DialogContent>
                  {reinscriptionReceiptData && (
                    <Box ref={reinscriptionReceiptRef} sx={{ p: 4, border: '1px solid #1976d2', borderRadius: '16px', bgcolor: '#fafdff', boxShadow: 4, maxWidth: 700, mx: 'auto', my: 2 }}>
                      <Box sx={{ textAlign: 'center', mb: 4, pb: 2, borderBottom: '3px solid #1976d2', position: 'relative' }}>
                        <Box sx={{ mb: 2 }}>
                          <img 
                            src="/img/pages/vrailogo.jpg" 
                            alt="Logo École" 
                            style={{ 
                              height: 80, 
                              maxWidth: '100%', 
                              objectFit: 'contain',
                              marginBottom: '8px'
                            }} 
                          />
                        </Box>
                        <Typography variant="h3" component="h1" sx={{ color: '#1976d2', fontWeight: 'bold', letterSpacing: 1, mb: 1, fontFamily: 'Montserrat, Arial' }}>
                          École "GROUPE SCOLAIRE SAINTE FAMILLE L'EXECELLENCE"
                        </Typography>
                      </Box>
                      <Typography variant="h4" align="center" sx={{ my: 2, fontWeight: 'bold', color: '#222', letterSpacing: 1 }}>
                        REÇU DE RÉINSCRIPTION
                      </Typography>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
                        <Typography sx={{ fontWeight: 500, color: '#555' }}><b>Date:</b> {reinscriptionReceiptData.date}</Typography>
                        <Typography sx={{ fontWeight: 500, color: '#555' }}><b>Matricule:</b> {reinscriptionReceiptData.registration_number}</Typography>
                      </Box>
                      <Divider sx={{ my: 2 }}><Chip label="Informations de l'Élève" sx={{ fontWeight: 700, fontSize: 16, bgcolor: '#e3f2fd', color: '#1976d2' }} /></Divider>
                      <Grid container spacing={1}>
                        <Grid item xs={12} sm={6}><Typography><b>Nom:</b> {reinscriptionReceiptData.last_name}</Typography></Grid>
                        <Grid item xs={12} sm={6}><Typography><b>Prénoms:</b> {reinscriptionReceiptData.first_name}</Typography></Grid>
                        <Grid item xs={12} sm={6}><Typography><b>Date de naissance:</b> {reinscriptionReceiptData.date_of_birth}</Typography></Grid>
                        <Grid item xs={12} sm={6}><Typography><b>Classe:</b> {reinscriptionReceiptData.classe}</Typography></Grid>
                        <Grid item xs={12} sm={6}>
                          <Typography>
                            <b>Cantine (debug):</b> {JSON.stringify(reinscriptionReceiptData.cantine)}
                          </Typography>
                          <Typography>
                            <b>Cantine :</b> {(reinscriptionReceiptData.cantine === true || reinscriptionReceiptData.cantine === 1 || reinscriptionReceiptData.cantine === "Oui" || reinscriptionReceiptData.cantine === "oui")
                              ? <Chip label="Oui" color="success" size="small" sx={{ ml: 1 }} />
                              : <Chip label="Non" color="default" size="small" sx={{ ml: 1 }} />}
                          </Typography>
                        </Grid>
                        <Grid item xs={12} sm={6}><Typography><b>Année scolaire:</b> {reinscriptionReceiptData.schoolYear}</Typography></Grid>
                        <Grid item xs={12} sm={6}><Typography><b>Code élève:</b> {reinscriptionReceiptData.student_code}</Typography></Grid>
                        <Grid item xs={12} sm={6}><Typography><b>Code parent:</b> {reinscriptionReceiptData.parent_code}</Typography></Grid>
                      </Grid>
                      <Divider sx={{ my: 2, mt: 3 }}><Chip label="Informations du Parent" sx={{ fontWeight: 700, fontSize: 16, bgcolor: '#e3f2fd', color: '#1976d2' }} /></Divider>
                      <Grid container spacing={1}>
                        <Grid item xs={12} sm={6}><Typography><b>Nom du parent:</b>  {reinscriptionReceiptData.parent.parent_first_name}</Typography></Grid>
                        <Grid item xs={12} sm={6}><Typography><b>Prénoms du parent:</b>{reinscriptionReceiptData.parent.parent_last_name}</Typography></Grid>
                        <Grid item xs={12} sm={6}><Typography><b>Téléphone:</b> {reinscriptionReceiptData.parent.parent_phone}</Typography></Grid>
                        <Grid item xs={12} sm={6}><Typography><b>Email:</b> {reinscriptionReceiptData.parent.parent_email}</Typography></Grid>
                        <Grid item xs={12}><Typography><b>Contact:</b> {reinscriptionReceiptData.parent.parent_contact}</Typography></Grid>
                      </Grid>
                      <Divider sx={{ my: 2, mt: 3 }}><Chip label="Détails du Paiement" sx={{ fontWeight: 700, fontSize: 16, bgcolor: '#e3f2fd', color: '#1976d2' }} /></Divider>
                      <Table size="medium" sx={{ mb: 2 }}>
                        <TableBody>
                          <TableRow>
                            <TableCell sx={{ fontWeight: 600, color: '#1976d2', fontSize: 16 }}>Montant du premier versement</TableCell>
                            <TableCell align="right" sx={{ fontWeight: 700, color: '#388e3c', fontSize: 18 }}>{Number(reinscriptionReceiptData.payment_amount || 0).toLocaleString('fr-FR')} F CFA</TableCell>
                          </TableRow>
                          <TableRow>
                            <TableCell sx={{ fontWeight: 600, color: '#1976d2', fontSize: 16 }}>Reliquat année précédente</TableCell>
                            <TableCell align="right" sx={{ fontWeight: 700, color: '#d32f2f', fontSize: 18 }}>0 F CFA</TableCell>
                          </TableRow>
                        </TableBody>
                      </Table>
                      <Box sx={{ mt: 5, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                        <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, fontSize: 16 }}>
                          Statut: <Chip label="Réinscrit" color="success" size="medium" sx={{ fontWeight: 700, fontSize: 16 }} />
                        </Typography>
                        <Box sx={{ textAlign: 'center' }}>
                          <Typography sx={{ fontStyle: 'italic', color: '#1976d2', fontWeight: 600 }}>Le secrétariat</Typography>
                        </Box>
                      </Box>
                    </Box>
                  )}
                </DialogContent>
                <DialogActions sx={{ p: 2 }}>
                  <Button onClick={() => setShowReinscriptionReceipt(false)}>Fermer</Button>
                  <Button color="primary" variant="contained" startIcon={<PrintIcon />} onClick={handlePrintReinscriptionReceipt}>Imprimer</Button>
                </DialogActions>
              </Dialog>

              {/* Modale d'historique des reçus */}
              <Dialog open={receiptHistoryOpen} onClose={handleReceiptHistoryClose} maxWidth="lg" fullWidth>
                <DialogTitle>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Typography variant="h6" fontWeight={700}>
                      Historique des Reçus - {selectedStudentForHistory?.first_name} {selectedStudentForHistory?.last_name}
                    </Typography>
                    <IconButton onClick={handleReceiptHistoryClose}>
                      <DeleteIcon />
                    </IconButton>
                  </Box>
                </DialogTitle>
                <DialogContent>
                  {receiptHistoryLoading ? (
                    <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                      <CircularProgress />
                    </Box>
                  ) : (
                    <Box>
                      {/* Filtres et recherche */}
                      <Box sx={{ mb: 3, display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                        <TextField
                          label="Rechercher"
                          value={receiptHistorySearch}
                          onChange={(e) => setReceiptHistorySearch(e.target.value)}
                          size="small"
                          sx={{ minWidth: 200 }}
                        />
                        <FormControl size="small" sx={{ minWidth: 150 }}>
                          <InputLabel>Type de reçu</InputLabel>
                          <Select
                            value={receiptHistoryFilter}
                            onChange={(e) => setReceiptHistoryFilter(e.target.value)}
                            label="Type de reçu"
                          >
                            <MenuItem value="all">Tous les types</MenuItem>
                            <MenuItem value="inscription">Inscription</MenuItem>
                            <MenuItem value="finalisation">Finalisation</MenuItem>
                            <MenuItem value="reinscription">Réinscription</MenuItem>
                            <MenuItem value="paiement">Paiement</MenuItem>
                          </Select>
                        </FormControl>
                      </Box>

                      {/* Liste des reçus */}
                      {filteredReceiptHistory.length === 0 ? (
                        <Typography color="text.secondary" sx={{ textAlign: 'center', py: 4 }}>
                          Aucun reçu trouvé pour cet élève
                        </Typography>
                      ) : (
                        <TableContainer component={Paper} elevation={1}>
                          <Table>
                            <TableHead>
                              <TableRow>
                                <TableCell sx={{ fontWeight: 600 }}>Date</TableCell>
                                <TableCell sx={{ fontWeight: 600 }}>Type</TableCell>
                                <TableCell sx={{ fontWeight: 600 }}>Description</TableCell>
                                <TableCell sx={{ fontWeight: 600 }}>Montant</TableCell>
                                <TableCell sx={{ fontWeight: 600 }}>Actions</TableCell>
                              </TableRow>
                            </TableHead>
                            <TableBody>
                              {filteredReceiptHistory.map((receipt, index) => (
                                <TableRow key={index} hover>
                                  <TableCell>
                                    {new Date(receipt.created_at).toLocaleDateString('fr-FR')}
                                  </TableCell>
                                  <TableCell>
                                    <Chip 
                                      label={getReceiptTypeLabel(receipt.type)} 
                                      color={getReceiptTypeColor(receipt.type) as any}
                                      size="small"
                                    />
                                  </TableCell>
                                  <TableCell>
                                    {receipt.description || `${getReceiptTypeLabel(receipt.type)} - ${receipt.student_name}`}
                                  </TableCell>
                                  <TableCell>
                                    {receipt.amount ? `${Number(receipt.amount).toLocaleString('fr-FR')} F CFA` : '-'}
                                  </TableCell>
                                  <TableCell>
                                    <Tooltip title="Imprimer le reçu">
                                      <IconButton 
                                        color="primary" 
                                        size="small"
                                        onClick={() => handlePrintReceiptFromHistory(receipt)}
                                      >
                                        <PrintIcon />
                                      </IconButton>
                                    </Tooltip>
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </TableContainer>
                      )}
                    </Box>
                  )}
                </DialogContent>
                <DialogActions>
                  <Button onClick={handleReceiptHistoryClose}>Fermer</Button>
                </DialogActions>
              </Dialog>
            </>
          )}
        </Container>
      </Box>
      
      {/* Snackbar pour les notifications globales */}
      <Snackbar
        open={snackbarOpen}
        autoHideDuration={6000}
        onClose={handleSnackbarClose}
        anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
      >
        <Alert 
          onClose={handleSnackbarClose} 
          severity={snackbarSeverity} 
          sx={{ width: '100%' }}
        >
          {snackbarMessage}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default Students; 

