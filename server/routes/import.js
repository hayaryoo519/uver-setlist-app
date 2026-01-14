const router = require('express').Router();
const db = require('../db');
const { authorize, adminCheck } = require('../middleware/authorization');
const multer = require('multer');
const csv = require('csv-parser');
const { Readable } = require('stream');

// Configure multer for memory storage
const upload = multer({ storage: multer.memoryStorage() });

// POST /api/import/csv - Import lives and setlists from CSV (Admin Only)
router.post('/csv', authorize, adminCheck, upload.single('file'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: 'No file uploaded' });
        }

        const results = [];
        const fileBuffer = req.file.buffer;

        // Parse CSV
        const stream = Readable.from(fileBuffer.toString());

        stream
            .pipe(csv())
            .on('data', (data) => results.push(data))
            .on('end', async () => {
                try {
                    await processCSVData(results, res);
                } catch (err) {
                    console.error('CSV Processing Error:', err);
                    res.status(500).json({ message: 'Error processing CSV', error: err.message });
                }
            })
            .on('error', (err) => {
                console.error('CSV Parse Error:', err);
                res.status(500).json({ message: 'Error parsing CSV', error: err.message });
            });

    } catch (err) {
        console.error('Import Error:', err);
        res.status(500).json({ message: 'Server Error', error: err.message });
    }
});

async function processCSVData(rows, res) {
    const client = await db.pool.connect();

    try {
        await client.query('BEGIN');

        // Group rows by live (date + venue)
        const livesMap = new Map();

        for (const row of rows) {
            const key = `${row.live_date}_${row.venue}`;
            if (!livesMap.has(key)) {
                livesMap.set(key, {
                    date: row.live_date,
                    venue: row.venue,
                    prefecture: row.prefecture || null,
                    tour_name: row.tour,
                    title: row.tour, // Use tour as title
                    songs: []
                });
            }

            livesMap.get(key).songs.push({
                title: row.song,
                order: parseInt(row.order_no),
                note: row.tags || null
            });
        }

        let livesCreated = 0;
        let livesUpdated = 0;
        let songsAdded = 0;

        // Process each live
        for (const [key, liveData] of livesMap) {
            // Determine status based on date
            const liveDate = new Date(liveData.date);
            const now = new Date();
            const status = liveDate > now ? 'SCHEDULED' : 'FINISHED';

            // Auto-detect type from venue
            const venue = liveData.venue.toLowerCase();
            let type = 'ONEMAN';
            if (venue.includes('arena') || venue.includes('dome') || venue.includes('アリーナ') || venue.includes('ドーム')) {
                type = 'ARENA';
            } else if (venue.includes('zepp') || venue.includes('coast') || venue.includes('ax') || venue.includes('hatch')) {
                type = 'LIVEHOUSE';
            } else if (venue.includes('hall') || venue.includes('ホール')) {
                type = 'HALL';
            }

            // Check if live exists
            const checkLive = await client.query(
                'SELECT id FROM lives WHERE date = $1 AND venue = $2',
                [liveData.date, liveData.venue]
            );

            let liveId;
            if (checkLive.rows.length > 0) {
                // Update existing live
                liveId = checkLive.rows[0].id;
                await client.query(
                    'UPDATE lives SET tour_name = $1, title = $2, prefecture = $3, type = $4, status = $5 WHERE id = $6',
                    [liveData.tour_name, liveData.title, liveData.prefecture, type, status, liveId]
                );
                livesUpdated++;
            } else {
                // Create new live
                const insertLive = await client.query(
                    'INSERT INTO lives (date, venue, prefecture, tour_name, title, type, status) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id',
                    [liveData.date, liveData.venue, liveData.prefecture, liveData.tour_name, liveData.title, type, status]
                );
                liveId = insertLive.rows[0].id;
                livesCreated++;
            }

            // Delete existing setlist for this live
            await client.query('DELETE FROM setlists WHERE live_id = $1', [liveId]);

            // Insert songs and setlist
            for (const song of liveData.songs) {
                // Ensure song exists
                const checkSong = await client.query('SELECT id FROM songs WHERE title = $1', [song.title]);
                let songId;

                if (checkSong.rows.length > 0) {
                    songId = checkSong.rows[0].id;
                } else {
                    const insertSong = await client.query(
                        'INSERT INTO songs (title) VALUES ($1) RETURNING id',
                        [song.title]
                    );
                    songId = insertSong.rows[0].id;
                    songsAdded++;
                }

                // Insert setlist entry
                await client.query(
                    'INSERT INTO setlists (live_id, song_id, position, note) VALUES ($1, $2, $3, $4)',
                    [liveId, songId, song.order, song.note]
                );
            }
        }

        await client.query('COMMIT');

        res.json({
            success: true,
            message: 'Import completed successfully',
            stats: {
                livesCreated,
                livesUpdated,
                songsAdded,
                totalRows: rows.length
            }
        });

    } catch (err) {
        await client.query('ROLLBACK');
        throw err;
    } finally {
        client.release();
    }
}

module.exports = router;
