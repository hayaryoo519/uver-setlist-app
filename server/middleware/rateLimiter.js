const rateLimit = require('express-rate-limit');

const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // Limit each IP to 5 login requests per windowMs
    message: {
        message: "ログイン試行回数が多すぎます。15分後にもう一度お試しください。"
    },
    standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
    legacyHeaders: false, // Disable the `X-RateLimit-*` headers
});

// A bit more lenient for password reset requests to prevent DoS
const resetLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 3, // Limit each IP to 3 reset requests per hour
    message: {
        message: "パスワードリセットの回数が多すぎます。1時間後にお試しください。"
    },
    standardHeaders: true,
    legacyHeaders: false,
});

const registerLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 5,
    message: { message: '登録の試行回数が多すぎます。15分後にお試しください。' },
    standardHeaders: true,
    legacyHeaders: false,
});

const verificationLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 5,
    message: { message: 'メール認証の試行回数が多すぎます。15分後にお試しください。' },
    standardHeaders: true,
    legacyHeaders: false,
});

// Email requests and confirmation attempts must not consume each other's quota.
const resetConfirmationLimiter = rateLimit({
    windowMs: 60 * 60 * 1000,
    max: 3,
    message: { message: 'パスワードリセットの回数が多すぎます。1時間後にお試しください。' },
    standardHeaders: true,
    legacyHeaders: false,
});

module.exports = { loginLimiter, resetLimiter, registerLimiter, verificationLimiter, resetConfirmationLimiter };
