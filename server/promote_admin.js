const pool = require('./db');

const promoteUserToAdmin = async () => {
    try {
        console.log("Promoting user to admin...");
        // Promote the first user found or a specific email if known. 
        // For now, let's promote all users for simplicity in this dev environment, 
        // or just list them to let me pick.
        // Actually, let's just promote 'oaulth@gmail.com' if it exists, or the first user.

        const updateRes = await pool.query(
            "UPDATE users SET role = 'admin' RETURNING *"
        );

        console.log("Updated Users:", updateRes.rows.map(u => ({ id: u.id, email: u.email, role: u.role })));
        process.exit(0);
    } catch (err) {
        console.error(err.message);
        process.exit(1);
    }
};

promoteUserToAdmin();
