/**
 * Script pour générer un fichier SQL complet d'import des données CSV
 * Ce script lit les fichiers CSV et génère un script SQL complet pour :
 * 1. Créer les niveaux d'éducation (education_levels)
 * 2. Créer les classes (classes)
 * 3. Insérer les élèves (students)
 * 4. Créer les inscriptions (enrollments)
 * 5. Créer les versements (installments)
 */

const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');

// Configuration
const SCHOOL_YEAR = '2025-2026';
const CONFIG = {
    // Montants par niveau (à ajuster selon vos tarifs)
    education_levels: {
        // Primaire
        'CP1': { tuition: 500000, registration: 50000, cantine: 15000 },
        'CP2': { tuition: 500000, registration: 50000, cantine: 15000 },
        'CE1': { tuition: 500000, registration: 50000, cantine: 15000 },
        'CE2': { tuition: 500000, registration: 50000, cantine: 15000 },
        'CM1': { tuition: 500000, registration: 50000, cantine: 15000 },
        'CM2': { tuition: 500000, registration: 50000, cantine: 15000 },
        // Maternelle
        'MGS': { tuition: 400000, registration: 40000, cantine: 15000 },
        'MMS': { tuition: 400000, registration: 40000, cantine: 15000 },
        'MPS': { tuition: 400000, registration: 40000, cantine: 15000 },
    },
    // Configuration des versements (3 versements par défaut)
    installments: {
        count: 3,
        percentages: [40, 30, 30], // 40% à l'inscription, 30% au 2ème trimestre, 30% au 3ème trimestre
        due_dates: [
            '2025-09-01', // 1er versement
            '2025-12-01', // 2ème versement
            '2025-03-01'  // 3ème versement
        ]
    }
};

// Fonction pour parser une date DD/MM/YYYY en YYYY-MM-DD
function parseDate(dateStr) {
    if (!dateStr || dateStr.trim() === '') return null;
    const parts = dateStr.split('/');
    if (parts.length === 3) {
        return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
    }
    return null;
}

// Fonction pour normaliser le genre
function normalizeGender(gender) {
    if (!gender || gender.trim() === '') return null;
    const g = gender.toUpperCase().trim();
    if (g === 'F' || g === 'FÉMININ' || g === 'FEMME') return 'F';
    if (g === 'M' || g === 'MASCULIN' || g === 'HOMME') return 'M';
    return null;
}

// Fonction pour générer un code unique
function generateCode(prefix, index) {
    return `${prefix}${String(index).padStart(6, '0')}`;
}

// Fonction pour lire un fichier CSV
function readCSV(filePath) {
    const content = fs.readFileSync(filePath, 'utf-8');
    const lines = content.split('\n').filter(line => line.trim() !== '');
    const headers = lines[0].split(',').map(h => h.replace(/"/g, '').trim());
    
    const data = [];
    for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',').map(v => v.replace(/"/g, '').trim());
        if (values.length > 0 && values[0] !== '') {
            const row = {};
            headers.forEach((header, index) => {
                row[header] = values[index] || '';
            });
            data.push(row);
        }
    }
    return data;
}

// Fonction pour échapper les chaînes SQL
function escapeSQL(str) {
    if (str === null || str === undefined) return 'NULL';
    return `'${String(str).replace(/'/g, "''")}'`;
}

// Fonction principale
function generateSQL() {
    console.log('📊 Génération du script SQL complet...\n');

    // Lire les fichiers CSV
    const primairePath = path.join(__dirname, '../../Liste_Classe-POUR-PRIMAIRE-2526-GSTB.csv');
    const maternellePath = path.join(__dirname, '../../Liste_Classe-MATERNELLE-GSTB-2526.csv');

    console.log('📖 Lecture des fichiers CSV...');
    const primaireData = readCSV(primairePath);
    const maternelleData = readCSV(maternellePath);

    console.log(`✅ Primaire: ${primaireData.length} élèves`);
    console.log(`✅ Maternelle: ${maternelleData.length} élèves\n`);

    // Collecter toutes les classes uniques
    const classesSet = new Set();
    primaireData.forEach(row => {
        if (row.Classe) classesSet.add(row.Classe);
    });
    maternelleData.forEach(row => {
        if (row.Classe) classesSet.add(row.Classe);
    });

    const classes = Array.from(classesSet).sort();
    console.log(`📚 Classes trouvées: ${classes.join(', ')}\n`);

    // Générer le SQL
    let sql = `-- ============================================
-- Script SQL complet d'import des données
-- Généré automatiquement le ${new Date().toLocaleString('fr-FR')}
-- Année scolaire: ${SCHOOL_YEAR}
-- ============================================

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
SET FOREIGN_KEY_CHECKS = 0;

START TRANSACTION;

-- ============================================
-- 1. CRÉATION DES NIVEAUX D'ÉDUCATION
-- ============================================

`;

    // Insérer les niveaux d'éducation
    let levelId = 1;
    const levelMapping = {};
    classes.forEach(className => {
        const config = CONFIG.education_levels[className] || { tuition: 500000, registration: 50000, cantine: 15000 };
        levelMapping[className] = levelId;
        
        sql += `INSERT INTO education_levels (id, name, description, tuition_amount, registration_fee, cantine_amount, is_active, order_index) VALUES
(${levelId}, ${escapeSQL(className)}, ${escapeSQL(`Niveau ${className}`)}, ${config.tuition}, ${config.registration}, ${config.cantine}, 1, ${levelId})
ON DUPLICATE KEY UPDATE 
    name = ${escapeSQL(className)},
    tuition_amount = ${config.tuition},
    registration_fee = ${config.registration},
    cantine_amount = ${config.cantine};

`;
        levelId++;
    });

    sql += `\n-- ============================================
-- 2. CRÉATION DES CLASSES
-- ============================================

`;

    // Insérer les classes
    let classId = 1;
    const classMapping = {};
    classes.forEach(className => {
        const levelId = levelMapping[className];
        classMapping[className] = classId;
        
        sql += `INSERT INTO classes (id, name, education_level_id, school_year) VALUES
(${classId}, ${escapeSQL(className)}, ${levelId}, ${escapeSQL(SCHOOL_YEAR)})
ON DUPLICATE KEY UPDATE 
    name = ${escapeSQL(className)},
    education_level_id = ${levelId},
    school_year = ${escapeSQL(SCHOOL_YEAR)};

`;
        classId++;
    });

    sql += `\n-- ============================================
-- 3. INSERTION DES ÉTUDIANTS
-- ============================================

`;

    // Fonction pour générer l'INSERT d'un élève
    function generateStudentInsert(row, index, isPrimaire = true) {
        const matricule = row.Matricule || generateCode('MAT', index);
        const nom = row.Nom || '';
        const prenom = row.Prenoms || '';
        const dateNaiss = parseDate(row['Date nais']);
        const genre = normalizeGender(row.Genre);
        const lieuNaiss = row['Lieu nais'] || '';
        const classe = row.Classe || '';
        const dateInsc = isPrimaire ? parseDate(row['Date insc']) : null;
        
        const studentCode = generateCode('STU', index);
        const parentCode = generateCode('PAR', index);
        
        return `INSERT INTO students (
    first_name, last_name, date_of_birth, gender, city, 
    registration_number, registration_mode, student_code, parent_code,
    cantine, eats_at_cantine
) VALUES (
    ${escapeSQL(prenom)}, ${escapeSQL(nom)}, ${dateNaiss ? escapeSQL(dateNaiss) : 'NULL'}, 
    ${genre ? escapeSQL(genre) : 'NULL'}, ${escapeSQL(lieuNaiss)}, 
    ${escapeSQL(matricule)}, 'onsite', ${escapeSQL(studentCode)}, ${escapeSQL(parentCode)},
    0, 0
);`;
    }

    // Insérer les élèves du primaire
    let studentIndex = 1;
    primaireData.forEach((row, index) => {
        sql += `-- Élève ${studentIndex}: ${row.Nom} ${row.Prenoms}\n`;
        sql += generateStudentInsert(row, studentIndex, true);
        sql += '\n\n';
        studentIndex++;
    });

    // Insérer les élèves de la maternelle
    maternelleData.forEach((row, index) => {
        sql += `-- Élève ${studentIndex}: ${row.Nom} ${row.Prenoms}\n`;
        sql += generateStudentInsert(row, studentIndex, false);
        sql += '\n\n';
        studentIndex++;
    });

    sql += `-- ============================================
-- 4. CRÉATION DES INSCRIPTIONS (ENROLLMENTS)
-- ============================================

`;

    // Fonction pour créer les enrollments
    // On doit d'abord récupérer les IDs des élèves insérés
    // Pour simplifier, on utilise une approche basée sur le matricule
    let enrollmentIndex = 1;
    
    // Primaire
    primaireData.forEach((row) => {
        const classe = row.Classe;
        const classId = classMapping[classe];
        const dateInsc = parseDate(row['Date insc']) || '2025-09-01';
        
        sql += `-- Inscription ${enrollmentIndex}: ${row.Matricule} -> ${classe}\n`;
        sql += `INSERT INTO enrollments (student_id, class_id, enrollment_date, status, school_year)
SELECT id, ${classId}, ${escapeSQL(dateInsc)}, 'active', ${escapeSQL(SCHOOL_YEAR)}
FROM students WHERE registration_number = ${escapeSQL(row.Matricule)};

`;
        enrollmentIndex++;
    });

    // Maternelle
    maternelleData.forEach((row) => {
        const classe = row.Classe;
        const classId = classMapping[classe];
        const dateInsc = '2025-09-01'; // Date par défaut pour maternelle
        
        sql += `-- Inscription ${enrollmentIndex}: ${row.Matricule} -> ${classe}\n`;
        sql += `INSERT INTO enrollments (student_id, class_id, enrollment_date, status, school_year)
SELECT id, ${classId}, ${escapeSQL(dateInsc)}, 'active', ${escapeSQL(SCHOOL_YEAR)}
FROM students WHERE registration_number = ${escapeSQL(row.Matricule)};

`;
        enrollmentIndex++;
    });

    sql += `-- ============================================
-- 5. CRÉATION DES VERSEMENTS (INSTALLMENTS)
-- ============================================

`;

    // Fonction pour créer les versements pour un niveau
    function generateInstallmentsForLevel(levelName, levelId) {
        const config = CONFIG.education_levels[levelName] || { tuition: 500000, registration: 50000 };
        const totalAmount = config.tuition;
        const installmentCount = CONFIG.installments.count;
        const percentages = CONFIG.installments.percentages;
        const dueDates = CONFIG.installments.due_dates;

        let installmentsSQL = '';
        
        for (let i = 0; i < installmentCount; i++) {
            const percentage = percentages[i] || (100 / installmentCount);
            const amount = Math.round(totalAmount * percentage / 100);
            const dueDate = dueDates[i] || dueDates[0];
            
            installmentsSQL += `-- Versement ${i + 1} pour ${levelName} (${percentage}%)\n`;
            installmentsSQL += `INSERT INTO level_installments (education_level_id, installment_number, percentage, amount, due_date, due_date_offset_days, is_active)
VALUES (${levelId}, ${i + 1}, ${percentage}, ${amount}, ${escapeSQL(dueDate)}, 0, 1)
ON DUPLICATE KEY UPDATE 
    percentage = ${percentage},
    amount = ${amount},
    due_date = ${escapeSQL(dueDate)};

`;
        }
        
        return installmentsSQL;
    }

    // Créer les versements pour chaque niveau
    classes.forEach(className => {
        const levelId = levelMapping[className];
        sql += generateInstallmentsForLevel(className, levelId);
        sql += '\n';
    });

    sql += `-- ============================================
-- 6. CRÉATION DES VERSEMENTS POUR CHAQUE ÉTUDIANT
-- ============================================

`;

    // Fonction pour créer les installments pour chaque élève
    function generateStudentInstallments(row, isPrimaire = true) {
        const classe = row.Classe;
        const levelId = levelMapping[classe];
        const classId = classMapping[classe];
        const installmentCount = CONFIG.installments.count;
        const percentages = CONFIG.installments.percentages;
        const dueDates = CONFIG.installments.due_dates;
        const config = CONFIG.education_levels[classe] || { tuition: 500000 };
        const totalAmount = config.tuition;

        let installmentsSQL = '';
        
        for (let i = 0; i < installmentCount; i++) {
            const percentage = percentages[i] || (100 / installmentCount);
            const amount = Math.round(totalAmount * percentage / 100);
            const dueDate = dueDates[i] || dueDates[0];
            
            installmentsSQL += `-- Versement ${i + 1} pour ${row.Matricule}\n`;
            installmentsSQL += `INSERT INTO installments (student_id, level_installment_id, installment_number, amount, due_date, percentage, status, school_year, class_id, education_level_id)
SELECT s.id, li.id, ${i + 1}, ${amount}, ${escapeSQL(dueDate)}, ${percentage}, 'pending', ${escapeSQL(SCHOOL_YEAR)}, ${classId}, ${levelId}
FROM students s
CROSS JOIN level_installments li
WHERE s.registration_number = ${escapeSQL(row.Matricule)}
  AND li.education_level_id = ${levelId}
  AND li.installment_number = ${i + 1}
LIMIT 1;

`;
        }
        
        return installmentsSQL;
    }

    // Créer les installments pour chaque élève du primaire
    primaireData.forEach((row) => {
        sql += generateStudentInstallments(row, true);
        sql += '\n';
    });

    // Créer les installments pour chaque élève de la maternelle
    maternelleData.forEach((row) => {
        sql += generateStudentInstallments(row, false);
        sql += '\n';
    });

    sql += `-- ============================================
-- FIN DU SCRIPT
-- ============================================

SET FOREIGN_KEY_CHECKS = 1;
COMMIT;

-- Vérification
SELECT 'Niveaux créés:' as Info, COUNT(*) as Total FROM education_levels;
SELECT 'Classes créées:' as Info, COUNT(*) as Total FROM classes;
SELECT 'Élèves insérés:' as Info, COUNT(*) as Total FROM students;
SELECT 'Inscriptions créées:' as Info, COUNT(*) as Total FROM enrollments;
SELECT 'Versements créés:' as Info, COUNT(*) as Total FROM installments;
`;

    // Sauvegarder le fichier SQL
    const outputPath = path.join(__dirname, '../../import_complet.sql');
    fs.writeFileSync(outputPath, sql, 'utf-8');

    console.log(`✅ Script SQL généré avec succès !`);
    console.log(`📁 Fichier: ${outputPath}`);
    console.log(`\n📊 Résumé:`);
    console.log(`   - ${classes.length} niveaux d'éducation`);
    console.log(`   - ${classes.length} classes`);
    console.log(`   - ${primaireData.length + maternelleData.length} élèves`);
    console.log(`   - ${primaireData.length + maternelleData.length} inscriptions`);
    console.log(`   - ${(primaireData.length + maternelleData.length) * CONFIG.installments.count} versements`);
    console.log(`\n🚀 Pour exécuter le script:`);
    console.log(`   mysql -u votre_utilisateur -p votre_base_de_donnees < import_complet.sql`);
}

// Exécuter
if (require.main === module) {
    try {
        generateSQL();
    } catch (error) {
        console.error('❌ Erreur:', error);
        process.exit(1);
    }
}

module.exports = { generateSQL };


