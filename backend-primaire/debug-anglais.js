// Script de diagnostic pour vérifier les notes d'ANGLAIS
const mysql = require('mysql2/promise');
const pool = require('./config/database');

async function checkAnglaisGrades() {
    try {
        const connection = await pool.getConnection();
        
        // Vérifier toutes les notes d'ANGLAIS pour l'étudiant 309
        console.log('=== VÉRIFICATION NOTES ANGLAIS POUR ÉTUDIANT 309 ===\n');
        
        const [grades] = await connection.execute(`
            SELECT 
                g.id,
                g.student_id,
                g.grade,
                g.bulletin_subject_id,
                g.composition_id,
                g.school_year,
                g.created_at,
                s.name as subject_name
            FROM grades g
            JOIN bulletin_subjects s ON g.bulletin_subject_id = s.id
            WHERE g.student_id = 309 
            AND (s.name LIKE '%ANGLAIS%' OR g.bulletin_subject_id = 16)
            ORDER BY g.created_at DESC
        `);
        
        console.log(`Nombre de notes trouvées: ${grades.length}`);
        console.log('\nDétails des notes:');
        grades.forEach((g, idx) => {
            console.log(`\nNote ${idx + 1}:`);
            console.log(`  ID: ${g.id}`);
            console.log(`  Étudiant: ${g.student_id}`);
            console(`  Matière: ${g.subject_name} (bulletin_subject_id: ${g.bulletin_subject_id})`);
            console.log(`  Note: ${g.grade} (type: ${typeof g.grade})`);
            console.log(`  Composition ID: ${g.composition_id}`);
            console.log(`  Année scolaire: ${g.school_year}`);
            console.log(`  Créée le: ${g.created_at}`);
        });
        
        // Vérifier spécifiquement la composition 1
        console.log('\n\n=== NOTES POUR COMPOSITION ID 1 ===\n');
        const [comp1Grades] = await connection.execute(`
            SELECT 
                g.id,
                g.student_id,
                g.grade,
                g.bulletin_subject_id,
                s.name as subject_name
            FROM grades g
            JOIN bulletin_subjects s ON g.bulletin_subject_id = s.id
            WHERE g.student_id = 309 
            AND g.composition_id = 1
            AND (s.name LIKE '%ANGLAIS%' OR g.bulletin_subject_id = 16)
        `);
        
        console.log(`Nombre de notes pour composition 1: ${comp1Grades.length}`);
        comp1Grades.forEach((g, idx) => {
            console.log(`\nNote ${idx + 1}:`);
            console.log(`  ID: ${g.id}`);
            console.log(`  Matière: ${g.subject_name}`);
            console.log(`  Note brute: ${g.grade} (type: ${typeof g.grade})`);
            console.log(`  Note parsée: ${parseFloat(g.grade)}`);
        });
        
        // Tester la requête exacte utilisée par l'endpoint
        console.log('\n\n=== TEST REQUÊTE ENDPOINT (composition_id = 1) ===\n');
        const [endpointResult] = await connection.execute(`
            SELECT 
                s.name as subject_name,
                g.bulletin_subject_id as subject_id,
                g.grade as average,
                1 as note_count,
                CAST(g.grade as CHAR) as all_grades,
                g.is_published as publication_status,
                s.display_order
            FROM grades g
            JOIN bulletin_subjects s ON g.bulletin_subject_id = s.id
            WHERE g.student_id = 309 
            AND g.class_id = 24
            AND g.composition_id = 1
            AND g.school_year = '2025-2026'
            AND g.id = (
                SELECT g2.id 
                FROM grades g2 
                WHERE g2.student_id = g.student_id 
                AND g2.bulletin_subject_id = g.bulletin_subject_id 
                AND g2.composition_id = g.composition_id
                AND g2.school_year = g.school_year
                ORDER BY g2.created_at DESC 
                LIMIT 1
            )
            AND (s.name LIKE '%ANGLAIS%' OR g.bulletin_subject_id = 16)
            ORDER BY s.display_order, s.name
        `);
        
        console.log(`Résultats de la requête endpoint: ${endpointResult.length}`);
        endpointResult.forEach((r, idx) => {
            console.log(`\nRésultat ${idx + 1}:`);
            console.log(`  subject_name: ${r.subject_name}`);
            console.log(`  subject_id: ${r.subject_id}`);
            console.log(`  average: ${r.average} (type: ${typeof r.average})`);
            console.log(`  average parsée: ${parseFloat(r.average)}`);
        });
        
        await connection.release();
        process.exit(0);
    } catch (error) {
        console.error('Erreur:', error);
        process.exit(1);
    }
}

checkAnglaisGrades();










