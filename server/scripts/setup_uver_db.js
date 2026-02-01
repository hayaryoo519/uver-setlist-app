const { Pool } = require('pg');

const config = {
    host: 'localhost',
    port: 54332,
    user: 'postgres',
    password: 'postgres',
    database: 'postgres'
};

async function setup() {
    console.log("Starting DB Setup...");

    // 1. Create Database
    const rootPool = new Pool(config);
    try {
        // Check if db exists
        const res = await rootPool.query("SELECT 1 FROM pg_database WHERE datname = 'uver_app_db'");
        if (res.rowCount === 0) {
            console.log("Creating database 'uver_app_db'...");
            await rootPool.query("CREATE DATABASE uver_app_db");
        } else {
            console.log("Database 'uver_app_db' already exists.");
        }
    } catch (e) {
        console.error("Error checking/creating DB:", e);
    } finally {
        await rootPool.end();
    }

    // 2. Connect to New DB and Create Tables
    const appPool = new Pool({ ...config, database: 'uver_app_db' });

    try {
        console.log("Connecting to uver_app_db...");

        // Users Table
        await appPool.query(`
            CREATE TABLE IF NOT EXISTS users (
                id SERIAL PRIMARY KEY,
                username VARCHAR(255),
                email VARCHAR(255) UNIQUE NOT NULL,
                password VARCHAR(255) NOT NULL,
                role VARCHAR(50) DEFAULT 'user',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);

        // Lives Table
        await appPool.query(`
            CREATE TABLE IF NOT EXISTS lives (
                id SERIAL PRIMARY KEY,
                date DATE NOT NULL,
                venue VARCHAR(255) NOT NULL,
                title VARCHAR(255),
                tour_name VARCHAR(255),
                type VARCHAR(50),
                prefecture VARCHAR(50)
            );
        `);

        // Songs Table
        await appPool.query(`
            CREATE TABLE IF NOT EXISTS songs (
                id SERIAL PRIMARY KEY,
                title VARCHAR(255) UNIQUE NOT NULL,
                album VARCHAR(255),
                release_year INTEGER,
                mv_url VARCHAR(255),
                author VARCHAR(255)
            );
        `);

        // Setlists Table
        await appPool.query(`
            CREATE TABLE IF NOT EXISTS setlists (
                id SERIAL PRIMARY KEY,
                live_id INTEGER REFERENCES lives(id) ON DELETE CASCADE,
                song_id INTEGER REFERENCES songs(id) ON DELETE CASCADE,
                position INTEGER,
                note VARCHAR(255)
            );
        `);

        // Attendance Table
        await appPool.query(`
            CREATE TABLE IF NOT EXISTS attendance (
                user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
                live_id INTEGER REFERENCES lives(id) ON DELETE CASCADE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                PRIMARY KEY (user_id, live_id)
            );
        `);

        console.log("All tables created successfully!");

    } catch (e) {
        console.error("Error creating tables:", e);
    } finally {
        await appPool.end();
        process.exit();
    }
}

setup();
