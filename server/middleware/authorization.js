const jwt = require("jsonwebtoken");
require("dotenv").config();

// Standard authorization (checks if logged in)
const authorize = async (req, res, next) => {
    try {
        const jwtToken = req.header("token");

        if (!jwtToken) {
            console.warn("[AUTH] No token provided");
            return res.status(403).json({ message: "Not Authorized: No token provided" });
        }

        const payload = jwt.verify(jwtToken, process.env.JWT_SECRET || 'secret_key');
        req.user = payload;
        next();
    } catch (err) {
        console.error("[AUTH ERROR]", err.message);
        return res.status(403).json({ message: "Not Authorized: Invalid token" });
    }
};

// Admin check (checks if user has admin role)
const adminCheck = (req, res, next) => {
    if (!req.user || req.user.role !== 'admin') {
        console.warn(`[ADMIN CHECK] Access Denied for user_id: ${req.user?.user_id}, role: ${req.user?.role}`);
        return res.status(403).json({ message: "Access Denied: Admins only" });
    }
    next();
};

module.exports = { authorize, adminCheck };
