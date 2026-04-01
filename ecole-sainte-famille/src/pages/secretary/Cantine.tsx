import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import {
    Typography,
    Box,
    Button,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Paper,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    TextField,
    Chip,
    IconButton,
    Alert,
    Snackbar,
    Grid,
    Card,
    CardContent,
    Avatar,
    CircularProgress,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    SelectChangeEvent,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import {
    Restaurant as RestaurantIcon,
    Payment as PaymentIcon,
    CheckCircle as CheckCircleIcon,
    Schedule as ScheduleIcon,
    People as PeopleIcon,
    Receipt as ReceiptIcon,
    Print as PrintIcon,
    Visibility as ViewIcon,
    History as HistoryIcon,
} from '@mui/icons-material';
import SecretarySidebar from '../../components/SecretarySidebar';

// Fonction pour obtenir l'année scolaire courante
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

interface Student {
    id: number;
    first_name: string;
    last_name: string;
    registration_number: string;
    student_code: string;
    cantine: boolean;
    cantine_amount?: number;
    cantine_paid?: number; // Changé de boolean à number pour correspondre au backend
    cantine_payment_date?: string;
    cantine_month?: number; // Changé de cantine_trimester à cantine_month
    cantine_year?: number; // Ajout de cantine_year
    total_paid_amount?: number;
    base_amount?: number; // Montant de base avant réduction
    reduction_amount?: number; // Montant de la réduction
    class_name?: string;
    level?: string; // Niveau de la classe (Garderie, Maternelle, etc.)
    parent_first_name?: string;
    parent_last_name?: string;
    parent_phone?: string;
    child_photo?: string;
    gender?: string; // Genre de l'élève
    eats_at_cantine?: boolean | number; // Ajout de l'état de mange à la cantine
    allergy?: string; // Ajout de l'allergie
    source_type?: string; // Type de source (student, garderie)
    duration_days?: number; // Nombre de jours de présence (pour garderie)
    daily_cantine_rate?: number; // Taux journalier de cantine (pour garderie)
}

interface CantinePayment {
    id: number;
    student_id: number;
    amount: number;
    payment_date: string;
    payment_method: string;
    receipt_number: string;
    notes?: string;
}

const Cantine: React.FC = () => {
    const theme = useTheme();
    const [students, setStudents] = useState<Student[]>([]);
    const [loading, setLoading] = useState(false);
    const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' as 'success' | 'error' | 'warning' });
    const [schoolYear, setSchoolYear] = useState(getCurrentSchoolYear());
    const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
    // Nouveaux états temporaires pour les filtres
    const [pendingSchoolYear, setPendingSchoolYear] = useState(schoolYear);
    const [pendingMonth, setPendingMonth] = useState(selectedMonth);
    const [pendingYear, setPendingYear] = useState(selectedYear);
    const [availableYears] = useState<string[]>(['2023-2024', '2024-2025', '2025-2026']);
    const [searchTerm, setSearchTerm] = useState('');
    // Ajout du filtre mange à la cantine
    const [eatsAtCantineFilter, setEatsAtCantineFilter] = useState('all'); // 'all', 'yes', 'no'
    // Ajout du filtre par genre
    const [genreFilter, setGenreFilter] = useState('Tous');
    const genreOptions = ['Tous', 'Masculin', 'Féminin'];
    
    // États pour l'historique des reçus
    const [receiptHistoryOpen, setReceiptHistoryOpen] = useState(false);
    const [receiptHistory, setReceiptHistory] = useState<any[]>([]);
    const [receiptHistoryLoading, setReceiptHistoryLoading] = useState(false);
    const [selectedStudentForHistory, setSelectedStudentForHistory] = useState<Student | null>(null);
    const [receiptHistorySearch, setReceiptHistorySearch] = useState('');
    const [receiptHistoryFilter, setReceiptHistoryFilter] = useState('all');
    
    // Ajout du filtre par type d'élève
    const [studentTypeFilter, setStudentTypeFilter] = useState('Tous');
    const studentTypeOptions = ['Tous', 'Élèves de la maternelle', 'Garderie'];
    
    // Fonction pour convertir le genre de la base de données vers l'affichage
    const getGenderDisplay = (gender: string | undefined) => {
        if (!gender) return 'Non renseigné';
        return gender === 'M' ? 'Masculin' : gender === 'F' ? 'Féminin' : gender;
    };

    // Fonction pour récupérer le rôle utilisateur depuis le token JWT

    // État pour le rôle utilisateur
    const [userRole, setUserRole] = useState<string>('');

    // États pour le paiement
    const [openPaymentDialog, setOpenPaymentDialog] = useState(false);
    const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
    const [trancheInfo, setTrancheInfo] = useState<any>(null);
    const [paymentForm, setPaymentForm] = useState({
        amount: '',
        payment_method: 'Espèces',
        month_number: '',
        year: '',
        notes: '',
        reduction: ''
    });

    // États pour le reçu
    const [showReceipt, setShowReceipt] = useState(false);
    const [receiptData, setReceiptData] = useState<any>(null);
    const [receiptLoading, setReceiptLoading] = useState(false);

    // États pour les détails de l'élève
    const [showStudentDetails, setShowStudentDetails] = useState(false);
    const [selectedStudentForDetails, setSelectedStudentForDetails] = useState<Student | null>(null);
    const [garderiePaymentCount, setGarderiePaymentCount] = useState<number>(0);
    const [garderiePayments, setGarderiePayments] = useState<CantinePayment[]>([]);

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

    // Charger les élèves inscrits à la cantine
    const loadCantineStudents = async () => {
        try {
            setLoading(true);
            const token = localStorage.getItem('token');
            const headers = token ? { Authorization: `Bearer ${token}` } : {};

            console.log('=== [DEBUG] Chargement des élèves de cantine pour année:', schoolYear, 'mois:', selectedMonth, 'année:', selectedYear);
            const response = await axios.get(`https://saintefamilleexcellence.ci/api/cantine/students?school_year=${schoolYear}&month_number=${selectedMonth}&year=${selectedYear}`, { headers });
            console.log('=== [DEBUG] Réponse API cantine:', response.data);
            console.log('=== [DEBUG] Nombre d\'élèves reçus:', response.data.length);
            
            // Debug des données de genre
            if (response.data.length > 0) {
                console.log('=== [DEBUG] Premier élève avec gender:', {
                    name: response.data[0].first_name + ' ' + response.data[0].last_name,
                    gender: response.data[0].gender,
                    displayGender: getGenderDisplay(response.data[0].gender)
                });
            }
            
            const studentsData = Array.isArray(response.data) ? response.data : [];
            console.log('=== [DEBUG] Données des élèves après formatage:', studentsData.length, 'élèves');
            if (studentsData.length > 0) {
                console.log('=== [DEBUG] Exemple d\'élève:', {
                    name: studentsData[0].first_name + ' ' + studentsData[0].last_name,
                    gender: studentsData[0].gender,
                    class_name: studentsData[0].class_name,
                    level: studentsData[0].level
                });
            }
            setStudents(studentsData);
        } catch (error) {
            console.error('Erreur lors du chargement des élèves:', error);
            setSnackbar({ open: true, message: 'Erreur lors du chargement des élèves', severity: 'error' });
        } finally {
            setLoading(false);
        }
    };

    // Initialiser le rôle utilisateur
    useEffect(() => {
        const role = getUserRole();
        setUserRole(role);
        console.log('=== [DEBUG] Rôle utilisateur détecté:', role);
    }, []);

    // Remplace le useEffect pour ne charger que sur changement effectif
    useEffect(() => {
        let isMounted = true;
        
        const loadData = async () => {
            if (!isMounted) return;
            await loadCantineStudents();
        };
        
        loadData();
        
        return () => {
            isMounted = false;
        };
    }, [schoolYear, selectedMonth, selectedYear]);

    // Fonction pour calculer le montant mensuel de cantine
    const calculateMonthlyCantineAmount = () => {
        // Montant fixe de 15,000 FCFA par mois pour tous les élèves
        return 15000;
    };

    // Fonction pour obtenir les mois de l'année scolaire
    const getSchoolYearMonths = (schoolYear: string) => {
        const year = schoolYear.split('-')[0]; // Récupérer la première année
        return [
            { month: 'Septembre', monthNumber: 9, year: parseInt(year) },
            { month: 'Octobre', monthNumber: 10, year: parseInt(year) },
            { month: 'Novembre', monthNumber: 11, year: parseInt(year) },
            { month: 'Décembre', monthNumber: 12, year: parseInt(year) },
            { month: 'Janvier', monthNumber: 1, year: parseInt(year) + 1 },
            { month: 'Février', monthNumber: 2, year: parseInt(year) + 1 },
            { month: 'Mars', monthNumber: 3, year: parseInt(year) + 1 },
            { month: 'Avril', monthNumber: 4, year: parseInt(year) + 1 },
            { month: 'Mai', monthNumber: 5, year: parseInt(year) + 1 },
            { month: 'Juin', monthNumber: 6, year: parseInt(year) + 1 },
            { month: 'Juillet', monthNumber: 7, year: parseInt(year) + 1 },
            { month: 'Août', monthNumber: 8, year: parseInt(year) + 1 }
        ];
    };

    // Fonction pour calculer le montant de cantine basé sur les dates de début et fin pour les élèves de garderie
    const calculateGarderieAmount = (student: Student) => {
        if (student.source_type !== 'garderie') return 0;
        
        // Pour les enfants de garderie, calculer un montant suggéré basé sur le taux journalier
        const dailyRate = student.daily_cantine_rate || 25000; // Valeur par défaut si non définie
        
        // Suggérer un paiement équivalent à 1 semaine (7 jours)
        return dailyRate * 7;
    };

    // Calculer les statistiques selon le mois sélectionné
    const calculateStats = () => {
        const totalStudents = students.length;
        
        // Séparer les élèves de garderie et les élèves normaux
        const garderieStudents = students.filter(s => s.source_type === 'garderie');
        const normalStudents = students.filter(s => s.source_type !== 'garderie');
        
        // Calculer les statistiques selon le mois
        let fullyPaidStudents = 0;
        let unpaidStudents = 0;
        let totalExpectedAmount = 0;
        let totalPaidAmount = 0;

        students.forEach(student => {
            const expectedAmount = calculateMonthlyCantineAmount();
            totalExpectedAmount += expectedAmount;

            // Vérifier si ce mois spécifique a été payé pour cet élève
            const hasPaidThisMonth = student.cantine_paid === 1;
            const paidAmountForThisMonth = hasPaidThisMonth ? (Number(student.total_paid_amount) || 0) : 0;
            
            if (hasPaidThisMonth && paidAmountForThisMonth > 0) {
                fullyPaidStudents++;
                totalPaidAmount += paidAmountForThisMonth;
            } else {
                unpaidStudents++;
            }
        });

        return {
            totalStudents,
            fullyPaidStudents,
            partiallyPaidStudents: 0, // Pas de paiement partiel en système mensuel
            unpaidStudents,
            totalAmount: totalExpectedAmount,
            totalPaidAmount,
            garderieStudents: garderieStudents.length,
            normalStudents: normalStudents.length
        };
    };

    const stats = calculateStats();

    // Récupérer les informations de tranche pour un élève
    const loadTrancheInfo = async (studentId: number) => {
        try {
            const token = localStorage.getItem('token');
            const headers = token ? { Authorization: `Bearer ${token}` } : {};
            
            const response = await axios.get(`https://saintefamilleexcellence.ci/api/cantine/tranche-info?student_id=${studentId}&school_year=${schoolYear}`, { headers });
            setTrancheInfo(response.data);
        } catch (error) {
            console.error('Erreur lors du chargement des informations de tranche:', error);
            setSnackbar({ open: true, message: 'Erreur lors du chargement des informations de tranche', severity: 'error' });
        }
    };

    // Fonction pour récupérer le nombre de paiements pour un élève de garderie
    const getGarderiePaymentCount = async (studentId: number) => {
        try {
            const token = localStorage.getItem('token');
            const headers = token ? { Authorization: `Bearer ${token}` } : {};
            
            const response = await axios.get(`https://saintefamilleexcellence.ci/api/cantine/tranche-info?student_id=${studentId}&school_year=${schoolYear}`, { headers });
            return response.data.paymentCount || 0;
        } catch (error) {
            console.error('Erreur lors de la récupération du nombre de paiements:', error);
            return 0;
        }
    };

    // Fonction pour récupérer tous les paiements d'un enfant de garderie
    const getGarderiePayments = async (studentId: number) => {
        try {
            const token = localStorage.getItem('token');
            const headers = token ? { Authorization: `Bearer ${token}` } : {};
            
            const response = await axios.get(`https://saintefamilleexcellence.ci/api/cantine/student/${studentId}/payments?school_year=${schoolYear}`, { headers });
            return response.data || [];
        } catch (error) {
            console.error('Erreur lors de la récupération des paiements:', error);
            return [];
        }
    };

    // Gérer le paiement mensuel
    const handlePayment = async () => {
        if (!selectedStudent || !paymentForm.amount || !paymentForm.month_number || !paymentForm.year) {
            setSnackbar({ open: true, message: 'Veuillez remplir tous les champs', severity: 'error' });
            return;
        }

        // Calculer le montant avec réduction
        const baseAmount = parseFloat(paymentForm.amount);
        const reductionAmount = parseFloat(paymentForm.reduction) || 0;
        const finalAmount = baseAmount - reductionAmount;
        
        // Validation du montant final - ne peut pas être négatif
        if (finalAmount < 0) {
            setSnackbar({ 
                open: true, 
                message: 'Le montant après réduction ne peut pas être négatif', 
                severity: 'error' 
            });
            return;
        }

        // Validation du montant de base - doit être exactement 15,000 FCFA
        const expectedAmount = calculateMonthlyCantineAmount();
        
        if (baseAmount !== expectedAmount) {
            setSnackbar({ 
                open: true, 
                message: `Le montant de base pour la cantine mensuelle doit être de ${expectedAmount.toLocaleString('fr-FR')} FCFA`, 
                severity: 'error' 
            });
            return;
        }

        try {
            setLoading(true);
            setReceiptLoading(true);
            const token = localStorage.getItem('token');
            const headers = token ? { Authorization: `Bearer ${token}` } : {};

            const response = await axios.post('https://saintefamilleexcellence.ci/api/cantine/payment', {
                student_id: selectedStudent.id,
                amount: finalAmount,
                base_amount: baseAmount,
                reduction_amount: reductionAmount,
                payment_method: paymentForm.payment_method,
                month_number: paymentForm.month_number,
                year: paymentForm.year,
                notes: paymentForm.notes,
                school_year: schoolYear
            }, { headers });

            // Afficher immédiatement le reçu
            setReceiptData(response.data.receipt);
            setReceiptLoading(false);
            setShowReceipt(true);
            setOpenPaymentDialog(false);
            setPaymentForm({ amount: '', payment_method: 'Espèces', month_number: '', year: '', notes: '', reduction: '' });
            setTrancheInfo(null);
            setSnackbar({ open: true, message: 'Paiement effectué avec succès', severity: 'success' });
            
            // Recharger les données en arrière-plan après l'affichage du reçu
            setTimeout(() => {
                loadCantineStudents();
            }, 100);
        } catch (error: any) {
            console.error('Erreur lors du paiement:', error);
            const errorMessage = error.response?.data?.message || 'Erreur lors du paiement';
            setSnackbar({ open: true, message: errorMessage, severity: 'error' });
        } finally {
            setLoading(false);
            setReceiptLoading(false);
        }
    };

    const getStatusColor = (student: Student) => {
        const totalPaid = Number(student.total_paid_amount) || 0;
        const totalAmount = Number(student.cantine_amount) || 0;
        if (totalAmount > 0 && totalPaid >= totalAmount) return 'success';
        if (totalPaid > 0) return 'warning';
        return 'error';
    };

    const getStatusText = (student: Student) => {
        const totalPaid = Number(student.total_paid_amount) || 0;
        const totalAmount = Number(student.cantine_amount) || 0;
        if (totalAmount > 0 && totalPaid >= totalAmount) return 'Payé';
        if (totalPaid > 0) return 'Partiel';
        return 'Non payé';
    };

    console.log('=== [DEBUG] Filtrage des élèves:', { 
        totalStudents: students.length, 
        genreFilter, 
        eatsAtCantineFilter, 
        studentTypeFilter,
        searchTerm 
    });
    
    const filteredStudents = students.filter(student => {
        const matchesSearch = (student.first_name + ' ' + student.last_name).toLowerCase().includes(searchTerm.toLowerCase()) ||
            (student.registration_number || '').toLowerCase().includes(searchTerm.toLowerCase());
        
        // Filtre mange à la cantine
        if (eatsAtCantineFilter === 'yes' && student.eats_at_cantine !== 1 && student.eats_at_cantine !== true) return false;
        if (eatsAtCantineFilter === 'no' && (student.eats_at_cantine === 1 || student.eats_at_cantine === true)) return false;
        
        // Filtre par genre
        if (genreFilter !== 'Tous') {
            const studentGender = getGenderDisplay(student.gender);
            console.log('=== [DEBUG] Filtre genre:', { 
                studentName: student.first_name + ' ' + student.last_name,
                studentGender: student.gender,
                displayGender: studentGender,
                filterValue: genreFilter,
                matches: studentGender === genreFilter
            });
            if (studentGender !== genreFilter) return false;
        }
        
        // Filtre par type d'élève
        if (studentTypeFilter === 'Garderie' && student.source_type !== 'garderie') return false;
        if (studentTypeFilter === 'Élèves de la maternelle' && student.source_type === 'garderie') return false;
        
        return matchesSearch;
    });
    
    console.log('=== [DEBUG] Résultat du filtrage:', { 
        filteredCount: filteredStudents.length,
        genreFilterApplied: genreFilter !== 'Tous'
    });

    const totalAmount = Number(stats.totalAmount) || 0;
    const totalPaidAmount = Number(stats.totalPaidAmount) || 0;

    const printRef = useRef<HTMLDivElement>(null);
    const printPaidRef = useRef<HTMLDivElement>(null);
    
    const handlePrint = () => {
        if (printRef.current) {
            const printContents = printRef.current.innerHTML;
            const printWindow = window.open('', '', 'height=900,width=1200');
            if (printWindow) {
                printWindow.document.write('<html><head><title>Liste Cantine</title>');
                printWindow.document.write('<style>body{font-family:sans-serif;} table{border-collapse:collapse;width:100%;} th,td{border:1px solid #ccc;padding:8px;text-align:left;} th{background:#1976d2;color:white;}</style>');
                printWindow.document.write('</head><body>');
                printWindow.document.write(printContents);
                printWindow.document.write('</body></html>');
                printWindow.document.close();
                printWindow.focus();
                setTimeout(() => {
                    printWindow.print();
                    printWindow.close();
                }, 500);
            }
        }
    };

    const handlePrintPaidStudents = () => {
        if (printPaidRef.current) {
            const printContents = printPaidRef.current.innerHTML;
            const printWindow = window.open('', '', 'height=900,width=1200');
            if (printWindow) {
                printWindow.document.write('<html><head><title>Liste des élèves ayant payé la cantine</title>');
                printWindow.document.write('<style>body{font-family:sans-serif;margin:20px;} .header{text-align:center;margin-bottom:30px;} .logo{text-align:center;margin-bottom:20px;} table{border-collapse:collapse;width:100%;} th,td{border:1px solid #ccc;padding:8px;text-align:left;} th{background:#2e7d32;color:white;} .paid{background:#e8f5e9;} .footer{margin-top:30px;text-align:center;font-size:12px;}</style>');
                printWindow.document.write('</head><body>');
                printWindow.document.write(printContents);
                printWindow.document.write('</body></html>');
                printWindow.document.close();
                printWindow.focus();
                setTimeout(() => {
                    printWindow.print();
                    printWindow.close();
                }, 500);
            }
        }
    };

    // Fonctions pour l'historique des reçus
    const handleReceiptHistoryOpen = (student: Student) => {
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
            const response = await fetch(`https://saintefamilleexcellence.ci/api/cantine/${studentId}/receipt-history?school_year=${schoolYear}`, {
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
            const url = `https://saintefamilleexcellence.ci/api/cantine/${selectedStudentForHistory?.id}/payment-receipt/${receipt.payment_id}?school_year=${schoolYear}`;

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
            case 'paiement':
                return 'Paiement';
            default:
                return type;
        }
    };

    const getReceiptTypeColor = (type: string) => {
        switch (type) {
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

    return (
        <Box sx={{ display: 'flex', minHeight: '100vh', background: theme.palette.background.default }}>
            <SecretarySidebar />
            <Box component="main" sx={{ flexGrow: 1, p: 2, overflow: 'auto' }}>
                <Paper sx={{ p: 2, borderRadius: 2, boxShadow: 2 }}>
                    <Box sx={{ mb: 3, borderBottom: `2px solid ${theme.palette.primary.main}`, pb: 1 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                            <Avatar sx={{ width: 40, height: 40, bgcolor: 'primary.main', fontSize: '1.5rem' }}>
                                <RestaurantIcon />
                            </Avatar>
                            <Box>
                                <Typography variant="h5" component="h1" sx={{ fontWeight: 600 }}>
                                    Gestion de la Cantine
                                </Typography>
                                <Typography variant="body2" color="text.secondary">
                                    Système de paiement mensuel - 15,000 FCFA par mois pour tous les élèves
                                </Typography>
                            </Box>
                        </Box>
                    </Box>

                    {/* Statistiques */}
                    <Grid container spacing={2} sx={{ mb: 3 }}>
                        <Grid item xs={12} sm={6} md={2.4}>
                            <Card sx={{ 
                                background: 'linear-gradient(135deg, #1976d2 0%, #42a5f5 100%)',
                                color: 'white',
                                borderRadius: 2
                            }}>
                                <CardContent sx={{ p: 2 }}>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                        <PeopleIcon sx={{ fontSize: 30 }} />
                                        <Box>
                                            <Typography variant="body2" component="div">
                                                Total Élèves
                                            </Typography>
                                            <Typography variant="h5" sx={{ fontWeight: 'bold' }}>
                                                {stats.totalStudents}
                                            </Typography>
                                        </Box>
                                    </Box>
                                </CardContent>
                            </Card>
                        </Grid>
                        <Grid item xs={12} sm={6} md={2.4}>
                            <Card sx={{ 
                                background: 'linear-gradient(135deg, #2e7d32 0%, #66bb6a 100%)',
                                color: 'white',
                                borderRadius: 2
                            }}>
                                <CardContent sx={{ p: 2 }}>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                        <CheckCircleIcon sx={{ fontSize: 30 }} />
                                        <Box>
                                            <Typography variant="body2" component="div">
                                                Payés
                                            </Typography>
                                            <Typography variant="h5" sx={{ fontWeight: 'bold' }}>
                                                {stats.fullyPaidStudents}
                                            </Typography>
                                        </Box>
                                    </Box>
                                </CardContent>
                            </Card>
                        </Grid>
                        <Grid item xs={12} sm={6} md={2.4}>
                            <Card sx={{ 
                                background: 'linear-gradient(135deg, #f57c00 0%, #ffb74d 100%)',
                                color: 'white',
                                borderRadius: 2
                            }}>
                                <CardContent sx={{ p: 2 }}>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                        <ScheduleIcon sx={{ fontSize: 30 }} />
                                        <Box>
                                            <Typography variant="body2" component="div">
                                                Partiellement payés
                                            </Typography>
                                            <Typography variant="h5" sx={{ fontWeight: 'bold' }}>
                                                {stats.partiallyPaidStudents}
                                            </Typography>
                                        </Box>
                                    </Box>
                                </CardContent>
                            </Card>
                        </Grid>

                        {/* Cartes de résumé financier - Visible uniquement par l'admin */}
                        {userRole === 'admin' && (
                            <>
                                <Grid item xs={12} sm={6} md={2.4}>
                                    <Card sx={{ 
                                        background: 'linear-gradient(135deg, #7b1fa2 0%, #ba68c8 100%)',
                                        color: 'white',
                                        borderRadius: 2
                                    }}>
                                        <CardContent sx={{ p: 2 }}>
                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                <PaymentIcon sx={{ fontSize: 30 }} />
                                                <Box>
                                                    <Typography variant="body2" component="div">
                                                        Montant Total
                                                    </Typography>
                                                    <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                                                        {totalAmount.toLocaleString('fr-FR', { maximumFractionDigits: 0 })} FCFA
                                                    </Typography>
                                                </Box>
                                            </Box>
                                        </CardContent>
                                    </Card>
                                </Grid>
                                <Grid item xs={12} sm={6} md={2.4}>
                                    <Card sx={{ 
                                        background: 'linear-gradient(135deg, #d32f2f 0%, #f44336 100%)',
                                        color: 'white',
                                        borderRadius: 2
                                    }}>
                                        <CardContent sx={{ p: 2 }}>
                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                <ReceiptIcon sx={{ fontSize: 30 }} />
                                                <Box>
                                                    <Typography variant="body2" component="div">
                                                        Montant Payé
                                                    </Typography>
                                                    <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                                                        {totalPaidAmount.toLocaleString('fr-FR', { maximumFractionDigits: 0 })} FCFA
                                                    </Typography>
                                                </Box>
                                            </Box>
                                        </CardContent>
                                    </Card>
                                </Grid>
                            </>
                        )}
                    
                    </Grid>

                    {/* Statistiques détaillées par type d'élève */}
                    <Grid container spacing={2} sx={{ mb: 3 }}>
                        <Grid item xs={12} md={6}>
                            <Card sx={{ 
                                background: 'linear-gradient(135deg, #9c27b0 0%, #ba68c8 100%)',
                                color: 'white',
                                borderRadius: 2
                            }}>
                                <CardContent sx={{ p: 2 }}>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                        <PeopleIcon sx={{ fontSize: 30 }} />
                                        <Box>
                                            <Typography variant="body2" component="div">
                                                Élèves de la maternelle
                                            </Typography>
                                            <Typography variant="h5" sx={{ fontWeight: 'bold' }}>
                                                {stats.normalStudents}
                                            </Typography>
                                        </Box>
                                    </Box>
                                </CardContent>
                            </Card>
                        </Grid>
                        <Grid item xs={12} md={6}>
                            <Card sx={{ 
                                background: 'linear-gradient(135deg, #ff9800 0%, #ffb74d 100%)',
                                color: 'white',
                                borderRadius: 2
                            }}>
                                <CardContent sx={{ p: 2 }}>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                        <PeopleIcon sx={{ fontSize: 30 }} />
                                        <Box>
                                            <Typography variant="body2" component="div">
                                                Enfants Garderie
                                            </Typography>
                                            <Typography variant="h5" sx={{ fontWeight: 'bold' }}>
                                                {stats.garderieStudents}
                                            </Typography>
                                        </Box>
                                    </Box>
                                </CardContent>
                            </Card>
                        </Grid>
                    </Grid>

                    {/* Filtres */}
                    <Box sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                        <FormControl size="small" sx={{ minWidth: 150 }}>
                            <InputLabel id="school-year-label">Année scolaire</InputLabel>
                            <Select
                                labelId="school-year-label"
                                value={pendingSchoolYear}
                                label="Année scolaire"
                                onChange={(e) => setPendingSchoolYear(e.target.value)}
                            >
                                {availableYears.map(year => (
                                    <MenuItem key={year} value={year}>{year}</MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                        <FormControl size="small" sx={{ minWidth: 150 }}>
                            <InputLabel id="month-label">Mois</InputLabel>
                            <Select
                                labelId="month-label"
                                value={pendingMonth}
                                label="Mois"
                                onChange={(e) => setPendingMonth(parseInt(e.target.value as string))}
                            >
                                {getSchoolYearMonths(schoolYear).map(month => (
                                    <MenuItem key={month.monthNumber} value={month.monthNumber}>
                                        {month.month} {month.year}
                                    </MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                        {/* Ajout du filtre mange à la cantine */}
                        <FormControl size="small" sx={{ minWidth: 180 }}>
                            <InputLabel id="eats-at-cantine-label">Mange à la cantine</InputLabel>
                            <Select
                                labelId="eats-at-cantine-label"
                                value={eatsAtCantineFilter}
                                label="Mange à la cantine"
                                onChange={e => setEatsAtCantineFilter(e.target.value)}
                            >
                                <MenuItem value="all">Tous</MenuItem>
                                <MenuItem value="yes">Mange à la cantine</MenuItem>
                                <MenuItem value="no">Ne mange pas à la cantine</MenuItem>
                            </Select>
                        </FormControl>
                        {/* Ajout du filtre par genre */}
                        <FormControl size="small" sx={{ minWidth: 150 }}>
                            <InputLabel id="genre-label">Genre</InputLabel>
                            <Select
                                labelId="genre-label"
                                value={genreFilter}
                                label="Genre"
                                onChange={(e) => setGenreFilter(e.target.value)}
                            >
                                {genreOptions.map((option) => (
                                    <MenuItem key={option} value={option}>
                                        {option}
                                    </MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                        {/* Ajout du filtre par type d'élève */}
                        <FormControl size="small" sx={{ minWidth: 180 }}>
                            <InputLabel id="student-type-label">Type d'élève</InputLabel>
                            <Select
                                labelId="student-type-label"
                                value={studentTypeFilter}
                                label="Type d'élève"
                                onChange={(e) => setStudentTypeFilter(e.target.value)}
                            >
                                {studentTypeOptions.map((option) => (
                                    <MenuItem key={option} value={option}>
                                        {option}
                                    </MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                        <TextField
                            size="small"
                            placeholder="Rechercher par nom ou matricule"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            sx={{ minWidth: 220 }}
                        />
                        <Button
                            variant="contained"
                            color="primary"
                            onClick={() => {
                                setSchoolYear(pendingSchoolYear);
                                setSelectedMonth(pendingMonth);
                                setSelectedYear(pendingYear);
                            }}
                        >
                            Rechercher
                        </Button>
                        <Button
                            variant="contained"
                            color="secondary"
                            onClick={handlePrint}
                            sx={{ ml: 1 }}
                        >
                            Imprimer la liste complète
                        </Button>
                        <Button
                            variant="contained"
                            color="success"
                            onClick={handlePrintPaidStudents}
                            sx={{ ml: 1 }}
                            startIcon={<PrintIcon />}
                        >
                            Imprimer les élèves payés
                        </Button>
                        {loading && (
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <CircularProgress size={16} />
                                <Typography variant="caption" color="text.secondary">
                                    Chargement...
                                </Typography>
                            </Box>
                        )}
                    </Box>

                    {/* Table des élèves - Liste complète */}
                    <div style={{ display: 'none' }} ref={printRef}>
                        <h2 style={{ textAlign: 'center', margin: '20px 0' }}>Liste des élèves de la cantine</h2>
                        <table>
                            <thead>
                                <tr>
                                    <th>Matricule</th>
                                    <th>Nom & Prénoms</th>
                                    <th>Classe</th>
                                    <th>Parents</th>
                                    <th>Mange à la cantine</th>
                                    <th>Allergie(s)</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredStudents.map((student) => (
                                    <tr key={student.id}>
                                        <td>{student.registration_number || student.student_code}</td>
                                        <td>{student.first_name} {student.last_name}</td>
                                        <td>{student.class_name}</td>
                                        <td>{student.parent_first_name} {student.parent_last_name}</td>
                                        <td>{student.eats_at_cantine === 1 || student.eats_at_cantine === true ? 'Oui' : 'Non'}</td>
                                        <td>{student.allergy ? student.allergy : '-'}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* Table des élèves payés - Pour impression */}
                    <div style={{ display: 'none' }} ref={printPaidRef}>
                        <div className="header">
                            <div className="logo">
                                <img src="/img/pages/vrailogo.jpg" alt="Logo École" style={{ width: '150px', height: '90px', objectFit: 'contain' }} />
                            </div>
                            <h1 style={{ color: '#2e7d32', marginBottom: '10px' }}>TRAYE BERNARD</h1>
                            <h2 style={{ color: '#1976d2', marginBottom: '20px' }}>LISTE DES ÉLÈVES AYANT PAYÉ LA CANTINE</h2>
                            <p style={{ fontSize: '16px', fontWeight: 'bold', marginBottom: '10px' }}>
                                Mois : {getSchoolYearMonths(schoolYear).find(m => m.monthNumber === selectedMonth)?.month} {selectedYear}
                            </p>
                            <p style={{ fontSize: '14px', marginBottom: '20px' }}>
                                Année scolaire : {schoolYear} | Date d'impression : {new Date().toLocaleDateString('fr-FR')}
                            </p>
                        </div>
                        
                        <table>
                            <thead>
                                <tr>
                                    <th>N°</th>
                                    <th>Matricule</th>
                                    <th>Nom & Prénoms</th>
                                    <th>Classe/Type</th>
                                    <th>Genre</th>
                                    <th>Montant Payé</th>
                                    <th>Date de Paiement</th>
                                    <th>Méthode</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredStudents
                                    .filter(student => student.cantine_paid === 1)
                                    .map((student, index) => (
                                    <tr key={student.id} className="paid">
                                        <td>{index + 1}</td>
                                        <td>{student.registration_number || student.student_code}</td>
                                        <td style={{ fontWeight: 'bold' }}>{student.first_name} {student.last_name}</td>
                                        <td>
                                            {student.source_type === 'garderie' ? 
                                                <span style={{ color: '#ff9800', fontWeight: 'bold' }}>Garderie</span> : 
                                                student.class_name
                                            }
                                        </td>
                                        <td>{getGenderDisplay(student.gender)}</td>
                                        <td style={{ fontWeight: 'bold', color: '#2e7d32' }}>
                                            {(Number(student.total_paid_amount) || 0).toLocaleString('fr-FR')} FCFA
                                            {student.reduction_amount && Number(student.reduction_amount) > 0 && (
                                                <div style={{ fontSize: '12px', color: '#d32f2f' }}>
                                                    (Réduction: -{Number(student.reduction_amount).toLocaleString('fr-FR')} FCFA)
                                                </div>
                                            )}
                                        </td>
                                        <td>
                                            {student.cantine_payment_date ? 
                                                new Date(student.cantine_payment_date).toLocaleDateString('fr-FR') : 
                                                '-'
                                            }
                                        </td>
                                        <td>Espèces</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        
                        <div className="footer">
                            <div style={{ marginTop: '30px', padding: '20px', backgroundColor: '#f5f5f5', borderRadius: '5px' }}>
                                <h3 style={{ color: '#2e7d32', marginBottom: '15px' }}>RÉSUMÉ</h3>
                                <div style={{ display: 'flex', justifyContent: 'space-around', textAlign: 'center' }}>
                                    <div>
                                        <strong>Nombre d'élèves payés :</strong><br/>
                                        <span style={{ fontSize: '24px', color: '#2e7d32', fontWeight: 'bold' }}>
                                            {filteredStudents.filter(s => s.cantine_paid === 1).length}
                                        </span>
                                    </div>
                                    <div>
                                        <strong>Total collecté :</strong><br/>
                                        <span style={{ fontSize: '24px', color: '#2e7d32', fontWeight: 'bold' }}>
                                            {filteredStudents
                                                .filter(s => s.cantine_paid === 1)
                                                .reduce((sum, s) => sum + (Number(s.total_paid_amount) || 0), 0)
                                                .toLocaleString('fr-FR')} FCFA
                                        </span>
                                    </div>
                                    <div>
                                        <strong>Montant mensuel fixe :</strong><br/>
                                        <span style={{ fontSize: '18px', color: '#1976d2', fontWeight: 'bold' }}>
                                            15,000 FCFA
                                        </span>
                                    </div>
                                </div>
                            </div>
                            <p style={{ marginTop: '30px', textAlign: 'center', fontSize: '12px' }}>
                                Signature du responsable : _________________________ | Date : _____________
                            </p>
                        </div>
                    </div>
                    <TableContainer component={Paper} sx={{ borderRadius: 1, overflow: 'auto', maxHeight: '60vh' }}>
                        <Table size="small">
                            <TableHead>
                                <TableRow sx={{ backgroundColor: theme.palette.primary.main }}>
                                    <TableCell sx={{ color: 'white', fontWeight: 'bold', fontSize: '0.875rem' }}>Élève</TableCell>
                                    <TableCell sx={{ color: 'white', fontWeight: 'bold', fontSize: '0.875rem' }}>Classe</TableCell>
                                    <TableCell sx={{ color: 'white', fontWeight: 'bold', fontSize: '0.875rem' }}>Genre</TableCell>
                                    <TableCell sx={{ color: 'white', fontWeight: 'bold', fontSize: '0.875rem' }}>Parents</TableCell>
                                    <TableCell sx={{ color: 'white', fontWeight: 'bold', fontSize: '0.875rem' }}>Montant</TableCell>
                                    <TableCell sx={{ color: 'white', fontWeight: 'bold', fontSize: '0.875rem' }}>Statut</TableCell>
                                    <TableCell sx={{ color: 'white', fontWeight: 'bold', fontSize: '0.875rem' }}>Mois</TableCell>
                                    <TableCell sx={{ color: 'white', fontWeight: 'bold', fontSize: '0.875rem' }}>Date</TableCell>
                                    <TableCell sx={{ color: 'white', fontWeight: 'bold', fontSize: '0.875rem' }}>Actions</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {filteredStudents.map((student) => (
                                    <TableRow key={student.id} sx={{ '&:hover': { backgroundColor: theme.palette.action.hover } }}>
                                        <TableCell>
                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                {student.child_photo ? (
                                                    <Avatar
                                                        src={`https://saintefamilleexcellence.ci/api/students/photo/${student.child_photo}`}
                                                        sx={{ width: 32, height: 32 }}
                                                    />
                                                ) : (
                                                    <Avatar sx={{ width: 32, height: 32, bgcolor: 'primary.main', fontSize: '0.875rem' }}>
                                                        {student.first_name?.[0]}{student.last_name?.[0]}
                                                    </Avatar>
                                                )}
                                                <Box>
                                                    <Typography variant="body2" sx={{ fontWeight: 500 }}>
                                                        {student.first_name} {student.last_name}
                                                    </Typography>
                                                    <Typography variant="caption" color="text.secondary">
                                                        {student.registration_number || student.student_code}
                                                    </Typography>
                                                </Box>
                                            </Box>
                                        </TableCell>
                                        <TableCell>
                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                {student.source_type === 'garderie' ? (
                                                    <>
                                                        <Chip 
                                                            label="Garderie" 
                                                            size="small" 
                                                            color="secondary" 
                                                            sx={{ fontSize: '0.7rem', height: 20 }}
                                                        />
                                                        <Typography variant="body2" color="text.secondary">
                                                            (Paiement flexible)
                                                        </Typography>
                                                    </>
                                                ) : (
                                                    <Typography variant="body2">
                                                        {student.class_name ? student.class_name : 'Aucune inscription'}
                                                    </Typography>
                                                )}
                                            </Box>
                                        </TableCell>
                                        <TableCell>
                                            <Chip 
                                                label={getGenderDisplay(student.gender)}
                                                size="small"
                                                color={student.gender === 'M' ? 'primary' : student.gender === 'F' ? 'secondary' : 'default'}
                                                sx={{ fontWeight: 500 }}
                                            />
                                        </TableCell>
                                        <TableCell>
                                            <Box>
                                                <Typography variant="body2" sx={{ fontWeight: 500 }}>
                                                    {student.parent_first_name} {student.parent_last_name}
                                                </Typography>
                                                <Typography variant="caption" color="text.secondary">
                                                    {student.parent_phone}
                                                </Typography>
                                            </Box>
                                        </TableCell>
                                                                                <TableCell>
                                            <Box>
                                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5 }}>
                                                    <Chip 
                                                        label={student.source_type === 'garderie' ? 'Garderie' : (student.level === 'Garderie' ? 'Garderie' : 'Maternelle')} 
                                                        size="small" 
                                                        color={student.source_type === 'garderie' ? 'secondary' : 'primary'} 
                                                        sx={{ fontSize: '0.6rem', height: 16 }}
                                                    />
                                                </Box>
                                                <Typography variant="body2" sx={{ fontWeight: 'bold', color: 'primary.main' }}>
                                                    {calculateMonthlyCantineAmount().toLocaleString('fr-FR')} FCFA
                                                </Typography>
                                                <Typography variant="caption" color="text.secondary">
                                                    Payé: {(student.cantine_paid === 1 ? (Number(student.total_paid_amount) || 0) : 0).toLocaleString('fr-FR')} FCFA
                                                </Typography>
                                                {student.cantine_paid === 1 && student.reduction_amount && Number(student.reduction_amount) > 0 && (
                                                    <Typography variant="caption" color="error.main" sx={{ display: 'block' }}>
                                                        Réduction: -{Number(student.reduction_amount).toLocaleString('fr-FR')} FCFA
                                                    </Typography>
                                                )}
                                                {student.cantine_paid === 1 && (
                                                    <Typography variant="caption" color="success.main">
                                                        ✓ Paiement effectué
                                                    </Typography>
                                                )}
                                            </Box>
                                        </TableCell>
                                        <TableCell>
                                            <Box>
                                                {student.cantine_paid === 1 ? (
                                                    <Chip
                                                        label="Payé"
                                                        color="success"
                                                        size="small"
                                                        sx={{ fontWeight: 500, fontSize: '0.75rem' }}
                                                    />
                                                ) : (
                                                    <Chip
                                                        label="Non payé"
                                                        color="error"
                                                        size="small"
                                                        sx={{ fontWeight: 500, fontSize: '0.75rem' }}
                                                    />
                                                )}
                                            </Box>
                                        </TableCell>
                                        <TableCell>
                                            <Typography variant="caption" color="text.secondary">
                                                {getSchoolYearMonths(schoolYear).find(m => m.monthNumber === selectedMonth)?.month} {selectedYear}
                                            </Typography>
                                        </TableCell>
                                        <TableCell>
                                            {student.cantine_payment_date ? (
                                                <Typography variant="caption">
                                                    {new Date(student.cantine_payment_date).toLocaleDateString('fr-FR')}
                                                </Typography>
                                            ) : (
                                                <Typography variant="caption" color="text.secondary">
                                                    -
                                                </Typography>
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                                {student.source_type === 'garderie' ? (
                                                    // Pour les enfants de garderie, afficher toujours le bouton de paiement
                                                    (() => {
                                                        const hasPaidThisMonth = student.cantine_month === selectedMonth && student.cantine_year === selectedYear;
                                                        const paidAmount = hasPaidThisMonth ? (Number(student.total_paid_amount) || 0) : 0;
                                                        
                                                        return (
                                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                                                {userRole !== 'secretary' && userRole !== 'directrice' && (
                                                                    <IconButton
                                                                        color="primary"
                                                                        size="small"
                                                                        onClick={async () => {
                                                                            setSelectedStudent(student);
                                                                            await loadTrancheInfo(student.id);
                                                                            // Pour les élèves de garderie, pré-remplir le montant calculé
                                                                            const calculatedAmount = calculateGarderieAmount(student);
                                                                            setPaymentForm({ 
                                                                                amount: String(calculatedAmount), 
                                                                                payment_method: 'Espèces', 
                                                                                month_number: String(selectedMonth),
                                                                                year: String(selectedYear),
                                                                                notes: '',
                                                                                reduction: ''
                                                                            });
                                                                            setOpenPaymentDialog(true);
                                                                        }}
                                                                        disabled={loading}
                                                                    >
                                                                        <PaymentIcon fontSize="small" />
                                                                    </IconButton>
                                                                )}
                                                                {paidAmount > 0 && (
                                                                    <Chip 
                                                                        label={`${paidAmount.toLocaleString()} FCFA`}
                                                                        size="small"
                                                                        color="success"
                                                                        variant="outlined"
                                                                        sx={{ fontSize: '0.7rem' }}
                                                                    />
                                                                )}
                                                            </Box>
                                                        );
                                                    })()
                                                ) : (
                                                    // Pour les élèves normaux, utiliser le système mensuel
                                                    (() => {
                                                        const hasPaidThisMonth = student.cantine_month === selectedMonth && student.cantine_year === selectedYear;
                                                        const paidAmount = hasPaidThisMonth ? (Number(student.total_paid_amount) || 0) : 0;
                                                        const isFullyPaid = hasPaidThisMonth && paidAmount >= calculateMonthlyCantineAmount();
                                                        
                                                        // Afficher le bouton seulement si le mois n'est pas payé ET si l'utilisateur n'est pas secretary
                                                        return !isFullyPaid && userRole !== 'secretary' && userRole !== 'directrice' ? (
                                                            <IconButton
                                                                color="primary"
                                                                size="small"
                                                                onClick={async () => {
                                                                    setSelectedStudent(student);
                                                                    await loadTrancheInfo(student.id);
                                                                    // Pour les élèves normaux, initialiser le formulaire avec le montant mensuel
                                                                    setPaymentForm({ 
                                                                        amount: String(calculateMonthlyCantineAmount()), 
                                                                        payment_method: 'Espèces', 
                                                                        month_number: String(selectedMonth),
                                                                        year: String(selectedYear),
                                                                        notes: '',
                                                                        reduction: ''
                                                                    });
                                                                    setOpenPaymentDialog(true);
                                                                }}
                                                                disabled={loading}
                                                                sx={{ mr: 0.5 }}
                                                            >
                                                                <PaymentIcon fontSize="small" />
                                                            </IconButton>
                                                        ) : (
                                                            <Box sx={{ mr: 0.5 }} />
                                                        );
                                                    })()
                                                )}
                                                <IconButton
                                                    color="info"
                                                    size="small"
                                                    onClick={async () => {
                                                        setSelectedStudentForDetails(student);
                                                        setShowStudentDetails(true);
                                                        // Pour les enfants de garderie, récupérer le nombre de paiements et l'historique
                                                        if (student.source_type === 'garderie') {
                                                            const paymentCount = await getGarderiePaymentCount(student.id);
                                                            setGarderiePaymentCount(paymentCount);
                                                            
                                                            const payments = await getGarderiePayments(student.id);
                                                            setGarderiePayments(payments);
                                                        } else {
                                                            setGarderiePayments([]);
                                                        }
                                                    }}
                                                    disabled={loading}
                                                    sx={{ mr: 0.5 }}
                                                >
                                                    <ViewIcon fontSize="small" />
                                                </IconButton>
                                                <IconButton
                                                    color="secondary"
                                                    size="small"
                                                    onClick={() => handleReceiptHistoryOpen(student)}
                                                    disabled={loading}
                                                >
                                                    <HistoryIcon fontSize="small" />
                                                </IconButton>
                                            </Box>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </TableContainer>
                </Paper>

                {/* Dialog de paiement */}
                <Dialog open={openPaymentDialog} onClose={() => setOpenPaymentDialog(false)} maxWidth="sm" fullWidth>
                    <DialogTitle sx={{ 
                        background: 'linear-gradient(135deg, #1976d2 0%, #42a5f5 100%)',
                        color: 'white'
                    }}>
                        <Box>
                            <Typography variant="h6">Paiement Cantine</Typography>
                            {selectedStudent && (
                                <Typography variant="body2" sx={{ opacity: 0.9, mt: 0.5 }}>
                                    {selectedStudent.first_name} {selectedStudent.last_name} - 
                                    Catégorie: {selectedStudent.level === 'Garderie' ? 'Garderie' : 'Maternelle'}
                                </Typography>
                            )}
                        </Box>
                    </DialogTitle>
                    <DialogContent sx={{ pt: 3 }}>
                        {selectedStudent && (
                            <Box sx={{ mb: 3 }}>
                                <Card sx={{ 
                                    background: 'linear-gradient(135deg, #e3f2fd 0%, #bbdefb 100%)',
                                    borderRadius: 2,
                                    p: 2
                                }}>
                                    <Typography variant="h6" sx={{ mb: 2, color: 'primary.main', fontWeight: 'bold' }}>
                                        Informations de l'élève
                                    </Typography>
                                    <Grid container spacing={2}>
                                        <Grid item xs={12} md={6}>
                                            <Typography variant="body2" color="text.secondary">Nom complet</Typography>
                                            <Typography variant="body1" sx={{ fontWeight: 500 }}>
                                                {selectedStudent.first_name} {selectedStudent.last_name}
                                            </Typography>
                                        </Grid>
                                        <Grid item xs={12} md={6}>
                                            <Typography variant="body2" color="text.secondary">Matricule</Typography>
                                            <Typography variant="body1" sx={{ fontWeight: 500 }}>
                                                {selectedStudent.registration_number || selectedStudent.student_code}
                                            </Typography>
                                        </Grid>
                                        <Grid item xs={12} md={6}>
                                            <Typography variant="body2" color="text.secondary">Classe</Typography>
                                            <Typography variant="body1" sx={{ fontWeight: 500 }}>
                                                {selectedStudent.class_name || 'Non assigné'}
                                            </Typography>
                                        </Grid>
                                        <Grid item xs={12} md={6}>
                                            <Typography variant="body2" color="text.secondary">Type d'élève</Typography>
                                            <Typography variant="body1" sx={{ fontWeight: 500, color: 'primary.main' }}>
                                                {selectedStudent.source_type === 'garderie' ? 'Garderie' : 'Élève de l\'école'}
                                            </Typography>
                                        </Grid>
                                        <Grid item xs={12} md={12}>
                                            <Typography variant="body2" color="text.secondary">Montant cantine mensuel</Typography>
                                            <Typography variant="h6" sx={{ fontWeight: 'bold', color: 'primary.main' }}>
                                                {calculateMonthlyCantineAmount().toLocaleString('fr-FR')} FCFA
                                            </Typography>
                                            <Typography variant="caption" color="text.secondary">
                                                Montant fixe pour tous les élèves - Système mensuel
                                            </Typography>
                                        </Grid>
                                    </Grid>
                                </Card>
                            </Box>
                        )}

                        
                        {/* Informations de paiement mensuel */}
                        <Box sx={{ mb: 3 }}>
                            <Typography variant="h6" sx={{ mb: 2, color: 'primary.main', fontWeight: 'bold' }}>
                                Informations de paiement mensuel
                            </Typography>
                            <Grid container spacing={2}>
                                <Grid item xs={12} md={6}>
                                    <Card sx={{ p: 2, background: 'linear-gradient(135deg, #e8f5e9 0%, #c8e6c9 100%)' }}>
                                        <Typography variant="subtitle2" color="success.main" sx={{ fontWeight: 'bold' }}>
                                            Montant mensuel fixe
                                        </Typography>
                                        <Typography variant="h5" sx={{ fontWeight: 'bold', color: 'success.main' }}>
                                            {calculateMonthlyCantineAmount().toLocaleString('fr-FR')} FCFA
                                        </Typography>
                                        <Typography variant="caption" color="text.secondary">
                                            Montant identique pour tous les élèves
                                        </Typography>
                                    </Card>
                                </Grid>
                                <Grid item xs={12} md={6}>
                                    <Card sx={{ p: 2, background: 'linear-gradient(135deg, #fff3e0 0%, #ffcc02 100%)' }}>
                                        <Typography variant="subtitle2" color="warning.main" sx={{ fontWeight: 'bold' }}>
                                            Période de paiement
                                        </Typography>
                                        <Typography variant="h6" sx={{ fontWeight: 'bold', color: 'warning.main' }}>
                                            Par mois
                                        </Typography>
                                        <Typography variant="caption" color="text.secondary">
                                            Les parents peuvent choisir les mois à payer
                                        </Typography>
                                    </Card>
                                </Grid>
                            </Grid>
                                
                                {/* Information système mensuel */}
                                <Box sx={{ mt: 2 }}>
                                    <Alert severity="info" sx={{ mb: 2 }}>
                                        <Typography variant="body2">
                                            <strong>Note :</strong> Système de paiement mensuel de la cantine.
                                            <br />• Montant fixe : 15,000 FCFA par mois pour tous les élèves
                                            <br />• Paiement mensuel : Chaque mois doit être payé individuellement
                                            <br />• Choix des parents : Les parents peuvent choisir les mois à payer
                                            <br />• Validation : Le montant exact de 15,000 FCFA est requis pour chaque mois
                                            <br />• Historique : Chaque paiement mensuel est enregistré avec sa date
                                        </Typography>
                                    </Alert>
                                    <Typography variant="subtitle1" sx={{ fontWeight: 'bold', mb: 1 }}>
                                        Détail du paiement pour le mois sélectionné :
                                    </Typography>
                                    <Grid container spacing={1}>
                                        <Grid item xs={12}>
                                            <Card sx={{ 
                                                p: 2, 
                                                background: selectedStudent?.cantine_paid === 1 ? 
                                                    'linear-gradient(135deg, #e8f5e9 0%, #c8e6c9 100%)' : 
                                                    'linear-gradient(135deg, #ffebee 0%, #ffcdd2 100%)',
                                                border: selectedStudent?.cantine_paid === 1 ? 
                                                    '2px solid #4caf50' : 
                                                    '2px solid #f44336'
                                            }}>
                                                <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 1 }}>
                                                    {getSchoolYearMonths(schoolYear).find(m => m.monthNumber === selectedMonth)?.month} {selectedYear}
                                                </Typography>
                                                <Typography variant="h5" sx={{ fontWeight: 'bold', color: 'primary.main', mb: 1 }}>
                                                    {calculateMonthlyCantineAmount().toLocaleString('fr-FR')} FCFA
                                                </Typography>
                                                <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                                                    Montant mensuel fixe pour la cantine
                                                </Typography>
                                                {selectedStudent?.cantine_paid === 1 && (
                                                    <>
                                                        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                                                            Total payé: {(Number(selectedStudent.total_paid_amount) || 0).toLocaleString('fr-FR')} FCFA
                                                        </Typography>
                                                        {selectedStudent.reduction_amount && Number(selectedStudent.reduction_amount) > 0 && (
                                                            <Typography variant="body2" color="error.main" sx={{ mb: 1 }}>
                                                                Réduction appliquée: -{Number(selectedStudent.reduction_amount).toLocaleString('fr-FR')} FCFA
                                                            </Typography>
                                                        )}
                                                    </>
                                                )}
                                                <Chip 
                                                    label={selectedStudent?.cantine_paid === 1 ? 'Payé' : 'Non payé'} 
                                                    size="small" 
                                                    color={selectedStudent?.cantine_paid === 1 ? 'success' : 'error'}
                                                    sx={{ mt: 1 }}
                                                />
                                            </Card>
                                        </Grid>
                                    </Grid>
                                </Box>
                            </Box>

                        <Grid container spacing={2}>
                            {/* Sélection du mois et de l'année */}
                            <Grid item xs={12} md={4}>
                                <FormControl fullWidth>
                                    <InputLabel>Mois</InputLabel>
                                    <Select
                                        value={paymentForm.month_number}
                                        label="Mois"
                                        onChange={(e) => setPaymentForm({ ...paymentForm, month_number: e.target.value })}
                                    >
                                        {getSchoolYearMonths(schoolYear).map(month => (
                                            <MenuItem key={month.monthNumber} value={month.monthNumber}>
                                                {month.month} {month.year}
                                            </MenuItem>
                                        ))}
                                    </Select>
                                </FormControl>
                            </Grid>
                            <Grid item xs={12} md={4}>
                                <TextField
                                    fullWidth
                                    label="Année"
                                    type="number"
                                    value={paymentForm.year}
                                    onChange={(e) => setPaymentForm({ ...paymentForm, year: e.target.value })}
                                    helperText="Année du paiement"
                                />
                            </Grid>
                            <Grid item xs={12} md={4}>
                                <TextField
                                    fullWidth
                                    label="Montant de base (FCFA)"
                                    type="number"
                                    value={paymentForm.amount}
                                    onChange={(e) => setPaymentForm({ ...paymentForm, amount: e.target.value })}
                                    helperText={`Montant fixe: ${calculateMonthlyCantineAmount().toLocaleString('fr-FR')} FCFA par mois`}
                                />
                            </Grid>
                            <Grid item xs={12} md={4}>
                                <TextField
                                    fullWidth
                                    label="Réduction (FCFA)"
                                    type="number"
                                    value={paymentForm.reduction}
                                    onChange={(e) => setPaymentForm({ ...paymentForm, reduction: e.target.value })}
                                    helperText="Montant de réduction accordée"
                                    inputProps={{ min: 0 }}
                                />
                            </Grid>
                            <Grid item xs={12} md={4}>
                                <TextField
                                    fullWidth
                                    label="Montant final à payer (FCFA)"
                                    type="number"
                                    value={(() => {
                                        const baseAmount = parseFloat(paymentForm.amount) || 0;
                                        const reductionAmount = parseFloat(paymentForm.reduction) || 0;
                                        return Math.max(0, baseAmount - reductionAmount);
                                    })()}
                                    InputProps={{ readOnly: true }}
                                    helperText="Montant calculé automatiquement"
                                    sx={{
                                        '& .MuiInputBase-input': {
                                            backgroundColor: 'rgba(0, 0, 0, 0.04)',
                                            fontWeight: 'bold'
                                        }
                                    }}
                                />
                            </Grid>
                            <Grid item xs={12} md={6}>
                                <FormControl fullWidth>
                                    <InputLabel>Méthode de paiement</InputLabel>
                                    <Select
                                        value={paymentForm.payment_method}
                                        label="Méthode de paiement"
                                        onChange={(e) => setPaymentForm({ ...paymentForm, payment_method: e.target.value })}
                                    >
                                        <MenuItem value="Espèces">Espèces</MenuItem>
                                        <MenuItem value="Chèque">Chèque</MenuItem>
                                        <MenuItem value="Virement">Virement</MenuItem>
                                        <MenuItem value="Mobile Money">Mobile Money</MenuItem>
                                    </Select>
                                </FormControl>
                            </Grid>
                            <Grid item xs={12}>
                                <TextField
                                    fullWidth
                                    label="Notes (optionnel)"
                                    multiline
                                    rows={2}
                                    value={paymentForm.notes}
                                    onChange={(e) => setPaymentForm({ ...paymentForm, notes: e.target.value })}
                                />
                            </Grid>
                        </Grid>
                    </DialogContent>
                    <DialogActions>
                        <Button onClick={() => setOpenPaymentDialog(false)} color="secondary">
                            Annuler
                        </Button>
                        <Button 
                            onClick={handlePayment} 
                            variant="contained" 
                            color="primary" 
                            disabled={loading || !paymentForm.amount}
                            startIcon={<PaymentIcon />}
                        >
                            Effectuer le Paiement
                        </Button>
                    </DialogActions>
                </Dialog>

                {/* Dialog du reçu */}
                <Dialog 
                    open={showReceipt} 
                    onClose={() => setShowReceipt(false)} 
                    maxWidth="md" 
                    fullWidth
                >
                    <DialogTitle sx={{ 
                        background: 'linear-gradient(135deg, #2e7d32 0%, #66bb6a 100%)',
                        color: 'white'
                    }}>
                        Reçu de Paiement Cantine
                    </DialogTitle>
                    <DialogContent sx={{ pt: 3 }}>
                        {receiptLoading ? (
                            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', p: 4 }}>
                                <CircularProgress />
                                <Typography variant="body1" sx={{ ml: 2 }}>
                                    Génération du reçu...
                                </Typography>
                            </Box>
                        ) : receiptData && (
                            <Paper sx={{ p: 3, borderRadius: 2 }}>
                                {/* En-tête du reçu */}
                                <Box sx={{ textAlign: 'center', mb: 4, borderBottom: '2px solid #2e7d32', pb: 2 }}>
                                    {/* Logo de l'école */}
                                    <Box sx={{ mb: 2 }}>
                                        <img 
                                          src="/img/pages/vrailogo.jpg" 
                                          alt="Logo École" 
                                          style={{ 
                                            height: 90, 
                                            width: 150,
                                            maxWidth: '100%', 
                                            objectFit: 'contain',
                                            marginBottom: '8px'
                                          }} 
                                        />
                                      </Box>
                                    <Typography variant="h4" sx={{ fontWeight: 'bold', color: 'success.main', mb: 1 }}>
                                        REÇU DE PAIEMENT CANTINE
                                    </Typography>
                                    <Typography variant="h5" sx={{ color: 'primary.main', fontWeight: 'bold', mb: 1 }}>
                                        TRAYE BERNARD
                                    </Typography>
                                    <Typography variant="body2" color="text.secondary">
                                        N° {receiptData.receipt_number} - {receiptData.payment_date}
                                    </Typography>
                                </Box>

                                {/* Informations de l'élève */}
                                <Grid container spacing={3} sx={{ mb: 4 }}>
                                    <Grid item xs={12} md={6}>
                                        <Card sx={{ 
                                            background: 'linear-gradient(135deg, #e3f2fd 0%, #bbdefb 100%)',
                                            borderRadius: 2,
                                            p: 2
                                        }}>
                                            <Typography variant="h6" sx={{ mb: 2, color: 'primary.main', fontWeight: 'bold' }}>
                                                Informations de l'Élève
                                            </Typography>
                                            <Typography variant="body1" sx={{ fontWeight: 500, mb: 1 }}>
                                                Nom: {receiptData.student_name}
                                            </Typography>
                                            <Typography variant="body2" color="text.secondary">
                                                Matricule: {receiptData.student_code}
                                            </Typography>
                                            <Typography variant="body2" color="text.secondary">
                                                Classe: {receiptData.class_name}
                                            </Typography>
                                        </Card>
                                    </Grid>
                                    <Grid item xs={12} md={6}>
                                        <Card sx={{ 
                                            background: 'linear-gradient(135deg, #e8f5e9 0%, #c8e6c9 100%)',
                                            borderRadius: 2,
                                            p: 2
                                        }}>
                                            <Typography variant="h6" sx={{ mb: 2, color: 'success.main', fontWeight: 'bold' }}>
                                                Détails du Paiement
                                            </Typography>
                                            <Typography variant="h4" sx={{ fontWeight: 'bold', color: 'success.main', mb: 1 }}>
                                                {receiptData.amount?.toLocaleString('fr-FR')} FCFA
                                            </Typography>
                                            {receiptData.base_amount && receiptData.reduction_amount > 0 && (
                                                <Box sx={{ mb: 1 }}>
                                                    <Typography variant="body2" color="text.secondary">
                                                        Montant de base: {receiptData.base_amount.toLocaleString('fr-FR')} FCFA
                                                    </Typography>
                                                    <Typography variant="body2" color="error.main">
                                                        Réduction: -{receiptData.reduction_amount.toLocaleString('fr-FR')} FCFA
                                                    </Typography>
                                                </Box>
                                            )}
                                            <Typography variant="body2" color="text.secondary">
                                                Méthode: {receiptData.payment_method}
                                            </Typography>
                                        </Card>
                                    </Grid>
                                </Grid>

                                {/* Résumé */}
                                <Box sx={{ mt: 4, p: 3, background: 'linear-gradient(135deg, #f3e5f5 0%, #e1bee7 100%)', borderRadius: 2 }}>
                                    <Grid container spacing={2}>
                                        <Grid item xs={12} md={3}>
                                            <Typography variant="h6" sx={{ fontWeight: 'bold', color: 'success.main' }}>
                                                Montant Payé
                                            </Typography>
                                            <Typography variant="h4" sx={{ fontWeight: 'bold', color: 'success.main' }}>
                                                {receiptData.amount?.toLocaleString('fr-FR')} FCFA
                                            </Typography>
                                        </Grid>
                                        <Grid item xs={12} md={3}>
                                            <Typography variant="h6" sx={{ fontWeight: 'bold', color: 'primary.main' }}>
                                                Période
                                            </Typography>
                                            <Typography variant="h6" sx={{ fontWeight: 'bold', color: 'primary.main' }}>
                                                {receiptData.month || 'Mois'} {receiptData.year || new Date().getFullYear()}
                                            </Typography>
                                        </Grid>
                                        <Grid item xs={12} md={3}>
                                            <Typography variant="h6" sx={{ fontWeight: 'bold', color: 'warning.main' }}>
                                                Méthode
                                            </Typography>
                                            <Typography variant="h6" sx={{ fontWeight: 'bold', color: 'warning.main' }}>
                                                {receiptData.payment_method}
                                            </Typography>
                                        </Grid>
                                        <Grid item xs={12} md={3}>
                                            <Typography variant="h6" sx={{ fontWeight: 'bold', color: 'info.main' }}>
                                                Date
                                            </Typography>
                                            <Typography variant="h6" sx={{ fontWeight: 'bold', color: 'info.main' }}>
                                                {receiptData.payment_date}
                                            </Typography>
                                        </Grid>
                                    </Grid>
                                </Box>

                                {/* Note de bas de page */}
                                <Box sx={{ mt: 4, p: 2, background: '#f5f5f5', borderRadius: 2 }}>
                                    <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center' }}>
                                        Ce reçu atteste du paiement mensuel de la cantine pour {receiptData.month || 'le mois'} {receiptData.year || new Date().getFullYear()} 
                                        de l'année scolaire {receiptData.school_year}.
                                        <br />
                                        <strong>Montant mensuel fixe : 15,000 FCFA</strong>
                                        <br />
                                        Signature du responsable: _____________________
                                    </Typography>
                                </Box>
                            </Paper>
                        )}
                        {!receiptLoading && !receiptData && (
                            <Typography variant="body1" color="text.secondary" sx={{ textAlign: 'center', p: 2 }}>
                                Aucun reçu à afficher
                            </Typography>
                        )}
                    </DialogContent>
                    <DialogActions>
                        <Button onClick={() => setShowReceipt(false)} color="secondary">
                            Fermer
                        </Button>
                        <Button onClick={() => {}} variant="contained" startIcon={<PrintIcon />}>
                            Imprimer le Reçu
                        </Button>
                    </DialogActions>
                </Dialog>

                {/* Dialog des détails de l'élève */}
                <Dialog 
                    open={showStudentDetails} 
                    onClose={() => setShowStudentDetails(false)} 
                    maxWidth="md" 
                    fullWidth
                >
                    <DialogTitle sx={{ 
                        background: 'linear-gradient(135deg, #1976d2 0%, #42a5f5 100%)',
                        color: 'white'
                    }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                            <ViewIcon />
                            <Typography variant="h6">
                                Détails de l'Élève
                            </Typography>
                        </Box>
                    </DialogTitle>
                    <DialogContent sx={{ pt: 3 }}>
                        {selectedStudentForDetails && (
                            <Box>
                                {/* Informations personnelles */}
                                <Card sx={{ mb: 3, background: 'linear-gradient(135deg, #e3f2fd 0%, #bbdefb 100%)', borderRadius: 2 }}>
                                    <CardContent>
                                        <Typography variant="h6" sx={{ mb: 2, color: 'primary.main', fontWeight: 'bold' }}>
                                            Informations Personnelles
                                        </Typography>
                                        <Grid container spacing={3}>
                                            <Grid item xs={12} md={6}>
                                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                                                    {selectedStudentForDetails.child_photo ? (
                                                        <Avatar
                                                            src={`https://saintefamilleexcellence.ci/api/students/photo/${selectedStudentForDetails.child_photo}`}
                                                            sx={{ width: 60, height: 60 }}
                                                        />
                                                    ) : (
                                                        <Avatar sx={{ width: 60, height: 60, bgcolor: 'primary.main', fontSize: '1.5rem' }}>
                                                            {selectedStudentForDetails.first_name?.[0]}{selectedStudentForDetails.last_name?.[0]}
                                                        </Avatar>
                                                    )}
                                                    <Box>
                                                        <Typography variant="h5" sx={{ fontWeight: 'bold' }}>
                                                            {selectedStudentForDetails.first_name} {selectedStudentForDetails.last_name}
                                                        </Typography>
                                                        <Typography variant="body2" color="text.secondary">
                                                            {selectedStudentForDetails.registration_number || selectedStudentForDetails.student_code}
                                                        </Typography>
                                                    </Box>
                                                </Box>
                                            </Grid>
                                            <Grid item xs={12} md={6}>
                                                <Typography variant="body2" color="text.secondary">Classe</Typography>
                                                <Typography variant="body1" sx={{ fontWeight: 500, mb: 1 }}>
                                                    {selectedStudentForDetails.source_type === 'garderie' ? (
                                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                            <Chip 
                                                                label="Garderie" 
                                                                size="small" 
                                                                color="secondary"
                                                            />
                                                            <Typography variant="body2" color="text.secondary">
                                                                ({selectedStudentForDetails.duration_days || 0} jours de présence)
                                                            </Typography>
                                                        </Box>
                                                    ) : (
                                                        selectedStudentForDetails.class_name || 'Non assigné'
                                                    )}
                                                </Typography>
                                                <Typography variant="body2" color="text.secondary">Catégorie</Typography>
                                                <Typography variant="body1" sx={{ fontWeight: 500, color: 'primary.main' }}>
                                                    {selectedStudentForDetails.source_type === 'garderie' ? 'Garderie (Durée variable)' : 
                                                     selectedStudentForDetails.level === 'Garderie' ? 'Garderie' : 'Maternelle'}
                                                </Typography>
                                            </Grid>
                                        </Grid>
                                    </CardContent>
                                </Card>

                                {/* Informations des parents */}
                                <Card sx={{ mb: 3, background: 'linear-gradient(135deg, #e8f5e9 0%, #c8e6c9 100%)', borderRadius: 2 }}>
                                    <CardContent>
                                        <Typography variant="h6" sx={{ mb: 2, color: 'success.main', fontWeight: 'bold' }}>
                                            Informations des Parents
                                        </Typography>
                                        <Grid container spacing={3}>
                                            <Grid item xs={12} md={6}>
                                                <Typography variant="body2" color="text.secondary">Nom complet</Typography>
                                                <Typography variant="body1" sx={{ fontWeight: 500, mb: 2 }}>
                                                    {selectedStudentForDetails.parent_first_name} {selectedStudentForDetails.parent_last_name}
                                                </Typography>
                                            </Grid>
                                            <Grid item xs={12} md={6}>
                                                <Typography variant="body2" color="text.secondary">Téléphone</Typography>
                                                <Typography variant="body1" sx={{ fontWeight: 500 }}>
                                                    {selectedStudentForDetails.parent_phone || 'Non renseigné'}
                                                </Typography>
                                            </Grid>
                                        </Grid>
                                    </CardContent>
                                </Card>

                                {/* Informations de la cantine */}
                                <Card sx={{ mb: 3, background: 'linear-gradient(135deg, #fff3e0 0%, #ffcc02 100%)', borderRadius: 2 }}>
                                    <CardContent>
                                        <Typography variant="h6" sx={{ mb: 2, color: 'warning.main', fontWeight: 'bold' }}>
                                            Informations de la Cantine
                                        </Typography>
                                        <Grid container spacing={3}>
                                            <Grid item xs={12} md={4}>
                                                <Typography variant="body2" color="text.secondary">
                                                    Montant mensuel fixe
                                                </Typography>
                                                <Typography variant="h6" sx={{ fontWeight: 'bold', color: 'warning.main' }}>
                                                    {calculateMonthlyCantineAmount().toLocaleString('fr-FR')} FCFA
                                                </Typography>
                                                <Typography variant="caption" color="text.secondary">
                                                    Montant identique pour tous les élèves
                                                </Typography>
                                            </Grid>
                                            <Grid item xs={12} md={4}>
                                                <Typography variant="body2" color="text.secondary">Mange à la cantine</Typography>
                                                <Typography variant="body1" sx={{ fontWeight: 500 }}>
                                                    {selectedStudentForDetails.eats_at_cantine === 1 || selectedStudentForDetails.eats_at_cantine === true ? 'Oui' : 'Non'}
                                                </Typography>
                                            </Grid>
                                            <Grid item xs={12} md={4}>
                                                <Typography variant="body2" color="text.secondary">Allergies</Typography>
                                                <Typography variant="body1" sx={{ fontWeight: 500 }}>
                                                    {selectedStudentForDetails.allergy || 'Aucune'}
                                                </Typography>
                                            </Grid>
                                        </Grid>
                                    </CardContent>
                                </Card>

                                {/* Statut des paiements mensuels */}
                                <Card sx={{ background: 'linear-gradient(135deg, #f3e5f5 0%, #e1bee7 100%)', borderRadius: 2 }}>
                                    <CardContent>
                                        <Typography variant="h6" sx={{ mb: 2, color: 'secondary.main', fontWeight: 'bold' }}>
                                            Statut des Paiements Mensuels
                                        </Typography>
                                        <Typography variant="body2" color="text.secondary" sx={{ mb: 3, textAlign: 'center' }}>
                                            Montant mensuel fixe : {calculateMonthlyCantineAmount().toLocaleString('fr-FR')} FCFA pour tous les élèves
                                        </Typography>
                                        <Grid container spacing={2}>
                                            {getSchoolYearMonths(schoolYear).map((month) => {
                                                const expectedAmount = calculateMonthlyCantineAmount();
                                                const hasPaidThisMonth = selectedStudentForDetails.cantine_month === month.monthNumber && selectedStudentForDetails.cantine_year === month.year;
                                                const paidAmount = hasPaidThisMonth ? (Number(selectedStudentForDetails.total_paid_amount) || 0) : 0;
                                                
                                                let status = 'Non payé';
                                                let color: 'success' | 'warning' | 'error' = 'error';
                                                let background = 'linear-gradient(135deg, #ffebee 0%, #ffcdd2 100%)';
                                                let border = '2px solid #f44336';
                                                
                                                if (hasPaidThisMonth && paidAmount >= expectedAmount) {
                                                    status = 'Payé';
                                                    color = 'success';
                                                    background = 'linear-gradient(135deg, #e8f5e9 0%, #c8e6c9 100%)';
                                                    border = '2px solid #4caf50';
                                                } else if (hasPaidThisMonth && paidAmount > 0) {
                                                    status = 'Partiel';
                                                    color = 'warning';
                                                    background = 'linear-gradient(135deg, #fff3e0 0%, #ffcc02 100%)';
                                                    border = '2px solid #ff9800';
                                                }
                                                
                                                return (
                                                    <Grid item xs={6} md={3} key={month.monthNumber}>
                                                        <Card sx={{ 
                                                            p: 2, 
                                                            textAlign: 'center',
                                                            background: background,
                                                            border: border
                                                        }}>
                                                            <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 1 }}>
                                                                {month.month} {month.year}
                                                            </Typography>
                                                            <Typography variant="h6" sx={{ fontWeight: 'bold', color: 'primary.main', mb: 1 }}>
                                                                {expectedAmount.toLocaleString('fr-FR')} FCFA
                                                            </Typography>
                                                            <Chip 
                                                                label={status} 
                                                                color={color}
                                                                size="small"
                                                                sx={{ fontWeight: 500 }}
                                                            />
                                                            {paidAmount > 0 && (
                                                                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
                                                                    Payé: {paidAmount.toLocaleString('fr-FR')} FCFA
                                                                </Typography>
                                                            )}
                                                        </Card>
                                                    </Grid>
                                                );
                                            })}
                                        </Grid>
                                    </CardContent>
                                </Card>
                            </Box>
                        )}
                    </DialogContent>
                    <DialogActions>
                        <Button onClick={() => setShowStudentDetails(false)} color="secondary">
                            Fermer
                        </Button>
                    </DialogActions>
                </Dialog>

                <Snackbar
                    open={snackbar.open}
                    autoHideDuration={6000}
                    onClose={() => setSnackbar({ ...snackbar, open: false })}
                >
                    <Alert onClose={() => setSnackbar({ ...snackbar, open: false })} severity={snackbar.severity}>
                        {snackbar.message}
                    </Alert>
                </Snackbar>

                {/* Modal Historique des reçus */}
                <Dialog 
                    open={receiptHistoryOpen} 
                    onClose={handleReceiptHistoryClose}
                    maxWidth="md"
                    fullWidth
                >
                    <DialogTitle>
                        Historique des reçus - {selectedStudentForHistory?.first_name} {selectedStudentForHistory?.last_name}
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
        </Box>
    );
};

export default Cantine; 

