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
    }
});

module.exports = { loginLimiter, resetLimiter };
