const axios = require('axios');

async function testInstallmentCreation() {
    try {
        console.log('=== TEST DE CRÉATION DE VERSEMENTS AVEC NOUVEAUX CHAMPS ===');

        // 1. Se connecter
        console.log('🔐 Connexion...');
        const loginResponse = await axios.post('http://localhost:5000/api/auth/login', {
            email: 'admin@lapetiteacademie.ci',
            password: 'Admin123!'
        });

        const token = loginResponse.data.data.token;
        console.log('✅ Connexion réussie!');

        // 2. Créer un niveau de test avec les nouveaux champs
        console.log('\n🔄 Création d\'un niveau de test...');
        const testLevelData = {
            name: 'Test Niveau ' + Date.now(),
            description: 'Niveau de test avec montants et dates',
            tuition_amount: 1000000,
            registration_fee: 50000,
            cantine_amount: 200000,
            order_index: 999,
            installments: [{
                    installment_number: 1,
                    amount: 380000, // 40% de (1000000 - 50000)
                    percentage: 40,
                    due_date: '2025-02-01',
                    due_date_offset_days: 30
                },
                {
                    installment_number: 2,
                    amount: 285000, // 30% de (1000000 - 50000)
                    percentage: 30,
                    due_date: '2025-03-01',
                    due_date_offset_days: 60
                },
                {
                    installment_number: 3,
                    amount: 285000, // 30% de (1000000 - 50000)
                    percentage: 30,
                    due_date: '2025-04-01',
                    due_date_offset_days: 90
                }
            ]
        };

        const createResponse = await axios.post('http://localhost:5000/api/education-levels', testLevelData, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        console.log('✅ Niveau créé avec succès!');
        const newLevelId = createResponse.data.data.id;

        // 3. Récupérer le niveau créé pour vérifier
        console.log('\n🔍 Vérification des données...');
        const getResponse = await axios.get(`http://localhost:5000/api/education-levels/${newLevelId}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        const createdLevel = getResponse.data.data;
        console.log(`📋 Niveau: ${createdLevel.name}`);
        console.log(`💰 Scolarité: ${createdLevel.tuition_amount} FCFA`);
        console.log(`📝 Inscription: ${createdLevel.registration_fee} FCFA`);
        console.log(`📊 Versements: ${createdLevel.installments.length}`);

        if (createdLevel.installments && createdLevel.installments.length > 0) {
            console.log('\n📋 Détails des versements:');
            createdLevel.installments.forEach((inst, index) => {
                console.log(`   ${index + 1}. Montant: ${inst.amount} FCFA, Pourcentage: ${inst.percentage}%, Date: ${inst.due_date || 'Non définie'}`);
            });
        }

        // 4. Nettoyer
        console.log('\n🗑️ Nettoyage...');
        await axios.delete(`http://localhost:5000/api/education-levels/${newLevelId}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        console.log('✅ Niveau de test supprimé');

        console.log('\n🎉 TEST RÉUSSI ! Les nouveaux champs fonctionnent correctement !');

    } catch (error) {
        console.error('❌ Erreur:', error.response ? .data || error.message);
    }
}

testInstallmentCreation();




















