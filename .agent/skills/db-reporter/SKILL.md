---
name: db-reporter
description: データベースの統計情報をレポートとして自動生成する（ライブ数、曲数、ツアー情報等）
---

# DB Reporter Skill

データベースの統計情報を収集し、見やすいレポートを生成するスキル。

## 使用タイミング
- ユーザーが「DB統計」「レポート」「サマリー」等を依頼した場合
- データの全体像を把握したい場合
- 定期チェック時

## レポート項目

### 1. 全体統計
```sql
-- 全体のサマリー
SELECT
  (SELECT COUNT(*) FROM lives) as total_lives,
  (SELECT COUNT(*) FROM songs) as total_songs,
  (SELECT COUNT(*) FROM setlists) as total_setlist_entries,
  (SELECT COUNT(DISTINCT user_id) FROM users) as total_users,
  (SELECT MIN(date) FROM lives) as earliest_live,
  (SELECT MAX(date) FROM lives) as latest_live;
```

### 2. 年別統計
```sql
-- 年別ライブ数と曲数
SELECT
  EXTRACT(YEAR FROM l.date) as year,
  COUNT(DISTINCT l.id) as live_count,
  COUNT(sl.id) as total_songs_played,
  COUNT(DISTINCT sl.song_id) as unique_songs_played,
  ROUND(COUNT(sl.id)::numeric / COUNT(DISTINCT l.id), 1) as avg_songs_per_live
FROM lives l
LEFT JOIN setlists sl ON l.id = sl.live_id
GROUP BY EXTRACT(YEAR FROM l.date)
ORDER BY year;
```

### 3. ツアー別統計
```sql
-- ツアー別集計
SELECT
  tour_name,
  COUNT(*) as live_count,
  MIN(date) as start_date,
  MAX(date) as end_date,
  (MAX(date) - MIN(date)) as duration_days
FROM lives
WHERE tour_name IS NOT NULL
GROUP BY tour_name
ORDER BY MIN(date) DESC;
```

### 4. 曲別演奏回数ランキング
```sql
-- 演奏回数トップ20
SELECT s.title, COUNT(sl.id) as play_count,
  MIN(l.date) as first_played,
  MAX(l.date) as last_played
FROM songs s
JOIN setlists sl ON s.id = sl.song_id
JOIN lives l ON sl.live_id = l.id
GROUP BY s.id, s.title
ORDER BY play_count DESC
LIMIT 20;
```

### 5. 会場別統計
```sql
-- 会場別ライブ回数
SELECT venue, COUNT(*) as visit_count,
  MIN(date) as first_visit,
  MAX(date) as last_visit
FROM lives
GROUP BY venue
ORDER BY visit_count DESC
LIMIT 20;
```

### 6. ライブタイプ別統計
```sql
SELECT type, COUNT(*) as count
FROM lives
GROUP BY type
ORDER BY count DESC;
```

## 出力フォーマット

```
📊 データベース統計レポート
生成日時: 2026-02-25

━━━━━━━━━━━━━━━━━━━━
📋 全体統計
━━━━━━━━━━━━━━━━━━━━
総ライブ数:     1,234
総楽曲数:       456
セットリスト数:  28,901
登録ユーザー数:  12
データ範囲:     2005-01-01 ～ 2026-01-15

━━━━━━━━━━━━━━━━━━━━
📅 年別統計
━━━━━━━━━━━━━━━━━━━━
| 年    | ライブ数 | 総曲数 | ユニーク曲 | 平均曲数 |
|-------|---------|-------|-----------|---------|
| 2024  | 45      | 1,125 | 87        | 25.0    |
| 2023  | 52      | 1,300 | 92        | 25.0    |
| ...   | ...     | ...   | ...       | ...     |

━━━━━━━━━━━━━━━━━━━━
🎵 演奏回数トップ20
━━━━━━━━━━━━━━━━━━━━
 1. CORE PRIDE         (452回)
 2. 儚くも永久のカナシ   (389回)
 ...
```

## 接続情報
- ローカルDB: `server/.env` の `DATABASE_URL` を使用
- 本番DB: ユーザーの明示的な指示がある場合のみ
