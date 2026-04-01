const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');

// Lire le fichier CSV
const csvPath = path.join(__dirname, '../../fichier_final2.csv');
const csvContent = fs.readFileSync(csvPath, 'utf-8');

// Parser le CSV
const lines = csvContent.split('\n').filter(line => line.trim());
const headers = lines[0].split(',').map(h => h.replace(/"/g, '').trim());

// Fonction pour nettoyer les valeurs CSV
function cleanCSVValue(value) {
    return value.replace(/^"|"$/g, '').trim();
}

// Parser les lignes
const students = [];
for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',').map(cleanCSVValue);
    if (values.length < headers.length) continue;
    
    const student = {};
    headers.forEach((header, index) => {
        student[header] = values[index] || '';
    });
    
    if (student.Matricule && student.Nom && student.Prenoms) {
        students.push(student);
    }
}

// Extraire les classes uniques
const classesMap = new Map();
students.forEach(student => {
    const className = student.source_fichier;
    if (className && !classesMap.has(className)) {
        // Extraire le niveau de la classe (1ère, 2nde, 3è, 4è, 5è, 6è, TA, TC, TD)
        let levelName = '';
        let levelDisplayName = '';
        let orderIndex = 0;
        
        if (className.startsWith('1ère')) {
            levelName = '1ere';
            levelDisplayName = '1ère';
            orderIndex = 1;
        } else if (className.startsWith('2nde')) {
            levelName = '2nde';
            levelDisplayName = '2nde';
            orderIndex = 2;
        } else if (className.startsWith('3è')) {
            levelName = '3e';
            levelDisplayName = '3ème';
            orderIndex = 3;
        } else if (className.startsWith('4è')) {
            levelName = '4e';
            levelDisplayName = '4ème';
            orderIndex = 4;
        } else if (className.startsWith('5è')) {
            levelName = '5e';
            levelDisplayName = '5ème';
            orderIndex = 5;
        } else if (className.startsWith('6è')) {
            levelName = '6e';
            levelDisplayName = '6ème';
            orderIndex = 6;
        } else if (className.startsWith('TA') || className.startsWith('TC') || className.startsWith('TD')) {
            // Toutes les classes Terminale (TA, TC, TD) appartiennent au même niveau
            levelName = 'terminale';
            levelDisplayName = 'Terminale';
            orderIndex = 7;
        }
        
        classesMap.set(className, {
            name: className,
            levelName,
            levelDisplayName,
            orderIndex
        });
    }
});

// Générer le SQL
let sql = `-- ============================================
-- Script d'importation des élèves du collège
-- Généré automatiquement depuis fichier_final2.csv
-- ============================================

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";

-- ============================================
-- 1. CRÉATION DES NIVEAUX
-- ============================================

`;

// Créer les niveaux uniques
const levelsMap = new Map();
Array.from(classesMap.values()).forEach(classInfo => {
    if (classInfo.levelName && !levelsMap.has(classInfo.levelName)) {
        levelsMap.set(classInfo.levelName, {
            name: classInfo.levelName,
            displayName: classInfo.levelDisplayName,
            orderIndex: classInfo.orderIndex
        });
    }
});

// Insérer les niveaux
const sortedLevels = Array.from(levelsMap.values()).sort((a, b) => a.orderIndex - b.orderIndex);
sortedLevels.forEach((level, index) => {
    sql += `INSERT INTO levels (name, display_name, order_index, created_at, updated_at)
VALUES ('${level.name}', '${level.displayName}', ${level.orderIndex}, NOW(), NOW())
ON DUPLICATE KEY UPDATE 
    display_name = '${level.displayName}',
    order_index = ${level.orderIndex},
    updated_at = NOW();

`;
});

sql += `-- ============================================
-- 2. CRÉATION DES CLASSES
-- ============================================

`;

// Créer les classes
let classIdCounter = 1;
const classIdMap = new Map();
const sortedClasses = Array.from(classesMap.values()).sort((a, b) => {
    if (a.orderIndex !== b.orderIndex) return a.orderIndex - b.orderIndex;
    return a.name.localeCompare(b.name);
});

sortedClasses.forEach(classInfo => {
    const levelId = sortedLevels.findIndex(l => l.name === classInfo.levelName) + 1;
    classIdMap.set(classInfo.name, classIdCounter);
    
    sql += `INSERT INTO classes (id, name, level_id, academic_year, created_at)
SELECT ${classIdCounter}, '${classInfo.name}', l.id, '2025-2026', NOW()
FROM levels l WHERE l.name = '${classInfo.levelName}'
ON DUPLICATE KEY UPDATE 
    name = '${classInfo.name}',
    level_id = (SELECT l2.id FROM levels l2 WHERE l2.name = '${classInfo.levelName}' LIMIT 1),
    academic_year = '2025-2026';

`;
    classIdCounter++;
});

sql += `-- ============================================
-- 3. INSERTION DES ÉTUDIANTS
-- ============================================

`;

// Fonction pour formater le numéro de téléphone avec le préfixe +2250
function formatPhoneNumber(phone) {
    if (!phone || phone.trim() === '') return '';
    const cleaned = phone.trim();
    // Si le numéro commence déjà par +2250, on le garde tel quel
    if (cleaned.startsWith('+2250')) {
        return cleaned;
    }
    // Si le numéro commence par +225 (sans 0), on ajoute 0 après
    if (cleaned.startsWith('+225')) {
        return '+2250' + cleaned.substring(4);
    }
    // Si le numéro commence par 2250, on ajoute juste le +
    if (cleaned.startsWith('2250')) {
        return '+' + cleaned;
    }
    // Si le numéro commence par 225 (sans 0), on ajoute +0 après
    if (cleaned.startsWith('225')) {
        return '+2250' + cleaned.substring(3);
    }
    // Si le numéro commence par 0, on ajoute +225 devant
    if (cleaned.startsWith('0')) {
        return '+225' + cleaned;
    }
    // Sinon, on ajoute +2250 devant
    return '+2250' + cleaned;
}

// Fonction pour déterminer le contact parent
// Utilise uniquement le contact tuteur pour tous les élèves
function getParentContact(student) {
    if (student.ContactTuteur && student.ContactTuteur.trim() !== '') {
        const name = (student.NomTuteur || '').trim();
        // Séparer le nom en prénom et nom si possible
        const nameParts = name.split(' ').filter(p => p.trim());
        return {
            firstName: nameParts.length > 1 ? nameParts.slice(0, -1).join(' ') : '',
            lastName: nameParts.length > 0 ? nameParts[nameParts.length - 1] : name,
            contact: formatPhoneNumber(student.ContactTuteur),
            profession: (student.ProfesTuteur || '').trim()
        };
    }
    return {
        firstName: '',
        lastName: '',
        contact: '',
        profession: ''
    };
}

// Fonction pour échapper les apostrophes SQL
function escapeSQL(str) {
    if (!str) return '';
    return str.replace(/'/g, "''");
}

// Fonction pour générer un code avec préfixe et numéro sur 5 chiffres
function generateCode(prefix, number) {
    const paddedNumber = String(number).padStart(5, '0');
    return `${prefix}${paddedNumber}`;
}

// Fonction pour générer un email unique
function generateEmail(type, code, firstName, lastName) {
    // Nettoyer le nom pour l'email (enlever les caractères spéciaux)
    const cleanName = (firstName + '.' + lastName)
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '') // Enlever les accents
        .replace(/[^a-z0-9.]/g, '') // Garder seulement lettres, chiffres et points
        .substring(0, 30); // Limiter la longueur
    
    return `${type}.${code.toLowerCase()}@lapetiteacademie.ci`;
}

// Stocker les informations des utilisateurs pour génération ultérieure
const usersData = [];

// Insérer les élèves
students.forEach((student, index) => {
    const parent = getParentContact(student);
    const gender = student.Genre === 'F' ? 'F' : (student.Genre === 'M' ? 'M' : null);
    const firstName = escapeSQL(student.Prenoms);
    const lastName = escapeSQL(student.Nom);
    const registrationNumber = escapeSQL(student.Matricule);
    const parentFirstName = escapeSQL(parent.firstName);
    const parentLastName = escapeSQL(parent.lastName);
    const parentContact = escapeSQL(parent.contact);
    
    // Générer les codes unique pour chaque élève (index + 1 pour commencer à 1)
    const studentCode = generateCode('E', index + 1);
    const parentCode = generateCode('P', index + 1);
    
    // Stocker les données pour création des comptes utilisateurs
    usersData.push({
        studentCode,
        parentCode,
        studentFirstName: firstName,
        studentLastName: lastName,
        parentFirstName: parentFirstName,
        parentLastName: parentLastName,
        parentContact: parentContact,
        registrationNumber
    });
    
    sql += `-- Élève ${index + 1}: ${lastName} ${firstName}
INSERT INTO students (
    first_name, last_name, gender, 
    registration_number, registration_mode,
    parent_first_name, parent_last_name, parent_phone, parent_contact,
    student_code, parent_code
) VALUES (
    '${firstName}', '${lastName}', ${gender ? `'${gender}'` : 'NULL'}, 
    '${registrationNumber}', 'onsite',
    '${parentFirstName}', '${parentLastName}', '${parentContact}', '${parentContact}',
    '${studentCode}', '${parentCode}'
);

`;
});

sql += `-- ============================================
-- 4. CRÉATION DES INSCRIPTIONS (ENROLLMENTS)
-- ============================================

`;

// Créer les inscriptions
students.forEach((student, index) => {
    const className = student.source_fichier;
    const classId = classIdMap.get(className);
    const registrationNumber = escapeSQL(student.Matricule);
    
    if (classId) {
        sql += `-- Inscription ${index + 1}: ${registrationNumber} -> ${className}
INSERT INTO enrollments (student_id, class_id, enrollment_date, status, school_year, created_by)
SELECT s.id, ${classId}, NOW(), 'active', '2025-2026', 1
FROM students s 
WHERE s.registration_number = '${registrationNumber}'
LIMIT 1;

`;
    }
});

sql += `-- ============================================
-- 5. CRÉATION DES ASSIGNATIONS D'ÉTUDIANTS
-- ============================================

-- Par défaut, tous les élèves sont non affectés (is_assigned = 0)
INSERT INTO student_assignments (student_id, school_year, is_assigned, assigned_date, assigned_by)
SELECT s.id, '2025-2026', 0, NOW(), 1
FROM students s
WHERE s.registration_number IN (
`;

students.forEach((student, index) => {
    const registrationNumber = escapeSQL(student.Matricule);
    sql += `    '${registrationNumber}'${index < students.length - 1 ? ',' : ''}\n`;
});

sql += `)
ON DUPLICATE KEY UPDATE 
    is_assigned = 0,
    assigned_date = NOW();

-- ============================================
-- 6. CRÉATION DES COMPTES UTILISATEURS
-- ============================================

`;

// Générer les hashs de mots de passe et créer les comptes utilisateurs
// Note: bcrypt.hash est asynchrone, donc on doit utiliser une approche synchrone ou générer les hashs avant
// Pour simplifier, on va générer les hashs de manière synchrone avec bcrypt.hashSync

usersData.forEach((userData, index) => {
    // Hasher les codes pour les mots de passe
    const studentPasswordHash = bcrypt.hashSync(userData.studentCode, 10);
    const parentPasswordHash = bcrypt.hashSync(userData.parentCode, 10);
    
    // Générer les emails uniques
    const studentEmail = generateEmail('eleve', userData.studentCode, userData.studentFirstName, userData.studentLastName);
    
    // Pour le parent, utiliser le nom de l'enfant si le parent n'a pas de nom/prénom
    const parentFirstName = (userData.parentFirstName && userData.parentFirstName.trim() !== '') 
        ? userData.parentFirstName 
        : userData.studentFirstName;
    const parentLastName = (userData.parentLastName && userData.parentLastName.trim() !== '') 
        ? userData.parentLastName 
        : userData.studentLastName;
    
    const parentEmail = generateEmail('parent', userData.parentCode, parentFirstName, parentLastName);
    
    const studentFirstNameEscaped = escapeSQL(userData.studentFirstName);
    const studentLastNameEscaped = escapeSQL(userData.studentLastName);
    const parentFirstNameEscaped = escapeSQL(parentFirstName);
    const parentLastNameEscaped = escapeSQL(parentLastName);
    const parentContactEscaped = escapeSQL(userData.parentContact);
    
    // Créer le compte utilisateur pour l'élève
    sql += `-- Compte élève ${index + 1}: ${userData.studentCode}
INSERT INTO users (email, first_name, last_name, password, role, created_at, updated_at)
VALUES (
    '${studentEmail}',
    '${studentFirstNameEscaped}',
    '${studentLastNameEscaped}',
    '${studentPasswordHash}',
    'student',
    NOW(),
    NOW()
)
ON DUPLICATE KEY UPDATE 
    email = '${studentEmail}',
    first_name = '${studentFirstNameEscaped}',
    last_name = '${studentLastNameEscaped}',
    updated_at = NOW();

`;

    // Créer le compte utilisateur pour le parent
    sql += `-- Compte parent ${index + 1}: ${userData.parentCode}
INSERT INTO users (email, first_name, last_name, contact, password, role, created_at, updated_at)
VALUES (
    '${parentEmail}',
    '${parentFirstNameEscaped}',
    '${parentLastNameEscaped}',
    '${parentContactEscaped}',
    '${parentPasswordHash}',
    'parent',
    NOW(),
    NOW()
)
ON DUPLICATE KEY UPDATE 
    email = '${parentEmail}',
    first_name = '${parentFirstNameEscaped}',
    last_name = '${parentLastNameEscaped}',
    contact = '${parentContactEscaped}',
    updated_at = NOW();

`;

});

sql += `COMMIT;

-- ============================================
-- FIN DU SCRIPT
-- ============================================
`;

// Écrire le fichier SQL
const outputPath = path.join(__dirname, '../../import_college_students.sql');
fs.writeFileSync(outputPath, sql, 'utf-8');

console.log(`✅ Script SQL généré avec succès !`);
console.log(`📁 Fichier créé : ${outputPath}`);
console.log(`📊 Statistiques :`);
console.log(`   - Nombre d'élèves : ${students.length}`);
console.log(`   - Nombre de classes : ${classesMap.size}`);
console.log(`   - Nombre de niveaux : ${levelsMap.size}`);
console.log(`   - Nombre de comptes utilisateurs créés : ${usersData.length * 2} (${usersData.length} élèves + ${usersData.length} parents)`);
console.log(`\n📋 Classes créées :`);
sortedClasses.forEach(c => {
    console.log(`   - ${c.name} (${c.levelDisplayName})`);
});
console.log(`\n🔐 Informations de connexion :`);
console.log(`   - Les mots de passe sont les codes (E00001, P00001, etc.) hashés`);
console.log(`   - Les emails sont générés automatiquement et peuvent être modifiés plus tard`);
console.log(`   - Format email élève : eleve.E00001@lapetiteacademie.ci`);
console.log(`   - Format email parent : parent.P00001@lapetiteacademie.ci`);
