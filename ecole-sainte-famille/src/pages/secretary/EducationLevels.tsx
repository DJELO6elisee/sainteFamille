import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
    Box,
    Typography,
    Button,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    TextField,
    Alert,
    Snackbar,
    CircularProgress,
    Card,
    CardContent,
    Grid,
    Divider,
    IconButton,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Paper,
    Chip,
    Accordion,
    AccordionSummary,
    AccordionDetails,
    Container,
    Fade,
    Slide,
    Avatar,
    LinearProgress,
    Tooltip,
    Badge
} from '@mui/material';
import SecretarySidebar from '../../components/SecretarySidebar';
import { formatDateForInput } from '../../utils/dateUtils';
import {
    Add as AddIcon,
    Edit as EditIcon,
    Delete as DeleteIcon,
    School as SchoolIcon,
    ExpandMore as ExpandMoreIcon,
    AttachMoney as MoneyIcon,
    Visibility as ViewIcon,
    Payment as PaymentIcon,
    People as PeopleIcon,
    Class as ClassIcon,
    TrendingUp as TrendingUpIcon,
    CheckCircle as CheckCircleIcon,
    Schedule as ScheduleIcon,
    Warning as WarningIcon
} from '@mui/icons-material';

interface EducationLevel {
    id: number;
    name: string;
    description: string;
    tuition_amount: number;
    registration_fee: number;
    cantine_amount: number;
    is_active: boolean;
    order_index: number;
    classes_count: number;
    students_count: number;
    installments_count: number;
    installments?: Installment[];
}

interface Installment {
    id: number;
    installment_number: number;
    amount: number;
    percentage: number;
    due_date: string;
    due_date_offset_days: number;
    is_active: boolean;
}

interface LevelInstallmentDetails {
    level: EducationLevel;
    level_installments: any[];
    student_stats: {
        total_students: number;
        active_students: number;
        total_classes: number;
    };
    student_installments: any[];
}

const EducationLevels: React.FC = () => {
    const [levels, setLevels] = useState<EducationLevel[]>([]);
    const [loading, setLoading] = useState(true);
    const [openDialog, setOpenDialog] = useState(false);
    const [editingLevel, setEditingLevel] = useState<EducationLevel | null>(null);
    const [loadingLevelDetails, setLoadingLevelDetails] = useState(false);
    const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' as 'success' | 'error' });
    
    // États pour la modal des versements
    const [openInstallmentsDialog, setOpenInstallmentsDialog] = useState(false);
    const [installmentsDetails, setInstallmentsDetails] = useState<LevelInstallmentDetails | null>(null);
    const [loadingInstallments, setLoadingInstallments] = useState(false);
    
    const [formData, setFormData] = useState({
        name: '',
        description: '',
        tuition_amount: 0,
        registration_fee: 0,
        cantine_amount: 0,
        order_index: 0,
        installments: [] as Installment[]
    });

    useEffect(() => {
        fetchData();
    }, []);


    const fetchData = async () => {
        try {
            setLoading(true);
            const response = await axios.get('https://saintefamilleexcellence.ci/api/education-levels', {
                headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
            });
            setLevels(response.data.data);
        } catch (error) {
            console.error('Erreur lors du chargement des données:', error);
            setSnackbar({
                open: true,
                message: 'Erreur lors du chargement des données',
                severity: 'error'
            });
        } finally {
            setLoading(false);
        }
    };

    const handleOpenDialog = async (level?: EducationLevel) => {
        if (level) {
            setEditingLevel(level);
            setLoadingLevelDetails(true);
            
            // Récupérer les détails complets du niveau avec ses versements
            try {
                const response = await axios.get(`https://saintefamilleexcellence.ci/api/education-levels/${level.id}`, {
                    headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
                });
                
                const levelDetails = response.data.data;
                setFormData({
                    name: levelDetails.name,
                    description: levelDetails.description || '',
                    tuition_amount: levelDetails.tuition_amount,
                    registration_fee: levelDetails.registration_fee,
                    cantine_amount: levelDetails.cantine_amount,
                    order_index: levelDetails.order_index,
                    installments: levelDetails.installments || []
                });
            } catch (error) {
                console.error('Erreur lors du chargement des détails du niveau:', error);
                setSnackbar({
                    open: true,
                    message: 'Erreur lors du chargement des détails du niveau',
                    severity: 'error'
                });
                return;
            } finally {
                setLoadingLevelDetails(false);
            }
        } else {
            setEditingLevel(null);
            setFormData({
                name: '',
                description: '',
                tuition_amount: 0,
                registration_fee: 0,
                cantine_amount: 0,
                order_index: 0,
                installments: []
            });
        }
        setOpenDialog(true);
    };

    const handleCloseDialog = () => {
        setOpenDialog(false);
        setEditingLevel(null);
    };

    const handleViewInstallments = async (level: EducationLevel) => {
        try {
            setLoadingInstallments(true);
            const response = await axios.get(`https://saintefamilleexcellence.ci/api/education-levels/${level.id}/installments`, {
                headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
            });
            setInstallmentsDetails(response.data.data);
            setOpenInstallmentsDialog(true);
        } catch (error) {
            console.error('Erreur lors du chargement des versements:', error);
            setSnackbar({
                open: true,
                message: 'Erreur lors du chargement des versements',
                severity: 'error'
            });
        } finally {
            setLoadingInstallments(false);
        }
    };

    const handleCloseInstallmentsDialog = () => {
        setOpenInstallmentsDialog(false);
        setInstallmentsDetails(null);
    };

    const addInstallment = () => {
        const newInstallment: Installment = {
            id: Date.now(), // ID temporaire
            installment_number: formData.installments.length + 1,
            amount: 0,
            percentage: 0,
            due_date: '',
            due_date_offset_days: 0,
            is_active: true
        };
        setFormData({
            ...formData,
            installments: [...formData.installments, newInstallment]
        });
    };

    const updateInstallment = (index: number, field: keyof Installment, value: any) => {
        const updatedInstallments = [...formData.installments];
        const tuitionAmount = formData.tuition_amount - formData.registration_fee;

        // Si on modifie le montant, vérifier qu'il ne dépasse pas le montant total
        if (field === 'amount') {
            // Calculer le montant total des autres versements (sans celui en cours de modification)
            const otherInstallmentsTotal = updatedInstallments
                .filter((_, i) => i !== index)
                .reduce((sum, inst) => sum + Number(inst.amount || 0), 0);
            
            // Le montant maximum possible pour ce versement
            const maxAmount = tuitionAmount - otherInstallmentsTotal;
            
            // Si le montant saisi dépasse le maximum, le limiter
            if (value > maxAmount) {
                value = maxAmount;
                setSnackbar({
                    open: true,
                    message: `Le montant ne peut pas dépasser ${formatCurrency(maxAmount)}. Montant ajusté automatiquement.`,
                    severity: 'error'
                });
            }
            
            // Si le montant est négatif, le mettre à 0
            if (value < 0) {
                value = 0;
            }
            
            updatedInstallments[index] = {
                ...updatedInstallments[index],
                [field]: value
            };

            // Recalculer le pourcentage automatiquement
            if (tuitionAmount > 0) {
                updatedInstallments[index].percentage = Number(((value / tuitionAmount) * 100).toFixed(2));
            }
        } else {
            updatedInstallments[index] = {
                ...updatedInstallments[index],
                [field]: value
            };
        }

        // Si on modifie la date, calculer le délai en jours
        if (field === 'due_date' && value) {
            const today = new Date();
            const dueDate = new Date(value);
            const diffTime = dueDate.getTime() - today.getTime();
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            updatedInstallments[index].due_date_offset_days = Math.max(0, diffDays);
        }

        setFormData({
            ...formData,
            installments: updatedInstallments
        });
    };

    const removeInstallment = (index: number) => {
        const updatedInstallments = formData.installments.filter((_, i) => i !== index);
        // Réorganiser les numéros
        updatedInstallments.forEach((installment, i) => {
            installment.installment_number = i + 1;
        });
        setFormData({
            ...formData,
            installments: updatedInstallments
        });
    };

    const handleSubmit = async () => {
        try {
            // Vérifier que les montants totalisent le montant de scolarité moins les frais d'inscription
            const tuitionAmount = formData.tuition_amount - formData.registration_fee;
            const totalAmount = formData.installments.reduce((sum, inst) => sum + Number(inst.amount || 0), 0);
            
            // Vérifier si le total est valide
            if (!isTotalValid()) {
                setSnackbar({
                    open: true,
                    message: `Les montants des versements doivent totaliser exactement ${formatCurrency(tuitionAmount)} (scolarité - frais d'inscription). Montant actuel: ${formatCurrency(totalAmount)}`,
                    severity: 'error'
                });
                return;
            }

            // Vérifier qu'aucun versement individuel ne dépasse le montant total
            const hasInvalidAmount = formData.installments.some((inst, index) => 
                Number(inst.amount || 0) > getMaxAmountForInstallment(index)
            );
            
            if (hasInvalidAmount) {
                setSnackbar({
                    open: true,
                    message: 'Un ou plusieurs versements ont des montants invalides. Veuillez corriger les montants.',
                    severity: 'error'
                });
                return;
            }

            const payload = {
                ...formData,
                installments: formData.installments.map(inst => ({
                    installment_number: inst.installment_number,
                    amount: inst.amount,
                    percentage: inst.percentage,
                    due_date: inst.due_date,
                    due_date_offset_days: inst.due_date_offset_days
                }))
            };

            if (editingLevel) {
                await axios.put(`https://saintefamilleexcellence.ci/api/education-levels/${editingLevel.id}`, payload, {
                    headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
                });
                setSnackbar({
                    open: true,
                    message: 'Niveau d\'études mis à jour avec succès',
                    severity: 'success'
                });
            } else {
                await axios.post('https://saintefamilleexcellence.ci/api/education-levels', payload, {
                    headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
                });
                setSnackbar({
                    open: true,
                    message: 'Niveau d\'études créé avec succès',
                    severity: 'success'
                });
            }

            handleCloseDialog();
            fetchData();
        } catch (error) {
            console.error('Erreur lors de la sauvegarde:', error);
            setSnackbar({
                open: true,
                message: 'Erreur lors de la sauvegarde',
                severity: 'error'
            });
        }
    };

    const handleDelete = async (id: number) => {
        if (window.confirm('Êtes-vous sûr de vouloir supprimer ce niveau d\'études ?')) {
            try {
                await axios.delete(`https://saintefamilleexcellence.ci/api/education-levels/${id}`, {
                    headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
                });
                setSnackbar({
                    open: true,
                    message: 'Niveau d\'études supprimé avec succès',
                    severity: 'success'
                });
                fetchData();
            } catch (error) {
                console.error('Erreur lors de la suppression:', error);
                setSnackbar({
                    open: true,
                    message: 'Erreur lors de la suppression',
                    severity: 'error'
                });
            }
        }
    };

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('fr-FR', {
            style: 'currency',
            currency: 'XOF',
            minimumFractionDigits: 0
        }).format(amount);
    };

    // Fonction pour calculer le montant maximum disponible pour un versement
    const getMaxAmountForInstallment = (index: number) => {
        const tuitionAmount = formData.tuition_amount - formData.registration_fee;
        const otherInstallmentsTotal = formData.installments
            .filter((_, i) => i !== index)
            .reduce((sum, inst) => sum + Number(inst.amount || 0), 0);
        return tuitionAmount - otherInstallmentsTotal;
    };

    // Fonction pour vérifier si le total des versements est valide
    const isTotalValid = () => {
        const tuitionAmount = formData.tuition_amount - formData.registration_fee;
        const totalAmount = formData.installments.reduce((sum, inst) => sum + Number(inst.amount || 0), 0);
        return Math.abs(totalAmount - tuitionAmount) <= 0.01;
    };

    if (loading) {
        return (
            <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
                <CircularProgress />
            </Box>
        );
    }

    return (
        <Box sx={{ display: 'flex', minHeight: '100vh', background: 'linear-gradient(160deg, #e8eef5 0%, #f0f4f8 50%, #e3e8ed 100%)' }}>
            <SecretarySidebar />
            <Box component="main" sx={{ flexGrow: 1, width: '100%', minWidth: 0, pt: 0, mt: 0 }}>
                {/* Header avec gradient (aligné sur la sidebar) */}
                <Box
                    sx={{
                        background: 'linear-gradient(135deg, #1976d2 0%, #512da8 100%)',
                        color: 'white',
                        pt: 3,
                        pb: 3,
                        px: { xs: 2, sm: 3 },
                        position: 'relative',
                        overflow: 'hidden',
                        boxShadow: '0 4px 20px rgba(25, 118, 210, 0.25)'
                    }}
                >
                    <Box
                        sx={{
                            position: 'absolute',
                            top: -40,
                            right: -40,
                            width: 180,
                            height: 180,
                            borderRadius: '50%',
                            background: 'rgba(255,255,255,0.08)',
                            zIndex: 0
                        }}
                    />
                    <Box
                        sx={{
                            position: 'absolute',
                            bottom: -20,
                            left: -20,
                            width: 120,
                            height: 120,
                            borderRadius: '50%',
                            background: 'rgba(255,255,255,0.05)',
                            zIndex: 0
                        }}
                    />
                    <Container maxWidth="lg" sx={{ position: 'relative', zIndex: 1, px: { xs: 0 } }}>
                        <Box display="flex" flexWrap="wrap" justifyContent="space-between" alignItems="center" gap={2}>
                            <Box>
                                <Typography
                                    variant="h4"
                                    component="h1"
                                    display="flex"
                                    alignItems="center"
                                    gap={2}
                                    sx={{
                                        fontWeight: 700,
                                    }}
                                >
                                    <Avatar sx={{ bgcolor: 'rgba(255,255,255,0.25)', width: 52, height: 52 }}>
                                        <SchoolIcon sx={{ fontSize: 28 }} />
                                    </Avatar>
                                    Gestion des Niveaux d'Études
                                </Typography>
                                <Typography variant="body1" sx={{ opacity: 0.95, fontWeight: 400, mt: 0.5, pl: 7 }}>
                                    Configurez et gérez les niveaux d'études avec leurs versements
                                </Typography>
                            </Box>
                            <Fade in={true} timeout={1000}>
                                <Button
                                    variant="contained"
                                    size="large"
                                    startIcon={<AddIcon />}
                                    onClick={() => handleOpenDialog()}
                                    sx={{
                                        bgcolor: 'rgba(255,255,255,0.22)',
                                        color: 'white',
                                        border: '1px solid rgba(255,255,255,0.35)',
                                        '&:hover': {
                                            bgcolor: 'rgba(255,255,255,0.35)',
                                            transform: 'translateY(-2px)',
                                            boxShadow: '0 6px 20px rgba(0,0,0,0.2)'
                                        },
                                        transition: 'all 0.25s ease',
                                        px: 3,
                                        py: 1.5,
                                        borderRadius: 2
                                    }}
                                >
                                    Ajouter un Niveau
                                </Button>
                            </Fade>
                        </Box>
                    </Container>
                </Box>

                {/* Contenu principal */}
                <Container maxWidth="lg" sx={{ py: 4, px: { xs: 2, sm: 3 } }}>

                <Grid container spacing={3}>
                    {levels.map((level, index) => (
                        <Grid item xs={12} md={6} lg={4} key={level.id}>
                            <Slide direction="up" in={true} timeout={300 + index * 100}>
                                <Card
                                    sx={{
                                        height: '100%',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        borderRadius: 2.5,
                                        boxShadow: '0 4px 20px rgba(25, 118, 210, 0.08)',
                                        border: '1px solid rgba(25, 118, 210, 0.12)',
                                        background: '#ffffff',
                                        transition: 'all 0.25s ease',
                                        overflow: 'hidden',
                                        '&:hover': {
                                            transform: 'translateY(-4px)',
                                            boxShadow: '0 12px 32px rgba(25, 118, 210, 0.15)',
                                            borderColor: 'rgba(25, 118, 210, 0.2)',
                                            '& .level-header': {
                                                background: 'linear-gradient(135deg, #1976d2 0%, #512da8 100%)',
                                                color: 'white',
                                                '& .level-title': { color: 'white' },
                                                '& .level-desc': { color: 'rgba(255,255,255,0.9)' }
                                            }
                                        }
                                    }}
                                >
                                    {/* Header de la carte */}
                                    <Box
                                        className="level-header"
                                        sx={{
                                            background: 'linear-gradient(135deg, #e3f2fd 0%, #ede7f6 100%)',
                                            p: 2,
                                            borderRadius: 0,
                                            transition: 'all 0.25s ease',
                                            position: 'relative',
                                            overflow: 'hidden',
                                            borderBottom: '1px solid rgba(25, 118, 210, 0.1)'
                                        }}
                                    >
                                        <Box
                                            sx={{
                                                position: 'absolute',
                                                top: -16,
                                                right: -16,
                                                width: 64,
                                                height: 64,
                                                borderRadius: '50%',
                                                background: 'rgba(25, 118, 210, 0.08)',
                                                zIndex: 0
                                            }}
                                        />
                                        <Box display="flex" justifyContent="space-between" alignItems="flex-start" sx={{ position: 'relative', zIndex: 1 }}>
                                            <Box>
                                                <Typography
                                                    className="level-title"
                                                    variant="h5"
                                                    component="h2"
                                                    sx={{
                                                        fontWeight: 700,
                                                        mb: 0.5,
                                                        color: '#1976d2'
                                                    }}
                                                >
                                                    {level.name}
                                                </Typography>
                                                {level.description && (
                                                    <Typography className="level-desc" variant="body2" color="text.secondary" sx={{ fontSize: '0.85rem' }}>
                                                        {level.description}
                                                    </Typography>
                                                )}
                                            </Box>
                                            <Box display="flex" gap={0.5}>
                                                <Tooltip title="Voir les versements" arrow>
                                                    <IconButton
                                                        size="small"
                                                        onClick={() => handleViewInstallments(level)}
                                                        sx={{
                                                            bgcolor: 'rgba(25, 118, 210, 0.1)',
                                                            color: '#1976d2',
                                                            '&:hover': { bgcolor: 'rgba(25, 118, 210, 0.2)', transform: 'scale(1.08)' },
                                                            transition: 'all 0.2s ease'
                                                        }}
                                                    >
                                                        <ViewIcon fontSize="small" />
                                                    </IconButton>
                                                </Tooltip>
                                                <Tooltip title="Modifier le niveau" arrow>
                                                    <IconButton
                                                        size="small"
                                                        onClick={() => handleOpenDialog(level)}
                                                        sx={{
                                                            bgcolor: 'rgba(81, 45, 168, 0.1)',
                                                            color: '#512da8',
                                                            '&:hover': { bgcolor: 'rgba(81, 45, 168, 0.2)', transform: 'scale(1.08)' },
                                                            transition: 'all 0.2s ease'
                                                        }}
                                                    >
                                                        <EditIcon fontSize="small" />
                                                    </IconButton>
                                                </Tooltip>
                                                <Tooltip title="Supprimer le niveau" arrow>
                                                    <IconButton
                                                        size="small"
                                                        onClick={() => handleDelete(level.id)}
                                                        sx={{
                                                            bgcolor: 'rgba(244, 67, 54, 0.08)',
                                                            color: '#d32f2f',
                                                            '&:hover': { bgcolor: 'rgba(244, 67, 54, 0.18)', transform: 'scale(1.08)' },
                                                            transition: 'all 0.2s ease'
                                                        }}
                                                    >
                                                        <DeleteIcon fontSize="small" />
                                                    </IconButton>
                                                </Tooltip>
                                            </Box>
                                        </Box>
                                    </Box>

                                    <CardContent sx={{ flexGrow: 1, p: 2.5 }}>

                                        {/* Section financière */}
                                        <Box mb={2.5}>
                                            <Typography variant="subtitle1" sx={{ mb: 1.5, color: '#1976d2', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                                <MoneyIcon sx={{ fontSize: 20 }} />
                                                Informations Financières
                                            </Typography>
                                            <Box sx={{
                                                bgcolor: 'grey.50',
                                                borderRadius: 2,
                                                p: 2,
                                                border: '1px solid',
                                                borderColor: 'grey.200'
                                            }}>
                                                <Box display="flex" justifyContent="space-between" alignItems="center" mb={1.25}>
                                                    <Box display="flex" alignItems="center" gap={1}>
                                                        <Typography variant="body2" color="text.secondary">Scolarité</Typography>
                                                    </Box>
                                                    <Typography variant="body2" fontWeight="600" color="success.main">
                                                        {formatCurrency(level.tuition_amount)}
                                                    </Typography>
                                                </Box>
                                                <Box display="flex" justifyContent="space-between" alignItems="center" mb={1.25}>
                                                    <Typography variant="body2" color="text.secondary">Inscription</Typography>
                                                    <Typography variant="body2" fontWeight="600" color="info.main">
                                                        {formatCurrency(level.registration_fee)}
                                                    </Typography>
                                                </Box>
                                                <Box display="flex" justifyContent="space-between" alignItems="center">
                                                    <Typography variant="body2" color="text.secondary">Cantine</Typography>
                                                    <Typography variant="body2" fontWeight="600" sx={{ color: '#e65100' }}>
                                                        {formatCurrency(level.cantine_amount)}
                                                    </Typography>
                                                </Box>
                                            </Box>
                                        </Box>

                                        {/* Statistiques */}
                                        <Box>
                                            <Typography variant="subtitle1" sx={{ mb: 1.5, color: '#1976d2', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                                <TrendingUpIcon sx={{ fontSize: 20 }} />
                                                Statistiques
                                            </Typography>
                                            <Box display="flex" gap={1} flexWrap="wrap">
                                                <Chip
                                                    icon={<ClassIcon />}
                                                    label={`${level.classes_count} classes`}
                                                    size="small"
                                                    sx={{
                                                        bgcolor: 'primary.main',
                                                        color: 'white',
                                                        fontWeight: 600,
                                                        '& .MuiChip-icon': { color: 'white' }
                                                    }}
                                                />
                                                <Chip
                                                    icon={<PeopleIcon />}
                                                    label={`${level.students_count} élèves`}
                                                    size="small"
                                                    sx={{
                                                        bgcolor: '#512da8',
                                                        color: 'white',
                                                        fontWeight: 600,
                                                        '& .MuiChip-icon': { color: 'white' }
                                                    }}
                                                />
                                                <Chip
                                                    icon={<PaymentIcon />}
                                                    label={`${level.installments_count} versements`}
                                                    size="small"
                                                    sx={{
                                                        bgcolor: '#0288d1',
                                                        color: 'white',
                                                        fontWeight: 600,
                                                        '& .MuiChip-icon': { color: 'white' }
                                                    }}
                                                />
                                            </Box>
                                        </Box>
                                    </CardContent>
                                </Card>
                            </Slide>
                        </Grid>
                    ))}
                </Grid>
                </Container>

                {/* Dialog pour créer/modifier un niveau */}
                <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="md" fullWidth>
                    <DialogTitle>
                        {editingLevel ? 'Modifier le Niveau d\'Études' : 'Nouveau Niveau d\'Études'}
                    </DialogTitle>
                    <DialogContent>
                        {loadingLevelDetails ? (
                            <Box display="flex" justifyContent="center" alignItems="center" minHeight="200px">
                                <CircularProgress />
                                <Typography variant="body2" sx={{ ml: 2 }}>
                                    Chargement des détails du niveau...
                                </Typography>
                            </Box>
                        ) : (
                        <Grid container spacing={2} sx={{ mt: 1 }}>
                            <Grid item xs={12} sm={6}>
                                <TextField
                                    fullWidth
                                    label="Nom du niveau"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    required
                                />
                            </Grid>
                            
                            <Grid item xs={12}>
                                <TextField
                                    fullWidth
                                    label="Description"
                                    value={formData.description}
                                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                    multiline
                                    rows={2}
                                />
                            </Grid>
                            <Grid item xs={12} sm={4}>
                                <TextField
                                    fullWidth
                                    label="Montant Scolarité (FCFA)"
                                    type="number"
                                    value={formData.tuition_amount}
                                    onChange={(e) => setFormData({ ...formData, tuition_amount: Number(e.target.value) })}
                                    required
                                />
                            </Grid>
                            <Grid item xs={12} sm={4}>
                                <TextField
                                    fullWidth
                                    label="Frais d'Inscription (FCFA)"
                                    type="number"
                                    value={formData.registration_fee}
                                    onChange={(e) => setFormData({ ...formData, registration_fee: Number(e.target.value) })}
                                    required
                                />
                            </Grid>
                            <Grid item xs={12} sm={4}>
                                <TextField
                                    fullWidth
                                    label="Montant Cantine (FCFA)"
                                    type="number"
                                    value={formData.cantine_amount}
                                    onChange={(e) => setFormData({ ...formData, cantine_amount: Number(e.target.value) })}
                                />
                            </Grid>
                            <Grid item xs={12} sm={6}>
                                <TextField
                                    fullWidth
                                    label="Ordre d'affichage"
                                    type="number"
                                    value={formData.order_index}
                                    onChange={(e) => setFormData({ ...formData, order_index: Number(e.target.value) })}
                                />
                            </Grid>
                            <Grid item xs={12} sm={6}>
                                <Button
                                    variant="outlined"
                                    startIcon={<AddIcon />}
                                    onClick={addInstallment}
                                    fullWidth
                                >
                                    Ajouter un Versement
                                </Button>
                            </Grid>
                            
                            {/* Note d'information sur le calcul des versements */}
                            <Grid item xs={12}>
                                <Alert severity="info" sx={{ mb: 2 }}>
                                    <Typography variant="body2">
                                        <strong>💡 Information :</strong> Les versements seront calculés sur le montant de{' '}
                                        <strong>{formatCurrency(formData.tuition_amount - formData.registration_fee)}</strong>{' '}
                                        (Scolarité - Frais d'inscription). Le pourcentage sera calculé automatiquement en fonction du montant saisi.
                                    </Typography>
                                </Alert>
                            </Grid>
                            
                            {/* Configuration des versements */}
                            {formData.installments.length > 0 && (
                                <Grid item xs={12}>
                                    <Typography variant="h6" mb={2}>
                                        Configuration des Versements
                                    </Typography>
                                    <TableContainer component={Paper} variant="outlined">
                                        <Table size="small">
                                            <TableHead>
                                                <TableRow>
                                                    <TableCell>Versement</TableCell>
                                                    <TableCell>Montant (FCFA)</TableCell>
                                                    <TableCell>Pourcentage</TableCell>
                                                    <TableCell>Date d'échéance</TableCell>
                                                    <TableCell>Actions</TableCell>
                                                </TableRow>
                                            </TableHead>
                                            <TableBody>
                                                {formData.installments.map((installment, index) => (
                                                    <TableRow key={installment.id}>
                                                        <TableCell>
                                                            Versement {installment.installment_number}
                                                        </TableCell>
                                                        <TableCell>
                                                            <TextField
                                                                size="small"
                                                                type="number"
                                                                value={Number(installment.amount || 0)}
                                                                onChange={(e) => updateInstallment(index, 'amount', Number(e.target.value))}
                                                                inputProps={{ 
                                                                    min: 0, 
                                                                    step: 100,
                                                                    max: getMaxAmountForInstallment(index)
                                                                }}
                                                                placeholder="0"
                                                                helperText={`Max: ${formatCurrency(getMaxAmountForInstallment(index))}`}
                                                                error={Number(installment.amount || 0) > getMaxAmountForInstallment(index)}
                                                            />
                                                        </TableCell>
                                                        <TableCell>
                                                            <TextField
                                                                size="small"
                                                                type="number"
                                                                value={Number(installment.percentage || 0).toFixed(2)}
                                                                InputProps={{ readOnly: true }}
                                                                inputProps={{ min: 0, max: 100, step: 0.01 }}
                                                                variant="outlined"
                                                                sx={{ 
                                                                    '& .MuiInputBase-input': { 
                                                                        backgroundColor: '#f5f5f5',
                                                                        color: '#666'
                                                                    }
                                                                }}
                                                            />
                                                        </TableCell>
                                                        <TableCell>
                                                            <TextField
                                                                size="small"
                                                                type="date"
                                                                value={formatDateForInput(installment.due_date)}
                                                                onChange={(e) => updateInstallment(index, 'due_date', e.target.value)}
                                                                InputLabelProps={{ shrink: true }}
                                                            />
                                                        </TableCell>
                                                        <TableCell>
                                                            <IconButton
                                                                size="small"
                                                                onClick={() => removeInstallment(index)}
                                                                color="error"
                                                            >
                                                                <DeleteIcon />
                                                            </IconButton>
                                                        </TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    </TableContainer>
                                    <Box mt={1}>
                                        <Alert 
                                            severity={isTotalValid() ? "success" : "error"} 
                                            sx={{ mb: 1 }}
                                        >
                                            <Typography variant="body2">
                                                {isTotalValid() ? (
                                                    <>
                                                        <strong>✅ Parfait :</strong> Les montants des versements totalisent exactement{' '}
                                                        <strong>{formatCurrency(formData.tuition_amount - formData.registration_fee)}</strong>
                                                    </>
                                                ) : (
                                                    <>
                                                        <strong>⚠️ Attention :</strong> Les montants des versements doivent totaliser exactement{' '}
                                                        <strong>{formatCurrency(formData.tuition_amount - formData.registration_fee)}</strong>{' '}
                                                        pour que la configuration soit valide.
                                                    </>
                                                )}
                                            </Typography>
                                        </Alert>
                                        <Box display="flex" justifyContent="space-between">
                                            <Typography 
                                                variant="body2" 
                                                color={isTotalValid() ? "success.main" : "text.secondary"}
                                                fontWeight={isTotalValid() ? "bold" : "normal"}
                                            >
                                                Total montants: {formatCurrency(formData.installments.reduce((sum, inst) => sum + Number(inst.amount || 0), 0))}
                                            </Typography>
                                            <Typography variant="body2" color="text.secondary">
                                                Total pourcentages: {formData.installments.reduce((sum, inst) => sum + Number(inst.percentage || 0), 0).toFixed(2)}%
                                            </Typography>
                                        </Box>
                                        <Box mt={1}>
                                            <Typography variant="caption" color="text.secondary">
                                                Montant restant: {formatCurrency(
                                                    (formData.tuition_amount - formData.registration_fee) - 
                                                    formData.installments.reduce((sum, inst) => sum + Number(inst.amount || 0), 0)
                                                )}
                                            </Typography>
                                        </Box>
                                    </Box>
                                </Grid>
                            )}
                        </Grid>
                        )}
                    </DialogContent>
                    <DialogActions>
                        <Button onClick={handleCloseDialog} disabled={loadingLevelDetails}>Annuler</Button>
                        <Button 
                            onClick={handleSubmit} 
                            variant="contained"
                            disabled={loadingLevelDetails || (formData.installments.length > 0 && !isTotalValid())}
                            color={formData.installments.length > 0 && isTotalValid() ? "success" : "primary"}
                        >
                            {editingLevel ? 'Mettre à jour' : 'Créer'}
                        </Button>
                    </DialogActions>
                </Dialog>

                {/* Dialog pour afficher les versements du niveau */}
                <Dialog 
                    open={openInstallmentsDialog} 
                    onClose={handleCloseInstallmentsDialog} 
                    maxWidth="lg" 
                    fullWidth
                    PaperProps={{
                        sx: {
                            borderRadius: 3,
                            boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
                            background: 'linear-gradient(145deg, #ffffff 0%, #f8f9fa 100%)'
                        }
                    }}
                >
                    <DialogTitle
                        sx={{
                            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                            color: 'white',
                            borderRadius: '12px 12px 0 0',
                            p: 3
                        }}
                    >
                        <Box display="flex" alignItems="center" gap={2}>
                            <Avatar sx={{ bgcolor: 'rgba(255,255,255,0.2)', width: 48, height: 48 }}>
                                <PaymentIcon sx={{ fontSize: 24 }} />
                            </Avatar>
                            <Box>
                                <Typography variant="h5" sx={{ fontWeight: 'bold', mb: 0.5 }}>
                                    Versements - {installmentsDetails?.level?.name}
                                </Typography>
                                <Typography variant="body2" sx={{ opacity: 0.9 }}>
                                    Détails des versements et statistiques des élèves
                                </Typography>
                            </Box>
                        </Box>
                    </DialogTitle>
                    <DialogContent sx={{ p: 3 }}>
                        {loadingInstallments ? (
                            <Box display="flex" justifyContent="center" alignItems="center" minHeight="200px">
                                <Box textAlign="center">
                                    <CircularProgress size={60} sx={{ color: '#667eea', mb: 2 }} />
                                    <Typography variant="h6" sx={{ color: '#2c3e50', fontWeight: 500 }}>
                                        Chargement des versements...
                                    </Typography>
                                </Box>
                            </Box>
                        ) : installmentsDetails ? (
                            <Box>
                                {/* Informations du niveau */}
                                <Card 
                                    sx={{ 
                                        mb: 3,
                                        borderRadius: 3,
                                        boxShadow: '0 8px 32px rgba(0,0,0,0.1)',
                                        border: '1px solid rgba(0,0,0,0.05)',
                                        background: 'linear-gradient(145deg, #ffffff 0%, #f8f9fa 100%)'
                                    }}
                                >
                                    <CardContent sx={{ p: 3 }}>
                                        <Typography 
                                            variant="h6" 
                                            gutterBottom
                                            sx={{ 
                                                color: '#2c3e50', 
                                                fontWeight: 600,
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: 1,
                                                mb: 3
                                            }}
                                        >
                                            <SchoolIcon sx={{ color: '#667eea' }} />
                                            Informations du Niveau
                                        </Typography>
                                        <Grid container spacing={3}>
                                            <Grid item xs={12} sm={6}>
                                                <Box sx={{ 
                                                    background: 'linear-gradient(135deg, #27ae60 0%, #2ecc71 100%)',
                                                    borderRadius: 2,
                                                    p: 2,
                                                    color: 'white',
                                                    textAlign: 'center'
                                                }}>
                                                    <MoneyIcon sx={{ fontSize: 32, mb: 1 }} />
                                                    <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 0.5 }}>
                                                        Scolarité
                                                    </Typography>
                                                    <Typography variant="h5" sx={{ fontWeight: 'bold' }}>
                                                        {formatCurrency(installmentsDetails.level.tuition_amount)}
                                                    </Typography>
                                                </Box>
                                            </Grid>
                                            <Grid item xs={12} sm={6}>
                                                <Box sx={{ 
                                                    background: 'linear-gradient(135deg, #3498db 0%, #5dade2 100%)',
                                                    borderRadius: 2,
                                                    p: 2,
                                                    color: 'white',
                                                    textAlign: 'center'
                                                }}>
                                                    <CheckCircleIcon sx={{ fontSize: 32, mb: 1 }} />
                                                    <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 0.5 }}>
                                                        Inscription
                                                    </Typography>
                                                    <Typography variant="h5" sx={{ fontWeight: 'bold' }}>
                                                        {formatCurrency(installmentsDetails.level.registration_fee)}
                                                    </Typography>
                                                </Box>
                                            </Grid>
                                            <Grid item xs={12} sm={4}>
                                                <Box sx={{ 
                                                    background: 'linear-gradient(135deg, #e74c3c 0%, #ec7063 100%)',
                                                    borderRadius: 2,
                                                    p: 2,
                                                    color: 'white',
                                                    textAlign: 'center'
                                                }}>
                                                    <PeopleIcon sx={{ fontSize: 32, mb: 1 }} />
                                                    <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 0.5 }}>
                                                        Total Élèves
                                                    </Typography>
                                                    <Typography variant="h4" sx={{ fontWeight: 'bold' }}>
                                                        {installmentsDetails.student_stats.total_students}
                                                    </Typography>
                                                </Box>
                                            </Grid>
                                            <Grid item xs={12} sm={4}>
                                                <Box sx={{ 
                                                    background: 'linear-gradient(135deg, #f39c12 0%, #f7dc6f 100%)',
                                                    borderRadius: 2,
                                                    p: 2,
                                                    color: 'white',
                                                    textAlign: 'center'
                                                }}>
                                                    <TrendingUpIcon sx={{ fontSize: 32, mb: 1 }} />
                                                    <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 0.5 }}>
                                                        Actifs
                                                    </Typography>
                                                    <Typography variant="h4" sx={{ fontWeight: 'bold' }}>
                                                        {installmentsDetails.student_stats.active_students}
                                                    </Typography>
                                                </Box>
                                            </Grid>
                                            <Grid item xs={12} sm={4}>
                                                <Box sx={{ 
                                                    background: 'linear-gradient(135deg, #9b59b6 0%, #bb8fce 100%)',
                                                    borderRadius: 2,
                                                    p: 2,
                                                    color: 'white',
                                                    textAlign: 'center'
                                                }}>
                                                    <ClassIcon sx={{ fontSize: 32, mb: 1 }} />
                                                    <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 0.5 }}>
                                                        Classes
                                                    </Typography>
                                                    <Typography variant="h4" sx={{ fontWeight: 'bold' }}>
                                                        {installmentsDetails.student_stats.total_classes}
                                                    </Typography>
                                                </Box>
                                            </Grid>
                                        </Grid>
                                    </CardContent>
                                </Card>

                                {/* Configuration des versements */}
                                <Card 
                                    sx={{ 
                                        mb: 3,
                                        borderRadius: 3,
                                        boxShadow: '0 8px 32px rgba(0,0,0,0.1)',
                                        border: '1px solid rgba(0,0,0,0.05)',
                                        background: 'linear-gradient(145deg, #ffffff 0%, #f8f9fa 100%)'
                                    }}
                                >
                                    <CardContent sx={{ p: 3 }}>
                                        <Typography 
                                            variant="h6" 
                                            gutterBottom
                                            sx={{ 
                                                color: '#2c3e50', 
                                                fontWeight: 600,
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: 1,
                                                mb: 3
                                            }}
                                        >
                                            <PaymentIcon sx={{ color: '#667eea' }} />
                                            Configuration des Versements
                                        </Typography>
                                        {installmentsDetails.level_installments.length > 0 ? (
                                            <TableContainer 
                                                component={Paper} 
                                                sx={{ 
                                                    borderRadius: 2,
                                                    boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
                                                    border: '1px solid rgba(0,0,0,0.05)'
                                                }}
                                            >
                                                <Table size="small">
                                                    <TableHead>
                                                        <TableRow sx={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
                                                            <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Versement</TableCell>
                                                            <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Pourcentage</TableCell>
                                                            <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Montant (FCFA)</TableCell>
                                                            <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Délai (jours)</TableCell>
                                                            <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Statut</TableCell>
                                                        </TableRow>
                                                    </TableHead>
                                                    <TableBody>
                                                        {installmentsDetails.level_installments.map((installment, index) => (
                                                            <TableRow 
                                                                key={installment.id}
                                                                sx={{ 
                                                                    '&:nth-of-type(odd)': { 
                                                                        backgroundColor: 'rgba(0,0,0,0.02)' 
                                                                    },
                                                                    '&:hover': {
                                                                        backgroundColor: 'rgba(102, 126, 234, 0.05)'
                                                                    }
                                                                }}
                                                            >
                                                                <TableCell sx={{ fontWeight: 500 }}>
                                                                    <Box display="flex" alignItems="center" gap={1}>
                                                                        <Avatar sx={{ 
                                                                            width: 24, 
                                                                            height: 24, 
                                                                            bgcolor: '#667eea',
                                                                            fontSize: '0.75rem'
                                                                        }}>
                                                                            {installment.installment_number}
                                                                        </Avatar>
                                                                        Versement {installment.installment_number}
                                                                    </Box>
                                                                </TableCell>
                                                                <TableCell>
                                                                    <Chip
                                                                        label={`${installment.percentage}%`}
                                                                        size="small"
                                                                        sx={{
                                                                            background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
                                                                            color: 'white',
                                                                            fontWeight: 'bold'
                                                                        }}
                                                                    />
                                                                </TableCell>
                                                                <TableCell sx={{ fontWeight: 'bold', color: '#27ae60' }}>
                                                                    {formatCurrency(installment.amount)}
                                                                </TableCell>
                                                                <TableCell>
                                                                    <Box display="flex" alignItems="center" gap={1}>
                                                                        <ScheduleIcon sx={{ fontSize: 16, color: '#f39c12' }} />
                                                                        {installment.due_date ? new Date(installment.due_date).toLocaleDateString('fr-FR') : 'Non définie'}
                                                                    </Box>
                                                                </TableCell>
                                                                <TableCell>
                                                                    <Chip
                                                                        label="Configuré"
                                                                        size="small"
                                                                        sx={{
                                                                            background: 'linear-gradient(135deg, #27ae60 0%, #2ecc71 100%)',
                                                                            color: 'white',
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
                                            <Alert severity="info">
                                                Aucun versement configuré pour ce niveau.
                                            </Alert>
                                        )}
                                    </CardContent>
                                </Card>

                                {/* Détails des versements des élèves */}
                                {installmentsDetails.student_installments.length > 0 && (
                                    <Card
                                        sx={{ 
                                            borderRadius: 3,
                                            boxShadow: '0 8px 32px rgba(0,0,0,0.1)',
                                            border: '1px solid rgba(0,0,0,0.05)',
                                            background: 'linear-gradient(145deg, #ffffff 0%, #f8f9fa 100%)'
                                        }}
                                    >
                                        <CardContent sx={{ p: 3 }}>
                                            <Typography 
                                                variant="h6" 
                                                gutterBottom
                                                sx={{ 
                                                    color: '#2c3e50', 
                                                    fontWeight: 600,
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: 1,
                                                    mb: 3
                                                }}
                                            >
                                                <PeopleIcon sx={{ color: '#667eea' }} />
                                                Versements des Élèves
                                            </Typography>
                                            <TableContainer 
                                                component={Paper} 
                                                sx={{ 
                                                    maxHeight: 400,
                                                    borderRadius: 2,
                                                    boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
                                                    border: '1px solid rgba(0,0,0,0.05)'
                                                }}
                                            >
                                                <Table size="small" stickyHeader>
                                                    <TableHead>
                                                        <TableRow sx={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
                                                            <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Élève</TableCell>
                                                            <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Classe</TableCell>
                                                            <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Versement</TableCell>
                                                            <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Montant</TableCell>
                                                            <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Payé</TableCell>
                                                            <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Reste</TableCell>
                                                            <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Statut</TableCell>
                                                            <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Échéance</TableCell>
                                                        </TableRow>
                                                    </TableHead>
                                                    <TableBody>
                                                        {installmentsDetails.student_installments.map((studentInstallment, index) => (
                                                            <TableRow 
                                                                key={index}
                                                                sx={{ 
                                                                    '&:nth-of-type(odd)': { 
                                                                        backgroundColor: 'rgba(0,0,0,0.02)' 
                                                                    },
                                                                    '&:hover': {
                                                                        backgroundColor: 'rgba(102, 126, 234, 0.05)'
                                                                    }
                                                                }}
                                                            >
                                                                <TableCell sx={{ fontWeight: 500 }}>
                                                                    <Box display="flex" alignItems="center" gap={1}>
                                                                        <Avatar sx={{ 
                                                                            width: 28, 
                                                                            height: 28, 
                                                                            bgcolor: '#667eea',
                                                                            fontSize: '0.75rem'
                                                                        }}>
                                                                            {studentInstallment.first_name.charAt(0)}{studentInstallment.last_name.charAt(0)}
                                                                        </Avatar>
                                                                        <Box>
                                                                            <Typography variant="body2" sx={{ fontWeight: 500 }}>
                                                                                {studentInstallment.first_name} {studentInstallment.last_name}
                                                                            </Typography>
                                                                        </Box>
                                                                    </Box>
                                                                </TableCell>
                                                                <TableCell>
                                                                    <Chip
                                                                        label={studentInstallment.class_name}
                                                                        size="small"
                                                                        sx={{
                                                                            background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
                                                                            color: 'white',
                                                                            fontWeight: 'bold'
                                                                        }}
                                                                    />
                                                                </TableCell>
                                                                <TableCell>
                                                                    <Box display="flex" alignItems="center" gap={1}>
                                                                        <Avatar sx={{ 
                                                                            width: 24, 
                                                                            height: 24, 
                                                                            bgcolor: '#4facfe',
                                                                            fontSize: '0.75rem'
                                                                        }}>
                                                                            {studentInstallment.installment_number}
                                                                        </Avatar>
                                                                        Versement {studentInstallment.installment_number}
                                                                    </Box>
                                                                </TableCell>
                                                                <TableCell sx={{ fontWeight: 'bold', color: '#2c3e50' }}>
                                                                    {formatCurrency(studentInstallment.amount)}
                                                                </TableCell>
                                                                <TableCell sx={{ fontWeight: 'bold', color: '#27ae60' }}>
                                                                    {formatCurrency(studentInstallment.amount_paid)}
                                                                </TableCell>
                                                                <TableCell sx={{ fontWeight: 'bold', color: studentInstallment.balance > 0 ? '#e74c3c' : '#27ae60' }}>
                                                                    {formatCurrency(studentInstallment.balance)}
                                                                </TableCell>
                                                                <TableCell>
                                                                    <Chip
                                                                        label={studentInstallment.status === 'paid' ? 'Payé' : 
                                                                               studentInstallment.status === 'overdue' ? 'En retard' : 'En attente'}
                                                                        size="small"
                                                                        sx={{
                                                                            background: studentInstallment.status === 'paid' ? 
                                                                                'linear-gradient(135deg, #27ae60 0%, #2ecc71 100%)' :
                                                                                studentInstallment.status === 'overdue' ? 
                                                                                'linear-gradient(135deg, #e74c3c 0%, #ec7063 100%)' :
                                                                                'linear-gradient(135deg, #f39c12 0%, #f7dc6f 100%)',
                                                                            color: 'white',
                                                                            fontWeight: 'bold'
                                                                        }}
                                                                    />
                                                                </TableCell>
                                                                <TableCell>
                                                                    <Box display="flex" alignItems="center" gap={1}>
                                                                        <ScheduleIcon sx={{ fontSize: 16, color: '#3498db' }} />
                                                                        {new Date(studentInstallment.due_date).toLocaleDateString('fr-FR')}
                                                                    </Box>
                                                                </TableCell>
                                                            </TableRow>
                                                        ))}
                                                    </TableBody>
                                                </Table>
                                            </TableContainer>
                                        </CardContent>
                                    </Card>
                                )}
                            </Box>
                        ) : null}
                    </DialogContent>
                    <DialogActions sx={{ p: 3, background: 'linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%)' }}>
                        <Button 
                            onClick={handleCloseInstallmentsDialog}
                            variant="contained"
                            size="large"
                            sx={{
                                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                                color: 'white',
                                px: 4,
                                py: 1.5,
                                borderRadius: 2,
                                fontWeight: 'bold',
                                '&:hover': {
                                    background: 'linear-gradient(135deg, #5a6fd8 0%, #6a4190 100%)',
                                    transform: 'translateY(-2px)',
                                    boxShadow: '0 8px 25px rgba(0,0,0,0.2)'
                                },
                                transition: 'all 0.3s ease'
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

export default EducationLevels;

