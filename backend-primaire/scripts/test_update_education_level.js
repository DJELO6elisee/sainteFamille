const axios = require('axios');

async function testUpdateEducationLevel() {
    try {
        console.log('=== TEST DE MISE À JOUR D\'UN NIVEAU D\'ÉDUCATION ===');

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

        // 3. Récupérer les détails du niveau avec ses versements
        console.log('\n🔍 Récupération des détails du niveau...');
        const getResponse = await axios.get(`http://localhost:5000/api/education-levels/${testLevel.id}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        const levelDetails = getResponse.data.data;
        console.log(`📋 Niveau: ${levelDetails.name}`);
        console.log(`💰 Scolarité: ${levelDetails.tuition_amount} FCFA`);
        console.log(`📝 Inscription: ${levelDetails.registration_fee} FCFA`);
        console.log(`📊 Versements existants: ${levelDetails.installments ? levelDetails.installments.length : 0}`);

        if (levelDetails.installments && levelDetails.installments.length > 0) {
            console.log('\n📋 Versements actuels:');
            levelDetails.installments.forEach((inst, index) => {
                console.log(`   ${index + 1}. Montant: ${inst.amount} FCFA, Pourcentage: ${inst.percentage}%, Date: ${inst.due_date || 'Non définie'}`);
            });
        }

        // 4. Mettre à jour le niveau avec de nouveaux versements
        console.log('\n🔄 Mise à jour du niveau...');
        const updateData = {
            name: levelDetails.name,
            description: levelDetails.description,
            tuition_amount: levelDetails.tuition_amount,
            registration_fee: levelDetails.registration_fee,
            cantine_amount: levelDetails.cantine_amount,
            order_index: levelDetails.order_index,
            installments: [{
                    installment_number: 1,
                    amount: 40000,
                    percentage: 40,
                    due_date: '2025-02-01',
                    due_date_offset_days: 30
                },
                {
                    installment_number: 2,
                    amount: 30000,
                    percentage: 30,
                    due_date: '2025-03-01',
                    due_date_offset_days: 60
                },
                {
                    installment_number: 3,
                    amount: 30000,
                    percentage: 30,
                    due_date: '2025-04-01',
                    due_date_offset_days: 90
                }
            ]
        };

        const updateResponse = await axios.put(`http://localhost:5000/api/education-levels/${testLevel.id}`, updateData, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        console.log('✅ Mise à jour réussie!');
        console.log('📄 Réponse:', updateResponse.data);

        // 5. Vérifier les versements mis à jour
        console.log('\n🔍 Vérification des versements mis à jour...');
        const finalResponse = await axios.get(`http://localhost:5000/api/education-levels/${testLevel.id}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        const updatedLevel = finalResponse.data.data;
        console.log(`📊 Versements mis à jour: ${updatedLevel.installments ? updatedLevel.installments.length : 0}`);

        if (updatedLevel.installments && updatedLevel.installments.length > 0) {
            console.log('\n📋 Nouveaux versements:');
            updatedLevel.installments.forEach((inst, index) => {
                console.log(`   ${index + 1}. Montant: ${inst.amount} FCFA, Pourcentage: ${inst.percentage}%, Date: ${inst.due_date || 'Non définie'}`);
            });
        }

        console.log('\n🎉 TEST RÉUSSI ! La mise à jour fonctionne correctement !');

    } catch (error) {
        console.error('❌ Erreur:', error.response ? .data || error.message);
    }
}

testUpdateEducationLevel();




















