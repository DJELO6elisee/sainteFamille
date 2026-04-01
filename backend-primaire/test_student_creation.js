const axios = require('axios');

// Test de création d'étudiant avec des données minimales
async function testStudentCreation() {
    try {
        console.log('=== [TEST] Début du test de création d\'étudiant ===');

        // Données de test minimales
        const testData = {
            first_name: 'Test',
            last_name: 'Student',
            date_of_birth: '2010-01-01',
            gender: 'M',
            parent_first_name: 'Parent',
            parent_last_name: 'Test',
            parent_phone: '0123456789',
            emergency_contact: '0123456789',
            registration_mode: 'onsite',
            desired_class: '1', // Assurez-vous que cette classe existe
            cantine: '0',
            previous_school: '',
            previous_class: '',
            special_needs: '',
            additional_info: '',
            password: 'test123'
        };

        console.log('Données envoyées:', testData);

        const response = await axios.post('http://localhost:5000/api/students', testData, {
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer YOUR_TOKEN_HERE' // Remplacez par un token valide
            }
        });

        console.log('✅ Succès:', response.data);

    } catch (error) {
        console.error('❌ Erreur:', error.response ? .data || error.message);
        console.error('Status:', error.response ? .status);
        console.error('Headers:', error.response ? .headers);
    }
}

// Test avec FormData (comme le frontend)
async function testStudentCreationWithFormData() {
    try {
        console.log('=== [TEST] Test avec FormData ===');

        const FormData = require('form-data');
        const form = new FormData();

        // Champs requis
        form.append('first_name', 'Test');
        form.append('last_name', 'Student');
        form.append('date_of_birth', '2010-01-01');
        form.append('gender', 'M');
        form.append('parent_first_name', 'Parent');
        form.append('parent_last_name', 'Test');
        form.append('parent_phone', '0123456789');
        form.append('emergency_contact', '0123456789');
        form.append('registration_mode', 'onsite');
        form.append('desired_class', '1');
        form.append('cantine', '0');
        form.append('previous_school', '');
        form.append('previous_class', '');
        form.append('special_needs', '');
        form.append('additional_info', '');
        form.append('password', 'test123');

        // Champs optionnels (non envoyés)
        // form.append('address', '');
        // form.append('city', '');
        // form.append('parent_email', '');
        // form.append('parent_contact', '');

        console.log('FormData créé avec les champs requis uniquement');

        const response = await axios.post('http://localhost:5000/api/students', form, {
            headers: {
                ...form.getHeaders(),
                'Authorization': 'Bearer YOUR_TOKEN_HERE' // Remplacez par un token valide
            }
        });

        console.log('✅ Succès avec FormData:', response.data);

    } catch (error) {
        console.error('❌ Erreur avec FormData:', error.response ? .data || error.message);
        console.error('Status:', error.response ? .status);
    }
}

// Exécuter les tests
async function runTests() {
    console.log('Démarrage des tests...');
    await testStudentCreation();
    console.log('\n' + '='.repeat(50) + '\n');
    await testStudentCreationWithFormData();
}

runTests();