const express = require('express');
const fs = require('fs');
const path = require('path');
const db = require('./db');
const authRoutes = require('./routes/auth');

const app = express();
app.use(express.json());

const logFile = path.join(__dirname, 'debug_error.log');
const log = (msg) => {
    const timestamp = new Date().toISOString();
    fs.appendFileSync(logFile, `[${timestamp}] ${msg}\n`);
    console.log(msg);
};

app.use((req, res, next) => {
    log(`${req.method} ${req.url}`);
    next();
});

app.use('/api/auth', authRoutes);

app.use((err, req, res, next) => {
    log(`ERROR: ${err.message}`);
    log(`STACK: ${err.stack}`);
    res.status(500).json({ message: 'Internal Server Error', error: err.message });
});

const PORT = 4005;
app.listen(PORT, () => {
    log(`Debug server running on port ${PORT}`);
});
