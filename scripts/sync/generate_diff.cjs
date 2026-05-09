const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');
const { normalizeTitle, normalizeVenue, normalizeTourName, decomposeTitle, generateExternalSourceId, VERSION } = require('./normalize.cjs');
const { Client } = require('pg');

function toJSTDateString(date) {
    if (!date) return null;
    const d = new Date(date);
    // UTCからJST(+9時間)に変換
    d.setHours(d.getHours() + 9);
    return d.toISOString().split('T')[0];
}

async function run() {
    const htmlPath = path.join(__dirname, '../../.agent/temp/extracted_tables.html');
    const html = fs.readFileSync(htmlPath, 'utf8');
    const dom = new JSDOM(html);
    const document = dom.window.document;

    const wikiLives = [];
    let currentYear = '';

    const rows = Array.from(document.querySelectorAll('tr'));
    console.log(`Analyzing ${rows.length} rows...`);

    rows.forEach((row, rowIndex) => {
        const cells = Array.from(row.querySelectorAll('td'));
        if (cells.length < 3) return; 

        if (row.querySelector('del')) {
            console.log(`[Skip] Row ${rowIndex}: Cancelled (del)`);
            return;
        }

        let dateCell, titleCell, venueCell;
        const firstCellText = cells[0].textContent.trim();
        const yearMatch = firstCellText.match(/^(\d{4})年$/);

        if (yearMatch) {
            currentYear = yearMatch[1];
            dateCell = cells[1];
            titleCell = cells[2];
            venueCell = cells[3];
        } else {
            dateCell = cells[0];
            titleCell = cells[1];
            venueCell = cells[2];
        }

        if (!currentYear) return;
        if (!dateCell || !titleCell || !venueCell) {
            console.log(`[Skip] Row ${rowIndex}: Missing cells (Year: ${currentYear})`);
            return;
        }

        // 脚注 (sup) を削除
        titleCell.querySelectorAll('sup').forEach(s => s.remove());

        const rawTitle = titleCell.querySelector('b')?.textContent.trim() || titleCell.textContent.trim();
        // 末尾の (n) を除去
        const cleanedTitle = rawTitle.replace(/\(\d+\)$/, '').trim();
        
        if (!cleanedTitle || cleanedTitle === '日程' || cleanedTitle === '公演タイトル' || cleanedTitle === 'タイトル') {
            console.log(`[Skip] Row ${rowIndex}: Invalid title "${cleanedTitle}"`);
            return;
        }

        const { tourName, title: subTitle, specialNote } = decomposeTitle(cleanedTitle);

        const navContent = venueCell.querySelector('.NavContent');
        if (navContent) {
            const lines = navContent.innerHTML.split(/<br.*?>/i);
            console.log(`[Process] Row ${rowIndex}: Tour "${cleanedTitle}" (${lines.length} lines)`);
            lines.forEach(line => {
                const cleanLine = line.replace(/<[^>]*>?/gm, '').trim();
                const dateMatch = cleanLine.match(/(\d+)月(\d+)日/);
                if (dateMatch) {
                    const month = dateMatch[1].padStart(2, '0');
                    const day = dateMatch[2].padStart(2, '0');
                    const venue = cleanLine.replace(dateMatch[0], '').trim().split(/[（\()]/)[0].trim();
                    
                    if (venue && !venue.match(/^\d/) && venue.length > 1) {
                        const dateStr = `${currentYear}-${month}-${day}`;
                        wikiLives.push({
                            date: dateStr,
                            tour_name: tourName,
                            title: subTitle,
                            special_note: specialNote,
                            raw_import_title: rawTitle,
                            venue: venue,
                            normalized_tour_name: normalizeTourName(tourName),
                            normalized_title: normalizeTitle(subTitle || ''),
                            normalized_venue: normalizeVenue(venue),
                            external_source_id: generateExternalSourceId(dateStr, tourName, venue, subTitle || '')
                        });
                    }
                }
            });
        } else {
            const dateText = dateCell.textContent.trim();
            const dateMatch = dateText.match(/(\d+)月(\d+)日/);
            if (dateMatch) {
                const month = dateMatch[1].padStart(2, '0');
                const day = dateMatch[2].padStart(2, '0');
                const venue = venueCell.textContent.trim().split(/[（\(\n\r]/)[0].trim();
                
                if (venue && !venue.match(/^(\d+)会場/) && venue.length > 1) {
                    const dateStr = `${currentYear}-${month}-${day}`;
                    wikiLives.push({
                        date: dateStr,
                        tour_name: tourName,
                        title: subTitle,
                        special_note: specialNote,
                        raw_import_title: rawTitle,
                        venue: venue,
                        normalized_tour_name: normalizeTourName(tourName),
                        normalized_title: normalizeTitle(subTitle || ''),
                        normalized_venue: normalizeVenue(venue),
                        external_source_id: generateExternalSourceId(dateStr, tourName, venue, subTitle || '')
                    });
                } else {
                    console.log(`[Skip] Row ${rowIndex}: Invalid venue "${venue}" (Date: ${dateText})`);
                }
            } else {
                console.log(`[Skip] Row ${rowIndex}: Date mismatch "${dateText}"`);
            }
        }
    });

    console.log(`Parsed ${wikiLives.length} lives from Wikipedia.`);

    // DBとの突合
    const client = new Client({
        host: 'localhost',
        port: 54332,
        user: 'postgres',
        password: 'postgres',
        database: 'uver_app_db'
    });
    await client.connect();

    const dbRes = await client.query('SELECT id, date, title, tour_name, venue, normalized_title, normalized_tour_name, normalized_venue, external_source_id, is_manually_edited FROM lives');
    const dbLivesMap = {};
    dbRes.rows.forEach(row => {
        const dateStr = toJSTDateString(row.date);
        if (!dbLivesMap[dateStr]) dbLivesMap[dateStr] = [];
        dbLivesMap[dateStr].push(row);
    });

    const report = {
        summary: {
            new: 0,
            normalization_match: 0,
            strict_conflict: 0,
            extra: 0,
            protected: 0
        },
        details: {
            new: [],
            normalization_match: [],
            strict_conflict: [],
            extra: [],
            protected: []
        }
    };

    const wikiHashSet = new Set(wikiLives.map(l => l.external_source_id));

    // Wikiベースのチェック
    wikiLives.forEach(live => {
        const dbMatches = dbLivesMap[live.date] || [];

        if (dbMatches.length > 0) {
            // 手動編集済みかチェック
            const isProtected = dbMatches.some(db => db.is_manually_edited);
            if (isProtected) {
                report.summary.protected++;
                report.details.protected.push({ wiki: live, db: dbMatches });
                return;
            }

            // 競合チェック (Tour Name & Venue & Title)
            const match = dbMatches.find(db => {
                const normDbTour = db.normalized_tour_name || normalizeTourName(db.tour_name || db.title || '');
                const normDbVenue = db.normalized_venue || normalizeVenue(db.venue || '');
                const normDbTitle = db.normalized_title || normalizeTitle(db.title || '');
                
                return normDbTour === live.normalized_tour_name && 
                       normDbVenue === live.normalized_venue &&
                       normDbTitle === live.normalized_title;
            });

            if (match) {
                report.summary.normalization_match++;
                report.details.normalization_match.push({ wiki: live, db: match });
            } else {
                report.summary.strict_conflict++;
                report.details.strict_conflict.push({ wiki: live, db: dbMatches });
            }
        } else {
            report.summary.new++;
            report.details.new.push(live);
        }
    });

    // DBにのみ存在するデータのチェック (Extra)
    dbRes.rows.forEach(db => {
        if (!wikiHashSet.has(db.external_source_id)) {
            // 日付もチェックして、完全にWikiにない場合
            const dateStr = toJSTDateString(db.date);
            const wikiOnSameDate = wikiLives.filter(w => w.date === dateStr);
            if (wikiOnSameDate.length === 0) {
                report.summary.extra++;
                report.details.extra.push({ ...db, date: dateStr });
            }
        }
    });

    fs.writeFileSync(path.join(__dirname, '../output/diff-report.json'), JSON.stringify(report, null, 2));
    console.log('Diff report generated: scripts/output/diff-report.json');
    console.log('Summary:', report.summary);

    await client.end();
}

// 出力ディレクトリ作成
if (!fs.existsSync(path.join(__dirname, '../output'))) {
    fs.mkdirSync(path.join(__dirname, '../output'));
}

run().catch(console.error);
