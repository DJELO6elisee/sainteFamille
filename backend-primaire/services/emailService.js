const nodemailer = require('nodemailer');
const emailConfig = require('../config/emailConfig');

// Configuration du transporteur email avec meilleure gestion d'erreurs
const createTransporter = () => {
    try {
        const config = emailConfig.emailConfig;

        // Vérification des paramètres requis
        if (!config.auth.user || !config.auth.pass) {
            throw new Error('Configuration SMTP incomplète: MAIL_USER et MAIL_PASS requis');
        }

        const transporter = nodemailer.createTransport({
            host: config.host,
            port: config.port,
            secure: config.secure,
            auth: config.auth,
            tls: config.tls,
            connectionTimeout: config.connectionTimeout,
            greetingTimeout: config.greetingTimeout,
            socketTimeout: config.socketTimeout,
            pool: config.pool,
            maxConnections: config.maxConnections,
            maxMessages: config.maxMessages,
            rateLimit: config.rateLimit,
            logger: config.logger,
            debug: config.debug,
            dkim: config.dkim
        });

        // Test de la connexion
        transporter.verify((error, success) => {
            if (error) {
                console.error('[EMAIL] Erreur de configuration SMTP:', error.message);
            } else {
                console.log('[EMAIL] Serveur SMTP prêt à envoyer des emails');
            }
        });

        return transporter;
    } catch (error) {
        console.error('[EMAIL] Erreur lors de la création du transporteur:', error.message);
        throw error;
    }
};

// Fonction utilitaire pour envoyer des emails avec retry
const sendEmailWithRetry = async(mailOptions, maxRetries = 3) => {
    let transporter = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            if (!transporter) {
                transporter = createTransporter();
            }

            console.log(`[EMAIL] Tentative ${attempt}/${maxRetries} pour ${mailOptions.to}`);

            // Validation des options d'email
            if (!mailOptions.to || !mailOptions.subject) {
                throw new Error('Options d\'email invalides: destinataire et sujet requis');
            }

            const info = await transporter.sendMail(mailOptions);
            console.log(`[EMAIL] Email envoyé avec succès à ${mailOptions.to}:`, info.messageId);

            return { success: true, messageId: info.messageId };
        } catch (error) {
            console.error(`[EMAIL] Erreur tentative ${attempt}/${maxRetries} pour ${mailOptions.to}:`, error.message);

            if (attempt === maxRetries) {
                return { success: false, error: error.message };
            }

            // Fermer le transporteur en cas d'erreur pour en créer un nouveau
            if (transporter) {
                try {
                    await transporter.close();
                } catch (closeError) {
                    console.error('[EMAIL] Erreur lors de la fermeture du transporteur:', closeError.message);
                }
                transporter = null;
            }

            // Attendre avant de réessayer (backoff exponentiel)
            const waitTime = Math.min(2000 * Math.pow(2, attempt - 1), 10000);
            console.log(`[EMAIL] Attente de ${waitTime}ms avant nouvelle tentative...`);
            await new Promise(resolve => setTimeout(resolve, waitTime));
        }
    }
};

// Fonction pour tester la configuration SMTP
exports.testSMTPConnection = async() => {
    try {
        const transporter = createTransporter();

        return new Promise((resolve, reject) => {
            transporter.verify((error, success) => {
                if (error) {
                    console.error('[EMAIL] Test SMTP échoué:', error.message);
                    reject({ success: false, error: error.message });
                } else {
                    console.log('[EMAIL] Test SMTP réussi');
                    resolve({ success: true, message: 'Configuration SMTP valide' });
                }
                transporter.close();
            });
        });
    } catch (error) {
        return { success: false, error: error.message };
    }
};

// Exporter la fonction sendEmailWithRetry
exports.sendEmailWithRetry = sendEmailWithRetry;

// Remplace l'objet emailService par des exports individuels

exports.sendAdminCredentials = async(adminData) => {
        const { email, first_name, last_name, password, role, contact, civilité } = adminData;

        const roleLabel = {
            'admin': 'Administrateur',
            'secretary': 'Secrétaire',
            'éducateur': 'Éducateur',
            'comptable': 'Comptable'
        }[role] || role;

        const htmlContent = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f5f7fa;">
                <div style="background-color: #1976d2; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0;">
                    <h1 style="margin: 0; font-size: 24px;">Bienvenue dans ${emailConfig.schoolName}</h1>
                </div>
                
                <div style="background-color: white; padding: 30px; border-radius: 0 0 8px 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
                    <h2 style="color: #1976d2; margin-bottom: 20px;">Vos informations de connexion</h2>
                    
                    <p>Bonjour ${civilité} ${first_name} ${last_name},</p>
                    
                    <p>Votre compte ${roleLabel} a été créé avec succès dans le système de gestion scolaire.</p>
                    
                    <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #1976d2;">
                        <h3 style="color: #1976d2; margin-top: 0;">Informations de connexion :</h3>
                        <p><strong>Email :</strong> ${email}</p>
                        <p><strong>Mot de passe :</strong> ${password}</p>
                        <p><strong>Rôle :</strong> ${roleLabel}</p>
                        ${contact ? `<p><strong>Contact :</strong> ${contact}</p>` : ''}
                    </div>
                    
                    <div style="background-color: #fff3cd; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #ffc107;">
                        <h4 style="color: #856404; margin-top: 0;">⚠️ Important :</h4>
                        <ul style="color: #856404; margin: 10px 0;">
                            <li>Conservez ces informations en lieu sûr</li>
                            <li>Changez votre mot de passe après votre première connexion</li>
                            <li>Ne partagez jamais vos identifiants</li>
                        </ul>
                    </div>
                    
                    <p>Vous pouvez maintenant vous connecter à votre tableau de bord en utilisant ces identifiants.</p>
                    
                    <div style="text-align: center; margin: 30px 0;">
                        <a href="${emailConfig.frontendUrl}/secretary-login" style="background-color: #1976d2; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: bold;">
                            Se connecter
                        </a>
                    </div>
                    
                    <p style="color: #666; font-size: 14px; margin-top: 30px;">
                        Si vous avez des questions, contactez l'administrateur système.
                    </p>
                </div>
            </div>
        `;

        const mailOptions = {
            from: emailConfig.emailConfig.auth.user,
            to: email,
            subject: `Création de votre compte ${roleLabel} - ${emailConfig.schoolName}`,
            html: htmlContent
        };

        try {
            const info = await sendEmailWithRetry(mailOptions);
            return info;
        } catch (error) {
            console.error('Erreur lors de l\'envoi de l\'email:', error);
            return { success: false, error: error.message };
        }
};

exports.sendParentPaymentNotification = async ({ parent_email, parent_first_name, parent_last_name, student_first_name, student_last_name, amount, date, classe, reste_a_payer }) => {
    if (!parent_email) return { success: false, error: 'Aucun email parent fourni' };
    const schoolName = process.env.SCHOOL_NAME || emailConfig.schoolName || 'Votre école';
    const htmlContent = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f5f7fa;">
            <div style="background-color: #1976d2; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0;">
                <h1 style="margin: 0; font-size: 24px;">Paiement reçu pour votre enfant - ${schoolName}</h1>
            </div>
            <div style="background-color: white; padding: 30px; border-radius: 0 0 8px 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
                <p>Bonjour ${parent_first_name || ''} ${parent_last_name || ''},</p>
                <p>Un paiement a été enregistré pour votre enfant <b>${student_first_name} ${student_last_name}</b> à <b>${schoolName}</b>.</p>
                <ul style="font-size: 16px;">
                    <li><b>Montant payé :</b> ${Number(amount).toLocaleString('fr-FR')} F CFA</li>
                    <li><b>Date :</b> ${date}</li>
                    <li><b>Classe :</b> ${classe || 'N/A'}</li>
                    <li><b>Solde restant :</b> ${Number(reste_a_payer).toLocaleString('fr-FR')} F CFA</li>
                </ul>
                <p style="color: #388e3c; font-weight: bold;">Merci pour votre confiance.</p>
                <p style="color: #666; font-size: 14px; margin-top: 30px;">Ceci est un message automatique, ne pas répondre directement.</p>
            </div>
        </div>
    `;
    const mailOptions = {
        from: emailConfig.emailConfig.auth.user,
        to: parent_email,
        subject: `Paiement reçu pour votre enfant - ${schoolName}`,
        html: htmlContent
    };
    try {
        const info = await sendEmailWithRetry(mailOptions);
        return info;
    } catch (error) {
        console.error('Erreur lors de l\'envoi de l\'email de paiement au parent:', error);
        return { success: false, error: error.message };
    }
};

exports.sendParentCantinePaymentNotification = async ({ parent_email, parent_first_name, parent_last_name, student_first_name, student_last_name, amount, date, classe, trimester, school_year, reste_a_payer }) => {
    if (!parent_email) return { success: false, error: 'Aucun email parent fourni' };
    const schoolName = process.env.SCHOOL_NAME || emailConfig.schoolName || 'Votre école';
    const htmlContent = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f5f7fa;">
            <div style="background-color: #1976d2; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0;">
                <h1 style="margin: 0; font-size: 24px;">Paiement cantine reçu - ${schoolName}</h1>
            </div>
            <div style="background-color: white; padding: 30px; border-radius: 0 0 8px 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
                <p>Bonjour ${parent_first_name || ''} ${parent_last_name || ''},</p>
                <p>Un paiement de cantine a été enregistré pour votre enfant <b>${student_first_name} ${student_last_name}</b> à <b>${schoolName}</b>.</p>
                <ul style="font-size: 16px;">
                    <li><b>Montant payé :</b> ${Number(amount).toLocaleString('fr-FR')} F CFA</li>
                    <li><b>Reste à payer pour ce trimestre :</b> ${Number(reste_a_payer).toLocaleString('fr-FR')} F CFA</li>
                    <li><b>Date :</b> ${date}</li>
                    <li><b>Classe :</b> ${classe || 'N/A'}</li>
                    <li><b>Trimestre :</b> ${trimester}</li>
                    <li><b>Année scolaire :</b> ${school_year}</li>
                </ul>
                <p style="color: #388e3c; font-weight: bold;">Merci pour votre confiance.</p>
                <p style="color: #666; font-size: 14px; margin-top: 30px;">Ceci est un message automatique, ne pas répondre directement.</p>
            </div>
        </div>
    `;
    const mailOptions = {
        from: emailConfig.emailConfig.auth.user,
        to: parent_email,
        subject: `Paiement cantine reçu - ${schoolName}`,
        html: htmlContent
    };
    try {
        const info = await sendEmailWithRetry(mailOptions);
        return info;
    } catch (error) {
        console.error('Erreur lors de l\'envoi de l\'email de paiement cantine au parent:', error);
        return { success: false, error: error.message };
    }
};

exports.sendMediaNotification = async (parentEmail, childName, filename) => {
    if (!parentEmail) {
        console.log('Aucun email parent fourni pour la notification média');
        return { success: false, error: 'Aucun email parent fourni' };
    }

    const schoolName = process.env.SCHOOL_NAME || emailConfig.schoolName || 'Votre école';
    const htmlContent = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f5f7fa;">
            <div style="background-color: #1976d2; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0;">
                <h1 style="margin: 0; font-size: 24px;">Nouveau média publié - ${schoolName}</h1>
            </div>
            <div style="background-color: white; padding: 30px; border-radius: 0 0 8px 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
                <p>Bonjour,</p>
                <p>Une nouvelle photo ou vidéo de votre enfant <b>${childName}</b> a été publiée par l'enseignant à <b>${schoolName}</b>.</p>
                
                <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #1976d2;">
                    <h3 style="color: #1976d2; margin-top: 0;">Détails :</h3>
                    <p><strong>Fichier :</strong> ${filename}</p>
                    <p><strong>Enfant :</strong> ${childName}</p>
                    <p><strong>Date :</strong> ${new Date().toLocaleDateString('fr-FR')}</p>
                </div>
                
                <p>Vous pouvez consulter ce média dans votre espace parent.</p>
                
                <div style="text-align: center; margin: 30px 0;">
                    <a href="${emailConfig.frontendUrl || 'https://lapetiteacademie.ci'}/parent/dashboard" style="background-color: #1976d2; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: bold;">
                        Voir dans mon espace parent
                    </a>
                </div>
                
                <p style="color: #666; font-size: 14px; margin-top: 30px;">
                    Ceci est un message automatique, ne pas répondre directement.
                </p>
            </div>
        </div>
    `;

    const mailOptions = {
        from: emailConfig.emailConfig.auth.user,
        to: parentEmail,
        subject: `Nouveau média publié pour ${childName} - ${schoolName}`,
        html: htmlContent
    };

    try {
        const info = await sendEmailWithRetry(mailOptions);
        return info;
    } catch (error) {
        console.error('Erreur lors de l\'envoi de l\'email de notification média:', error);
        return { success: false, error: error.message };
    }
};

exports.sendParentMediaNotification = async ({ to, parentName, childName, mediaUrl, mediaType, caption, studentId }) => {
  const transporter = nodemailer.createTransport({
    service: process.env.SMTP_SERVICE || 'gmail',
    auth: {
      user: process.env.MAIL_USER,
      pass: process.env.MAIL_PASS
    }
  });

  let html = `
    <p>Bonjour ${parentName},</p>
    <p>Une nouvelle ${mediaType === 'photo' ? 'photo' : 'vidéo'} de votre enfant <b>${childName}</b> a été publiée par l’enseignant.</p>
    ${mediaType === 'photo'
      ? `<img src="${mediaUrl}" alt="Photo" style="max-width:300px;display:block;margin:10px 0;" />`
      : `<a href="${mediaUrl}">Voir la vidéo</a>`
    }
    ${caption ? `<p><b>Légende :</b> ${caption}</p>` : ''}
    <p>Vous pouvez aussi retrouver ce média dans votre espace parent.</p>
    <p><a href="${process.env.FRONTEND_URL || 'https://lapetiteacademie.ci'}/parent/child/${studentId}?tab=photos">Voir la galerie de votre enfant</a></p>
    <p>Cordialement,<br>L’équipe de l’école</p>
  `;

  await transporter.sendMail({
    from: process.env.SMTP_FROM || 'no-reply@school.com',
    to,
    subject: 'Nouvelle photo/vidéo de votre enfant',
    html,
  });
};

exports.sendGarderieInscriptionConfirmation = async ({ parentEmail, parentFirstName, parentLastName, childFirstName, childLastName, startDate, endDate, amountPaid, uniqueCode, paymentPeriod, emergencyContact }) => {
    if (!parentEmail) return { success: false, error: 'Aucun email parent fourni' };
    
    const schoolName = 'LA PETITE ACADEMIE, LA MAISON DES ENFANTS';
    const startDateFormatted = startDate ? new Date(startDate).toLocaleDateString('fr-FR') : 'Non spécifiée';
    const endDateFormatted = endDate ? new Date(endDate).toLocaleDateString('fr-FR') : 'Non spécifiée';
    
    const htmlContent = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f5f7fa;">
            <div style="background-color: #4caf50; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0;">
                <h1 style="margin: 0; font-size: 24px;">Inscription Garderie Confirmée</h1>
                <h2 style="margin: 5px 0; font-size: 18px;">LA PETITE ACADEMIE</h2>
                <h3 style="margin: 5px 0; font-size: 16px;">LA MAISON DES ENFANTS</h3>
            </div>
            
            <div style="background-color: white; padding: 30px; border-radius: 0 0 8px 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
                <p>Bonjour ${parentFirstName} ${parentLastName},</p>
                
                <p>Nous confirmons l'inscription de votre enfant <b>${childFirstName} ${childLastName}</b> à la garderie de <b>${schoolName}</b>.</p>
                
                <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #4caf50;">
                    <h3 style="color: #4caf50; margin-top: 0;">Détails de l'inscription :</h3>
                    <ul style="font-size: 16px;">
                        <li><b>Enfant :</b> ${childFirstName} ${childLastName}</li>
                        <li><b>Période :</b> Du ${startDateFormatted} au ${endDateFormatted}</li>
                        ${amountPaid ? `<li><b>Montant versé :</b> ${Number(amountPaid).toLocaleString('fr-FR')} FCFA</li>` : ''}
                        ${paymentPeriod ? `<li><b>Période de validité :</b> ${paymentPeriod}</li>` : ''}
                        ${uniqueCode ? `<li><b>Code unique :</b> ${uniqueCode}</li>` : ''}
                        ${emergencyContact ? `<li><b>Contact d'urgence :</b> ${emergencyContact}</li>` : ''}
                    </ul>
                </div>
                
                <div style="background-color: #e8f5e9; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #4caf50;">
                    <h4 style="color: #2e7d32; margin-top: 0;">✅ Inscription validée</h4>
                    <p style="color: #2e7d32; margin: 0;">Votre enfant peut maintenant fréquenter la garderie selon les horaires établis.</p>
                </div>
                
                <p>Pour toute question concernant la garderie, n'hésitez pas à nous contacter.</p>
                
                <p style="color: #388e3c; font-weight: bold;">Merci pour votre confiance.</p>
                
                <p style="color: #666; font-size: 14px; margin-top: 30px;">
                    Ceci est un message automatique, ne pas répondre directement.
                </p>
            </div>
        </div>
    `;
    
    const mailOptions = {
        from: emailConfig.emailConfig.auth.user,
        to: parentEmail,
        subject: `Inscription Garderie confirmée pour ${childFirstName} ${childLastName} - ${schoolName}`,
        html: htmlContent
    };
    
    try {
        const info = await sendEmailWithRetry(mailOptions);
        return info;
    } catch (error) {
        console.error('Erreur lors de l\'envoi de l\'email de confirmation garderie:', error);
        return { success: false, error: error.message };
    }
};

exports.sendParentReinscriptionNotification = async ({ parent_email, parent_first_name, parent_last_name, student_first_name, student_last_name, classe, school_year }) => {
    if (!parent_email) return { success: false, error: 'Aucun email parent fourni' };
    const schoolName = process.env.SCHOOL_NAME || emailConfig.schoolName || 'Votre école';
    const htmlContent = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f5f7fa;">
            <div style="background-color: #1976d2; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0;">
                <h1 style="margin: 0; font-size: 24px;">Réinscription confirmée - ${schoolName}</h1>
            </div>
            <div style="background-color: white; padding: 30px; border-radius: 0 0 8px 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
                <p>Bonjour ${parent_first_name || ''} ${parent_last_name || ''},</p>
                <p>La réinscription de votre enfant <b>${student_first_name} ${student_last_name}</b> a été confirmée pour l'année scolaire <b>${school_year}</b> à <b>${schoolName}</b>.</p>
                
                <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #1976d2;">
                    <h3 style="color: #1976d2; margin-top: 0;">Détails de la réinscription :</h3>
                    <ul style="font-size: 16px;">
                        <li><b>Élève :</b> ${student_first_name} ${student_last_name}</li>
                        <li><b>Classe :</b> ${classe || 'N/A'}</li>
                        <li><b>Année scolaire :</b> ${school_year}</li>
                        {/* Informations de paiement retirées */}
                    </ul>
                </div>
                
                <div style="background-color: #e8f5e9; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #4caf50;">
                    <h4 style="color: #2e7d32; margin-top: 0;">✅ Réinscription validée</h4>
                    <p style="color: #2e7d32; margin: 0;">Votre enfant est officiellement réinscrit pour l'année scolaire ${school_year}.</p>
                </div>
                
                <p style="color: #388e3c; font-weight: bold;">Merci pour votre confiance.</p>
                <p style="color: #666; font-size: 14px; margin-top: 30px;">Ceci est un message automatique, ne pas répondre directement.</p>
            </div>
        </div>
    `;
    const mailOptions = {
        from: emailConfig.emailConfig.auth.user,
        to: parent_email,
        subject: `Réinscription confirmée pour ${student_first_name} ${student_last_name} - ${schoolName}`,
        html: htmlContent
    };
    try {
        const info = await sendEmailWithRetry(mailOptions);
        return info;
    } catch (error) {
        console.error('Erreur lors de l\'envoi de l\'email de réinscription au parent:', error);
        return { success: false, error: error.message };
    }
};

// Envoyer le bulletin complet d'un étudiant à son parent
exports.sendStudentBulletinEmail = async ({ parent_email, parent_first_name, parent_last_name, bulletinData, compositionName, compositionDate, frontendUrl }) => {
    if (!parent_email) {
        console.log('[EMAIL BULLETIN] Aucun email parent fourni');
        return { success: false, error: 'Aucun email parent fourni' };
    }

    if (!bulletinData || !bulletinData.student_info) {
        console.log('[EMAIL BULLETIN] Données du bulletin incomplètes');
        return { success: false, error: 'Données du bulletin incomplètes' };
    }

    const schoolName = process.env.SCHOOL_NAME || emailConfig.schoolName || 'Votre école';
    const student = bulletinData.student_info;
    const studentName = `${student.first_name} ${student.last_name}`;
    const compositionDateFormatted = compositionDate ? new Date(compositionDate).toLocaleDateString('fr-FR', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
    }) : '';

    // Générer le tableau des matières
    let subjectsTable = '';
    if (bulletinData.subjects && bulletinData.subjects.length > 0) {
        subjectsTable = `
            <table style="width: 100%; border-collapse: collapse; margin: 20px 0; font-size: 14px;">
                <thead>
                    <tr style="background-color: #f5f5f5;">
                        <th style="border: 1px solid #ddd; padding: 12px; text-align: left;">Matière</th>
                        <th style="border: 1px solid #ddd; padding: 12px; text-align: center;">Note</th>
                        <th style="border: 1px solid #ddd; padding: 12px; text-align: center;">Coefficient</th>
                        <th style="border: 1px solid #ddd; padding: 12px; text-align: center;">Moyenne</th>
                        <th style="border: 1px solid #ddd; padding: 12px; text-align: center;">Rang</th>
                    </tr>
                </thead>
                <tbody>
                    ${bulletinData.subjects.map(subject => `
                        <tr>
                            <td style="border: 1px solid #ddd; padding: 10px;"><strong>${subject.subject_name || subject.name || 'N/A'}</strong></td>
                            <td style="border: 1px solid #ddd; padding: 10px; text-align: center;">${subject.average ? subject.average.toFixed(2) : '—'}/20</td>
                            <td style="border: 1px solid #ddd; padding: 10px; text-align: center;">${subject.coefficient || 1}</td>
                            <td style="border: 1px solid #ddd; padding: 10px; text-align: center;">${subject.average ? subject.average.toFixed(2) : '—'}</td>
                            <td style="border: 1px solid #ddd; padding: 10px; text-align: center;">${subject.rank || '—'}/${subject.total_students || '—'}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;
    } else {
        subjectsTable = '<p style="color: #666; font-style: italic;">Aucune note disponible pour cette composition.</p>';
    }

    // Générer le résumé général
    const generalAverage = bulletinData.general_average ? bulletinData.general_average.toFixed(2) : '—';
    const generalRank = bulletinData.general_rank || '—';
    const totalStudents = bulletinData.total_class_students || '—';

    const htmlContent = `
        <div style="font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; background-color: #f5f7fa;">
            <div style="background-color: #2e7d32; color: white; padding: 25px; text-align: center; border-radius: 8px 8px 0 0;">
                <h1 style="margin: 0; font-size: 28px;">📊 Bulletin Scolaire - ${compositionName || 'Composition'}</h1>
                <p style="margin: 10px 0 0 0; font-size: 16px; opacity: 0.9;">${schoolName}</p>
            </div>
            
            <div style="background-color: white; padding: 30px; border-radius: 0 0 8px 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
                <p style="font-size: 16px;">Bonjour ${parent_first_name || ''} ${parent_last_name || ''},</p>
                <p style="font-size: 16px;">Le bulletin scolaire de votre enfant <strong style="color: #2e7d32;">${studentName}</strong> pour la composition <strong>${compositionName || 'Composition'}</strong> vient d'être publié.</p>
                
                ${compositionDateFormatted ? `<p style="color: #666; font-size: 14px; margin-top: -10px;"><em>Date de composition : ${compositionDateFormatted}</em></p>` : ''}
                
                <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 25px 0; border-left: 4px solid #2e7d32;">
                    <h3 style="color: #2e7d32; margin-top: 0; font-size: 20px;">📋 Informations de l'élève</h3>
                    <table style="width: 100%; font-size: 15px;">
                        <tr>
                            <td style="padding: 8px 0; width: 40%;"><strong>Nom & Prénoms :</strong></td>
                            <td style="padding: 8px 0;">${student.last_name || ''} ${student.first_name || ''}</td>
                        </tr>
                        <tr>
                            <td style="padding: 8px 0;"><strong>Matricule :</strong></td>
                            <td style="padding: 8px 0;">${student.registration_number || '—'}</td>
                        </tr>
                        <tr>
                            <td style="padding: 8px 0;"><strong>Classe :</strong></td>
                            <td style="padding: 8px 0;">${student.class_name || '—'}</td>
                        </tr>
                        ${student.date_of_birth ? `
                        <tr>
                            <td style="padding: 8px 0;"><strong>Date de naissance :</strong></td>
                            <td style="padding: 8px 0;">${student.date_of_birth}</td>
                        </tr>
                        ` : ''}
                        ${student.gender ? `
                        <tr>
                            <td style="padding: 8px 0;"><strong>Genre :</strong></td>
                            <td style="padding: 8px 0;">${student.gender === 'M' ? 'Masculin' : 'Féminin'}</td>
                        </tr>
                        ` : ''}
                    </table>
                </div>

                <div style="background-color: #fff3e0; padding: 20px; border-radius: 8px; margin: 25px 0; border-left: 4px solid #ff9800;">
                    <h3 style="color: #ff9800; margin-top: 0; font-size: 20px;">📚 Résultats par matière</h3>
                    ${subjectsTable}
                </div>

                <div style="background-color: #e3f2fd; padding: 20px; border-radius: 8px; margin: 25px 0; border-left: 4px solid #1976d2;">
                    <h3 style="color: #1976d2; margin-top: 0; font-size: 20px;">🎯 Résultats généraux</h3>
                    <table style="width: 100%; font-size: 16px;">
                        <tr>
                            <td style="padding: 10px 0;"><strong>Moyenne générale :</strong></td>
                            <td style="padding: 10px 0; font-size: 20px; color: #1976d2; font-weight: bold;">${generalAverage}/20</td>
                        </tr>
                        <tr>
                            <td style="padding: 10px 0;"><strong>Rang dans la classe :</strong></td>
                            <td style="padding: 10px 0; font-size: 18px; color: #1976d2; font-weight: bold;">${generalRank}${totalStudents !== '—' ? ` / ${totalStudents}` : ''}</td>
                        </tr>
                    </table>
                </div>

                <div style="text-align: center; margin: 30px 0;">
                    <a href="${frontendUrl || emailConfig.frontendUrl || 'https://lapetiteacademie.ci'}/parent/dashboard" 
                       style="background-color: #2e7d32; color: white; padding: 15px 40px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 16px; display: inline-block;">
                        Voir le bulletin complet dans mon espace parent
                    </a>
                </div>

                <div style="background-color: #fff9c4; padding: 15px; border-radius: 8px; margin: 25px 0; border-left: 4px solid #fbc02d;">
                    <p style="margin: 0; color: #856404; font-size: 14px;">
                        <strong>ℹ️ Note importante :</strong> Ce bulletin est officiel et contient toutes les notes de votre enfant pour cette composition. 
                        Vous pouvez également le consulter à tout moment dans votre espace parent.
                    </p>
                </div>

                <p style="color: #388e3c; font-weight: bold; font-size: 16px; margin-top: 30px;">Merci pour votre confiance.</p>
                <p style="color: #666; font-size: 14px; margin-top: 20px;">
                    Ceci est un message automatique, ne pas répondre directement.<br>
                    Pour toute question, contactez l'administration de l'école.
                </p>
            </div>
        </div>
    `;

    const mailOptions = {
        from: emailConfig.emailConfig.auth.user,
        to: parent_email,
        subject: `Bulletin scolaire - ${compositionName || 'Composition'} - ${studentName} - ${schoolName}`,
        html: htmlContent
    };

    try {
        console.log(`[EMAIL BULLETIN] Envoi du bulletin à ${parent_email} pour ${studentName}`);
        const info = await sendEmailWithRetry(mailOptions);
        console.log(`[EMAIL BULLETIN] Bulletin envoyé avec succès à ${parent_email}`);
        return info;
    } catch (error) {
        console.error('[EMAIL BULLETIN] Erreur lors de l\'envoi du bulletin:', error);
        return { success: false, error: error.message };
    }
};