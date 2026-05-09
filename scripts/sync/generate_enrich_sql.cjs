const fs = require('fs');
const path = require('path');
const { normalizeVenue, VERSION } = require('./normalize.cjs');

function generateEnrichSql() {
    const reportPath = path.join(__dirname, '../output/diff-report.json');
    const report = JSON.parse(fs.readFileSync(reportPath, 'utf8'));
    
    let sql = `-- Wikipedia Data Enrichment SQL (V3)\n`;
    sql += `-- Generated at: ${new Date().toLocaleString()}\n`;
    const batchId = `wiki_enrich_${new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)}`;
    sql += `-- Batch ID: ${batchId}\n\n`;
    
    sql += `SET client_encoding = 'UTF8';\n`;
    sql += `BEGIN;\n\n`;

    let fillCount = 0;
    let enrichCount = 0;

    // protected (既存マッチ) と new (新規追加分) の両方を対象にする
    const targets = [
        ...report.details.protected.map(p => ({ wiki: p.wiki, db: p.db[0] })),
        ...report.details.new.map(n => ({ wiki: n, db: null })) // newの場合はDBデータがないのでnull
    ];

    targets.forEach(item => {
        const wiki = item.wiki;
        const db = item.db;

        // 会場名が一致するか、または新規データの場合のみ処理
        // (protectedは日付一致のみで入っている可能性があるため)
        if (db && normalizeVenue(db.venue) !== wiki.normalized_venue) {
            return;
        }

        const metadata = {
            source: 'wikipedia',
            batch_id: batchId,
            parser_version: 2,
            normalization_version: VERSION,
            synced_at: new Date().toISOString()
        };

        const esc = (str) => str ? str.replace(/'/g, "''") : null;
        
        const wikiTour = esc(wiki.tour_name);
        const wikiTitle = esc(wiki.title);
        const wikiSpecial = esc(wiki.special_note);
        const wikiRaw = esc(wiki.raw_import_title);
        const metaStr = JSON.stringify(metadata).replace(/'/g, "''");

        if (db) {
            // 既存レコードの補完 (NULL/空文字の場合のみ)
            sql += `UPDATE lives SET 
                tour_name = CASE WHEN (tour_name IS NULL OR tour_name = '') THEN ${wikiTour ? `'${wikiTour}'` : 'tour_name'} ELSE tour_name END,
                title = CASE WHEN (title IS NULL OR title = '') THEN ${wikiTitle ? `'${wikiTitle}'` : 'title'} ELSE title END,
                special_note = CASE WHEN (special_note IS NULL OR special_note = '') THEN ${wikiSpecial ? `'${wikiSpecial}'` : 'special_note'} ELSE special_note END,
                raw_import_title = CASE WHEN (raw_import_title IS NULL OR raw_import_title = '') THEN ${wikiRaw ? `'${wikiRaw}'` : 'raw_import_title'} ELSE raw_import_title END,
                import_metadata = '${metaStr}'::jsonb,
                source = 'wikipedia',
                synced_at = NOW()
            WHERE id = ${db.id};\n`;
            enrichCount++;
        } else {
            // 新規レコード (既にINSERT済みのはずだが、metadata等を一括更新)
            sql += `UPDATE lives SET 
                import_metadata = '${metaStr}'::jsonb,
                raw_import_title = ${wikiRaw ? `'${wikiRaw}'` : 'raw_import_title'}
            WHERE date::date = '${wiki.date}' AND normalized_tour_name = '${wiki.normalized_tour_name}' AND normalized_venue = '${wiki.normalized_venue}';\n`;
            fillCount++;
        }
    });

    sql += `\nCOMMIT;\n`;

    const outputPath = path.join(__dirname, '../output/enrich_lives_v3.sql');
    fs.writeFileSync(outputPath, '\ufeff' + sql, 'utf8');
    
    console.log(`SQL generated: scripts/output/enrich_lives_v3.sql`);
    console.log(`Matched records to enrich: ${enrichCount}`);
    console.log(`New records to update metadata: ${fillCount}`);
    console.log(`Batch ID: ${batchId}`);
}

generateEnrichSql();
