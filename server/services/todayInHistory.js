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

// 当日に公演がない場合に探す日のずれ。同じ距離なら先の日（予告）を優先する
const NEARBY_OFFSETS = [1, -1, 2, -2, 3, -3];
const MILESTONE_YEARS = 5;

function anniversariesFor(date) {
    const currentYear = Number(date.slice(0, 4));
    const monthDay = date.slice(5);
    return ANNIVERSARIES
        .filter(item => item.monthDay === monthDay)
        .map(({ monthDay: _monthDay, year, ...item }) => (
            year ? { ...item, year, years: currentYear - year } : item
        ));
}

function shiftDate(date, days) {
    const shifted = new Date(`${date}T00:00:00Z`);
    shifted.setUTCDate(shifted.getUTCDate() + days);
    return shifted.toISOString().slice(0, 10);
}

// 節目（5年ごと）の公演を先に、それぞれ新しい順に並べる
function sortLives(lives) {
    return [...lives].sort((a, b) =>
        Number(b.is_milestone) - Number(a.is_milestone) || b.date.localeCompare(a.date) || a.id - b.id
    );
}

// 対象日より1年以上前の、同じ月日の公演だけを対象にする
function livesOn(rows, targetDate) {
    const targetYear = Number(targetDate.slice(0, 4));
    return rows
        .filter(row => row.date.slice(5) === targetDate.slice(5) && Number(row.date.slice(0, 4)) < targetYear)
        .map(row => {
            const yearsAgo = targetYear - Number(row.date.slice(0, 4));
            return {
                ...row,
                venue: normalizeVenueName(row.venue),
                years_ago: yearsAgo,
                is_milestone: yearsAgo % MILESTONE_YEARS === 0,
            };
        });
}

async function getTodayInHistory({ now = new Date() } = {}) {
    const { date } = jstDateParts(now);
    const candidates = [0, ...NEARBY_OFFSETS].map(offset => ({ offset, date: shiftDate(date, offset) }));
    const result = await db.query(
        `SELECT l.id, l.date::text AS date, l.title, l.tour_name, l.venue, l.prefecture, l.type,
                COUNT(sl.id)::int AS song_count
         FROM lives l
         LEFT JOIN setlists sl ON sl.live_id = l.id
         WHERE TO_CHAR(l.date, 'MM-DD') = ANY($1::text[]) AND l.date < $2::date
         GROUP BY l.id`,
        [candidates.map(candidate => candidate.date.slice(5)), date]
    );

    const match = candidates
        .map(candidate => ({ ...candidate, lives: livesOn(result.rows, candidate.date) }))
        .find(candidate => candidate.lives.length > 0);

    return {
        date,
        matched_date: match ? match.date : null,
        offset_days: match ? match.offset : null,
        lives: match ? sortLives(match.lives) : [],
        anniversaries: anniversariesFor(date),
    };
}

module.exports = { ANNIVERSARIES, anniversariesFor, getTodayInHistory };
