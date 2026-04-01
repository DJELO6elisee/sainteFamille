const axios = require('axios');

async function testLocalAPI() {
    try {
        console.log('=== [TEST] Test de l\'API locale ===');

        // Test simple avec des données minimales
        const formData = new FormData();
        formData.append('first_name', 'Test');
        formData.append('last_name', 'Student');
        formData.append('date_of_birth', '2010-01-01');
        formData.append('gender', 'M');
        formData.append('parent_first_name', 'Parent');
        formData.append('parent_last_name', 'Test');
        formData.append('parent_phone', '0123456789');
        formData.append('emergency_contact', '0123456789');
        formData.append('registration_mode', 'onsite');
        formData.append('desired_class', '1');
        formData.append('cantine', '0');
        formData.append('previous_school', '');
        formData.append('previous_class', '');
        formData.append('special_needs', '');
        formData.append('additional_info', '');
        formData.append('password', 'test123');

        // Champs optionnels vides
        formData.append('address', '');
        formData.append('city', '');
        formData.append('parent_email', '');
        formData.append('parent_contact', '');

        console.log('Envoi de la requête vers http://localhost:5000/api/students...');

        const response = await axios.post('http://localhost:5000/api/students', formData, {
            headers: {
                'Content-Type': 'multipart/form-data',
                // 'Authorization': 'Bearer YOUR_TOKEN' // Commenté pour le test
            }
        });

        console.log('✅ Succès:', response.data);

    } catch (error) {
        console.error('❌ Erreur:', error.response ? .data || error.message);
        if (error.response) {
            console.error('Status:', error.response.status);
            console.error('Headers:', error.response.headers);
        }
    }
}

testLocalAPI();