/**
 * BULLETIN CONTROLLER
 * 
 * Ce fichier gère toutes les opérations liées aux bulletins scolaires.
 * Fonctions disponibles:
 * - getBulletinPublicationStatus: Récupère le statut de publication des bulletins
 * - publishBulletin: Publie un bulletin pour une classe
 * - unpublishBulletin: Dépublie un bulletin
 * - getClassStudentsWithBulletins: Récupère les élèves avec leurs bulletins
 * 
 * ⚠️ ATTENTION: Ce fichier NE DOIT PAS contenir de fonctions de studentController (getAllStudents, getStudentById, etc.)
 */

const pool = require('../config/database');

const bulletinController = {
    // Récupérer le statut de publication des bulletins pour une classe
    getBulletinPublicationStatus: async(req, res) => {
        try {
            const { classId } = req.params;
            const { school_year = '2025-2026' } = req.query;

            console.log('[BULLETIN CONTROLLER] getBulletinPublicationStatus:', { classId, school_year });

            // Récupérer les informations de la classe
            const [classInfo] = await pool.query(`
        SELECT c.id, c.name as class_name, el.name as level_name
        FROM classes c
        JOIN education_levels el ON c.education_level_id = el.id
        WHERE c.id = ?
      `, [classId]);

            if (classInfo.length === 0) {
                return res.status(404).json({ message: 'Classe non trouvée' });
            }

            // Récupérer le statut de publication pour chaque composition uniquement
            const publicationStatus = [];

            // Récupérer l'ID du niveau d'éducation de la classe
            const [classLevelInfo] = await pool.query(`
                SELECT c.education_level_id, el.name as level_name, el.is_active as level_is_active
                FROM classes c
                JOIN education_levels el ON c.education_level_id = el.id
                WHERE c.id = ?
            `, [classId]);

            const classEducationLevelId = classLevelInfo.length > 0 ? classLevelInfo[0].education_level_id : null;
            const isActiveLevel = classLevelInfo.length > 0 && classLevelInfo[0].level_is_active === 1;

            // Statut des bulletins par composition
            // Stratégie: Pour toutes les classes de niveaux actifs, récupérer TOUTES les compositions actives de l'année,
            // même si elles ne sont pas encore associées dans composition_classes
            // Cela garantit que toutes les compositions sont visibles pour toutes les classes
            let compositions = [];

            if (isActiveLevel && classEducationLevelId) {
                // Pour toutes les classes de niveaux actifs: récupérer toutes les compositions actives de l'année
                // et vérifier si elles sont associées (ou les associer automatiquement si nécessaire)
                const [allCompositions] = await pool.query(`
                    SELECT DISTINCT c.id, c.name, c.composition_date, c.is_active
                    FROM compositions c
                    WHERE c.school_year = ?
                      AND c.is_active = 1
                    ORDER BY c.composition_date DESC
                `, [school_year]);

                console.log(`[BULLETIN CONTROLLER] ${allCompositions.length} composition(s) active(s) trouvée(s) pour l'année ${school_year}`);

                // Pour chaque composition, vérifier si elle est associée à cette classe
                // Si non, l'associer automatiquement
                for (const comp of allCompositions) {
                    const [association] = await pool.query(`
                        SELECT id, is_enabled FROM composition_classes 
                        WHERE composition_id = ? AND class_id = ?
                    `, [comp.id, classId]);

                    if (association.length === 0) {
                        // Association manquante: créer l'association automatiquement
                        try {
                            await pool.query(`
                                INSERT INTO composition_classes (composition_id, class_id, is_enabled)
                                VALUES (?, ?, 1)
                            `, [comp.id, classId]);
                            console.log(`[BULLETIN CONTROLLER] ✅ Composition "${comp.name}" automatiquement associée à la classe ${classId}`);
                        } catch (assocError) {
                            console.error(`[BULLETIN CONTROLLER] ⚠️ Erreur lors de l'association automatique:`, assocError);
                        }
                    } else if (association[0].is_enabled === 0) {
                        // Association existe mais désactivée: activer
                        try {
                            await pool.query(`
                                UPDATE composition_classes 
                                SET is_enabled = 1 
                                WHERE composition_id = ? AND class_id = ?
                            `, [comp.id, classId]);
                            console.log(`[BULLETIN CONTROLLER] ✅ Association de la composition "${comp.name}" activée pour la classe ${classId}`);
                        } catch (assocError) {
                            console.error(`[BULLETIN CONTROLLER] ⚠️ Erreur lors de l'activation:`, assocError);
                        }
                    }

                    // Ajouter la composition à la liste (si associée et activée)
                    const [finalAssociation] = await pool.query(`
                        SELECT id FROM composition_classes 
                        WHERE composition_id = ? AND class_id = ? AND is_enabled = 1
                    `, [comp.id, classId]);

                    if (finalAssociation.length > 0) {
                        compositions.push({
                            id: comp.id,
                            name: comp.name,
                            composition_date: comp.composition_date
                        });
                    }
                }
            } else {
                // Pour les classes de niveaux inactifs ou non trouvés: utiliser la méthode classique
                const [associatedCompositions] = await pool.query(`
                    SELECT DISTINCT c.id, c.name, c.composition_date
                    FROM compositions c
                    JOIN composition_classes cc ON c.id = cc.composition_id
                    WHERE cc.class_id = ? 
                      AND c.school_year = ?
                      AND c.is_active = 1
                      AND cc.is_enabled = 1
                    ORDER BY c.composition_date DESC
                `, [classId, school_year]);
                compositions = associatedCompositions;
                console.log(`[BULLETIN CONTROLLER] ${compositions.length} composition(s) associée(s) directement pour la classe ${classId}`);
            }

            console.log(`[BULLETIN CONTROLLER] ${compositions.length} composition(s) disponible(s) pour la classe ${classId}, année ${school_year}`);

            for (const composition of compositions) {
                const [status] = await pool.query(`
          SELECT published, published_at, published_by
          FROM report_card_publications 
          WHERE class_id = ? AND composition_id = ? AND school_year = ?
        `, [classId, composition.id, school_year]);

                publicationStatus.push({
                    type: 'composition',
                    period: composition.name,
                    composition_id: composition.id,
                    composition_date: composition.composition_date,
                    published: status.length > 0 ? status[0].published : false,
                    published_at: status.length > 0 ? status[0].published_at : null,
                    published_by: status.length > 0 ? status[0].published_by : null
                });
            }

            res.json({
                class: classInfo[0],
                publications: publicationStatus
            });

        } catch (error) {
            console.error('Erreur lors de la récupération du statut de publication:', error);
            res.status(500).json({ message: 'Erreur serveur' });
        }
    },

    // Publier un bulletin pour une classe (trimestre ou composition)
    publishBulletin: async(req, res) => {
        let connection;
        try {
            const { classId } = req.params;
            const { type, period, composition_id, school_year = '2025-2026' } = req.body;
            const userId = req.user.id;

            console.log('[BULLETIN CONTROLLER] publishBulletin:', { classId, type, period, composition_id, school_year, userId });

            // Vérifier que la classe existe
            const [classInfo] = await pool.query(`
        SELECT id, name FROM classes WHERE id = ?
      `, [classId]);

            if (classInfo.length === 0) {
                return res.status(404).json({ message: 'Classe non trouvée' });
            }

            // Publication par composition uniquement
            if (type !== 'composition') {
                return res.status(400).json({ message: 'Seule la publication par composition est supportée' });
            }

            // Récupérer les informations de la composition
            const [compositionInfo] = await pool.query(`
        SELECT id, name, composition_date FROM compositions WHERE id = ?
      `, [composition_id]);

            if (compositionInfo.length === 0) {
                return res.status(404).json({ message: 'Composition non trouvée' });
            }

            const compositionName = compositionInfo[0].name;

            // Démarrer une transaction
            connection = await pool.getConnection();
            await connection.beginTransaction();

            // Publier le bulletin
            const query = `
        INSERT INTO report_card_publications (class_id, composition_id, school_year, published, published_at, published_by)
        VALUES (?, ?, ?, 1, NOW(), ?)
        ON DUPLICATE KEY UPDATE 
          published = 1, 
          published_at = NOW(), 
          published_by = ?
      `;
            const params = [classId, composition_id, school_year, userId, userId];

            await connection.query(query, params);

            // Récupérer tous les parents des élèves de cette classe (tous les élèves inscrits, peu importe le statut)
            const [parents] = await connection.query(`
                SELECT DISTINCT u.id as user_id, s.id as student_id, s.first_name, s.last_name
                FROM users u 
                JOIN students s ON u.email = s.parent_email
                JOIN enrollments e ON s.id = e.student_id
                WHERE e.class_id = ? 
                AND e.school_year = ?
                AND u.role = 'parent'
                AND s.parent_email IS NOT NULL 
                AND s.parent_email != ''
            `, [classId, school_year]);

            console.log(`[BULLETIN CONTROLLER] ${parents.length} parent(s) trouvé(s) pour la classe ${classId}`);

            // Créer une notification pour chaque parent
            if (parents.length > 0) {
                const notificationTitle = `Nouveau bulletin disponible - ${compositionName}`;
                const notificationMessage = `Le bulletin de la composition "${compositionName}" pour la classe ${classInfo[0].name} est maintenant disponible. Vous pouvez le consulter dans votre espace parent.`;

                // Créer la notification
                const [notificationResult] = await connection.query(
                    'INSERT INTO notifications (title, message, type, class_id, sender_id, event_date) VALUES (?, ?, ?, ?, ?, NOW())', [notificationTitle, notificationMessage, 'class', classId, userId]
                );
                const notificationId = notificationResult.insertId;

                // Lier la notification à tous les parents avec le student_id pour référence
                const userNotificationValues = parents.map(parent => [parent.user_id, notificationId]);
                await connection.query(
                    'INSERT INTO user_notifications (user_id, notification_id) VALUES ?', [userNotificationValues]
                );

                console.log(`[BULLETIN CONTROLLER] ${parents.length} notification(s) créée(s) pour les parents`);

                // Optionnel : Créer une notification privée pour chaque parent avec le student_id
                const privateNotificationPromises = parents.map(async(parent) => {
                    const privateTitle = `Bulletin disponible pour ${parent.first_name} ${parent.last_name}`;
                    const privateMessage = `Le bulletin de la composition "${compositionName}" de votre enfant ${parent.first_name} ${parent.last_name} est maintenant disponible dans votre espace parent.`;

                    const [privateNotifResult] = await connection.query(
                        'INSERT INTO notifications (title, message, type, student_id, class_id, sender_id, event_date) VALUES (?, ?, ?, ?, ?, ?, NOW())', [privateTitle, privateMessage, 'private', parent.student_id, classId, userId]
                    );

                    await connection.query(
                        'INSERT INTO user_notifications (user_id, notification_id) VALUES (?, ?)', [parent.user_id, privateNotifResult.insertId]
                    );
                });

                await Promise.all(privateNotificationPromises);
                console.log(`[BULLETIN CONTROLLER] ${parents.length} notification(s) privée(s) créée(s)`);
            }

            await connection.commit();

            res.json({
                message: 'Bulletin publié avec succès',
                class_id: classId,
                type,
                composition_id,
                school_year,
                notifications_sent: parents.length
            });

        } catch (error) {
            console.error('Erreur lors de la publication du bulletin:', error);
            if (connection) {
                await connection.rollback();
            }
            res.status(500).json({ message: 'Erreur serveur' });
        } finally {
            if (connection) {
                connection.release();
            }
        }
    },

    // Dépublier un bulletin pour une classe (trimestre ou composition)
    unpublishBulletin: async(req, res) => {
        try {
            const { classId } = req.params;
            const { type, period, composition_id, school_year = '2025-2026' } = req.body;

            console.log('[BULLETIN CONTROLLER] unpublishBulletin:', { classId, type, period, composition_id, school_year });

            // Dépublication par composition uniquement
            if (type !== 'composition') {
                return res.status(400).json({ message: 'Seule la dépublication par composition est supportée' });
            }

            const query = `
        UPDATE report_card_publications 
        SET published = 0, published_at = NULL, published_by = NULL
        WHERE class_id = ? AND composition_id = ? AND school_year = ?
      `;
            const params = [classId, composition_id, school_year];

            const [result] = await pool.query(query, params);

            if (result.affectedRows === 0) {
                return res.status(404).json({ message: 'Publication non trouvée' });
            }

            res.json({
                message: 'Bulletin dépublié avec succès',
                class_id: classId,
                type,
                composition_id,
                school_year
            });

        } catch (error) {
            console.error('Erreur lors de la dépublication du bulletin:', error);
            res.status(500).json({ message: 'Erreur serveur' });
        }
    },

    // Récupérer les élèves d'une classe avec leurs bulletins
    getClassStudentsWithBulletins: async(req, res) => {
        let connection;
        try {
            const { classId } = req.params;
            const { school_year = '2025-2026' } = req.query;

            console.log('[BULLETIN CONTROLLER] getClassStudentsWithBulletins:', { classId, school_year });

            // APPROCHE ROBUSTE: Utiliser une transaction pour activer TOUS les élèves inactifs
            connection = await pool.getConnection();
            await connection.beginTransaction();

            try {
                // Étape 1a: Mettre à jour les élèves avec NULL school_year vers l'année courante
                const [updateYearResult] = await connection.query(`
                    UPDATE enrollments 
                    SET school_year = ?
                    WHERE class_id = ? 
                    AND school_year IS NULL
                    AND student_id IS NOT NULL
                `, [school_year, classId]);

                const updatedYearCount = updateYearResult.affectedRows || 0;
                if (updatedYearCount > 0) {
                    console.log(`[BULLETIN CONTROLLER] ✅ ${updatedYearCount} élève(s) mis à jour avec school_year=${school_year} pour la classe ${classId}`);
                }

                // Étape 1b: Activer TOUS les élèves inactifs ou sans statut pour cette classe et année
                // Utiliser une requête UPDATE directe plus efficace
                const [updateResult] = await connection.query(`
                    UPDATE enrollments 
                    SET status = 'active' 
                    WHERE class_id = ? 
                    AND school_year = ?
                    AND student_id IS NOT NULL
                    AND (status != 'active' OR status IS NULL)
                `, [classId, school_year]);

                const activatedCount = updateResult.affectedRows || 0;
                if (activatedCount > 0) {
                    console.log(`[BULLETIN CONTROLLER] ✅ ${activatedCount} élève(s) activé(s) automatiquement pour la classe ${classId}, année ${school_year}`);
                }

                await connection.commit();
            } catch (activationError) {
                await connection.rollback();
                console.error('⚠️ [BULLETIN CONTROLLER] Erreur lors de l\'activation des élèves:', activationError);
                // Continuer quand même pour récupérer les élèves
            } finally {
                if (connection) {
                    connection.release();
                }
            }

            // DIAGNOSTIC: Vérifier d'abord combien d'enrollments existent avec différentes school_year
            const [diagnosticCount] = await pool.query(`
                SELECT 
                    school_year,
                    COUNT(DISTINCT student_id) as count,
                    COUNT(*) as total_enrollments,
                    GROUP_CONCAT(DISTINCT status) as statuses
                FROM enrollments
                WHERE class_id = ? AND student_id IS NOT NULL
                GROUP BY school_year
            `, [classId]);

            console.log(`[BULLETIN CONTROLLER] 🔍 DIAGNOSTIC - Enrollments par année scolaire pour la classe ${classId}:`, diagnosticCount);

            // Étape 2: Récupérer TOUS les élèves avec LEFT JOIN pour être sûr de ne perdre aucun élève
            // APPROCHE ROBUSTE: Utiliser LEFT JOIN au lieu de JOIN pour inclure TOUS les élèves
            // même si certaines jointures échouent (ex: élève supprimé mais toujours dans enrollments)
            // On inclut aussi les élèves avec NULL school_year au cas où un script les aurait ajoutés
            // ET aussi ceux avec une autre school_year pour les mettre à jour automatiquement
            const [studentsAllYears] = await pool.query(`
                SELECT DISTINCT
                  s.id,
                  COALESCE(s.first_name, 'N/A') as first_name,
                  COALESCE(s.last_name, 'N/A') as last_name,
                  s.registration_number,
                  s.gender,
                  s.date_of_birth,
                  COALESCE(c.name, 'N/A') as class_name,
                  COALESCE(el.name, 'N/A') as level_name,
                  e.status as enrollment_status,
                  e.school_year as enrollment_school_year
                FROM enrollments e
                LEFT JOIN students s ON e.student_id = s.id
                LEFT JOIN classes c ON e.class_id = c.id
                LEFT JOIN education_levels el ON c.education_level_id = el.id
                WHERE e.class_id = ? 
                  AND e.student_id IS NOT NULL
                ORDER BY COALESCE(s.last_name, ''), COALESCE(s.first_name, '')
            `, [classId]);

            console.log(`[BULLETIN CONTROLLER] 📊 Total élèves TOUTES années confondues: ${studentsAllYears.length}`);

            // Maintenant filtrer pour l'année demandée
            let students = studentsAllYears.filter(s =>
                !s.enrollment_school_year ||
                s.enrollment_school_year === school_year
            );

            // Si on a trouvé des élèves avec une autre année scolaire, les mettre à jour automatiquement
            const studentsWrongYear = studentsAllYears.filter(s =>
                s.enrollment_school_year &&
                s.enrollment_school_year !== school_year &&
                s.enrollment_school_year !== null
            );

            if (studentsWrongYear.length > 0) {
                console.log(`[BULLETIN CONTROLLER] ⚠️ ${studentsWrongYear.length} élève(s) trouvé(s) avec une autre année scolaire. Mise à jour automatique...`);
                console.log(`[BULLETIN CONTROLLER] Années trouvées:`, studentsWrongYear.map(s => ({
                    student_id: s.id,
                    school_year: s.enrollment_school_year
                })));

                // Mettre à jour TOUS les enrollments de cette classe qui ont une autre année scolaire
                try {
                    const [updateYearResult2] = await pool.query(`
                        UPDATE enrollments 
                        SET school_year = ?
                        WHERE class_id = ? 
                        AND school_year != ?
                        AND school_year IS NOT NULL
                        AND student_id IS NOT NULL
                    `, [school_year, classId, school_year]);

                    console.log(`[BULLETIN CONTROLLER] ✅ ${updateYearResult2.affectedRows} enrollment(s) mis à jour avec school_year=${school_year}`);

                    // Recharger les élèves après la mise à jour
                    const [studentsAfterUpdate] = await pool.query(`
                        SELECT DISTINCT
                          s.id,
                          COALESCE(s.first_name, 'N/A') as first_name,
                          COALESCE(s.last_name, 'N/A') as last_name,
                          s.registration_number,
                          s.gender,
                          s.date_of_birth,
                          COALESCE(c.name, 'N/A') as class_name,
                          COALESCE(el.name, 'N/A') as level_name,
                          e.status as enrollment_status,
                          e.school_year as enrollment_school_year
                        FROM enrollments e
                        LEFT JOIN students s ON e.student_id = s.id
                        LEFT JOIN classes c ON e.class_id = c.id
                        LEFT JOIN education_levels el ON c.education_level_id = el.id
                        WHERE e.class_id = ? 
                          AND e.student_id IS NOT NULL
                          AND (e.school_year = ? OR e.school_year IS NULL)
                        ORDER BY COALESCE(s.last_name, ''), COALESCE(s.first_name, '')
                    `, [classId, school_year]);

                    students = studentsAfterUpdate;
                } catch (updateError) {
                    console.error('[BULLETIN CONTROLLER] Erreur lors de la mise à jour des années scolaires:', updateError);
                }
            }

            console.log(`[BULLETIN CONTROLLER] Nombre d'élèves récupérés: ${students.length} pour la classe ${classId}, année ${school_year}`);

            // Vérification: Compter tous les élèves dans enrollments pour cette classe
            // Inclure aussi ceux avec NULL school_year
            const [countResult] = await pool.query(`
                SELECT COUNT(DISTINCT student_id) as total_count
                FROM enrollments
                WHERE class_id = ? 
                  AND student_id IS NOT NULL
                  AND (school_year = ? OR school_year IS NULL)
            `, [classId, school_year]);

            // Compter aussi TOUS les élèves de la classe (toutes années confondues) pour diagnostic
            const [allYearsCount] = await pool.query(`
                SELECT COUNT(DISTINCT student_id) as total_count_all_years
                FROM enrollments
                WHERE class_id = ? AND student_id IS NOT NULL
            `, [classId]);

            console.log(`[BULLETIN CONTROLLER] Total pour ${school_year}: ${countResult[0]?.total_count || 0}, Total toutes années: ${allYearsCount[0]?.total_count_all_years || 0}`);

            const totalEnrolled = (countResult[0] && countResult[0].total_count) || 0;
            console.log(`[BULLETIN CONTROLLER] Total dans enrollments: ${totalEnrolled}, élèves retournés: ${students.length}`);

            // Si le nombre ne correspond toujours pas, essayer une dernière fois de récupérer tous les IDs
            if (totalEnrolled !== students.length) {
                console.warn(`[BULLETIN CONTROLLER] ⚠️ ATTENTION: ${totalEnrolled} élèves dans enrollments mais seulement ${students.length} retournés.`);

                // Dernière tentative: Récupérer uniquement les IDs pour voir ce qui manque
                const [missingStudents] = await pool.query(`
                    SELECT e.student_id, e.status
                    FROM enrollments e
                    WHERE e.class_id = ? 
                    AND e.school_year = ?
                    AND e.student_id IS NOT NULL
                    AND e.student_id NOT IN (
                        SELECT DISTINCT e2.student_id 
                        FROM enrollments e2
                        LEFT JOIN students s2 ON e2.student_id = s2.id
                        WHERE e2.class_id = ? 
                        AND e2.school_year = ?
                        AND s2.id IS NOT NULL
                    )
                `, [classId, school_year, classId, school_year]);

                if (missingStudents.length > 0) {
                    console.warn(`[BULLETIN CONTROLLER] ⚠️ ${missingStudents.length} élève(s) manquant(s):`, missingStudents);
                }
            }

            res.json({
                students,
                class_id: classId,
                school_year,
                total_count: students.length,
                total_in_enrollments: totalEnrolled
            });

        } catch (error) {
            console.error('Erreur lors de la récupération des élèves:', error);
            res.status(500).json({ message: 'Erreur serveur', error: error.message });
        }
    }
};

module.exports = bulletinController;