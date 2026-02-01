const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME
});

const migrate = async () => {
    try {
        console.log("Creating corrections table...");

        await pool.query(`
            CREATE TABLE IF NOT EXISTS corrections (
                id SERIAL PRIMARY KEY,
                user_id INTEGER NOT NULL,
                live_id INTEGER,
                
                -- User input for live info (for generic form)
                live_date TEXT,
                live_venue TEXT,
                live_title TEXT,
                
                -- Correction details
                correction_type VARCHAR(50) NOT NULL,
                description TEXT NOT NULL,
                
                -- Status and review info
                status VARCHAR(20) DEFAULT 'pending',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                reviewed_at TIMESTAMP,
                reviewed_by INTEGER,
                admin_note TEXT,
                
                CONSTRAINT fk_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
                CONSTRAINT fk_live FOREIGN KEY (live_id) REFERENCES lives(id) ON DELETE SET NULL,
                CONSTRAINT fk_reviewer FOREIGN KEY (reviewed_by) REFERENCES users(id) ON DELETE SET NULL
            )
        `);
        console.log("✅ Created 'corrections' table.");

        // Create index for faster queries
        await pool.query(`
            CREATE INDEX IF NOT EXISTS idx_corrections_user_id ON corrections(user_id);
        `);
        console.log("✅ Created index on user_id.");

        await pool.query(`
            CREATE INDEX IF NOT EXISTS idx_corrections_status ON corrections(status);
        `);
        console.log("✅ Created index on status.");

        await pool.query(`
            CREATE INDEX IF NOT EXISTS idx_corrections_live_id ON corrections(live_id);
        `);
        console.log("✅ Created index on live_id.");

        await pool.query(`
            CREATE INDEX IF NOT EXISTS idx_corrections_created_at ON corrections(created_at);
        `);
        console.log("✅ Created index on created_at.");

        console.log("\n🎉 Migration complete!");
    } catch (err) {
        console.error("❌ Migration failed:", err.message);
    } finally {
        await pool.end();
    }
};

migrate();
