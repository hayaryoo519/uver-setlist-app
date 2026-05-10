console.log("!!! SERVER STARTING - DEBUG VERSION !!!");
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const app = express();
app.set('trust proxy', 1);
const PORT = process.env.PORT || 8000;

// Security Check: Ensure JWT_SECRET is configured
if (!process.env.JWT_SECRET) {
    console.error('FATAL ERROR: JWT_SECRET is not defined in environment variables.');
    console.error('The application cannot start without a secure JWT secret.');
    process.exit(1);
}

// CORS: ALLOWED_ORIGINS 環境変数でドメインを制限（未設定時は全許可）
const allowedOrigins = process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS.split(',').map(o => o.trim())
    : null;

app.use(cors({
    origin: allowedOrigins
        ? (origin, callback) => {
            if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
            callback(new Error('CORS policy violation'));
          }
        : true,
    credentials: true,
}));

// CSP: Google Fonts・Spotify・YouTube を許可しつつスクリプト注入を防止
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc:     ["'self'"],
            scriptSrc:      ["'self'"],
            styleSrc:       ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
            fontSrc:        ["'self'", 'https://fonts.gstatic.com'],
            imgSrc:         ["'self'", 'data:', 'https:'],
            connectSrc:     ["'self'", 'https://api.spotify.com', 'https://accounts.spotify.com', 'https://api.setlist.fm'],
            frameSrc:       ['https://www.youtube.com', 'https://open.spotify.com'],
            objectSrc:      ["'none'"],
            baseUri:        ["'self'"],
        },
    },
}));

app.use(express.json());

// Request logging middleware
app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
    next();
});

app.get('/api/ping', (req, res) => res.send('pong'));

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/lives', require('./routes/lives'));
app.use('/api/songs', require('./routes/songs'));
app.use('/api/users', require('./routes/users'));
app.use('/api/import', require('./routes/import'));
app.use('/api/external', require('./routes/external_api'));
app.use('/api/corrections', require('./routes/corrections'));
app.use('/api/logs', require('./routes/logs'));
app.use('/api/push', require('./routes/push'));
app.use('/api/drafts', require('./routes/drafts'));
app.use('/api/predictions', require('./routes/predictions'));
app.use('/api/follows', require('./routes/follows'));
app.use('/api/feed',    require('./routes/feed'));
app.use('/api/music', require('./routes/music'));
app.use('/api/spotify', require('./routes/spotify'));
app.use('/api/youtube', require('./routes/youtube'));
app.use('/api/stats', require('./routes/stats'));

// Serve static files from the React app
app.use(express.static(path.join(__dirname, '../dist')));
// Serve uploaded images
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// The "catchall" handler: for any request that doesn't
// match one above, send back React's index.html file.
app.get(/^(?!\/api).+/, (req, res) => {
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

    // バックグラウンドサービスの開始
    try {
        const { startMonitoring } = require('./services/live_monitor');
        const { startCleanup } = require('./services/cleanup_service');

        // ライブ監視 (1時間おき)
        startMonitoring(60 * 60 * 1000);
        
        // クリーンアップ (24時間おき)
        startCleanup(24 * 60 * 60 * 1000);

        console.log('[Services] Background services started successfully.');
    } catch (serviceErr) {
        console.error('[Services] Failed to start background services:', serviceErr);
    }
});