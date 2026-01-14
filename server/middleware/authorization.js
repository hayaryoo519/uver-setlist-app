const jwt = require("jsonwebtoken");
require("dotenv").config();

// Standard authorization (checks if logged in)
const authorize = async (req, res, next) => {
    try {
        const jwtToken = req.header("token");

        if (!jwtToken) {
            return res.status(403).json("Not Authorized");
        }

        const payload = jwt.verify(jwtToken, process.env.JWT_SECRET || 'secret_key');
        req.user = payload;
        next();
    } catch (err) {
        console.error(err.message);
        return res.status(403).json("Not Authorized");
    }
};

// Admin check (checks if user has admin role)
const adminCheck = (req, res, next) => {
    if (!req.user || req.user.role !== 'admin') {
        return res.status(403).json("Access Denied: Admins only");
    }
    next();
};

module.exports = { authorize, adminCheck };
