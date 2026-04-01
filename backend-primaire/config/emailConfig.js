// Configuration Email pour l'envoi des identifiants
// 
// Pour utiliser Gmail :
// 1. Activez l'authentification à 2 facteurs sur votre compte Google
// 2. Générez un "mot de passe d'application" spécifique pour cette app
// 3. Utilisez ce mot de passe d'application dans EMAIL_PASSWORD

module.exports = {
    emailConfig: {
        // Configuration SMTP pour Bethanie Miracle
        host: process.env.SMTP_HOST || 'mail.bethaniemiracle.com',
        port: parseInt(process.env.SMTP_PORT) || 465,
        secure: true, // Port 465 nécessite SSL/TLS
        auth: {
            user: process.env.MAIL_USER || 'infos@bethaniemiracle.com',
            pass: process.env.MAIL_PASS || '4E@tlD,3fS6p(}GF'
        },
        // Configuration TLS pour port 465 (SSL)
        tls: {
            rejectUnauthorized: false,
            ciphers: 'SSLv3'
        },
        // Timeout pour éviter les blocages
        connectionTimeout: 60000,
        greetingTimeout: 30000,
        socketTimeout: 60000,
        // Configuration pour améliorer la délivrabilité
        pool: true,
        maxConnections: 5,
        maxMessages: 100,
        rateLimit: 14, // Limite à 14 emails par seconde
        // Configuration pour éviter les blocages
        logger: false,
        debug: true, // Activé temporairement pour debug
        // Configuration DKIM si disponible
        dkim: process.env.DKIM_PRIVATE_KEY ? {
            domainName: process.env.DKIM_DOMAIN,
            keySelector: process.env.DKIM_SELECTOR,
            privateKey: process.env.DKIM_PRIVATE_KEY
        } : undefined
    },

    // URL de l'application frontend
    frontendUrl: process.env.FRONTEND_URL || 'https://bethaniemiracle.com',

    // Nom de l'établissement
    schoolName: process.env.SCHOOL_NAME || 'BETHANIE MIRACLE',

    // Configuration pour différents fournisseurs SMTP
    smtpProviders: {
        gmail: {
            host: 'smtp.gmail.com',
            port: 587,
            secure: false,
            auth: {
                user: process.env.GMAIL_USER,
                pass: process.env.GMAIL_APP_PASSWORD
            }
        },
        outlook: {
            host: 'smtp-mail.outlook.com',
            port: 587,
            secure: false,
            auth: {
                user: process.env.OUTLOOK_USER,
                pass: process.env.OUTLOOK_PASSWORD
            }
        },
        yahoo: {
            host: 'smtp.mail.yahoo.com',
            port: 587,
            secure: false,
            auth: {
                user: process.env.YAHOO_USER,
                pass: process.env.YAHOO_APP_PASSWORD
            }
        },
        // Pour les hébergeurs web
        cpanel: {
            host: process.env.CPANEL_SMTP_HOST,
            port: process.env.CPANEL_SMTP_PORT || 587,
            secure: process.env.CPANEL_SMTP_SECURE === 'true',
            auth: {
                user: process.env.CPANEL_EMAIL,
                pass: process.env.CPANEL_EMAIL_PASSWORD
            }
        },
        // Configuration spécifique pour TPE Cloud
        tpecloud: {
            host: process.env.SMTP_HOST || 'mail.bethaniemiracle.com',
            port: process.env.SMTP_PORT || 587, // TPE Cloud utilise souvent le port 587
            secure: false, // TPE Cloud utilise souvent STARTTLS (secure: false)
            auth: {
                user: process.env.MAIL_USER || 'infos@bethaniemiracle.com',
                pass: process.env.MAIL_PASS || '4E@tlD,3fS6p(}GF'
            },
            tls: {
                rejectUnauthorized: false,
                ciphers: 'SSLv3'
            }
        }
    }
};