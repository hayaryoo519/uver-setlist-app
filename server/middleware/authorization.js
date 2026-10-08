const jwt = require("jsonwebtoken");
require("dotenv").config();

// Standard authorization (checks if logged in)
const authorize = async (req, res, next) => {
    try {
        const jwtToken = req.header("token");

        if (!jwtToken) {
            console.warn("[AUTH] No token provided");
            return res.status(403).json({ message: "認証されていません：トークンがありません" });
        }

        const payload = jwt.verify(jwtToken, process.env.JWT_SECRET);
        req.user = payload;
        next();
    } catch (err) {
        console.error("[AUTH ERROR] Token verification failed");
        return res.status(403).json({ message: "認証されていません：無効なトークンです" });
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

module.exports = { authorize, adminCheck };
