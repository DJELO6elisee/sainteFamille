/**
 * Script de diagnostic pour identifier les incohérences dans le comptage des élèves
 * 
 * Ce script vérifie:
 * 1. Le nombre total d'élèves dans la table students
 * 2. Le nombre d'élèves actifs par niveau d'éducation
 * 3. Les élèves qui pourraient être comptés plusieurs fois
 */

const pool = require('../config/database');
const { getCurrentSchoolYear } = require('../config/schoolYear');

async function diagnoseStudentCount() {
    try {
        console.log('🔍 Diagnostic du comptage des élèves...\n');

        const schoolYear = getCurrentSchoolYear();
        console.log(`📅 Année scolaire: ${schoolYear}\n`);

        // 1. Compter le nombre total d'élèves dans la table students
        const [totalStudents] = await pool.query(`
            SELECT COUNT(*) as total
            FROM students
        `);
        console.log(`📊 Total d'élèves dans la table students: ${totalStudents[0].total}`);

        // 2. Compter les élèves actifs par niveau
        const [studentsByLevel] = await pool.query(`
            SELECT 
                el.id,
                el.name as level_name,
                COUNT(DISTINCT s.id) as students_count
            FROM education_levels el
            LEFT JOIN classes c ON c.education_level_id = el.id
            LEFT JOIN enrollments e ON e.class_id = c.id
            LEFT JOIN students s ON s.id = e.student_id
            WHERE el.is_active = 1
              AND e.status = 'active'
              AND (e.school_year = ? OR e.school_year IS NULL)
            GROUP BY el.id, el.name
            ORDER BY el.name
        `, [schoolYear]);

        console.log('\n📚 Élèves par niveau d\'éducation:');
        let totalCounted = 0;
        studentsByLevel.forEach(level => {
            console.log(`  - ${level.level_name}: ${level.students_count} élèves`);
            totalCounted += parseInt(level.students_count) || 0;
        });
        console.log(`\n📊 Total compté par niveau: ${totalCounted}`);

        // 3. Identifier les élèves qui sont inscrits dans plusieurs classes du même niveau
        const [duplicateStudents] = await pool.query(`
            SELECT 
                s.id,
                s.first_name,
                s.last_name,
                el.name as level_name,
                COUNT(DISTINCT e.class_id) as class_count,
                GROUP_CONCAT(DISTINCT c.name ORDER BY c.name SEPARATOR ', ') as classes
            FROM students s
            INNER JOIN enrollments e ON e.student_id = s.id
            INNER JOIN classes c ON c.id = e.class_id
            INNER JOIN education_levels el ON el.id = c.education_level_id
            WHERE e.status = 'active'
              AND (e.school_year = ? OR e.school_year IS NULL)
              AND el.is_active = 1
            GROUP BY s.id, el.id, el.name
            HAVING COUNT(DISTINCT e.class_id) > 1
            ORDER BY el.name, s.last_name, s.first_name
        `, [schoolYear]);

        if (duplicateStudents.length > 0) {
            console.log('\n⚠️  Élèves inscrits dans plusieurs classes du même niveau:');
            duplicateStudents.forEach(student => {
                console.log(`  - ${student.first_name} ${student.last_name} (ID: ${student.id})`);
                console.log(`    Niveau: ${student.level_name}`);
                console.log(`    Classes: ${student.classes} (${student.class_count} classes)`);
            });
        } else {
            console.log('\n✅ Aucun élève inscrit dans plusieurs classes du même niveau');
        }

        // 4. Identifier les élèves qui sont inscrits dans des classes de différents niveaux
        const [studentsInMultipleLevels] = await pool.query(`
            SELECT 
                s.id,
                s.first_name,
                s.last_name,
                COUNT(DISTINCT el.id) as level_count,
                GROUP_CONCAT(DISTINCT el.name ORDER BY el.name SEPARATOR ', ') as levels
            FROM students s
            INNER JOIN enrollments e ON e.student_id = s.id
            INNER JOIN classes c ON c.id = e.class_id
            INNER JOIN education_levels el ON el.id = c.education_level_id
            WHERE e.status = 'active'
              AND (e.school_year = ? OR e.school_year IS NULL)
              AND el.is_active = 1
            GROUP BY s.id
            HAVING COUNT(DISTINCT el.id) > 1
            ORDER BY s.last_name, s.first_name
        `, [schoolYear]);

        if (studentsInMultipleLevels.length > 0) {
            console.log('\n⚠️  Élèves inscrits dans plusieurs niveaux:');
            studentsInMultipleLevels.forEach(student => {
                console.log(`  - ${student.first_name} ${student.last_name} (ID: ${student.id})`);
                console.log(`    Niveaux: ${student.levels}`);
            });
        } else {
            console.log('\n✅ Aucun élève inscrit dans plusieurs niveaux');
        }

        // 5. Vérifier les enrollments avec des statuts incohérents
        const [inconsistentEnrollments] = await pool.query(`
            SELECT 
                s.id as student_id,
                s.first_name,
                s.last_name,
                c.name as class_name,
                el.name as level_name,
                e.status,
                e.school_year,
                COUNT(*) as enrollment_count
            FROM students s
            INNER JOIN enrollments e ON e.student_id = s.id
            INNER JOIN classes c ON c.id = e.class_id
            INNER JOIN education_levels el ON el.id = c.education_level_id
            WHERE (e.school_year = ? OR e.school_year IS NULL)
              AND el.is_active = 1
            GROUP BY s.id, c.id, e.status, e.school_year
            HAVING COUNT(*) > 1
            ORDER BY s.last_name, s.first_name
        `, [schoolYear]);

        if (inconsistentEnrollments.length > 0) {
            console.log('\n⚠️  Enrollments dupliqués détectés:');
            inconsistentEnrollments.forEach(enrollment => {
                console.log(`  - ${enrollment.first_name} ${enrollment.last_name} (ID: ${enrollment.student_id})`);
                console.log(`    Classe: ${enrollment.class_name}, Statut: ${enrollment.status}, Année: ${enrollment.school_year}`);
                console.log(`    Nombre d'enrollments: ${enrollment.enrollment_count}`);
            });
        } else {
            console.log('\n✅ Aucun enrollment dupliqué détecté');
        }

        // 6. Résumé
        console.log('\n📋 Résumé:');
        console.log(`  - Total élèves dans la table: ${totalStudents[0].total}`);
        console.log(`  - Total compté par niveau: ${totalCounted}`);
        console.log(`  - Différence: ${totalCounted - totalStudents[0].total}`);

        if (totalCounted !== totalStudents[0].total) {
            console.log('\n⚠️  ATTENTION: Incohérence détectée!');
            if (totalCounted > totalStudents[0].total) {
                console.log(`  Il y a ${totalCounted - totalStudents[0].total} élève(s) de trop dans le comptage.`);
                console.log('  Cela peut être dû à:');
                console.log('  - Des élèves inscrits dans plusieurs classes du même niveau');
                console.log('  - Des élèves inscrits dans plusieurs niveaux');
                console.log('  - Des enrollments dupliqués');
            } else {
                console.log(`  Il manque ${totalStudents[0].total - totalCounted} élève(s) dans le comptage.`);
                console.log('  Cela peut être dû à:');
                console.log('  - Des élèves sans enrollment actif');
                console.log('  - Des élèves avec des enrollments dans des classes de niveaux inactifs');
            }
        } else {
            console.log('\n✅ Les comptes sont cohérents!');
        }

    } catch (error) {
        console.error('❌ Erreur lors du diagnostic:', error);
        process.exit(1);
    }
}

// Exécuter le diagnostic
diagnoseStudentCount();