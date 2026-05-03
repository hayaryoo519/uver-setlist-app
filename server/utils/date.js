const dayjs = require('dayjs');
const utc = require('dayjs/plugin/utc');
const timezone = require('dayjs/plugin/timezone');

dayjs.extend(utc);
dayjs.extend(timezone);

/**
 * 指定された日付（ライブ開催日）が既に過ぎているか（締切済みか）をJST基準で判定する
 * ライブ開催日の00:00 JSTを締切とする仕様
 * @param {string|Date} liveDate - ライブ開催日 (YYYY-MM-DD)
 * @returns {boolean} - 締切済みの場合はtrue
 */
const isLiveClosed = (liveDate) => {
    if (!liveDate) return true;

    // 現在時刻をJSTで取得
    const nowJST = dayjs().tz('Asia/Tokyo');
    
    // ライブ開催日の00:00 JSTを設定
    // liveDateが '2026-05-03' の場合、2026-05-03 00:00:00 Asia/Tokyo と比較
    const deadlineJST = dayjs.tz(liveDate, 'Asia/Tokyo').startOf('day');

    return nowJST.isAfter(deadlineJST) || nowJST.isSame(deadlineJST);
};

/**
 * 現在のJST時刻を取得する
 */
const getNowJST = () => {
    return dayjs().tz('Asia/Tokyo');
};

module.exports = {
    isLiveClosed,
    getNowJST
};
