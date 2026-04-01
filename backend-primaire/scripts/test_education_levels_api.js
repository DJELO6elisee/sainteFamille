const axios = require('axios');
const jwt = require('jsonwebtoken');

async function testEducationLevelsAPI() {
    try {
        console.log('=== TEST DE L\'API EDUCATION LEVELS ===');

        // Générer un token JWT
        const token = jwt.sign({ id: 4, email: 'admin@lapetiteacademie.ci', role: 'secretary' },
            'votre_secret_jwt', { expiresIn: '1h' }
        );

        console.log('🔑 Token généré');

        // Tester l'API
        console.log('🔄 Test de l\'API...');
        const response = await axios.get('http://localhost:5000/api/education-levels', {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        console.log('✅ API fonctionne!');
        console.log('📊 Données reçues:');
        console.log(JSON.stringify(response.data, null, 2));

    } catch (error) {
        console.error('❌ Erreur API:');
        if (error.response) {
            console.error('Status:', error.response.status);
            console.error('Data:', error.response.data);
        } else {
            console.error('Message:', error.message);
        }
    }
}

testEducationLevelsAPI();
