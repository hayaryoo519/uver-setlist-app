console.log("!!! SERVER STARTING - DEBUG VERSION !!!");
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const app = express();
const PORT = process.env.PORT || 8000;

// Security Check: Ensure JWT_SECRET is configured
if (!process.env.JWT_SECRET) {
    console.error('FATAL ERROR: JWT_SECRET is not defined in environment variables.');
    console.error('The application cannot start without a secure JWT secret.');
    process.exit(1);
}

// Middleware
// Disable helmet completely for staging (HTTP), enable for production (HTTPS)
if (process.env.NODE_ENV !== 'staging') {
    app.use(helmet({
        contentSecurityPolicy: false,
    }));
}
app.use(cors());
app.use(express.json());

// Request logging middleware
app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
    next();
});

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/lives', require('./routes/lives'));
app.use('/api/songs', require('./routes/songs'));
app.use('/api/users', require('./routes/users'));
app.use('/api/import', require('./routes/import'));
app.use('/api/external', require('./routes/external_api'));
app.use('/api/corrections', require('./routes/corrections'));
app.use('/api/logs', require('./routes/logs'));

// Serve static files from the React app
app.use(express.static(path.join(__dirname, '../dist')));

// The "catchall" handler: for any request that doesn't
// match one above, send back React's index.html file.
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../dist/index.html'));
});

// Global error handler
app.use((err, req, res, next) => {
    console.error('Server Error:', err);
    res.status(500).json({
        message: 'Internal Server Error',
        error: err.message,
        stack: process.env.NODE_ENV === 'production' ? null : err.stack
    });
});

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});