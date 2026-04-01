const axios = require('axios');

async function testLoginAndAPI() {
    try {
        console.log('=== TEST DE CONNEXION ET API ===');

        // 1. Se connecter pour obtenir un token valide
        console.log('🔐 Connexion...');
        const loginResponse = await axios.post('http://localhost:5000/api/auth/login', {
            email: 'admin@lapetiteacademie.ci',
            password: 'Admin123!'
        });

        console.log('✅ Connexion réussie!');
        const token = loginResponse.data.data.token;
        console.log('🔑 Token obtenu:', token.substring(0, 50) + '...');

        // 2. Tester l'API education-levels
        console.log('\n🔄 Test de l\'API education-levels...');
        const apiResponse = await axios.get('http://localhost:5000/api/education-levels', {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        console.log('✅ API fonctionne!');
        console.log('📊 Données reçues:');
        console.log(JSON.stringify(apiResponse.data, null, 2));

    } catch (error) {
        console.error('❌ Erreur:');
        if (error.response) {
            console.error('Status:', error.response.status);
            console.error('Data:', error.response.data);
        } else {
            console.error('Message:', error.message);
        }
    }
}

testLoginAndAPI();
