const router = require('express').Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const db = require('../db');

const crypto = require('crypto');
const { sendVerificationEmail, sendPasswordResetEmail } = require('../utils/email');
const { loginLimiter, resetLimiter } = require('../middleware/rateLimiter');

// Register API
router.post('/register', async (req, res) => {
    try {
        const { username, email, password } = req.body;

        // 1. Validate input
        if (!username || username.trim().length < 2 || username.length > 30) {
            return res.status(400).json({ message: "ユーザー名は2文字以上30文字以内で入力してください" });
        }

        // 2. Check if user exists
        const userCheck = await db.query('SELECT * FROM users WHERE email = $1', [email]);
        if (userCheck.rows.length > 0) {
            return res.status(400).json({ message: "このメールアドレスは既に登録されています" });
        }

        // 2. Hash password
        const saltRound = 10;
        const salt = await bcrypt.genSalt(saltRound);
        const bcryptPassword = await bcrypt.hash(password, salt);

        // 3. Generate verification token
        const verificationToken = crypto.randomBytes(32).toString('hex');

        // 4. Insert into DB (is_verified default false)
        const newUser = await db.query(
            "INSERT INTO users (username, email, password, is_verified, verification_token) VALUES ($1, $2, $3, $4, $5) RETURNING *",
            [username, email, bcryptPassword, false, verificationToken]
        );

        // 5. Send Verification Email
        await sendVerificationEmail(email, verificationToken);

        // Don't return token yet, require verification
        res.json({
            message: "登録が完了しました。メールを確認して認証を行ってください。",
            requireVerification: true
        });

    } catch (err) {
        console.error("Register Error:", err);
        res.status(500).json({ message: "サーバーエラーが発生しました" });
    }
});

// Verify Email API
router.post('/verify-email', async (req, res) => {
    try {
        const { token } = req.body;

        const user = await db.query("SELECT * FROM users WHERE verification_token = $1", [token]);

        if (user.rows.length === 0) {
            return res.status(400).json({ message: "無効なトークンです" });
        }

        // Update user to verified
        await db.query("UPDATE users SET is_verified = TRUE, verification_token = NULL WHERE id = $1", [user.rows[0].id]);

        // Generate Login Token
        const jwtToken = jwt.sign(
            { user_id: user.rows[0].id, role: user.rows[0].role },
            process.env.JWT_SECRET,
            { expiresIn: "1h" }
        );

        res.json({ token: jwtToken, user: { id: user.rows[0].id, username: user.rows[0].username, email: user.rows[0].email, role: user.rows[0].role } });

    } catch (err) {
        console.error("Verification Error:", err);
        res.status(500).json({ message: "サーバーエラーが発生しました" });
    }
});

// Login API
router.post('/login', loginLimiter, async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await db.query("SELECT * FROM users WHERE email = $1", [email]);

        if (user.rows.length === 0) {
            // Log failed login attempt - user not found
            await db.query(`
                INSERT INTO security_logs (event_type, message, user_email, ip_address)
                VALUES ($1, $2, $3, $4)
            `, ['login_failed', 'ユーザーが存在しません', email, req.ip]).catch(err => {
                console.error('Failed to log security event:', err);
            });

            return res.status(401).json({ message: "メールアドレスまたはパスワードが間違っています" });
        }

        // Check if verified
        if (user.rows[0].is_verified === false) {
            return res.status(401).json({
                message: "メールアドレスが認証されていません。メールを確認してください。",
                requireVerification: true
            });
        }

        const validPassword = await bcrypt.compare(password, user.rows[0].password);
        if (!validPassword) {
            // Log failed login attempt - invalid password
            await db.query(`
                INSERT INTO security_logs (event_type, message, user_email, ip_address)
                VALUES ($1, $2, $3, $4)
            `, ['login_failed', 'パスワード不一致', email, req.ip]).catch(err => {
                console.error('Failed to log security event:', err);
            });

            return res.status(401).json({ message: "メールアドレスまたはパスワードが間違っています" });
        }

        // ログイン成功をセキュリティログに記録
        await db.query(`
            INSERT INTO security_logs (event_type, message, user_email, ip_address)
            VALUES ($1, $2, $3, $4)
        `, ['login_success', 'ログイン成功', email, req.ip]).catch(err => {
            console.error('Failed to log security event:', err);
        });

        const token = jwt.sign(
            { user_id: user.rows[0].id, role: user.rows[0].role },
            process.env.JWT_SECRET,
            { expiresIn: "1h" }
        );
        res.json({ token, user: { id: user.rows[0].id, username: user.rows[0].username, email: user.rows[0].email, role: user.rows[0].role } });
    } catch (err) {
        console.error("Login Error:", err);

        // Log system error
        await db.query(`
            INSERT INTO security_logs (event_type, message, details)
            VALUES ($1, $2, $3)
        `, ['error', 'ログイン処理中のエラー', JSON.stringify({ error: err.message })]).catch(e => {
            console.error('Failed to log error:', e);
        });

        res.status(500).json({ message: "Internal Server Error" });
    }
});

// Forgot Password API
router.post('/forgot-password', resetLimiter, async (req, res) => {
    try {
        const { email } = req.body;
        const user = await db.query('SELECT * FROM users WHERE email = $1', [email]);

        if (user.rows.length === 0) {
            // For security, don't reveal if user exists. 
            // Just return success message.
            return res.json({ message: "パスワード再設定用のメールを送信しました。メールをご確認ください。" });
        }

        const token = crypto.randomBytes(32).toString('hex');
        const expires = Date.now() + 3600000; // 1 hour

        await db.query(
            "UPDATE users SET reset_password_token = $1, reset_password_expires = $2 WHERE id = $3",
            [token, expires, user.rows[0].id]
        );

        await sendPasswordResetEmail(email, token);

        res.json({ message: "パスワード再設定用のメールを送信しました。メールをご確認ください。" });
    } catch (err) {
        console.error("Forgot Password Error:", err);
        res.status(500).json({ message: "サーバーエラーが発生しました" });
    }
});

// Reset Password API
router.post('/reset-password', resetLimiter, async (req, res) => {
    try {
        const { token, password } = req.body;

        const user = await db.query(
            "SELECT * FROM users WHERE reset_password_token = $1 AND reset_password_expires > $2",
            [token, Date.now()]
        );

        if (user.rows.length === 0) {
            return res.status(400).json({ message: "無効または期限切れのトークンです。再度手続きを行ってください。" });
        }

        // Hash new password
        const saltRound = 10;
        const salt = await bcrypt.genSalt(saltRound);
        const bcryptPassword = await bcrypt.hash(password, salt);

        // Update password and clear token
        await db.query(
            "UPDATE users SET password = $1, reset_password_token = NULL, reset_password_expires = NULL WHERE id = $2",
            [bcryptPassword, user.rows[0].id]
        );

        res.json({ message: "パスワードの再設定が完了しました。新しいパスワードでログインしてください。" });
    } catch (err) {
        console.error("Reset Password Error:", err);
        res.status(500).json({ message: "サーバーエラーが発生しました" });
    }
});

module.exports = router;
