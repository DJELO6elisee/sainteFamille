#!/usr/bin/env node

const { createAdmin, createCustomAdmin } = require('./createAdmin');

console.log('🏫 La Petite Académie - Script de création d\'administrateur\n');

console.log('Choisissez une option:');
console.log('1. Créer un administrateur par défaut');
console.log('2. Créer un administrateur personnalisé');
console.log('3. Quitter\n');

const readline = require('readline');
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

rl.question('Votre choix (1-3): ', (choice) => {
    switch (choice.trim()) {
        case '1':
            console.log('\n📋 Création d\'un administrateur par défaut...\n');
            rl.close();
            createAdmin();
            break;
        case '2':
            console.log('\n🔧 Mode création d\'administrateur personnalisé\n');
            rl.close();
            createCustomAdminInteractive();
            break;
        case '3':
            console.log('\n👋 Au revoir!');
            rl.close();
            process.exit(0);
            break;
        default:
            console.log('\n❌ Choix invalide. Veuillez choisir 1, 2 ou 3.');
            rl.close();
            process.exit(1);
    }
});

function createCustomAdminInteractive() {
    const customData = {};

    const questions = [
        { key: 'first_name', question: 'Prénom: ' },
        { key: 'last_name', question: 'Nom: ' },
        { key: 'email', question: 'Email: ' },
        { key: 'password', question: 'Mot de passe: ' },
        { key: 'contact', question: 'Contact (optionnel): ' },
        { key: 'civilité', question: 'Civilité (M./Mme, défaut: M.): ' },
        { key: 'fonction', question: 'Fonction (optionnel): ' },
        { key: 'role', question: 'Rôle (admin/secretary/éducateur/comptable): ' }
    ];

    let currentQuestion = 0;

    function askQuestion() {
        if (currentQuestion >= questions.length) {
            createCustomAdmin(customData);
            return;
        }

        const q = questions[currentQuestion];
        const rl2 = readline.createInterface({
            input: process.stdin,
            output: process.stdout
        });

        rl2.question(q.question, (answer) => {
            if (answer.trim()) {
                customData[q.key] = answer.trim();
            }
            rl2.close();
            currentQuestion++;
            askQuestion();
        });
    }

    askQuestion();
}