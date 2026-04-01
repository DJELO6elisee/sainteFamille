const axios = require('axios');

async function testNewInstallmentFields() {
    try {
        console.log('=== TEST DES NOUVEAUX CHAMPS DE VERSEMENTS ===');

        // 1. Se connecter
        console.log('🔐 Connexion...');
        const loginResponse = await axios.post('http://localhost:5000/api/auth/login', {
            email: 'admin@lapetiteacademie.ci',
            password: 'Admin123!'
        });

        const token = loginResponse.data.data.token;
        console.log('✅ Connexion réussie!');

        // 2. Récupérer un niveau existant
        console.log('\n📋 Récupération des niveaux...');
        const levelsResponse = await axios.get('http://localhost:5000/api/education-levels', {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        const levels = levelsResponse.data.data;
        const testLevel = levels.find(level => level.classes_count === 0);

        if (!testLevel) {
            console.log('❌ Aucun niveau sans classes trouvé pour le test');
            return;
        }

        console.log(`📊 Test avec le niveau: ${testLevel.name} (ID: ${testLevel.id})`);

        // 3. Tester la création d'un niveau avec les nouveaux champs
        console.log('\n🔄 Test de création avec nouveaux champs...');
        const newLevelData = {
            name: 'Test Niveau ' + Date.now(),
            description: 'Niveau de test avec nouveaux champs',
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

        try {
            const createResponse = await axios.post('http://localhost:5000/api/education-levels', newLevelData, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            console.log('✅ Création réussie!');
            console.log('📄 Réponse:', createResponse.data);

            const newLevelId = createResponse.data.data.id;

            // 4. Récupérer le niveau créé pour vérifier les champs
            console.log('\n🔍 Vérification des champs...');
            const getResponse = await axios.get(`http://localhost:5000/api/education-levels/${newLevelId}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            const createdLevel = getResponse.data.data;
            console.log('📋 Niveau créé:');
            console.log(`   - Nom: ${createdLevel.name}`);
            console.log(`   - Scolarité: ${createdLevel.tuition_amount} FCFA`);
            console.log(`   - Inscription: ${createdLevel.registration_fee} FCFA`);
            console.log(`   - Versements: ${createdLevel.installments.length}`);

            if (createdLevel.installments && createdLevel.installments.length > 0) {
                console.log('\n📊 Versements:');
                createdLevel.installments.forEach((inst, index) => {
                    console.log(`   ${index + 1}. Montant: ${inst.amount} FCFA, Pourcentage: ${inst.percentage}%, Date: ${inst.due_date}`);
                });
            }

            // 5. Nettoyer - supprimer le niveau de test
            console.log('\n🗑️ Nettoyage...');
            await axios.delete(`http://localhost:5000/api/education-levels/${newLevelId}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            console.log('✅ Niveau de test supprimé');

        } catch (error) {
            console.log('❌ Erreur lors de la création:', error.response ? .data || error.message);
        }

        console.log('\n🎉 TEST TERMINÉ !');

    } catch (error) {
        console.error('❌ Erreur générale:', error.response ? .data || error.message);
    }
}

testNewInstallmentFields();




















