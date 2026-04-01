import React, { useState, useEffect } from 'react';
import axios from 'axios';
import * as XLSX from 'xlsx';
import {
    Box,
    Typography,
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
    Chip,
    Alert,
    Snackbar,
    CircularProgress,
    Card,
    CardContent,
    Grid,
    Avatar,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    IconButton,
    Tooltip
} from '@mui/material';
import SecretarySidebar from '../../components/SecretarySidebar';
import {
    ExpandMore as ExpandMoreIcon,
    Receipt as ReceiptIcon,
    CheckCircle as CheckCircleIcon,
    Warning as WarningIcon,
    Schedule as ScheduleIcon,
    School as SchoolIcon,
    Class as ClassIcon,
    Person as PersonIcon,
    ArrowBack as ArrowBackIcon,
    TrendingUp as TrendingUpIcon,
    AccountBalance as AccountBalanceIcon,
    Print as PrintIcon,
    Assessment as AssessmentIcon,
    FilterList as FilterListIcon,
    TableChart as TableChartIcon
} from '@mui/icons-material';

interface Student {
    id: number;
    first_name: string;
    last_name: string;
    registration_number: string;
    education_level_name: string;
    class_name: string;
    class_id: number;
    education_level_id: number;
}

interface EducationLevel {
    id: number;
    name: string;
    classes: Class[];
}

interface Class {
    id: number;
    name: string;
    students: Student[];
}

interface Installment {
    id: number;
    installment_number: number;
    amount: number;
    due_date: string;
    level_due_date: string;
    percentage: number;
    status: 'pending' | 'paid' | 'overdue' | 'cancelled';
    total_amount: number;
    amount_paid: number;
    balance: number;
    is_overdue: boolean;
    last_payment_date: string | null;
    level_name: string;
}

interface Payment {
    id: number;
    amount_paid: number;
    payment_date: string;
    payment_method: string;
    status: string;
    description: string;
    first_name: string;
    last_name: string;
}

interface OverdueStudent {
    id: number;
    first_name: string;
    last_name: string;
    registration_number: string;
    class_name: string;
    education_level_name: string;
    total_overdue_amount: number | string;
    overdue_installments_count: number;
    last_payment_date: string | null;
}

const StudentInstallments: React.FC = () => {
    const [students, setStudents] = useState<Student[]>([]);
    const [educationLevels, setEducationLevels] = useState<EducationLevel[]>([]);
    const [selectedLevel, setSelectedLevel] = useState<EducationLevel | null>(null);
    const [selectedClass, setSelectedClass] = useState<Class | null>(null);
    const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
    const [installments, setInstallments] = useState<Installment[]>([]);
    const [payments, setPayments] = useState<Payment[]>([]);
    const [loading, setLoading] = useState(true);
    const [openHistoryDialog, setOpenHistoryDialog] = useState(false);
    const [selectedInstallment, setSelectedInstallment] = useState<Installment | null>(null);
    const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' as 'success' | 'error' });
    
    // Nouveaux états pour le sélecteur d'année et les rapports
    const [selectedSchoolYear, setSelectedSchoolYear] = useState('2025-2026');
    const [overdueStudents, setOverdueStudents] = useState<OverdueStudent[]>([]);
    const [openOverdueDialog, setOpenOverdueDialog] = useState(false);
    const [overdueFilter, setOverdueFilter] = useState<'all' | 'level' | 'class'>('all');
    const [loadingOverdue, setLoadingOverdue] = useState(false);

    useEffect(() => {
        fetchStudents();
    }, [selectedSchoolYear]);

    // Mise à jour automatique des jours restants toutes les minutes
    useEffect(() => {
        const interval = setInterval(() => {
            // Force un re-render pour mettre à jour les jours restants
            setInstallments(prevInstallments => [...prevInstallments]);
        }, 60000); // 60 secondes

        return () => clearInterval(interval);
    }, []);


    const fetchStudents = async () => {
        try {
            setLoading(true);
            const response = await axios.get('https://saintefamilleexcellence.ci/api/students', {
                headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
                params: { school_year: selectedSchoolYear }
            });
            console.log('Response data:', response.data); // Debug log
            
            const studentsData = response.data || [];
            setStudents(studentsData);
            
            // Organiser les données par niveaux et classes
            const levelsMap = new Map<number, EducationLevel>();
            
            studentsData.forEach((student: Student) => {
                const levelId = student.education_level_id;
                const classId = student.class_id;
                
                if (!levelsMap.has(levelId)) {
                    levelsMap.set(levelId, {
                        id: levelId,
                        name: student.education_level_name,
                        classes: []
                    });
                }
                
                const level = levelsMap.get(levelId)!;
                let classObj = level.classes.find(c => c.id === classId);
                
                if (!classObj) {
                    classObj = {
                        id: classId,
                        name: student.class_name,
                        students: []
                    };
                    level.classes.push(classObj);
                }
                
                classObj.students.push(student);
            });
            
            const organizedLevels = Array.from(levelsMap.values());
            setEducationLevels(organizedLevels);
            
        } catch (error) {
            console.error('Erreur lors du chargement des élèves:', error);
            setSnackbar({
                open: true,
                message: 'Erreur lors du chargement des élèves',
                severity: 'error'
            });
            setStudents([]);
            setEducationLevels([]);
        } finally {
            setLoading(false);
        }
    };

    const fetchStudentInstallments = async (studentId: number) => {
        try {
            const response = await axios.get(`https://saintefamilleexcellence.ci/api/installments/student/${studentId}`, {
                headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
                params: { school_year: selectedSchoolYear }
            });
            console.log('Installments response:', response.data); // Debug log
            // L'API retourne { success: true, data: [...] }
            setInstallments(response.data.data || []);
        } catch (error) {
            console.error('Erreur lors du chargement des versements:', error);
            setSnackbar({
                open: true,
                message: 'Erreur lors du chargement des versements',
                severity: 'error'
            });
            setInstallments([]); // S'assurer que installments est toujours un tableau
        }
    };

    const fetchInstallmentPayments = async (installmentId: number) => {
        try {
            const response = await axios.get(`https://saintefamilleexcellence.ci/api/installments/${installmentId}/payments`, {
                headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
            });
            console.log('Payments response:', response.data); // Debug log
            // L'API retourne { success: true, data: [...] }
            setPayments(response.data.data || []);
        } catch (error) {
            console.error('Erreur lors du chargement des paiements:', error);
            setSnackbar({
                open: true,
                message: 'Erreur lors du chargement des paiements',
                severity: 'error'
            });
            setPayments([]); // S'assurer que payments est toujours un tableau
        }
    };

    const handleLevelSelect = (level: EducationLevel) => {
        setSelectedLevel(level);
        setSelectedClass(null);
        setSelectedStudent(null);
        setInstallments([]);
    };

    const handleClassSelect = (classObj: Class) => {
        setSelectedClass(classObj);
        setSelectedStudent(null);
        setInstallments([]);
    };

    const handleStudentSelect = (student: Student) => {
        setSelectedStudent(student);
        fetchStudentInstallments(student.id);
    };


    const handleOpenHistoryDialog = async (installment: Installment) => {
        setSelectedInstallment(installment);
        await fetchInstallmentPayments(installment.id);
        setOpenHistoryDialog(true);
    };

    const handleCloseHistoryDialog = () => {
        setOpenHistoryDialog(false);
        setSelectedInstallment(null);
        setPayments([]);
    };

    // Nouvelles fonctions pour les rapports d'élèves en retard
    const fetchOverdueStudents = async (filter: 'all' | 'level' | 'class', id?: number) => {
        try {
            setLoadingOverdue(true);
            let endpoint = '';
            
            switch (filter) {
                case 'all':
                    endpoint = '/api/reminders/statistics';
                    break;
                case 'level':
                    const levelId = id || selectedLevel?.id;
                    if (!levelId) {
                        throw new Error('ID de niveau non défini');
                    }
                    endpoint = `/api/reminders/level/${levelId}/overdue`;
                    break;
                case 'class':
                    const classId = id || selectedClass?.id;
                    if (!classId) {
                        throw new Error('ID de classe non défini');
                    }
                    endpoint = `/api/reminders/class/${classId}/overdue`;
                    break;
            }

            const response = await axios.get(`https://saintefamilleexcellence.ci${endpoint}`, {
                headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
                params: { school_year: selectedSchoolYear }
            });

            if (filter === 'all') {
                // Pour les statistiques globales, on récupère la liste détaillée
                const detailedResponse = await axios.get('https://saintefamilleexcellence.ci/api/reminders/all-school/overdue', {
                    headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
                    params: { school_year: selectedSchoolYear }
                });
                setOverdueStudents(detailedResponse.data.data || []);
            } else {
                setOverdueStudents(response.data.data || []);
            }
            
            setOpenOverdueDialog(true);
        } catch (error) {
            console.error('Erreur lors du chargement des élèves en retard:', error);
            setSnackbar({
                open: true,
                message: 'Erreur lors du chargement des élèves en retard',
                severity: 'error'
            });
        } finally {
            setLoadingOverdue(false);
        }
    };

    const handlePrintOverdueReport = () => {
        const printWindow = window.open('', '_blank');
        if (!printWindow) return;

        const reportTitle = overdueFilter === 'all' ? 'Toute l\'école' : 
                           overdueFilter === 'level' ? `Niveau: ${selectedLevel?.name}` : 
                           `Classe: ${selectedClass?.name}`;

        const printContent = `
            <!DOCTYPE html>
            <html>
            <head>
                <title>Rapport des Élèves en Retard de Versement - ${reportTitle}</title>
                <style>
                    body { font-family: Arial, sans-serif; margin: 20px; }
                    .header { text-align: center; margin-bottom: 30px; }
                    .header h1 { color: #d32f2f; margin: 0; }
                    .header h2 { color: #666; margin: 5px 0; }
                    .header p { color: #888; margin: 5px 0; }
                    table { width: 100%; border-collapse: collapse; margin-top: 20px; }
                    th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
                    th { background-color: #f5f5f5; font-weight: bold; }
                    .amount { text-align: right; }
                    .overdue { color: #d32f2f; font-weight: bold; }
                    .summary { margin-top: 30px; padding: 15px; background-color: #f9f9f9; border-radius: 5px; }
                    .summary h3 { margin-top: 0; color: #d32f2f; }
                </style>
            </head>
            <body>
                <div class="header">
                    <h1>RAPPORT DES ÉLÈVES EN RETARD DE VERSEMENT</h1>
                    <h2>${reportTitle}</h2>
                    <p>Année scolaire: ${selectedSchoolYear}</p>
                    <p>Date du rapport: ${new Date().toLocaleDateString('fr-FR')}</p>
                </div>
                
                <table>
                    <thead>
                        <tr>
                            <th>N°</th>
                            <th>Nom et Prénom</th>
                            <th>Matricule</th>
                            <th>Classe</th>
                            <th>Niveau</th>
                            <th>Nombre de versements en retard</th>
                            <th>Montant total dû</th>
                            <th>Dernier paiement</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${overdueStudents.map((student, index) => `
                            <tr>
                                <td>${index + 1}</td>
                                <td>${student.first_name} ${student.last_name}</td>
                                <td>${student.registration_number}</td>
                                <td>${student.class_name}</td>
                                <td>${student.education_level_name}</td>
                                <td class="overdue">${student.overdue_installments_count}</td>
                                <td class="amount overdue">${formatCurrency(parseFloat(String(student.total_overdue_amount)) || 0)}</td>
                                <td>${student.last_payment_date ? new Date(student.last_payment_date).toLocaleDateString('fr-FR') : 'Aucun'}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
                
                <div class="summary">
                    <h3>RÉSUMÉ</h3>
                    <p><strong>Nombre total d'élèves en retard:</strong> ${overdueStudents.length}</p>
                    <p><strong>Montant total dû:</strong> <span class="overdue">${formatCurrency(overdueStudents.reduce((sum, student) => {
                        const amount = parseFloat(String(student.total_overdue_amount)) || 0;
                        return sum + (isNaN(amount) ? 0 : amount);
                    }, 0))}</span></p>
                    <p><strong>Nombre total de versements en retard:</strong> ${overdueStudents.reduce((sum, student) => sum + student.overdue_installments_count, 0)}</p>
                </div>
            </body>
            </html>
        `;

        printWindow.document.write(printContent);
        printWindow.document.close();
        printWindow.print();
    };

    const handleExportToExcel = () => {
        const reportTitle = overdueFilter === 'all' ? 'Toute l\'école' : 
                           overdueFilter === 'level' ? `Niveau: ${selectedLevel?.name}` : 
                           `Classe: ${selectedClass?.name}`;

        // Calculer les totaux
        const totalAmount = overdueStudents.reduce((sum, student) => {
            const amount = parseFloat(String(student.total_overdue_amount)) || 0;
            return sum + amount;
        }, 0);
        
        const totalInstallments = overdueStudents.reduce((sum, student) => sum + student.overdue_installments_count, 0);

        // Trier les élèves par ordre alphabétique (nom puis prénom)
        const sortedStudents = [...overdueStudents].sort((a, b) => {
            const nameA = `${a.last_name} ${a.first_name}`.toLowerCase();
            const nameB = `${b.last_name} ${b.first_name}`.toLowerCase();
            return nameA.localeCompare(nameB, 'fr');
        });

        // Créer un tableau de données complet avec en-têtes et métadonnées
        const allData = [
            // Métadonnées
            [`RAPPORT DES ÉLÈVES EN RETARD DE VERSEMENT`],
            [`${reportTitle} - ${selectedSchoolYear}`],
            [`Date du rapport: ${new Date().toLocaleDateString('fr-FR')}`],
            [``], // Ligne vide
            [`RÉSUMÉ:`],
            [`Nombre d'élèves en retard: ${overdueStudents.length}`],
            [`Montant total dû: ${totalAmount.toLocaleString('fr-FR')} F CFA`],
            [`Versements en retard: ${totalInstallments}`],
            [``], // Ligne vide
            [`DÉTAIL DES ÉLÈVES:`],
            [``], // Ligne vide
            // En-têtes du tableau (nouvel ordre)
            ['N°', 'Matricule', 'Nom', 'Prénom', 'Classe', 'Niveau', 'Versements en retard', 'Montant dû (F CFA)', 'Dernier paiement'],
            // Données des élèves triées
            ...sortedStudents.map((student, index) => [
                index + 1,
                student.registration_number,
                student.last_name,
                student.first_name,
                student.class_name,
                student.education_level_name,
                student.overdue_installments_count,
                parseFloat(String(student.total_overdue_amount)) || 0,
                student.last_payment_date ? new Date(student.last_payment_date).toLocaleDateString('fr-FR') : 'Aucun'
            ])
        ];

        // Créer un nouveau workbook
        const workbook = XLSX.utils.book_new();
        
        // Créer la feuille avec toutes les données
        const worksheet = XLSX.utils.aoa_to_sheet(allData);
        
        // Ajuster la largeur des colonnes (nouvel ordre)
        const colWidths = [
            { wch: 5 },   // N°
            { wch: 12 },  // Matricule
            { wch: 15 },  // Nom
            { wch: 20 },  // Prénom
            { wch: 15 },  // Classe
            { wch: 20 },  // Niveau
            { wch: 18 },  // Versements en retard
            { wch: 15 },  // Montant dû
            { wch: 15 }   // Dernier paiement
        ];
        worksheet['!cols'] = colWidths;
        
        // Ajouter la feuille au workbook
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Élèves en Retard');
        
        // Générer le nom du fichier
        const fileName = `Rapport_Retards_${reportTitle.replace(/[^a-zA-Z0-9]/g, '_')}_${selectedSchoolYear}_${new Date().toISOString().split('T')[0]}.xlsx`;
        
        // Télécharger le fichier
        XLSX.writeFile(workbook, fileName);
        
        // Afficher une notification de succès
        setSnackbar({
            open: true,
            message: 'Fichier Excel téléchargé avec succès',
            severity: 'success'
        });
    };


    const getStatusIcon = (status: string, isOverdue: boolean) => {
        if (isOverdue) return <WarningIcon color="error" />;
        switch (status) {
            case 'paid': return <CheckCircleIcon color="success" />;
            case 'pending': return <ScheduleIcon color="warning" />;
            default: return <ScheduleIcon color="disabled" />;
        }
    };

    const getStatusColor = (status: string, isOverdue: boolean) => {
        if (isOverdue) return 'error';
        switch (status) {
            case 'paid': return 'success';
            case 'pending': return 'warning';
            default: return 'default';
        }
    };

    const formatCurrency = (amount: number | null | undefined) => {
        // Vérifier si le montant est valide
        if (amount === null || amount === undefined || isNaN(amount)) {
            return '0 F CFA';
        }
        return new Intl.NumberFormat('fr-FR', {
            style: 'currency',
            currency: 'XOF',
            minimumFractionDigits: 0
        }).format(amount);
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('fr-FR');
    };

    const calculateDaysUntilDue = (dueDate: string) => {
        if (!dueDate) return { message: 'Date non définie', color: '#666' };
        
        const today = new Date();
        const due = new Date(dueDate);
        today.setHours(0, 0, 0, 0);
        due.setHours(0, 0, 0, 0);
        
        const diffTime = due.getTime() - today.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        if (diffDays < 0) {
            return {
                message: `${Math.abs(diffDays)} jour(s) en retard`,
                color: '#d32f2f'
            };
        } else if (diffDays === 0) {
            return {
                message: "Échéance aujourd'hui",
                color: '#f57c00'
            };
        } else if (diffDays <= 7) {
            return {
                message: `${diffDays} jour(s) restant(s)`,
                color: '#f57c00'
            };
        } else {
            return {
                message: `${diffDays} jour(s) restant(s)`,
                color: '#2e7d32'
            };
        }
    };

    if (loading) {
        return (
            <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
                <CircularProgress />
            </Box>
        );
    }

    return (
        <Box sx={{ 
            display: 'flex',
            minHeight: '100vh',
            background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)'
        }}>
            <SecretarySidebar />
            <Box component="main" sx={{ 
                flexGrow: 1, 
                p: 3, 
                width: 'calc(100% - 250px)',
                background: 'transparent'
            }}>
                {/* En-tête stylisé */}
                <Box sx={{
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    borderRadius: 3,
                    p: 3,
                    mb: 4,
                    color: 'white',
                    boxShadow: '0 8px 32px rgba(0,0,0,0.1)'
                }}>
                    <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                        <Box>
                            <Typography variant="h4" component="h1" display="flex" alignItems="center" gap={2} mb={1}>
                                <Avatar sx={{ bgcolor: 'rgba(255,255,255,0.2)' }}>
                                    <AccountBalanceIcon />
                                </Avatar>
                                Consultation des Versements des Élèves
                            </Typography>
                            <Typography variant="subtitle1" sx={{ opacity: 0.9 }}>
                                Consultez les versements et l'historique des paiements par niveaux, classes et élèves
                            </Typography>
                        </Box>
                        
                        {/* Sélecteur d'année scolaire et boutons de rapport */}
                        <Box display="flex" alignItems="center" gap={2}>
                            <FormControl size="small" sx={{ minWidth: 150 }}>
                                <InputLabel sx={{ color: 'white' }}>Année scolaire</InputLabel>
                                <Select
                                    value={selectedSchoolYear}
                                    onChange={(e) => setSelectedSchoolYear(e.target.value)}
                                    sx={{ 
                                        color: 'white',
                                        '& .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255,255,255,0.3)' },
                                        '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255,255,255,0.5)' },
                                        '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: 'white' }
                                    }}
                                >
                                    <MenuItem value="2024-2025">2024-2025</MenuItem>
                                    <MenuItem value="2025-2026">2025-2026</MenuItem>
                                    <MenuItem value="2026-2027">2026-2027</MenuItem>
                                </Select>
                            </FormControl>
                            
                            <Tooltip title="Rapport des élèves en retard - Toute l'école">
                                <Button
                                    variant="outlined"
                                    startIcon={<AssessmentIcon />}
                                    onClick={() => {
                                        setOverdueFilter('all');
                                        fetchOverdueStudents('all');
                                    }}
                                    sx={{
                                        borderColor: 'rgba(255,255,255,0.5)',
                                        color: 'white',
                                        '&:hover': {
                                            borderColor: 'white',
                                            backgroundColor: 'rgba(255,255,255,0.1)'
                                        }
                                    }}
                                >
                                    Retards
                                </Button>
                            </Tooltip>
                        </Box>
                    </Box>
                </Box>

                {/* Navigation par étapes - Affichage conditionnel */}
                {!selectedLevel ? (
                    // ÉTAPE 1: Affichage des niveaux sur toute la page
                    <Grid container spacing={3}>
                        <Grid item xs={12}>
                            <Card sx={{
                                borderRadius: 3,
                                boxShadow: '0 8px 32px rgba(0,0,0,0.1)',
                                background: 'linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%)',
                                border: '1px solid rgba(255,255,255,0.2)'
                            }}>
                                <CardContent sx={{ p: 4 }}>
                                    <Box sx={{
                                        background: 'linear-gradient(135deg, #ff9a9e 0%, #fecfef 100%)',
                                        borderRadius: 2,
                                        p: 3,
                                        mb: 4,
                                        color: 'white',
                                        textAlign: 'center'
                                    }}>
                                        <Typography variant="h4" display="flex" alignItems="center" justifyContent="center" gap={2}>
                                            <SchoolIcon sx={{ fontSize: 40 }} />
                                            Sélectionnez un Niveau d'Étude
                                        </Typography>
                                        <Typography variant="subtitle1" sx={{ mt: 1, opacity: 0.9 }}>
                                            Choisissez le niveau pour voir ses classes et gérer les versements
                                        </Typography>
                                    </Box>
                                    
                                    <Grid container spacing={3}>
                                        {educationLevels.map((level, index) => (
                                            <Grid item xs={12} sm={6} md={4} lg={3} key={level.id}>
                                                <Box
                                                    sx={{
                                                        background: `linear-gradient(135deg, ${index % 4 === 0 ? '#ffecd2 0%, #fcb69f 100%' : 
                                                                    index % 4 === 1 ? '#a8edea 0%, #fed6e3 100%' :
                                                                    index % 4 === 2 ? '#d299c2 0%, #fef9d7 100%' : '#89f7fe 0%, #66a6ff 100%'})`,
                                                        borderRadius: 3,
                                                        p: 3,
                                                        cursor: 'pointer',
                                                        transition: 'all 0.3s ease',
                                                        border: '1px solid rgba(255,255,255,0.3)',
                                                        boxShadow: '0 4px 15px rgba(0,0,0,0.1)',
                                                        height: '200px',
                                                        display: 'flex',
                                                        flexDirection: 'column',
                                                        justifyContent: 'center',
                                                        alignItems: 'center',
                                                        textAlign: 'center',
                                                        '&:hover': { 
                                                            transform: 'translateY(-5px)',
                                                            boxShadow: '0 12px 30px rgba(0,0,0,0.2)'
                                                        }
                                                    }}
                                                    onClick={() => handleLevelSelect(level)}
                                                >
                                                    <Avatar sx={{ 
                                                        bgcolor: 'rgba(255,255,255,0.3)',
                                                        color: '#333',
                                                        width: 60,
                                                        height: 60,
                                                        mb: 2
                                                    }}>
                                                        <SchoolIcon sx={{ fontSize: 30 }} />
                                                    </Avatar>
                                                    <Typography variant="h6" fontWeight="bold" sx={{ color: '#333', mb: 1 }}>
                                                        {level.name}
                                                    </Typography>
                                                    <Typography variant="body2" sx={{ color: '#666', mb: 1 }}>
                                                        {level.classes.length} classe(s)
                                                    </Typography>
                                                    <Button
                                                        size="small"
                                                        variant="outlined"
                                                        startIcon={<AssessmentIcon />}
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setOverdueFilter('level');
                                                            setSelectedLevel(level);
                                                            fetchOverdueStudents('level', level.id);
                                                        }}
                                                        sx={{
                                                            borderColor: 'rgba(255,255,255,0.5)',
                                                            color: '#333',
                                                            fontSize: '0.7rem',
                                                            py: 0.5,
                                                            px: 1,
                                                            '&:hover': {
                                                                borderColor: '#333',
                                                                backgroundColor: 'rgba(255,255,255,0.2)'
                                                            }
                                                        }}
                                                    >
                                                        Retards
                                                    </Button>
                                                </Box>
                                            </Grid>
                                        ))}
                                    </Grid>
                                </CardContent>
                            </Card>
                        </Grid>
                    </Grid>
                ) : !selectedClass ? (
                    // ÉTAPE 2: Affichage des classes du niveau sélectionné sur toute la page
                    <Grid container spacing={3}>
                        <Grid item xs={12}>
                            <Card sx={{
                                borderRadius: 3,
                                boxShadow: '0 8px 32px rgba(0,0,0,0.1)',
                                background: 'linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%)',
                                border: '1px solid rgba(255,255,255,0.2)'
                            }}>
                                <CardContent sx={{ p: 4 }}>
                                    <Box sx={{
                                        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                                        borderRadius: 2,
                                        p: 3,
                                        mb: 4,
                                        color: 'white',
                                        textAlign: 'center'
                                    }}>
                                        <Box display="flex" alignItems="center" justifyContent="space-between">
                                            <Button 
                                                startIcon={<ArrowBackIcon />}
                                                onClick={() => {
                                                    setSelectedLevel(null);
                                                    setSelectedClass(null);
                                                    setSelectedStudent(null);
                                                }}
                                                sx={{
                                                    background: 'rgba(255,255,255,0.2)',
                                                    color: 'white',
                                                    borderRadius: 2,
                                                    px: 2,
                                                    py: 1,
                                                    '&:hover': {
                                                        background: 'rgba(255,255,255,0.3)',
                                                    }
                                                }}
                                            >
                                                Retour aux niveaux
                                            </Button>
                                            <Box>
                                                <Typography variant="h4" display="flex" alignItems="center" justifyContent="center" gap={2}>
                                                    <ClassIcon sx={{ fontSize: 40 }} />
                                                    Classes du Niveau : {selectedLevel.name}
                                                </Typography>
                                                <Typography variant="subtitle1" sx={{ mt: 1, opacity: 0.9 }}>
                                                    Sélectionnez une classe pour voir ses élèves
                                                </Typography>
                                            </Box>
                                            <Box sx={{ width: 120 }}></Box> {/* Espaceur pour centrer */}
                                        </Box>
                                    </Box>
                                    
                                    <Grid container spacing={3}>
                                        {selectedLevel.classes.map((classObj, index) => (
                                            <Grid item xs={12} sm={6} md={4} lg={3} key={classObj.id}>
                                                <Box
                                                    sx={{
                                                        background: `linear-gradient(135deg, ${index % 4 === 0 ? '#d299c2 0%, #fef9d7 100%' : 
                                                                    index % 4 === 1 ? '#89f7fe 0%, #66a6ff 100%' :
                                                                    index % 4 === 2 ? '#ffecd2 0%, #fcb69f 100%' : '#a8edea 0%, #fed6e3 100%'})`,
                                                        borderRadius: 3,
                                                        p: 3,
                                                        cursor: 'pointer',
                                                        transition: 'all 0.3s ease',
                                                        border: '1px solid rgba(255,255,255,0.3)',
                                                        boxShadow: '0 4px 15px rgba(0,0,0,0.1)',
                                                        height: '200px',
                                                        display: 'flex',
                                                        flexDirection: 'column',
                                                        justifyContent: 'center',
                                                        alignItems: 'center',
                                                        textAlign: 'center',
                                                        '&:hover': { 
                                                            transform: 'translateY(-5px)',
                                                            boxShadow: '0 12px 30px rgba(0,0,0,0.2)'
                                                        }
                                                    }}
                                                    onClick={() => handleClassSelect(classObj)}
                                                >
                                                    <Avatar sx={{ 
                                                        bgcolor: 'rgba(255,255,255,0.3)',
                                                        color: '#333',
                                                        width: 60,
                                                        height: 60,
                                                        mb: 2
                                                    }}>
                                                        <ClassIcon sx={{ fontSize: 30 }} />
                                                    </Avatar>
                                                    <Typography variant="h6" fontWeight="bold" sx={{ color: '#333', mb: 1 }}>
                                                        {classObj.name}
                                                    </Typography>
                                                    <Typography variant="body2" sx={{ color: '#666', mb: 1 }}>
                                                        {classObj.students.length} élève(s)
                                                    </Typography>
                                                    <Button
                                                        size="small"
                                                        variant="outlined"
                                                        startIcon={<AssessmentIcon />}
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setOverdueFilter('class');
                                                            setSelectedClass(classObj);
                                                            fetchOverdueStudents('class', classObj.id);
                                                        }}
                                                        sx={{
                                                            borderColor: 'rgba(255,255,255,0.5)',
                                                            color: '#333',
                                                            fontSize: '0.7rem',
                                                            py: 0.5,
                                                            px: 1,
                                                            '&:hover': {
                                                                borderColor: '#333',
                                                                backgroundColor: 'rgba(255,255,255,0.2)'
                                                            }
                                                        }}
                                                    >
                                                        Retards
                                                    </Button>
                                                </Box>
                                            </Grid>
                                        ))}
                                    </Grid>
                                </CardContent>
                            </Card>
                        </Grid>
                    </Grid>
                ) : !selectedStudent ? (
                    // ÉTAPE 3: Affichage des élèves de la classe sélectionnée sur toute la page
                    <Grid container spacing={3}>
                        <Grid item xs={12}>
                            <Card sx={{
                                borderRadius: 3,
                                boxShadow: '0 8px 32px rgba(0,0,0,0.1)',
                                background: 'linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%)',
                                border: '1px solid rgba(255,255,255,0.2)'
                            }}>
                                <CardContent sx={{ p: 4 }}>
                                    <Box sx={{
                                        background: 'linear-gradient(135deg, #ff9a9e 0%, #fecfef 100%)',
                                        borderRadius: 2,
                                        p: 3,
                                        mb: 4,
                                        color: 'white',
                                        textAlign: 'center'
                                    }}>
                                        <Box display="flex" alignItems="center" justifyContent="space-between">
                                            <Button 
                                                startIcon={<ArrowBackIcon />}
                                                onClick={() => {
                                                    setSelectedClass(null);
                                                    setSelectedStudent(null);
                                                }}
                                                sx={{
                                                    background: 'rgba(255,255,255,0.2)',
                                                    color: 'white',
                                                    borderRadius: 2,
                                                    px: 2,
                                                    py: 1,
                                                    '&:hover': {
                                                        background: 'rgba(255,255,255,0.3)',
                                                    }
                                                }}
                                            >
                                                Retour aux classes
                                            </Button>
                                            <Box>
                                                <Typography variant="h4" display="flex" alignItems="center" justifyContent="center" gap={2}>
                                                    <PersonIcon sx={{ fontSize: 40 }} />
                                                    Élèves de la Classe : {selectedClass.name}
                                                </Typography>
                                                <Typography variant="subtitle1" sx={{ mt: 1, opacity: 0.9 }}>
                                                    Sélectionnez un élève pour voir ses versements
                                                </Typography>
                                            </Box>
                                            <Box sx={{ width: 120 }}></Box> {/* Espaceur pour centrer */}
                                        </Box>
                                    </Box>
                                    
                                    <Grid container spacing={3}>
                                        {selectedClass.students.map((student, index) => (
                                            <Grid item xs={12} sm={6} md={4} lg={3} key={student.id}>
                                                <Box
                                                    sx={{
                                                        background: `linear-gradient(135deg, ${index % 4 === 0 ? '#ffecd2 0%, #fcb69f 100%' : 
                                                                    index % 4 === 1 ? '#a8edea 0%, #fed6e3 100%' :
                                                                    index % 4 === 2 ? '#d299c2 0%, #fef9d7 100%' : '#89f7fe 0%, #66a6ff 100%'})`,
                                                        borderRadius: 3,
                                                        p: 3,
                                                        cursor: 'pointer',
                                                        transition: 'all 0.3s ease',
                                                        border: '1px solid rgba(255,255,255,0.3)',
                                                        boxShadow: '0 4px 15px rgba(0,0,0,0.1)',
                                                        height: '200px',
                                                        display: 'flex',
                                                        flexDirection: 'column',
                                                        justifyContent: 'center',
                                                        alignItems: 'center',
                                                        textAlign: 'center',
                                                        '&:hover': { 
                                                            transform: 'translateY(-5px)',
                                                            boxShadow: '0 12px 30px rgba(0,0,0,0.2)'
                                                        }
                                                    }}
                                                    onClick={() => handleStudentSelect(student)}
                                                >
                                                    <Avatar sx={{ 
                                                        bgcolor: 'rgba(255,255,255,0.3)',
                                                        color: '#333',
                                                        width: 60,
                                                        height: 60,
                                                        mb: 2
                                                    }}>
                                                        <PersonIcon sx={{ fontSize: 30 }} />
                                                    </Avatar>
                                                    <Typography variant="h6" fontWeight="bold" sx={{ color: '#333', mb: 1 }}>
                                                        {student.first_name} {student.last_name}
                                                    </Typography>
                                                    <Typography variant="body2" sx={{ color: '#666' }}>
                                                        {student.registration_number}
                                                    </Typography>
                                                </Box>
                                            </Grid>
                                        ))}
                                    </Grid>
                                </CardContent>
                            </Card>
                        </Grid>
                    </Grid>
                ) : (
                    // ÉTAPE 4: Affichage des versements de l'élève sélectionné sur toute la page
                    <Grid container spacing={3}>
                        <Grid item xs={12}>
                            <Card sx={{
                                borderRadius: 3,
                                boxShadow: '0 8px 32px rgba(0,0,0,0.1)',
                                background: 'linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%)',
                                border: '1px solid rgba(255,255,255,0.2)'
                            }}>
                                <CardContent sx={{ p: 4 }}>
                                    <Box sx={{
                                        background: 'linear-gradient(135deg, #4caf50 0%, #45a049 100%)',
                                        borderRadius: 2,
                                        p: 3,
                                        mb: 4,
                                        color: 'white',
                                        textAlign: 'center'
                                    }}>
                                        <Box display="flex" alignItems="center" justifyContent="space-between">
                                            <Button 
                                                startIcon={<ArrowBackIcon />}
                                                onClick={() => {
                                                    setSelectedStudent(null);
                                                }}
                                                sx={{
                                                    background: 'rgba(255,255,255,0.2)',
                                                    color: 'white',
                                                    borderRadius: 2,
                                                    px: 2,
                                                    py: 1,
                                                    '&:hover': {
                                                        background: 'rgba(255,255,255,0.3)',
                                                    }
                                                }}
                                            >
                                                Retour aux élèves
                                            </Button>
                                            <Box>
                                                <Typography variant="h4" display="flex" alignItems="center" justifyContent="center" gap={2}>
                                                    <ReceiptIcon sx={{ fontSize: 40 }} />
                                                    Versements de {selectedStudent.first_name} {selectedStudent.last_name}
                                                </Typography>
                                                <Typography variant="subtitle1" sx={{ mt: 1, opacity: 0.9 }}>
                                                    Consultez les versements et l'historique des paiements
                                                </Typography>
                                            </Box>
                                            <Box sx={{ width: 120 }}></Box> {/* Espaceur pour centrer */}
                                        </Box>
                                    </Box>
                                
                                    {installments.length > 0 ? (
                                        <TableContainer component={Paper} variant="outlined" sx={{
                                            borderRadius: 2,
                                            boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
                                            overflow: 'hidden'
                                        }}>
                                            <Table>
                                                <TableHead sx={{
                                                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
                                                }}>
                                                    <TableRow>
                                                        <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Versement</TableCell>
                                                        <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Montant</TableCell>
                                                        <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Échéance</TableCell>
                                                        <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Statut</TableCell>
                                                        <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Payé</TableCell>
                                                        <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Solde</TableCell>
                                                        <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Actions</TableCell>
                                                    </TableRow>
                                                </TableHead>
                                                <TableBody>
                                                    {installments.map((installment, index) => (
                                                        <TableRow 
                                                            key={installment.id}
                                                            sx={{
                                                                background: index % 2 === 0 ? 'rgba(255,255,255,0.5)' : 'rgba(248,249,250,0.5)',
                                                                '&:hover': {
                                                                    background: 'linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%)',
                                                                    transform: 'scale(1.01)',
                                                                    transition: 'all 0.2s ease'
                                                                }
                                                            }}
                                                        >
                                                            <TableCell>
                                                                <Box>
                                                                    <Typography variant="subtitle2" fontWeight="bold" sx={{ color: '#333' }}>
                                                                        Versement {installment.installment_number}
                                                                    </Typography>
                                                                    <Typography variant="caption" sx={{ 
                                                                        color: '#666',
                                                                        background: 'linear-gradient(135deg, #e3f2fd 0%, #bbdefb 100%)',
                                                                        px: 1,
                                                                        py: 0.5,
                                                                        borderRadius: 1,
                                                                        display: 'inline-block'
                                                                    }}>
                                                                        {installment.percentage}% - {installment.level_name}
                                                                    </Typography>
                                                                </Box>
                                                            </TableCell>
                                                            <TableCell>
                                                                <Typography variant="subtitle2" fontWeight="bold" sx={{ color: '#2e7d32' }}>
                                                                    {formatCurrency(installment.total_amount)}
                                                                </Typography>
                                                            </TableCell>
                                                            <TableCell>
                                                                <Box>
                                                                    <Typography variant="body2" sx={{ color: '#666' }}>
                                                                        {(() => {
                                                                            const dueDate = installment.level_due_date || installment.due_date;
                                                                            return dueDate ? formatDate(dueDate) : 'Non définie';
                                                                        })()}
                                                                    </Typography>
                                                                    <Typography variant="caption" sx={{ 
                                                                        color: (() => {
                                                                            const dateToUse = installment.level_due_date || installment.due_date;
                                                                            return dateToUse ? calculateDaysUntilDue(dateToUse).color : '#666';
                                                                        })(),
                                                                        fontWeight: 'bold',
                                                                        display: 'block',
                                                                        mt: 0.5
                                                                    }}>
                                                                        {(() => {
                                                                            const dateToUse = installment.level_due_date || installment.due_date;
                                                                            return dateToUse ? calculateDaysUntilDue(dateToUse).message : 'Non définie';
                                                                        })()}
                                                                    </Typography>
                                                                </Box>
                                                            </TableCell>
                                                            <TableCell>
                                                                <Chip
                                                                    icon={getStatusIcon(installment.status, installment.is_overdue)}
                                                                    label={installment.status}
                                                                    color={getStatusColor(installment.status, installment.is_overdue)}
                                                                    size="small"
                                                                    sx={{
                                                                        borderRadius: 2,
                                                                        fontWeight: 'bold'
                                                                    }}
                                                                />
                                                            </TableCell>
                                                            <TableCell>
                                                                <Typography variant="subtitle2" fontWeight="bold" sx={{ color: '#1976d2' }}>
                                                                    {formatCurrency(installment.amount_paid)}
                                                                </Typography>
                                                            </TableCell>
                                                            <TableCell>
                                                                <Typography
                                                                    variant="subtitle2"
                                                                    fontWeight="bold"
                                                                    sx={{ 
                                                                        color: installment.balance > 0 ? '#d32f2f' : '#2e7d32',
                                                                        background: installment.balance > 0 
                                                                            ? 'linear-gradient(135deg, #ffebee 0%, #ffcdd2 100%)'
                                                                            : 'linear-gradient(135deg, #e8f5e8 0%, #c8e6c9 100%)',
                                                                        px: 1,
                                                                        py: 0.5,
                                                                        borderRadius: 1,
                                                                        display: 'inline-block'
                                                                    }}
                                                                >
                                                                    {formatCurrency(installment.balance)}
                                                                </Typography>
                                                            </TableCell>
                                                            <TableCell>
                                                                <Button
                                                                    size="small"
                                                                    variant="outlined"
                                                                    startIcon={<ReceiptIcon />}
                                                                    onClick={() => handleOpenHistoryDialog(installment)}
                                                                    sx={{
                                                                        borderColor: '#667eea',
                                                                        color: '#667eea',
                                                                        borderRadius: 2,
                                                                        textTransform: 'none',
                                                                        fontWeight: 'bold',
                                                                        '&:hover': {
                                                                            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                                                                            color: 'white',
                                                                            borderColor: 'transparent'
                                                                        }
                                                                    }}
                                                                >
                                                                    Historique
                                                                </Button>
                                                            </TableCell>
                                                        </TableRow>
                                                    ))}
                                                </TableBody>
                                            </Table>
                                        </TableContainer>
                                    ) : (
                                        <Box sx={{
                                            background: 'linear-gradient(135deg, #e3f2fd 0%, #bbdefb 100%)',
                                            borderRadius: 2,
                                            p: 3,
                                            textAlign: 'center'
                                        }}>
                                            <Typography variant="h6" color="primary" mb={1}>
                                                📋 Aucun versement configuré
                                            </Typography>
                                            <Typography variant="body2" color="text.secondary">
                                                Aucun versement n'est configuré pour cet élève.
                                            </Typography>
                                        </Box>
                                    )}
                                </CardContent>
                            </Card>
                        </Grid>
                    </Grid>
                )}


                {/* Dialog pour afficher l'historique des paiements */}
                <Dialog 
                    open={openHistoryDialog} 
                    onClose={handleCloseHistoryDialog} 
                    maxWidth="md" 
                    fullWidth
                    PaperProps={{
                        sx: {
                            borderRadius: 3,
                            boxShadow: '0 20px 60px rgba(0,0,0,0.2)'
                        }
                    }}
                >
                    <DialogTitle sx={{
                        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                        color: 'white',
                        borderRadius: '12px 12px 0 0'
                    }}>
                        <Box display="flex" alignItems="center" gap={2}>
                            <Avatar sx={{ bgcolor: 'rgba(255,255,255,0.2)' }}>
                                <ReceiptIcon />
                            </Avatar>
                            Historique des Paiements - Versement {selectedInstallment?.installment_number}
                        </Box>
                    </DialogTitle>
                    <DialogContent sx={{ p: 3 }}>
                        {selectedInstallment && (
                            <Box>
                                <Box sx={{
                                    background: 'linear-gradient(135deg, #e3f2fd 0%, #bbdefb 100%)',
                                    borderRadius: 2,
                                    p: 2,
                                    mb: 3
                                }}>
                                    <Typography variant="subtitle1" fontWeight="bold" color="primary">
                                        Versement {selectedInstallment.installment_number}
                                    </Typography>
                                    <Typography variant="body2" color="text.secondary">
                                        Montant total: <strong>{formatCurrency(selectedInstallment.total_amount)}</strong>
                                    </Typography>
                                </Box>
                                
                                {payments.length > 0 ? (
                                    <TableContainer component={Paper} variant="outlined" sx={{
                                        borderRadius: 2,
                                        boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
                                        overflow: 'hidden'
                                    }}>
                                        <Table>
                                            <TableHead sx={{
                                                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
                                            }}>
                                                <TableRow>
                                                    <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Date</TableCell>
                                                    <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Montant</TableCell>
                                                    <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Méthode</TableCell>
                                                    <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Description</TableCell>
                                                    <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Statut</TableCell>
                                                </TableRow>
                                            </TableHead>
                                            <TableBody>
                                                {payments.map((payment, index) => (
                                                    <TableRow 
                                                        key={payment.id}
                                                        sx={{
                                                            background: index % 2 === 0 ? 'rgba(255,255,255,0.5)' : 'rgba(248,249,250,0.5)',
                                                            '&:hover': {
                                                                background: 'linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%)',
                                                            }
                                                        }}
                                                    >
                                                        <TableCell>
                                                            <Typography variant="body2" sx={{ color: '#666' }}>
                                                                {formatDate(payment.payment_date)}
                                                            </Typography>
                                                        </TableCell>
                                                        <TableCell>
                                                            <Typography variant="subtitle2" fontWeight="bold" sx={{ color: '#2e7d32' }}>
                                                                {formatCurrency(payment.amount_paid)}
                                                            </Typography>
                                                        </TableCell>
                                                        <TableCell>
                                                            <Typography variant="body2" sx={{ color: '#666' }}>
                                                                {payment.payment_method}
                                                            </Typography>
                                                        </TableCell>
                                                        <TableCell>
                                                            <Typography variant="body2" sx={{ color: '#666' }}>
                                                                {payment.description || '-'}
                                                            </Typography>
                                                        </TableCell>
                                                        <TableCell>
                                                            <Chip
                                                                label={payment.status}
                                                                color={payment.status === 'completed' ? 'success' : 'default'}
                                                                size="small"
                                                                sx={{
                                                                    borderRadius: 2,
                                                                    fontWeight: 'bold'
                                                                }}
                                                            />
                                                        </TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    </TableContainer>
                                ) : (
                                    <Box sx={{
                                        background: 'linear-gradient(135deg, #e3f2fd 0%, #bbdefb 100%)',
                                        borderRadius: 2,
                                        p: 3,
                                        textAlign: 'center'
                                    }}>
                                        <Typography variant="h6" color="primary" mb={1}>
                                            📋 Aucun paiement enregistré
                                        </Typography>
                                        <Typography variant="body2" color="text.secondary">
                                            Aucun paiement n'a été enregistré pour ce versement.
                                        </Typography>
                                    </Box>
                                )}
                            </Box>
                        )}
                    </DialogContent>
                    <DialogActions sx={{ p: 3 }}>
                        <Button 
                            onClick={handleCloseHistoryDialog}
                            sx={{
                                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                                color: 'white',
                                borderRadius: 2,
                                textTransform: 'none',
                                fontWeight: 'bold',
                                px: 3,
                                '&:hover': {
                                    background: 'linear-gradient(135deg, #5a6fd8 0%, #6a4190 100%)',
                                }
                            }}
                        >
                            Fermer
                        </Button>
                    </DialogActions>
                </Dialog>

                {/* Dialog pour afficher les élèves en retard */}
                <Dialog 
                    open={openOverdueDialog} 
                    onClose={() => setOpenOverdueDialog(false)} 
                    maxWidth="lg" 
                    fullWidth
                    PaperProps={{
                        sx: {
                            borderRadius: 3,
                            boxShadow: '0 20px 60px rgba(0,0,0,0.2)'
                        }
                    }}
                >
                    <DialogTitle sx={{
                        background: 'linear-gradient(135deg, #d32f2f 0%, #b71c1c 100%)',
                        color: 'white',
                        borderRadius: '12px 12px 0 0'
                    }}>
                        <Box display="flex" alignItems="center" justifyContent="space-between">
                            <Box display="flex" alignItems="center" gap={2}>
                                <Avatar sx={{ bgcolor: 'rgba(255,255,255,0.2)' }}>
                                    <AssessmentIcon />
                                </Avatar>
                                <Box>
                                    <Typography variant="h6">
                                        Rapport des Élèves en Retard de Versement
                                    </Typography>
                                    <Typography variant="body2" sx={{ opacity: 0.9 }}>
                                        {overdueFilter === 'all' ? 'Toute l\'école' : 
                                         overdueFilter === 'level' ? `Niveau: ${selectedLevel?.name}` : 
                                         `Classe: ${selectedClass?.name}`} - {selectedSchoolYear}
                                    </Typography>
                                </Box>
                            </Box>
                            <Box display="flex" gap={1}>
                                <Tooltip title="Exporter vers Excel">
                                    <IconButton
                                        onClick={handleExportToExcel}
                                        sx={{ color: 'white' }}
                                    >
                                        <TableChartIcon />
                                    </IconButton>
                                </Tooltip>
                                <Tooltip title="Imprimer le rapport">
                                    <IconButton
                                        onClick={handlePrintOverdueReport}
                                        sx={{ color: 'white' }}
                                    >
                                        <PrintIcon />
                                    </IconButton>
                                </Tooltip>
                            </Box>
                        </Box>
                    </DialogTitle>
                    <DialogContent sx={{ p: 3 }}>
                        {loadingOverdue ? (
                            <Box display="flex" justifyContent="center" alignItems="center" minHeight="200px">
                                <CircularProgress />
                            </Box>
                        ) : overdueStudents.length > 0 ? (
                            <Box>
                                {/* Résumé */}
                                <Box sx={{
                                    background: 'linear-gradient(135deg, #ffebee 0%, #ffcdd2 100%)',
                                    borderRadius: 2,
                                    p: 2,
                                    mb: 3
                                }}>
                                    <Typography variant="h6" color="error" gutterBottom>
                                        📊 Résumé du Rapport
                                    </Typography>
                                    <Grid container spacing={2}>
                                        <Grid item xs={12} sm={4}>
                                            <Typography variant="body2" color="text.secondary">
                                                Nombre d'élèves en retard
                                            </Typography>
                                            <Typography variant="h6" color="error" fontWeight="bold">
                                                {overdueStudents.length}
                                            </Typography>
                                        </Grid>
                                        <Grid item xs={12} sm={4}>
                                            <Typography variant="body2" color="text.secondary">
                                                Montant total dû
                                            </Typography>
                                            <Typography variant="h6" color="error" fontWeight="bold">
                                                {formatCurrency(overdueStudents.reduce((sum, student) => {
                                                    const amount = parseFloat(String(student.total_overdue_amount)) || 0;
                                                    return sum + (isNaN(amount) ? 0 : amount);
                                                }, 0))}
                                            </Typography>
                                        </Grid>
                                        <Grid item xs={12} sm={4}>
                                            <Typography variant="body2" color="text.secondary">
                                                Versements en retard
                                            </Typography>
                                            <Typography variant="h6" color="error" fontWeight="bold">
                                                {overdueStudents.reduce((sum, student) => sum + student.overdue_installments_count, 0)}
                                            </Typography>
                                        </Grid>
                                    </Grid>
                                </Box>

                                {/* Tableau des élèves en retard */}
                                <TableContainer component={Paper} variant="outlined" sx={{
                                    borderRadius: 2,
                                    boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
                                    overflow: 'hidden'
                                }}>
                                    <Table>
                                        <TableHead sx={{
                                            background: 'linear-gradient(135deg, #d32f2f 0%, #b71c1c 100%)'
                                        }}>
                                            <TableRow>
                                                <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>N°</TableCell>
                                                <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Matricule</TableCell>
                                                <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Nom</TableCell>
                                                <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Prénom</TableCell>
                                                <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Classe</TableCell>
                                                <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Niveau</TableCell>
                                                <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Versements en retard</TableCell>
                                                <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Montant dû</TableCell>
                                                <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Dernier paiement</TableCell>
                                            </TableRow>
                                        </TableHead>
                                        <TableBody>
                                            {[...overdueStudents]
                                                .sort((a, b) => {
                                                    const nameA = `${a.last_name} ${a.first_name}`.toLowerCase();
                                                    const nameB = `${b.last_name} ${b.first_name}`.toLowerCase();
                                                    return nameA.localeCompare(nameB, 'fr');
                                                })
                                                .map((student, index) => (
                                                <TableRow 
                                                    key={student.id}
                                                    sx={{
                                                        background: index % 2 === 0 ? 'rgba(255,255,255,0.5)' : 'rgba(248,249,250,0.5)',
                                                        '&:hover': {
                                                            background: 'linear-gradient(135deg, #ffebee 0%, #ffcdd2 100%)',
                                                        }
                                                    }}
                                                >
                                                    <TableCell>
                                                        <Typography variant="body2" fontWeight="bold">
                                                            {index + 1}
                                                        </Typography>
                                                    </TableCell>
                                                    <TableCell>
                                                        <Typography variant="body2" sx={{ color: '#666' }}>
                                                            {student.registration_number}
                                                        </Typography>
                                                    </TableCell>
                                                    <TableCell>
                                                        <Typography variant="subtitle2" fontWeight="bold">
                                                            {student.last_name}
                                                        </Typography>
                                                    </TableCell>
                                                    <TableCell>
                                                        <Typography variant="subtitle2" fontWeight="bold">
                                                            {student.first_name}
                                                        </Typography>
                                                    </TableCell>
                                                    <TableCell>
                                                        <Typography variant="body2" sx={{ color: '#666' }}>
                                                            {student.class_name}
                                                        </Typography>
                                                    </TableCell>
                                                    <TableCell>
                                                        <Typography variant="body2" sx={{ color: '#666' }}>
                                                            {student.education_level_name}
                                                        </Typography>
                                                    </TableCell>
                                                    <TableCell>
                                                        <Chip
                                                            label={student.overdue_installments_count}
                                                            color="error"
                                                            size="small"
                                                            sx={{ fontWeight: 'bold' }}
                                                        />
                                                    </TableCell>
                                                    <TableCell>
                                                        <Typography
                                                            variant="subtitle2"
                                                            fontWeight="bold"
                                                            sx={{ 
                                                                color: '#d32f2f',
                                                                background: 'linear-gradient(135deg, #ffebee 0%, #ffcdd2 100%)',
                                                                px: 1,
                                                                py: 0.5,
                                                                borderRadius: 1,
                                                                display: 'inline-block'
                                                            }}
                                                        >
                                                            {formatCurrency(parseFloat(String(student.total_overdue_amount)) || 0)}
                                                        </Typography>
                                                    </TableCell>
                                                    <TableCell>
                                                        <Typography variant="body2" sx={{ color: '#666' }}>
                                                            {student.last_payment_date ? formatDate(student.last_payment_date) : 'Aucun'}
                                                        </Typography>
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </TableContainer>
                            </Box>
                        ) : (
                            <Box sx={{
                                background: 'linear-gradient(135deg, #e8f5e8 0%, #c8e6c9 100%)',
                                borderRadius: 2,
                                p: 3,
                                textAlign: 'center'
                            }}>
                                <Typography variant="h6" color="success.main" mb={1}>
                                    ✅ Aucun élève en retard
                                </Typography>
                                <Typography variant="body2" color="text.secondary">
                                    Tous les versements sont à jour pour cette période.
                                </Typography>
                            </Box>
                        )}
                    </DialogContent>
                    <DialogActions sx={{ p: 3 }}>
                        <Button 
                            onClick={() => setOpenOverdueDialog(false)}
                            sx={{
                                background: 'linear-gradient(135deg, #d32f2f 0%, #b71c1c 100%)',
                                color: 'white',
                                borderRadius: 2,
                                textTransform: 'none',
                                fontWeight: 'bold',
                                px: 3,
                                '&:hover': {
                                    background: 'linear-gradient(135deg, #b71c1c 0%, #8d1a1a 100%)',
                                }
                            }}
                        >
                            Fermer
                        </Button>
                    </DialogActions>
                </Dialog>

                <Snackbar
                    open={snackbar.open}
                    autoHideDuration={6000}
                    onClose={() => setSnackbar({ ...snackbar, open: false })}
                >
                    <Alert
                        onClose={() => setSnackbar({ ...snackbar, open: false })}
                        severity={snackbar.severity}
                    >
                        {snackbar.message}
                    </Alert>
                </Snackbar>
            </Box>
        </Box>
    );
};

export default StudentInstallments;

