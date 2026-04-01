require('dotenv').config();
const { testSMTPConnection, sendAdminCredentials } = require('../services/emailService');

async function testSMTP() {
    console.log('🔧 Test de la configuration SMTP...\n');

    // Test 1: Vérification de la connexion SMTP
    console.log('1️⃣ Test de connexion SMTP...');
    try {
        const connectionTest = await testSMTPConnection();
        if (connectionTest.success) {
            console.log('✅ Connexion SMTP réussie');
        } else {
            console.log('❌ Échec de la connexion SMTP:', connectionTest.error);
            return;
        }
    } catch (error) {
        console.log('❌ Erreur lors du test de connexion:', error.message);
        return;
    }

    // Test 2: Envoi d'un email de test
    console.log('\n2️⃣ Test d\'envoi d\'email...');
    try {
        const testEmailData = {
            email: process.env.TEST_EMAIL || 'test@example.com',
            first_name: 'Test',
            last_name: 'Utilisateur',
            password: 'motdepasse123',
            role: 'admin',
            contact: '+1234567890',
            civilité: 'M.'
        };

        const emailResult = await sendAdminCredentials(testEmailData);

        if (emailResult.success) {
            console.log('✅ Email de test envoyé avec succès');
            console.log('📧 Message ID:', emailResult.messageId);
        } else {
            console.log('❌ Échec de l\'envoi d\'email:', emailResult.error);
        }
    } catch (error) {
        console.log('❌ Erreur lors de l\'envoi d\'email:', error.message);
    }

    console.log('\n📋 Configuration actuelle:');
    console.log('Host:', process.env.SMTP_HOST || 'smtp.gmail.com');
    console.log('Port:', process.env.SMTP_PORT || 587);
    console.log('User:', process.env.MAIL_USER || 'Non configuré');
    console.log('Secure:', process.env.SMTP_SECURE || false);
}

// Exécution du test
if (require.main === module) {
    testSMTP().catch(console.error);
}

module.exports = { testSMTP };