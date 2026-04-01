/**
 * Script pour générer un fichier SQL complet d'import des données CSV du secondaire
 * Ce script lit le fichier CSV et génère un script SQL complet pour :
 * 1. Créer les niveaux (levels)
 * 2. Créer les classes (classes)
 * 3. Insérer les élèves (students)
 * 4. Créer les inscriptions (enrollments)
 * 5. Créer les versements (level_installments et student_installment_balances)
 */

const fs = require('fs');
const path = require('path');

// Configuration
const SCHOOL_YEAR = '2025-2026';
const CONFIG = {
    // Montants par niveau (à ajuster selon vos tarifs réels)
    // Format: { assigned: { tuition, registration }, non_assigned: { tuition, registration } }
    levels: {
        '6EME': { 
            assigned: { tuition: 600000, registration: 60000 },
            non_assigned: { tuition: 550000, registration: 55000 }
        },
        '5EME': { 
            assigned: { tuition: 600000, registration: 60000 },
            non_assigned: { tuition: 550000, registration: 55000 }
        },
        '4EME': { 
            assigned: { tuition: 600000, registration: 60000 },
            non_assigned: { tuition: 550000, registration: 55000 }
        },
        '3EME': { 
            assigned: { tuition: 600000, registration: 60000 },
            non_assigned: { tuition: 550000, registration: 55000 }
        },
        '2NDE': { 
            assigned: { tuition: 650000, registration: 65000 },
            non_assigned: { tuition: 600000, registration: 60000 }
        },
        '1ERE': { 
            assigned: { tuition: 650000, registration: 65000 },
            non_assigned: { tuition: 600000, registration: 60000 }
        },
        'TERMINALE': { 
            assigned: { tuition: 700000, registration: 70000 },
            non_assigned: { tuition: 650000, registration: 65000 }
        },
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

// Fonction pour extraire le niveau depuis le nom de classe
function extractLevel(className) {
    // Exemples: 1A -> 1ERE (Première), 2A1 -> 2NDE (Seconde), 3EME1 -> 3EME, 4EME1 -> 4EME, 5EME1 -> 5EME, 6EME1 -> 6EME
    // TA1 -> TERMINALE, TC -> TERMINALE, TD1 -> TERMINALE, TD2 -> TERMINALE
    // 1C -> 1ERE (Première), 1D1 -> 1ERE (Première), 2C1 -> 2NDE (Seconde)
    // 1ERE1, 1ERE2 -> 1ERE (Première)
    
    if (className.startsWith('6EME')) return '6EME';
    if (className.startsWith('5EME')) return '5EME';
    if (className.startsWith('4EME')) return '4EME';
    if (className.startsWith('3EME')) return '3EME';
    if (className.startsWith('1ERE')) return '1ERE';
    if (className.startsWith('2A') || className.startsWith('2C') || className.startsWith('2D')) return '2NDE';
    if (className.startsWith('1A') || className.startsWith('1C') || className.startsWith('1D')) return '1ERE';
    if (className.startsWith('TA') || className.startsWith('TC') || className.startsWith('TD')) return 'TERMINALE';
    
    // Par défaut, essayer de deviner
    if (className.includes('6EME')) return '6EME';
    if (className.includes('5EME')) return '5EME';
    if (className.includes('4EME')) return '4EME';
    if (className.includes('3EME')) return '3EME';
    if (className.includes('1ERE')) return '1ERE';
    if (className.includes('2A') || className.includes('2C') || className.includes('2D')) return '2NDE';
    if (className.includes('1A') || className.includes('1C') || className.includes('1D')) return '1ERE';
    if (className.includes('TA') || className.includes('TC') || className.includes('TD')) return 'TERMINALE';
    if (className.includes('6')) return '6EME';
    if (className.includes('5')) return '5EME';
    if (className.includes('4')) return '4EME';
    if (className.includes('3')) return '3EME';
    if (className.includes('2')) return '2NDE';
    if (className.includes('T')) return 'TERMINALE';
    
    return '6EME'; // Par défaut
}

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
    console.log('📊 Génération du script SQL complet pour le secondaire...\n');

    // Lire le fichier CSV
    const collegePath = path.join(__dirname, '../../Liste_de-Classe-GSTB2526-pour-le-secondaire.csv');

    console.log('📖 Lecture du fichier CSV...');
    const collegeData = readCSV(collegePath);

    console.log(`✅ Secondaire: ${collegeData.length} élèves\n`);

    // Collecter toutes les classes uniques et leurs niveaux
    const classesMap = new Map();
    collegeData.forEach(row => {
        if (row.Classe) {
            const className = row.Classe;
            if (!classesMap.has(className)) {
                const level = extractLevel(className);
                classesMap.set(className, level);
            }
        }
    });

    // Créer un mapping niveau -> classes
    const levelsMap = new Map();
    classesMap.forEach((level, className) => {
        if (!levelsMap.has(level)) {
            levelsMap.set(level, []);
        }
        levelsMap.get(level).push(className);
    });

    // S'assurer que tous les niveaux de la configuration sont inclus
    // Même s'ils ne sont pas dans les données actuelles
    Object.keys(CONFIG.levels).forEach(levelName => {
        if (!levelsMap.has(levelName)) {
            levelsMap.set(levelName, []);
        }
    });

    // Trier les niveaux dans l'ordre logique : 6EME, 5EME, 4EME, 3EME, 2NDE, 1ERE, TERMINALE
    const levelOrder = ['6EME', '5EME', '4EME', '3EME', '2NDE', '1ERE', 'TERMINALE'];
    const levels = Array.from(levelsMap.keys()).sort((a, b) => {
        const indexA = levelOrder.indexOf(a);
        const indexB = levelOrder.indexOf(b);
        if (indexA === -1 && indexB === -1) return a.localeCompare(b);
        if (indexA === -1) return 1;
        if (indexB === -1) return -1;
        return indexA - indexB;
    });
    const classes = Array.from(classesMap.keys()).sort();

    console.log(`📚 Niveaux trouvés: ${levels.join(', ')}`);
    console.log(`📚 Classes trouvées: ${classes.length} classes\n`);

    // Générer le SQL
    let sql = `-- ============================================
-- Script SQL complet d'import des données - SECONDAIRE
-- Généré automatiquement le ${new Date().toLocaleString('fr-FR')}
-- Année scolaire: ${SCHOOL_YEAR}
-- ============================================

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
SET FOREIGN_KEY_CHECKS = 0;

START TRANSACTION;

-- ============================================
-- 1. CRÉATION DES NIVEAUX
-- ============================================

`;

    // Insérer les niveaux
    let levelId = 1;
    const levelMapping = {};
    levels.forEach(levelName => {
        const config = CONFIG.levels[levelName] || {
            assigned: { tuition: 600000, registration: 60000 },
            non_assigned: { tuition: 550000, registration: 55000 }
        };
        
        levelMapping[levelName] = levelId;
        
        const displayName = levelName === '6EME' ? '6ème' :
                           levelName === '5EME' ? '5ème' :
                           levelName === '4EME' ? '4ème' :
                           levelName === '3EME' ? '3ème' :
                           levelName === '2NDE' ? 'Seconde' :
                           levelName === '1ERE' ? 'Première' :
                           levelName === 'TERMINALE' ? 'Terminale' : levelName;
        
        sql += `INSERT INTO levels (id, name, display_name, order_index, amount, amount_non_assigned, registration_fee_assigned, registration_fee_non_assigned) VALUES
(${levelId}, ${escapeSQL(levelName)}, ${escapeSQL(displayName)}, ${levelId}, ${config.assigned.tuition}, ${config.non_assigned.tuition}, ${config.assigned.registration}, ${config.non_assigned.registration})
ON DUPLICATE KEY UPDATE 
    name = ${escapeSQL(levelName)},
    display_name = ${escapeSQL(displayName)},
    amount = ${config.assigned.tuition},
    amount_non_assigned = ${config.non_assigned.tuition},
    registration_fee_assigned = ${config.assigned.registration},
    registration_fee_non_assigned = ${config.non_assigned.registration};

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
        const levelName = classesMap.get(className);
        const levelId = levelMapping[levelName];
        classMapping[className] = classId;
        
        sql += `INSERT INTO classes (id, name, level_id, academic_year) VALUES
(${classId}, ${escapeSQL(className)}, ${levelId}, ${escapeSQL(SCHOOL_YEAR)})
ON DUPLICATE KEY UPDATE 
    name = ${escapeSQL(className)},
    level_id = ${levelId},
    academic_year = ${escapeSQL(SCHOOL_YEAR)};

`;
        classId++;
    });

    sql += `\n-- ============================================
-- 3. INSERTION DES ÉTUDIANTS
-- ============================================

`;

    // Fonction pour générer l'INSERT d'un élève
    function generateStudentInsert(row, index) {
        const matricule = row['Matricule+H44C2A1:H30A1:A1:H577'] || row.Matricule || generateCode('MAT', index);
        const nom = row.Nom || '';
        const prenom = row.Prenoms || '';
        const dateNaiss = parseDate(row['Date nais']);
        const genre = normalizeGender(row.Genre);
        const lieuNaiss = row['Lieu nais'] || '';
        const nationalite = row.Nat || '';
        
        const studentCode = generateCode('STU', index);
        const parentCode = generateCode('PAR', index);
        
        return `INSERT INTO students (
    first_name, last_name, date_of_birth, gender, birth_place, nationality,
    registration_number, registration_mode, student_code, parent_code
) VALUES (
    ${escapeSQL(prenom)}, ${escapeSQL(nom)}, ${dateNaiss ? escapeSQL(dateNaiss) : 'NULL'}, 
    ${genre ? escapeSQL(genre) : 'NULL'}, ${escapeSQL(lieuNaiss)}, ${escapeSQL(nationalite)}, 
    ${escapeSQL(matricule)}, 'onsite', ${escapeSQL(studentCode)}, ${escapeSQL(parentCode)}
);`;
    }

    // Insérer les élèves
    let studentIndex = 1;
    collegeData.forEach((row, index) => {
        sql += `-- Élève ${studentIndex}: ${row.Nom} ${row.Prenoms}\n`;
        sql += generateStudentInsert(row, studentIndex);
        sql += '\n\n';
        studentIndex++;
    });

    sql += `-- ============================================
-- 4. CRÉATION DES INSCRIPTIONS (ENROLLMENTS)
-- ============================================

`;

    // Fonction pour créer les enrollments
    let enrollmentIndex = 1;
    
    collegeData.forEach((row) => {
        const classe = row.Classe;
        const classId = classMapping[classe];
        const dateInsc = '2025-09-01'; // Date par défaut
        
        sql += `-- Inscription ${enrollmentIndex}: ${row['Matricule+H44C2A1:H30A1:A1:H577'] || row.Matricule} -> ${classe}\n`;
        sql += `INSERT INTO enrollments (student_id, class_id, enrollment_date, status, school_year)
SELECT id, ${classId}, ${escapeSQL(dateInsc)}, 'active', ${escapeSQL(SCHOOL_YEAR)}
FROM students WHERE registration_number = ${escapeSQL(row['Matricule+H44C2A1:H30A1:A1:H577'] || row.Matricule)};

`;
        enrollmentIndex++;
    });

    sql += `-- ============================================
-- 5. CRÉATION DES VERSEMENTS PAR NIVEAU (LEVEL_INSTALLMENTS)
-- ============================================

`;

    // Fonction pour créer les versements pour un niveau
    function generateInstallmentsForLevel(levelName, levelId) {
        const config = CONFIG.levels[levelName] || {
            assigned: { tuition: 600000, registration: 60000 },
            non_assigned: { tuition: 550000, registration: 55000 }
        };
        const installmentCount = CONFIG.installments.count;
        const percentages = CONFIG.installments.percentages;
        const dueDates = CONFIG.installments.due_dates;

        let installmentsSQL = '';
        
        // Versements pour élèves affectés
        for (let i = 0; i < installmentCount; i++) {
            const percentage = percentages[i] || (100 / installmentCount);
            const amount = Math.round(config.assigned.tuition * percentage / 100);
            const dueDate = dueDates[i] || dueDates[0];
            
            installmentsSQL += `-- Versement ${i + 1} pour ${levelName} (affectés) - ${percentage}%\n`;
            installmentsSQL += `INSERT INTO level_installments (level_id, payment_type, installment_number, amount, due_date, percentage)
VALUES (${levelId}, 'assigned', ${i + 1}, ${amount}, ${escapeSQL(dueDate)}, ${percentage})
ON DUPLICATE KEY UPDATE 
    amount = ${amount},
    due_date = ${escapeSQL(dueDate)},
    percentage = ${percentage};

`;
        }
        
        // Versements pour élèves non affectés
        for (let i = 0; i < installmentCount; i++) {
            const percentage = percentages[i] || (100 / installmentCount);
            const amount = Math.round(config.non_assigned.tuition * percentage / 100);
            const dueDate = dueDates[i] || dueDates[0];
            
            installmentsSQL += `-- Versement ${i + 1} pour ${levelName} (non affectés) - ${percentage}%\n`;
            installmentsSQL += `INSERT INTO level_installments (level_id, payment_type, installment_number, amount, due_date, percentage)
VALUES (${levelId}, 'non_assigned', ${i + 1}, ${amount}, ${escapeSQL(dueDate)}, ${percentage})
ON DUPLICATE KEY UPDATE 
    amount = ${amount},
    due_date = ${escapeSQL(dueDate)},
    percentage = ${percentage};

`;
        }
        
        return installmentsSQL;
    }

    // Créer les versements pour chaque niveau
    levels.forEach(levelName => {
        const levelId = levelMapping[levelName];
        sql += generateInstallmentsForLevel(levelName, levelId);
        sql += '\n';
    });

    sql += `-- ============================================
-- 6. CRÉATION DES VERSEMENTS POUR CHAQUE ÉTUDIANT
-- ============================================

`;

    // Fonction pour créer les installments pour chaque élève
    function generateStudentInstallments(row) {
        const classe = row.Classe;
        const levelName = classesMap.get(classe);
        const levelId = levelMapping[levelName];
        const classId = classMapping[classe];
        const installmentCount = CONFIG.installments.count;
        const percentages = CONFIG.installments.percentages;
        const dueDates = CONFIG.installments.due_dates;
        const config = CONFIG.levels[levelName] || {
            assigned: { tuition: 600000 },
            non_assigned: { tuition: 550000 }
        };

        let installmentsSQL = '';
        
        // Par défaut, on crée pour les deux types (assigned et non_assigned)
        // L'utilisateur pourra ajuster via student_assignments
        for (const paymentType of ['assigned', 'non_assigned']) {
            const totalAmount = paymentType === 'assigned' ? config.assigned.tuition : config.non_assigned.tuition;
            
            for (let i = 0; i < installmentCount; i++) {
                const percentage = percentages[i] || (100 / installmentCount);
                const amount = Math.round(totalAmount * percentage / 100);
                const dueDate = dueDates[i] || dueDates[0];
                
                installmentsSQL += `-- Versement ${i + 1} (${paymentType}) pour ${row['Matricule+H44C2A1:H30A1:A1:H577'] || row.Matricule}\n`;
                installmentsSQL += `INSERT INTO student_installment_balances (student_id, level_installment_id, total_amount, amount_paid, balance, school_year)
SELECT s.id, li.id, ${amount}, 0, ${amount}, ${escapeSQL(SCHOOL_YEAR)}
FROM students s
CROSS JOIN level_installments li
WHERE s.registration_number = ${escapeSQL(row['Matricule+H44C2A1:H30A1:A1:H577'] || row.Matricule)}
  AND li.level_id = ${levelId}
  AND li.payment_type = ${escapeSQL(paymentType)}
  AND li.installment_number = ${i + 1}
LIMIT 1
ON DUPLICATE KEY UPDATE total_amount = ${amount}, balance = ${amount};

`;
            }
        }
        
        return installmentsSQL;
    }

    // Créer les installments pour chaque élève
    collegeData.forEach((row) => {
        sql += generateStudentInstallments(row);
        sql += '\n';
    });

    sql += `-- ============================================
-- 7. CRÉATION DES ASSIGNATIONS PAR DÉFAUT (tous non affectés)
-- ============================================

`;

    // Créer les assignations par défaut (tous non affectés)
    collegeData.forEach((row) => {
        sql += `-- Assignation pour ${row['Matricule+H44C2A1:H30A1:A1:H577'] || row.Matricule}\n`;
        sql += `INSERT INTO student_assignments (student_id, school_year, is_assigned)
SELECT id, ${escapeSQL(SCHOOL_YEAR)}, 0
FROM students WHERE registration_number = ${escapeSQL(row['Matricule+H44C2A1:H30A1:A1:H577'] || row.Matricule)}
ON DUPLICATE KEY UPDATE is_assigned = 0;

`;
    });

    sql += `-- ============================================
-- FIN DU SCRIPT
-- ============================================

SET FOREIGN_KEY_CHECKS = 1;
COMMIT;

-- Vérification
SELECT 'Niveaux créés:' as Info, COUNT(*) as Total FROM levels;
SELECT 'Classes créées:' as Info, COUNT(*) as Total FROM classes;
SELECT 'Élèves insérés:' as Info, COUNT(*) as Total FROM students;
SELECT 'Inscriptions créées:' as Info, COUNT(*) as Total FROM enrollments;
SELECT 'Versements créés:' as Info, COUNT(*) as Total FROM level_installments;
SELECT 'Balances créées:' as Info, COUNT(*) as Total FROM student_installment_balances;
`;

    // Sauvegarder le fichier SQL
    const outputPath = path.join(__dirname, '../../import_complet_college.sql');
    fs.writeFileSync(outputPath, sql, 'utf-8');

    console.log(`✅ Script SQL généré avec succès !`);
    console.log(`📁 Fichier: ${outputPath}`);
    console.log(`\n📊 Résumé:`);
    console.log(`   - ${levels.length} niveaux`);
    console.log(`   - ${classes.length} classes`);
    console.log(`   - ${collegeData.length} élèves`);
    console.log(`   - ${collegeData.length} inscriptions`);
    console.log(`   - ${levels.length * CONFIG.installments.count * 2} versements par niveau (assigned + non_assigned)`);
    console.log(`   - ${collegeData.length * CONFIG.installments.count * 2} balances d'élèves`);
    console.log(`\n🚀 Pour exécuter le script:`);
    console.log(`   mysql -u votre_utilisateur -p trayeber_college < import_complet_college.sql`);
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


