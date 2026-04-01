const axios = require('axios');

const apiKey = process.env.TPCLOUD_API_KEY;
const apiToken = process.env.TPCLOUD_API_TOKEN;
const baseUrl = process.env.TPCLOUD_BASE_URL || 'https://panel.smsing.app/smsAPI';
const smsType = process.env.TPCLOUD_SMS_TYPE || 'sms';
const routeId = process.env.TPCLOUD_ROUTE_ID;
const defaultCountryCode = (process.env.SMS_DEFAULT_COUNTRY_CODE || '').replace(/[^0-9]/g, '');
const schoolSenderId = (process.env.SMS_SENDER_ID || 'GS BETHANIE MIRACLE').trim();

const normalizedSenderId = (schoolSenderId.length > 11 ? schoolSenderId.slice(0, 11) : schoolSenderId).toUpperCase();
const smsServiceEnabled = Boolean(apiKey && apiToken);

if (!smsServiceEnabled) {
    console.warn('[SMS] Variables d\'environnement TPCloud manquantes. Envoi SMS désactivé.');
}

const sanitizePhoneNumber = (value) => {
    if (!value) {
        return null;
    }
    const trimmed = value.toString().trim();
    if (!trimmed) {
        return null;
    }

    // Supprimer les espaces, tirets, points, etc.
    const normalized = trimmed.replace(/[^0-9+]/g, '');

    let international = normalized;

    if (normalized.startsWith('+')) {
        international = normalized.slice(1);
    } else if (normalized.startsWith('00')) {
        international = normalized.slice(2);
    } else if (normalized.startsWith('0') && defaultCountryCode) {
        international = `${defaultCountryCode}${normalized.slice(1)}`;
    } else if (defaultCountryCode && /^[0-9]+$/.test(normalized)) {
        international = `${defaultCountryCode}${normalized}`;
    } else if (/^[0-9]+$/.test(normalized)) {
        international = normalized;
    }

    const digitsOnly = international.replace(/[^0-9]/g, '');
    return digitsOnly.length >= 6 ? digitsOnly : null;
};

const formatEventMessage = ({ title, message, eventDate }) => {
    const lines = [];
    if (title) {
        lines.push(title);
    }
    if (message) {
        lines.push(message);
    }
    if (eventDate) {
        lines.push(`Date: ${eventDate}`);
    }
    return lines.filter(Boolean).join('\n');
};

const buildSendUrl = () => {
    if (!baseUrl) {
        return null;
    }
    if (baseUrl.includes('?')) {
        return `${baseUrl}&sendsms`;
    }
    if (baseUrl.endsWith('/')) {
        return `${baseUrl}sendsms`;
    }
    return `${baseUrl}?sendsms`;
};

const sendSMS = async(to, body) => {
    if (!smsServiceEnabled) {
        console.warn('[SMS] Service TPCloud non configuré. Message ignoré.');
        return { skipped: true, reason: 'not_configured', to };
    }

    const url = buildSendUrl();
    if (!url) {
        console.error('[SMS] URL TPCloud invalide.');
        return { success: false, error: 'invalid_url', to };
    }

    const formData = new URLSearchParams();
    formData.append('apikey', apiKey);
    formData.append('apitoken', apiToken);
    formData.append('type', smsType);
    formData.append('from', normalizedSenderId);
    formData.append('to', to);
    formData.append('text', body);

    if (routeId) {
        formData.append('route', routeId);
    }

    try {
        console.log('[SMS] Envoi TPCloud', { to, normalizedSenderId, smsType });

        const response = await axios.post(url, formData.toString(), {
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            timeout: Number(process.env.TPCLOUD_TIMEOUT_MS || 10000)
        });

        const data = response.data;
        const success = data && (data.status === 'queued' || data.status === 'success');

        if (!success) {
            const errorMessage = data && data.message ? data.message : 'Réponse TPCloud inattendue';
            console.error(`[SMS] TPCloud a retourné une erreur pour ${to}:`, errorMessage);
            return { success: false, error: errorMessage, to, response: data };
        }

        return { success: true, to, response: data };
    } catch (error) {
        const message = error.response && error.response.data ? JSON.stringify(error.response.data) : error.message;
        console.error(`[SMS] Erreur lors de l\'envoi TPCloud vers ${to}:`, message);
        return { success: false, error: message, to };
    }
};

const sendBulkSMS = async(phoneNumbers = [], body) => {
    const uniqueNumbers = Array.from(new Set(phoneNumbers.map(sanitizePhoneNumber).filter(Boolean)));

    if (uniqueNumbers.length === 0) {
        return { sent: 0, total: 0, results: [] };
    }

    const results = await Promise.all(uniqueNumbers.map((to) => sendSMS(to, body)));

    const sentCount = results.filter(result => result.success).length;

    return {
        sent: sentCount,
        total: uniqueNumbers.length,
        results
    };
};

const sendEventNotificationSMS = async(phoneNumbers, { title, message, eventDate }) => {
    const body = formatEventMessage({ title, message, eventDate });
    return sendBulkSMS(phoneNumbers, body);
};

module.exports = {
    sendBulkSMS,
    sendEventNotificationSMS,
    smsServiceEnabled,
    sanitizePhoneNumber
};