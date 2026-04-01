const bcrypt = require('bcryptjs');

async function generateHash() {
    try {
        const password = 'Admin123!';
        const hash = await bcrypt.hash(password, 10);

        console.log('Hash généré pour "Admin123!":');
        console.log(hash);

        // Test de vérification
        const isValid = await bcrypt.compare(password, hash);
        console.log('\nTest de vérification:', isValid);

    } catch (error) {
        console.error('Erreur:', error.message);
    }
}

generateHash();