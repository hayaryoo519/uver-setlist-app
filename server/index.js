const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const app = express();
const PORT = process.env.PORT || 4000;

// Middleware
app.use(helmet()); // Sets standard security headers
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/lives', require('./routes/lives'));
app.use('/api/songs', require('./routes/songs'));
app.use('/api/users', require('./routes/users'));
app.use('/api/import', require('./routes/import'));
app.use('/api/external', require('./routes/external_api'));
app.use('/api/corrections', require('./routes/corrections'));
app.use('/api/logs', require('./routes/logs'));
app.get('/', (req, res) => {
    res.send('UVERworld Setlist API is running');
});

// Global error handler (must be last)
app.use((err, req, res, next) => {
    console.error('Server Error:', err);

    // Log error to database
    const db = require('./db');
    db.query(`
        INSERT INTO security_logs (event_type, message, details)
        VALUES ($1, $2, $3)
    `, ['error', err.message, JSON.stringify({
        stack: err.stack,
        url: req.url,
        method: req.method
    })]).catch(e => {
        console.error('Failed to log error to database:', e);
    });

    res.status(500).json({ message: 'サーバーエラーが発生しました' });
});

// Start Server
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});