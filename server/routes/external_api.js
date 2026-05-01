const router = require('express').Router();
const axios = require('axios');
const { authorize, adminCheck } = require('../middleware/authorization');
const { createJob, getJob } = require('../services/collectJob');
const { collectYears } = require('../services/collectYears');

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

        const params = {
            artistName: 'UVERworld',
            year: year || undefined,
            tourName: req.query.keyword || undefined,
            p: req.query.page || 1
        };
        console.log("Searching SetlistFM with params:", params);

        const response = await axios.get(`${SETLIST_FM_API_URL}/search/setlists`, {
            params,
            headers: {
                'x-api-key': apiKey,
                'Accept': 'application/json'
            }
        });

        if (response.data.setlist) {
            const dec28 = response.data.setlist.find(s => s.eventDate === '28-12-2024');
            if (dec28) {
                console.log("DEBUG 12/28 DATA:", JSON.stringify({
                    tour: dec28.tour,
                    info: dec28.info,
                    venue: dec28.venue,
                    sets: dec28.sets
                }, null, 2));
            }
        }

        console.log(`SetlistFM Response: ${response.status} - Found ${response.data.setlist ? response.data.setlist.length : 0} items`);

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

// POST /api/external/setlistfm/collect-years — 年代一括収集ジョブ開始（即レスポンス）
router.post('/setlistfm/collect-years', authorize, adminCheck, (req, res) => {
    const { yearStart, yearEnd } = req.body;
    const ys = parseInt(yearStart, 10);
    const ye = parseInt(yearEnd, 10);

    if (!ys || !ye || ys > ye || ys < 2000 || ye > 2026) {
        return res.status(400).json({ message: '年範囲が不正です（2000〜2026の範囲で指定してください）' });
    }

    const apiKey = process.env.SETLIST_FM_API_KEY;
    if (!apiKey) return res.status(500).json({ message: 'SETLIST_FM_API_KEY が設定されていません' });

    const jobId = createJob(ys, ye);
    collectYears(ys, ye, apiKey, jobId); // バックグラウンド実行（await しない）
    res.json({ jobId });
});

// GET /api/external/setlistfm/collect-status/:jobId — ジョブ進捗確認
router.get('/setlistfm/collect-status/:jobId', authorize, adminCheck, (req, res) => {
    const job = getJob(req.params.jobId);
    if (!job) return res.status(404).json({ message: 'ジョブが見つかりません' });
    res.json(job);
});

module.exports = router;
