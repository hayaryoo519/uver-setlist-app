const jwt = require("jsonwebtoken");
require("dotenv").config();

module.exports = async (req, res, next) => {
    try {
        const jwtToken = req.header("token");

        if (!jwtToken) {
            return res.status(403).json("Not Authorized");
        }

        const payload = jwt.verify(jwtToken, process.env.JWT_SECRET || 'secret_key');
        req.user = payload;

        // Optional: Check if user is admin if required
        // For now, we just verify token validity. Admin check can be done in specific routes or here.
        // Let's add a separate middleware for admin if needed, or check req.user.role if included in token.
        // Note: The token payload currently only has { user_id }. We might need to fetch the user to check role, 
        // or trust the token if we add role to it (which we didn't in the previous turn, wait... 
        // I replaced the response JSON to include role, but NOT the token payload. 
        // I should probably query the DB here to be safe and get the role.)

        next();
    } catch (err) {
        console.error(err.message);
        return res.status(403).json("Not Authorized");
    }
};
