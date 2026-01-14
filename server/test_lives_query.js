const db = require('./db');

async function testQuery() {
    try {
        console.log('Testing Lives Query...');

        const search = 'Arena'; // specific test case
        const startDate = undefined;
        const endDate = undefined;
        const prefecture = undefined;
        const album = undefined;
        const songIds = undefined;
        const include_setlists = undefined;

        let paramIndex = 1;
        let params = [];
        let whereClauses = [];
        let havingClause = '';

        // 1. Build Filter Conditions for CTE
        if (search) {
            whereClauses.push(`(l.title ILIKE $${paramIndex} OR l.venue ILIKE $${paramIndex} OR l.tour_name ILIKE $${paramIndex})`);
            params.push(`%${search}%`);
            paramIndex++;
        }

        const whereSql = whereClauses.length > 0 ? 'WHERE ' + whereClauses.join(' AND ') : '';

        // 2. Construct Query with CTE for filtering
        let query = `
            WITH filtered_lives AS (
                SELECT l.id
                FROM lives l
                LEFT JOIN setlists sl ON l.id = sl.live_id
                LEFT JOIN songs s ON sl.song_id = s.id
                ${whereSql}
                GROUP BY l.id
                ${havingClause}
            )
            SELECT l.*
        `;

        if (include_setlists === 'true') {
            query += `,
                   COALESCE(
                       JSON_AGG(
                           JSON_BUILD_OBJECT('id', s_full.id, 'title', s_full.title, 'position', sl_full.position) 
                           ORDER BY sl_full.position
                       ) FILTER (WHERE s_full.id IS NOT NULL), 
                       '[]'
                   ) as setlist
            `;
        }

        query += `
            FROM lives l
            JOIN filtered_lives fl ON l.id = fl.id
        `;

        if (include_setlists === 'true') {
            query += `
                LEFT JOIN setlists sl_full ON l.id = sl_full.live_id
                LEFT JOIN songs s_full ON sl_full.song_id = s_full.id
                GROUP BY l.id
            `;
        }

        query += ` ORDER BY l.date DESC`;

        console.log('Query:', query);
        console.log('Params:', params);

        const result = await db.query(query, params);
        console.log('Rows:', result.rows.length);
        if (result.rows.length > 0) console.log(result.rows[0]);

    } catch (err) {
        console.error('Query Failed:', err);
    } finally {
        // We cannot easily close the pool if it's exported as singleton without end method exposed explicitly or just exit process
        process.exit();
    }
}

testQuery();
