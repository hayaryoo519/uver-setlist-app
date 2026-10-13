const jwt = require("jsonwebtoken");
const db = require('../db');
require("dotenv").config();

// Resolve signed identity against the current account, never trusting a stored role.
const getCurrentUser = async token => {
    if (!token) return null;
    let payload;
    try {
        payload = jwt.verify(token, process.env.JWT_SECRET);
    } catch (_) {
        return null;
    }
    if (!Number.isInteger(payload.user_id) || payload.user_id <= 0) return null;

    let result;
    try {
        result = await db.query('SELECT id, role FROM users WHERE id = $1 AND deleted_at IS NULL', [payload.user_id]);
    } catch (_) {
        console.error('[AUTH ERROR] Account lookup failed');
        // Optional-auth routes also receive a fixed error without DB diagnostics.
        throw new Error('Account verification failed');
    }
    if (result.rows.length !== 1) return null;
    return { ...payload, user_id: result.rows[0].id, role: result.rows[0].role };
};

const getOptionalUserId = async req => (await getCurrentUser(req.header('token')))?.user_id ?? null;

// Standard authorization (checks if logged in)
const authorize = async (req, res, next) => {
    try {
        const jwtToken = req.header("token");

        if (!jwtToken) {
            console.warn("[AUTH] No token provided");
            return res.status(403).json({ message: "認証されていません：トークンがありません" });
        }

        const user = await getCurrentUser(jwtToken);
        if (!user) {
            console.error("[AUTH ERROR] Token verification failed");
            return res.status(403).json({ message: "認証されていません：無効なトークンです" });
        }
        req.user = user;
        next();
    } catch (err) {
        return res.status(503).json({ message: "認証情報の確認に失敗しました。時間をおいて再度お試しください" });
    }
};

// Admin check (checks if user has admin role)
const adminCheck = (req, res, next) => {
    if (!req.user || req.user.role !== 'admin') {
        console.warn('[ADMIN CHECK] Access denied');
        return res.status(403).json({ message: "アクセス拒否：管理者権限が必要です" });
    }
    next();
};

module.exports = { authorize, adminCheck, getCurrentUser, getOptionalUserId };
