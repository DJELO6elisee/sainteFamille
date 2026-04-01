const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();

// Configuration CORS (gère aussi les pré-vols OPTIONS)
// Frontend et API sur le même domaine : https://saintefamilleexcellence.ci
const allowedOrigins = [
    'http://localhost:3000',
    'http://127.0.0.1:3000',
    'https://saintefamilleexcellence.ci',
    'http://saintefamilleexcellence.ci',
    'https://www.saintefamilleexcellence.ci',
    'http://www.saintefamilleexcellence.ci',
];

// Domaines autorisés (sans protocole) pour comparaison
const ALLOWED_DOMAINS = ['saintefamilleexcellence.ci'];

// Domaine principal de production (frontend)
const PRODUCTION_DOMAIN = 'saintefamilleexcellence.ci';

// Log de la configuration CORS au démarrage
console.log('[CORS] Configuration CORS initialisée:');
console.log('[CORS] Domaines autorisés:', allowedOrigins);
console.log('[CORS] Domaine de production:', PRODUCTION_DOMAIN);

const isDev = process.env.NODE_ENV !== 'production';
const corsOptions = {
    origin: function(origin, callback) {
        // Permettre les requêtes sans origine (mobile apps, curl, navigation directe)
        if (!origin) {
            if (isDev) console.log('[CORS] ✓ Requête sans origine autorisée');
            return callback(null, true);
        }
        
        // Normaliser l'origine (enlever le slash final si présent)
        const normalizedOrigin = origin.endsWith('/') ? origin.slice(0, -1) : origin;
        
        // Vérifier si l'origine est dans la liste exacte
        if (allowedOrigins.includes(origin) || allowedOrigins.includes(normalizedOrigin)) {
            if (isDev) console.log(`[CORS] ✓ Origine autorisée (liste exacte): ${origin}`);
            return callback(null, true);
        }
        
        // Extraire le domaine de l'origine (sans protocole, sans port, sans chemin)
        let originDomain = origin.replace(/^https?:\/\//, '');
        originDomain = originDomain.split(':')[0];
        originDomain = originDomain.split('/')[0];
        
        const originDomainNoWww = originDomain.replace(/^www\./, '');
        const productionDomainNoWww = PRODUCTION_DOMAIN.replace(/^www\./, '');
        
        if (isDev) {
            console.log(`[CORS] Vérification: origin=${origin}, domain=${originDomain}`);
        }
        
        // AUTORISER TOUTES LES REQUÊTES DU MÊME DOMAINE (très permissif)
        if (originDomain === PRODUCTION_DOMAIN || 
            originDomainNoWww === productionDomainNoWww ||
            originDomain === productionDomainNoWww ||
            originDomainNoWww === PRODUCTION_DOMAIN ||
            originDomain.includes(PRODUCTION_DOMAIN) ||
            PRODUCTION_DOMAIN.includes(originDomainNoWww) ||
            originDomain.endsWith('.' + PRODUCTION_DOMAIN) ||
            originDomain.endsWith('.' + productionDomainNoWww)) {
            if (isDev) console.log(`[CORS] ✓ Origine autorisée (domaine production): ${origin}`);
            return callback(null, true);
        }
        
        // En mode développement, permettre toutes les origines localhost
        if (isDev && (origin.includes('localhost') || origin.includes('127.0.0.1'))) {
            console.log(`[CORS] ✓ Origine autorisée (dev): ${origin}`);
            return callback(null, true);
        }
        
        // Fallback : saintefamilleexcellence.ci (frontend et API même domaine)
        if (origin.includes('saintefamilleexcellence.ci')) {
            if (isDev) console.log(`[CORS] ✓ Origine autorisée (fallback): ${origin}`);
            return callback(null, true);
        }
        if (ALLOWED_DOMAINS.some(d => originDomain === d || originDomainNoWww === d || originDomain.endsWith('.' + d))) {
            if (isDev) console.log(`[CORS] ✓ Origine autorisée (ALLOWED_DOMAINS): ${origin}`);
            return callback(null, true);
        }
        
        // Origine non autorisée
        console.error(`[CORS] ✗ Origine REFUSÉE: ${origin}`);
        return callback(new Error('Not allowed by CORS'));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: [
        'Content-Type',
        'Authorization',
        'X-Requested-With',
        'Accept',
        'Origin',
        'Access-Control-Request-Method',
        'Access-Control-Request-Headers'
    ],
    exposedHeaders: ['Content-Range', 'X-Content-Range'],
    maxAge: 86400 // Cache preflight pour 24 heures
};

// Helper : vérifier si une origine est autorisée (liste exacte ou domaine)
function isOriginAllowed(origin) {
    if (!origin) return true;
    const normalized = origin.endsWith('/') ? origin.slice(0, -1) : origin;
    if (allowedOrigins.includes(origin) || allowedOrigins.includes(normalized)) return true;
    let domain = origin.replace(/^https?:\/\//, '').split(':')[0].split('/')[0];
    const domainNoWww = domain.replace(/^www\./, '');
    if (ALLOWED_DOMAINS.includes(domain) || ALLOWED_DOMAINS.includes(domainNoWww)) return true;
    if (ALLOWED_DOMAINS.some(d => domain === d || domainNoWww === d || domain.endsWith('.' + d))) return true;
    // Frontend et API sur saintefamilleexcellence.ci
    if (origin.includes('saintefamilleexcellence.ci')) return true;
    if (domain.includes('localhost') || domain.includes('127.0.0.1')) return isDev;
    return false;
}

// Réponse preflight CORS (204 + en-têtes). Utilisé pour ne jamais renvoyer 403 sur OPTIONS.
function sendPreflightOk(req, res, origin) {
    const allowOrigin = (origin && isOriginAllowed(origin)) ? origin : ('https://' + PRODUCTION_DOMAIN);
    res.setHeader('Access-Control-Allow-Origin', allowOrigin);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept, Origin, Access-Control-Request-Method, Access-Control-Request-Headers');
    res.setHeader('Access-Control-Max-Age', '86400');
    res.sendStatus(204);
}

// Tout OPTIONS (preflight) : TOUJOURS 204 + CORS, jamais 403 (sinon le navigateur bloque sans voir les en-têtes).
// Si vous recevez 403 sur OPTIONS, c'est le PROXY (Nginx/Apache) qui bloque : il faut transmettre OPTIONS à Node.
app.use((req, res, next) => {
    if (req.method !== 'OPTIONS') return next();
    const origin = req.headers.origin;
    // Toujours autoriser le preflight : utiliser l'origine demandée si autorisée, sinon le domaine frontend
    const allowOrigin = (origin && isOriginAllowed(origin)) ? origin : ('https://' + PRODUCTION_DOMAIN);
    if (origin && !isOriginAllowed(origin)) {
        console.warn(`[CORS] Preflight origine inconnue (on autorise quand même le preflight): ${origin}`);
    }
    res.setHeader('Access-Control-Allow-Origin', allowOrigin);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept, Origin, Access-Control-Request-Method, Access-Control-Request-Headers');
    res.setHeader('Access-Control-Max-Age', '86400');
    return res.sendStatus(204);
});

// CORS : en-têtes sur les autres requêtes (GET, POST, etc.)
app.use((req, res, next) => {
    const origin = req.headers.origin;
    if (origin && isOriginAllowed(origin)) {
        res.setHeader('Access-Control-Allow-Origin', origin);
        res.setHeader('Access-Control-Allow-Credentials', 'true');
    }
    next();
});

// Middleware de logging (détaillé uniquement en développement)
app.use((req, res, next) => {
    if (isDev) {
        const origin = req.headers.origin;
        const host = req.headers.host;
        console.log(`[REQUEST] ${req.method} ${req.path} | Origin: ${origin || 'none'} | Host: ${host || 'none'}`);
    }
    next();
});

app.use(cors(corsOptions));

// Gérer explicitement les requêtes OPTIONS (preflight) — redondance avec le middleware ci‑dessus
app.options('*', cors(corsOptions));

// Middleware pour parser le JSON
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Servir les fichiers statiques
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use('/uploads/homepage', express.static(path.join(__dirname, 'uploads', 'homepage')));
app.use('/protected_uploads', express.static(path.join(__dirname, 'protected_uploads')));

// Routes
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/students', require('./routes/studentRoutes'));
app.use('/api/teachers', require('./routes/teacherRoutes'));
app.use('/api/classes', require('./routes/classRoutes'));
app.use('/api/subjects', require('./routes/subjectRoutes'));
app.use('/api/compositions', require('./routes/compositionRoutes'));
app.use('/api/courses', require('./routes/courseRoutes'));
app.use('/api/schedules', require('./routes/scheduleRoutes'));
app.use('/api/payments', require('./routes/paymentRoutes'));
app.use('/api/absences', require('./routes/absenceRoutes'));
app.use('/api/teacher-absences', require('./routes/teacherAbsenceRoutes'));
app.use('/api/report-cards', require('./routes/reportCardRoutes'));
app.use('/api/events', require('./routes/eventRoutes'));
app.use('/api/notifications', require('./routes/notificationRoutes'));
app.use('/api/media', require('./routes/mediaRoutes'));
app.use('/api/information', require('./routes/informationRoutes'));
app.use('/api/dashboard', require('./routes/dashboardRoutes'));
app.use('/api/garderie', require('./routes/garderieRoutes'));
app.use('/api/cantine', require('./routes/cantineRoutes'));
app.use('/api/discounts', require('./routes/discountRoutes'));
app.use('/api/history', require('./routes/historyRoutes'));
app.use('/api/homepage', require('./routes/homepageRoutes'));
app.use('/api/education-levels', require('./routes/educationLevelRoutes'));
app.use('/api/installments', require('./routes/installmentRoutes'));
app.use('/api/reminders', require('./routes/reminderRoutes'));
app.use('/api/reports', require('./routes/reportRoutes'));
app.use('/api/bulletins', require('./routes/bulletinRoutes'));
app.use('/api/bulletin-subjects', require('./routes/bulletinSubjectRoutes'));
app.use('/api/frais-annexes', require('./routes/annexeFeesRoutes'));

// Helper: map legacy subject_id to bulletin_subject_id (used in debug endpoints)
const resolveBulletinSubjectId = async(subjectId, classId) => {
    const pool = require('./config/database');
    // First check if subjectId is already a bulletin_subject_id
    const [bsCheck] = await pool.query('SELECT id FROM bulletin_subjects WHERE id = ? LIMIT 1', [subjectId]);
    if (bsCheck.length > 0) {
        console.log(`[resolveBulletinSubjectId] subjectId ${subjectId} est déjà un bulletin_subject_id`);
        return subjectId;
    }

    let levelGroup = null;
    if (classId) {
        const [classRow] = await pool.query('SELECT name FROM classes WHERE id = ? LIMIT 1', [classId]);
        if (classRow.length > 0) {
            const upperName = String(classRow[0].name || '').toUpperCase();
            levelGroup = (upperName.startsWith('CP1') || upperName.startsWith('CP2') || upperName.startsWith('CP')) ? 'cp' : 'ce_cm';
        }
    }
    if (levelGroup) {
        const [byLevel] = await pool.query(
            'SELECT bulletin_subject_id FROM subject_bulletin_mappings WHERE subject_id = ? AND level_group = ? LIMIT 1', [subjectId, levelGroup]
        );
        if (byLevel.length > 0) return byLevel[0].bulletin_subject_id;
    }
    const [anyMap] = await pool.query(
        'SELECT bulletin_subject_id FROM subject_bulletin_mappings WHERE subject_id = ? LIMIT 1', [subjectId]
    );
    if (anyMap.length > 0) return anyMap[0].bulletin_subject_id;
    const [byName] = await pool.query(
        `SELECT bs.id AS bulletin_subject_id
         FROM subjects s
         JOIN bulletin_subjects bs ON bs.name = s.name
         WHERE s.id = ?
         LIMIT 1`, [subjectId]
    );
    return byName.length > 0 ? byName[0].bulletin_subject_id : null;
};

// Route de debug temporaire pour les matières d'une classe (sans auth)
app.get('/api/debug/class/:classId/subjects', async(req, res) => {
    try {
        const { classId } = req.params;
        const schoolYear = req.query.school_year || '2025-2026';

        console.log(`[DEBUG CLASS SUBJECTS] Récupération pour classe ${classId}, année ${schoolYear}`);

        const pool = require('./config/database');
        const [subjects] = await pool.query(`
      SELECT DISTINCT 
        s.id, 
        s.name, 
        s.type, 
        s.level_groups,
        COUNT(sch.id) as schedule_count
      FROM subjects s
      JOIN schedules sch ON s.id = sch.subject_id
      WHERE sch.class_id = ? 
      AND sch.school_year = ?
      GROUP BY s.id, s.name, s.type, s.level_groups
      ORDER BY s.name
    `, [classId, schoolYear]);

        console.log(`[DEBUG CLASS SUBJECTS] ${subjects.length} matières trouvées`);
        subjects.forEach(s => console.log(`  - ${s.name} (${s.schedule_count} cours)`));

        res.json({
            authorized_subjects: subjects,
            debug_info: {
                classId,
                schoolYear,
                totalSubjects: subjects.length
            }
        });
    } catch (error) {
        console.error('[DEBUG CLASS SUBJECTS] Erreur:', error);
        res.status(500).json({ error: error.message });
    }
});

// Racine : évite 404 quand un client accède à / (ex. santé check, navigation sans origine)
app.get('/', (req, res) => {
    res.json({
        message: 'API GROUPE SCOLAIRE SAINTE FAMILLE',
        api: true,
        docs: '/api/test, /api/cors-config',
        timestamp: new Date().toISOString()
    });
});

// Route de test
app.get('/api/test', (req, res) => {
    res.json({ message: 'API fonctionne correctement' });
});

// Route de test CORS - pour vérifier si les requêtes atteignent Node.js
app.get('/api/test-cors', (req, res) => {
    const origin = req.headers.origin;
    const host = req.headers.host;
    
    res.json({
        message: 'Test CORS - Requête reçue par Node.js',
        origin: origin || 'none',
        host: host || 'none',
        method: req.method,
        path: req.path,
        timestamp: new Date().toISOString(),
        nodeVersion: process.version,
        corsConfig: {
            allowedOrigins: allowedOrigins,
            productionDomain: PRODUCTION_DOMAIN
        }
    });
});

// Route de test CORS avec POST
app.post('/api/test-cors', (req, res) => {
    const origin = req.headers.origin;
    const host = req.headers.host;
    
    res.json({
        message: 'Test CORS POST - Requête reçue par Node.js',
        origin: origin || 'none',
        host: host || 'none',
        method: req.method,
        path: req.path,
        body: req.body,
        timestamp: new Date().toISOString(),
        corsConfig: {
            allowedOrigins: allowedOrigins,
            productionDomain: PRODUCTION_DOMAIN
        }
    });
});

// Route de diagnostic CORS
app.get('/api/cors-config', (req, res) => {
    const allowedDomains = allowedOrigins.map(o => {
        const domain = o.replace(/^https?:\/\//, '').replace(/^www\./, '');
        return domain;
    });
    allowedDomains.push(PRODUCTION_DOMAIN);
    
    res.json({
        message: 'Configuration CORS actuelle',
        allowedOrigins: allowedOrigins,
        productionDomain: PRODUCTION_DOMAIN,
        allowedDomains: [...new Set(allowedDomains)],
        nodeEnv: process.env.NODE_ENV || 'development',
        timestamp: new Date().toISOString()
    });
});

// Route de debug pour les notes (sans authentification)
app.get('/api/debug/grades', async(req, res) => {
    try {
        const pool = require('./config/database');
        const { class_id, subject_id, composition_id } = req.query;

        console.log('[DEBUG] Paramètres reçus:', { class_id, subject_id, composition_id });

        // Récupérer toutes les notes pour cette composition
        const [allGrades] = await pool.query(`
            SELECT g.*, s.first_name, s.last_name, sub.name as subject_name, c.name as composition_name
            FROM grades g
            LEFT JOIN students s ON g.student_id = s.id
            LEFT JOIN bulletin_subjects sub ON g.bulletin_subject_id = sub.id
            LEFT JOIN compositions c ON g.composition_id = c.id
            WHERE g.composition_id = ?
        `, [composition_id]);

        // Récupérer les notes filtrées
        const [filteredGrades] = await pool.query(`
            SELECT g.*, s.first_name, s.last_name, sub.name as subject_name
            FROM grades g
            JOIN students s ON g.student_id = s.id
            JOIN bulletin_subjects sub ON g.bulletin_subject_id = sub.id
            WHERE g.class_id = ? AND g.bulletin_subject_id = ? AND g.composition_id = ?
        `, [class_id, await resolveBulletinSubjectId(subject_id, class_id), composition_id]);

        console.log('[DEBUG] Toutes les notes composition:', allGrades);
        console.log('[DEBUG] Notes filtrées:', filteredGrades);

        res.json({
            all_grades: allGrades,
            filtered_grades: filteredGrades,
            search_params: { class_id, subject_id, composition_id }
        });
    } catch (error) {
        console.error('[DEBUG] Erreur:', error);
        res.status(500).json({ message: error.message });
    }
});

// Route de debug pour un élève spécifique (bulletin)
app.get('/api/debug/student-bulletin/:studentId', async(req, res) => {
    try {
        const pool = require('./config/database');
        const { studentId } = req.params;
        const { trimester = '1er trimestre', school_year = '2025-2026', composition_id } = req.query;

        console.log('[DEBUG BULLETIN] Élève:', studentId, 'Trimestre:', trimester, 'Année:', school_year, 'Composition:', composition_id);

        // 1. Info élève et classe
        const [studentInfo] = await pool.query(`
            SELECT 
                s.first_name, s.last_name, s.registration_number,
                c.id as class_id, c.name as class_name
            FROM students s
            JOIN enrollments e ON s.id = e.student_id AND e.status = 'active' AND e.school_year = ?
            JOIN classes c ON e.class_id = c.id
            WHERE s.id = ?
        `, [school_year, studentId]);

        if (studentInfo.length === 0) {
            return res.json({ error: 'Élève non trouvé ou non inscrit' });
        }

        const student = studentInfo[0];
        console.log('[DEBUG BULLETIN] Info élève:', student);

        // Construire la condition WHERE pour la composition si spécifiée
        let compositionCondition = '';
        let compositionParams = [];

        if (composition_id) {
            compositionCondition = 'AND g.composition_id = ?';
            compositionParams = [composition_id];
            console.log('[DEBUG BULLETIN] Mode composition - Filtering by composition_id:', composition_id);
        } else {
            compositionCondition = 'AND (g.semester = ? OR g.semester IS NULL)';
            compositionParams = [trimester];
            console.log('[DEBUG BULLETIN] Mode trimestre - Filtering by semester:', trimester);
        }

        // 2. Toutes les notes de l'élève (publiées et non publiées)
        const [allGrades] = await pool.query(`
            SELECT 
                s.name as subject_name,
                g.grade,
                g.composition_id,
                c.name as composition_name,
                g.is_published,
                g.semester,
                g.school_year,
                g.created_at
            FROM grades g
            JOIN bulletin_subjects s ON g.bulletin_subject_id = s.id
            LEFT JOIN compositions c ON g.composition_id = c.id
            WHERE g.student_id = ? 
            AND g.class_id = ?
            AND g.school_year = ?
            ORDER BY s.name, g.created_at
        `, [studentId, student.class_id, school_year]);

        // 3. Notes filtrées pour le bulletin
        // Pour l'endpoint debug, on retourne TOUTES les notes (publiées ou non)
        // IMPORTANT: Cette requête doit récupérer TOUTES les matières, y compris ANGLAIS
        // Quand composition_id est fourni, récupérer la note exacte telle qu'elle fut saisie par l'enseignant
        let bulletinGrades;
        if (composition_id) {
            // Pour une composition spécifique, récupérer la note exacte sans agrégation
            // Utiliser une sous-requête pour obtenir la note la plus récente si plusieurs existent
            [bulletinGrades] = await pool.query(`
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
                WHERE g.student_id = ? 
                AND g.class_id = ? 
                AND g.composition_id = ?
                AND g.school_year = ?
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
                ORDER BY s.display_order, s.name
            `, [studentId, student.class_id, composition_id, school_year]);

            // S'assurer que les valeurs sont bien numériques
            bulletinGrades = bulletinGrades.map(row => ({
                ...row,
                average: parseFloat(row.average) || 0,
                subject_id: parseInt(row.subject_id) || 0
            }));

            console.log(`[DEBUG BULLETIN] Notes récupérées pour composition ${composition_id}:`, JSON.stringify(bulletinGrades, null, 2));
        } else {
            // Pour un trimestre, utiliser AVG pour agréger plusieurs compositions
            [bulletinGrades] = await pool.query(`
                SELECT 
                    s.name as subject_name,
                    g.bulletin_subject_id as subject_id,
                    AVG(g.grade) as average,
                    COUNT(g.id) as note_count,
                    GROUP_CONCAT(g.grade ORDER BY g.created_at DESC) as all_grades,
                    GROUP_CONCAT(g.is_published) as publication_status,
                    s.display_order
                FROM grades g
                JOIN bulletin_subjects s ON g.bulletin_subject_id = s.id
                WHERE g.student_id = ? 
                AND g.class_id = ? 
                ${compositionCondition}
                AND g.school_year = ?
                GROUP BY g.bulletin_subject_id, s.name, s.display_order
                ORDER BY s.display_order, s.name
            `, [studentId, student.class_id, ...compositionParams, school_year]);

            // S'assurer que les valeurs sont bien numériques
            bulletinGrades = bulletinGrades.map(row => ({
                ...row,
                average: parseFloat(row.average) || 0,
                subject_id: parseInt(row.subject_id) || 0
            }));
        }

        console.log('[DEBUG BULLETIN] Query params for bulletin_grades:', [studentId, student.class_id, ...compositionParams, school_year]);
        console.log('[DEBUG BULLETIN] Composition condition:', compositionCondition);
        console.log('[DEBUG BULLETIN] Toutes les notes:', JSON.stringify(allGrades, null, 2));
        console.log('[DEBUG BULLETIN] Notes pour bulletin:', JSON.stringify(bulletinGrades, null, 2));

        // Log spécifique pour ANGLAIS pour déboguer
        const anglaisGrades = bulletinGrades.filter(bg =>
            (bg.subject_name || '').toUpperCase().includes('ANGLAIS')
        );
        if (anglaisGrades.length > 0) {
            console.log('[DEBUG BULLETIN] ⚠️ ANGLAIS trouvé:', JSON.stringify(anglaisGrades, null, 2));
            anglaisGrades.forEach(ag => {
                console.log(`[DEBUG BULLETIN] ANGLAIS - subject_id: ${ag.subject_id}, average: ${ag.average}, type: ${typeof ag.average}`);
            });
        }

        // Déterminer le type de classe
        const className = student.class_name.toUpperCase();
        const isCP = className.startsWith('CP');
        const isCE1 = className.startsWith('CE1');
        const isCE2 = className.startsWith('CE2');
        const isCE = className.startsWith('CE');
        const isCM1 = className.startsWith('CM1');
        const isCM2 = className.startsWith('CM2');

        // Fonction pour récupérer les notes telles qu'elles ont été saisies (pas de conversion)
        const convertGradeForDisplay = (rawGrade, subjectName, className) => {
            // Retourner la note brute telle qu'elle a été saisie par l'enseignant
            return parseFloat(rawGrade) || 0;
        };

        // 4. Calculer highest_average et lowest_average pour cette composition/classe
        let highest_average = null;
        let lowest_average = null;
        let class_average = null;

        if (composition_id) {
            // Pour une composition spécifique
            if (isCE) {
                // CE1/CE2: calcul sur matières ciblées (exploitation, AEM, orthographe, maths)
                const targeted = ['EXPLOITATION DE TEXTE', 'A.E.M', 'ORTHOGRAPHE', 'DICTEE', 'DICTÉE', 'MATHEMATIQUE', 'MATHÉMATIQUE'];

                const [classSubjectAverages] = await pool.query(`
                    SELECT 
                        g.student_id,
                        s.name as subject_name,
                        AVG(g.grade) as average
                    FROM grades g
                    JOIN bulletin_subjects s ON g.bulletin_subject_id = s.id
                    WHERE g.class_id = ? 
                    AND g.composition_id = ?
                    AND g.school_year = ?
                    GROUP BY g.student_id, g.bulletin_subject_id, s.name
                `, [student.class_id, composition_id, school_year]);

                const perStudentAverages = new Map();
                classSubjectAverages.forEach(row => {
                    const sid = row.student_id;
                    const name = (row.subject_name || '').toUpperCase();
                    if (targeted.some(t => name.includes(t))) {
                        const current = perStudentAverages.get(sid) || { total: 0, count: 0 };
                        // Utiliser la note brute telle qu'elle a été saisie
                        const rawScore = parseFloat(row.average) || 0;
                        current.total += rawScore;
                        current.count += 1;
                        perStudentAverages.set(sid, current);
                    }
                });

                const ranking = [];
                for (const [sid, val] of perStudentAverages.entries()) {
                    // CE1: /11, CE2: /17 (comme CM1)
                    const avg = val.count > 0 ? val.total / (isCE2 ? 17 : 11) : 0;
                    ranking.push({ student_id: sid, general_average: avg });
                }

                ranking.sort((a, b) => b.general_average - a.general_average);

                if (ranking.length > 0) {
                    highest_average = parseFloat(Number(ranking[0].general_average).toFixed(2));
                    lowest_average = parseFloat(Number(ranking[ranking.length - 1].general_average).toFixed(2));
                    // Calculer la moyenne de la classe
                    const totalAvg = ranking.reduce((sum, r) => sum + r.general_average, 0);
                    class_average = parseFloat((totalAvg / ranking.length).toFixed(2));
                }
            } else if (isCP) {
                // CP: calcul sur matières ciblées, conversion /20 vers /10
                const targeted = ['GRAPHISME/ECRITURE', 'GRAPHISME/ÉCRITURE', 'DISCRIMINATION VISUELLE', 'EDHC', 'MATHEMATIQUE', 'MATHÉMATIQUE', 'CHANT/POESIE', 'CHANT/POÉSIE', 'DESSIN'];

                const [classSubjectAverages] = await pool.query(`
                    SELECT 
                        g.student_id,
                        s.name as subject_name,
                        AVG(g.grade) as average
                    FROM grades g
                    JOIN bulletin_subjects s ON g.bulletin_subject_id = s.id
                    WHERE g.class_id = ? 
                    AND g.composition_id = ?
                    AND g.school_year = ?
                    GROUP BY g.student_id, g.bulletin_subject_id, s.name
                `, [student.class_id, composition_id, school_year]);

                const perStudentAverages = new Map();
                classSubjectAverages.forEach(row => {
                    const sid = row.student_id;
                    const name = (row.subject_name || '').toUpperCase();
                    if (targeted.some(t => name.includes(t))) {
                        const current = perStudentAverages.get(sid) || { total: 0, count: 0 };
                        // Utiliser la note brute telle qu'elle a été saisie
                        const rawScore = parseFloat(row.average) || 0;
                        current.total += rawScore;
                        current.count += 1;
                        perStudentAverages.set(sid, current);
                    }
                });

                const ranking = [];
                for (const [sid, val] of perStudentAverages.entries()) {
                    const avg = val.count > 0 ? val.total / 6 : 0;
                    ranking.push({ student_id: sid, general_average: avg });
                }

                ranking.sort((a, b) => b.general_average - a.general_average);

                if (ranking.length > 0) {
                    highest_average = parseFloat(Number(ranking[0].general_average).toFixed(2));
                    lowest_average = parseFloat(Number(ranking[ranking.length - 1].general_average).toFixed(2));
                    // Calculer la moyenne de la classe
                    const totalAvg = ranking.reduce((sum, r) => sum + r.general_average, 0);
                    class_average = parseFloat((totalAvg / ranking.length).toFixed(2));
                }
            } else if (isCM1 || isCM2) {
                // CM1/CM2: exclure certaines matières du total
                const excluded = ['LECTURE', 'ANGLAIS', 'EPS', 'E.P.S', 'CONDUITE'];

                const [classSubjectAverages] = await pool.query(`
                    SELECT 
                        g.student_id,
                        s.name as subject_name,
                        AVG(g.grade) as average
                    FROM grades g
                    JOIN bulletin_subjects s ON g.bulletin_subject_id = s.id
                    WHERE g.class_id = ? 
                    AND g.composition_id = ?
                    AND g.school_year = ?
                    GROUP BY g.student_id, g.bulletin_subject_id, s.name
                `, [student.class_id, composition_id, school_year]);

                const perStudentAverages = new Map();
                classSubjectAverages.forEach(row => {
                    const sid = row.student_id;
                    const name = (row.subject_name || '').toUpperCase();
                    if (!excluded.some(ex => name.includes(ex))) {
                        const current = perStudentAverages.get(sid) || { total: 0 };
                        // Utiliser la note brute telle qu'elle a été saisie
                        const rawScore = parseFloat(row.average) || 0;
                        current.total += rawScore;
                        perStudentAverages.set(sid, current);
                    }
                });

                const ranking = [];
                for (const [sid, val] of perStudentAverages.entries()) {
                    const avg = isCM1 ? (val.total / 17) : (val.total / 8.5);
                    ranking.push({ student_id: sid, general_average: avg });
                }

                ranking.sort((a, b) => b.general_average - a.general_average);

                if (ranking.length > 0) {
                    highest_average = parseFloat(Number(ranking[0].general_average).toFixed(2));
                    lowest_average = parseFloat(Number(ranking[ranking.length - 1].general_average).toFixed(2));
                    // Calculer la moyenne de la classe
                    const totalAvg = ranking.reduce((sum, r) => sum + r.general_average, 0);
                    class_average = parseFloat((totalAvg / ranking.length).toFixed(2));
                }
            } else {
                // Pour les autres classes, utiliser la moyenne pondérée standard
                const [classAverages] = await pool.query(`
                    SELECT 
                        g.student_id,
                        AVG(g.grade * COALESCE(cs.coefficient, 1)) / AVG(COALESCE(cs.coefficient, 1)) as general_average
                    FROM grades g
                    LEFT JOIN class_subjects cs ON cs.class_id = g.class_id AND cs.subject_id = g.bulletin_subject_id
                    WHERE g.class_id = ? 
                    AND g.composition_id = ?
                    AND g.school_year = ?
                    GROUP BY g.student_id
                    HAVING general_average IS NOT NULL
                    ORDER BY general_average DESC
                `, [student.class_id, composition_id, school_year]);

                if (classAverages.length > 0) {
                    highest_average = parseFloat(Number(classAverages[0].general_average).toFixed(2));
                    lowest_average = parseFloat(Number(classAverages[classAverages.length - 1].general_average).toFixed(2));
                    // Calculer la moyenne de la classe
                    const totalAvg = classAverages.reduce((sum, r) => sum + r.general_average, 0);
                    class_average = parseFloat((totalAvg / classAverages.length).toFixed(2));
                }
            }
        } else {
            // Pour un trimestre
            if (isCE) {
                // CE1/CE2: calcul sur matières ciblées (exploitation, AEM, orthographe, maths)
                const targeted = ['EXPLOITATION DE TEXTE', 'A.E.M', 'ORTHOGRAPHE', 'DICTEE', 'DICTÉE', 'MATHEMATIQUE', 'MATHÉMATIQUE'];

                const [classSubjectAverages] = await pool.query(`
                    SELECT 
                        g.student_id,
                        s.name as subject_name,
                        AVG(g.grade) as average
                    FROM grades g
                    JOIN bulletin_subjects s ON g.bulletin_subject_id = s.id
                    WHERE g.class_id = ? 
                    AND (g.semester = ? OR g.semester IS NULL)
                    AND g.school_year = ?
                    GROUP BY g.student_id, g.bulletin_subject_id, s.name
                `, [student.class_id, trimester, school_year]);

                const perStudentAverages = new Map();
                classSubjectAverages.forEach(row => {
                    const sid = row.student_id;
                    const name = (row.subject_name || '').toUpperCase();
                    if (targeted.some(t => name.includes(t))) {
                        const current = perStudentAverages.get(sid) || { total: 0, count: 0 };
                        // Utiliser la note brute telle qu'elle a été saisie
                        const rawScore = parseFloat(row.average) || 0;
                        current.total += rawScore;
                        current.count += 1;
                        perStudentAverages.set(sid, current);
                    }
                });

                const ranking = [];
                for (const [sid, val] of perStudentAverages.entries()) {
                    // CE1: /11, CE2: /17 (comme CM1)
                    const avg = val.count > 0 ? val.total / (isCE2 ? 17 : 11) : 0;
                    ranking.push({ student_id: sid, general_average: avg });
                }

                ranking.sort((a, b) => b.general_average - a.general_average);

                if (ranking.length > 0) {
                    highest_average = parseFloat(Number(ranking[0].general_average).toFixed(2));
                    lowest_average = parseFloat(Number(ranking[ranking.length - 1].general_average).toFixed(2));
                    // Calculer la moyenne de la classe
                    const totalAvg = ranking.reduce((sum, r) => sum + r.general_average, 0);
                    class_average = parseFloat((totalAvg / ranking.length).toFixed(2));
                }
            } else if (isCP) {
                // CP: calcul sur matières ciblées, conversion /20 vers /10
                const targeted = ['GRAPHISME/ECRITURE', 'GRAPHISME/ÉCRITURE', 'DISCRIMINATION VISUELLE', 'EDHC', 'MATHEMATIQUE', 'MATHÉMATIQUE', 'CHANT/POESIE', 'CHANT/POÉSIE', 'DESSIN'];

                const [classSubjectAverages] = await pool.query(`
                    SELECT 
                        g.student_id,
                        s.name as subject_name,
                        AVG(g.grade) as average
                    FROM grades g
                    JOIN bulletin_subjects s ON g.bulletin_subject_id = s.id
                    WHERE g.class_id = ? 
                    AND (g.semester = ? OR g.semester IS NULL)
                    AND g.school_year = ?
                    GROUP BY g.student_id, g.bulletin_subject_id, s.name
                `, [student.class_id, trimester, school_year]);

                const perStudentAverages = new Map();
                classSubjectAverages.forEach(row => {
                    const sid = row.student_id;
                    const name = (row.subject_name || '').toUpperCase();
                    if (targeted.some(t => name.includes(t))) {
                        const current = perStudentAverages.get(sid) || { total: 0, count: 0 };
                        // Utiliser la note brute telle qu'elle a été saisie
                        const rawScore = parseFloat(row.average) || 0;
                        current.total += rawScore;
                        current.count += 1;
                        perStudentAverages.set(sid, current);
                    }
                });

                const ranking = [];
                for (const [sid, val] of perStudentAverages.entries()) {
                    const avg = val.count > 0 ? val.total / 6 : 0;
                    ranking.push({ student_id: sid, general_average: avg });
                }

                ranking.sort((a, b) => b.general_average - a.general_average);

                if (ranking.length > 0) {
                    highest_average = parseFloat(Number(ranking[0].general_average).toFixed(2));
                    lowest_average = parseFloat(Number(ranking[ranking.length - 1].general_average).toFixed(2));
                    // Calculer la moyenne de la classe
                    const totalAvg = ranking.reduce((sum, r) => sum + r.general_average, 0);
                    class_average = parseFloat((totalAvg / ranking.length).toFixed(2));
                }
            } else if (isCM1 || isCM2) {
                // CM1/CM2: exclure certaines matières du total
                const excluded = ['LECTURE', 'ANGLAIS', 'EPS', 'E.P.S', 'CONDUITE'];

                const [classSubjectAverages] = await pool.query(`
                    SELECT 
                        g.student_id,
                        s.name as subject_name,
                        AVG(g.grade) as average
                    FROM grades g
                    JOIN bulletin_subjects s ON g.bulletin_subject_id = s.id
                    WHERE g.class_id = ? 
                    AND (g.semester = ? OR g.semester IS NULL)
                    AND g.school_year = ?
                    GROUP BY g.student_id, g.bulletin_subject_id, s.name
                `, [student.class_id, trimester, school_year]);

                const perStudentAverages = new Map();
                classSubjectAverages.forEach(row => {
                    const sid = row.student_id;
                    const name = (row.subject_name || '').toUpperCase();
                    if (!excluded.some(ex => name.includes(ex))) {
                        const current = perStudentAverages.get(sid) || { total: 0 };
                        current.total += parseFloat(row.average) || 0;
                        perStudentAverages.set(sid, current);
                    }
                });

                const ranking = [];
                for (const [sid, val] of perStudentAverages.entries()) {
                    const avg = isCM1 ? (val.total / 17) : (val.total / 8.5);
                    ranking.push({ student_id: sid, general_average: avg });
                }

                ranking.sort((a, b) => b.general_average - a.general_average);

                if (ranking.length > 0) {
                    highest_average = parseFloat(Number(ranking[0].general_average).toFixed(2));
                    lowest_average = parseFloat(Number(ranking[ranking.length - 1].general_average).toFixed(2));
                    // Calculer la moyenne de la classe
                    const totalAvg = ranking.reduce((sum, r) => sum + r.general_average, 0);
                    class_average = parseFloat((totalAvg / ranking.length).toFixed(2));
                }
            } else {
                // Pour les autres classes, utiliser la moyenne pondérée standard
                const [classAverages] = await pool.query(`
                    SELECT 
                        g.student_id,
                        AVG(g.grade * COALESCE(cs.coefficient, 1)) / AVG(COALESCE(cs.coefficient, 1)) as general_average
                    FROM grades g
                    LEFT JOIN class_subjects cs ON cs.class_id = g.class_id AND cs.subject_id = g.bulletin_subject_id
                    WHERE g.class_id = ? 
                    AND (g.semester = ? OR g.semester IS NULL)
                    AND g.school_year = ?
                    GROUP BY g.student_id
                    HAVING general_average IS NOT NULL
                    ORDER BY general_average DESC
                `, [student.class_id, trimester, school_year]);

                if (classAverages.length > 0) {
                    highest_average = parseFloat(Number(classAverages[0].general_average).toFixed(2));
                    lowest_average = parseFloat(Number(classAverages[classAverages.length - 1].general_average).toFixed(2));
                    // Calculer la moyenne de la classe
                    const totalAvg = classAverages.reduce((sum, r) => sum + r.general_average, 0);
                    class_average = parseFloat((totalAvg / classAverages.length).toFixed(2));
                }
            }
        }

        res.json({
            student_info: student,
            all_grades: allGrades,
            bulletin_grades: bulletinGrades,
            highest_average: highest_average,
            lowest_average: lowest_average,
            class_average: class_average,
            search_params: { studentId, trimester, school_year, composition_id }
        });

    } catch (error) {
        console.error('[DEBUG BULLETIN] Erreur:', error);
        res.status(500).json({ message: error.message });
    }
});

// Endpoint temporaire pour tester le bulletin sans authentification
app.get('/api/test/bulletin/:studentId', async(req, res) => {
    try {
        const pool = require('./config/database');
        const { studentId } = req.params;
        const { trimester = '1er trimestre', school_year = '2025-2026' } = req.query;

        console.log('[TEST BULLETIN] Paramètres:', { studentId, trimester, school_year });

        // 1. Vérifier l'inscription de l'élève
        const [studentInfo] = await pool.query(`
            SELECT 
                s.first_name, s.last_name, s.registration_number,
                c.id as class_id, c.name as class_name
            FROM students s
            JOIN enrollments e ON s.id = e.student_id AND e.status = 'active' AND e.school_year = ?
            JOIN classes c ON e.class_id = c.id
            WHERE s.id = ?
        `, [school_year, studentId]);

        if (studentInfo.length === 0) {
            console.log('[TEST BULLETIN] Aucune inscription trouvée');
            return res.status(404).json({ message: 'Élève non trouvé ou non inscrit pour cette année' });
        }

        const student = studentInfo[0];
        console.log('[TEST BULLETIN] Élève trouvé:', student);

        // 2. Vérifier la publication du bulletin
        const [publicationCheck] = await pool.query(`
            SELECT published 
            FROM report_card_publications 
            WHERE class_id = ? AND trimester = ? AND school_year = ?
        `, [student.class_id, trimester, school_year]);

        console.log('[TEST BULLETIN] Vérification publication:', publicationCheck);

        // Si pas de publication trouvée, on va créer une entrée temporaire
        if (publicationCheck.length === 0) {
            console.log('[TEST BULLETIN] Aucune publication trouvée, création temporaire...');
            await pool.query(`
                INSERT INTO report_card_publications (class_id, trimester, school_year, published, published_at)
                VALUES (?, ?, ?, 1, NOW())
                ON DUPLICATE KEY UPDATE published = 1, published_at = NOW()
            `, [student.class_id, trimester, school_year]);
        }

        // 3. Maintenant appeler la fonction du contrôleur
        req.user = { id: 1, role: 'admin' };
        req.params = { id: studentId };
        req.query = { trimester, school_year };

        const studentController = require('./controllers/studentController');
        await studentController.getStudentBulletin(req, res);

    } catch (error) {
        console.error('[TEST BULLETIN] Erreur:', error);
        res.status(500).json({ message: error.message });
    }
});

// Test simple de la requête SQL du bulletin
app.get('/api/test/bulletin-sql/:studentId', async(req, res) => {
    try {
        const pool = require('./config/database');
        const { studentId } = req.params;
        const { trimester = '1er trimestre', school_year = '2025-2026' } = req.query;

        // Récupérer directement les notes avec la nouvelle requête
        const [subjectGrades] = await pool.query(`
            SELECT 
                s.name as subject_name,
                g.bulletin_subject_id as subject_id,
                AVG(g.grade) as average,
                COALESCE(cs.coefficient, 1) as coefficient,
                AVG(g.grade) * COALESCE(cs.coefficient, 1) as weighted_average,
                COUNT(DISTINCT g.student_id) as total_students
            FROM grades g
            JOIN bulletin_subjects s ON g.bulletin_subject_id = s.id
            LEFT JOIN class_subjects cs ON cs.class_id = g.class_id AND cs.subject_id = g.bulletin_subject_id
            WHERE g.student_id = ? 
            AND g.class_id = 7
            AND (g.semester = ? OR g.semester IS NULL)
            AND g.school_year = ?
            GROUP BY g.bulletin_subject_id, s.name, cs.coefficient
            ORDER BY s.name
        `, [studentId, trimester, school_year]);

        console.log('[TEST SQL] Notes trouvées:', subjectGrades);

        res.json({
            student_id: studentId,
            class_id: 7,
            trimester,
            school_year,
            subjects_found: subjectGrades.length,
            subjects: subjectGrades
        });

    } catch (error) {
        console.error('[TEST SQL] Erreur:', error);
        res.status(500).json({ message: error.message, error: error.stack });
    }
});

// Publier automatiquement le bulletin pour une classe
app.post('/api/test/publish-bulletin', async(req, res) => {
    try {
        const pool = require('./config/database');
        const { class_id = 7, trimester = '1er trimestre', school_year = '2025-2026' } = req.body;

        await pool.query(`
            INSERT INTO report_card_publications (class_id, trimester, school_year, published, published_at)
            VALUES (?, ?, ?, 1, NOW())
            ON DUPLICATE KEY UPDATE published = 1, published_at = NOW()
        `, [class_id, trimester, school_year]);

        res.json({
            message: 'Bulletin publié avec succès',
            class_id,
            trimester,
            school_year
        });

    } catch (error) {
        console.error('[PUBLISH BULLETIN] Erreur:', error);
        res.status(500).json({ message: error.message });
    }
});

// Test exact de l'API bulletin comme le frontend l'appelle
app.get('/api/test/bulletin-frontend/:studentId', async(req, res) => {
    try {
        const pool = require('./config/database');
        const { studentId } = req.params;
        const { trimester = '1er trimestre', school_year = '2025-2026' } = req.query;

        console.log(`[FRONTEND TEST] === Début test bulletin élève ${studentId} ===`);
        console.log(`[FRONTEND TEST] Paramètres: trimester=${trimester}, school_year=${school_year}`);

        // Simuler un parent ou admin
        req.user = { id: 1, role: 'admin', email: 'test@test.com', parent_code: 'P860737' };
        req.params = { id: studentId };
        req.query = { trimester, school_year };

        // Appeler directement la fonction getStudentBulletin
        const studentController = require('./controllers/studentController');

        // Créer un wrapper pour capturer la réponse
        const originalJson = res.json;
        let responseData = null;
        res.json = function(data) {
            responseData = data;
            console.log(`[FRONTEND TEST] Réponse API:`, JSON.stringify(data, null, 2));
            console.log(`[FRONTEND TEST] Nombre de matières: ${data.subjects ? data.subjects.length : 'N/A'}`);
            if (data.subjects && data.subjects.length > 0) {
                console.log(`[FRONTEND TEST] Matières trouvées:`);
                data.subjects.forEach((subject, index) => {
                    console.log(`  ${index + 1}. ${subject.subject_name}: ${subject.average}/20`);
                });
            }
            return originalJson.call(this, data);
        };

        await studentController.getStudentBulletin(req, res);

    } catch (error) {
        console.error('[FRONTEND TEST] Erreur:', error);
        res.status(500).json({ message: error.message, stack: error.stack });
    }
});

// Test simple avec logs détaillés
app.get('/api/test/bulletin-simple/:studentId', async(req, res) => {
    try {
        const pool = require('./config/database');
        const { studentId } = req.params;
        const { trimester = '1er trimestre', school_year = '2025-2026' } = req.query;

        console.log(`[SIMPLE TEST] === Test bulletin élève ${studentId} ===`);

        // 1. Vérifier l'élève et sa classe
        const [studentInfo] = await pool.query(`
            SELECT 
                s.first_name, s.last_name, s.registration_number,
                c.id as class_id, c.name as class_name
            FROM students s
            JOIN enrollments e ON s.id = e.student_id AND e.status = 'active' AND e.school_year = ?
            JOIN classes c ON e.class_id = c.id
            WHERE s.id = ?
        `, [school_year, studentId]);

        if (studentInfo.length === 0) {
            console.log(`[SIMPLE TEST] Aucun élève trouvé pour ID ${studentId}`);
            return res.json({ error: 'Élève non trouvé', studentId, school_year });
        }

        const student = studentInfo[0];
        console.log(`[SIMPLE TEST] Élève trouvé:`, student);

        // 2. Vérifier la publication du bulletin
        const [publicationCheck] = await pool.query(`
            SELECT published 
            FROM report_card_publications 
            WHERE class_id = ? AND trimester = ? AND school_year = ?
        `, [student.class_id, trimester, school_year]);

        console.log(`[SIMPLE TEST] Publication check:`, publicationCheck);

        // 3. Récupérer les notes avec la requête corrigée
        const [subjectGrades] = await pool.query(`
            SELECT 
                s.name as subject_name,
                g.bulletin_subject_id as subject_id,
                g.semester,
                g.is_published,
                AVG(g.grade) as average,
                COALESCE(cs.coefficient, 1) as coefficient,
                AVG(g.grade) * COALESCE(cs.coefficient, 1) as weighted_average,
                COUNT(DISTINCT g.student_id) as total_students
            FROM grades g
            JOIN bulletin_subjects s ON g.bulletin_subject_id = s.id
            LEFT JOIN class_subjects cs ON cs.class_id = g.class_id AND cs.subject_id = g.bulletin_subject_id
            WHERE g.student_id = ? 
            AND g.class_id = ? 
            AND (g.semester = ? OR g.semester IS NULL)
            AND g.school_year = ?
            GROUP BY g.bulletin_subject_id, s.name, cs.coefficient
            ORDER BY s.name
        `, [studentId, student.class_id, trimester, school_year]);

        console.log(`[SIMPLE TEST] Notes trouvées: ${subjectGrades.length}`);
        console.log(`[SIMPLE TEST] Détail des notes:`, subjectGrades);

        res.json({
            student_info: student,
            publication_check: publicationCheck,
            subjects_found: subjectGrades.length,
            subjects: subjectGrades,
            debug_params: { studentId, trimester, school_year }
        });

    } catch (error) {
        console.error('[SIMPLE TEST] Erreur:', error);
        res.status(500).json({
            error: error.message,
            stack: error.stack,
            studentId: req.params.studentId
        });
    }
});

// Endpoint temporaire pour tester le bulletin sans authentification (format exact de l'API)
app.get('/api/test/bulletin-noauth/:studentId', async(req, res) => {
    try {
        const pool = require('./config/database');
        const { studentId } = req.params;
        const { trimester = '1er trimestre', school_year = '2025-2026' } = req.query;

        console.log(`[NO AUTH TEST] Test bulletin pour élève ${studentId}`);

        // 1. Récupérer les informations de l'élève et de sa classe
        const [studentInfo] = await pool.query(`
            SELECT 
                s.first_name,
                s.last_name,
                s.registration_number,
                c.id as class_id,
                c.name as class_name
            FROM students s
            JOIN enrollments e ON s.id = e.student_id AND e.status = 'active' AND e.school_year = ?
            JOIN classes c ON e.class_id = c.id
            WHERE s.id = ?
        `, [school_year, studentId]);

        if (studentInfo.length === 0) {
            return res.status(404).json({ message: 'Élève non trouvé ou non inscrit pour cette année' });
        }

        const student = studentInfo[0];

        // 2. Récupérer les notes par matière pour ce trimestre
        const [subjectGrades] = await pool.query(`
            SELECT 
                s.name as subject_name,
                g.bulletin_subject_id as subject_id,
                AVG(g.grade) as average,
                COALESCE(cs.coefficient, 1) as coefficient,
                AVG(g.grade) * COALESCE(cs.coefficient, 1) as weighted_average,
                COUNT(DISTINCT g.student_id) as total_students
            FROM grades g
            JOIN bulletin_subjects s ON g.bulletin_subject_id = s.id
            LEFT JOIN class_subjects cs ON cs.class_id = g.class_id AND cs.subject_id = g.bulletin_subject_id
            WHERE g.student_id = ? 
            AND g.class_id = ? 
            AND (g.semester = ? OR g.semester IS NULL)
            AND g.school_year = ?
            GROUP BY g.bulletin_subject_id, s.name, cs.coefficient
            ORDER BY s.name
        `, [studentId, student.class_id, trimester, school_year]);

        console.log(`[NO AUTH TEST] ${subjectGrades.length} matières trouvées`);

        // 3. Calculer le rang pour chaque matière et ajouter le nom du professeur
        const subjectsWithRanks = [];
        for (const subject of subjectGrades) {
            // Rang pour cette matière
            const [classRanking] = await pool.query(`
                SELECT 
                    g.student_id,
                    AVG(g.grade) as average
                FROM grades g
                WHERE g.class_id = ? 
                AND g.bulletin_subject_id = ?
                AND (g.semester = ? OR g.semester IS NULL)
                AND g.school_year = ?
                GROUP BY g.student_id
                ORDER BY average DESC
            `, [student.class_id, subject.bulletin_subject_id, trimester, school_year]);

            const rank = classRanking.findIndex(r => r.student_id === Number(studentId)) + 1;

            // Nom du professeur
            const [teacherInfo] = await pool.query(`
                SELECT COALESCE(CONCAT(t.first_name, ' ', t.last_name), 'Non assigné') as teacher_name
                FROM schedules sch
                LEFT JOIN teachers t ON sch.teacher_id = t.id
                WHERE sch.class_id = ? 
                AND sch.bulletin_subject_id = ? 
                AND sch.school_year = ?
                LIMIT 1
            `, [student.class_id, subject.bulletin_subject_id, school_year]);

            const teacher_name = teacherInfo.length > 0 ? teacherInfo[0].teacher_name : 'Non assigné';

            subjectsWithRanks.push({
                subject_name: subject.subject_name,
                average: parseFloat(subject.average) || 0,
                coefficient: parseInt(subject.coefficient) || 1,
                weighted_average: parseFloat(subject.weighted_average) || 0,
                rank: rank || classRanking.length,
                total_students: classRanking.length,
                teacher_name: teacher_name
            });
        }

        // 4. Calculer la moyenne générale
        let totalWeightedSum = 0;
        let totalCoefficients = 0;

        subjectsWithRanks.forEach(subject => {
            totalWeightedSum += subject.average * subject.coefficient;
            totalCoefficients += subject.coefficient;
        });

        const generalAverage = totalCoefficients > 0 ? totalWeightedSum / totalCoefficients : 0;

        // 5. Calculer le rang général dans la classe
        const [generalRanking] = await pool.query(`
            SELECT 
                g.student_id,
                SUM(AVG(g.grade) * COALESCE(cs.coefficient, 1)) / SUM(COALESCE(cs.coefficient, 1)) as general_average
            FROM grades g
            LEFT JOIN class_subjects cs ON cs.class_id = g.class_id AND cs.subject_id = g.bulletin_subject_id
            WHERE g.class_id = ? 
            AND (g.semester = ? OR g.semester IS NULL)
            AND g.school_year = ?
            GROUP BY g.student_id
            HAVING general_average IS NOT NULL
            ORDER BY general_average DESC
        `, [student.class_id, trimester, school_year]);

        const generalRank = generalRanking.findIndex(r => r.student_id === Number(studentId)) + 1;

        const bulletinData = {
            student_info: {
                first_name: student.first_name,
                last_name: student.last_name,
                class_name: student.class_name,
                registration_number: student.registration_number
            },
            trimester: trimester,
            school_year: school_year,
            subjects: subjectsWithRanks,
            general_average: parseFloat(Number(generalAverage).toFixed(2)),
            general_rank: generalRank || generalRanking.length,
            total_class_students: generalRanking.length,
            published: true
        };

        console.log(`[NO AUTH TEST] Réponse finale - ${bulletinData.subjects.length} matières`);
        res.json(bulletinData);

    } catch (error) {
        console.error('[NO AUTH TEST] Erreur:', error);
        res.status(500).json({ message: 'Erreur lors de la génération du bulletin' });
    }
});

// Test de l'API grades utilisée par StudentBulletin
app.get('/api/test/student-grades/:studentId', async(req, res) => {
    try {
        const { studentId } = req.params;
        const { school_year = '2025-2026' } = req.query;

        // Simuler un utilisateur admin
        req.user = { id: 1, role: 'admin' };
        req.params = { id: studentId };
        req.query = { school_year };

        console.log(`[TEST GRADES] Test pour élève ${studentId}, année ${school_year}`);

        const studentController = require('./controllers/studentController');
        await studentController.getStudentGrades(req, res);

    } catch (error) {
        console.error('[TEST GRADES] Erreur:', error);
        res.status(500).json({ message: error.message });
    }
});

// Endpoint temporaire pour StudentBulletin sans authentification (utilise la vraie logique)
app.get('/api/test/student-bulletin-grades/:studentId', async(req, res) => {
    try {
        const { studentId } = req.params;
        const { school_year = '2025-2026' } = req.query;

        console.log(`[BULLETIN GRADES] Test pour élève ${studentId}, année ${school_year}`);

        // Simuler un utilisateur admin et appeler la vraie fonction
        req.user = { id: 1, role: 'admin' };
        req.params = { id: studentId };
        req.query = { school_year };

        const studentController = require('./controllers/studentController');
        await studentController.getStudentGrades(req, res);

    } catch (error) {
        console.error('[BULLETIN GRADES] Erreur:', error);
        res.status(500).json({ message: error.message });
    }
});

// Gestion des erreurs 404
app.use('*', (req, res) => {
    res.status(404).json({ message: 'Route non trouvée' });
});

// Gestion globale des erreurs
app.use((err, req, res, next) => {
    console.error('Erreur serveur:', err);
    
    // Gérer spécifiquement les erreurs CORS
    if (err.message === 'Not allowed by CORS' || err.message.includes('CORS')) {
        const origin = req.headers.origin || 'unknown';
        console.error(`[CORS] Erreur CORS capturée dans le middleware global pour: ${origin}`);
        const allowedDomains = allowedOrigins.map(o => {
            const domain = o.replace(/^https?:\/\//, '').replace(/^www\./, '');
            return domain;
        });
        allowedDomains.push(PRODUCTION_DOMAIN); // Ajouter le domaine de production
        return res.status(403).json({
            message: 'CORS Error: Origin not allowed',
            origin: origin,
            allowedOrigins: [...new Set(allowedDomains)], // Supprimer les doublons
            productionDomain: PRODUCTION_DOMAIN
        });
    }
    
    res.status(500).json({
        message: 'Erreur interne du serveur',
        error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
    console.log(`Serveur démarré sur le port ${PORT}`);
    console.log(`Mode: ${process.env.NODE_ENV || 'development'}`);
});