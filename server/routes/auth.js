const router = require('express').Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const db = require('../db');

const { hashToken, createToken } = require('../utils/authTokens');
const { sendVerificationEmail, sendPasswordResetEmail } = require('../utils/email');
const { loginLimiter, resetLimiter, registerLimiter, verificationLimiter, resetConfirmationLimiter } = require('../middleware/rateLimiter');
const { isValidEmail, isValidUsername, isValidLoginPassword, isValidToken, newPasswordError } = require('../utils/authValidation');

const registrationResponse = {
    message: '登録を受け付けました。登録可能な場合は認証メールが届きます。登録済みの場合はログインまたはパスワード再設定をお試しください。',
    requireVerification: true
};
const resetRequestResponse = { message: '入力したメールアドレスに対応するアカウントがある場合、パスワード再設定用のメールが届きます。' };
// A valid cost-10 hash keeps unknown-user attempts on the same bcrypt path.
const dummyPasswordHash = '$2b$10$fFGx1Y4tcVNfQ9S0sTibwuSFDE1jwadFRu2KfHTdtHALo.duP1WvK';

// Register API
router.post('/register', registerLimiter, async (req, res) => {
    try {
        const { username, email, password, is_public } = req.body || {};

        // 1. Validate input
        if (!isValidUsername(username)) {
            return res.status(400).json({ message: "ユーザー名は2文字以上30文字以内で入力してください" });
        }
        if (!isValidEmail(email)) return res.status(400).json({ message: '有効なメールアドレスを入力してください' });
        const passwordError = newPasswordError(password);
        if (passwordError) return res.status(400).json({ message: passwordError });
        if (is_public !== undefined && typeof is_public !== 'boolean') return res.status(400).json({ message: '公開設定が不正です' });

        // Hash every valid request, including an already registered address.
        const saltRound = 10;
        const salt = await bcrypt.genSalt(saltRound);
        const bcryptPassword = await bcrypt.hash(password, salt);

        // 3. Generate verification token
        const verification = createToken(24 * 60 * 60 * 1000);

        // 4. Insert into DB (is_verified default false)
        const isPublic = is_public !== false;
        const newUser = await db.query(
            "INSERT INTO users (username, email, password, is_verified, verification_token_hash, verification_token_expires, is_public) VALUES ($1, $2, $3, $4, $5, $6, $7) ON CONFLICT (email) DO NOTHING RETURNING id",
            [username, email, bcryptPassword, false, verification.hash, verification.expires, isPublic]
        );

        // Delivery latency and failures must not reveal whether the address exists.
        res.json(registrationResponse);
        if (newUser.rows.length > 0) {
            try {
                await sendVerificationEmail(email, verification.token);
            } catch (err) {
                console.error('Register Error: verification email delivery failed');
            }
        }

    } catch (err) {
        console.error("Register Error: registration failed");
        res.status(500).json({ message: "サーバーエラーが発生しました" });
    }
});

// Verify Email API
router.post('/verify-email', verificationLimiter, async (req, res) => {
    try {
        const { token } = req.body || {};
        if (!isValidToken(token)) return res.status(400).json({ message: '無効なトークンです' });

        // Consume once, even when two requests arrive before either has completed.
        const user = await db.query(
            "UPDATE users SET is_verified = TRUE, verification_token = NULL, verification_token_hash = NULL, verification_token_expires = NULL WHERE (verification_token_hash = $1 OR (verification_token_hash IS NULL AND verification_token = $2)) AND verification_token_expires > $3 AND is_verified = FALSE AND deleted_at IS NULL RETURNING id, username, email, role, session_version",
            [hashToken(token), token, Date.now()]
        );

        if (user.rows.length === 0) {
            return res.status(400).json({ message: "無効なトークンです" });
        }

        // Generate Login Token
        const jwtToken = jwt.sign(
            { user_id: user.rows[0].id, role: user.rows[0].role, session_version: user.rows[0].session_version },
            process.env.JWT_SECRET,
            { expiresIn: "1h" }
        );

        res.json({ token: jwtToken, user: { id: user.rows[0].id, username: user.rows[0].username, email: user.rows[0].email, role: user.rows[0].role } });

    } catch (err) {
        console.error("Verification Error: email verification failed");
        res.status(500).json({ message: "サーバーエラーが発生しました" });
    }
});

// Login API
router.post('/login', loginLimiter, async (req, res) => {
    try {
        const { email, password } = req.body || {};
        if (!isValidEmail(email) || !isValidLoginPassword(password)) return res.status(400).json({ message: 'メールアドレスとパスワードを正しく入力してください' });
        const user = await db.query("SELECT * FROM users WHERE email = $1 AND deleted_at IS NULL", [email]);
        const validPassword = await bcrypt.compare(password, user.rows[0]?.password || dummyPasswordHash);

        if (user.rows.length === 0) {
            // Log failed login attempt - user not found
            await db.query(`
                INSERT INTO security_logs (event_type, message, user_email, ip_address)
                VALUES ($1, $2, $3, $4)
            `, ['login_failed', 'ユーザーが存在しません', email, req.ip]).catch(err => {
                console.error('Failed to log security event');
            });

            return res.status(401).json({ message: "メールアドレスまたはパスワードが間違っています" });
        }

        if (!validPassword) {
            // Log failed login attempt - invalid password
            await db.query(`
                INSERT INTO security_logs (event_type, message, user_email, ip_address)
                VALUES ($1, $2, $3, $4)
            `, ['login_failed', 'パスワード不一致', email, req.ip]).catch(err => {
                console.error('Failed to log security event');
            });

            return res.status(401).json({ message: "メールアドレスまたはパスワードが間違っています" });
        }

        // This account-specific guidance is safe only after checking the password.
        if (user.rows[0].is_verified === false) {
            return res.status(401).json({
                message: "メールアドレスが認証されていません。メールを確認してください。",
                requireVerification: true
            });
        }

        // ログイン成功をセキュリティログに記録
        await db.query(`
            INSERT INTO security_logs (event_type, message, user_email, ip_address)
            VALUES ($1, $2, $3, $4)
        `, ['login_success', 'ログイン成功', email, req.ip]).catch(err => {
            console.error('Failed to log security event');
        });

        const token = jwt.sign(
            { user_id: user.rows[0].id, role: user.rows[0].role, session_version: user.rows[0].session_version },
            process.env.JWT_SECRET,
            { expiresIn: "1h" }
        );
        res.json({ token, user: { id: user.rows[0].id, username: user.rows[0].username, email: user.rows[0].email, role: user.rows[0].role } });
    } catch (err) {
        console.error("Login Error: authentication processing failed");

        // Log system error
        await db.query(`
            INSERT INTO security_logs (event_type, message, details)
            VALUES ($1, $2, $3)
        `, ['error', 'ログイン処理中のエラー', JSON.stringify({ error: 'Authentication processing failed' })]).catch(e => {
            console.error('Failed to log error');
        });

        res.status(500).json({ message: "Internal Server Error" });
    }
});

// Forgot Password API
router.post('/forgot-password', resetLimiter, async (req, res) => {
    const { email } = req.body || {};
    if (!isValidEmail(email)) return res.status(400).json({ message: '有効なメールアドレスを入力してください' });
    // Accept before account lookup, so lookup and SMTP timing cannot identify users.
    res.json(resetRequestResponse);
    try {
        const user = await db.query('SELECT * FROM users WHERE email = $1 AND deleted_at IS NULL', [email]);

        if (user.rows.length === 0) {
            return;
        }

        const reset = createToken(3600000); // 1 hour

        const updated = await db.query(
            "UPDATE users SET reset_password_token = NULL, reset_password_token_hash = $1, reset_password_expires = $2 WHERE id = $3 AND deleted_at IS NULL RETURNING id",
            [reset.hash, reset.expires, user.rows[0].id]
        );

        if (updated.rows.length > 0) await sendPasswordResetEmail(email, reset.token);

    } catch (err) {
        console.error("Forgot Password Error: reset email processing failed");
    }
});

// Reset Password API
router.post('/reset-password', resetConfirmationLimiter, async (req, res) => {
    try {
        const { token, password } = req.body || {};
        if (!isValidToken(token)) return res.status(400).json({ message: '無効なトークンです' });
        const passwordError = newPasswordError(password);
        if (passwordError) return res.status(400).json({ message: passwordError });

        const user = await db.query(
            "SELECT * FROM users WHERE (reset_password_token_hash = $1 OR (reset_password_token_hash IS NULL AND reset_password_token = $2)) AND reset_password_expires > $3 AND deleted_at IS NULL",
            [hashToken(token), token, Date.now()]
        );

        if (user.rows.length === 0) {
            return res.status(400).json({ message: "無効または期限切れのトークンです。再度手続きを行ってください。" });
        }

        // Hash new password
        const saltRound = 10;
        const salt = await bcrypt.genSalt(saltRound);
        const bcryptPassword = await bcrypt.hash(password, salt);

        // Atomically consume the reset token and revoke all previous sessions.
        const updated = await db.query(
            "UPDATE users SET password = $1, reset_password_token = NULL, reset_password_token_hash = NULL, reset_password_expires = NULL, session_version = session_version + 1 WHERE id = $2 AND (reset_password_token_hash = $3 OR (reset_password_token_hash IS NULL AND reset_password_token = $4)) AND reset_password_expires > $5 AND deleted_at IS NULL RETURNING id",
            [bcryptPassword, user.rows[0].id, hashToken(token), token, Date.now()]
        );
        if (updated.rowCount === 0) {
            return res.status(400).json({ message: "無効または期限切れのトークンです。再度手続きを行ってください。" });
        }

        res.json({ message: "パスワードの再設定が完了しました。新しいパスワードでログインしてください。" });
    } catch (err) {
        console.error("Reset Password Error: password reset failed");
        res.status(500).json({ message: "サーバーエラーが発生しました" });
    }
});

module.exports = router;
