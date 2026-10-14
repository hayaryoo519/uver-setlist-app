const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env'), quiet: true });
const { getEmailConfiguration } = require('../utils/emailConfiguration');

const run = async () => {
    if (process.argv.slice(2).some(arg => arg !== '--smtp')) throw new Error('Unsupported option');
    if (!getEmailConfiguration().enabled) throw new Error('Email delivery is disabled');
    const checkSmtp = process.argv.includes('--smtp');
    if (checkSmtp) await require('../utils/email').verifyEmailConnection();
    process.stdout.write(JSON.stringify({ email_configuration_valid: true, smtp_authentication_verified: checkSmtp, inbox_delivery_verified: false }) + '\n');
};
run().catch(() => {
    process.stderr.write('Email readiness check failed; details suppressed\n');
    process.exitCode = 1;
});
