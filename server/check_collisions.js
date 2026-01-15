require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
});

async function checkCollisions() {
    try {
        const res = await pool.query("SELECT title FROM songs");
        const songs = res.rows;

        const map = new Map();
        let collisions = 0;

        songs.forEach(s => {
            const spaceless = s.title.replace(/\s+/g, '').toLowerCase();
            if (map.has(spaceless)) {
                console.log(`Collision found: "${s.title}" conflicts with "${map.get(spaceless)}" (Both become: ${spaceless})`);
                collisions++;
            } else {
                map.set(spaceless, s.title);
            }
        });

        if (collisions === 0) {
            console.log("No collisions found. It is safe to use spaceless titles.");
        } else {
            console.log(`Found ${collisions} collisions.`);
        }

    } catch (err) {
        console.error(err);
    } finally {
        pool.end();
    }
}

checkCollisions();
