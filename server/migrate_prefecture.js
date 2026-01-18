const db = require('./db');

// 会場名から都道府県を推定するマッピング
const venueToPrefecture = {
    // 北海道
    "Coach and Four Kushiro Bunka Hall": "Hokkaido",
    "Iwamizawa Kouen": "Hokkaido",
    "PENNY LANE 24": "Hokkaido",
    "Zepp Sapporo": "Hokkaido",
    "Example Fes Grounds": "Hokkaido",

    // 青森
    "Hirosaki Shimin Kaikan": "Aomori",

    // 岩手
    "TOSAI CLASSIC HALL IWATE": "Iwate",

    // 宮城
    "SENDAI GIGS": "Miyagi",

    // 北海道（帯広）
    "Obihiro Shimin Bunka Hall": "Hokkaido",

    // 茨城
    "Hitachi Kaihin Kouen": "Ibaraki",
    "Mito Shimin Kaikan": "Ibaraki",

    // 埼玉
    "Oomiya Sonic City": "Saitama",
    "さいたまスーパーアリーナ": "Saitama",

    // 千葉
    "Kashiwa PALOOZA": "Chiba",
    "Soga Sports Kouen": "Chiba",
    "Makuhari Messe Kokusai Tenjijou": "Chiba",
    "Makuhari Messe Kokusai Tenjijou Hall 1-2-3": "Chiba",
    "Makuhari Messe Kokusai Tenjijou Hall 4-5-6-7": "Chiba",
    "Makuhari Messe Kokusai Tenjijou Hall 9-10-11": "Chiba",
    "幕張メッセ": "Chiba",

    // 東京
    "B-FLAT": "Tokyo",
    "duo MUSIC EXCHANGE": "Tokyo",
    "LIQUIDROOM": "Tokyo",
    "Music Station": "Tokyo",
    "Shinkiba Wakasu Kouen": "Tokyo",
    "THE BOTTOM LINE": "Tokyo",
    "Umi no Mori Kouen": "Tokyo",
    "Yoyogi Daiichi Taiikukan": "Tokyo",
    "Zepp DiverCity (TOKYO)": "Tokyo",
    "Zepp Haneda (TOKYO)": "Tokyo",
    "Zepp Tokyo": "Tokyo",
    "Zepp Haneda": "Tokyo",
    "日本武道館": "Tokyo",
    "東京ドーム": "Tokyo",
    "東京ガーデンシアター": "Tokyo",
    "渋谷eggman": "Tokyo",

    // 神奈川
    "KT Zepp Yokohama": "Kanagawa",
    "Nissan Stadium": "Kanagawa",
    "横浜アリーナ": "Kanagawa",
    "日産スタジアム": "Kanagawa",
    "ぴあアリーナMM": "Kanagawa",

    // 新潟
    "HARD OFF ECO Stadium Niigata": "Niigata",
    "朱鷺メッセ": "Niigata",

    // 長野
    "Nagano CLUB JUNK BOX": "Nagano",
    "ビッグハット": "Nagano",

    // 石川
    "Honda no Mori Hall": "Ishikawa",

    // 福井
    "Phoenix Plaza": "Fukui",

    // 静岡
    "Shizuoka Shimin Bunka Kaikan": "Shizuoka",
    "Country Park": "Shizuoka",

    // 愛知
    "Nihon Gaishi Hall": "Aichi",
    "Zepp Nagoya": "Aichi",
    "名古屋ガイシホール": "Aichi",
    "愛知県国際展示場": "Aichi",

    // 三重
    "Sun Arena": "Mie",

    // 滋賀
    "Biwako Hall": "Shiga",

    // 京都
    "Karasuma Hantou Shibafu Hiroba": "Kyoto",
    "KYOTO PULSE PLAZA": "Kyoto",
    "MAIZURU P.B. Harbor Park": "Kyoto",

    // 大阪
    "OSAKA MUSE": "Osaka",
    "Osaka-jou Hall": "Osaka",
    "Zepp Osaka Bayside": "Osaka",
    "大阪城ホール": "Osaka",

    // 兵庫
    "神戸ワールド記念ホール": "Hyogo",

    // 岡山
    "Kurashiki Shimin Kaikan": "Okayama",

    // 鳥取
    "Torigin Bunka Kaikan": "Tottori",

    // 広島
    "Hiroshima CLUB QUATTRO": "Hiroshima",
    "広島グリーンアリーナ": "Hiroshima",

    // 山口
    "Shuunan-shi Bunka Kaikan": "Yamaguchi",

    // 香川
    "Rexxam Hall": "Kagawa",
    "Sanuki Man-nou Kouen": "Kagawa",

    // 愛媛
    "Ehime-ken Kenmin Bunka Kaikan": "Ehime",

    // 高知
    "Kouchi Kenritsu Kenmin Bunka Hall": "Kochi",

    // 福岡
    "DRUM LOGOS": "Fukuoka",
    "Zepp Fukuoka": "Fukuoka",
    "マリンメッセ福岡": "Fukuoka",
    "みずほPayPayドーム福岡": "Fukuoka",

    // 熊本
    "Shimin Kaikan Sears Home Yume Hall": "Kumamoto",

    // 大分
    "iichiko Grand Theater": "Oita",

    // 沖縄
    "Music Town Oto Ichiba": "Okinawa",
    "Kawashou Hall": "Okinawa",

    // 海外
    "Korea University Hwajeong Gymnasium": "Overseas",
    "The Pier-2 Art Center": "Overseas",
    "The Republik": "Overseas",

    // 北海道（野外）
    "Tarukawa Dock Open-Air Special Stages": "Hokkaido",
};

(async () => {
    try {
        console.log('=== Updating prefecture data ===\n');

        let updated = 0;
        let notFound = [];

        for (const [venue, prefecture] of Object.entries(venueToPrefecture)) {
            const result = await db.query(
                "UPDATE lives SET prefecture = $1 WHERE venue = $2 AND (prefecture IS NULL OR prefecture = '')",
                [prefecture, venue]
            );
            if (result.rowCount > 0) {
                console.log(`Updated ${result.rowCount} rows: ${venue} -> ${prefecture}`);
                updated += result.rowCount;
            }
        }

        console.log(`\n=== Done! Updated ${updated} rows ===`);

        // 残りの未設定を確認
        const remaining = await db.query(
            "SELECT DISTINCT venue FROM lives WHERE prefecture IS NULL OR prefecture = '' ORDER BY venue"
        );
        if (remaining.rows.length > 0) {
            console.log(`\n=== Still missing prefecture (${remaining.rows.length}) ===`);
            remaining.rows.forEach(r => console.log('-', r.venue));
        } else {
            console.log('\nAll venues now have prefecture data!');
        }

        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
})();
