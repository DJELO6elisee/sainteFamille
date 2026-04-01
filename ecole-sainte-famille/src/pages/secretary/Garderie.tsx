import React, { useState, useRef, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  Grid,
  Card,
  CardContent,
  CardActions,
  useTheme,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Stepper,
  Step,
  StepLabel,
  Snackbar,
  Alert,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  IconButton,
  Tooltip,
} from '@mui/material';
import html2pdf from 'html2pdf.js';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import frLocale from 'date-fns/locale/fr';
import {
  ChildCare as ChildCareIcon,
  Search as SearchIcon,
  PersonAdd as PersonAddIcon,
  School as SchoolIcon,
  GetApp as DownloadIcon,
  Print as PrintIcon,
  Visibility as ViewIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  PhotoCamera as PhotoCameraIcon,
  Payment as PaymentIcon,
  History as HistoryIcon,
} from '@mui/icons-material';
import SecretarySidebar from '../../components/SecretarySidebar';

const steps = ['Inscription complète'];

interface ChildForm {
  firstName: string;
  lastName: string;
  civility: string;
  dateOfBirth: Date | null;
  startDate: Date | null;
  endDate: Date | null;
  childAge: number | null;
  childPhoto: File | null;
  cantine: boolean;
  eatsAtCantine: boolean | null;
  allergy: string;
  uniqueCode: string;
  parentFirstName: string;
  parentLastName: string;
  parentPhone: string;
  parentEmail: string;
  emergencyContact: string;
  cantineAmount: number | null; // Montant total de cantine fixe
  totalSchoolingAmount: number | null; // Montant total de scolarité fixe
  // initialPayment: number | null; // Versement initial retiré
}

const Garderie = () => {
  const theme = useTheme();
  const [showNewChildForm, setShowNewChildForm] = useState(false);
  const [showSearchForm, setShowSearchForm] = useState(false);
  const [activeStep, setActiveStep] = useState(0);
  const [receiptData, setReceiptData] = useState<any | null>(null);
  const [showReceipt, setShowReceipt] = useState(false);
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success' as 'success' | 'error' | 'warning' | 'info',
  });
  const [children, setChildren] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [selectedChild, setSelectedChild] = useState<any>(null);
  const [showReinscriptionForm, setShowReinscriptionForm] = useState(false);
  const [editingChild, setEditingChild] = useState<any>(null);
  const [showEditForm, setShowEditForm] = useState(false);
  const [deletingChild, setDeletingChild] = useState<any>(null);
  
  // États pour l'historique des reçus
  const [receiptHistoryOpen, setReceiptHistoryOpen] = useState(false);
  const [receiptHistory, setReceiptHistory] = useState<any[]>([]);
  const [receiptHistoryLoading, setReceiptHistoryLoading] = useState(false);
  const [selectedChildForHistory, setSelectedChildForHistory] = useState<any>(null);
  const [receiptHistorySearch, setReceiptHistorySearch] = useState('');
  const [receiptHistoryFilter, setReceiptHistoryFilter] = useState('all');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [viewingChild, setViewingChild] = useState<any>(null);
  const [showViewDetails, setShowViewDetails] = useState(false);
  const [photoError, setPhotoError] = useState<{[key: string]: boolean}>({});
  const receiptRef = useRef<HTMLDivElement>(null);
  
  // États pour le système de paiement
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [selectedChildForPayment, setSelectedChildForPayment] = useState<any>(null);
  const [paymentAmount, setPaymentAmount] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState<string>('Espèces');
  
  // État pour l'année scolaire
  const [selectedSchoolYear, setSelectedSchoolYear] = useState<string>('2024-2025');
  
  // État pour le rôle utilisateur
  const [userRole, setUserRole] = useState<string>('');

  // État pour la recherche
  const [searchTerm, setSearchTerm] = useState<string>('');

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

  // Fonction pour récupérer la liste des enfants inscrits
  const fetchChildren = async () => {
    setLoading(true);
    try {
      const response = await fetch(`https://saintefamilleexcellence.ci/api/garderie/children?schoolYear=${selectedSchoolYear}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        console.log('📊 Données reçues de l\'API garderie:', data);
        console.log('👶 Enfants reçus:', data.children);
        
        if (data.children && data.children.length > 0) {
          data.children.forEach((child: any, index: number) => {
            console.log(`👶 Enfant ${index + 1}:`, {
              id: child.id,
              name: `${child.child_first_name} ${child.child_last_name}`,
              photo: child.child_photo,
              hasPhoto: !!child.child_photo,
              photoUrl: child.child_photo ? `https://saintefamilleexcellence.ci/api/garderie/photo/${child.child_photo}` : 'Aucune photo'
            });
          });
        }
        
        setChildren(data.children || []);
      } else {
        console.error('Erreur lors de la récupération des enfants');
        setChildren([]);
      }
    } catch (error) {
      console.error('Erreur lors de la récupération des enfants:', error);
      setChildren([]);
    } finally {
      setLoading(false);
    }
  };

  // Charger la liste des enfants au montage du composant et quand l'année scolaire change
  useEffect(() => {
    fetchChildren();
  }, [selectedSchoolYear]);

  // Initialiser le rôle utilisateur
  useEffect(() => {
    const role = getUserRole();
    setUserRole(role);
    console.log('=== [DEBUG] Rôle utilisateur détecté:', role);
  }, []);

  // Fonction pour calculer l'âge automatiquement
  const calculateAge = (birthDate: Date | null): number | null => {
    if (!birthDate) return null;
    
    const today = new Date();
    const birth = new Date(birthDate);
    
    let age = today.getFullYear() - birth.getFullYear();
    
    const currentMonth = today.getMonth();
    const birthMonth = birth.getMonth();
    const currentDay = today.getDate();
    const birthDay = birth.getDate();
    
    if (currentMonth < birthMonth || (currentMonth === birthMonth && currentDay < birthDay)) {
      age--;
    }
    
    return age;
  };

  // Fonction pour calculer la période entre deux dates
  const calculatePeriod = (startDate: Date | null, endDate: Date | null): string => {
    if (!startDate || !endDate) return '';
    
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    if (end <= start) return '';
    
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 1) return '1 jour';
    if (diffDays < 7) return `${diffDays} jours`;
    if (diffDays < 30) return `${Math.ceil(diffDays / 7)} semaine(s)`;
    if (diffDays < 365) return `${Math.ceil(diffDays / 30)} mois`;
    return `${Math.ceil(diffDays / 365)} an(s)`;
  };

  // Fonction pour calculer le montant total de cantine (montant fixe)
  const calculateCantineAmount = (): number => {
    return formData.cantineAmount || 0;
  };

  // Fonction pour calculer le montant total de scolarité (montant fixe)
  const calculateSchoolingAmount = (): number => {
    return formData.totalSchoolingAmount || 0;
  };

  // Fonction pour générer un code unique plus court
  const generateUniqueCode = (): string => {
    const timestamp = Date.now().toString(36).slice(-4);
    const randomStr = Math.random().toString(36).substring(2, 6);
    return `GD${timestamp}${randomStr}`.toUpperCase();
  };

  const [formData, setFormData] = useState<ChildForm>({
    firstName: '',
    lastName: '',
    civility: '',
    dateOfBirth: null,
    startDate: null,
    endDate: null,
    childAge: null,
    childPhoto: null,
    cantine: false,
    eatsAtCantine: null,
            allergy: '',
        uniqueCode: '',
    parentFirstName: '',
    parentLastName: '',
    parentPhone: '',
    parentEmail: '',
    emergencyContact: '',
            cantineAmount: null, // Montant total de cantine fixe
        totalSchoolingAmount: null, // Montant total de scolarité fixe
        // initialPayment: null, // Versement initial retiré
  });

  const handleNext = () => {
    setActiveStep((prevStep) => prevStep + 1);
  };

  const handleBack = () => {
    setActiveStep((prevStep) => prevStep - 1);
  };

  const handleSubmit = async () => {
    try {
      // Validation des champs requis
      if (!formData.firstName || !formData.lastName || !formData.civility || 
          !formData.dateOfBirth || !formData.startDate || 
          !formData.endDate || !formData.parentFirstName || !formData.parentLastName || 
          !formData.parentPhone || !formData.parentEmail || !formData.emergencyContact) {
        setSnackbar({
          open: true,
          message: 'Veuillez remplir tous les champs obligatoires',
          severity: 'error',
        });
        return;
      }

      // Validation des dates
      if (formData.startDate && formData.endDate && formData.endDate <= formData.startDate) {
        setSnackbar({
          open: true,
          message: 'La date de fin doit être postérieure à la date de début',
          severity: 'error',
        });
        return;
      }

      // Validation de la date de naissance
      if (formData.dateOfBirth) {
        const today = new Date();
        const birthDate = new Date(formData.dateOfBirth);
        
        if (birthDate > today) {
          setSnackbar({
            open: true,
            message: 'La date de naissance ne peut pas être dans le futur',
            severity: 'error',
          });
          return;
        }
        
        if (formData.childAge && formData.childAge > 18) {
          setSnackbar({
            open: true,
            message: 'L\'âge de l\'enfant semble incorrect (plus de 18 ans)',
            severity: 'error',
          });
          return;
        }
      }

      // Validation du montant de cantine
      if (formData.cantine && formData.eatsAtCantine && (!formData.cantineAmount || formData.cantineAmount <= 0)) {
        setSnackbar({
          open: true,
          message: 'Veuillez saisir un montant total de cantine valide',
          severity: 'error',
        });
        return;
      }

      // Validation de la scolarité
      if (!formData.totalSchoolingAmount || formData.totalSchoolingAmount <= 0) {
        setSnackbar({
          open: true,
          message: 'Veuillez saisir un montant total de scolarité valide',
          severity: 'error',
        });
        return;
      }

      // Validation du versement initial retirée

      // Générer un code unique pour l'inscription
      let updatedFormData = { ...formData };
      const uniqueCode = generateUniqueCode();
      updatedFormData = { ...formData, uniqueCode };

      // Sauvegarder les données dans la base de données
      let saveResponse;
      try {
        const formDataToSend = new FormData();
        
        // Ajouter tous les champs du formulaire
        Object.keys(updatedFormData).forEach(key => {
          if (key === 'childPhoto' && updatedFormData[key as keyof ChildForm]) {
            formDataToSend.append('childPhoto', updatedFormData[key as keyof ChildForm] as File);
          } else if (key !== 'childPhoto') {
            const value = updatedFormData[key as keyof ChildForm];
            if (value instanceof Date) {
              formDataToSend.append(key, value.toISOString().split('T')[0]);
            } else if (value !== null && value !== undefined) {
              // Gérer les valeurs booléennes spécialement
              if (key === 'cantine' || key === 'eatsAtCantine') {
                formDataToSend.append(key, value ? 'true' : 'false');
              } else {
                formDataToSend.append(key, String(value));
              }
            }
          }
        });

        saveResponse = await fetch('https://saintefamilleexcellence.ci/api/garderie/save-inscription', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          },
          body: formDataToSend,
        });
      } catch (fetchError) {
        console.error('Erreur lors de la requête fetch:', fetchError);
        throw fetchError;
      }

      if (!saveResponse.ok) {
        const errorText = await saveResponse.text();
        console.error('Erreur de sauvegarde:', errorText);
        throw new Error('Erreur lors de la sauvegarde');
      }

      // Préparer les données du reçu
      const receiptInfo = {
        ...updatedFormData,
        receiptNumber: `REC-${Date.now()}`,
        date: new Date().toLocaleDateString('fr-FR'),
        time: new Date().toLocaleTimeString('fr-FR'),
      };
      
      setReceiptData(receiptInfo);
      setShowReceipt(true);

      // Recharger la liste des enfants
      await fetchChildren();

      // Envoyer l'email de confirmation
      setSnackbar({
        open: true,
        message: `Inscription réussie ! Code unique généré : ${updatedFormData.uniqueCode}`,
        severity: 'success',
      });
    } catch (error) {
      console.error('Erreur lors de la soumission:', error);
      setSnackbar({
        open: true,
        message: 'Erreur lors de l\'inscription',
        severity: 'error',
      });
    }
  };

  const handleDownloadReceipt = () => {
    if (receiptRef.current) {
      html2pdf().from(receiptRef.current).save('recu-garderie.pdf');
    }
  };

  const handlePrintReceipt = () => {
    if (receiptRef.current) {
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write('<html><head><title>Reçu d\'inscription Garderie</title>');
        // Inclure les styles Material-UI si nécessaire, ou des styles CSS spécifiques pour l'impression
        printWindow.document.write('<style>');
        printWindow.document.write(`
          @page {
            size: A4;
            margin: 8mm;
          }
          body { 
            font-family: Arial, sans-serif; 
            margin: 0; 
            padding: 0; 
            font-size: 10px;
            line-height: 1.2;
          }
          .receipt-container { 
            width: 210mm; 
            height: 297mm; 
            margin: 0 auto; 
            padding: 10mm; 
            box-sizing: border-box;
            page-break-inside: avoid;
            overflow: hidden;
          }
          .header { 
            text-align: center; 
            margin-bottom: 15px; 
            padding-bottom: 8px; 
            border-bottom: 2px solid #1976d2; 
          }
          .logo-container {
            display: inline-flex;
            flex-direction: column;
            align-items: center;
            margin-bottom: 8px;
            padding: 8px;
            border-radius: 50%;
            background-color: #1976d2;
            color: white;
            width: 60px;
            height: 60px;
            justify-content: center;
            box-shadow: 0 2px 4px rgba(0,0,0,0.2);
          }
          .school-name {
            color: #1976d2;
            font-size: 18px;
            font-weight: bold;
            margin: 5px 0;
            text-shadow: 0 1px 2px rgba(0,0,0,0.1);
          }
          .school-subtitle {
            color: #1976d2;
            font-size: 14px;
            font-weight: 600;
            margin: 3px 0;
          }
          .header h1 { 
            color: #1976d2; 
            font-size: 16px; 
            margin: 0 0 3px 0; 
          }
          .header h2 { 
            color: #666; 
            font-size: 12px; 
            margin: 3px 0; 
          }
          .header p { 
            color: #888; 
            font-size: 8px; 
            margin: 1px 0;
          }
          .section-title { 
            color: #1976d2; 
            font-size: 11px; 
            font-weight: bold; 
            margin-top: 10px; 
            margin-bottom: 5px; 
            border-bottom: 1px solid #eee; 
            padding-bottom: 2px; 
          }
          .info-row { 
            display: flex; 
            margin-bottom: 2px; 
            font-size: 9px;
          }
          .info-label { 
            font-weight: bold; 
            width: 80px; 
            flex-shrink: 0;
          }
          .info-value { 
            flex: 1;
          }
          .two-columns {
            display: flex;
            gap: 15px;
          }
          .column {
            flex: 1;
          }
          .payment-section {
            background-color: #f8f9fa;
            padding: 5px;
            border-radius: 3px;
            margin: 8px 0;
          }
          .footer { 
            text-align: center; 
            margin-top: 15px; 
            padding-top: 5px; 
            border-top: 1px solid #ddd; 
            font-size: 8px; 
            color: #666; 
          }
          @media print {
            body { -webkit-print-color-adjust: exact; }
            .MuiDialog-paper { margin: 0 !important; max-width: 100% !important; border-radius: 0 !important; box-shadow: none !important; }
            .MuiDialogActions-root { display: none !important; }
            .receipt-container { page-break-inside: avoid; }
            * { -webkit-print-color-adjust: exact !important; color-adjust: exact !important; }
            .logo-container { -webkit-print-color-adjust: exact !important; }
            .school-name { -webkit-print-color-adjust: exact !important; }
            .school-subtitle { -webkit-print-color-adjust: exact !important; }
          }
        `);
        printWindow.document.write('</style>');
        printWindow.document.write('</head><body>');
        printWindow.document.write('<div class="receipt-container">');
        printWindow.document.write(receiptRef.current.innerHTML);
        printWindow.document.write('</div>');
        printWindow.document.write('</body></html>');
        printWindow.document.close();
        printWindow.focus();
        printWindow.print();
      }
    }
  };

  const handleCloseReceipt = () => {
    setShowReceipt(false);
    setTimeout(() => {
      setReceiptData(null);
      setFormData({
        firstName: '',
        lastName: '',
        civility: '',
        dateOfBirth: null,
        startDate: null,
        endDate: null,
        childAge: null,
        childPhoto: null,
        cantine: false,
        eatsAtCantine: null,
        allergy: '',
        uniqueCode: '',
        parentFirstName: '',
        parentLastName: '',
        parentPhone: '',
        parentEmail: '',
        emergencyContact: '',
        cantineAmount: null, // Montant total de cantine fixe
        totalSchoolingAmount: null, // Montant total de scolarité fixe
        // initialPayment: null, // Versement initial retiré
      });
      setShowNewChildForm(false);
      setActiveStep(0);
    }, 100);
  };

  // Fonction pour rechercher un enfant
  const searchChild = async (searchTerm: string) => {
    if (!searchTerm.trim()) {
      setSearchResults([]);
      return;
    }

    try {
      const response = await fetch(`https://saintefamilleexcellence.ci/api/garderie/search?term=${encodeURIComponent(searchTerm)}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setSearchResults(data.children || []);
      } else {
        console.error('Erreur lors de la recherche');
        setSearchResults([]);
      }
    } catch (error) {
      console.error('Erreur lors de la recherche:', error);
      setSearchResults([]);
    }
  };

  // Fonction pour sélectionner un enfant pour réinscription
  const handleSelectChildForReinscription = (child: any) => {
    console.log('Enfant sélectionné pour réinscription:', child);
    
    setSelectedChild(child);
    
    // Pré-remplir le formulaire avec les données de l'enfant
    const childData = {
      firstName: child.child_first_name || '',
      lastName: child.child_last_name || '',
      civility: child.civility || '',
      dateOfBirth: child.date_of_birth ? new Date(child.date_of_birth) : null,
      startDate: null, // Nouvelle date de début à saisir
      endDate: null, // Nouvelle date de fin à saisir
      childAge: child.child_age || null,
      childPhoto: null, // Nouvelle photo à saisir
      cantine: child.cantine || false,
      eatsAtCantine: child.eats_at_cantine || null,
      allergy: child.allergy || '',
      
        uniqueCode: child.unique_code || '', // Conserver le code existant
      parentFirstName: child.parent_first_name || '',
      parentLastName: child.parent_last_name || '',
      parentPhone: child.parent_phone || '',
      parentEmail: child.parent_email || '',
      emergencyContact: child.emergency_contact || '',
      cantineAmount: child.cantine_amount || null, // Montant total de cantine fixe
      totalSchoolingAmount: child.total_schooling_amount || null, // Montant total de scolarité fixe
      // initialPayment: child.initial_payment || null, // Versement initial retiré
    };
    
    console.log('Données du formulaire pré-remplies:', childData);
    setFormData(childData);
    
    // Fermer le modal de recherche et ouvrir le modal de réinscription
    setShowSearchForm(false);
    setShowReinscriptionForm(true);
    
    console.log('Modal de réinscription ouvert');
  };

  // Fonction pour soumettre la réinscription
  const handleReinscriptionSubmit = async () => {
    try {
      // Validation des champs requis
      if (!formData.startDate || !formData.endDate) {
        setSnackbar({
          open: true,
          message: 'Veuillez remplir les dates pour la réinscription',
          severity: 'error',
        });
        return;
      }

      // Validation des dates
      if (formData.endDate <= formData.startDate) {
        setSnackbar({
          open: true,
          message: 'La date de fin doit être postérieure à la date de début',
          severity: 'error',
        });
        return;
      }

      // Validation du montant de cantine
      if (formData.cantine && formData.eatsAtCantine && (!formData.cantineAmount || formData.cantineAmount <= 0)) {
        setSnackbar({
          open: true,
          message: 'Veuillez saisir un montant total de cantine valide',
          severity: 'error',
        });
        return;
      }

      // Conserver le code unique existant (pas de génération de nouveau code)
      const updatedFormData = { ...formData };

      // Sauvegarder la réinscription
      let saveResponse;
      try {
        const formDataToSend = new FormData();
        
        // Ajouter tous les champs du formulaire
        Object.keys(updatedFormData).forEach(key => {
          if (key === 'childPhoto' && updatedFormData[key as keyof ChildForm]) {
            formDataToSend.append('childPhoto', updatedFormData[key as keyof ChildForm] as File);
          } else if (key !== 'childPhoto') {
            const value = updatedFormData[key as keyof ChildForm];
            if (value instanceof Date) {
              formDataToSend.append(key, value.toISOString().split('T')[0]);
            } else if (value !== null && value !== undefined) {
              // Gérer les valeurs booléennes spécialement
              if (key === 'cantine' || key === 'eatsAtCantine') {
                formDataToSend.append(key, value ? 'true' : 'false');
              } else {
                formDataToSend.append(key, String(value));
              }
            }
          }
        });
        
        // Ajouter l'ID de l'enfant original
        formDataToSend.append('originalChildId', selectedChild.id.toString());

        saveResponse = await fetch('https://saintefamilleexcellence.ci/api/garderie/reinscription', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          },
          body: formDataToSend,
        });
      } catch (fetchError) {
        console.error('Erreur lors de la requête fetch:', fetchError);
        throw fetchError;
      }

      if (!saveResponse.ok) {
        const errorText = await saveResponse.text();
        console.error('Erreur de réinscription:', errorText);
        throw new Error('Erreur lors de la réinscription');
      }

      // Préparer les données du reçu
      const receiptInfo = {
        ...updatedFormData,
        receiptNumber: `REC-${Date.now()}`,
        date: new Date().toLocaleDateString('fr-FR'),
        time: new Date().toLocaleTimeString('fr-FR'),
        isReinscription: true,
        originalChildName: `${selectedChild.child_first_name} ${selectedChild.child_last_name}`
      };
      
      setReceiptData(receiptInfo);
      setShowReceipt(true);

      // Recharger la liste des enfants
      await fetchChildren();

      setSnackbar({
        open: true,
        message: `Réinscription réussie ! Code unique conservé : ${updatedFormData.uniqueCode}`,
        severity: 'success',
      });

      // Réinitialiser les états
      setSelectedChild(null);
      setShowReinscriptionForm(false);
      setSearchResults([]);
      setSearchTerm('');

    } catch (error) {
      console.error('Erreur lors de la réinscription:', error);
      setSnackbar({
        open: true,
        message: 'Erreur lors de la réinscription',
        severity: 'error',
      });
    }
  };

  const renderStepContent = (step: number) => {
    return (
      <Grid container spacing={3}>
        {/* Informations de l'enfant */}
        <Grid item xs={12}>
          <Typography variant="h6" sx={{ fontWeight: 600, color: 'primary.main', mb: 2, pb: 1, borderBottom: '2px solid', borderColor: 'primary.main' }}>
            Informations de l'enfant
          </Typography>
        </Grid>
        
        <Grid item xs={12} md={6}>
          <TextField
            required
            fullWidth
            label="Prénom de l'enfant"
            value={formData.firstName}
            onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
          />
        </Grid>
        <Grid item xs={12} md={6}>
          <TextField
            required
            fullWidth
            label="Nom de l'enfant"
            value={formData.lastName}
            onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
          />
        </Grid>
        <Grid item xs={12} md={6}>
          <FormControl fullWidth required>
            <InputLabel>Civilité</InputLabel>
            <Select
              value={formData.civility}
              label="Civilité"
              onChange={(e) => setFormData({ ...formData, civility: e.target.value })}
            >
              <MenuItem value="Garçon">Garçon</MenuItem>
              <MenuItem value="Fille">Fille</MenuItem>
            </Select>
          </FormControl>
        </Grid>
        <Grid item xs={12}>
          <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={frLocale}>
            <DatePicker
              label="Date de naissance"
              value={formData.dateOfBirth}
              onChange={(date) => {
                const age = calculateAge(date);
                setFormData({ 
                  ...formData, 
                  dateOfBirth: date,
                  childAge: age
                });
              }}
              slotProps={{
                textField: { fullWidth: true, required: true },
              }}
            />
          </LocalizationProvider>
        </Grid>
        {formData.childAge !== null && (
          <Grid item xs={12}>
            <Typography variant="body1" sx={{ color: 'primary.main', fontWeight: 600, p: 2, bgcolor: 'primary.light', borderRadius: 1 }}>
              Âge de l'enfant : {formData.childAge} an(s)
            </Typography>
          </Grid>
        )}
        
        {/* Champ photo de l'enfant */}
        <Grid item xs={12}>
          <Box sx={{ textAlign: 'center', p: 2, border: '2px dashed #ccc', borderRadius: 2, bgcolor: '#f9f9f9' }}>
            <input
              accept="image/*"
              style={{ display: 'none' }}
              id="child-photo-upload"
              type="file"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) {
                  setFormData({ ...formData, childPhoto: file });
                }
              }}
            />
            <label htmlFor="child-photo-upload">
              <Box sx={{ cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <PhotoCameraIcon sx={{ fontSize: 40, color: 'primary.main', mb: 1 }} />
                <Typography variant="body1" sx={{ fontWeight: 600, color: 'primary.main' }}>
                  {formData.childPhoto ? formData.childPhoto.name : 'Ajouter une photo de l\'enfant'}
                </Typography>
                <Typography variant="caption" sx={{ color: 'text.secondary', mt: 0.5 }}>
                  Cliquez pour sélectionner une image (JPG, PNG, GIF)
                </Typography>
              </Box>
            </label>
            {formData.childPhoto && (
              <Box sx={{ mt: 2 }}>
                <img
                  src={URL.createObjectURL(formData.childPhoto)}
                  alt="Aperçu"
                  style={{
                    maxWidth: '200px',
                    maxHeight: '200px',
                    borderRadius: '8px',
                    objectFit: 'cover'
                  }}
                />
                <Button
                  size="small"
                  color="error"
                  onClick={() => setFormData({ ...formData, childPhoto: null })}
                  sx={{ mt: 1 }}
                >
                  Supprimer la photo
                </Button>
              </Box>
            )}
          </Box>
        </Grid>
        <Grid item xs={12} sm={6}>
          <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={frLocale}>
            <DatePicker
              label="Date de début"
              value={formData.startDate}
              onChange={(date) => {
                setFormData({ ...formData, startDate: date });
              }}
              slotProps={{
                textField: { fullWidth: true, required: true },
              }}
            />
          </LocalizationProvider>
        </Grid>
        <Grid item xs={12} sm={6}>
          <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={frLocale}>
            <DatePicker
              label="Date de fin"
              value={formData.endDate}
              onChange={(date) => {
                setFormData({ ...formData, endDate: date });
              }}
              slotProps={{
                textField: { fullWidth: true, required: true },
              }}
            />
          </LocalizationProvider>
        </Grid>
        {formData.startDate && formData.endDate && (
          <Grid item xs={12}>
            <Typography variant="body1" sx={{ color: 'primary.main', fontWeight: 600, p: 2, bgcolor: 'primary.light', borderRadius: 1 }}>
              Période calculée : {calculatePeriod(formData.startDate, formData.endDate)}
            </Typography>
          </Grid>
        )}

        {/* Section Cantine */}
        <Grid item xs={12}>
          <Typography variant="h6" sx={{ fontWeight: 600, color: 'primary.main', mt: 3, mb: 2, pb: 1, borderBottom: '2px solid', borderColor: 'primary.main' }}>
            Informations Cantine
          </Typography>
        </Grid>
        <Grid item xs={12} sm={6}>
          <FormControl fullWidth required>
            <InputLabel>Cantine</InputLabel>
            <Select
              value={formData.cantine ? '1' : '0'}
              label="Cantine"
              onChange={(e) => setFormData({ ...formData, cantine: e.target.value === '1' })}
            >
              <MenuItem value="1">Oui</MenuItem>
              <MenuItem value="0">Non</MenuItem>
            </Select>
          </FormControl>
        </Grid>
        {formData.cantine && (
          <>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth required>
                <InputLabel>Mange à la cantine</InputLabel>
                <Select
                  value={formData.eatsAtCantine === null ? '' : (formData.eatsAtCantine ? '1' : '0')}
                  label="Mange à la cantine"
                  onChange={(e) => setFormData({ ...formData, eatsAtCantine: e.target.value === '1' })}
                >
                  <MenuItem value="1">Oui</MenuItem>
                  <MenuItem value="0">Non</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            {formData.eatsAtCantine && (
              <>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Allergies alimentaires"
                    multiline
                    rows={2}
                    value={formData.allergy}
                    onChange={(e) => setFormData({ ...formData, allergy: e.target.value })}
                    helperText="Précisez les allergies alimentaires de l'enfant"
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Montant total de cantine (FCFA)"
                    type="number"
                    inputProps={{ min: 0 }}
                    value={formData.cantineAmount || ''}
                    onChange={(e) => {
                      const value = e.target.value ? Number(e.target.value) : null;
                      if (value === null || value >= 0) {
                        setFormData({ ...formData, cantineAmount: value });
                      }
                    }}
                    helperText="Montant total fixe pour la cantine de cet enfant"
                    placeholder="150000"
                  />
                </Grid>
                {formData.cantineAmount && (
                  <Grid item xs={12} sm={6}>
                    <Typography variant="body1" sx={{ color: 'info.main', fontWeight: 600, p: 2, bgcolor: 'info.light', borderRadius: 1 }}>
                      Montant total cantine : {calculateCantineAmount()} FCFA
                    </Typography>
                  </Grid>
                )}
              </>
            )}
          </>
        )}

        {/* Section Scolarité */}
        <Grid item xs={12}>
          <Typography variant="h6" sx={{ fontWeight: 600, color: 'primary.main', mt: 3, mb: 2, pb: 1, borderBottom: '2px solid', borderColor: 'primary.main' }}>
            Informations de Scolarité
          </Typography>
        </Grid>
        <Grid item xs={12} sm={6}>
          <TextField
            fullWidth
            label="Montant total de scolarité (FCFA)"
            type="number"
            inputProps={{ min: 0 }}
            value={formData.totalSchoolingAmount || ''}
            onChange={(e) => {
              const value = e.target.value ? Number(e.target.value) : null;
              if (value === null || value >= 0) {
                setFormData({ ...formData, totalSchoolingAmount: value });
              }
            }}
            helperText="Montant total fixe pour la scolarité de cet enfant"
            placeholder="150000"
          />
        </Grid>
        {formData.totalSchoolingAmount && (
          <Grid item xs={12} sm={6}>
            <Typography variant="body1" sx={{ color: 'warning.main', fontWeight: 600, p: 2, bgcolor: 'warning.light', borderRadius: 1 }}>
              Montant total scolarité : {calculateSchoolingAmount()} FCFA
            </Typography>
          </Grid>
        )}
        {/* Champ versement initial retiré */}


        {formData.uniqueCode && (
          <Grid item xs={12}>
            <Typography variant="body1" sx={{ color: 'success.main', fontWeight: 600, p: 2, bgcolor: 'success.light', borderRadius: 1 }}>
              Code unique : {formData.uniqueCode} {showReinscriptionForm && '(Conservé pour la réinscription)'}
            </Typography>
          </Grid>
        )}

        {/* Informations des parents */}
        <Grid item xs={12}>
          <Typography variant="h6" sx={{ fontWeight: 600, color: 'primary.main', mt: 3, mb: 2, pb: 1, borderBottom: '2px solid', borderColor: 'primary.main' }}>
            Informations des parents
          </Typography>
        </Grid>
        <Grid item xs={12} sm={6}>
          <TextField
            required
            fullWidth
            label="Prénom du parent"
            value={formData.parentFirstName}
            onChange={(e) => setFormData({ ...formData, parentFirstName: e.target.value })}
          />
        </Grid>
        <Grid item xs={12} sm={6}>
          <TextField
            required
            fullWidth
            label="Nom du parent"
            value={formData.parentLastName}
            onChange={(e) => setFormData({ ...formData, parentLastName: e.target.value })}
          />
        </Grid>
        <Grid item xs={12} sm={6}>
          <TextField
            required
            fullWidth
            label="Téléphone du parent"
            value={formData.parentPhone}
            onChange={(e) => {
              const value = e.target.value;
              // N'accepter que les chiffres, +, -, (, ), et espaces
              const filteredValue = value.replace(/[^0-9+\-\(\)\s]/g, '');
              setFormData({ ...formData, parentPhone: filteredValue });
            }}
            inputProps={{ 
              pattern: "[0-9+\\s\\-\\(\\)]*",
              title: "Veuillez saisir un numéro de téléphone valide"
            }}
            helperText="Format: +225 0123456789 ou 0123456789"
          />
        </Grid>
        <Grid item xs={12} sm={6}>
          <TextField
            required
            fullWidth
            label="Email du parent"
            type="email"
            value={formData.parentEmail}
            onChange={(e) => setFormData({ ...formData, parentEmail: e.target.value })}
            inputProps={{ 
              pattern: "[a-z0-9._%+-]+@[a-z0-9.-]+\\.[a-z]{2,}$",
              title: "Veuillez saisir une adresse email valide"
            }}
            helperText="Format: exemple@email.com"
          />
        </Grid>
        <Grid item xs={12}>
          <TextField
            required
            fullWidth
            label="Contact à joindre en cas d'urgence"
            value={formData.emergencyContact}
            onChange={(e) => {
              const value = e.target.value;
              // N'accepter que les chiffres, +, -, (, ), et espaces
              const filteredValue = value.replace(/[^0-9+\-\(\)\s]/g, '');
              setFormData({ ...formData, emergencyContact: filteredValue });
            }}
            inputProps={{ 
              pattern: "[0-9+\\s\\-\\(\\)]*",
              title: "Veuillez saisir un numéro de téléphone valide"
            }}
            helperText="Format: +225 0123456789 ou 0123456789"
          />
        </Grid>
      </Grid>
    );
  };

  // Fonction pour supprimer un enfant
  const handleDeleteChild = async (child: any) => {
    // Vérifier que l'utilisateur est admin
    if (userRole !== 'admin') {
      setSnackbar({
        open: true,
        message: 'Seul l\'administrateur peut supprimer des enfants',
        severity: 'error',
      });
      return;
    }
    
    setDeletingChild(child);
    setShowDeleteConfirm(true);
  };

  // Fonction pour confirmer la suppression
  const confirmDelete = async () => {
    if (!deletingChild) return;

    // Vérification supplémentaire du rôle
    if (userRole !== 'admin') {
      setSnackbar({
        open: true,
        message: 'Seul l\'administrateur peut supprimer des enfants',
        severity: 'error',
      });
      setShowDeleteConfirm(false);
      setDeletingChild(null);
      return;
    }

    try {
      const response = await fetch(`https://saintefamilleexcellence.ci/api/garderie/inscription/${deletingChild.id}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
      });

      if (!response.ok) {
        throw new Error('Erreur lors de la suppression');
      }

      setSnackbar({
        open: true,
        message: 'Enfant supprimé avec succès',
        severity: 'success',
      });

      // Recharger la liste
      await fetchChildren();
      setShowDeleteConfirm(false);
      setDeletingChild(null);

    } catch (error) {
      console.error('Erreur lors de la suppression:', error);
      setSnackbar({
        open: true,
        message: 'Erreur lors de la suppression',
        severity: 'error',
      });
    }
  };

  // Fonction pour voir les détails d'un enfant
  const handleViewChildDetails = (child: any) => {
    setViewingChild(child);
    setShowViewDetails(true);
  };

  // Fonction pour modifier un enfant
  const handleEditChild = async (child: any) => {
    setEditingChild(child);
    
    // Pré-remplir le formulaire avec les données de l'enfant
    const childData = {
      firstName: child.child_first_name || '',
      lastName: child.child_last_name || '',
      civility: child.civility || '',
      dateOfBirth: child.date_of_birth ? new Date(child.date_of_birth) : null,
      startDate: child.start_date ? new Date(child.start_date) : null,
      endDate: child.end_date ? new Date(child.end_date) : null,
      childAge: child.child_age || null,
      childPhoto: null, // Pas de pré-remplissage pour la photo en modification
      cantine: child.cantine || false,
      eatsAtCantine: child.eats_at_cantine || null,
      allergy: child.allergy || '',
      
        uniqueCode: child.unique_code || '',
      parentFirstName: child.parent_first_name || '',
      parentLastName: child.parent_last_name || '',
      parentPhone: child.parent_phone || '',
      parentEmail: child.parent_email || '',
      emergencyContact: child.emergency_contact || '',
      cantineAmount: child.cantine_amount || null, // Montant total de cantine fixe
      totalSchoolingAmount: child.total_schooling_amount || null, // Montant total de scolarité fixe
      // initialPayment: child.initial_payment || null, // Versement initial retiré
    };
    
    setFormData(childData);
    setShowEditForm(true);
  };

  // Fonction pour soumettre la modification
  const handleEditSubmit = async () => {
    try {
      // Validation des champs requis
      if (!formData.startDate || !formData.endDate) {
        setSnackbar({
          open: true,
          message: 'Veuillez remplir tous les champs obligatoires',
          severity: 'error',
        });
        return;
      }

      // Validation des dates
      if (formData.endDate <= formData.startDate) {
        setSnackbar({
          open: true,
          message: 'La date de fin doit être postérieure à la date de début',
          severity: 'error',
        });
        return;
      }

      // Validation du montant de cantine
      if (formData.cantine && formData.eatsAtCantine && (!formData.cantineAmount || formData.cantineAmount <= 0)) {
        setSnackbar({
          open: true,
          message: 'Veuillez saisir un montant total de cantine valide',
          severity: 'error',
        });
        return;
      }

      const formDataToSend = new FormData();
      
      // Ajouter tous les champs du formulaire
      Object.keys(formData).forEach(key => {
        if (key === 'childPhoto' && formData[key as keyof ChildForm]) {
          formDataToSend.append('childPhoto', formData[key as keyof ChildForm] as File);
        } else if (key !== 'childPhoto') {
          const value = formData[key as keyof ChildForm];
          if (value instanceof Date) {
            formDataToSend.append(key, value.toISOString().split('T')[0]);
          } else if (value !== null && value !== undefined) {
            // Gérer les valeurs booléennes spécialement
            if (key === 'cantine' || key === 'eatsAtCantine') {
              formDataToSend.append(key, value ? 'true' : 'false');
            } else {
              formDataToSend.append(key, String(value));
            }
          }
        }
      });

      const response = await fetch(`https://saintefamilleexcellence.ci/api/garderie/inscription/${editingChild.id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: formDataToSend,
      });

      if (!response.ok) {
        throw new Error('Erreur lors de la modification');
      }

      setSnackbar({
        open: true,
        message: 'Enfant modifié avec succès',
        severity: 'success',
      });

      // Recharger la liste
      await fetchChildren();
      setShowEditForm(false);
      setEditingChild(null);

    } catch (error) {
      console.error('Erreur lors de la modification:', error);
      setSnackbar({
        open: true,
        message: 'Erreur lors de la modification',
        severity: 'error',
      });
    }
  };

  // Fonction pour ouvrir le dialogue de paiement
  const handlePaymentClick = (child: any) => {
    setSelectedChildForPayment(child);
    const remainingBalance = child.total_schooling_amount - child.total_paid_amount;
    setPaymentAmount(remainingBalance);
    setShowPaymentDialog(true);
  };

  // Fonction pour effectuer un paiement
  const handleMakePayment = async () => {
    if (!selectedChildForPayment || paymentAmount <= 0) {
      setSnackbar({
        open: true,
        message: 'Veuillez saisir un montant valide',
        severity: 'error',
      });
      return;
    }

    try {
      const response = await fetch('https://saintefamilleexcellence.ci/api/garderie/payment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          childId: selectedChildForPayment.id,
          amount: paymentAmount,
          paymentMethod: paymentMethod,
          notes: `Paiement supplémentaire - ${new Date().toLocaleDateString('fr-FR')}`
        }),
      });

      if (!response.ok) {
        throw new Error('Erreur lors du paiement');
      }

      setSnackbar({
        open: true,
        message: `Paiement de ${paymentAmount.toLocaleString()} FCFA effectué avec succès`,
        severity: 'success',
      });

      // Recharger la liste des enfants
      await fetchChildren();
      
      // Fermer le dialogue
      setShowPaymentDialog(false);
      setSelectedChildForPayment(null);
      setPaymentAmount(0);
      setPaymentMethod('Espèces');

    } catch (error) {
      console.error('Erreur lors du paiement:', error);
      setSnackbar({
        open: true,
        message: 'Erreur lors du paiement',
        severity: 'error',
      });
    }
  };

  // Fonctions pour l'historique des reçus
  const handleReceiptHistoryOpen = (child: any) => {
    setSelectedChildForHistory(child);
    setReceiptHistoryOpen(true);
    fetchReceiptHistory(child.id);
  };

  const handleReceiptHistoryClose = () => {
    setReceiptHistoryOpen(false);
    setSelectedChildForHistory(null);
    setReceiptHistory([]);
    setReceiptHistorySearch('');
    setReceiptHistoryFilter('all');
  };

  const fetchReceiptHistory = async (childId: number) => {
    setReceiptHistoryLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`https://saintefamilleexcellence.ci/api/garderie/${childId}/receipt-history`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setReceiptHistory(data.receipts || []);
      } else {
        console.error('Erreur lors de la récupération de l\'historique des reçus');
        setSnackbar({
          open: true,
          message: 'Erreur lors de la récupération de l\'historique des reçus',
          severity: 'error',
        });
      }
    } catch (error) {
      console.error('Erreur lors de la récupération de l\'historique des reçus:', error);
      setSnackbar({
        open: true,
        message: 'Erreur lors de la récupération de l\'historique des reçus',
        severity: 'error',
      });
    } finally {
      setReceiptHistoryLoading(false);
    }
  };

  const handlePrintReceiptFromHistory = async (receipt: any) => {
    try {
      const token = localStorage.getItem('token');
      let url = '';
      
      if (receipt.type === 'inscription') {
        url = `https://saintefamilleexcellence.ci/api/garderie/${selectedChildForHistory.id}/inscription-receipt?inscription_date=${receipt.date}`;
      } else if (receipt.type === 'paiement') {
        url = `https://saintefamilleexcellence.ci/api/garderie/${selectedChildForHistory.id}/payment-receipt/${receipt.payment_id}`;
      }

      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        
        // Créer une nouvelle fenêtre pour l'impression
        const printWindow = window.open('', '_blank');
        if (printWindow) {
          printWindow.document.write(data.html);
          printWindow.document.close();
          
          // Attendre que le contenu soit chargé avant d'imprimer
          setTimeout(() => {
            printWindow.print();
            printWindow.close();
          }, 500);
        }
      } else {
        console.error('Erreur lors de l\'impression du reçu');
        setSnackbar({
          open: true,
          message: 'Erreur lors de l\'impression du reçu',
          severity: 'error',
        });
      }
    } catch (error) {
      console.error('Erreur lors de l\'impression du reçu:', error);
      setSnackbar({
        open: true,
        message: 'Erreur lors de l\'impression du reçu',
        severity: 'error',
      });
    }
  };

  const getReceiptTypeLabel = (type: string) => {
    switch (type) {
      case 'inscription':
        return 'Inscription';
      case 'paiement':
        return 'Paiement';
      default:
        return type;
    }
  };

  const getReceiptTypeColor = (type: string) => {
    switch (type) {
      case 'inscription':
        return 'primary';
      case 'paiement':
        return 'success';
      default:
        return 'default';
    }
  };

  const filteredReceiptHistory = receiptHistory.filter(receipt => {
    const matchesSearch = receipt.description?.toLowerCase().includes(receiptHistorySearch.toLowerCase()) ||
                         receipt.date?.toLowerCase().includes(receiptHistorySearch.toLowerCase());
    const matchesFilter = receiptHistoryFilter === 'all' || receipt.type === receiptHistoryFilter;
    return matchesSearch && matchesFilter;
  });

  // Fonction pour filtrer les enfants selon le terme de recherche
  const filteredChildren = children.filter(child => {
    const fullName = `${child.child_first_name || ''} ${child.child_last_name || ''}`.toLowerCase();
    const searchLower = searchTerm.toLowerCase();
    return fullName.includes(searchLower);
  });

  // Fonction pour imprimer la liste des enfants
  const handlePrintChildrenList = () => {
    const printWindow = window.open('', '', 'height=900,width=1200');
    if (printWindow) {
      printWindow.document.write('<html><head><title>Liste des enfants - Garderie</title>');
      printWindow.document.write('<style>');
      printWindow.document.write(`
        @page {
          size: A4;
          margin: 15mm;
        }
        body { 
          font-family: Arial, sans-serif; 
          margin: 0; 
          padding: 0; 
          font-size: 12px;
          line-height: 1.4;
        }
        .header { 
          text-align: center; 
          margin-bottom: 20px; 
          padding-bottom: 10px; 
          border-bottom: 2px solid #1976d2; 
        }
        .school-name {
          color: #1976d2;
          font-size: 24px;
          font-weight: bold;
          margin: 10px 0;
        }
        .school-subtitle {
          color: #1976d2;
          font-size: 18px;
          font-weight: 600;
          margin: 5px 0;
        }
        .report-title {
          color: #333;
          font-size: 20px;
          font-weight: bold;
          margin: 15px 0;
        }
        .report-info {
          color: #666;
          font-size: 14px;
          margin: 10px 0;
        }
        table { 
          width: 100%; 
          border-collapse: collapse; 
          margin-top: 20px;
        } 
        th, td { 
          border: 1px solid #ddd; 
          padding: 8px; 
          text-align: left; 
          font-size: 11px;
        } 
        th { 
          background: #1976d2; 
          color: white; 
          font-weight: bold;
        }
        .status-paid {
          color: #4caf50;
          font-weight: bold;
        }
        .status-unpaid {
          color: #ff9800;
          font-weight: bold;
        }
        .status-undefined {
          color: #999;
          font-weight: bold;
        }
        .footer { 
          text-align: center; 
          margin-top: 30px; 
          padding-top: 10px; 
          border-top: 1px solid #ddd; 
          font-size: 10px; 
          color: #666; 
        }
        @media print {
          body { -webkit-print-color-adjust: exact; }
          .status-paid { -webkit-print-color-adjust: exact !important; }
          .status-unpaid { -webkit-print-color-adjust: exact !important; }
          .status-undefined { -webkit-print-color-adjust: exact !important; }
        }
      `);
      printWindow.document.write('</style>');
      printWindow.document.write('</head><body>');
      printWindow.document.write('<div class="header">');
      printWindow.document.write('<div class="school-name">GROUPE SCOLAIRE SAINTE FAMILLE L\'EXECELLENCE</div>');
      printWindow.document.write('<div class="school-subtitle">GROUPE SCOLAIRE SAINTE FAMILLE L\'EXECELLENCE</div>');
      printWindow.document.write('<div class="report-title">Liste des enfants inscrits à la garderie</div>');
      printWindow.document.write(`<div class="report-info">Année scolaire: ${selectedSchoolYear} | Date: ${new Date().toLocaleDateString('fr-FR')} | Total: ${filteredChildren.length} enfant(s)</div>`);
      printWindow.document.write('</div>');
      
      printWindow.document.write('<table>');
      printWindow.document.write('<thead>');
      printWindow.document.write('<tr>');
      printWindow.document.write('<th>N°</th>');
      printWindow.document.write('<th>Nom et Prénom</th>');
      printWindow.document.write('<th>Âge</th>');
      printWindow.document.write('<th>Parents</th>');
      printWindow.document.write('<th>Période</th>');
      printWindow.document.write('<th>Cantine</th>');
      printWindow.document.write('<th>Scolarité</th>');
      printWindow.document.write('<th>Statut</th>');
      printWindow.document.write('<th>Code</th>');
      printWindow.document.write('</tr>');
      printWindow.document.write('</thead>');
      printWindow.document.write('<tbody>');
      
      filteredChildren.forEach((child, index) => {
        const status = child.total_schooling_amount && child.total_paid_amount !== undefined ? 
          (child.total_schooling_amount - child.total_paid_amount) <= 0 ? 
            '<span class="status-paid">Soldé</span>' : 
            '<span class="status-unpaid">Non soldé</span>' : 
          '<span class="status-undefined">Non défini</span>';
        
        printWindow.document.write('<tr>');
        printWindow.document.write(`<td>${index + 1}</td>`);
        printWindow.document.write(`<td>${child.child_first_name || ''} ${child.child_last_name || ''}</td>`);
        printWindow.document.write(`<td>${child.child_age || 0} an(s)</td>`);
        printWindow.document.write(`<td>${child.parent_first_name || ''} ${child.parent_last_name || ''}</td>`);
        printWindow.document.write(`<td>Du ${child.start_date ? new Date(child.start_date).toLocaleDateString('fr-FR') : 'N/A'} au ${child.end_date ? new Date(child.end_date).toLocaleDateString('fr-FR') : 'N/A'}</td>`);
        printWindow.document.write(`<td>${child.cantine ? 'Oui' : 'Non'}</td>`);
        printWindow.document.write(`<td>${child.total_schooling_amount ? `${child.total_schooling_amount.toLocaleString()} FCFA` : 'Non défini'}</td>`);
        printWindow.document.write(`<td>${status}</td>`);
        printWindow.document.write(`<td>${child.unique_code || '-'}</td>`);
        printWindow.document.write('</tr>');
      });
      
      printWindow.document.write('</tbody>');
      printWindow.document.write('</table>');
      
      printWindow.document.write('<div class="footer">');
      printWindow.document.write('Document généré automatiquement par le système de gestion de la garderie');
      printWindow.document.write('<br>');
      printWindow.document.write(`Généré le ${new Date().toLocaleDateString('fr-FR')} à ${new Date().toLocaleTimeString('fr-FR')}`);
      printWindow.document.write('</div>');
      
      printWindow.document.write('</body></html>');
      printWindow.document.close();
      printWindow.focus();
      setTimeout(() => {
        printWindow.print();
        printWindow.close();
      }, 500);
    }
  };

  // Fonction pour tester l'accès aux photos
  const testPhotoAccess = async () => {
    try {
      console.log('🧪 Test d\'accès aux photos...');
      
      // Tester une photo spécifique
      const testPhoto = 'garderie-1753979323958-460772514.jpg';
      const testUrl = `https://saintefamilleexcellence.ci/api/garderie/photo/${testPhoto}`;
      
      console.log(`🔗 Test URL: ${testUrl}`);
      
      const response = await fetch(testUrl);
      console.log(`📊 Status: ${response.status}`);
      console.log(`📋 Headers:`, response.headers);
      
      if (response.ok) {
        console.log('✅ Photo accessible via fetch');
      } else {
        console.log('❌ Erreur lors de l\'accès à la photo');
      }
    } catch (error) {
      console.error('❌ Erreur lors du test:', error);
    }
  };

  return (
    <Box sx={{ display: 'flex' }}>
      <SecretarySidebar />
      <Box sx={{ flexGrow: 1, p: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h4" sx={{ fontWeight: 700, color: theme.palette.primary.main }}>
            Garderie
          </Typography>
          <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
            <FormControl size="small" sx={{ minWidth: 150 }}>
              <InputLabel>Année scolaire</InputLabel>
              <Select
                value={selectedSchoolYear}
                label="Année scolaire"
                onChange={(e) => setSelectedSchoolYear(e.target.value)}
              >
                <MenuItem value="2023-2024">2023-2024</MenuItem>
                <MenuItem value="2024-2025">2024-2025</MenuItem>
                <MenuItem value="2025-2026">2025-2026</MenuItem>
              </Select>
            </FormControl>
            <Button
              variant="outlined"
              size="small"
              onClick={testPhotoAccess}
              sx={{ fontSize: '0.8rem' }}
            >
              Test Photos
            </Button>
          </Box>
        </Box>
        
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
              <CardContent sx={{ flexGrow: 1, textAlign: 'center' }}>
                <ChildCareIcon sx={{ fontSize: 60, color: theme.palette.primary.main, mb: 2 }} />
                <Typography variant="h5" gutterBottom>
                  Nouvel enfant
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Inscrire un nouvel enfant à la garderie
                </Typography>
              </CardContent>
              <CardActions sx={{ justifyContent: 'center', pb: 2 }}>
                <Button
                  variant="contained"
                  startIcon={<PersonAddIcon />}
                  onClick={() => setShowNewChildForm(true)}
                  size="large"
                >
                  Nouvel enfant
                </Button>
              </CardActions>
            </Card>
          </Grid>
          
          <Grid item xs={12} md={6}>
            <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
              <CardContent sx={{ flexGrow: 1, textAlign: 'center' }}>
                <SearchIcon sx={{ fontSize: 60, color: theme.palette.secondary.main, mb: 2 }} />
                <Typography variant="h5" gutterBottom>
                  Réinscription
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Rechercher et réinscrire un enfant existant
                </Typography>
              </CardContent>
              <CardActions sx={{ justifyContent: 'center', pb: 2 }}>
                <Button
                  variant="contained"
                  color="secondary"
                  startIcon={<SearchIcon />}
                  onClick={() => setShowSearchForm(true)}
                  size="large"
                >
                  Réinscription
                </Button>
              </CardActions>
            </Card>
          </Grid>
        </Grid>

        {/* Dialog pour le formulaire d'inscription */}
        <Dialog
          open={showNewChildForm}
          onClose={() => setShowNewChildForm(false)}
          maxWidth="md"
          fullWidth
        >
          <DialogTitle>
            <Typography variant="h5" sx={{ fontWeight: 700, color: theme.palette.primary.main }}>
              Inscription d'un nouvel enfant
            </Typography>
          </DialogTitle>
          <DialogContent>
            <Stepper activeStep={activeStep} sx={{ mb: 4 }}>
              {steps.map((label) => (
                <Step key={label}>
                  <StepLabel>{label}</StepLabel>
                </Step>
              ))}
            </Stepper>
            {renderStepContent(activeStep)}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setShowNewChildForm(false)}>
              Annuler
            </Button>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Button onClick={() => setShowNewChildForm(false)}>
                Annuler
              </Button>
              <Button variant="contained" onClick={handleSubmit}>
                Inscrire
              </Button>
            </Box>
          </DialogActions>
        </Dialog>

        {/* Dialog pour la recherche */}
        <Dialog
          open={showSearchForm}
          onClose={() => setShowSearchForm(false)}
          maxWidth="sm"
          fullWidth
        >
          <DialogTitle>
            <Typography variant="h5" sx={{ fontWeight: 700, color: theme.palette.secondary.main }}>
              Rechercher un enfant
            </Typography>
          </DialogTitle>
          <DialogContent>
            <TextField
              fullWidth
              label="Nom ou code unique de l'enfant"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  searchChild(searchTerm);
                }
              }}
              sx={{ mb: 2 }}
            />
            <Button
              variant="contained"
              startIcon={<SearchIcon />}
              onClick={() => searchChild(searchTerm)}
              fullWidth
            >
              Rechercher
            </Button>
            {searchResults.length > 0 && (
              <Box sx={{ mt: 2 }}>
                <Typography variant="h6" sx={{ fontWeight: 600, color: theme.palette.primary.main, mb: 1 }}>
                  Résultats de la recherche
                </Typography>
                {searchResults.map((child, index) => (
                  <Box
                    key={child.id || index}
                    sx={{
                      p: 2,
                      border: '1px solid #e0e0e0',
                      borderRadius: 2,
                      mb: 1,
                      cursor: 'pointer',
                      backgroundColor: '#f8f9fa',
                      transition: 'all 0.2s ease',
                      '&:hover': {
                        backgroundColor: 'rgba(25, 118, 210, 0.08)',
                        borderColor: '#1976d2',
                        transform: 'translateY(-1px)',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                      },
                    }}
                    onClick={() => handleSelectChildForReinscription(child)}
                  >
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Box>
                        <Typography variant="body1" sx={{ fontWeight: 600, color: '#1976d2' }}>
                          {child.child_first_name || ''} {child.child_last_name || ''}
                        </Typography>
                        <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                          Code: {child.unique_code || 'N/A'}
                        </Typography>
                        <Typography variant="caption" display="block" sx={{ color: 'text.secondary' }}>
                          Parents: {child.parent_first_name || ''} {child.parent_last_name || ''}
                        </Typography>
                      </Box>
                      <Typography variant="body2" sx={{ color: 'success.main', fontWeight: 600 }}>
                        Cliquer pour réinscrire
                      </Typography>
                    </Box>
                  </Box>
                ))}
              </Box>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setShowSearchForm(false)}>
              Fermer
            </Button>
          </DialogActions>
        </Dialog>

        {/* Dialog pour la réinscription */}
        {selectedChild && (
          <Dialog
            open={showReinscriptionForm}
            onClose={() => {
              setShowReinscriptionForm(false);
              setTimeout(() => {
                setSelectedChild(null);
              }, 100);
            }}
            maxWidth="md"
            fullWidth
          >
            <DialogTitle>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <SearchIcon sx={{ color: theme.palette.secondary.main }} />
                <Typography variant="h5" sx={{ fontWeight: 700, color: theme.palette.secondary.main }}>
                  Réinscription de {selectedChild.child_first_name} {selectedChild.child_last_name}
                </Typography>
              </Box>
              <Typography variant="body2" sx={{ color: 'text.secondary', mt: 1 }}>
                Remplissez les nouvelles dates et le montant pour la réinscription
              </Typography>
            </DialogTitle>
            <DialogContent>
              <Stepper activeStep={activeStep} sx={{ mb: 4 }}>
                {steps.map((label) => (
                  <Step key={label}>
                    <StepLabel>{label}</StepLabel>
                  </Step>
                ))}
              </Stepper>
              {renderStepContent(activeStep)}
            </DialogContent>
            <DialogActions>
              <Button onClick={() => {
                setShowReinscriptionForm(false);
                setTimeout(() => {
                  setSelectedChild(null);
                }, 100);
              }}>
                Annuler
              </Button>
              <Box sx={{ display: 'flex', gap: 1 }}>
                <Button onClick={() => {
                  setShowReinscriptionForm(false);
                  setTimeout(() => {
                    setSelectedChild(null);
                  }, 100);
                }}>
                  Annuler
                </Button>
                <Button variant="contained" color="secondary" onClick={handleReinscriptionSubmit}>
                  Réinscrire
                </Button>
              </Box>
            </DialogActions>
          </Dialog>
        )}

        {/* Dialog pour la modification d'un enfant */}
        {showEditForm && editingChild && (
          <Dialog
            open={showEditForm}
            onClose={() => {
              setShowEditForm(false);
              setTimeout(() => {
                setEditingChild(null);
              }, 100);
            }}
            maxWidth="md"
            fullWidth
          >
            <DialogTitle>
              <Typography variant="h5" sx={{ fontWeight: 700, color: theme.palette.secondary.main }}>
                Modifier l'inscription de {editingChild.child_first_name} {editingChild.child_last_name}
              </Typography>
            </DialogTitle>
            <DialogContent>
              <Box sx={{ mt: 2 }}>
                {renderStepContent(0)}
              </Box>
            </DialogContent>
            <DialogActions sx={{ p: 3, gap: 2 }}>
              <Box sx={{ display: 'flex', gap: 2, width: '100%', justifyContent: 'flex-end' }}>
                <Button onClick={() => {
                  setShowEditForm(false);
                  setTimeout(() => {
                    setEditingChild(null);
                  }, 100);
                }}>
                  Annuler
                </Button>
                <Button variant="contained" color="secondary" onClick={handleEditSubmit}>
                  Modifier
                </Button>
              </Box>
            </DialogActions>
          </Dialog>
        )}

        {/* Dialog pour voir les détails d'un enfant */}
        {showViewDetails && viewingChild && (
          <Dialog
            open={showViewDetails}
            onClose={() => {
              setShowViewDetails(false);
              setTimeout(() => {
                setViewingChild(null);
              }, 100);
            }}
            maxWidth="md"
            fullWidth
          >
            <DialogTitle>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <ChildCareIcon sx={{ color: theme.palette.primary.main }} />
                <Typography variant="h5" sx={{ fontWeight: 700, color: theme.palette.primary.main }}>
                  Détails de l'enfant
                </Typography>
              </Box>
            </DialogTitle>
            <DialogContent>
              <Grid container spacing={3}>
                {/* Photo de l'enfant */}
                <Grid item xs={12} sx={{ textAlign: 'center', mb: 2 }}>
                  {viewingChild.child_photo && !photoError[viewingChild.id] ? (
                    <img
                      src={`https://saintefamilleexcellence.ci/api/garderie/photo/${viewingChild.child_photo}`}
                      alt={`${viewingChild.child_first_name} ${viewingChild.child_last_name}`}
                      style={{
                        width: '150px',
                        height: '150px',
                        borderRadius: '50%',
                        objectFit: 'cover',
                        border: '3px solid #e0e0e0',
                        boxShadow: '0 4px 8px rgba(0,0,0,0.1)'
                      }}
                      onError={(e) => {
                        console.error(`❌ Erreur de chargement de l'image pour ${viewingChild.child_first_name}`);
                        console.error(`📸 Nom du fichier: ${viewingChild.child_photo}`);
                        console.error(`🔗 URL complète: https://saintefamilleexcellence.ci/api/garderie/photo/${viewingChild.child_photo}`);
                        console.error(`📊 Événement d'erreur:`, e);
                        setPhotoError(prev => ({ ...prev, [viewingChild.id]: true }));
                      }}
                      onLoad={() => {
                        console.log(`✅ Image chargée avec succès pour ${viewingChild.child_first_name}`);
                        console.log(`📸 URL: https://saintefamilleexcellence.ci/api/garderie/photo/${viewingChild.child_photo}`);
                      }}
                    />
                  ) : (
                    <Box
                      sx={{
                        width: '150px',
                        height: '150px',
                        borderRadius: '50%',
                        bgcolor: '#f0f0f0',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        border: '3px solid #e0e0e0',
                        margin: '0 auto'
                      }}
                    >
                      <ChildCareIcon sx={{ fontSize: 60, color: '#999' }} />
                    </Box>
                  )}
                  <Typography variant="h6" sx={{ fontWeight: 700, mt: 2, color: theme.palette.primary.main }}>
                    {viewingChild.child_first_name} {viewingChild.child_last_name}
                  </Typography>
                  <Chip 
                    label={viewingChild.civility} 
                    color="primary" 
                    size="small"
                    sx={{ mt: 1 }}
                  />
                </Grid>

                {/* Informations de l'enfant */}
                <Grid item xs={12}>
                  <Typography variant="h6" sx={{ fontWeight: 600, color: theme.palette.primary.main, mb: 2, pb: 1, borderBottom: '2px solid', borderColor: 'primary.main' }}>
                    Informations de l'enfant
                  </Typography>
                </Grid>
                
                <Grid item xs={12} sm={6}>
                  <Box sx={{ p: 2, bgcolor: '#f8f9fa', borderRadius: 2 }}>
                    <Typography variant="body2" sx={{ fontWeight: 600, color: 'text.secondary', mb: 1 }}>
                      Date de naissance
                    </Typography>
                    <Typography variant="body1" sx={{ fontWeight: 600 }}>
                      {viewingChild.date_of_birth ? new Date(viewingChild.date_of_birth).toLocaleDateString('fr-FR') : 'Non renseignée'}
                    </Typography>
                  </Box>
                </Grid>
                
                <Grid item xs={12} sm={6}>
                  <Box sx={{ p: 2, bgcolor: '#f8f9fa', borderRadius: 2 }}>
                    <Typography variant="body2" sx={{ fontWeight: 600, color: 'text.secondary', mb: 1 }}>
                      Âge
                    </Typography>
                    <Typography variant="body1" sx={{ fontWeight: 600, color: theme.palette.primary.main }}>
                      {viewingChild.child_age || 0} an(s)
                    </Typography>
                  </Box>
                </Grid>

                {/* Période de garderie */}
                <Grid item xs={12}>
                  <Typography variant="h6" sx={{ fontWeight: 600, color: theme.palette.primary.main, mt: 3, mb: 2, pb: 1, borderBottom: '2px solid', borderColor: 'primary.main' }}>
                    Période de garderie
                  </Typography>
                </Grid>
                
                <Grid item xs={12} sm={6}>
                  <Box sx={{ p: 2, bgcolor: '#e3f2fd', borderRadius: 2 }}>
                    <Typography variant="body2" sx={{ fontWeight: 600, color: 'text.secondary', mb: 1 }}>
                      Date de début
                    </Typography>
                    <Typography variant="body1" sx={{ fontWeight: 600, color: theme.palette.primary.main }}>
                      {viewingChild.start_date ? new Date(viewingChild.start_date).toLocaleDateString('fr-FR') : 'Non renseignée'}
                    </Typography>
                  </Box>
                </Grid>
                
                <Grid item xs={12} sm={6}>
                  <Box sx={{ p: 2, bgcolor: '#e3f2fd', borderRadius: 2 }}>
                    <Typography variant="body2" sx={{ fontWeight: 600, color: 'text.secondary', mb: 1 }}>
                      Date de fin
                    </Typography>
                    <Typography variant="body1" sx={{ fontWeight: 600, color: theme.palette.primary.main }}>
                      {viewingChild.end_date ? new Date(viewingChild.end_date).toLocaleDateString('fr-FR') : 'Non renseignée'}
                    </Typography>
                  </Box>
                </Grid>

                {/* Informations cantine */}
                <Grid item xs={12}>
                  <Typography variant="h6" sx={{ fontWeight: 600, color: theme.palette.primary.main, mt: 3, mb: 2, pb: 1, borderBottom: '2px solid', borderColor: 'primary.main' }}>
                    Informations Cantine
                  </Typography>
                </Grid>
                
                <Grid item xs={12} sm={6}>
                  <Box sx={{ p: 2, bgcolor: viewingChild.cantine ? '#e8f5e8' : '#fff3e0', borderRadius: 2 }}>
                    <Typography variant="body2" sx={{ fontWeight: 600, color: 'text.secondary', mb: 1 }}>
                      Inscription cantine
                    </Typography>
                    <Chip 
                      label={viewingChild.cantine ? 'Oui' : 'Non'} 
                      color={viewingChild.cantine ? 'success' : 'warning'} 
                      size="small"
                    />
                  </Box>
                </Grid>
                
                {viewingChild.cantine && (
                  <Grid item xs={12} sm={6}>
                    <Box sx={{ p: 2, bgcolor: '#e8f5e8', borderRadius: 2 }}>
                      <Typography variant="body2" sx={{ fontWeight: 600, color: 'text.secondary', mb: 1 }}>
                        Mange à la cantine
                      </Typography>
                      <Chip 
                        label={viewingChild.eats_at_cantine ? 'Oui' : 'Non'} 
                        color={viewingChild.eats_at_cantine ? 'success' : 'default'} 
                        size="small"
                      />
                    </Box>
                  </Grid>
                )}
                
                {viewingChild.cantine && viewingChild.eats_at_cantine && viewingChild.allergy && (
                  <Grid item xs={12}>
                    <Box sx={{ p: 2, bgcolor: '#fff3e0', borderRadius: 2 }}>
                      <Typography variant="body2" sx={{ fontWeight: 600, color: 'text.secondary', mb: 1 }}>
                        Allergies alimentaires
                      </Typography>
                      <Typography variant="body1" sx={{ fontStyle: 'italic' }}>
                        {viewingChild.allergy}
                      </Typography>
                    </Box>
                  </Grid>
                )}

                {/* Informations de paiement */}
                <Grid item xs={12}>
                  <Typography variant="h6" sx={{ fontWeight: 600, color: theme.palette.primary.main, mt: 3, mb: 2, pb: 1, borderBottom: '2px solid', borderColor: 'primary.main' }}>
                    Informations de Paiement
                  </Typography>
                </Grid>
                
                <Grid item xs={12} sm={6}>
                  <Box sx={{ p: 2, bgcolor: viewingChild.amount_paid ? '#e8f5e8' : '#fff3e0', borderRadius: 2 }}>
                    <Typography variant="body2" sx={{ fontWeight: 600, color: 'text.secondary', mb: 1 }}>
                      Montant versé
                    </Typography>
                    <Typography variant="body1" sx={{ fontWeight: 600, color: viewingChild.amount_paid ? 'success.main' : 'text.secondary' }}>
                      {viewingChild.amount_paid ? `${Number(viewingChild.amount_paid).toLocaleString('fr-FR')} FCFA` : 'Non payé'}
                    </Typography>
                  </Box>
                </Grid>
                
                <Grid item xs={12} sm={6}>
                  <Box sx={{ p: 2, bgcolor: '#f8f9fa', borderRadius: 2 }}>
                    <Typography variant="body2" sx={{ fontWeight: 600, color: 'text.secondary', mb: 1 }}>
                      Période de validité
                    </Typography>
                    <Typography variant="body1" sx={{ fontWeight: 600 }}>
                      {viewingChild.payment_period || 'Non renseignée'}
                    </Typography>
                  </Box>
                </Grid>
                
                {viewingChild.unique_code && (
                  <Grid item xs={12}>
                    <Box sx={{ p: 2, bgcolor: '#e3f2fd', borderRadius: 2 }}>
                      <Typography variant="body2" sx={{ fontWeight: 600, color: 'text.secondary', mb: 1 }}>
                        Code unique
                      </Typography>
                      <Chip 
                        label={viewingChild.unique_code} 
                        color="primary" 
                        size="small"
                        variant="outlined"
                      />
                    </Box>
                  </Grid>
                )}

                {/* Informations des parents */}
                <Grid item xs={12}>
                  <Typography variant="h6" sx={{ fontWeight: 600, color: theme.palette.primary.main, mt: 3, mb: 2, pb: 1, borderBottom: '2px solid', borderColor: 'primary.main' }}>
                    Informations des parents
                  </Typography>
                </Grid>
                
                <Grid item xs={12} sm={6}>
                  <Box sx={{ p: 2, bgcolor: '#f8f9fa', borderRadius: 2 }}>
                    <Typography variant="body2" sx={{ fontWeight: 600, color: 'text.secondary', mb: 1 }}>
                      Nom complet
                    </Typography>
                    <Typography variant="body1" sx={{ fontWeight: 600 }}>
                      {viewingChild.parent_first_name} {viewingChild.parent_last_name}
                    </Typography>
                  </Box>
                </Grid>
                
                <Grid item xs={12} sm={6}>
                  <Box sx={{ p: 2, bgcolor: '#f8f9fa', borderRadius: 2 }}>
                    <Typography variant="body2" sx={{ fontWeight: 600, color: 'text.secondary', mb: 1 }}>
                      Téléphone
                    </Typography>
                    <Typography variant="body1" sx={{ fontWeight: 600 }}>
                      {viewingChild.parent_phone || 'Non renseigné'}
                    </Typography>
                  </Box>
                </Grid>
                
                <Grid item xs={12} sm={6}>
                  <Box sx={{ p: 2, bgcolor: '#f8f9fa', borderRadius: 2 }}>
                    <Typography variant="body2" sx={{ fontWeight: 600, color: 'text.secondary', mb: 1 }}>
                      Email
                    </Typography>
                    <Typography variant="body1" sx={{ fontWeight: 600 }}>
                      {viewingChild.parent_email || 'Non renseigné'}
                    </Typography>
                  </Box>
                </Grid>
                
                <Grid item xs={12} sm={6}>
                  <Box sx={{ p: 2, bgcolor: '#fff3e0', borderRadius: 2 }}>
                    <Typography variant="body2" sx={{ fontWeight: 600, color: 'text.secondary', mb: 1 }}>
                      Contact d'urgence
                    </Typography>
                    <Typography variant="body1" sx={{ fontWeight: 600 }}>
                      {viewingChild.emergency_contact || 'Non renseigné'}
                    </Typography>
                  </Box>
                </Grid>

                {/* Informations système */}
                <Grid item xs={12}>
                  <Typography variant="h6" sx={{ fontWeight: 600, color: theme.palette.primary.main, mt: 3, mb: 2, pb: 1, borderBottom: '2px solid', borderColor: 'primary.main' }}>
                    Informations système
                  </Typography>
                </Grid>
                
                <Grid item xs={12} sm={6}>
                  <Box sx={{ p: 2, bgcolor: '#f5f5f5', borderRadius: 2 }}>
                    <Typography variant="body2" sx={{ fontWeight: 600, color: 'text.secondary', mb: 1 }}>
                      ID de l'inscription
                    </Typography>
                    <Typography variant="body1" sx={{ fontFamily: 'monospace', fontSize: '0.9rem' }}>
                      {viewingChild.id}
                    </Typography>
                  </Box>
                </Grid>
                
                <Grid item xs={12} sm={6}>
                  <Box sx={{ p: 2, bgcolor: '#f5f5f5', borderRadius: 2 }}>
                    <Typography variant="body2" sx={{ fontWeight: 600, color: 'text.secondary', mb: 1 }}>
                      Date d'inscription
                    </Typography>
                    <Typography variant="body1" sx={{ fontWeight: 600 }}>
                      {viewingChild.created_at ? new Date(viewingChild.created_at).toLocaleDateString('fr-FR') : 'Non renseignée'}
                    </Typography>
                  </Box>
                </Grid>
              </Grid>
            </DialogContent>
            <DialogActions sx={{ p: 3, gap: 2 }}>
              <Button 
                onClick={() => {
                  setShowViewDetails(false);
                  setTimeout(() => {
                    setViewingChild(null);
                  }, 100);
                }}
                variant="outlined"
                sx={{ 
                  fontWeight: 600, 
                  px: 4, 
                  py: 1.5,
                  borderRadius: 2
                }}
              >
                Fermer
              </Button>
            </DialogActions>
          </Dialog>
        )}

        {/* Dialog de confirmation de suppression */}
        {showDeleteConfirm && deletingChild && (
          <Dialog
            open={showDeleteConfirm}
            onClose={() => {
              setShowDeleteConfirm(false);
              setDeletingChild(null);
            }}
            maxWidth="sm"
            fullWidth
          >
            <DialogTitle>
              <Typography variant="h6" sx={{ fontWeight: 700, color: 'error.main' }}>
                Confirmer la suppression
              </Typography>
            </DialogTitle>
            <DialogContent>
              <Typography variant="body1" sx={{ mt: 2 }}>
                Êtes-vous sûr de vouloir supprimer l'inscription de{' '}
                <strong>{deletingChild.child_first_name} {deletingChild.child_last_name}</strong> ?
              </Typography>
              <Typography variant="body2" sx={{ color: 'text.secondary', mt: 1 }}>
                Cette action est irréversible et supprimera définitivement toutes les données de l'enfant.
              </Typography>
            </DialogContent>
            <DialogActions sx={{ p: 3, gap: 2 }}>
              <Button 
                onClick={() => {
                  setShowDeleteConfirm(false);
                  setDeletingChild(null);
                }}
                variant="outlined"
              >
                Annuler
              </Button>
              <Button 
                onClick={confirmDelete}
                variant="contained" 
                color="error"
                sx={{ fontWeight: 600 }}
              >
                Supprimer définitivement
              </Button>
            </DialogActions>
          </Dialog>
        )}

        {/* Dialog pour le reçu */}
        {receiptData && (
          <Dialog
            open={showReceipt}
            onClose={handleCloseReceipt}
            maxWidth="md"
            fullWidth
          >
            <DialogTitle>
              <Typography variant="h5" sx={{ fontWeight: 700, color: theme.palette.success.main }}>
                {receiptData.isReinscription ? 'Reçu de réinscription - Garderie' : 'Reçu d\'inscription - Garderie'}
              </Typography>
            </DialogTitle>
            <DialogContent>
              <Box ref={receiptRef} sx={{ p: 2, bgcolor: 'white', borderRadius: 2 }}>
                {/* En-tête du reçu ultra-compact */}
                <Box sx={{ textAlign: 'center', mb: 2, pb: 1, borderBottom: '2px solid #1976d2' }}>
                  <Box sx={{ 
                    display: 'inline-flex', 
                    flexDirection: 'column', 
                    alignItems: 'center', 
                    mb: 1,
                    p: 1,
                    borderRadius: '50%',
                    bgcolor: '#1976d2',
                    color: 'white',
                    width: 60,
                    height: 60,
                    justifyContent: 'center',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
                  }}>
                    <SchoolIcon sx={{ fontSize: 30, mb: 0.5 }} />
                    <Typography variant="caption" sx={{ fontSize: '6px', textAlign: 'center', lineHeight: 1, fontWeight: 600 }}>
                      ÉCOLE
                    </Typography>
                  </Box>
                  <Typography variant="h5" sx={{ fontWeight: 700, color: '#1976d2', mb: 0.5, fontSize: '1.3rem', textShadow: '0 1px 2px rgba(0,0,0,0.1)' }}>
                    GROUPE SCOLAIRE SAINTE FAMILLE L'EXECELLENCE
                  </Typography>
                  <Typography variant="h6" sx={{ fontWeight: 600, color: '#1976d2', mb: 0.5, fontSize: '1rem' }}>
                    GROUPE SCOLAIRE SAINTE FAMILLE L'EXECELLENCE
                  </Typography>
                  <Typography variant="body2" sx={{ color: '#666', mb: 0.5, fontSize: '0.8rem' }}>
                    {receiptData.isReinscription ? 'Reçu de réinscription - Garderie' : 'Reçu d\'inscription - Garderie'}
                  </Typography>
                  <Typography variant="caption" sx={{ color: '#888', fontSize: '0.7rem' }}>
                    N° {receiptData.receiptNumber} | {receiptData.date} à {receiptData.time}
                  </Typography>
                  {receiptData.isReinscription && (
                    <Typography variant="caption" sx={{ color: '#1976d2', fontWeight: 600, mt: 0.5, fontSize: '0.8rem' }}>
                      Réinscription de : {receiptData.originalChildName}
                    </Typography>
                  )}
                </Box>

                {/* Informations ultra-compactes en 2 colonnes */}
                <Grid container spacing={1}>
                  {/* Colonne gauche - Informations de l'enfant */}
                  <Grid item xs={12} md={6}>
                    <Box sx={{ mb: 1 }}>
                      <Typography variant="body2" sx={{ fontWeight: 600, color: '#1976d2', mb: 0.5, fontSize: '0.9rem' }}>
                        Informations de l'enfant
                      </Typography>
                      <Box sx={{ pl: 0.5 }}>
                        <Box sx={{ display: 'flex', mb: 0.3 }}>
                          <Typography variant="caption" sx={{ fontWeight: 600, width: '100px', fontSize: '0.7rem' }}>Nom :</Typography>
                          <Typography variant="caption" sx={{ fontSize: '0.7rem' }}>{receiptData.firstName || ''} {receiptData.lastName || ''}</Typography>
                        </Box>
                        <Box sx={{ display: 'flex', mb: 0.3 }}>
                          <Typography variant="caption" sx={{ fontWeight: 600, width: '100px', fontSize: '0.7rem' }}>Civilité :</Typography>
                          <Typography variant="caption" sx={{ fontSize: '0.7rem' }}>{receiptData.civility || 'N/A'}</Typography>
                        </Box>
                        <Box sx={{ display: 'flex', mb: 0.3 }}>
                          <Typography variant="caption" sx={{ fontWeight: 600, width: '100px', fontSize: '0.7rem' }}>Naissance :</Typography>
                          <Typography variant="caption" sx={{ fontSize: '0.7rem' }}>
                            {receiptData.dateOfBirth ? (() => {
                              try {
                                // Si c'est déjà au format YYYY-MM-DD, le formater directement
                                if (/^\d{4}-\d{2}-\d{2}$/.test(receiptData.dateOfBirth)) {
                                  const [year, month, day] = receiptData.dateOfBirth.split('-');
                                  return `${day}/${month}/${year}`;
                                }
                                // Si c'est une date ISO avec timezone, extraire seulement la partie date
                                if (receiptData.dateOfBirth.includes('T')) {
                                  const datePart = receiptData.dateOfBirth.split('T')[0];
                                  if (/^\d{4}-\d{2}-\d{2}$/.test(datePart)) {
                                    const [year, month, day] = datePart.split('-');
                                    return `${day}/${month}/${year}`;
                                  }
                                }
                                // Sinon, utiliser les méthodes locales
                                const date = new Date(receiptData.dateOfBirth);
                                if (isNaN(date.getTime())) return 'N/A';
                                const day = String(date.getDate()).padStart(2, '0');
                                const month = String(date.getMonth() + 1).padStart(2, '0');
                                const year = date.getFullYear();
                                return `${day}/${month}/${year}`;
                              } catch (error) {
                                return 'N/A';
                              }
                            })() : 'N/A'}
                          </Typography>
                        </Box>
                        <Box sx={{ display: 'flex', mb: 0.3 }}>
                          <Typography variant="caption" sx={{ fontWeight: 600, width: '100px', fontSize: '0.7rem' }}>Âge :</Typography>
                          <Typography variant="caption" sx={{ fontSize: '0.7rem' }}>{receiptData.childAge || 0} an(s)</Typography>
                        </Box>
                      </Box>
                    </Box>
                  </Grid>

                  {/* Colonne droite - Informations des parents */}
                  <Grid item xs={12} md={6}>
                    <Box sx={{ mb: 1 }}>
                      <Typography variant="body2" sx={{ fontWeight: 600, color: '#1976d2', mb: 0.5, fontSize: '0.9rem' }}>
                        Informations des parents
                      </Typography>
                      <Box sx={{ pl: 0.5 }}>
                        <Box sx={{ display: 'flex', mb: 0.3 }}>
                          <Typography variant="caption" sx={{ fontWeight: 600, width: '100px', fontSize: '0.7rem' }}>Nom :</Typography>
                          <Typography variant="caption" sx={{ fontSize: '0.7rem' }}>{receiptData.parentFirstName || ''} {receiptData.parentLastName || ''}</Typography>
                        </Box>
                        <Box sx={{ display: 'flex', mb: 0.3 }}>
                          <Typography variant="caption" sx={{ fontWeight: 600, width: '100px', fontSize: '0.7rem' }}>Téléphone :</Typography>
                          <Typography variant="caption" sx={{ fontSize: '0.7rem' }}>{receiptData.parentPhone || 'N/A'}</Typography>
                        </Box>
                        <Box sx={{ display: 'flex', mb: 0.3 }}>
                          <Typography variant="caption" sx={{ fontWeight: 600, width: '100px', fontSize: '0.7rem' }}>Email :</Typography>
                          <Typography variant="caption" sx={{ fontSize: '0.7rem' }}>{receiptData.parentEmail || 'N/A'}</Typography>
                        </Box>
                        <Box sx={{ display: 'flex', mb: 0.3 }}>
                          <Typography variant="caption" sx={{ fontWeight: 600, width: '100px', fontSize: '0.7rem' }}>Urgence :</Typography>
                          <Typography variant="caption" sx={{ fontSize: '0.7rem' }}>{receiptData.emergencyContact || 'N/A'}</Typography>
                        </Box>
                      </Box>
                    </Box>
                  </Grid>
                </Grid>

                {/* Informations de garderie ultra-compactes */}
                <Box sx={{ mb: 1 }}>
                  <Typography variant="body2" sx={{ fontWeight: 600, color: '#1976d2', mb: 0.5, fontSize: '0.9rem' }}>
                    Informations de garderie
                  </Typography>
                  <Grid container spacing={1}>
                    <Grid item xs={6} md={3}>
                      <Box sx={{ display: 'flex', mb: 0.3 }}>
                        <Typography variant="caption" sx={{ fontWeight: 600, width: '80px', fontSize: '0.7rem' }}>Début :</Typography>
                        <Typography variant="caption" sx={{ fontSize: '0.7rem' }}>
                          {receiptData.startDate ? new Date(receiptData.startDate).toLocaleDateString('fr-FR') : 'N/A'}
                        </Typography>
                      </Box>
                    </Grid>
                    <Grid item xs={6} md={3}>
                      <Box sx={{ display: 'flex', mb: 0.3 }}>
                        <Typography variant="caption" sx={{ fontWeight: 600, width: '80px', fontSize: '0.7rem' }}>Fin :</Typography>
                        <Typography variant="caption" sx={{ fontSize: '0.7rem' }}>
                          {receiptData.endDate ? new Date(receiptData.endDate).toLocaleDateString('fr-FR') : 'N/A'}
                        </Typography>
                      </Box>
                    </Grid>
                    <Grid item xs={6} md={3}>
                      <Box sx={{ display: 'flex', mb: 0.3 }}>
                        <Typography variant="caption" sx={{ fontWeight: 600, width: '80px', fontSize: '0.7rem' }}>Cantine :</Typography>
                        <Typography variant="caption" sx={{ fontSize: '0.7rem' }}>{receiptData.cantine ? 'Oui' : 'Non'}</Typography>
                      </Box>
                    </Grid>

                  </Grid>
                </Box>

                {/* Informations de paiement ultra-compactes */}
                {receiptData.amountPaid && receiptData.amountPaid > 0 && (
                  <Box sx={{ mb: 1, p: 0.5, bgcolor: '#f8f9fa', borderRadius: 1 }}>
                    <Typography variant="body2" sx={{ fontWeight: 600, color: '#1976d2', mb: 0.5, fontSize: '0.9rem' }}>
                      Informations de paiement
                    </Typography>
                    <Grid container spacing={1}>
                      <Grid item xs={6}>
                        <Box sx={{ display: 'flex', mb: 0.3 }}>
                          <Typography variant="caption" sx={{ fontWeight: 600, width: '100px', fontSize: '0.7rem' }}>Montant :</Typography>
                          <Typography variant="caption" sx={{ color: 'success.main', fontWeight: 600, fontSize: '0.7rem' }}>
                            {Number(receiptData.amountPaid).toLocaleString('fr-FR')} FCFA
                          </Typography>
                        </Box>
                      </Grid>
                      {receiptData.uniqueCode && (
                        <Grid item xs={6}>
                          <Box sx={{ display: 'flex', mb: 0.3 }}>
                            <Typography variant="caption" sx={{ fontWeight: 600, width: '100px', fontSize: '0.7rem' }}>Code :</Typography>
                            <Typography variant="caption" sx={{ color: 'primary.main', fontWeight: 600, fontSize: '0.7rem' }}>
                              {receiptData.uniqueCode}
                            </Typography>
                          </Box>
                        </Grid>
                      )}
                    </Grid>
                  </Box>
                )}

                {/* Signature ultra-compacte */}
                <Box sx={{ mt: 1, pt: 0.5, borderTop: '1px solid #ddd', textAlign: 'center' }}>
                  <Typography variant="caption" sx={{ color: '#666', mb: 0.5, fontSize: '0.7rem' }}>
                    Ce reçu confirme l'inscription de l'enfant à la garderie
                  </Typography>
                  <Typography variant="caption" sx={{ color: '#888', fontSize: '0.6rem' }}>
                    Généré le {receiptData.date} à {receiptData.time}
                  </Typography>
                </Box>
              </Box>
            </DialogContent>
            <DialogActions sx={{ p: 3, gap: 2 }}>
              <Button 
                onClick={handleDownloadReceipt} 
                variant="contained" 
                color="primary"
                startIcon={<DownloadIcon />}
                sx={{ 
                  fontWeight: 600, 
                  px: 4, 
                  py: 1.5,
                  borderRadius: 2,
                  boxShadow: 2
                }}
              >
                Télécharger PDF
              </Button>
              <Button 
                onClick={handlePrintReceipt} 
                variant="outlined"
                color="secondary"
                startIcon={<PrintIcon />}
                sx={{ 
                  fontWeight: 600, 
                  px: 4, 
                  py: 1.5,
                  borderRadius: 2
                }}
              >
                Imprimer
              </Button>
              <Button 
                onClick={handleCloseReceipt} 
                variant="outlined"
                sx={{ 
                  fontWeight: 600, 
                  px: 4, 
                  py: 1.5,
                  borderRadius: 2
                }}
              >
                Fermer
              </Button>
            </DialogActions>
          </Dialog>
        )}

        {/* Dialog pour le paiement */}
        <Dialog
          open={showPaymentDialog}
          onClose={() => setShowPaymentDialog(false)}
          maxWidth="sm"
          fullWidth
        >
          <DialogTitle>
            <Typography variant="h5" sx={{ fontWeight: 700, color: 'success.main' }}>
              Paiement de scolarité
            </Typography>
            {selectedChildForPayment && (
              <Typography variant="body2" sx={{ color: 'text.secondary', mt: 1 }}>
                {selectedChildForPayment.child_first_name} {selectedChildForPayment.child_last_name}
              </Typography>
            )}
          </DialogTitle>
          <DialogContent>
            <Grid container spacing={3} sx={{ mt: 1 }}>
              <Grid item xs={12}>
                <Typography variant="body2" sx={{ fontWeight: 600, color: 'text.secondary', mb: 2 }}>
                  Informations de paiement
                </Typography>
              </Grid>
              
              {selectedChildForPayment && (
                <>
                  <Grid item xs={12} sm={6}>
                    <Box sx={{ p: 2, bgcolor: '#f8f9fa', borderRadius: 2 }}>
                      <Typography variant="body2" sx={{ fontWeight: 600, color: 'text.secondary', mb: 1 }}>
                        Montant total
                      </Typography>
                      <Typography variant="body1" sx={{ fontWeight: 600, color: 'warning.main' }}>
                        {selectedChildForPayment.total_schooling_amount.toLocaleString()} FCFA
                      </Typography>
                    </Box>
                  </Grid>
                  
                  <Grid item xs={12} sm={6}>
                    <Box sx={{ p: 2, bgcolor: '#e8f5e8', borderRadius: 2 }}>
                      <Typography variant="body2" sx={{ fontWeight: 600, color: 'text.secondary', mb: 1 }}>
                        Déjà payé
                      </Typography>
                      <Typography variant="body1" sx={{ fontWeight: 600, color: 'success.main' }}>
                        {selectedChildForPayment.total_paid_amount.toLocaleString()} FCFA
                      </Typography>
                    </Box>
                  </Grid>
                  
                  <Grid item xs={12}>
                    <Box sx={{ p: 2, bgcolor: '#fff3e0', borderRadius: 2 }}>
                      <Typography variant="body2" sx={{ fontWeight: 600, color: 'text.secondary', mb: 1 }}>
                        Solde restant
                      </Typography>
                      <Typography variant="body1" sx={{ fontWeight: 600, color: 'info.main' }}>
                        {Math.max(0, selectedChildForPayment.total_schooling_amount - selectedChildForPayment.total_paid_amount).toLocaleString()} FCFA
                      </Typography>
                    </Box>
                  </Grid>
                </>
              )}
              
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Montant à payer (FCFA)"
                  type="number"
                  inputProps={{ min: 0 }}
                  value={paymentAmount || ''}
                  onChange={(e) => {
                    const value = Number(e.target.value) || 0;
                    if (value >= 0) {
                      setPaymentAmount(value);
                    }
                  }}
                  helperText="Montant du paiement"
                />
              </Grid>
              
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth>
                  <InputLabel>Méthode de paiement</InputLabel>
                  <Select
                    value={paymentMethod}
                    label="Méthode de paiement"
                    onChange={(e) => setPaymentMethod(e.target.value)}
                  >
                    <MenuItem value="Espèces">Espèces</MenuItem>
                    <MenuItem value="Chèque">Chèque</MenuItem>
                    <MenuItem value="Virement">Virement</MenuItem>
                    <MenuItem value="Mobile Money">Mobile Money</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions sx={{ p: 3, gap: 2 }}>
            <Button 
              onClick={() => setShowPaymentDialog(false)}
              variant="outlined"
            >
              Annuler
            </Button>
            <Button 
              onClick={handleMakePayment}
              variant="contained" 
              color="success"
              disabled={!paymentAmount || paymentAmount <= 0}
              sx={{ fontWeight: 600 }}
            >
              Effectuer le paiement
            </Button>
          </DialogActions>
        </Dialog>

        {/* Snackbar pour les notifications */}
        <Snackbar
          open={snackbar.open}
          autoHideDuration={6000}
          onClose={() => setSnackbar({ ...snackbar, open: false })}
        >
          <Alert
            onClose={() => setSnackbar({ ...snackbar, open: false })}
            severity={snackbar.severity}
            sx={{ width: '100%' }}
          >
            {snackbar.message}
          </Alert>
        </Snackbar>

        {/* Tableau des enfants inscrits */}
        <Box sx={{ mt: 4 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
            <Typography variant="h5" sx={{ fontWeight: 700, color: theme.palette.primary.main }}>
              Liste des enfants inscrits à la garderie - Année scolaire {selectedSchoolYear}
            </Typography>
            <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
              <TextField
                size="small"
                placeholder="Rechercher par nom..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                sx={{ minWidth: 250 }}
                InputProps={{
                  startAdornment: <SearchIcon sx={{ mr: 1, color: 'text.secondary' }} />,
                }}
              />
              <Button
                variant="contained"
                color="secondary"
                startIcon={<PrintIcon />}
                onClick={handlePrintChildrenList}
                sx={{ fontWeight: 600 }}
              >
                Imprimer la liste
              </Button>
            </Box>
          </Box>
          
          <TableContainer component={Paper} sx={{ boxShadow: 3, borderRadius: 2 }}>
            <Table>
              <TableHead>
                <TableRow sx={{ backgroundColor: theme.palette.primary.main }}>
                  <TableCell sx={{ color: 'white', fontWeight: 600 }}>Enfant</TableCell>
                  <TableCell sx={{ color: 'white', fontWeight: 600 }}>Âge</TableCell>
                  <TableCell sx={{ color: 'white', fontWeight: 600 }}>Parents</TableCell>
                  <TableCell sx={{ color: 'white', fontWeight: 600 }}>Période</TableCell>
                  <TableCell sx={{ color: 'white', fontWeight: 600 }}>Cantine</TableCell>
                  <TableCell sx={{ color: 'white', fontWeight: 600 }}>Scolarité</TableCell>
                  <TableCell sx={{ color: 'white', fontWeight: 600 }}>Statut</TableCell>
                  <TableCell sx={{ color: 'white', fontWeight: 600 }}>Code</TableCell>
                  <TableCell sx={{ color: 'white', fontWeight: 600 }}>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={8} sx={{ textAlign: 'center', py: 4 }}>
                      <Typography variant="body1" sx={{ color: 'text.secondary' }}>
                        Chargement en cours...
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : filteredChildren.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} sx={{ textAlign: 'center', py: 4 }}>
                      <Typography variant="body1" sx={{ color: 'text.secondary' }}>
                        {searchTerm ? 'Aucun enfant trouvé pour cette recherche' : 'Aucun enfant inscrit pour le moment'}
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredChildren.map((child, index) => (
                    <TableRow key={child.id || index} sx={{ '&:hover': { backgroundColor: 'rgba(25, 118, 210, 0.04)' } }}>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                          {(() => {
                            console.log(`🔍 Enfant: ${child.child_first_name} ${child.child_last_name}`);
                            console.log(`📸 Photo: ${child.child_photo}`);
                            console.log(`🔗 URL: ${child.child_photo ? `https://saintefamilleexcellence.ci/api/garderie/photo/${child.child_photo}` : 'Aucune photo'}`);
                            
                            return child.child_photo && !photoError[child.id] ? (
                              <img
                                src={`https://saintefamilleexcellence.ci/api/garderie/photo/${child.child_photo}`}
                                alt={`${child.child_first_name} ${child.child_last_name}`}
                                style={{
                                  width: '50px',
                                  height: '50px',
                                  borderRadius: '50%',
                                  objectFit: 'cover',
                                  border: '2px solid #e0e0e0'
                                }}
                                onError={(e) => {
                                  console.error(`❌ Erreur de chargement de l'image pour ${child.child_first_name}`);
                                  console.error(`📸 Nom du fichier: ${child.child_photo}`);
                                  console.error(`🔗 URL complète: https://saintefamilleexcellence.ci/api/garderie/photo/${child.child_photo}`);
                                  console.error(`📊 Événement d'erreur:`, e);
                                  setPhotoError(prev => ({ ...prev, [child.id]: true }));
                                }}
                                onLoad={() => {
                                  console.log(`✅ Image chargée avec succès pour ${child.child_first_name}`);
                                }}
                              />
                            ) : (
                              <Box
                                sx={{
                                  width: '50px',
                                  height: '50px',
                                  borderRadius: '50%',
                                  bgcolor: '#f0f0f0',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  border: '2px solid #e0e0e0'
                                }}
                              >
                                <ChildCareIcon sx={{ fontSize: 24, color: '#999' }} />
                              </Box>
                            );
                          })()}
                          <Box>
                            <Typography variant="body1" sx={{ fontWeight: 600 }}>
                              {child.child_first_name} {child.child_last_name}
                            </Typography>
                            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                              {child.civility}
                            </Typography>
                          </Box>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Chip 
                          label={`${child.child_age || 0} an(s)`} 
                          color="primary" 
                          size="small" 
                          variant="outlined"
                        />
                      </TableCell>
                      <TableCell>
                        <Box>
                          <Typography variant="body2" sx={{ fontWeight: 600 }}>
                            {child.parent_first_name} {child.parent_last_name}
                          </Typography>
                          <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                            {child.parent_phone}
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Box>
                          <Typography variant="body2">
                            Du {child.start_date ? new Date(child.start_date).toLocaleDateString('fr-FR') : 'N/A'}
                          </Typography>
                          <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                            Au {child.end_date ? new Date(child.end_date).toLocaleDateString('fr-FR') : 'N/A'}
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Chip 
                          label={child.cantine ? 'Oui' : 'Non'} 
                          color={child.cantine ? 'success' : 'default'} 
                          size="small"
                        />
                        {child.cantine && child.eats_at_cantine && (
                          <Typography variant="caption" display="block" sx={{ color: 'text.secondary', mt: 0.5 }}>
                            Mange à la cantine
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell>
                        <Box>
                          <Typography variant="body2" sx={{ fontWeight: 600, color: 'warning.main' }}>
                            {child.total_schooling_amount ? `${child.total_schooling_amount.toLocaleString()} FCFA` : 'Non défini'}
                          </Typography>
                          {child.total_schooling_amount && child.total_paid_amount !== undefined && (
                            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                              Versé: {child.total_paid_amount.toLocaleString()} FCFA
                            </Typography>
                          )}
                          {child.total_schooling_amount && child.total_paid_amount !== undefined && (
                            <Typography variant="caption" display="block" sx={{ color: 'info.main', fontWeight: 600 }}>
                              Solde: {Math.max(0, child.total_schooling_amount - child.total_paid_amount).toLocaleString()} FCFA
                            </Typography>
                          )}
                        </Box>
                      </TableCell>
                      <TableCell>
                        {child.total_schooling_amount && child.total_paid_amount !== undefined ? (
                          (child.total_schooling_amount - child.total_paid_amount) <= 0 ? (
                            <Chip 
                              label="Soldé" 
                              color="success" 
                              size="small"
                              sx={{ fontWeight: 600 }}
                            />
                          ) : (
                            <Chip 
                              label="Non soldé" 
                              color="warning" 
                              size="small"
                              sx={{ fontWeight: 600 }}
                            />
                          )
                        ) : (
                          <Chip 
                            label="Non défini" 
                            color="default" 
                            size="small"
                            sx={{ fontWeight: 600 }}
                          />
                        )}
                      </TableCell>
                      <TableCell>
                        {child.unique_code ? (
                          <Chip 
                            label={child.unique_code} 
                            color="primary" 
                            size="small"
                            variant="outlined"
                          />
                        ) : (
                          <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                            -
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', gap: 1 }}>
                          <Tooltip title="Voir les détails">
                            <IconButton 
                              size="small" 
                              color="primary"
                              onClick={() => handleViewChildDetails(child)}
                            >
                              <ViewIcon />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Historique des reçus">
                            <IconButton 
                              size="small" 
                              color="info"
                              onClick={() => handleReceiptHistoryOpen(child)}
                            >
                              <HistoryIcon />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Modifier">
                            <IconButton 
                              size="small" 
                              color="secondary"
                              onClick={() => handleEditChild(child)}
                            >
                              <EditIcon />
                            </IconButton>
                          </Tooltip>
                          {child.total_schooling_amount && child.total_paid_amount !== undefined && 
                           (child.total_schooling_amount - child.total_paid_amount) > 0 && userRole !== 'secretary' && userRole !== 'directrice' && (
                            <Tooltip title="Effectuer un paiement">
                              <IconButton 
                                size="small" 
                                color="success"
                                onClick={() => handlePaymentClick(child)}
                              >
                                <PaymentIcon />
                              </IconButton>
                            </Tooltip>
                          )}
                          {userRole === 'admin' && (
                            <Tooltip title="Supprimer (Admin uniquement)">
                              <IconButton 
                                size="small" 
                                color="error"
                                onClick={() => handleDeleteChild(child)}
                              >
                                <DeleteIcon />
                              </IconButton>
                            </Tooltip>
                          )}
                        </Box>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Box>
      </Box>

      {/* Modal Historique des reçus */}
      <Dialog 
        open={receiptHistoryOpen} 
        onClose={handleReceiptHistoryClose}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          Historique des reçus - {selectedChildForHistory?.child_first_name} {selectedChildForHistory?.child_last_name}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ mb: 2 }}>
            <Grid container spacing={2} alignItems="center">
              <Grid item xs={12} sm={6}>
                <TextField
                  label="Rechercher"
                  value={receiptHistorySearch}
                  onChange={(e) => setReceiptHistorySearch(e.target.value)}
                  fullWidth
                  size="small"
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth size="small">
                  <InputLabel>Filtrer par type</InputLabel>
                  <Select
                    value={receiptHistoryFilter}
                    onChange={(e) => setReceiptHistoryFilter(e.target.value)}
                    label="Filtrer par type"
                  >
                    <MenuItem value="all">Tous</MenuItem>
                    <MenuItem value="inscription">Inscriptions</MenuItem>
                    <MenuItem value="paiement">Paiements</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
            </Grid>
          </Box>

          {receiptHistoryLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
              <Typography>Chargement...</Typography>
            </Box>
          ) : filteredReceiptHistory.length === 0 ? (
            <Box sx={{ textAlign: 'center', p: 3 }}>
              <Typography color="text.secondary">
                Aucun reçu trouvé
              </Typography>
            </Box>
          ) : (
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Type</TableCell>
                    <TableCell>Date</TableCell>
                    <TableCell>Description</TableCell>
                    <TableCell>Montant</TableCell>
                    <TableCell>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredReceiptHistory.map((receipt, index) => (
                    <TableRow key={index}>
                      <TableCell>
                        <Chip
                          label={getReceiptTypeLabel(receipt.type)}
                          color={getReceiptTypeColor(receipt.type) as any}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>
                        {new Date(receipt.date).toLocaleDateString('fr-FR')}
                      </TableCell>
                      <TableCell>
                        {receipt.description}
                      </TableCell>
                      <TableCell>
                        {receipt.amount ? `${Number(receipt.amount).toLocaleString('fr-FR')} F CFA` : '-'}
                      </TableCell>
                      <TableCell>
                        <IconButton
                          size="small"
                          color="primary"
                          onClick={() => handlePrintReceiptFromHistory(receipt)}
                        >
                          <PrintIcon />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleReceiptHistoryClose}>
            Fermer
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Garderie; 

