const cron = require('node-cron');
const pool = require('../config/database');

/**
 * Fonction pour nettoyer les emplois du temps expirés
 */
async function cleanupExpiredSchedules() {
    try {
        console.log('🧹 Début du nettoyage automatique des emplois du temps expirés...');

        // Supprimer les emplois du temps expirés (plus de 30 jours)
        const [result] = await pool.execute(`
            DELETE FROM schedules 
            WHERE end_date < DATE_SUB(NOW(), INTERVAL 30 DAY)
        `);

        if (result.affectedRows > 0) {
            console.log(`✅ ${result.affectedRows} emploi(s) du temps expiré(s) supprimé(s)`);
        } else {
            console.log('ℹ️  Aucun emploi du temps expiré à supprimer');
        }

    } catch (error) {
        console.error('❌ Erreur lors du nettoyage automatique:', error.message);
    }
}

/**
 * Fonction pour nettoyer les événements expirés
 */
async function cleanupExpiredEvents() {
    try {
        console.log('🧹 Début du nettoyage automatique des événements expirés...');

        // Supprimer les événements expirés (plus de 7 jours)
        const [result] = await pool.execute(`
            DELETE FROM events 
            WHERE event_date < DATE_SUB(NOW(), INTERVAL 7 DAY)
        `);

        if (result.affectedRows > 0) {
            console.log(`✅ ${result.affectedRows} événement(s) expiré(s) supprimé(s)`);
        } else {
            console.log('ℹ️  Aucun événement expiré à supprimer');
        }

    } catch (error) {
        console.error('❌ Erreur lors du nettoyage automatique des événements:', error.message);
    }
}

/**
 * Fonction pour nettoyer les notifications anciennes
 */
async function cleanupOldNotifications() {
    try {
        console.log('🧹 Début du nettoyage automatique des notifications anciennes...');

        // Supprimer les notifications de plus de 90 jours
        const [result] = await pool.execute(`
            DELETE FROM notifications 
            WHERE created_at < DATE_SUB(NOW(), INTERVAL 90 DAY)
        `);

        if (result.affectedRows > 0) {
            console.log(`✅ ${result.affectedRows} notification(s) ancienne(s) supprimée(s)`);
        } else {
            console.log('ℹ️  Aucune notification ancienne à supprimer');
        }

    } catch (error) {
        console.error('❌ Erreur lors du nettoyage automatique des notifications:', error.message);
    }
}

/**
 * Fonction pour nettoyer les fichiers temporaires
 */
async function cleanupTempFiles() {
    try {
        console.log('🧹 Début du nettoyage automatique des fichiers temporaires...');

        const fs = require('fs');
        const path = require('path');

        // Dossiers à nettoyer
        const tempDirs = [
            path.join(__dirname, '../uploads/temp'),
            path.join(__dirname, '../protected_uploads/temp')
        ];

        for (const dir of tempDirs) {
            if (fs.existsSync(dir)) {
                const files = fs.readdirSync(dir);
                let deletedCount = 0;

                for (const file of files) {
                    const filePath = path.join(dir, file);
                    const stats = fs.statSync(filePath);

                    // Supprimer les fichiers de plus de 24h
                    if (Date.now() - stats.mtime.getTime() > 24 * 60 * 60 * 1000) {
                        fs.unlinkSync(filePath);
                        deletedCount++;
                    }
                }

                if (deletedCount > 0) {
                    console.log(`✅ ${deletedCount} fichier(s) temporaire(s) supprimé(s) de ${dir}`);
                }
            }
        }

    } catch (error) {
        console.error('❌ Erreur lors du nettoyage automatique des fichiers:', error.message);
    }
}

/**
 * Fonction principale pour démarrer tous les cron jobs
 */
function startCleanupCronJob() {
    try {
        console.log('🚀 Configuration des tâches cron de nettoyage automatique...');

        // Nettoyage des emplois du temps expirés - tous les jours à 2h du matin
        cron.schedule('0 2 * * *', cleanupExpiredSchedules, {
            scheduled: true,
            timezone: "Africa/Abidjan"
        });
        console.log('✅ Cron job pour emplois du temps configuré (tous les jours à 2h)');

        // Nettoyage des événements expirés - tous les lundis à 3h du matin
        cron.schedule('0 3 * * 1', cleanupExpiredEvents, {
            scheduled: true,
            timezone: "Africa/Abidjan"
        });
        console.log('✅ Cron job pour événements configuré (tous les lundis à 3h)');

        // Nettoyage des notifications anciennes - tous les dimanches à 4h du matin
        cron.schedule('0 4 * * 0', cleanupOldNotifications, {
            scheduled: true,
            timezone: "Africa/Abidjan"
        });
        console.log('✅ Cron job pour notifications configuré (tous les dimanches à 4h)');

        // Nettoyage des fichiers temporaires - toutes les heures
        cron.schedule('0 * * * *', cleanupTempFiles, {
            scheduled: true,
            timezone: "Africa/Abidjan"
        });
        console.log('✅ Cron job pour fichiers temporaires configuré (toutes les heures)');

        console.log('🎉 Tous les cron jobs de nettoyage automatique sont configurés et actifs');

    } catch (error) {
        console.error('❌ Erreur lors de la configuration des cron jobs:', error.message);
    }
}

/**
 * Fonction pour arrêter tous les cron jobs
 */
function stopCleanupCronJob() {
    try {
        console.log('🛑 Arrêt des tâches cron de nettoyage automatique...');

        // Arrêter tous les cron jobs
        cron.getTasks().forEach((task, name) => {
            task.stop();
            console.log(`✅ Cron job "${name}" arrêté`);
        });

        console.log('🎉 Tous les cron jobs de nettoyage automatique sont arrêtés');

    } catch (error) {
        console.error('❌ Erreur lors de l\'arrêt des cron jobs:', error.message);
    }
}

module.exports = {
    startCleanupCronJob,
    stopCleanupCronJob,
    cleanupExpiredSchedules,
    cleanupExpiredEvents,
    cleanupOldNotifications,
    cleanupTempFiles
};