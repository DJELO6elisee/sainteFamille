import React, { useState, useEffect, useMemo } from 'react';
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
    Snackbar,
    Alert,
    Card,
    CardContent,
    Grid,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Paper,
    IconButton,
    Container,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    Autocomplete,
    Chip
} from '@mui/material';
import SecretarySidebar from '../../components/SecretarySidebar';
import {
    Add as AddIcon,
    Edit as EditIcon,
    Delete as DeleteIcon,
    AttachMoney as MoneyIcon,
    DirectionsBus as CarIcon,
    ArrowBack as ArrowBackIcon,
    Receipt as ReceiptIcon
} from '@mui/icons-material';

const API_BASE = 'https://saintefamilleexcellence.ci/api/frais-annexes';
const API_STUDENTS = 'https://saintefamilleexcellence.ci/api/students';

interface AnnexeFee {
    id: number;
    name: string;
    amount: number;
    school_year: string;
    is_active: number;
    order_index: number;
    total_paid?: number;
}

interface CarZone {
    id: number;
    name: string;
    amount: number;
    school_year: string;
    is_active: number;
    order_index: number;
    total_paid?: number;
}

interface Student {
    id: number;
    first_name: string;
    last_name: string;
    registration_number?: string;
}

interface PaymentRow {
    id: number;
    student_id: number;
    school_year: string;
    annexe_fee_id: number | null;
    car_zone_id: number | null;
    amount: number;
    payment_date: string;
    payment_method: string;
    receipt_number: string | null;
    notes: string | null;
    annexe_fee_name: string | null;
    car_zone_name: string | null;
}

const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('fr-FR', { style: 'decimal', minimumFractionDigits: 0 }).format(value) + ' FCFA';
};

const formatDate = (d: string) => {
    if (!d) return '';
    return new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
};

const getSchoolYearOptions = () => {
    const current = new Date().getFullYear();
    const options: string[] = [];
    for (let i = -1; i <= 1; i++) options.push(`${current + i}-${current + i + 1}`);
    return options;
};

const PAYMENT_METHODS = ['Espèces', 'Chèque', 'Virement', 'Mobile Money'];

type ViewMode = 'home' | 'frais' | 'car';

const FraisAnnexes: React.FC = () => {
    const [view, setView] = useState<ViewMode>('home');
    const [schoolYear, setSchoolYear] = useState<string>(() => {
        const d = new Date();
        const y = d.getFullYear();
        const m = d.getMonth() + 1;
        return m >= 9 ? `${y}-${y + 1}` : `${y - 1}-${y}`;
    });
    const [annexeFees, setAnnexeFees] = useState<AnnexeFee[]>([]);
    const [carZones, setCarZones] = useState<CarZone[]>([]);
    const [loading, setLoading] = useState(true);
    const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' as 'success' | 'error' });

    const [openFeeDialog, setOpenFeeDialog] = useState(false);
    const [editingFee, setEditingFee] = useState<AnnexeFee | null>(null);
    const [feeForm, setFeeForm] = useState({ name: '', amount: 0 });

    const [openZoneDialog, setOpenZoneDialog] = useState(false);
    const [editingZone, setEditingZone] = useState<CarZone | null>(null);
    const [zoneForm, setZoneForm] = useState({ name: '', amount: 0 });

    const [students, setStudents] = useState<Student[]>([]);
    const [studentsLoading, setStudentsLoading] = useState(false);
    const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
    const [studentPayments, setStudentPayments] = useState<PaymentRow[]>([]);
    const [paymentsLoading, setPaymentsLoading] = useState(false);
    const [openPaymentDialog, setOpenPaymentDialog] = useState(false);
    const [paymentForm, setPaymentForm] = useState({
        annexe_fee_id: 0,
        car_zone_id: 0,
        amount: 0,
        payment_date: new Date().toISOString().slice(0, 10),
        payment_method: 'Espèces',
        receipt_number: '',
        notes: ''
    });

    const authHeader = () => ({ Authorization: `Bearer ${localStorage.getItem('token')}` });

    const fetchConfig = async () => {
        try {
            setLoading(true);
            const res = await axios.get(`${API_BASE}/config`, { params: { school_year: schoolYear }, headers: authHeader() });
            const data = res.data.data;
            setAnnexeFees(data.annexe_fees || []);
            setCarZones(data.car_zones || []);
        } catch (e: any) {
            setSnackbar({ open: true, message: e.response?.data?.message || 'Erreur chargement', severity: 'error' });
            setAnnexeFees([]);
            setCarZones([]);
        } finally {
            setLoading(false);
        }
    };

    const fetchStudents = async () => {
        try {
            setStudentsLoading(true);
            const res = await axios.get(API_STUDENTS, { headers: authHeader() });
            const list = Array.isArray(res.data) ? res.data : (res.data?.data || res.data?.students || []);
            setStudents(Array.isArray(list) ? list : []);
        } catch {
            setStudents([]);
        } finally {
            setStudentsLoading(false);
        }
    };

    const fetchStudentPayments = async () => {
        if (!selectedStudent) {
            setStudentPayments([]);
            return;
        }
        try {
            setPaymentsLoading(true);
            const res = await axios.get(`${API_BASE}/payments`, {
                params: { student_id: selectedStudent.id, school_year: schoolYear },
                headers: authHeader()
            });
            setStudentPayments(res.data.data || []);
        } catch {
            setStudentPayments([]);
        } finally {
            setPaymentsLoading(false);
        }
    };

    useEffect(() => { fetchConfig(); }, [schoolYear]);
    useEffect(() => { if (view === 'frais' || view === 'car') fetchStudents(); }, [view]);
    useEffect(() => { fetchStudentPayments(); }, [selectedStudent, schoolYear]);

    const paidAnnexeFeeIds = useMemo(() => new Set(studentPayments.filter(p => p.annexe_fee_id).map(p => p.annexe_fee_id)), [studentPayments]);
    const feesNotYetPaid = useMemo(() => annexeFees.filter(f => !paidAnnexeFeeIds.has(f.id)), [annexeFees, paidAnnexeFeeIds]);
    const studentPaymentsForCurrentView = useMemo(() => {
        if (view === 'frais') return studentPayments.filter(p => p.annexe_fee_id);
        if (view === 'car') return studentPayments.filter(p => p.car_zone_id);
        return [];
    }, [view, studentPayments]);

    const handleOpenFeeDialog = (fee?: AnnexeFee) => {
        setEditingFee(fee || null);
        setFeeForm(fee ? { name: fee.name, amount: fee.amount } : { name: '', amount: 0 });
        setOpenFeeDialog(true);
    };
    const handleCloseFeeDialog = () => { setOpenFeeDialog(false); setEditingFee(null); };
    const handleSaveFee = async () => {
        if (!feeForm.name.trim()) { setSnackbar({ open: true, message: 'Nom requis', severity: 'error' }); return; }
        try {
            const payload = { name: feeForm.name.trim(), amount: Number(feeForm.amount), school_year: schoolYear };
            if (editingFee) {
                await axios.put(`${API_BASE}/annexe-fees/${editingFee.id}`, { ...payload, is_active: 1 }, { headers: authHeader() });
                setSnackbar({ open: true, message: 'Frais annexe mis à jour', severity: 'success' });
            } else {
                await axios.post(`${API_BASE}/annexe-fees`, payload, { headers: authHeader() });
                setSnackbar({ open: true, message: 'Frais annexe créé', severity: 'success' });
            }
            handleCloseFeeDialog();
            fetchConfig();
        } catch (e: any) {
            setSnackbar({ open: true, message: e.response?.data?.message || 'Erreur', severity: 'error' });
        }
    };
    const handleDeleteFee = async (id: number) => {
        if (!window.confirm('Supprimer ce frais annexe ?')) return;
        try {
            await axios.delete(`${API_BASE}/annexe-fees/${id}`, { headers: authHeader() });
            setSnackbar({ open: true, message: 'Frais annexe supprimé', severity: 'success' });
            fetchConfig();
        } catch (e: any) {
            setSnackbar({ open: true, message: e.response?.data?.message || 'Erreur', severity: 'error' });
        }
    };

    const handleOpenZoneDialog = (zone?: CarZone) => {
        setEditingZone(zone || null);
        setZoneForm(zone ? { name: zone.name, amount: zone.amount } : { name: '', amount: 0 });
        setOpenZoneDialog(true);
    };
    const handleCloseZoneDialog = () => { setOpenZoneDialog(false); setEditingZone(null); };
    const handleSaveZone = async () => {
        if (!zoneForm.name.trim()) { setSnackbar({ open: true, message: 'Nom de zone requis', severity: 'error' }); return; }
        try {
            const payload = { name: zoneForm.name.trim(), amount: Number(zoneForm.amount), school_year: schoolYear };
            if (editingZone) {
                await axios.put(`${API_BASE}/car-zones/${editingZone.id}`, { ...payload, is_active: 1 }, { headers: authHeader() });
                setSnackbar({ open: true, message: 'Zone mise à jour', severity: 'success' });
            } else {
                await axios.post(`${API_BASE}/car-zones`, payload, { headers: authHeader() });
                setSnackbar({ open: true, message: 'Zone créée', severity: 'success' });
            }
            handleCloseZoneDialog();
            fetchConfig();
        } catch (e: any) {
            setSnackbar({ open: true, message: e.response?.data?.message || 'Erreur', severity: 'error' });
        }
    };
    const handleDeleteZone = async (id: number) => {
        if (!window.confirm('Supprimer cette zone ?')) return;
        try {
            await axios.delete(`${API_BASE}/car-zones/${id}`, { headers: authHeader() });
            setSnackbar({ open: true, message: 'Zone supprimée', severity: 'success' });
            fetchConfig();
        } catch (e: any) {
            setSnackbar({ open: true, message: e.response?.data?.message || 'Erreur', severity: 'error' });
        }
    };

    const handleOpenPaymentDialog = () => {
        if (!selectedStudent) { setSnackbar({ open: true, message: 'Sélectionnez un élève', severity: 'error' }); return; }
        if (view === 'frais') {
            const first = feesNotYetPaid[0];
            setPaymentForm({
                annexe_fee_id: first?.id || 0,
                car_zone_id: 0,
                amount: first?.amount || 0,
                payment_date: new Date().toISOString().slice(0, 10),
                payment_method: 'Espèces',
                receipt_number: '',
                notes: ''
            });
        } else {
            const first = carZones[0];
            setPaymentForm({
                annexe_fee_id: 0,
                car_zone_id: first?.id || 0,
                amount: first?.amount || 0,
                payment_date: new Date().toISOString().slice(0, 10),
                payment_method: 'Espèces',
                receipt_number: '',
                notes: ''
            });
        }
        setOpenPaymentDialog(true);
    };

    const handleSavePayment = async () => {
        if (!selectedStudent) return;
        const isAnnexe = view === 'frais';
        if (isAnnexe && !paymentForm.annexe_fee_id) {
            setSnackbar({ open: true, message: 'Choisissez un frais annexe', severity: 'error' });
            return;
        }
        if (!isAnnexe && !paymentForm.car_zone_id) {
            setSnackbar({ open: true, message: 'Choisissez une zone car', severity: 'error' });
            return;
        }
        try {
            await axios.post(`${API_BASE}/payments`, {
                student_id: selectedStudent.id,
                school_year: schoolYear,
                annexe_fee_id: isAnnexe ? paymentForm.annexe_fee_id : null,
                car_zone_id: !isAnnexe ? paymentForm.car_zone_id : null,
                amount: Number(paymentForm.amount),
                payment_date: paymentForm.payment_date,
                payment_method: paymentForm.payment_method,
                receipt_number: paymentForm.receipt_number || null,
                notes: paymentForm.notes || null
            }, { headers: authHeader() });
            setSnackbar({ open: true, message: 'Paiement enregistré', severity: 'success' });
            setOpenPaymentDialog(false);
            fetchStudentPayments();
            fetchConfig();
        } catch (e: any) {
            setSnackbar({ open: true, message: e.response?.data?.message || 'Erreur', severity: 'error' });
        }
    };

    return (
        <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: '#f0f4f8', background: 'linear-gradient(135deg, #f0f4f8 0%, #e8eef5 50%, #f5f7fa 100%)' }}>
            <SecretarySidebar />
            <Box sx={{ flexGrow: 1, p: 3 }}>
                <Container maxWidth="lg">
                    <Box
                        sx={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            flexWrap: 'wrap',
                            gap: 2,
                            mb: 3,
                            pb: 2,
                            borderBottom: '3px solid',
                            borderColor: 'primary.main',
                            borderRadius: 1
                        }}
                    >
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                            {view !== 'home' && (
                                <IconButton
                                    onClick={() => setView('home')}
                                    size="large"
                                    sx={{
                                        bgcolor: 'white',
                                        boxShadow: 2,
                                        border: '2px solid',
                                        borderColor: 'primary.light',
                                        '&:hover': { bgcolor: 'primary.main', color: 'white', borderColor: 'primary.main', transform: 'scale(1.05)' },
                                        '& .MuiSvgIcon-root': { fontSize: 28 },
                                        transition: 'all 0.2s ease'
                                    }}
                                >
                                    <ArrowBackIcon />
                                </IconButton>
                            )}
                            <Typography
                                variant="h4"
                                fontWeight={700}
                                sx={{
                                    fontSize: { xs: '1.35rem', sm: '1.5rem' },
                                    background: 'linear-gradient(90deg, #1565c0 0%, #0d47a1 100%)',
                                    backgroundClip: 'text',
                                    WebkitBackgroundClip: 'text',
                                    color: 'transparent'
                                }}
                            >
                                Frais annexes et Car
                            </Typography>
                        </Box>
                        <FormControl
                            size="medium"
                            sx={{
                                minWidth: 200,
                                '& .MuiInputBase-root': { fontSize: '1rem', bgcolor: 'white', borderRadius: 2, boxShadow: 1 },
                                '& .MuiOutlinedInput-notchedOutline': { borderColor: 'primary.light' },
                                '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: 'primary.main' }
                            }}
                            variant="outlined"
                        >
                            <InputLabel>Année scolaire</InputLabel>
                            <Select value={schoolYear} label="Année scolaire" onChange={(e) => setSchoolYear(e.target.value)}>
                                {getSchoolYearOptions().map((y) => <MenuItem key={y} value={y}>{y}</MenuItem>)}
                            </Select>
                        </FormControl>
                    </Box>

                    {view === 'home' && (
                        <>
                            <Box sx={{ p: 2, mb: 3, borderRadius: 2, bgcolor: 'white', borderLeft: '4px solid', borderLeftColor: 'info.main', boxShadow: 1 }}>
                                <Typography variant="body1" color="text.secondary" sx={{ fontSize: '1rem' }}>
                                    Les frais annexes sont payables une fois par élève et par année. Le car se paye par zone (plusieurs fois possible).
                                </Typography>
                            </Box>
                            <Grid container spacing={3}>
                                <Grid item xs={12} sm={6} md={4}>
                                    <Card
                                        onClick={() => setView('frais')}
                                        sx={{
                                            cursor: 'pointer',
                                            borderRadius: 3,
                                            boxShadow: 3,
                                            borderLeft: '5px solid',
                                            borderLeftColor: 'primary.main',
                                            transition: 'all 0.25s ease',
                                            '&:hover': {
                                                transform: 'translateY(-6px)',
                                                boxShadow: 6,
                                                borderLeftColor: 'primary.dark',
                                                '& .icon-box-frais': { transform: 'scale(1.1)', boxShadow: 4 }
                                            }
                                        }}
                                    >
                                        <CardContent sx={{ textAlign: 'center', py: 4, px: 3 }}>
                                            <Box
                                                className="icon-box-frais"
                                                sx={{
                                                    width: 56,
                                                    height: 56,
                                                    borderRadius: 2,
                                                    background: 'linear-gradient(135deg, #1976d2 0%, #0d47a1 100%)',
                                                    color: 'white',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    mx: 'auto',
                                                    mb: 2,
                                                    boxShadow: 2,
                                                    transition: 'transform 0.25s ease'
                                                }}
                                            >
                                                <ReceiptIcon sx={{ fontSize: 32 }} />
                                            </Box>
                                            <Typography variant="h6" fontWeight={600} gutterBottom color="primary.dark">Frais annexes</Typography>
                                            <Typography variant="body2" color="text.secondary">
                                                Configurer et enregistrer les paiements des frais annexes (une fois par élève et par an).
                                            </Typography>
                                        </CardContent>
                                    </Card>
                                </Grid>
                                <Grid item xs={12} sm={6} md={4}>
                                    <Card
                                        onClick={() => setView('car')}
                                        sx={{
                                            cursor: 'pointer',
                                            borderRadius: 3,
                                            boxShadow: 3,
                                            borderLeft: '5px solid',
                                            borderLeftColor: 'secondary.main',
                                            transition: 'all 0.25s ease',
                                            '&:hover': {
                                                transform: 'translateY(-6px)',
                                                boxShadow: 6,
                                                borderLeftColor: 'secondary.dark',
                                                '& .icon-box-car': { transform: 'scale(1.1)', boxShadow: 4 }
                                            }
                                        }}
                                    >
                                        <CardContent sx={{ textAlign: 'center', py: 5, px: 4 }}>
                                            <Box
                                                className="icon-box-car"
                                                sx={{
                                                    width: 72,
                                                    height: 72,
                                                    borderRadius: 2,
                                                    background: 'linear-gradient(135deg, #ed6c02 0%, #e65100 100%)',
                                                    color: 'white',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    mx: 'auto',
                                                    mb: 2,
                                                    boxShadow: 2,
                                                    transition: 'transform 0.25s ease'
                                                }}
                                            >
                                                <CarIcon sx={{ fontSize: 40 }} />
                                            </Box>
                                            <Typography variant="h5" fontWeight={600} gutterBottom sx={{ fontSize: '1.35rem', color: '#e65100' }}>Car par zones</Typography>
                                            <Typography variant="body1" color="text.secondary" sx={{ fontSize: '1rem' }}>
                                                Configurer les zones et enregistrer les paiements car (plusieurs fois par élève).
                                            </Typography>
                                        </CardContent>
                                    </Card>
                                </Grid>
                            </Grid>
                        </>
                    )}

                    {view === 'frais' && (
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                            <Card sx={{ borderRadius: 3, boxShadow: 3, borderTop: '4px solid', borderTopColor: 'primary.main', overflow: 'hidden' }}>
                                <CardContent sx={{ p: 3 }}>
                                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2, mb: 2.5 }}>
                                        <Typography variant="h5" fontWeight={600} sx={{ fontSize: '1.25rem', color: 'primary.dark' }}>Frais annexes ({schoolYear})</Typography>
                                        <Button variant="contained" startIcon={<AddIcon />} onClick={() => handleOpenFeeDialog()} size="large" sx={{ fontSize: '1rem', py: 1.25, borderRadius: 2, boxShadow: 2, '&:hover': { boxShadow: 4 } }}>
                                            Ajouter un frais
                                        </Button>
                                    </Box>
                                    {loading ? (
                                        <Typography color="text.secondary" sx={{ fontSize: '1rem' }}>Chargement...</Typography>
                                    ) : (
                                        <TableContainer sx={{ borderRadius: 2, overflow: 'hidden', border: '1px solid', borderColor: 'divider' }}>
                                            <Table sx={{ '& .MuiTableCell-root': { fontSize: '1rem', py: 1.5 } }}>
                                                <TableHead>
                                                    <TableRow sx={{ bgcolor: 'primary.main', '& .MuiTableCell-root': { color: 'white', fontWeight: 600, fontSize: '1.05rem !important', py: 1.5 } }}>
                                                        <TableCell>Nom</TableCell>
                                                        <TableCell align="right">Montant</TableCell>
                                                        <TableCell align="right">Total payé</TableCell>
                                                        <TableCell align="right" width={120}>Actions</TableCell>
                                                    </TableRow>
                                                </TableHead>
                                                <TableBody>
                                                    {annexeFees.length === 0 ? (
                                                        <TableRow><TableCell colSpan={4} align="center" sx={{ py: 4, color: 'text.secondary', fontSize: '1rem' }}>Aucun frais annexe. Cliquez sur « Ajouter un frais ».</TableCell></TableRow>
                                                    ) : (
                                                        annexeFees.map((fee, idx) => (
                                                            <TableRow key={fee.id} hover sx={{ bgcolor: idx % 2 === 1 ? 'action.hover' : 'transparent' }}>
                                                                <TableCell sx={{ fontSize: '1rem', py: 1.5, fontWeight: 500 }}>{fee.name}</TableCell>
                                                                <TableCell align="right" sx={{ py: 1.5 }}>
                                                                    <Chip label={formatCurrency(Number(fee.amount))} size="small" color="primary" variant="outlined" sx={{ fontWeight: 600 }} />
                                                                </TableCell>
                                                                <TableCell align="right" sx={{ fontSize: '1rem', py: 1.5, fontWeight: 600, color: (fee.total_paid ?? 0) > 0 ? 'success.main' : 'text.secondary' }}>
                                                                    {formatCurrency(Number(fee.total_paid ?? 0))}
                                                                </TableCell>
                                                                <TableCell align="right" sx={{ py: 1.5 }}>
                                                                    <IconButton size="medium" onClick={() => handleOpenFeeDialog(fee)} sx={{ color: 'primary.main', '&:hover': { bgcolor: 'primary.light', color: 'white' }, '& .MuiSvgIcon-root': { fontSize: 22 } }}><EditIcon /></IconButton>
                                                                    <IconButton size="medium" color="error" onClick={() => handleDeleteFee(fee.id)} sx={{ '&:hover': { bgcolor: 'error.light' }, '& .MuiSvgIcon-root': { fontSize: 22 } }}><DeleteIcon /></IconButton>
                                                                </TableCell>
                                                            </TableRow>
                                                        ))
                                                    )}
                                                </TableBody>
                                            </Table>
                                        </TableContainer>
                                    )}
                                </CardContent>
                            </Card>

                            <Card sx={{ borderRadius: 3, boxShadow: 3, borderLeft: '4px solid', borderLeftColor: 'primary.main' }}>
                                <CardContent sx={{ p: 3 }}>
                                    <Typography variant="h5" fontWeight={600} sx={{ mb: 2.5, fontSize: '1.25rem', color: 'primary.dark' }}>Paiement d'un élève</Typography>
                                    <Autocomplete
                                        options={students}
                                        getOptionLabel={(s) => `${s.last_name || ''} ${s.first_name || ''}`.trim() || `#${s.id}`}
                                        value={selectedStudent}
                                        onChange={(_, v) => setSelectedStudent(v)}
                                        loading={studentsLoading}
                                        renderInput={(params) => (
                                            <TextField
                                                {...params}
                                                label="Rechercher un élève"
                                                variant="outlined"
                                                sx={{
                                                    '& .MuiInputBase-root': { fontSize: '1rem', bgcolor: 'white', borderRadius: 2 },
                                                    '& .MuiInputLabel-root': { fontSize: '1rem' },
                                                    '& .MuiOutlinedInput-notchedOutline': { borderColor: 'primary.light' }
                                                }}
                                            />
                                        )}
                                        sx={{ maxWidth: 480, mb: 2.5, '& .MuiAutocomplete-input': { fontSize: '1rem' } }}
                                    />
                                    {selectedStudent && (
                                        <>
                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2.5, flexWrap: 'wrap' }}>
                                                <Chip label={`${selectedStudent.last_name} ${selectedStudent.first_name}`} color="primary" sx={{ fontSize: '1rem', py: 1.5, fontWeight: 600 }} />
                                                <Button variant="contained" startIcon={<MoneyIcon />} onClick={handleOpenPaymentDialog} size="large" sx={{ fontSize: '1rem', py: 1.25, borderRadius: 2, boxShadow: 2, '&:hover': { boxShadow: 4 } }}>
                                                    Enregistrer un paiement
                                                </Button>
                                            </Box>
                                            <Typography variant="subtitle1" color="text.secondary" sx={{ mb: 1.5, fontSize: '1rem' }}>Paiements frais annexes ({schoolYear})</Typography>
                                            {paymentsLoading ? <Typography variant="body1" sx={{ fontSize: '1rem' }}>Chargement...</Typography> : studentPaymentsForCurrentView.length === 0 ? (
                                                <Typography variant="body1" color="text.secondary" sx={{ fontSize: '1rem' }}>Aucun paiement.</Typography>
                                            ) : (
                                                <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2, borderColor: 'primary.light' }}>
                                                    <Table sx={{ '& .MuiTableCell-root': { fontSize: '1rem', py: 1.5 } }}>
                                                        <TableHead><TableRow sx={{ bgcolor: 'primary.light', '& .MuiTableCell-root': { color: 'grey.900', fontWeight: 600 } }}>
                                                            <TableCell>Libellé</TableCell>
                                                            <TableCell align="right">Montant</TableCell>
                                                            <TableCell>Date</TableCell>
                                                            <TableCell>Mode</TableCell>
                                                        </TableRow></TableHead>
                                                        <TableBody>
                                                            {studentPaymentsForCurrentView.map((p) => (
                                                                <TableRow key={p.id} hover>
                                                                    <TableCell sx={{ fontSize: '1rem' }}>{p.annexe_fee_name || '—'}</TableCell>
                                                                    <TableCell align="right" sx={{ fontSize: '1rem', fontWeight: 600, color: 'success.dark' }}>{formatCurrency(Number(p.amount))}</TableCell>
                                                                    <TableCell sx={{ fontSize: '1rem' }}>{formatDate(p.payment_date)}</TableCell>
                                                                    <TableCell sx={{ fontSize: '1rem' }}>{p.payment_method}</TableCell>
                                                                </TableRow>
                                                            ))}
                                                        </TableBody>
                                                    </Table>
                                                </TableContainer>
                                            )}
                                        </>
                                    )}
                                </CardContent>
                            </Card>
                        </Box>
                    )}

                    {view === 'car' && (
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                            <Card sx={{ borderRadius: 3, boxShadow: 3, borderTop: '4px solid', borderTopColor: 'secondary.main', overflow: 'hidden' }}>
                                <CardContent sx={{ p: 3 }}>
                                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2, mb: 2.5 }}>
                                        <Typography variant="h5" fontWeight={600} sx={{ fontSize: '1.25rem', color: 'secondary.dark' }}>Zones Car ({schoolYear})</Typography>
                                        <Button variant="contained" color="secondary" startIcon={<AddIcon />} onClick={() => handleOpenZoneDialog()} size="large" sx={{ fontSize: '1rem', py: 1.25, borderRadius: 2, boxShadow: 2, '&:hover': { boxShadow: 4 } }}>
                                            Ajouter une zone
                                        </Button>
                                    </Box>
                                    {loading ? (
                                        <Typography color="text.secondary" sx={{ fontSize: '1rem' }}>Chargement...</Typography>
                                    ) : (
                                        <TableContainer sx={{ borderRadius: 2, overflow: 'hidden', border: '1px solid', borderColor: 'divider' }}>
                                            <Table sx={{ '& .MuiTableCell-root': { fontSize: '1rem', py: 1.5 } }}>
                                                <TableHead>
                                                    <TableRow sx={{ bgcolor: 'secondary.main', '& .MuiTableCell-root': { color: 'white', fontWeight: 600, fontSize: '1.05rem !important', py: 1.5 } }}>
                                                        <TableCell>Zone</TableCell>
                                                        <TableCell align="right">Montant</TableCell>
                                                        <TableCell align="right">Total payé</TableCell>
                                                        <TableCell align="right" width={120}>Actions</TableCell>
                                                    </TableRow>
                                                </TableHead>
                                                <TableBody>
                                                    {carZones.length === 0 ? (
                                                        <TableRow><TableCell colSpan={4} align="center" sx={{ py: 4, color: 'text.secondary', fontSize: '1rem' }}>Aucune zone. Cliquez sur « Ajouter une zone ».</TableCell></TableRow>
                                                    ) : (
                                                        carZones.map((zone, idx) => (
                                                            <TableRow key={zone.id} hover sx={{ bgcolor: idx % 2 === 1 ? 'action.hover' : 'transparent' }}>
                                                                <TableCell sx={{ fontSize: '1rem', py: 1.5, fontWeight: 500 }}>{zone.name}</TableCell>
                                                                <TableCell align="right" sx={{ py: 1.5 }}>
                                                                    <Chip label={formatCurrency(Number(zone.amount))} size="small" color="secondary" variant="outlined" sx={{ fontWeight: 600 }} />
                                                                </TableCell>
                                                                <TableCell align="right" sx={{ fontSize: '1rem', py: 1.5, fontWeight: 600, color: (zone.total_paid ?? 0) > 0 ? 'success.main' : 'text.secondary' }}>
                                                                    {formatCurrency(Number(zone.total_paid ?? 0))}
                                                                </TableCell>
                                                                <TableCell align="right" sx={{ py: 1.5 }}>
                                                                    <IconButton size="medium" onClick={() => handleOpenZoneDialog(zone)} sx={{ color: 'secondary.main', '&:hover': { bgcolor: 'secondary.light', color: 'white' }, '& .MuiSvgIcon-root': { fontSize: 22 } }}><EditIcon /></IconButton>
                                                                    <IconButton size="medium" color="error" onClick={() => handleDeleteZone(zone.id)} sx={{ '&:hover': { bgcolor: 'error.light' }, '& .MuiSvgIcon-root': { fontSize: 22 } }}><DeleteIcon /></IconButton>
                                                                </TableCell>
                                                            </TableRow>
                                                        ))
                                                    )}
                                                </TableBody>
                                            </Table>
                                        </TableContainer>
                                    )}
                                </CardContent>
                            </Card>

                            <Card sx={{ borderRadius: 3, boxShadow: 3, borderLeft: '4px solid', borderLeftColor: 'secondary.main' }}>
                                <CardContent sx={{ p: 3 }}>
                                    <Typography variant="h5" fontWeight={600} sx={{ mb: 2.5, fontSize: '1.25rem', color: 'secondary.dark' }}>Paiement car — élève</Typography>
                                    <Autocomplete
                                        options={students}
                                        getOptionLabel={(s) => `${s.last_name || ''} ${s.first_name || ''}`.trim() || `#${s.id}`}
                                        value={selectedStudent}
                                        onChange={(_, v) => setSelectedStudent(v)}
                                        loading={studentsLoading}
                                        renderInput={(params) => (
                                            <TextField
                                                {...params}
                                                label="Rechercher un élève"
                                                variant="outlined"
                                                sx={{
                                                    '& .MuiInputBase-root': { fontSize: '1rem', bgcolor: 'white', borderRadius: 2 },
                                                    '& .MuiInputLabel-root': { fontSize: '1rem' },
                                                    '& .MuiOutlinedInput-notchedOutline': { borderColor: 'secondary.light' }
                                                }}
                                            />
                                        )}
                                        sx={{ maxWidth: 480, mb: 2.5, '& .MuiAutocomplete-input': { fontSize: '1rem' } }}
                                    />
                                    {selectedStudent && (
                                        <>
                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2.5, flexWrap: 'wrap' }}>
                                                <Chip label={`${selectedStudent.last_name} ${selectedStudent.first_name}`} color="secondary" sx={{ fontSize: '1rem', py: 1.5, fontWeight: 600 }} />
                                                <Button variant="contained" color="secondary" startIcon={<MoneyIcon />} onClick={handleOpenPaymentDialog} size="large" sx={{ fontSize: '1rem', py: 1.25, borderRadius: 2, boxShadow: 2, '&:hover': { boxShadow: 4 } }}>
                                                    Enregistrer un paiement car
                                                </Button>
                                            </Box>
                                            <Typography variant="subtitle1" color="text.secondary" sx={{ mb: 1.5, fontSize: '1rem' }}>Paiements car ({schoolYear})</Typography>
                                            {paymentsLoading ? <Typography variant="body1" sx={{ fontSize: '1rem' }}>Chargement...</Typography> : studentPaymentsForCurrentView.length === 0 ? (
                                                <Typography variant="body1" color="text.secondary" sx={{ fontSize: '1rem' }}>Aucun paiement.</Typography>
                                            ) : (
                                                <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2, borderColor: 'secondary.light' }}>
                                                    <Table sx={{ '& .MuiTableCell-root': { fontSize: '1rem', py: 1.5 } }}>
                                                        <TableHead><TableRow sx={{ bgcolor: 'secondary.light', '& .MuiTableCell-root': { color: 'grey.900', fontWeight: 600 } }}>
                                                            <TableCell>Zone</TableCell>
                                                            <TableCell align="right">Montant</TableCell>
                                                            <TableCell>Date</TableCell>
                                                            <TableCell>Mode</TableCell>
                                                        </TableRow></TableHead>
                                                        <TableBody>
                                                            {studentPaymentsForCurrentView.map((p) => (
                                                                <TableRow key={p.id} hover>
                                                                    <TableCell sx={{ fontSize: '1rem' }}>{p.car_zone_name || '—'}</TableCell>
                                                                    <TableCell align="right" sx={{ fontSize: '1rem', fontWeight: 600, color: 'success.dark' }}>{formatCurrency(Number(p.amount))}</TableCell>
                                                                    <TableCell sx={{ fontSize: '1rem' }}>{formatDate(p.payment_date)}</TableCell>
                                                                    <TableCell sx={{ fontSize: '1rem' }}>{p.payment_method}</TableCell>
                                                                </TableRow>
                                                            ))}
                                                        </TableBody>
                                                    </Table>
                                                </TableContainer>
                                            )}
                                        </>
                                    )}
                                </CardContent>
                            </Card>
                        </Box>
                    )}
                </Container>
            </Box>

            {/* Dialog Frais annexe */}
            <Dialog open={openFeeDialog} onClose={handleCloseFeeDialog} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 3, overflow: 'hidden' } }}>
                <DialogTitle sx={{ fontSize: '1.25rem', pb: 1.5, bgcolor: 'primary.main', color: 'white', fontWeight: 600 }}>{editingFee ? 'Modifier le frais annexe' : 'Nouveau frais annexe'}</DialogTitle>
                <DialogContent sx={{ '& .MuiInputBase-root': { fontSize: '1rem' }, '& .MuiInputLabel-root': { fontSize: '1rem' } }}>
                    <Grid container spacing={2.5} sx={{ mt: 0.5 }}>
                        <Grid item xs={12}>
                            <TextField fullWidth label="Nom" value={feeForm.name} onChange={(e) => setFeeForm({ ...feeForm, name: e.target.value })} placeholder="Ex: Assurance, Tenue" />
                        </Grid>
                        <Grid item xs={12}>
                            <TextField fullWidth type="number" label="Montant (FCFA)" value={feeForm.amount || ''} onChange={(e) => setFeeForm({ ...feeForm, amount: Number(e.target.value) || 0 })} inputProps={{ min: 0 }} />
                        </Grid>
                    </Grid>
                </DialogContent>
                <DialogActions sx={{ px: 3, pb: 2, pt: 1 }}>
                    <Button onClick={handleCloseFeeDialog} sx={{ fontSize: '1rem' }}>Annuler</Button>
                    <Button variant="contained" onClick={handleSaveFee} sx={{ fontSize: '1rem', py: 1 }}>Enregistrer</Button>
                </DialogActions>
            </Dialog>

            {/* Dialog Zone car */}
            <Dialog open={openZoneDialog} onClose={handleCloseZoneDialog} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 2 } }}>
                <DialogTitle sx={{ fontSize: '1.25rem', pb: 1.5 }}>{editingZone ? 'Modifier la zone car' : 'Nouvelle zone car'}</DialogTitle>
                <DialogContent sx={{ '& .MuiInputBase-root': { fontSize: '1rem' }, '& .MuiInputLabel-root': { fontSize: '1rem' } }}>
                    <Grid container spacing={2.5} sx={{ mt: 0.5 }}>
                        <Grid item xs={12}>
                            <TextField fullWidth label="Nom de la zone" value={zoneForm.name} onChange={(e) => setZoneForm({ ...zoneForm, name: e.target.value })} placeholder="Ex: Zone A, Cocody" />
                        </Grid>
                        <Grid item xs={12}>
                            <TextField fullWidth type="number" label="Montant (FCFA)" value={zoneForm.amount || ''} onChange={(e) => setZoneForm({ ...zoneForm, amount: Number(e.target.value) || 0 })} inputProps={{ min: 0 }} />
                        </Grid>
                    </Grid>
                </DialogContent>
                <DialogActions sx={{ px: 3, pb: 2, pt: 1 }}>
                    <Button onClick={handleCloseZoneDialog} sx={{ fontSize: '1rem' }}>Annuler</Button>
                    <Button variant="contained" color="secondary" onClick={handleSaveZone} sx={{ fontSize: '1rem', py: 1 }}>Enregistrer</Button>
                </DialogActions>
            </Dialog>

            {/* Dialog Paiement */}
            <Dialog open={openPaymentDialog} onClose={() => setOpenPaymentDialog(false)} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 3, overflow: 'hidden' } }}>
                <DialogTitle sx={{ fontSize: '1.25rem', pb: 1.5, bgcolor: 'success.dark', color: 'white', fontWeight: 600 }}>Enregistrer un paiement</DialogTitle>
                <DialogContent sx={{ '& .MuiInputBase-root': { fontSize: '1rem' }, '& .MuiInputLabel-root': { fontSize: '1rem' }, '& .MuiMenuItem-root': { fontSize: '1rem' } }}>
                    <Grid container spacing={2.5} sx={{ mt: 0.5 }}>
                        {view === 'frais' && (
                            <Grid item xs={12}>
                                <FormControl fullWidth>
                                    <InputLabel>Frais annexe</InputLabel>
                                    <Select value={paymentForm.annexe_fee_id || ''} label="Frais annexe" onChange={(e) => {
                                        const id = Number(e.target.value);
                                        const fee = annexeFees.find(f => f.id === id);
                                        setPaymentForm(prev => ({ ...prev, annexe_fee_id: id, amount: fee?.amount ?? 0 }));
                                    }}>
                                        {feesNotYetPaid.map((f) => <MenuItem key={f.id} value={f.id}>{f.name} — {formatCurrency(Number(f.amount))}</MenuItem>)}
                                        {feesNotYetPaid.length === 0 && <MenuItem value="">Aucun frais restant</MenuItem>}
                                    </Select>
                                </FormControl>
                            </Grid>
                        )}
                        {view === 'car' && (
                            <Grid item xs={12}>
                                <FormControl fullWidth>
                                    <InputLabel>Zone car</InputLabel>
                                    <Select value={paymentForm.car_zone_id || ''} label="Zone car" onChange={(e) => {
                                        const id = Number(e.target.value);
                                        const zone = carZones.find(z => z.id === id);
                                        setPaymentForm(prev => ({ ...prev, car_zone_id: id, amount: zone?.amount ?? 0 }));
                                    }}>
                                        {carZones.map((z) => <MenuItem key={z.id} value={z.id}>{z.name} — {formatCurrency(Number(z.amount))}</MenuItem>)}
                                    </Select>
                                </FormControl>
                            </Grid>
                        )}
                        <Grid item xs={12} sm={6}>
                            <TextField fullWidth type="number" label="Montant (FCFA)" value={paymentForm.amount || ''} onChange={(e) => setPaymentForm(prev => ({ ...prev, amount: Number(e.target.value) || 0 }))} inputProps={{ min: 0 }} />
                        </Grid>
                        <Grid item xs={12} sm={6}>
                            <TextField fullWidth type="date" label="Date" value={paymentForm.payment_date} onChange={(e) => setPaymentForm(prev => ({ ...prev, payment_date: e.target.value }))} InputLabelProps={{ shrink: true }} />
                        </Grid>
                        <Grid item xs={12} sm={6}>
                            <FormControl fullWidth>
                                <InputLabel>Mode de paiement</InputLabel>
                                <Select value={paymentForm.payment_method} label="Mode de paiement" onChange={(e) => setPaymentForm(prev => ({ ...prev, payment_method: e.target.value }))}>
                                    {PAYMENT_METHODS.map((m) => <MenuItem key={m} value={m}>{m}</MenuItem>)}
                                </Select>
                            </FormControl>
                        </Grid>
                        <Grid item xs={12} sm={6}>
                            <TextField fullWidth label="N° reçu" value={paymentForm.receipt_number} onChange={(e) => setPaymentForm(prev => ({ ...prev, receipt_number: e.target.value }))} />
                        </Grid>
                        <Grid item xs={12}>
                            <TextField fullWidth label="Notes" value={paymentForm.notes} onChange={(e) => setPaymentForm(prev => ({ ...prev, notes: e.target.value }))} multiline rows={2} />
                        </Grid>
                    </Grid>
                </DialogContent>
                <DialogActions sx={{ px: 3, pb: 2, pt: 1 }}>
                    <Button onClick={() => setOpenPaymentDialog(false)} sx={{ fontSize: '1rem' }}>Annuler</Button>
                    <Button variant="contained" onClick={handleSavePayment} sx={{ fontSize: '1rem', py: 1 }}>Enregistrer le paiement</Button>
                </DialogActions>
            </Dialog>

            <Snackbar open={snackbar.open} autoHideDuration={5000} onClose={() => setSnackbar(prev => ({ ...prev, open: false }))} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
                <Alert severity={snackbar.severity} onClose={() => setSnackbar(prev => ({ ...prev, open: false }))} sx={{ fontSize: '1rem' }}>{snackbar.message}</Alert>
            </Snackbar>
        </Box>
    );
};

export default FraisAnnexes;

