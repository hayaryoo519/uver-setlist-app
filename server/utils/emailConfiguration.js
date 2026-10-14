const getEmailConfiguration = () => {
    const user = process.env.EMAIL_USER;
    const password = process.env.EMAIL_PASS;
    // Only explicitly selected development/test modes may skip delivery.
    const production = !['development', 'test'].includes(process.env.NODE_ENV);
    const credentialsReady = typeof user === 'string' && /^[^\s@<>,;"]+@[^\s@<>,;"]+$/.test(user)
        && !/your_email/i.test(user) && typeof password === 'string' && password.trim().length > 0
        && !/your_app_password/i.test(password);
    if (!credentialsReady) {
        if (!production) return { enabled: false };
        throw new Error('Email configuration is invalid');
    }
    let url;
    try { url = new URL(process.env.APP_URL || (production ? '' : 'http://localhost:5173')); }
    catch (err) { throw new Error('Email configuration is invalid'); }
    if (!['http:', 'https:'].includes(url.protocol) || (production && url.protocol !== 'https:')
        || url.username || url.password || url.search || url.hash || url.pathname !== '/'
        || (production && ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname))) {
        throw new Error('Email configuration is invalid');
    }
    return { enabled: true, appUrl: url.origin };
};

module.exports = { getEmailConfiguration };
