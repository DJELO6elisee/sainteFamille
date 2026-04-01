#!/usr/bin/env node

/**
 * Script de test pour l'upload de médias
 * Usage: node scripts/test-media-upload.js
 */

require('dotenv').config();
const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');

console.log('🧪 Test de l\'upload de médias...\n');

// Configuration
const BASE_URL = 'https://lapetiteacademie.ci/api';
const TEST_EMAIL = 'test@example.com';
const TEST_PASSWORD = 'test123';

async function testMediaUpload() {
    try {
        // 1. Connexion pour obtenir un token
        console.log('🔐 Connexion...');
        const loginResponse = await axios.post(`${BASE_URL}/auth/login`, {
            email: TEST_EMAIL,
            password: TEST_PASSWORD
        });

        const token = loginResponse.data.token;
        console.log('✅ Connexion réussie');

        // 2. Créer un fichier de test
        const testFilePath = path.join(__dirname, 'test-image.jpg');
        const testImageData = Buffer.from('fake-image-data');
        fs.writeFileSync(testFilePath, testImageData);

        // 3. Test de l'upload simple
        console.log('\n📤 Test de l\'upload simple...');
        const formData = new FormData();
        formData.append('media', fs.createReadStream(testFilePath));
        formData.append('student_id', '1');
        formData.append('description', 'Test upload simple');

        const uploadResponse = await axios.post(`${BASE_URL}/media/student/upload`, formData, {
            headers: {
                'Authorization': `Bearer ${token}`,
                ...formData.getHeaders()
            }
        });

        console.log('✅ Upload simple réussi:', uploadResponse.data);

        // 4. Test de l'upload en masse
        console.log('\n📤 Test de l\'upload en masse...');
        const bulkFormData = new FormData();
        bulkFormData.append('media', fs.createReadStream(testFilePath));
        bulkFormData.append('student_ids', JSON.stringify([1, 2, 3]));
        bulkFormData.append('description', 'Test upload en masse');

        const bulkUploadResponse = await axios.post(`${BASE_URL}/media/bulk-upload`, bulkFormData, {
            headers: {
                'Authorization': `Bearer ${token}`,
                ...bulkFormData.getHeaders()
            }
        });

        console.log('✅ Upload en masse réussi:', bulkUploadResponse.data);

        // 5. Test de récupération des médias
        console.log('\n📥 Test de récupération des médias...');
        const getMediaResponse = await axios.get(`${BASE_URL}/media/student/1`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        console.log('✅ Récupération des médias réussie:', getMediaResponse.data);

        // Nettoyer le fichier de test
        fs.unlinkSync(testFilePath);

        console.log('\n🎉 Tous les tests sont passés avec succès !');

    } catch (error) {
        console.error('❌ Erreur lors du test:', error.response?.data || error.message);
        
        if (error.response?.status === 404) {
            console.log('\n🔧 Solutions :');
            console.log('1. Vérifiez que le serveur est démarré');
            console.log('2. Vérifiez que les routes sont correctement définies');
            console.log('3. Vérifiez que l\'URL de base est correcte');
        }
    }
}

// Exécution du test
if (require.main === module) {
    testMediaUpload();
}

module.exports = { testMediaUpload };









