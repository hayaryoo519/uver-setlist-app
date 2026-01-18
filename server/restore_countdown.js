const db = require('./db');

(async () => {
    try {
        // Countdownを復元（CNBLUE × TAKUYA∞ コラボ曲）
        const result = await db.query(
            "INSERT INTO songs (title, album) VALUES ('Countdown', 'Single') RETURNING id"
        );
        console.log('Restored Countdown with ID:', result.rows[0].id);
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
})();
