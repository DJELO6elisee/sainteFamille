const fs = require('fs');
const path = require('path');

// Configuration SMTP pour lapetiteacademie.ci
const smtpConfig = {
    host: 'mail.lapetiteacademie.ci',
    port: 465,
    secure: true,
    user: '_mainaccount@lapetiteacademie.ci',
    password: 'VOTRE_MOT_DE_PASSE_CPANEL'
};

function setupSMTP() {
    console.log('🔧 Configuration SMTP pour lapetiteacademie.ci...\n');

    console.log('📋 Configuration SMTP :');
    console.log(`Host: ${smtpConfig.host}`);
    console.log(`Port: ${smtpConfig.port}`);
    console.log(`Secure: ${smtpConfig.secure}`);
    console.log(`User: ${smtpConfig.user}`);
    console.log('Password: [À configurer]');

    console.log('\n📝 Variables à ajouter dans votre fichier .env :');
    console.log(`SMTP_HOST=${smtpConfig.host}`);
    console.log(`SMTP_PORT=${smtpConfig.port}`);
    console.log(`SMTP_SECURE=${smtpConfig.secure}`);
    console.log(`MAIL_USER=${smtpConfig.user}`);
    console.log(`MAIL_PASS=VOTRE_MOT_DE_PASSE_CPANEL`);

    console.log('\n⚠️  IMPORTANT: Remplacez VOTRE_MOT_DE_PASSE_CPANEL par votre vrai mot de passe cPanel');

    console.log('\n🚀 Prochaines étapes :');
    console.log('1. Créez ou modifiez le fichier .env dans le dossier backend');
    console.log('2. Ajoutez les variables SMTP ci-dessus');
    console.log('3. Remplacez VOTRE_MOT_DE_PASSE_CPANEL par votre vrai mot de passe');
    console.log('4. Testez avec: node scripts/testSMTP.js');
}

if (require.main === module) {
    setupSMTP();
}

module.exports = { setupSMTP, smtpConfig };