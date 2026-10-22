const db = require('../db');
const { jstDateParts } = require('./socialPostDrafts');
const { normalizeVenueName } = require('../utils/songTranslations');

// 毎年同じ月日に強調表示する記念日。生年は公開情報の揺れがあるため保持しない
const ANNIVERSARIES = [
    { monthDay: '06-06', year: 2000, type: 'formation', label: '結成記念日', description: '前身バンド SOUND極ROAD を滋賀県草津市で結成' },
    { monthDay: '07-06', year: 2005, type: 'debut', label: 'メジャーデビュー記念日', description: '1stシングル「D-tecnoLife」でメジャーデビュー' },
    { monthDay: '12-21', type: 'birthday', label: 'TAKUYA∞ 誕生日' },
    { monthDay: '02-22', type: 'birthday', label: '克哉 誕生日' },
    { monthDay: '02-14', type: 'birthday', label: '信人 誕生日' },
    { monthDay: '09-25', type: 'birthday', label: '誠果 誕生日' },
    { monthDay: '11-05', type: 'birthday', label: '真太郎 誕生日' },
    { monthDay: '03-08', type: 'birthday', label: '彰 誕生日' },
];

function anniversariesFor(date) {
    const currentYear = Number(date.slice(0, 4));
    const monthDay = date.slice(5);
    return ANNIVERSARIES
        .filter(item => item.monthDay === monthDay)
        .map(({ monthDay: _monthDay, year, ...item }) => (
            year ? { ...item, year, years: currentYear - year } : item
        ));
}

async function getTodayInHistory({ now = new Date() } = {}) {
    const { date, monthDay } = jstDateParts(now);
    const currentYear = Number(date.slice(0, 4));
    const result = await db.query(
        `SELECT l.id, l.date::text AS date, l.title, l.tour_name, l.venue, l.prefecture, l.type,
                COUNT(sl.id)::int AS song_count
         FROM lives l
         LEFT JOIN setlists sl ON sl.live_id = l.id
         WHERE TO_CHAR(l.date, 'MM-DD') = $1 AND l.date < $2::date
         GROUP BY l.id
         ORDER BY l.date DESC, l.id`,
        [monthDay, date]
    );
    return {
        date,
        lives: result.rows.map(row => ({
            ...row,
            venue: normalizeVenueName(row.venue),
            years_ago: currentYear - Number(row.date.slice(0, 4)),
        })),
        anniversaries: anniversariesFor(date),
    };
}

module.exports = { ANNIVERSARIES, anniversariesFor, getTodayInHistory };
