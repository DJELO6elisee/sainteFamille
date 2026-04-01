import React, { useState, useEffect, useMemo } from 'react';
import {
  Box, Typography, Paper, Grid, TextField, Button, Select, MenuItem, InputLabel, FormControl,
  Table, TableContainer, TableHead, TableRow, TableCell, TableBody,
  CircularProgress, Stack, Avatar, Chip, Card, CardContent, Menu, ListItemIcon, ListItemText
} from '@mui/material';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { Male, Female } from '@mui/icons-material';
import PrintIcon from '@mui/icons-material/Print';
import DescriptionIcon from '@mui/icons-material/Description';
import TableChartIcon from '@mui/icons-material/TableChart';
import GetAppIcon from '@mui/icons-material/GetApp';
import * as XLSX from 'xlsx';
import SecretarySidebar from '../components/SecretarySidebar';

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

// Fonction pour générer les années scolaires disponibles
function getSchoolYears(count = 5) {
  const current = getCurrentSchoolYear();
  const startYear = parseInt(current.split('-')[0], 10);
  return Array.from({ length: count }, (_, i) => {
    const start = startYear - i;
    return `${start}-${start + 1}`;
  }).reverse();
}

// Interfaces
interface Student {
  id: number;
  first_name: string;
  last_name: string;
  gender: string;
  date_of_birth: string;
  city: string; // for 'quartier'
  classe: string; // class name
  class_id: number;
  moyenne?: number;
  registration_number?: string;
  parent_phone?: string;
}

interface Classe {
    id: number;
    name: string;
}

const GestionEleves = () => {
    const [students, setStudents] = useState<Student[]>([]);
    const [classes, setClasses] = useState<Classe[]>([]);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();
    const [filters, setFilters] = useState({
        class_id: '',
        gender: '',
        age: '',
        quartier: ''
    });
    const [dynamicTitle, setDynamicTitle] = useState('Liste de tous les élèves');
    const [schoolYear, setSchoolYear] = useState(getCurrentSchoolYear());
    const [printMenuAnchor, setPrintMenuAnchor] = useState<null | HTMLElement>(null);

    const fetchStudents = async (currentFilters = filters) => {
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const headers = { Authorization: `Bearer ${token}` };
            
            // Construire les paramètres en omettant les valeurs vides
            const params: any = {
                school_year: schoolYear
            };
            
            // Ajouter les filtres seulement s'ils ont une valeur
            if (currentFilters.class_id && currentFilters.class_id !== '') {
                params.class_id = parseInt(currentFilters.class_id, 10);
            }
            if (currentFilters.gender && currentFilters.gender !== '') {
                params.gender = currentFilters.gender;
            }
            if (currentFilters.age && currentFilters.age !== '') {
                params.age_range = currentFilters.age;
            }
            if (currentFilters.quartier && currentFilters.quartier.trim() !== '') {
                params.quartier = currentFilters.quartier.trim();
            }
            
            console.log('Paramètres de recherche envoyés:', params);
            const response = await axios.get('https://saintefamilleexcellence.ci/api/students', { headers, params });
            console.log('Données brutes des élèves reçues:', response.data);
            setStudents(response.data);
        } catch (error) {
            console.error("Erreur lors du filtrage des élèves:", error);
            setStudents([]);
        } finally {
            setLoading(false);
        }
    };
    
    useEffect(() => {
        let isMounted = true;
        
        const fetchInitialData = async () => {
            if (!isMounted) return;
            setLoading(true);
            try {
                const token = localStorage.getItem('token');
                const headers = { Authorization: `Bearer ${token}` };
                
                const classesPromise = axios.get('https://saintefamilleexcellence.ci/api/classes', { headers });
                const studentsPromise = axios.get('https://saintefamilleexcellence.ci/api/students', { headers, params: { school_year: schoolYear } });
                
                const [classesRes, studentsRes] = await Promise.all([classesPromise, studentsPromise]);

                if (isMounted) {
                    setClasses(classesRes.data);
                    setStudents(studentsRes.data);
                }

            } catch (error) {
                console.error("Erreur lors de la récupération des données:", error);
                if (isMounted) {
                    setStudents([]);
                }
            } finally {
                if (isMounted) setLoading(false);
            }
        };

        fetchInitialData();
        
        return () => {
            isMounted = false;
        };
    }, [schoolYear]);

    // Effet pour déclencher la recherche quand l'année scolaire change
    useEffect(() => {
        if (schoolYear) {
            fetchStudents(filters);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [schoolYear]);

    useEffect(() => {
        let isMounted = true;
        
        let title = 'Liste des élèves';
        const activeFilters: string[] = [];
    
        if (filters.class_id) {
            const className = classes.find(c => c.id === Number(filters.class_id))?.name;
            if (className) activeFilters.push(`de la classe ${className}`);
        }
        if (filters.gender) {
            activeFilters.push(filters.gender === 'Masculin' ? 'hommes' : 'femmes');
        }
        if (filters.age) {
            activeFilters.push(filters.age === 'majeur' ? 'majeurs' : 'mineurs');
        }
        if (filters.quartier) {
            activeFilters.push(`du quartier "${filters.quartier}"`);
        }
    
        const hasActiveFilters = filters.class_id || filters.gender || filters.age || filters.quartier;

        if (activeFilters.length > 0) {
            title = `Résultats pour les élèves ${activeFilters.join(' et ')}`;
        }
    
        if (students.length === 0 && hasActiveFilters) {
            title = `Aucun élève ne correspond à votre recherche`;
        } else if (!hasActiveFilters) {
            title = 'Liste de tous les élèves';
        }
    
        if (isMounted) setDynamicTitle(title);
        
        return () => {
            isMounted = false;
        };
    }, [filters, students, classes]);

    const handleFilterChange = (e: React.ChangeEvent<HTMLInputElement | { name?: string; value: unknown }>) => {
        const { name, value } = e.target;
        setFilters(prev => ({ ...prev, [name!]: value as string }));
    };

    const handleSearch = () => {
        fetchStudents(filters);
    };

    const resetFilters = () => {
      const initialFilters = { class_id: '', gender: '', age: '', quartier: '' };
      setFilters(initialFilters);
      fetchStudents(initialFilters);
    }

    const calculateAge = (dob: string): number | null => {
        if (!dob) return null;
        
        let birthDate: Date;
        
        // Si la date est déjà formatée depuis la base de données (DD/MM/YYYY)
        if (typeof dob === 'string' && dob.includes('/')) {
            const parts = dob.split('/');
            if (parts.length === 3) {
                // Convertir DD/MM/YYYY en MM/DD/YYYY pour le constructeur Date de JavaScript
                birthDate = new Date(`${parts[1]}/${parts[0]}/${parts[2]}`);
            } else {
                return null;
            }
        } else {
            // Si c'est une date ISO ou autre format
            birthDate = new Date(dob);
        }
        
        const today = new Date();
        if (isNaN(birthDate.getTime()) || birthDate > today) {
            return null;
        }
        
        let age = today.getFullYear() - birthDate.getFullYear();
        const m = today.getMonth() - birthDate.getMonth();
        if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
            age--;
        }
        return age;
    };

    const summaryStats = useMemo(() => {
        const boys = students.filter(s => {
            if (!s.gender) return false;
            const gender = s.gender.toLowerCase().trim();
            return ['masculin', 'm', 'homme'].includes(gender);
        }).length;
        const girls = students.filter(s => {
            if (!s.gender) return false;
            const gender = s.gender.toLowerCase().trim();
            return ['féminin', 'f', 'femme'].includes(gender);
        }).length;

        return {
            total: students.length,
            boys,
            girls,
        };
    }, [students]);

    const getGenderDisplay = (genderStr?: string) => {
        if (!genderStr) return null;
        const gender = genderStr.toLowerCase().trim();

        if (['masculin', 'm', 'homme'].includes(gender)) {
            return { label: 'H', icon: <Male fontSize="small" />, color: 'info' as 'info' };
        }
        if (['féminin', 'f', 'femme'].includes(gender)) {
            return { label: 'F', icon: <Female fontSize="small" />, color: 'secondary' as 'secondary' };
        }
        return null;
    };

    const handlePrint = () => {
        window.print();
    };

    const handlePrintMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
        setPrintMenuAnchor(event.currentTarget);
    };

    const handlePrintMenuClose = () => {
        setPrintMenuAnchor(null);
    };

    const handleExportToWord = () => {
        const htmlContent = generateWordHTML();
        const blob = new Blob([htmlContent], { type: 'application/msword' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `liste_eleves_${schoolYear}_${new Date().toISOString().split('T')[0]}.doc`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        handlePrintMenuClose();
    };

    const handleExportToExcel = () => {
        const workbook = generateExcelWorkbook();
        const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
        const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `liste_eleves_${schoolYear}_${new Date().toISOString().split('T')[0]}.xlsx`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        handlePrintMenuClose();
    };

    const generateWordHTML = () => {
        const currentDate = new Date().toLocaleDateString('fr-FR');
        
        let htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <title>${dynamicTitle}</title>
            <style>
                body { font-family: Arial, sans-serif; margin: 20px; }
                .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #000; padding-bottom: 10px; }
                .logo { width: 80px; height: 80px; float: left; }
                .title { font-size: 18px; font-weight: bold; margin: 20px 0; }
                .date { font-size: 12px; color: #666; text-align: right; }
                table { width: 100%; border-collapse: collapse; margin-top: 20px; }
                th, td { border: 1px solid #000; padding: 8px; text-align: left; }
                th { background-color: #f0f0f0; font-weight: bold; text-align: center; }
                .summary { margin-top: 20px; padding-top: 10px; border-top: 1px solid #ccc; text-align: right; font-size: 12px; }
            </style>
        </head>
        <body>
            <div class="header">
                <img src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==" alt="Logo" class="logo">
                <div class="title">${dynamicTitle}</div>
                <div class="date">${currentDate}</div>
            </div>
            
            <table>
                <thead>
                    <tr>
                        <th>N°</th>
                        <th>Matricule</th>
                        <th>Nom et Prénoms</th>
                        <th>Classe</th>
                        <th>Genre</th>
                        <th>Numéro Parent</th>
                        <th>Date de naissance</th>
                    </tr>
                </thead>
                <tbody>`;

        // Trier les élèves par ordre alphabétique (nom puis prénom)
        const sortedStudents = [...students].sort((a, b) => {
            const nameA = `${a.last_name} ${a.first_name}`.toLowerCase();
            const nameB = `${b.last_name} ${b.first_name}`.toLowerCase();
            return nameA.localeCompare(nameB, 'fr');
        });

        sortedStudents.forEach((student, index) => {
            const genderDisplay = getGenderDisplay(student.gender);
            // Utiliser directement la date formatée depuis la base de données ou formater manuellement
            let birthDate = 'N/A';
            if (student.date_of_birth) {
                // Si la date vient déjà formatée de la base de données (DD/MM/YYYY)
                if (typeof student.date_of_birth === 'string' && student.date_of_birth.includes('/')) {
                    birthDate = student.date_of_birth;
                } else {
                    // Si c'est une date ISO, la convertir
                    const date = new Date(student.date_of_birth);
                    if (!isNaN(date.getTime())) {
                        birthDate = date.toLocaleDateString('fr-FR');
                    }
                }
            }
            
            htmlContent += `
                <tr>
                    <td>${index + 1}</td>
                    <td>${student.registration_number || 'N/A'}</td>
                    <td>${student.last_name} ${student.first_name}</td>
                    <td>${student.classe || 'N/A'}</td>
                    <td>${genderDisplay ? genderDisplay.label : 'N/A'}</td>
                    <td>${student.parent_phone || 'N/A'}</td>
                    <td>${birthDate}</td>
                </tr>`;
        });

        htmlContent += `
                </tbody>
            </table>
            
            <div class="summary">
                Total: <strong>${summaryStats.total}</strong> | 
                Garçons: <strong>${summaryStats.boys}</strong> | 
                Filles: <strong>${summaryStats.girls}</strong>
            </div>
        </body>
        </html>`;

        return htmlContent;
    };

    const generateExcelWorkbook = () => {
        // Créer le workbook
        const workbook = XLSX.utils.book_new();
        
        // Ajouter des informations sur l'école en haut
        const currentDate = new Date().toLocaleDateString('fr-FR');
        
        // Créer un nouveau worksheet avec les informations de l'école
        const schoolInfo = [
            ['LISTE DES ÉLÈVES', '', '', '', '', ''],
            [`Année scolaire: ${schoolYear}`, '', '', '', '', ''],
            [`Date d'édition: ${currentDate}`, '', '', '', '', ''],
            ['', '', '', '', '', ''],
            [`Total des élèves: ${students.length}`, '', '', '', '', ''],
            [`Garçons: ${summaryStats.boys}`, '', '', '', '', ''],
            [`Filles: ${summaryStats.girls}`, '', '', '', '', ''],
            ['', '', '', '', '', ''],
            ['N°', 'Matricule', 'Nom et Prénoms', 'Classe', 'Genre', 'Numéro Parent', 'Date de naissance']
        ];

        // Trier les élèves par ordre alphabétique (nom puis prénom)
        const sortedStudents = [...students].sort((a, b) => {
            const nameA = `${a.last_name} ${a.first_name}`.toLowerCase();
            const nameB = `${b.last_name} ${b.first_name}`.toLowerCase();
            return nameA.localeCompare(nameB, 'fr');
        });

        // Créer le worksheet complet avec les informations et les données
        const completeData = [
            ...schoolInfo,
            ...sortedStudents.map((student, index) => {
                const genderDisplay = getGenderDisplay(student.gender);
                
                // Utiliser directement la date formatée depuis la base de données ou formater manuellement
                let birthDate = 'N/A';
                if (student.date_of_birth) {
                    // Si la date vient déjà formatée de la base de données (DD/MM/YYYY)
                    if (typeof student.date_of_birth === 'string' && student.date_of_birth.includes('/')) {
                        birthDate = student.date_of_birth;
                    } else {
                        // Si c'est une date ISO, la convertir
                        const date = new Date(student.date_of_birth);
                        if (!isNaN(date.getTime())) {
                            birthDate = date.toLocaleDateString('fr-FR');
                        }
                    }
                }
                
                return [
                    index + 1,
                    student.registration_number || 'N/A',
                    `${student.last_name} ${student.first_name}`,
                    student.classe || 'N/A',
                    genderDisplay ? genderDisplay.label : 'N/A',
                    student.parent_phone || 'N/A',
                    birthDate
                ];
            })
        ];

        // Créer le worksheet avec toutes les données
        const newWorksheet = XLSX.utils.aoa_to_sheet(completeData);

        // Ajuster les largeurs des colonnes
        newWorksheet['!cols'] = [
            { wch: 25 },  // Colonne A (informations)
            { wch: 15 },  // Matricule
            { wch: 35 },  // Nom et Prénoms
            { wch: 20 },  // Classe
            { wch: 8 },   // Genre
            { wch: 15 },  // Numéro Parent
            { wch: 15 }   // Date de naissance
        ];

        // Appliquer le style au titre principal (A1)
        const titleCell = newWorksheet['A1'];
        if (titleCell) {
            titleCell.s = {
                font: { bold: true, size: 16, color: { rgb: "366092" } },
                alignment: { horizontal: "center", vertical: "center" }
            };
        }

        // Appliquer le style aux informations (A2, A3, A5, A6, A7)
        const infoCells = ['A2', 'A3', 'A5', 'A6', 'A7'];
        infoCells.forEach(cellRef => {
            const cell = newWorksheet[cellRef];
            if (cell) {
                cell.s = {
                    font: { bold: true },
                    alignment: { horizontal: "left" }
                };
            }
        });

        // Appliquer le style aux en-têtes du tableau (ligne 9)
        const headerRow = 8; // Index 8 = ligne 9 (0-indexed)
        for (let col = 0; col < 6; col++) {
            const cellAddress = XLSX.utils.encode_cell({ r: headerRow, c: col });
            const cell = newWorksheet[cellAddress];
            if (cell) {
                cell.s = {
                    font: { bold: true, color: { rgb: "FFFFFF" } },
                    fill: { fgColor: { rgb: "366092" } },
                    alignment: { horizontal: "center", vertical: "center" },
                    border: {
                        top: { style: "thin", color: { rgb: "000000" } },
                        bottom: { style: "thin", color: { rgb: "000000" } },
                        left: { style: "thin", color: { rgb: "000000" } },
                        right: { style: "thin", color: { rgb: "000000" } }
                    }
                };
            }
        }

        // Appliquer le style aux données du tableau (à partir de la ligne 10)
        const dataStartRow = 9; // Index 9 = ligne 10 (0-indexed)
        const totalRows = completeData.length;
        
        for (let row = dataStartRow; row < totalRows; row++) {
            for (let col = 0; col < 6; col++) {
                const cellAddress = XLSX.utils.encode_cell({ r: row, c: col });
                const cell = newWorksheet[cellAddress];
                if (cell) {
                    cell.s = {
                        alignment: { horizontal: "left", vertical: "center" },
                        border: {
                            top: { style: "thin", color: { rgb: "CCCCCC" } },
                            bottom: { style: "thin", color: { rgb: "CCCCCC" } },
                            left: { style: "thin", color: { rgb: "CCCCCC" } },
                            right: { style: "thin", color: { rgb: "CCCCCC" } }
                        }
                    };
                    
                    // Alterner les couleurs de fond des lignes
                    if (row % 2 === 0) {
                        cell.s.fill = { fgColor: { rgb: "F8F9FA" } };
                    }
                }
            }
        }

        // Fusionner les cellules du titre principal
        newWorksheet['!merges'] = [
            { s: { r: 0, c: 0 }, e: { r: 0, c: 5 } } // Titre principal fusionné sur toute la largeur
        ];

        XLSX.utils.book_append_sheet(workbook, newWorksheet, 'Liste des élèves');
        
        return workbook;
    };

    return (
        <Box sx={{ display: 'flex', minHeight: '100vh' }}>
            <SecretarySidebar />
            <Box sx={{ p: 3, flexGrow: 1, bgcolor: '#f4f6f8' }}>
                <style>
                    {`
                        @media print {
                            @page {
                                margin: 0.5cm;
                                size: A4;
                            }
                            * {
                                -webkit-print-color-adjust: exact !important;
                                print-color-adjust: exact !important;
                            }
                            .no-print {
                                display: none !important;
                            }
                            .print-only {
                                display: block !important;
                            }
                            /* Afficher la colonne de numérotation lors de l'impression */
                            .MuiTableHead-root .MuiTableCell-root.print-only,
                            .MuiTableBody-root .MuiTableCell-root.print-only {
                                display: table-cell !important;
                                text-align: center !important;
                                font-weight: bold !important;
                            }
                            /* Masquer la sidebar lors de l'impression */
                            .MuiDrawer-root,
                            .MuiDrawer-paper,
                            .no-print {
                                display: none !important;
                            }
                            /* Ajuster la zone de contenu principal */
                            .MuiBox-root:last-child {
                                width: 100% !important;
                                margin: 0 !important;
                                padding: 0 !important;
                                margin-left: 0 !important;
                            }
                            /* S'assurer que le conteneur principal occupe toute la largeur */
                            .MuiBox-root[style*="display: flex"] {
                                display: block !important;
                            }
                            body {
                                margin: 0 !important;
                                padding: 0 !important;
                                background: white !important;
                                font-family: Arial, sans-serif !important;
                            }
                            .MuiBox-root {
                                padding: 0 !important;
                                margin: 0 !important;
                                background: white !important;
                            }
                            .printable-area {
                                box-shadow: none !important;
                                width: 100% !important;
                                max-width: none !important;
                                margin: 0 !important;
                                padding: 0 !important;
                                background: white !important;
                                border-radius: 0 !important;
                            }
                            .print-header {
                                display: flex !important;
                                justify-content: space-between !important;
                                align-items: center !important;
                                margin-bottom: 20px !important;
                                padding-bottom: 10px !important;
                                border-bottom: 2px solid #000 !important;
                            }
                            .print-logo {
                                width: 80px !important;
                                height: 80px !important;
                                object-fit: contain !important;
                            }
                            .print-title {
                                flex: 1 !important;
                                text-align: center !important;
                                font-size: 18px !important;
                                font-weight: bold !important;
                                color: #000 !important;
                                margin: 0 20px !important;
                            }
                            .print-date {
                                font-size: 12px !important;
                                color: #666 !important;
                                text-align: right !important;
                            }
                            .MuiTableContainer-root {
                                max-height: none !important;
                                height: auto !important;
                                width: 100% !important;
                                overflow: visible !important;
                            }
                            .MuiTable-root {
                                width: 100% !important;
                                table-layout: fixed !important;
                                border-collapse: collapse !important;
                            }
                            /* Ajuster la largeur des colonnes restantes */
                            .MuiTableHead-root .MuiTableCell-root:nth-child(1),
                            .MuiTableBody-root .MuiTableCell-root:nth-child(1) {
                                width: 5% !important; /* N° */
                            }
                            .MuiTableHead-root .MuiTableCell-root:nth-child(2),
                            .MuiTableBody-root .MuiTableCell-root:nth-child(2) {
                                width: 10% !important; /* Matricule */
                            }
                            .MuiTableHead-root .MuiTableCell-root:nth-child(3),
                            .MuiTableBody-root .MuiTableCell-root:nth-child(3) {
                                width: 35% !important; /* Nom et Prénoms */
                            }
                            .MuiTableHead-root .MuiTableCell-root:nth-child(4),
                            .MuiTableBody-root .MuiTableCell-root:nth-child(4) {
                                width: 12% !important; /* Classe */
                            }
                            .MuiTableHead-root .MuiTableCell-root:nth-child(5),
                            .MuiTableBody-root .MuiTableCell-root:nth-child(5) {
                                width: 8% !important; /* Genre */
                            }
                            .MuiTableHead-root .MuiTableCell-root:nth-child(6),
                            .MuiTableBody-root .MuiTableCell-root:nth-child(6) {
                                width: 15% !important; /* Numéro Parent */
                            }
                            .MuiTableHead-root .MuiTableCell-root {
                                background-color: #f0f0f0 !important;
                                color: #000 !important;
                                font-weight: bold !important;
                                border: 1px solid #000 !important;
                                padding: 10px 8px !important;
                                text-align: center !important;
                                font-size: 12px !important;
                            }
                            .MuiTableBody-root .MuiTableRow-root {
                                background-color: transparent !important;
                                break-inside: avoid !important;
                            }
                            .MuiTableBody-root .MuiTableRow-root:nth-of-type(odd) {
                                background-color: transparent !important;
                            }
                            .MuiTableBody-root .MuiTableCell-root {
                                border: 1px solid #000 !important;
                                padding: 8px 6px !important;
                                color: #000 !important;
                                background-color: transparent !important;
                                font-size: 11px !important;
                                vertical-align: middle !important;
                            }
                            /* Masquer les colonnes Âge et Quartier lors de l'impression */
                            .MuiTableHead-root .MuiTableCell-root:nth-child(7),
                            .MuiTableHead-root .MuiTableCell-root:nth-child(8),
                            .MuiTableBody-root .MuiTableCell-root:nth-child(7),
                            .MuiTableBody-root .MuiTableCell-root:nth-child(8) {
                                display: none !important;
                            }
                            /* Masquer les avatars lors de l'impression */
                            .MuiAvatar-root {
                                display: none !important;
                            }
                            .MuiChip-root {
                                background-color: transparent !important;
                                color: #000 !important;
                                border: 1px solid #000 !important;
                                box-shadow: none !important;
                                font-size: 10px !important;
                                padding: 2px 6px !important;
                            }
                            .MuiAvatar-root {
                                background-color: #e0e0e0 !important;
                                color: #000 !important;
                                border: 1px solid #ccc !important;
                                width: 30px !important;
                                height: 30px !important;
                                font-size: 12px !important;
                            }
                            .MuiPaper-root {
                                box-shadow: none !important;
                                background: white !important;
                            }
                            .MuiStack-root {
                                background: white !important;
                            }
                            .print-summary {
                                margin-top: 15px !important;
                                padding-top: 10px !important;
                                border-top: 1px solid #ccc !important;
                                text-align: right !important;
                                font-size: 12px !important;
                                color: #000 !important;
                            }
                        }
                        .print-only {
                            display: none;
                        }
                    `}
                </style>
                <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 3 }} className="no-print">
                    <Typography variant="h4" sx={{ fontWeight: 'bold', color: 'primary.main' }} className="no-print">
                        Gestion des Élèves
                    </Typography>
                    <Stack direction="row" spacing={1}>
                        <Button 
                            variant="contained" 
                            startIcon={<PrintIcon />}
                            onClick={handlePrintMenuOpen}
                            endIcon={<GetAppIcon />}
                        >
                            Imprimer la liste
                        </Button>
                        <Menu
                            anchorEl={printMenuAnchor}
                            open={Boolean(printMenuAnchor)}
                            onClose={handlePrintMenuClose}
                            anchorOrigin={{
                                vertical: 'bottom',
                                horizontal: 'left',
                            }}
                            transformOrigin={{
                                vertical: 'top',
                                horizontal: 'left',
                            }}
                        >
                            <MenuItem onClick={handlePrint}>
                                <ListItemIcon>
                                    <PrintIcon fontSize="small" />
                                </ListItemIcon>
                                <ListItemText>Imprimer (PDF)</ListItemText>
                            </MenuItem>
                            <MenuItem onClick={handleExportToWord}>
                                <ListItemIcon>
                                    <DescriptionIcon fontSize="small" />
                                </ListItemIcon>
                                <ListItemText>Exporter vers Word</ListItemText>
                            </MenuItem>
                            <MenuItem onClick={handleExportToExcel}>
                                <ListItemIcon>
                                    <TableChartIcon fontSize="small" />
                                </ListItemIcon>
                                <ListItemText>Exporter vers Excel</ListItemText>
                            </MenuItem>
                        </Menu>
                        <Button 
                            variant="outlined" 
                            startIcon={<ArrowBackIcon />}
                            onClick={() => navigate('/secretary/dashboard')}
                        >
                            Retour
                        </Button>
                    </Stack>
                </Stack>

                <Box className="no-print" sx={{ mb: 3, display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Typography variant="h6">Année scolaire :</Typography>
                    <FormControl size="small">
                        <Select value={schoolYear} onChange={e => setSchoolYear(e.target.value)}>
                            {getSchoolYears(5).map((year) => (
                                <MenuItem key={year} value={year}>{year}</MenuItem>
                            ))}
                        </Select>
                    </FormControl>
                </Box>

                <Card className="no-print" sx={{ mb: 3 }}>
                    <CardContent>
                        <Grid container spacing={2} alignItems="center">
                            <Grid item xs={12} sm={6} md={2.5}>
                                <FormControl fullWidth>
                                    <InputLabel>Classe</InputLabel>
                                    <Select name="class_id" value={filters.class_id} label="Classe" onChange={handleFilterChange as any}>
                                        <MenuItem value=""><em>Toutes</em></MenuItem>
                                        {classes.map(c => <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>)}
                                    </Select>
                                </FormControl>
                            </Grid>
                            <Grid item xs={12} sm={6} md={2}>
                                <FormControl fullWidth>
                                    <InputLabel>Genre</InputLabel>
                                    <Select name="gender" value={filters.gender} label="Genre" onChange={handleFilterChange as any}>
                                        <MenuItem value=""><em>Tous</em></MenuItem>
                                        <MenuItem value="Masculin">Hommes</MenuItem>
                                        <MenuItem value="Féminin">Femmes</MenuItem>
                                    </Select>
                                </FormControl>
                            </Grid>
                            <Grid item xs={12} sm={6} md={2}>
                                <FormControl fullWidth>
                                    <InputLabel>Âge</InputLabel>
                                    <Select name="age" value={filters.age} label="Âge" onChange={handleFilterChange as any}>
                                        <MenuItem value=""><em>Tous</em></MenuItem>
                                        <MenuItem value="majeur">Majeur (18+)</MenuItem>
                                        <MenuItem value="mineur">Mineur (&lt;18)</MenuItem>
                                    </Select>
                                </FormControl>
                            </Grid>
                            <Grid item xs={12} sm={6} md={2.5}>
                                <TextField
                                    name="quartier"
                                    label="Quartier"
                                    value={filters.quartier}
                                    onChange={handleFilterChange}
                                    fullWidth
                                />
                            </Grid>
                            <Grid item xs={12} md={3}>
                                <Stack direction="row" spacing={1}>
                                    <Button variant="contained" onClick={handleSearch}>Rechercher</Button>
                                    <Button variant="outlined" onClick={resetFilters}>Réinitialiser</Button>
                                </Stack>
                            </Grid>
                        </Grid>
                    </CardContent>
                </Card>
                
                <Typography variant="h6" sx={{ mb: 2, fontWeight: '500' }} className="no-print">
                    {dynamicTitle}
                </Typography>

                {loading ? (
                    <Box sx={{ display: 'flex', justifyContent: 'center', p: 5 }}><CircularProgress /></Box>
                ) : (
                    <Paper sx={{ overflow: 'hidden', borderRadius: 2, boxShadow: 1 }} className="printable-area">
                        {/* En-tête d'impression avec logo et titre */}
                        <div className="print-only">
                            <div className="print-header">
                                <img 
                                    src="/img/pages/logo.jpg" 
                                    alt="Logo de l'établissement" 
                                    className="print-logo"
                                    onError={(e) => {
                                        e.currentTarget.style.display = 'none';
                                    }}
                                />
                                <div className="print-title">
                                    {dynamicTitle}
                                </div>
                                <div className="print-date">
                                    {new Date().toLocaleDateString('fr-FR')}
                                </div>
                            </div>
                        </div>
                        <TableContainer sx={{ maxHeight: '60vh' }}>
                            <Table stickyHeader>
                                <TableHead>
                                    <TableRow sx={{ '& .MuiTableCell-root': { bgcolor: 'primary.dark', color: 'white', fontWeight: '600' } }}>
                                        <TableCell className="print-only">N°</TableCell>
                                        <TableCell>Matricule</TableCell>
                                        <TableCell>Nom et Prénoms</TableCell>
                                        <TableCell>Classe</TableCell>
                                        <TableCell>Genre</TableCell>
                                        <TableCell>Numéro Parent</TableCell>
                                        <TableCell className="no-print">Âge</TableCell>
                                        <TableCell className="no-print">Quartier</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {[...students]
                                        .sort((a, b) => {
                                            const nameA = `${a.last_name} ${a.first_name}`.toLowerCase();
                                            const nameB = `${b.last_name} ${b.first_name}`.toLowerCase();
                                            return nameA.localeCompare(nameB, 'fr');
                                        })
                                        .map((student, index) => {
                                        const studentAge = calculateAge(student.date_of_birth);
                                        const genderDisplay = getGenderDisplay(student.gender);

                                        return (
                                            <TableRow 
                                                key={student.id} 
                                                hover 
                                                sx={{
                                                    '&:nth-of-type(odd)': { backgroundColor: '#f9f9f9' },
                                                    '&:last-child td, &:last-child th': { border: 0 },
                                                    cursor: 'pointer'
                                                }}
                                                onClick={() => navigate(`/secretary/student-details/${student.id}`)}
                                            >
                                                <TableCell className="print-only">{index + 1}</TableCell>
                                                <TableCell>{student.registration_number || 'N/A'}</TableCell>
                                                <TableCell>
                                                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                                        <Avatar sx={{ mr: 2, bgcolor: 'primary.light' }}>{student.first_name?.[0]}{student.last_name?.[0]}</Avatar>
                                                        {student.last_name} {student.first_name}
                                                    </Box>
                                                </TableCell>
                                                <TableCell>{student.classe || 'N/A'}</TableCell>
                                                <TableCell>
                                                    {genderDisplay ? (
                                                        <Chip
                                                            icon={genderDisplay.icon}
                                                            label={genderDisplay.label}
                                                            color={genderDisplay.color}
                                                            size="small"
                                                            variant="outlined"
                                                        />
                                                    ) : 'N/A'}
                                                </TableCell>
                                                <TableCell>{student.parent_phone || 'N/A'}</TableCell>
                                                <TableCell className="no-print">{studentAge !== null ? studentAge : 'N/A'}</TableCell>
                                                <TableCell className="no-print">{student.city}</TableCell>
                                            </TableRow>
                                        );
                                    })}
                                </TableBody>
                            </Table>
                        </TableContainer>
                         <Box sx={{ p: 2, display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 4, borderTop: '1px solid', borderColor: 'divider', bgcolor: '#f5f5f5' }} className="print-summary">
                            <Typography variant="body1">Total: <strong>{summaryStats.total}</strong></Typography>
                            {filters.gender !== 'Masculin' && <Typography variant="body1">Garçons: <strong>{summaryStats.boys}</strong></Typography>}
                            {filters.gender !== 'Féminin' && <Typography variant="body1">Filles: <strong>{summaryStats.girls}</strong></Typography>}
                        </Box>
                    </Paper>
                )}
            </Box>
        </Box>
    );
};

export default GestionEleves; 

