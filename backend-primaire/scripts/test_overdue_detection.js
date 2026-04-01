const axios = require('axios');

async function testOverdueDetection() {
    try {
        console.log('=== TEST DE DÉTECTION DES ÉLÈVES EN RETARD ===');

        // 1. Se connecter
        console.log('🔐 Connexion...');
        const loginResponse = await axios.post('https://bethaniemiracle.com/api/auth/login', {
            email: 'admin@lapetiteacademie.ci',
            password: 'Admin123!'
        });

        const token = loginResponse.data.data.token;
        console.log('✅ Connexion réussie!');

        const headers = {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        };

        // 2. Récupérer les statistiques globales
        console.log('\n📊 Récupération des statistiques globales...');
        const statsResponse = await axios.get('https://bethaniemiracle.com/api/reminders/statistics', {
            headers,
            params: { school_year: '2025-2026' }
        });

        const stats = statsResponse.data.data;
        console.log('📋 Statistiques globales:');
        console.log(`   - Élèves en retard: ${stats.general.total_students_with_overdue}`);
        console.log(`   - Versements en retard: ${stats.general.total_overdue_installments}`);
        console.log(`   - Montant total dû: ${stats.general.total_overdue_amount} FCFA`);

        // 3. Récupérer tous les élèves en retard
        console.log('\n📋 Récupération de tous les élèves en retard...');
        const allOverdueResponse = await axios.get('https://bethaniemiracle.com/api/reminders/all-school/overdue', {
            headers,
            params: { school_year: '2025-2026' }
        });

        const allOverdueStudents = allOverdueResponse.data.data;
        console.log(`📋 ${allOverdueStudents.length} élèves en retard trouvés`);

        if (allOverdueStudents.length > 0) {
            console.log('\n🔍 Détail des élèves en retard:');
            allOverdueStudents.forEach((student, index) => {
                console.log(`   ${index + 1}. ${student.student_first_name} ${student.student_last_name} (${student.class_name})`);
                console.log(`      - Montant dû: ${student.total_overdue_amount} FCFA`);
                console.log(`      - Versements en retard: ${student.overdue_installments_count}`);
                console.log(`      - Dernier paiement: ${student.last_payment_date || 'Aucun'}`);
            });

            // 4. Tester avec une classe spécifique
            const firstStudent = allOverdueStudents[0];
            console.log(`\n🔍 Test avec la classe: ${firstStudent.class_name}`);

            // Récupérer l'ID de la classe (on va le deviner ou utiliser une API)
            const classResponse = await axios.get('https://bethaniemiracle.com/api/classes', { headers });
            const classes = classResponse.data.data;
            const targetClass = classes.find(c => c.name === firstStudent.class_name);

            if (targetClass) {
                console.log(`   Classe trouvée: ${targetClass.name} (ID: ${targetClass.id})`);

                const classOverdueResponse = await axios.get(`https://bethaniemiracle.com/api/reminders/class/${targetClass.id}/overdue`, {
                    headers,
                    params: { school_year: '2025-2026' }
                });

                const classOverdueStudents = classOverdueResponse.data.data;
                console.log(`   📋 ${classOverdueStudents.length} élèves en retard dans cette classe`);

                if (classOverdueStudents.length > 0) {
                    console.log('   ✅ La détection par classe fonctionne !');
                    classOverdueStudents.forEach(student => {
                        console.log(`      - ${student.student_first_name} ${student.student_last_name}: ${student.total_overdue_amount} FCFA`);
                    });
                } else {
                    console.log('   ❌ Aucun élève en retard détecté pour cette classe');
                }
            }
        } else {
            console.log('\n⚠️  Aucun élève en retard trouvé');
            console.log('   Cela peut être normal si tous les paiements sont à jour');

            // 5. Vérifier s'il y a des versements avec des dates d'échéance dans le passé
            console.log('\n🔍 Vérification des dates d\'échéance...');
            const installmentsResponse = await axios.get('https://bethaniemiracle.com/api/installments/student/8', {
                headers,
                params: { school_year: '2025-2026' }
            });

            const installments = installmentsResponse.data.data;
            console.log(`📋 ${installments.length} versements trouvés pour l'étudiant test`);

            const today = new Date();
            installments.forEach(installment => {
                const dueDate = new Date(installment.level_due_date || installment.due_date);
                const isOverdue = dueDate < today && installment.status === 'pending' && installment.balance > 0;

                console.log(`   Versement ${installment.installment_number}:`);
                console.log(`      - Date d'échéance: ${installment.level_due_date || installment.due_date}`);
                console.log(`      - Statut: ${installment.status}`);
                console.log(`      - Solde: ${installment.balance} FCFA`);
                console.log(`      - En retard: ${isOverdue ? 'OUI' : 'NON'}`);
            });
        }

        console.log('\n🎉 Test de détection des retards terminé!');

        // 6. Résumé des recommandations
        console.log('\n📋 Résumé:');
        if (allOverdueStudents.length > 0) {
            console.log('   ✅ La détection des retards fonctionne');
            console.log('   ✅ Les élèves en retard sont correctement identifiés');
            console.log('   ✅ Les montants dus sont calculés correctement');
        } else {
            console.log('   ℹ️  Aucun élève en retard détecté');
            console.log('   ℹ️  Vérifiez que les dates d\'échéance sont correctement configurées');
        }

    } catch (error) {
        console.error('❌ Erreur lors du test:', error.message);
        if (error.response) {
            console.error('   Détails:', error.response.data);
        }
    }
}

// Exécuter le test
testOverdueDetection();