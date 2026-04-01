const axios = require('axios');

async function testGetLevelWithInstallments() {
    try {
        console.log('=== TEST DE RÉCUPÉRATION D\'UN NIVEAU AVEC SES VERSEMENTS ===');
        
        // 1. Se connecter
        console.log('🔐 Connexion...');
        const loginResponse = await axios.post('http://localhost:5000/api/auth/login', {
            email: 'admin@lapetiteacademie.ci',
            password: 'Admin123!'
        });
        
        const token = loginResponse.data.data.token;
        console.log('✅ Connexion réussie!');
        
        // 2. Récupérer tous les niveaux
        console.log('\n📋 Récupération des niveaux...');
        const levelsResponse = await axios.get('http://localhost:5000/api/education-levels', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        const levels = levelsResponse.data.data;
        console.log(`📊 ${levels.length} niveaux trouvés`);
        
        // 3. Trouver un niveau avec des versements
        const levelWithInstallments = levels.find(level => level.installments_count > 0);
        
        if (!levelWithInstallments) {
            console.log('❌ Aucun niveau avec des versements trouvé');
            return;
        }
        
        console.log(`📊 Test avec le niveau: ${levelWithInstallments.name} (ID: ${levelWithInstallments.id})`);
        console.log(`📊 Versements configurés: ${levelWithInstallments.installments_count}`);
        
        // 4. Récupérer les détails du niveau avec ses versements
        console.log('\n🔍 Récupération des détails du niveau...');
        const getResponse = await axios.get(`http://localhost:5000/api/education-levels/${levelWithInstallments.id}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        const levelDetails = getResponse.data.data;
        console.log(`📋 Niveau: ${levelDetails.name}`);
        console.log(`💰 Scolarité: ${levelDetails.tuition_amount} FCFA`);
        console.log(`📝 Inscription: ${levelDetails.registration_fee} FCFA`);
        console.log(`📊 Versements récupérés: ${levelDetails.installments ? levelDetails.installments.length : 0}`);
        
        if (levelDetails.installments && levelDetails.installments.length > 0) {
            console.log('\n📋 Détails des versements:');
            levelDetails.installments.forEach((inst, index) => {
                console.log(`   ${index + 1}. Numéro: ${inst.installment_number}, Montant: ${inst.amount} FCFA, Pourcentage: ${inst.percentage}%, Date: ${inst.due_date || 'Non définie'}`);
            });
        } else {
            console.log('⚠️  Aucun versement détaillé trouvé');
        }
        
        console.log('\n🎉 TEST RÉUSSI ! Les versements sont correctement récupérés !');
        
    } catch (error) {
        console.error('❌ Erreur:', error.response?.data || error.message);
    }
}

testGetLevelWithInstallments();





















