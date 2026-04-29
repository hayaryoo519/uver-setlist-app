const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const path = require('path');

const app = express();
const PORT = 5173;

// API Proxy - must be first
app.use('/api', createProxyMiddleware({
    target: 'http://localhost:4000',
    changeOrigin: true,
    logLevel: 'debug',
    onProxyReq: (proxyReq, req, res) => {
        console.log(`[Proxy] ${req.method} ${req.url} -> ${proxyReq.path}`);
    },
    onError: (err, req, res) => {
        console.error('[Proxy Error]', err.message);
        res.status(500).send('Proxy Error');
    }
}));

// Service Worker & Manifest - no cache to ensure updates
app.use('/sw.js', (req, res, next) => {
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Content-Type', 'application/javascript');
    next();
});
app.use('/manifest.webmanifest', (req, res, next) => {
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    next();
});

// Serve static files
app.use(express.static(path.join(__dirname, 'dist')));

// SPA fallback - catch all other routes
app.use((req, res) => {
    res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

app.listen(PORT, () => {
    console.log(`Frontend server running on http://localhost:${PORT}`);
    console.log(`Proxying /api requests to http://localhost:4000`);
});
