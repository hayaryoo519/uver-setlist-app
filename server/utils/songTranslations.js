// Mapping of Romaji/English titles to official Japanese titles
// VERIFIED UVERworld Discography - Based on official Spotify playlist + official sources
// Playlist: https://open.spotify.com/playlist/6cuBKZkmmfRr7ST9AwEnFs (319曲)
// Last updated: 2026-01-15

const songTranslations = {
    // ============================================
    // VERIFIED SINGLES (2005-2024)
    // ============================================

    // 2005
    "D-tecnoLife": "D-tecnoLife",
    "CHANCE!": "CHANCE!",
    "Chance": "CHANCE!",

    // 2006
    "just Melody": "just Melody",
    "Just Melody": "just Melody",
    "Colors of the Heart": "Colors of the Heart",
    "SHAMROCK": "SHAMROCK",
    "Shamrock": "SHAMROCK",
    "Kimi no Suki na Uta": "君の好きなうた",

    // 2007
    "endscape": "endscape",
    "Endscape": "endscape",
    "Shaka Beach ~Laka Laka La~": "シャカビーチ〜Laka Laka La〜",
    "Shaka Beach": "シャカビーチ〜Laka Laka La〜",
    "Ukiyo CROSSING": "浮世CROSSING",
    "Ukiyo Crossing": "浮世CROSSING",

    // 2008
    "Gekidou": "激動",
    "GEKIDOU": "激動",
    "Just break the limit!": "Just break the limit!",
    "Koishikute": "恋いしくて",
    "Hakanaku mo Towa no Kanashi": "儚くも永久のカナシ",

    // 2009
    "GO-ON": "GO-ON",
    "Go-On": "GO-ON",
    "Kanashimi wa Kitto": "哀しみはきっと",

    // 2010
    "GOLD": "GOLD",
    "Gold": "GOLD",
    "Qualia": "クオリア",
    "QUALIA": "クオリア",

    // 2011
    "CORE PRIDE": "CORE PRIDE",
    "Core Pride": "CORE PRIDE",
    "BABY BORN & GO": "BABY BORN & GO",
    "KINJITO": "KINJITO",

    // 2012
    "7th Trigger": "7th Trigger",
    "THE OVER": "THE OVER",
    "The Over": "THE OVER",

    // 2013
    "REVERSI": "REVERSI",
    "Reversi": "REVERSI",
    "Fight For Liberty": "Fight For Liberty",
    "Wizard CLUB": "Wizard CLUB",
    "Wizard Club": "Wizard CLUB",

    // 2014
    "Nano-Second": "ナノ・セカンド",
    "Nano Second": "ナノ・セカンド",
    "nano-second": "ナノ・セカンド",

    // 2015
    "Boku no Kotoba de wa Nai Kore wa Bokutachi no Kotoba": "僕の言葉ではない これは僕達の言葉",
    "I LOVE THE WORLD": "I LOVE THE WORLD",
    "I Love The World": "I LOVE THE WORLD",

    // 2016
    "WE ARE GO": "WE ARE GO",
    "We Are Go": "WE ARE GO",
    "ALL ALONE": "ALL ALONE",
    "All Alone": "ALL ALONE",

    // 2017
    "Itteki no Eikyou": "一滴の影響",
    "DECIDED": "DECIDED",
    "Decided": "DECIDED",

    // 2018
    "ODD FUTURE": "ODD FUTURE",
    "Odd Future": "ODD FUTURE",
    "GOOD and EVIL": "GOOD and EVIL",
    "Eden e": "EDENへ",
    "EDEN e": "EDENへ",

    // 2019
    "Touch off": "Touch off",
    "Touch Off": "Touch off",
    "ROB THE FRONTIER": "ROB THE FRONTIER",
    "Rob The Frontier": "ROB THE FRONTIER",

    // 2020
    "AS ONE": "AS ONE",
    "As One": "AS ONE",

    // 2021
    "NAMELY": "NAMELY",

    // 2022
    "EN": "EN",

    // 2023
    "Victosound": "Victosound",
    "VICTOSOUND": "Victosound",
    "EYES OF THE FUTURE": "EYES OF THE FUTURE",

    // 2024
    "Eye's Sentry": "Eye's Sentry",
    "MEMORIES of the End": "MEMORIES of the End",
    "PHOENIX": "PHOENIX",
    "Phoenix": "PHOENIX",
    "MMH": "MMH",

    // ============================================
    // ALBUM TRACKS (From Spotify Playlist)
    // ============================================

    // Timeless (2006)
    "ai ta kokoro": "ai ta心",
    "Toki no Namida": "トキノナミダ",
    "Yasashisa no Shizuku": "優しさの雫",
    "扉": "扉",
    "Tobira": "扉",
    "Burst": "Burst",
    "Nitro": "Nitro",
    "Lump Of Affection": "Lump Of Affection",
    "SE": "SE",

    // BUGRIGHT (2007)
    "Zero no Kotae": "ゼロの答",
    "Zero no Answer": "ゼロの答",
    "Home": "Home",
    "HOME": "Home",
    "Home Binetsu 39 Celsius": "Home 微熱39℃",
    "Binetsu 39 Celsius": "微熱39℃ 〜流れ・空虚・THIS WORD〜",
    "~Nagare Kuukyo THIS WORD~": "〜流れ・空虚・THIS WORD〜",
    "Hitori Janai Kara": "一人じゃないから",
    "SORA": "SORA",
    "Charmant no Ura": "シャルマンノウラ",
    "51%": "51%",
    "LIFEsize": "LIFEsize",
    "EMPTY96": "EMPTY96",
    "Live everyday as if it were the last day": "Live everyday as if it were the last day",
    "DISCORD": "DISCORD",

    // BUGRIGHT era
    "UNKNOWN ORCHESTRA": "UNKNOWN ORCHESTRA",
    "Monochrome": "モノクローム〜気付けなかったdevotion〜",
    "Rainy": "Rainy",
    "sorrow": "sorrow",
    "energy": "energy",
    "Roots": "Roots",
    "Byouteki Kikyuu Nikki": "病的希求日記",
    "counting song - H": "counting song - H",
    "Kamiatsume": "神集め",
    "Kokoro ga Sasu Basho to Kuchiguse": "心が指す場所と口癖　そして君がついて来る",
    "Otonoha": "オトノハ",

    // PROGLUTION era
    "志-kokorozashi-": "志-kokorozashi-",
    "over the stoic": "over the stoic",
    "Taion": "体温",
    "Halzion": "ハルジオン",
    "99/100 Damashi no Tetsu": "99/100騙しの哲",
    "Mikageishi": "美影意志",
    "Corona": "コロナ",
    "earthy world": "earthy world",
    "Hissei Satsuki Prologue": "畢生皐月プロローグ",
    "I am Riri": "アイ・アム　Riri",
    "Forget": "Forget",
    "Waon": "和音",
    "YURA YURA": "YURA YURA",

    // AwakEVE era
    "the truth": "the truth",
    "Madarachou": "マダラ蝶",
    "Gekiha": "撃破",
    "CHANGE": "CHANGE",
    "MINORI": "MINORI",
    "world LOST world": "world LOST world",
    "Sparta": "スパルタ",
    "Kokoro to Kokoro": "心とココロ",
    "Barrel": "バーレル",
    "Hai! Mondaisaku": "ﾊｲ!問題作",
    "closed POKER": "closed POKER",
    "WANNA be BRILLIANT": "WANNA be BRILLIANT",
    "Kimi no Mama": "君のまま",
    "Wakasa yue Entelecheia": "若さ故エンテレケイア",

    // LAST era
    "Ultimate": "Ultimate",
    "NO.1": "NO.1",
    "6tsu no Kaze": "6つの風",
    "Choutaisaku +81": "超大作＋81",
    "MONDO PIECE": "MONDO PIECE",
    "Mondo Piece": "MONDO PIECE",
    "Panic World": "パニックワールド",
    "Chimimoryo March": "魑魅魍魎マーチ",
    "Kyouchi Mantra": "境地・マントラ",
    "Itsuka Kanarazu Shinu Koto o Wasureruna": "いつか必ず死ぬことを忘れるな",
    "Isseki o Toujiru": "一石を投じる　Tokyo midnight sun",

    // LIFE 6 SENSE era
    "ace of ace": "ace of ace",
    "Secret": "シークレット",
    "Shousha Ookubyoumono": "勝者臆病者",
    "Ichiokubun no Ichi no Shousetsu": "一億分の一の小説",
    "Hakuchuumu": "白昼夢",

    // THE ONE era
    "Barbell": "バーベル〜皇帝の新しい服ver.〜",
    "AWAYOKUBA-斬る": "AWAYOKUBA-斬る",
    "THE SONG": "THE SONG",
    "Massive": "Massive",
    "Theory to no Ketsubetsu no Kenkyuu": "セオリーとの決別の研究+81",
    "Don't Think.Feel": "Don't Think.Feel",
    "LIMITLESS": "LIMITLESS",
    "23 Word": "23ワード",
    "Koko Kara": "此処から",
    "boy": "boy",
    "a LOVELY TONE": "a LOVELY TONE",

    // Later albums
    "LIFE": "LIFE",
    "DEJAVU": "DEJAVU",
    "Nanokame no Ketsui": "7日目の決意",
    "AWAKE": "AWAKE",
    "Burst": "Burst",
    "Rush": "Rush",
    "UNISON": "UNISON",
    "Unison": "UNISON",
    "PROGLUTION": "PROGLUTION",
    "TA-LI": "TA-LI",
    "IMPACT": "IMPACT",
    "Impact": "IMPACT",

    // ============================================
    // Ø CHOIR Era (2014-2015) - From Spotify
    // ============================================
    "Dare ga Itta": "誰が言った",
    "ENOUGH-1": "ENOUGH-1",
    "KICK ga Jiyuu": "KICKが自由",
    "Bessekai": "別世界",
    "Born Slippy": "Born Slippy",
    "Arubeki Katachi": "在るべき形",
    "0 choir": "0 choir",

    // ============================================
    // TYCOON Era (2015-2017) - From Spotify
    // ============================================
    "PRAYING RUN": "PRAYING RUN",
    "Praying Run": "PRAYING RUN",
    "Emu": "エミュー",
    "Forever Young": "Forever Young",
    "RANGE": "RANGE",
    "Q.E.D.": "Q.E.D.",
    "Sirius": "シリウス",
    "SHOUT LOVE": "SHOUT LOVE",
    "Shout Love": "SHOUT LOVE",
    "IDEAL REALITY": "IDEAL REALITY",
    "Ideal Reality": "IDEAL REALITY",
    "LONE WOLF": "LONE WOLF",
    "奏全域": "奏全域",
    "Shuuen": "終焉",
    "Collide": "Collide",
    "TYCOON": "TYCOON",
    "Honno Sukoshi": "ほんの少し",
    "Forever Young": "Forever Young",

    // ============================================
    // UNSER Era (2018-2019) - From Spotify
    // ============================================
    "PLOT": "PLOT",
    "CORE STREAM": "CORE STREAM",
    "ConneQt": "ConneQt",
    "Making it Drive": "Making it Drive",
    "AFTER LIFE": "AFTER LIFE",
    "After Life": "AFTER LIFE",
    "Kyoukai": "境界",
    "stay on": "stay on",
    "Stay On": "stay on",
    "First Sight": "First Sight",
    "Muimi ni naru Yoru": "無意味になる夜",
    "OXYMORON": "OXYMORON",
    "One Last Time": "One Last Time",
    "UNSER": "UNSER",

    // ============================================
    // 30 Era (2020-2021) - From Spotify
    // ============================================
    "Spreadown": "Spreadown",
    "HOURGLASS": "HOURGLASS",
    "Hourglass": "HOURGLASS",
    "Teenage Love": "Teenage Love",
    "LIVIN' IT UP": "LIVIN' IT UP",
    "Raichouei": "来鳥江",
    "SOUL": "SOUL",
    "Soul": "SOUL",
    "AVALANCHE": "AVALANCHE",
    "E.T.": "イーティー",
    "One stroke for freedom": "One stroke for freedom",
    "Ekubo": "えくぼ",
    "OUR ALWAYS": "OUR ALWAYS",
    "THUG LIFE": "THUG LIFE",
    "NEVER ENDING WORLD": "NEVER ENDING WORLD",
    "Pygmalion": "ピグマリオン",
    "BVCK": "BVCK",
    "Bitter Sweet": "ビタースウィート",

    // ============================================
    // ENIGMASIS Era (2022-2024) - From Spotify
    // ============================================
    "VICTOSPIN": "VICTOSPIN",
    "Victospin": "VICTOSPIN",
    "ENCORE AGAIN": "ENCORE AGAIN",
    "FINALIST": "FINALIST",
    "echoOZ": "echoOZ",
    "Don't Think.Sing": "Don't Think.Sing",
    "THEORY": "THEORY",
    "Theory": "THEORY",
    "α-Skill": "α-Skill",
    "alpha-Skill": "α-Skill",
    "two Lies": "two Lies",

    // THE ONE SE/Intro tracks
    "THE ONE (SE)": "THE ONE (SE)",
    "THE ONE SE": "THE ONE (SE)",
    "KINJITO (LIVE intro ver.)": "KINJITO (LIVE intro ver.)",
    "AWAYOKUBA-斬る": "AWAYOKUBA-斬る",
    "AWAYOKUBA-Kiru": "AWAYOKUBA-斬る",
    "NOWHERE boy": "NOWHERE boy",
    "バーベル~皇帝の新しい服~": "バーベル～皇帝の新しい服 album ver.～",
    "Barbell": "バーベル～皇帝の新しい服 album ver.～",

    // Ø CHOIR SE
    "零 HERE ~SE~": "零HERE～SE～",
    "Zero HERE SE": "零HERE～SE～",
    "Zero HERE ~SE~": "零HERE～SE～",
    "ANOMALY Souja": "ANOMALY奏者",
    "ENIGMASIS": "ENIGMASIS",
    "High Light!": "High Light!",
    "WINGS ever": "WINGS ever",

    // ============================================
    // VARIATIONS / ALTERNATE SPELLINGS
    // ============================================
    "D-Tecnolife": "D-tecnoLife",
    "d-tecnoLife": "D-tecnoLife",
    "Gekidou (Awakening)": "激動",
    "Kimi no Suki na Uta (Acoustic Version)": "君の好きなうた",
};

/**
 * Normalizes a song title by checking against the translation dictionary.
 * If a match is found, returns the official title.
 * Otherwise, returns the original title.
 */
function normalizeSongTitle(title) {
    if (!title) return title;

    // Check exact match in dictionary
    if (songTranslations[title]) {
        return songTranslations[title];
    }

    // Try case-insensitive matching if exact match fails
    const lowerTitle = title.toLowerCase();
    const match = Object.keys(songTranslations).find(key => key.toLowerCase() === lowerTitle);

    if (match) {
        return songTranslations[match];
    }

    return title;
}

// ============================================
// VENUE TRANSLATIONS - 47 Prefectures
// ============================================
const venueTranslations = {
    // ============================================
    // ドーム (Domes)
    // ============================================
    "Tokyo Dome": "東京ドーム",
    "Kyocera Dome Osaka": "京セラドーム大阪",
    "Kyocera Dome": "京セラドーム大阪",
    "Nagoya Dome": "バンテリンドーム ナゴヤ",
    "Vantelin Dome Nagoya": "バンテリンドーム ナゴヤ",
    "Bantelin Dome": "バンテリンドーム ナゴヤ",
    "Fukuoka Dome": "福岡PayPayドーム",
    "Fukuoka PayPay Dome": "福岡PayPayドーム",
    "PayPay Dome": "福岡PayPayドーム",
    "Mizuho PayPay Dome Fukuoka": "みずほPayPayドーム福岡",
    "Sapporo Dome": "札幌ドーム",
    "Belluna Dome": "ベルーナドーム",
    "Seibu Dome": "ベルーナドーム",

    // ============================================
    // 北海道 (Hokkaido)
    // ============================================
    "Makomanai Sekisui Heim Ice Arena": "真駒内セキスイハイムアイスアリーナ",
    "Makomanai Ice Arena": "真駒内セキスイハイムアイスアリーナ",
    "Hokkai Kitayell": "北海きたえーる",
    "Zepp Sapporo": "Zepp Sapporo",

    // ============================================
    // 東北 (Tohoku)
    // ============================================
    "Sekisui Heim Super Arena": "セキスイハイムスーパーアリーナ",
    "Xebio Arena Sendai": "ゼビオアリーナ仙台",
    "Sendai Sun Plaza": "仙台サンプラザ",
    "Maeda Arena": "マエダアリーナ",
    "Akita Prefectural Gymnasium": "秋田県立体育館",

    // ============================================
    // 関東 (Kanto)
    // ============================================
    // 東京
    "Nippon Budokan": "日本武道館",
    "Budokan": "日本武道館",
    "Ariake Arena": "有明アリーナ",
    "Yoyogi National Gymnasium": "国立代々木競技場 第一体育館",
    "Yoyogi First Gymnasium": "国立代々木競技場 第一体育館",
    "Tokyo Garden Theater": "東京ガーデンシアター",
    "NHK Hall": "NHKホール",
    "Tokyo International Forum": "東京国際フォーラム",
    "Nakano Sun Plaza": "中野サンプラザ",
    "Shibuya Kokaido": "渋谷公会堂",
    "LINE CUBE SHIBUYA": "LINE CUBE SHIBUYA",
    "Tokyo Dome City Hall": "東京ドームシティホール",
    "Tachikawa Stage Garden": "立川ステージガーデン",
    "Shinagawa Stellar Ball": "品川ステラボール",
    "Zepp DiverCity Tokyo": "Zepp DiverCity (TOKYO)",
    "Zepp DiverCity": "Zepp DiverCity (TOKYO)",
    "Zepp Haneda": "Zepp Haneda (TOKYO)",
    "Zepp Shinjuku": "Zepp Shinjuku (TOKYO)",
    "Zepp Tokyo": "Zepp Tokyo",
    "Shinkiba Studio Coast": "新木場STUDIO COAST",
    "STUDIO COAST": "新木場STUDIO COAST",
    "LIQUIDROOM": "LIQUIDROOM",
    "Ebisu LIQUIDROOM": "恵比寿LIQUIDROOM",
    "Shibuya CLUB QUATTRO": "渋谷CLUB QUATTRO",
    "O-EAST": "Spotify O-EAST",
    "Shibuya O-EAST": "Spotify O-EAST",
    "Spotify O-EAST": "Spotify O-EAST",
    "O-WEST": "Spotify O-WEST",
    "Shibuya O-WEST": "Spotify O-WEST",
    "O-Crest": "Spotify O-Crest",
    "O-nest": "Spotify O-nest",
    "Duo Music Exchange": "duo MUSIC EXCHANGE",
    "WWW": "WWW",
    "WWW X": "WWW X",
    "WWW SHIBUYA": "WWW",
    "Shinjuku LOFT": "新宿LOFT",
    "LOFT": "新宿LOFT",
    "Shimokitazawa SHELTER": "下北沢SHELTER",
    "SHELTER": "下北沢SHELTER",
    "Shimokitazawa Shangri-La": "下北沢Shangri-La",
    "Shindaita FEVER": "新代田FEVER",
    "FEVER": "新代田FEVER",
    "Shibuya eggman": "渋谷eggman",
    "eggman": "渋谷eggman",
    "Shibuya CYCLONE": "渋谷CYCLONE",
    "Shinjuku MARZ": "新宿MARZ",
    "Shinjuku ReNY": "新宿ReNY",
    "ReNY": "新宿ReNY",
    "Shibuya La.mama": "渋谷La.mama",
    "La.mama": "渋谷La.mama",
    "Shibuya STAR LOUNGE": "渋谷STAR LOUNGE",
    "Meguro Antiknock": "目黒Antiknock",
    "Antiknock": "目黒Antiknock",
    "Shibuya WOMB": "渋谷WOMB",
    "ageHa": "ageHa",
    "Billboard Live TOKYO": "ビルボードライブ東京",

    // 神奈川
    "Yokohama Arena": "横浜アリーナ",
    "K-Arena Yokohama": "Kアリーナ横浜",
    "Pia Arena MM": "ぴあアリーナMM",
    "Pacifico Yokohama": "パシフィコ横浜",
    "KT Zepp Yokohama": "KT Zepp Yokohama",
    "Todoroki Arena": "とどろきアリーナ",

    // 埼玉
    "Saitama Super Arena": "さいたまスーパーアリーナ",
    "SSA": "さいたまスーパーアリーナ",

    // 千葉
    "Makuhari Messe": "幕張メッセ",
    "LaLa arena TOKYO-BAY": "ららアリーナ 東京ベイ",
    "Port Arena": "ポートアリーナ",

    // 群馬
    "Yamada Green Dome": "ヤマダグリーンドーム前橋",

    // ============================================
    // 中部 (Chubu)
    // ============================================
    // 愛知
    "Nippon Gaishi Hall": "日本ガイシホール",
    "Aichi Sky Expo": "愛知県国際展示場",
    "Port Messe Nagoya": "ポートメッセなごや",
    "Zepp Nagoya": "Zepp Nagoya",
    "Century Hall": "名古屋国際会議場センチュリーホール",
    "Nagoya Century Hall": "名古屋国際会議場センチュリーホール",
    "Diamond Hall": "DIAMOND HALL",
    "DIAMOND HALL": "DIAMOND HALL",
    "Nagoya CLUB QUATTRO": "名古屋CLUB QUATTRO",
    "THE BOTTOM LINE": "THE BOTTOM LINE",
    "Electric Lady Land": "Electric Lady Land",
    "HUCK FINN": "HUCK FINN",
    "CLUB UPSET": "CLUB UPSET",
    "NAGOYA JAMMIN": "NAGOYA JAMMIN'",
    "TOKUZO": "TOKUZO",
    "得三": "得三",
    "APOLLO BASE": "APOLLO BASE",
    "Nagoya ReNY limited": "名古屋ReNY limited",

    // 新潟
    "Toki Messe": "朱鷺メッセ",
    "Niigata Convention Center": "朱鷺メッセ 新潟コンベンションセンター",
    "LOTS": "新潟LOTS",

    // 静岡
    "Ecopa Arena": "エコパアリーナ",
    "Act City Hamamatsu": "アクトシティ浜松",
    "Hamamatsu Arena": "浜松アリーナ",

    // 福井
    "Sun Dome Fukui": "サンドーム福井",

    // 石川
    "Ishikawa Sports Center": "いしかわ総合スポーツセンター",

    // 長野
    "Matsumoto Performing Arts Centre": "まつもと市民芸術館",
    "Big Hat": "ビッグハット",

    // ============================================
    // 関西 (Kansai)
    // ============================================
    // 大阪
    "Osaka Castle Hall": "大阪城ホール",
    "Osaka-Jo Hall": "大阪城ホール",
    "Osakajo Hall": "大阪城ホール",
    "Asue Arena Osaka": "Asueアリーナ大阪",
    "Osaka Municipal Central Gymnasium": "大阪市中央体育館",
    "Intex Osaka": "インテックス大阪",
    "Yanmar Stadium Nagai": "ヤンマースタジアム長居",
    "Festival Hall": "フェスティバルホール",
    "Orix Theater": "オリックス劇場",
    "Zepp Namba": "Zepp Namba (OSAKA)",
    "Zepp Osaka Bayside": "Zepp Osaka Bayside",
    "Namba Hatch": "なんばHatch",
    "BIGCAT": "BIGCAT",
    "Umeda CLUB QUATTRO": "梅田CLUB QUATTRO",
    "Fandango": "Fandango",
    "Osaka Fandango": "Fandango",
    "Shangri-La": "Shangri-La",
    "北堀江club vijon": "北堀江club vijon",
    "club vijon": "北堀江club vijon",
    "club MERCURY": "club MERCURY",
    "OSAKA MUSE": "OSAKA MUSE",
    "BIG STEP": "心斎橋BIG STEP",
    "DROP": "DROP",
    "RUIDO": "心斎橋RUIDO",
    "Billboard Live OSAKA": "ビルボードライブ大阪",

    // 兵庫
    "Kobe World Memorial Hall": "神戸ワールド記念ホール",
    "World Memorial Hall": "神戸ワールド記念ホール",
    "GLION ARENA KOBE": "GLION ARENA KOBE",
    "Portopia Hall": "神戸ポートピアホール",
    "Kobe Kokusai Hall": "神戸国際会館こくさいホール",
    "Chicken George": "チキンジョージ",

    // 京都
    "Rohm Theatre Kyoto": "ロームシアター京都",
    "Kyoto Concert Hall": "京都コンサートホール",
    "KBS Hall": "KBSホール",

    // 奈良
    "Nara Centennial Hall": "なら100年会館",

    // ============================================
    // 中国・四国 (Chugoku/Shikoku)
    // ============================================
    "Hiroshima Green Arena": "広島グリーンアリーナ",
    "Hiroshima Sun Plaza": "広島サンプラザホール",
    "Club Quattro Hiroshima": "広島CLUB QUATTRO",
    "Okayama Civic Hall": "岡山市民会館",
    "Anabuki Arena Kagawa": "あなぶきアリーナ香川",
    "Takamatsu Olive Hall": "高松オリーブホール",
    "Ehime Prefectural Budokan": "愛媛県武道館",

    // ============================================
    // 九州 (Kyushu)
    // ============================================
    // 福岡
    "Marine Messe Fukuoka": "マリンメッセ福岡",
    "Zepp Fukuoka": "Zepp Fukuoka",
    "Fukuoka Civic Hall": "福岡市民会館",
    "Drum LOGOS": "DRUM LOGOS",
    "DRUM LOGOS": "DRUM LOGOS",
    "Drum Be-1": "DRUM Be-1",
    "DRUM Be-1": "DRUM Be-1",
    "BEAT STATION": "BEAT STATION",
    "Fukuoka BEAT STATION": "BEAT STATION",
    "Fukuoka CB": "福岡CB",
    "Queblick": "Queblick",
    "DRUM SON": "DRUM SON",
    "Livehouse秘密": "Livehouse秘密",
    "Himitsu": "Livehouse秘密",

    // 熊本
    "Grand Messe Kumamoto": "グランメッセ熊本",
    "Kumamoto Prefectural Gymnasium": "熊本県立体育館",

    // 長崎
    "Nagasaki Brick Hall": "長崎ブリックホール",

    // 鹿児島
    "Kagoshima Arena": "鹿児島アリーナ",

    // 沖縄
    "Okinawa Convention Center": "沖縄コンベンションセンター",
    "Naha Civic Hall": "那覇市民会館",
    "Namura Hall": "なむーるホール",

    // 大分
    "iichiko Grand Theater": "iichiko総合文化センター グランシアタ",
    "iichikoグランシアタ": "iichiko総合文化センター グランシアタ",
    "iichiko Sogo Bunka Center": "iichiko総合文化センター",
    "Oita iichiko": "iichiko総合文化センター グランシアタ",

    // ============================================
    // 追加会場 (Additional Venues from DB)
    // ============================================

    // 北海道
    "Coach and Four Kushiro Bunka Hall": "釧路市民文化会館",
    "Iwamizawa Kouen": "岩見沢公園",
    "PENNY LANE 24": "PENNY LANE 24",
    "Country Park": "つま恋リゾート 彩の郷",

    // 東北
    "Hirosaki Shimin Kaikan": "弘前市民会館",
    "TOSAI CLASSIC HALL IWATE": "トーサイクラシックホール岩手",
    "SENDAI GIGS": "SENDAI GIGS",
    "Obihiro Shimin Bunka Hall": "帯広市民文化ホール",

    // 関東
    "Oomiya Sonic City": "大宮ソニックシティ",
    "Mito Shimin Kaikan": "水戸市民会館",
    "Kashiwa PALOOZA": "柏PALOOZA",
    "Soga Sports Kouen": "蘇我スポーツ公園",
    "Shinkiba Wakasu Kouen": "新木場若洲公園",
    "Makuhari Messe Kokusai Tenjijou": "幕張メッセ国際展示場",
    "Makuhari Messe Kokusai Tenjijou Hall 1-2-3": "幕張メッセ国際展示場 1-3ホール",
    "Makuhari Messe Kokusai Tenjijou Hall 4-5-6-7": "幕張メッセ国際展示場 4-7ホール",
    "Makuhari Messe Kokusai Tenjijou Hall 9-10-11": "幕張メッセ国際展示場 9-11ホール",
    "Yoyogi Daiichi Taiikukan": "国立代々木競技場 第一体育館",
    "Nissan Stadium": "日産スタジアム",

    // 中部
    "Nagano CLUB JUNK BOX": "長野CLUB JUNK BOX",
    "HARD OFF ECO Stadium Niigata": "HARD OFF ECOスタジアム新潟",
    "Nihon Gaishi Hall": "日本ガイシホール",
    "Honda no Mori Hall": "本多の森ホール",
    "Shizuoka Shimin Bunka Kaikan": "静岡市民文化会館",
    "Phoenix Plaza": "フェニックスプラザ",

    // 関西
    "Osaka-jou Hall": "大阪城ホール",
    "Karasuma Hantou Shibafu Hiroba": "唐船半島芝生広場",
    "KYOTO PULSE PLAZA": "京都パルスプラザ",
    "Biwako Hall": "滋賀県立芸術劇場 びわ湖ホール",
    "MAIZURU P.B. Harbor Park": "舞鶴P.B.ハーバーパーク",
    "Sun Arena": "サンアリーナ",

    // 中国・四国
    "Kurashiki Shimin Kaikan": "倉敷市民会館",
    "Torigin Bunka Kaikan": "とりぎん文化会館",
    "Shuunan-shi Bunka Kaikan": "周南市文化会館",
    "Rexxam Hall": "レクザムホール",
    "Sanuki Man-nou Kouen": "讃岐まんのう公園",
    "Ehime-ken Kenmin Bunka Kaikan": "愛媛県県民文化会館",
    "Kouchi Kenritsu Kenmin Bunka Hall": "高知県立県民文化ホール",

    // 九州
    "Shimin Kaikan Sears Home Yume Hall": "市民会館シアーズホーム夢ホール",
    "Tarukawa Dock Open-Air Special Stages": "樽川ドック野外特設ステージ",
    "Umi no Mori Kouen": "海の森公園",
    "Kawashou Hall": "かわしょうホール",

    // 海外
    "Korea University Hwajeong Gymnasium": "高麗大学校 ファジョン体育館",
    "The Pier-2 Art Center": "駁二アート特区",
    "The Republik": "The Republik (ハワイ)",

    // ライブハウス
    "B-FLAT": "B-FLAT",
    "Music Station": "ミュージックステーション",
    "Music Town Oto Ichiba": "ミュージックタウン音市場",
    "Example Fes Grounds": "フェス会場",
    "Hitachi Kaihin Kouen": "国営ひたち海浜公園",
};


/**
 * Normalizes a venue name by checking against the translation dictionary.
 */
function normalizeVenueName(venue) {
    if (!venue) return venue;

    if (venueTranslations[venue]) {
        return venueTranslations[venue];
    }

    const lowerVenue = venue.toLowerCase();
    const match = Object.keys(venueTranslations).find(key => key.toLowerCase() === lowerVenue);

    if (match) {
        return venueTranslations[match];
    }

    return venue;
}

module.exports = { normalizeSongTitle, songTranslations, normalizeVenueName, venueTranslations };
