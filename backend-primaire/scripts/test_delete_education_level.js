const axios = require('axios');

async function testDeleteEducationLevel() {
    try {
        console.log('=== TEST DE SUPPRESSION D\'UN NIVEAU D\'ÉDUCATION ===');

        // 1. Se connecter pour obtenir un token valide
        console.log('🔐 Connexion...');
        const loginResponse = await axios.post('http://localhost:5000/api/auth/login', {
            email: 'admin@lapetiteacademie.ci',
            password: 'Admin123!'
        });

        const token = loginResponse.data.data.token;
        console.log('✅ Connexion réussie!');

        // 2. Récupérer les niveaux existants
        console.log('\n📋 Récupération des niveaux existants...');
        const levelsResponse = await axios.get('http://localhost:5000/api/education-levels', {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        const levels = levelsResponse.data.data;
        console.log(`📊 ${levels.length} niveaux trouvés:`);
        levels.forEach(level => {
            console.log(`   - ID: ${level.id}, Nom: ${level.name}, Classes: ${level.classes_count}, Étudiants: ${level.students_count}`);
        });

        // 3. Tester la suppression d'un niveau sans classes ni étudiants
        const levelToDelete = levels.find(level => level.classes_count === 0 && level.students_count === 0);

        if (levelToDelete) {
            console.log(`\n🗑️ Test de suppression du niveau: ${levelToDelete.name} (ID: ${levelToDelete.id})`);

            const deleteResponse = await axios.delete(`http://localhost:5000/api/education-levels/${levelToDelete.id}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            console.log('✅ Suppression réussie!');
            console.log('📄 Réponse:', deleteResponse.data);

        } else {
            console.log('\n⚠️ Aucun niveau sans classes ni étudiants trouvé pour le test');
        }

        // 4. Tester la suppression d'un niveau avec des classes (doit échouer)
        const levelWithClasses = levels.find(level => level.classes_count > 0);

        if (levelWithClasses) {
            console.log(`\n🚫 Test de suppression d'un niveau avec classes: ${levelWithClasses.name} (ID: ${levelWithClasses.id})`);

            try {
                await axios.delete(`http://localhost:5000/api/education-levels/${levelWithClasses.id}`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                console.log('❌ Erreur: La suppression aurait dû échouer!');
            } catch (error) {
                if (error.response && error.response.status === 400) {
                    console.log('✅ Test réussi: La suppression a été bloquée comme attendu');
                    console.log('📄 Message:', error.response.data.message);
                } else {
                    console.log('❌ Erreur inattendue:', error.response ? .data || error.message);
                }
            }
        }

        // 5. Vérifier les niveaux restants
        console.log('\n📋 Vérification des niveaux restants...');
        const finalLevelsResponse = await axios.get('http://localhost:5000/api/education-levels', {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        const finalLevels = finalLevelsResponse.data.data;
        console.log(`📊 ${finalLevels.length} niveaux restants`);

        console.log('\n🎉 TEST TERMINÉ AVEC SUCCÈS !');

    } catch (error) {
        console.error('❌ Erreur:', error.response ? .data || error.message);
    }
}

testDeleteEducationLevel();




















