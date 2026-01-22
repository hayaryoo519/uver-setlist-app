const router = require('express').Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const db = require('../db');

// Register API
router.post('/register', async (req, res) => {
    try {
        const { username, email, password } = req.body;

        // 1. Check if user exists
        const userCheck = await db.query('SELECT * FROM users WHERE email = $1', [email]);
        if (userCheck.rows.length > 0) {
            return res.status(401).json("このメールアドレスは既に登録されています");
        }

        // 2. Hash password
        const saltRound = 10;
        const salt = await bcrypt.genSalt(saltRound);
        const bcryptPassword = await bcrypt.hash(password, salt);

        // 3. Insert into DB
        const newUser = await db.query(
            "INSERT INTO users (username, email, password) VALUES ($1, $2, $3) RETURNING *",
            [username, email, bcryptPassword]
        );

        // 4. Generate Token (Include role for stateless authorization)
        const token = jwt.sign(
            { user_id: newUser.rows[0].id, role: newUser.rows[0].role },
            process.env.JWT_SECRET || 'secret_key',
            { expiresIn: "1h" }
        );

        res.json({ token, user: { id: newUser.rows[0].id, username: newUser.rows[0].username, email: newUser.rows[0].email, role: newUser.rows[0].role } });

    } catch (err) {
        console.error("Register Error:", err);
        res.status(500).json({ message: "サーバーエラーが発生しました" });
    }
});

// Login API (Placeholder for next step)
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await db.query("SELECT * FROM users WHERE email = $1", [email]);

        if (user.rows.length === 0) {
            return res.status(401).json("メールアドレスまたはパスワードが間違っています");
        }

        const validPassword = await bcrypt.compare(password, user.rows[0].password);
        if (!validPassword) {
            return res.status(401).json("メールアドレスまたはパスワードが間違っています");
        }

        const token = jwt.sign(
            { user_id: user.rows[0].id, role: user.rows[0].role },
            process.env.JWT_SECRET || 'secret_key',
            { expiresIn: "1h" }
        );
        res.json({ token, user: { id: user.rows[0].id, username: user.rows[0].username, email: user.rows[0].email, role: user.rows[0].role } });
    } catch (err) {
        console.error("Login Error:", err);
        res.status(500).json({ message: "Internal Server Error" });
    }
});

module.exports = router;
