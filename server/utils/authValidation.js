const isValidEmail = value => typeof value === 'string' && value.length <= 255 && /^[^\s@]+@[^\s@]+$/.test(value);
const isValidUsername = value => typeof value === 'string' && value.trim().length >= 2 && value.length <= 30;
const isValidLoginPassword = value => typeof value === 'string' && value.length > 0;
const isValidToken = value => typeof value === 'string' && value.length > 0 && value.length <= 256 && value.trim().length > 0;

const newPasswordError = value => {
    if (typeof value !== 'string' || value.length < 6) return 'パスワードは6文字以上で設定してください';
    // bcrypt ignores bytes after the 72-byte boundary; reject new truncated credentials.
    if (Buffer.byteLength(value, 'utf8') > 72) return 'パスワードが長すぎます。短くして設定してください。';
    return null;
};

module.exports = { isValidEmail, isValidUsername, isValidLoginPassword, isValidToken, newPasswordError };
