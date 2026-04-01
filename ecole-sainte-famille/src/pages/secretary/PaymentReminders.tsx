import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
    Box,
    Typography,
    Button,
    Card,
    CardContent,
    Grid,
    Avatar,
    Chip,
    Alert,
    Snackbar,
    CircularProgress,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Paper,
    Divider,
    IconButton,
    Tooltip
} from '@mui/material';
import SecretarySidebar from '../../components/SecretarySidebar';
import {
    Email as EmailIcon,
    School as SchoolIcon,
    Class as ClassIcon,
    Person as PersonIcon,
    Send as SendIcon,
    Warning as WarningIcon,
    TrendingUp as TrendingUpIcon,
    AccountBalance as AccountBalanceIcon,
    Refresh as RefreshIcon,
    Info as InfoIcon
} from '@mui/icons-material';

interface OverdueStats {
    general: {
        total_students_with_overdue: number;
        total_overdue_installments: number;
        total_overdue_amount: number;
    };
    by_level: Array<{
        id: number;
        level_name: string;
        students_count: number;
        installments_count: number;
        total_amount: number;
    }>;
    by_class: Array<{
        id: number;
        class_name: string;
        level_name: string;
        students_count: number;
        installments_count: number;
        total_amount: number;
    }>;
}

interface OverdueStudent {
    student_id: number;
    student_first_name: string;
    student_last_name: string;
    parent_email: string;
    parent_first_name: string;
    parent_last_name: string;
    class_name: string;
    level_name: string;
    installments: Array<{
        id: number;
        installment_number: number;
        amount: number;
        due_date: string;
        balance: number;
        amount_paid: number;
    }>;
    total_amount: number;
}

const PaymentReminders: React.FC = () => {
    const [stats, setStats] = useState<OverdueStats | null>(null);
    const [loading, setLoading] = useState(true);
    const [sending, setSending] = useState(false);
    const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' as 'success' | 'error' });
    const [confirmDialog, setConfirmDialog] = useState<{ open: boolean; type: string; id: number | null; name: string }>({ open: false, type: '', id: null, name: '' });
    const [overdueStudents, setOverdueStudents] = useState<OverdueStudent[]>([]);
    const [showDetails, setShowDetails] = useState(false);

    useEffect(() => {
        fetchStatistics();
    }, []);

    const fetchStatistics = async () => {
        try {
            setLoading(true);
            const response = await axios.get('https://saintefamilleexcellence.ci/api/reminders/statistics', {
                headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
                params: { school_year: '2025-2026' }
            });
            setStats(response.data.data);
        } catch (error) {
            console.error('Erreur lors du chargement des statistiques:', error);
            setSnackbar({
                open: true,
                message: 'Erreur lors du chargement des statistiques',
                severity: 'error'
            });
        } finally {
            setLoading(false);
        }
    };

    const fetchOverdueStudents = async () => {
        try {
            const response = await axios.get('https://saintefamilleexcellence.ci/api/reminders/overdue/all-school', {
                headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
                params: { school_year: '2025-2026' }
            });
            
            // Grouper les versements par élève
            const grouped = response.data.data.reduce((acc: any, installment: any) => {
                const studentId = installment.student_id;
                if (!acc[studentId]) {
                    acc[studentId] = {
                        student_id: studentId,
                        student_first_name: installment.student_first_name,
                        student_last_name: installment.student_last_name,
                        parent_email: installment.parent_email,
                        parent_first_name: installment.parent_first_name,
                        parent_last_name: installment.parent_last_name,
                        class_name: installment.class_name,
                        level_name: installment.level_name,
                        installments: [],
                        total_amount: 0
                    };
                }
                acc[studentId].installments.push({
                    id: installment.id,
                    installment_number: installment.installment_number,
                    amount: installment.amount,
                    due_date: installment.due_date,
                    balance: installment.balance,
                    amount_paid: installment.amount_paid
                });
                acc[studentId].total_amount += Number(installment.balance);
                return acc;
            }, {});
            
            setOverdueStudents(Object.values(grouped));
        } catch (error) {
            console.error('Erreur lors du chargement des élèves en retard:', error);
        }
    };

    const sendReminders = async (type: string, id?: number | null) => {
        try {
            setSending(true);
            let endpoint = '';
            
            switch (type) {
                case 'all':
                    endpoint = 'https://saintefamilleexcellence.ci/api/reminders/all-school';
                    break;
                case 'level':
                    endpoint = `https://saintefamilleexcellence.ci/api/reminders/level/${id}`;
                    break;
                case 'class':
                    endpoint = `https://saintefamilleexcellence.ci/api/reminders/class/${id}`;
                    break;
                case 'student':
                    endpoint = `https://saintefamilleexcellence.ci/api/reminders/student/${id}`;
                    break;
            }

            const response = await axios.post(endpoint, {}, {
                headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
                params: { school_year: '2025-2026' }
            });

            setSnackbar({
                open: true,
                message: response.data.message,
                severity: 'success'
            });

            // Rafraîchir les statistiques
            await fetchStatistics();
        } catch (error) {
            console.error('Erreur lors de l\'envoi des relances:', error);
            setSnackbar({
                open: true,
                message: 'Erreur lors de l\'envoi des relances',
                severity: 'error'
            });
        } finally {
            setSending(false);
            setConfirmDialog({ open: false, type: '', id: null, name: '' });
        }
    };

    const handleSendReminders = (type: string, id?: number, name?: string) => {
        setConfirmDialog({ open: true, type, id: id ?? null, name: name || '' });
    };

    const confirmSend = () => {
        sendReminders(confirmDialog.type, confirmDialog.id ?? undefined);
    };

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('fr-FR', {
            style: 'currency',
            currency: 'XOF',
            minimumFractionDigits: 0
        }).format(amount);
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('fr-FR');
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
                    background: 'linear-gradient(135deg, #d32f2f 0%, #b71c1c 100%)',
                    borderRadius: 3,
                    p: 3,
                    mb: 4,
                    color: 'white',
                    boxShadow: '0 8px 32px rgba(0,0,0,0.1)'
                }}>
                    <Box display="flex" alignItems="center" justifyContent="space-between">
                        <Box display="flex" alignItems="center" gap={2}>
                            <Avatar sx={{ bgcolor: 'rgba(255,255,255,0.2)' }}>
                                <EmailIcon />
                            </Avatar>
                            <Box>
                                <Typography variant="h4" component="h1" fontWeight="bold">
                                    Relances de Paiement
                                </Typography>
                                <Typography variant="subtitle1" sx={{ opacity: 0.9 }}>
                                    Envoyez des relances pour les versements en retard
                                </Typography>
                            </Box>
                        </Box>
                        <Box display="flex" gap={2}>
                            <Button
                                startIcon={<RefreshIcon />}
                                onClick={fetchStatistics}
                                sx={{
                                    background: 'rgba(255,255,255,0.2)',
                                    color: 'white',
                                    borderRadius: 2,
                                    '&:hover': { background: 'rgba(255,255,255,0.3)' }
                                }}
                            >
                                Actualiser
                            </Button>
                            <Button
                                startIcon={<InfoIcon />}
                                onClick={() => {
                                    fetchOverdueStudents();
                                    setShowDetails(true);
                                }}
                                sx={{
                                    background: 'rgba(255,255,255,0.2)',
                                    color: 'white',
                                    borderRadius: 2,
                                    '&:hover': { background: 'rgba(255,255,255,0.3)' }
                                }}
                            >
                                Voir détails
                            </Button>
                        </Box>
                    </Box>
                </Box>

                {/* Statistiques générales */}
                {stats && (
                    <Grid container spacing={3} mb={4}>
                        <Grid item xs={12} md={4}>
                            <Card sx={{
                                background: 'linear-gradient(135deg, #ffebee 0%, #ffcdd2 100%)',
                                borderRadius: 3,
                                boxShadow: '0 8px 32px rgba(0,0,0,0.1)'
                            }}>
                                <CardContent sx={{ p: 3, textAlign: 'center' }}>
                                    <Avatar sx={{ bgcolor: 'rgba(211,47,47,0.2)', color: '#d32f2f', width: 60, height: 60, mx: 'auto', mb: 2 }}>
                                        <PersonIcon sx={{ fontSize: 30 }} />
                                    </Avatar>
                                    <Typography variant="h4" fontWeight="bold" color="#d32f2f" mb={1}>
                                        {stats.general.total_students_with_overdue}
                                    </Typography>
                                    <Typography variant="body1" color="#666">
                                        Élèves en retard
                                    </Typography>
                                </CardContent>
                            </Card>
                        </Grid>
                        <Grid item xs={12} md={4}>
                            <Card sx={{
                                background: 'linear-gradient(135deg, #fff3e0 0%, #ffe0b2 100%)',
                                borderRadius: 3,
                                boxShadow: '0 8px 32px rgba(0,0,0,0.1)'
                            }}>
                                <CardContent sx={{ p: 3, textAlign: 'center' }}>
                                    <Avatar sx={{ bgcolor: 'rgba(255,152,0,0.2)', color: '#ff9800', width: 60, height: 60, mx: 'auto', mb: 2 }}>
                                        <WarningIcon sx={{ fontSize: 30 }} />
                                    </Avatar>
                                    <Typography variant="h4" fontWeight="bold" color="#ff9800" mb={1}>
                                        {stats.general.total_overdue_installments}
                                    </Typography>
                                    <Typography variant="body1" color="#666">
                                        Versements en retard
                                    </Typography>
                                </CardContent>
                            </Card>
                        </Grid>
                        <Grid item xs={12} md={4}>
                            <Card sx={{
                                background: 'linear-gradient(135deg, #e8f5e9 0%, #c8e6c9 100%)',
                                borderRadius: 3,
                                boxShadow: '0 8px 32px rgba(0,0,0,0.1)'
                            }}>
                                <CardContent sx={{ p: 3, textAlign: 'center' }}>
                                    <Avatar sx={{ bgcolor: 'rgba(76,175,80,0.2)', color: '#4caf50', width: 60, height: 60, mx: 'auto', mb: 2 }}>
                                        <AccountBalanceIcon sx={{ fontSize: 30 }} />
                                    </Avatar>
                                    <Typography variant="h4" fontWeight="bold" color="#4caf50" mb={1}>
                                        {formatCurrency(stats.general.total_overdue_amount)}
                                    </Typography>
                                    <Typography variant="body1" color="#666">
                                        Montant total dû
                                    </Typography>
                                </CardContent>
                            </Card>
                        </Grid>
                    </Grid>
                )}

                {/* Actions de relance */}
                <Grid container spacing={3}>
                    {/* Relance pour toute l'école */}
                    <Grid item xs={12} md={6} lg={3}>
                        <Card sx={{
                            borderRadius: 3,
                            boxShadow: '0 8px 32px rgba(0,0,0,0.1)',
                            background: 'linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%)',
                            border: '1px solid rgba(255,255,255,0.2)',
                            height: '100%'
                        }}>
                            <CardContent sx={{ p: 3, textAlign: 'center', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                                <Avatar sx={{ 
                                    bgcolor: 'rgba(211,47,47,0.1)', 
                                    color: '#d32f2f', 
                                    width: 80, 
                                    height: 80, 
                                    mx: 'auto', 
                                    mb: 2 
                                }}>
                                    <SchoolIcon sx={{ fontSize: 40 }} />
                                </Avatar>
                                <Typography variant="h6" fontWeight="bold" mb={2} color="#333">
                                    Toute l'École
                                </Typography>
                                <Typography variant="body2" color="#666" mb={3}>
                                    Envoyer des relances à tous les parents d'élèves en retard
                                </Typography>
                                <Button
                                    variant="contained"
                                    startIcon={<SendIcon />}
                                    onClick={() => handleSendReminders('all')}
                                    disabled={sending || !stats?.general.total_students_with_overdue}
                                    sx={{
                                        background: 'linear-gradient(135deg, #d32f2f 0%, #b71c1c 100%)',
                                        borderRadius: 2,
                                        textTransform: 'none',
                                        fontWeight: 'bold',
                                        '&:hover': {
                                            background: 'linear-gradient(135deg, #b71c1c 0%, #8d1a1a 100%)',
                                        }
                                    }}
                                >
                                    {sending ? 'Envoi...' : 'Envoyer Relances'}
                                </Button>
                            </CardContent>
                        </Card>
                    </Grid>

                    {/* Relances par niveau */}
                    {stats?.by_level.map((level) => (
                        <Grid item xs={12} md={6} lg={3} key={level.id}>
                            <Card sx={{
                                borderRadius: 3,
                                boxShadow: '0 8px 32px rgba(0,0,0,0.1)',
                                background: 'linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%)',
                                border: '1px solid rgba(255,255,255,0.2)',
                                height: '100%'
                            }}>
                                <CardContent sx={{ p: 3, textAlign: 'center', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                                    <Avatar sx={{ 
                                        bgcolor: 'rgba(25,118,210,0.1)', 
                                        color: '#1976d2', 
                                        width: 80, 
                                        height: 80, 
                                        mx: 'auto', 
                                        mb: 2 
                                    }}>
                                        <SchoolIcon sx={{ fontSize: 40 }} />
                                    </Avatar>
                                    <Typography variant="h6" fontWeight="bold" mb={1} color="#333">
                                        {level.level_name}
                                    </Typography>
                                    <Typography variant="body2" color="#666" mb={2}>
                                        {level.students_count} élève(s) • {formatCurrency(level.total_amount)}
                                    </Typography>
                                    <Button
                                        variant="contained"
                                        startIcon={<SendIcon />}
                                        onClick={() => handleSendReminders('level', level.id, level.level_name)}
                                        disabled={sending || level.students_count === 0}
                                        sx={{
                                            background: 'linear-gradient(135deg, #1976d2 0%, #1565c0 100%)',
                                            borderRadius: 2,
                                            textTransform: 'none',
                                            fontWeight: 'bold',
                                            '&:hover': {
                                                background: 'linear-gradient(135deg, #1565c0 0%, #0d47a1 100%)',
                                            }
                                        }}
                                    >
                                        {sending ? 'Envoi...' : 'Envoyer Relances'}
                                    </Button>
                                </CardContent>
                            </Card>
                        </Grid>
                    ))}

                    {/* Relances par classe */}
                    {stats?.by_class.map((classItem) => (
                        <Grid item xs={12} md={6} lg={3} key={classItem.id}>
                            <Card sx={{
                                borderRadius: 3,
                                boxShadow: '0 8px 32px rgba(0,0,0,0.1)',
                                background: 'linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%)',
                                border: '1px solid rgba(255,255,255,0.2)',
                                height: '100%'
                            }}>
                                <CardContent sx={{ p: 3, textAlign: 'center', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                                    <Avatar sx={{ 
                                        bgcolor: 'rgba(76,175,80,0.1)', 
                                        color: '#4caf50', 
                                        width: 80, 
                                        height: 80, 
                                        mx: 'auto', 
                                        mb: 2 
                                    }}>
                                        <ClassIcon sx={{ fontSize: 40 }} />
                                    </Avatar>
                                    <Typography variant="h6" fontWeight="bold" mb={1} color="#333">
                                        {classItem.class_name}
                                    </Typography>
                                    <Typography variant="body2" color="#666" mb={1}>
                                        {classItem.level_name}
                                    </Typography>
                                    <Typography variant="body2" color="#666" mb={2}>
                                        {classItem.students_count} élève(s) • {formatCurrency(classItem.total_amount)}
                                    </Typography>
                                    <Button
                                        variant="contained"
                                        startIcon={<SendIcon />}
                                        onClick={() => handleSendReminders('class', classItem.id, classItem.class_name)}
                                        disabled={sending || classItem.students_count === 0}
                                        sx={{
                                            background: 'linear-gradient(135deg, #4caf50 0%, #45a049 100%)',
                                            borderRadius: 2,
                                            textTransform: 'none',
                                            fontWeight: 'bold',
                                            '&:hover': {
                                                background: 'linear-gradient(135deg, #45a049 0%, #3d8b40 100%)',
                                            }
                                        }}
                                    >
                                        {sending ? 'Envoi...' : 'Envoyer Relances'}
                                    </Button>
                                </CardContent>
                            </Card>
                        </Grid>
                    ))}
                </Grid>

                {/* Dialog de confirmation */}
                <Dialog open={confirmDialog.open} onClose={() => setConfirmDialog({ open: false, type: '', id: null, name: '' })}>
                    <DialogTitle sx={{
                        background: 'linear-gradient(135deg, #d32f2f 0%, #b71c1c 100%)',
                        color: 'white',
                        borderRadius: '12px 12px 0 0'
                    }}>
                        <Box display="flex" alignItems="center" gap={2}>
                            <Avatar sx={{ bgcolor: 'rgba(255,255,255,0.2)' }}>
                                <EmailIcon />
                            </Avatar>
                            Confirmer l'envoi des relances
                        </Box>
                    </DialogTitle>
                    <DialogContent sx={{ p: 3 }}>
                        <Typography variant="body1" mb={2}>
                            Êtes-vous sûr de vouloir envoyer des relances de paiement pour :
                        </Typography>
                        <Typography variant="h6" fontWeight="bold" color="primary" mb={2}>
                            {confirmDialog.name || 'Toute l\'école'}
                        </Typography>
                        <Alert severity="warning" sx={{ mt: 2 }}>
                            Cette action enverra des emails à tous les parents concernés. Voulez-vous continuer ?
                        </Alert>
                    </DialogContent>
                    <DialogActions sx={{ p: 3, gap: 2 }}>
                        <Button 
                            onClick={() => setConfirmDialog({ open: false, type: '', id: null, name: '' })}
                            sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 'bold' }}
                        >
                            Annuler
                        </Button>
                        <Button 
                            onClick={confirmSend}
                            variant="contained"
                            sx={{
                                background: 'linear-gradient(135deg, #d32f2f 0%, #b71c1c 100%)',
                                borderRadius: 2,
                                textTransform: 'none',
                                fontWeight: 'bold',
                                px: 3,
                                '&:hover': {
                                    background: 'linear-gradient(135deg, #b71c1c 0%, #8d1a1a 100%)',
                                }
                            }}
                        >
                            Confirmer l'envoi
                        </Button>
                    </DialogActions>
                </Dialog>

                {/* Dialog des détails */}
                <Dialog open={showDetails} onClose={() => setShowDetails(false)} maxWidth="lg" fullWidth>
                    <DialogTitle sx={{
                        background: 'linear-gradient(135deg, #1976d2 0%, #1565c0 100%)',
                        color: 'white',
                        borderRadius: '12px 12px 0 0'
                    }}>
                        <Box display="flex" alignItems="center" gap={2}>
                            <Avatar sx={{ bgcolor: 'rgba(255,255,255,0.2)' }}>
                                <InfoIcon />
                            </Avatar>
                            Détail des versements en retard
                        </Box>
                    </DialogTitle>
                    <DialogContent sx={{ p: 3 }}>
                        <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2 }}>
                            <Table>
                                <TableHead sx={{ background: 'linear-gradient(135deg, #1976d2 0%, #1565c0 100%)' }}>
                                    <TableRow>
                                        <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Élève</TableCell>
                                        <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Classe</TableCell>
                                        <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Parent</TableCell>
                                        <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Email</TableCell>
                                        <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Montant dû</TableCell>
                                        <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Actions</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {overdueStudents.map((student, index) => (
                                        <TableRow key={student.student_id} sx={{
                                            background: index % 2 === 0 ? 'rgba(255,255,255,0.5)' : 'rgba(248,249,250,0.5)'
                                        }}>
                                            <TableCell>
                                                <Typography variant="subtitle2" fontWeight="bold">
                                                    {student.student_first_name} {student.student_last_name}
                                                </Typography>
                                            </TableCell>
                                            <TableCell>
                                                <Typography variant="body2">
                                                    {student.class_name} - {student.level_name}
                                                </Typography>
                                            </TableCell>
                                            <TableCell>
                                                <Typography variant="body2">
                                                    {student.parent_first_name} {student.parent_last_name}
                                                </Typography>
                                            </TableCell>
                                            <TableCell>
                                                <Typography variant="body2" color="primary">
                                                    {student.parent_email}
                                                </Typography>
                                            </TableCell>
                                            <TableCell>
                                                <Typography variant="subtitle2" fontWeight="bold" color="#d32f2f">
                                                    {formatCurrency(student.total_amount)}
                                                </Typography>
                                            </TableCell>
                                            <TableCell>
                                                <Button
                                                    size="small"
                                                    variant="outlined"
                                                    startIcon={<SendIcon />}
                                                    onClick={() => handleSendReminders('student', student.student_id, `${student.student_first_name} ${student.student_last_name}`)}
                                                    disabled={sending}
                                                    sx={{
                                                        borderColor: '#d32f2f',
                                                        color: '#d32f2f',
                                                        borderRadius: 2,
                                                        textTransform: 'none',
                                                        fontWeight: 'bold',
                                                        '&:hover': {
                                                            background: 'linear-gradient(135deg, #d32f2f 0%, #b71c1c 100%)',
                                                            color: 'white',
                                                            borderColor: 'transparent'
                                                        }
                                                    }}
                                                >
                                                    Relancer
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </TableContainer>
                    </DialogContent>
                    <DialogActions sx={{ p: 3 }}>
                        <Button 
                            onClick={() => setShowDetails(false)}
                            sx={{
                                background: 'linear-gradient(135deg, #1976d2 0%, #1565c0 100%)',
                                color: 'white',
                                borderRadius: 2,
                                textTransform: 'none',
                                fontWeight: 'bold',
                                px: 3,
                                '&:hover': {
                                    background: 'linear-gradient(135deg, #1565c0 0%, #0d47a1 100%)',
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

export default PaymentReminders;

