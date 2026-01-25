require('dotenv').config();
const db = require('./db');

async function addTestLives() {
    try {
        const today = new Date();

        // 1. Tomorrow
        const tomorrow = new Date(today);
        tomorrow.setDate(today.getDate() + 1);

        // 2. Next Month
        const nextMonth = new Date(today);
        nextMonth.setMonth(today.getMonth() + 1);

        // 3. Next Year
        const nextYear = new Date(today);
        nextYear.setFullYear(today.getFullYear() + 1);

        const testLives = [
            {
                tour_name: "UVERworld LIVE TOUR 2026",
                title: "Zepp Haneda Day1",
                date: tomorrow.toISOString().split('T')[0],
                venue: "Zepp Haneda",
                type: "ONEMAN"
            },
            {
                tour_name: "UVERworld LIVE TOUR 2026",
                title: "Zepp Haneda Day2",
                date: nextMonth.toISOString().split('T')[0],
                venue: "Zepp Haneda",
                type: "ONEMAN"
            },
            {
                tour_name: "UVERworld KING'S PARADE 2026",
                title: "男祭り at TOKYO DOME",
                date: nextYear.toISOString().split('T')[0],
                venue: "Tokyo Dome",
                type: "EVENT",
                special_note: "男祭り"
            }
        ];

        for (const live of testLives) {
            const res = await db.query(
                "INSERT INTO lives (tour_name, title, date, venue, type, special_note) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *",
                [live.tour_name, live.title, live.date, live.venue, live.type, live.special_note]
            );
            console.log(`Added: ${res.rows[0].date} - ${res.rows[0].tour_name}`);
        }

        console.log("Test data added successfully.");
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

addTestLives();
