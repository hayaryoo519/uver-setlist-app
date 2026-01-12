const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 4000;

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/lives', require('./routes/lives'));
app.use('/api/songs', require('./routes/songs'));
app.use('/api/users', require('./routes/users'));
app.use('/api/import', require('./routes/import'));
app.get('/', (req, res) => {
    res.send('UVERworld Setlist API is running');
});

// Start Server
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
