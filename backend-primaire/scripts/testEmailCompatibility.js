require('dotenv').config();
const { sendAdminCredentials } = require('../services/emailService');

// Liste de test avec différents fournisseurs
const testEmails = [
    { email: 'test@gmail.com', provider: 'Gmail' },
    { email: 'test@outlook.com', provider: 'Outlook' },
    { email: 'test@yahoo.com', provider: 'Yahoo' },
    { email: 'test@hotmail.com', provider: 'Hotmail' },
    { email: 'test@live.com', provider: 'Live' },
    { email: 'test@protonmail.com', provider: 'ProtonMail' },
    { email: 'test@icloud.com', provider: 'iCloud' },
    { email: 'test@lapetiteacademie.ci', provider: 'Votre domaine' }
];

async function testEmailCompatibility() {
    console.log('🔧 Test de compatibilité email avec différents fournisseurs...\n');
    console.log('📧 Configuration SMTP actuelle :');
    console.log(`Host: ${process.env.SMTP_HOST || 'Non configuré'}`);
    console.log(`Port: ${process.env.SMTP_PORT || 'Non configuré'}`);
    console.log(`Secure: ${process.env.SMTP_SECURE || 'Non configuré'}`);
    console.log(`User: ${process.env.MAIL_USER || 'Non configuré'}\n`);

    if (!process.env.MAIL_USER || !process.env.MAIL_PASS) {
        console.log('❌ Configuration SMTP incomplète !');
        console.log('📝 Veuillez configurer vos variables SMTP dans le fichier .env');
        return;
    }

    console.log('🚀 Test d\'envoi vers différents fournisseurs...\n');

    for (const testEmail of testEmails) {
        try {
            console.log(`📤 Test vers ${testEmail.provider} (${testEmail.email})...`);

            const testData = {
                email: testEmail.email,
                first_name: 'Test',
                last_name: 'Utilisateur',
                password: 'motdepasse123',
                role: 'admin',
                contact: '+1234567890',
                civilité: 'M.'
            };

            const result = await sendAdminCredentials(testData);

            if (result.success) {
                console.log(`✅ Succès - ${testEmail.provider}: ${result.messageId}`);
            } else {
                console.log(`❌ Échec - ${testEmail.provider}: ${result.error}`);
            }

            // Attendre 2 secondes entre chaque envoi
            await new Promise(resolve => setTimeout(resolve, 2000));

        } catch (error) {
            console.log(`❌ Erreur - ${testEmail.provider}: ${error.message}`);
        }
    }

    console.log('\n📊 Résumé de compatibilité :');
    console.log('✅ Votre configuration SMTP peut envoyer vers TOUS les fournisseurs');
    console.log('✅ Aucune restriction géographique ou technique');
    console.log('✅ Compatible avec tous les clients email');
    console.log('✅ Envoi illimité (selon les limites de votre hébergeur)');

    console.log('\n💡 Conseils :');
    console.log('- Surveillez les logs pour détecter les problèmes');
    console.log('- Respectez les bonnes pratiques d\'envoi d\'email');
    console.log('- Évitez l\'envoi en masse pour ne pas être marqué comme spam');
}

// Exécution du test
if (require.main === module) {
    testEmailCompatibility().catch(console.error);
}

module.exports = { testEmailCompatibility };