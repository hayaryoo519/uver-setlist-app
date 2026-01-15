const router = require('express').Router();
const axios = require('axios');
const { authorize, adminCheck } = require('../middleware/authorization');

const UVER_MBID = '1f534f37-d284-4866-a36c-9dddd008e31a';
const SETLIST_FM_API_URL = 'https://api.setlist.fm/rest/1.0';

// GET /api/external/setlistfm/search?year=2023
router.get('/setlistfm/search', authorize, adminCheck, async (req, res) => {
    try {
        const { year } = req.query;
        const apiKey = process.env.SETLIST_FM_API_KEY;

        if (!apiKey) {
            return res.status(500).json({ message: "SETLIST_FM_API_KEY is not configured on the server." });
        }

        // Search for UVERworld setlists
        // Documentation: https://api.setlist.fm/rest/1.0/search/setlists
        // Note: MBID search was returning 404, so we use artistName which is working.
        const response = await axios.get(`${SETLIST_FM_API_URL}/search/setlists`, {
            params: {
                artistName: 'UVERworld',
                year: year || new Date().getFullYear(),
                p: req.query.page || 1
            },
            headers: {
                'x-api-key': apiKey,
                'Accept': 'application/json'
            }
        });

        res.json(response.data);
    } catch (err) {
        console.error('setlist.fm API Error:', err.response?.data || err.message);
        const status = err.response?.status || 500;
        const message = err.response?.data?.message || 'Error communicating with setlist.fm';
        res.status(status).json({ message });
    }
});

// GET /api/external/setlistfm/setlist/:setlistId
router.get('/setlistfm/setlist/:id', authorize, adminCheck, async (req, res) => {
    try {
        const { id } = req.params;
        const apiKey = process.env.SETLIST_FM_API_KEY;

        if (!apiKey) {
            return res.status(500).json({ message: "SETLIST_FM_API_KEY is not configured on the server." });
        }

        const response = await axios.get(`${SETLIST_FM_API_URL}/setlist/${id}`, {
            headers: {
                'x-api-key': apiKey,
                'Accept': 'application/json'
            }
        });

        res.json(response.data);
    } catch (err) {
        console.error('setlist.fm Detail API Error:', err.response?.data || err.message);
        const status = err.response?.status || 500;
        res.status(status).json({ message: 'Error fetching setlist details' });
    }
});

module.exports = router;
