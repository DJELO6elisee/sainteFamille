/**
 * Script d'import de données Excel vers MySQL
 * 
 * Usage: node scripts/importExcel.js <chemin_vers_fichier_excel> [options]
 * 
 * Options:
 *   --sheet <nom>     : Nom de la feuille à importer (par défaut: première feuille)
 *   --class <id>      : ID de la classe pour l'inscription des élèves
 *   --year <année>    : Année scolaire (format: 2024-2025)
 *   --dry-run         : Mode test (ne pas insérer dans la base de données)
 *   --skip-rows <n>   : Nombre de lignes à ignorer au début (par défaut: 0)
 */

const XLSX = require('xlsx');
const pool = require('../config/database');
const { parseDateSafe, formatDateForAPI } = require('../utils/dateUtils');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

// Mapping des colonnes Excel vers les colonnes de la base de données
// Vous pouvez modifier ce mapping selon la structure de votre fichier Excel
const COLUMN_MAPPING = {
    // Informations de l'élève
    'Prénom': 'first_name',
    'Prenom': 'first_name',
    'First Name': 'first_name',
    'Nom': 'last_name',
    'Last Name': 'last_name',
    'Date de naissance': 'date_of_birth',
    'Date de Naissance': 'date_of_birth',
    'Date Naissance': 'date_of_birth',
    'Date Naiss': 'date_of_birth',
    'DateNaissance': 'date_of_birth',
    'DateNaiss': 'date_of_birth',
    'Date of Birth': 'date_of_birth',
    'DOB': 'date_of_birth',
    'Sexe': 'gender',
    'Genre': 'gender',
    'Gender': 'gender',
    'Adresse': 'address',
    'Address': 'address',
    'Matricule': 'registration_number',
    'Numéro Matricule': 'registration_number',
    'Registration Number': 'registration_number',
    'Ville': 'city',
    'City': 'city',
    'Quartier': 'city',
    'École précédente': 'previous_school',
    'Ecole précédente': 'previous_school',
    'Previous School': 'previous_school',
    'Classe précédente': 'previous_class',
    'Previous Class': 'previous_class',
    'Besoins spéciaux': 'special_needs',
    'Special Needs': 'special_needs',
    'Informations supplémentaires': 'additional_info',
    'Additional Info': 'additional_info',
    
    // Informations du parent
    'Prénom Parent': 'parent_first_name',
    'Prenom Parent': 'parent_first_name',
    'Parent First Name': 'parent_first_name',
    'Nom Parent': 'parent_last_name',
    'Parent Last Name': 'parent_last_name',
    'Téléphone Parent': 'parent_phone',
    'Phone Parent': 'parent_phone',
    'Email Parent': 'parent_email',
    'Parent Email': 'parent_email',
    'Contact Parent': 'parent_contact',
    'Parent Contact': 'parent_contact',
    'Contact Père': 'father_contact',
    'Father Contact': 'father_contact',
    'Contact Mère': 'mother_contact',
    'Mother Contact': 'mother_contact',
    'Contact Urgence': 'emergency_contact',
    'Emergency Contact': 'emergency_contact',
    
    // Autres
    'Cantine': 'cantine',
    'Mange à la cantine': 'eats_at_cantine',
    'Eats at Cantine': 'eats_at_cantine',
    'Allergie': 'allergy',
    'Allergy': 'allergy',
};

// Fonction pour normaliser les noms de colonnes
function normalizeColumnName(name) {
    if (!name) return null;
    return name.toString().trim();
}

// Fonction pour mapper les colonnes Excel aux colonnes de la base de données
function mapColumns(excelColumns) {
    const mapping = {};
    excelColumns.forEach((col, index) => {
        const normalizedCol = normalizeColumnName(col);
        if (COLUMN_MAPPING[normalizedCol]) {
            mapping[COLUMN_MAPPING[normalizedCol]] = index;
        }
    });
    return mapping;
}

// Fonction pour parser une valeur de date depuis Excel
function parseExcelDate(value) {
    if (!value) return null;
    
    // Si c'est un nombre (format Excel date)
    if (typeof value === 'number') {
        // Excel stocke les dates comme nombre de jours depuis le 1er janvier 1900
        const excelEpoch = new Date(1899, 11, 30);
        const date = new Date(excelEpoch.getTime() + value * 24 * 60 * 60 * 1000);
        return formatDateForAPI(date);
    }
    
    // Si c'est une chaîne, essayer de la parser
    if (typeof value === 'string') {
        const parsed = parseDateSafe(value);
        return parsed ? formatDateForAPI(parsed) : null;
    }
    
    // Si c'est déjà une Date
    if (value instanceof Date) {
        return formatDateForAPI(value);
    }
    
    return null;
}

// Fonction pour traiter une valeur de champ
function processField(value, fieldName) {
    if (value === null || value === undefined) return null;
    
    const strValue = String(value).trim();
    if (strValue === '' || strValue.toLowerCase() === 'null' || strValue.toLowerCase() === 'n/a') {
        return null;
    }
    
    // Traitement spécial pour les dates
    if (fieldName === 'date_of_birth') {
        return parseExcelDate(value);
    }
    
    // Traitement spécial pour la cantine (peut être 1/0, oui/non, true/false)
    if (fieldName === 'cantine' || fieldName === 'eats_at_cantine') {
        const lowerValue = strValue.toLowerCase();
        if (lowerValue === 'oui' || lowerValue === 'yes' || lowerValue === '1' || lowerValue === 'true' || lowerValue === 'vrai') {
            return 1;
        }
        return 0;
    }
    
    return strValue;
}

// Fonction pour générer un code unique
function generateCode(prefix, length = 6) {
    const random = Math.floor(Math.random() * Math.pow(10, length));
    return `${prefix}${String(random).padStart(length, '0')}`;
}

// Fonction principale d'import
async function importExcel(filePath, options = {}) {
    const {
        sheetName = null,
        classId = null,
        schoolYear = null,
        dryRun = false,
        skipRows = 0
    } = options;

    console.log('📊 Début de l\'import Excel...');
    console.log(`📁 Fichier: ${filePath}`);
    
    // Vérifier que le fichier existe
    if (!fs.existsSync(filePath)) {
        throw new Error(`Le fichier ${filePath} n'existe pas.`);
    }

    // Lire le fichier Excel
    console.log('📖 Lecture du fichier Excel...');
    const workbook = XLSX.readFile(filePath);
    
    // Sélectionner la feuille
    const sheet = sheetName 
        ? workbook.Sheets[sheetName] 
        : workbook.Sheets[workbook.SheetNames[0]];
    
    if (!sheet) {
        throw new Error(`La feuille "${sheetName || workbook.SheetNames[0]}" n'existe pas.`);
    }

    // Convertir en JSON
    const data = XLSX.utils.sheet_to_json(sheet, { 
        header: 1, 
        defval: null,
        raw: false 
    });

    if (data.length === 0) {
        throw new Error('Le fichier Excel est vide.');
    }

    // La première ligne (après skipRows) contient les en-têtes
    const headerRow = data[skipRows];
    if (!headerRow || headerRow.length === 0) {
        throw new Error('Impossible de trouver les en-têtes dans le fichier Excel.');
    }

    console.log('📋 Colonnes trouvées:', headerRow.filter(h => h).join(', '));

    // Mapper les colonnes
    const columnMapping = mapColumns(headerRow);
    console.log('🗺️  Mapping des colonnes:', columnMapping);

    // Vérifier les colonnes obligatoires
    const requiredFields = ['first_name', 'last_name'];
    const missingFields = requiredFields.filter(field => !(field in columnMapping));
    if (missingFields.length > 0) {
        throw new Error(`Colonnes obligatoires manquantes: ${missingFields.join(', ')}`);
    }

    // Traiter les lignes de données
    const rows = data.slice(skipRows + 1);
    console.log(`📝 ${rows.length} lignes de données à traiter`);

    const connection = await pool.getConnection();
    let successCount = 0;
    let errorCount = 0;
    const errors = [];

    try {
        for (let i = 0; i < rows.length; i++) {
            const row = rows[i];
            
            // Ignorer les lignes vides
            if (!row || row.length === 0 || row.every(cell => !cell || String(cell).trim() === '')) {
                continue;
            }

            try {
                // Extraire les données selon le mapping
                const studentData = {};
                for (const [dbField, excelIndex] of Object.entries(columnMapping)) {
                    const value = row[excelIndex];
                    studentData[dbField] = processField(value, dbField);
                }

                // Vérifier que les champs obligatoires sont présents
                if (!studentData.first_name || !studentData.last_name) {
                    errors.push(`Ligne ${i + skipRows + 2}: Prénom et/ou nom manquant(s)`);
                    errorCount++;
                    continue;
                }

                // Générer un matricule si absent
                if (!studentData.registration_number) {
                    const year = new Date().getFullYear();
                    studentData.registration_number = `MAT${year}${String(i + 1).padStart(4, '0')}`;
                }

                // Générer les codes si absents
                if (!studentData.student_code) {
                    studentData.student_code = generateCode('STU');
                }
                if (!studentData.parent_code) {
                    studentData.parent_code = generateCode('PAR');
                }

                // Valeurs par défaut
                studentData.registration_mode = 'onsite';
                if (studentData.cantine === null || studentData.cantine === undefined) {
                    studentData.cantine = 0;
                }
                if (studentData.eats_at_cantine === null || studentData.eats_at_cantine === undefined) {
                    studentData.eats_at_cantine = 0;
                }

                if (dryRun) {
                    console.log(`\n[DRY RUN] Ligne ${i + skipRows + 2}:`);
                    console.log(JSON.stringify(studentData, null, 2));
                    successCount++;
                } else {
                    // Insérer dans la base de données
                    await connection.beginTransaction();

                    try {
                        // Insérer l'élève
                        const [result] = await connection.query(`
                            INSERT INTO students (
                                user_id, first_name, last_name, date_of_birth, gender, address, 
                                registration_number, city, previous_school, previous_class, 
                                special_needs, additional_info, registration_mode, student_code, 
                                parent_code, parent_first_name, parent_last_name, parent_phone, 
                                parent_email, parent_contact, father_contact, mother_contact, 
                                emergency_contact, child_photo, cantine, eats_at_cantine, allergy
                            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                        `, [
                            null, // user_id
                            studentData.first_name || '',
                            studentData.last_name || '',
                            studentData.date_of_birth || null,
                            studentData.gender || '',
                            studentData.address || null,
                            studentData.registration_number,
                            studentData.city || null,
                            studentData.previous_school || '',
                            studentData.previous_class || '',
                            studentData.special_needs || '',
                            studentData.additional_info || '',
                            studentData.registration_mode || 'onsite',
                            studentData.student_code,
                            studentData.parent_code,
                            studentData.parent_first_name || '',
                            studentData.parent_last_name || '',
                            studentData.parent_phone || '',
                            studentData.parent_email || null,
                            studentData.parent_contact || null,
                            studentData.father_contact || '',
                            studentData.mother_contact || '',
                            studentData.emergency_contact || '',
                            studentData.child_photo || null,
                            studentData.cantine || 0,
                            studentData.eats_at_cantine || 0,
                            studentData.allergy || ''
                        ]);

                        const studentId = result.insertId;

                        // Si une classe est spécifiée, créer l'inscription
                        if (classId && schoolYear) {
                            await connection.query(`
                                INSERT INTO enrollments (student_id, class_id, school_year, status, enrollment_date)
                                VALUES (?, ?, ?, 'active', NOW())
                                ON DUPLICATE KEY UPDATE status = 'active'
                            `, [studentId, classId, schoolYear]);
                        }

                        await connection.commit();
                        successCount++;
                        console.log(`✅ Ligne ${i + skipRows + 2}: ${studentData.first_name} ${studentData.last_name} importé(e) avec succès (ID: ${studentId})`);

                    } catch (insertError) {
                        await connection.rollback();
                        throw insertError;
                    }
                }

            } catch (rowError) {
                errorCount++;
                const errorMsg = `Ligne ${i + skipRows + 2}: ${rowError.message}`;
                errors.push(errorMsg);
                console.error(`❌ ${errorMsg}`);
            }
        }

    } finally {
        connection.release();
    }

    // Résumé
    console.log('\n' + '='.repeat(50));
    console.log('📊 RÉSUMÉ DE L\'IMPORT');
    console.log('='.repeat(50));
    console.log(`✅ Succès: ${successCount}`);
    console.log(`❌ Erreurs: ${errorCount}`);
    
    if (errors.length > 0) {
        console.log('\n📋 Détails des erreurs:');
        errors.forEach(err => console.log(`  - ${err}`));
    }

    return {
        success: successCount,
        errors: errorCount,
        errorDetails: errors
    };
}

// Point d'entrée
if (require.main === module) {
    const args = process.argv.slice(2);
    
    if (args.length === 0) {
        console.log(`
Usage: node scripts/importExcel.js <chemin_vers_fichier_excel> [options]

Options:
  --sheet <nom>      Nom de la feuille à importer (par défaut: première feuille)
  --class <id>       ID de la classe pour l'inscription des élèves
  --year <année>     Année scolaire (format: 2024-2025)
  --dry-run          Mode test (ne pas insérer dans la base de données)
  --skip-rows <n>    Nombre de lignes à ignorer au début (par défaut: 0)

Exemples:
  node scripts/importExcel.js "Liste_Classe.xlsx"
  node scripts/importExcel.js "Liste_Classe.xlsx" --class 1 --year "2024-2025"
  node scripts/importExcel.js "Liste_Classe.xlsx" --sheet "Feuille1" --dry-run
        `);
        process.exit(1);
    }

    const filePath = args[0];
    const options = {};

    // Parser les arguments
    for (let i = 1; i < args.length; i++) {
        if (args[i] === '--sheet' && args[i + 1]) {
            options.sheetName = args[i + 1];
            i++;
        } else if (args[i] === '--class' && args[i + 1]) {
            options.classId = parseInt(args[i + 1]);
            i++;
        } else if (args[i] === '--year' && args[i + 1]) {
            options.schoolYear = args[i + 1];
            i++;
        } else if (args[i] === '--dry-run') {
            options.dryRun = true;
        } else if (args[i] === '--skip-rows' && args[i + 1]) {
            options.skipRows = parseInt(args[i + 1]);
            i++;
        }
    }

    // Exécuter l'import
    importExcel(filePath, options)
        .then(() => {
            console.log('\n✅ Import terminé avec succès!');
            process.exit(0);
        })
        .catch(error => {
            console.error('\n❌ Erreur lors de l\'import:', error.message);
            console.error(error.stack);
            process.exit(1);
        });
}

module.exports = { importExcel };
