# SNS投稿プレイブック

UVERworldのライブデータを活用したX(Twitter)投稿ネタをDBから生成する手順書。
Claude Codeがこのファイルを参照し、SQLを叩いて投稿文を生成することを想定。

## 使い方

1. このファイルのネタを選ぶ
2. SQLセクションをローカルDB（port:54332）または本番DBで実行
3. 結果を投稿テンプレートに当てはめる

DB接続コマンド（ローカル）:
```powershell
chcp 65001 | Out-Null; $env:PGPASSWORD="postgres"; $env:PGCLIENTENCODING="UTF8"; `
  psql -U postgres -h localhost -p 54332 -d uver_app_db --no-psqlrc -A -t -c "<SQL>"
```

セトリ有効判定の共通条件（全クエリで使用）:
```sql
l.setlist_status = 'NORMAL' OR EXISTS (SELECT 1 FROM setlists s2 WHERE s2.live_id = l.id)
```

---

## ①  初披露 / 最終披露 / 経過日数

```sql
SELECT
  s.title,
  MIN(l.date)::text                         AS first_date,
  MAX(l.date)::text                         AS last_date,
  COUNT(sl.id)::int                         AS total_count,
  (CURRENT_DATE - MAX(l.date)::date)::int   AS days_since_last
FROM songs s
JOIN setlists sl ON s.id = sl.song_id
JOIN lives l     ON sl.live_id = l.id
WHERE l.setlist_status = 'NORMAL'
   OR EXISTS (SELECT 1 FROM setlists s2 WHERE s2.live_id = l.id)
GROUP BY s.id, s.title
ORDER BY days_since_last DESC   -- 最長未披露順。ASC にすると最近披露順
LIMIT 20;
```

投稿テンプレート:
```
「{title}」が最後に披露されたのは{days_since_last}日前（{last_date}）

初披露：{first_date}
通算披露回数：{total_count}回

#UVERworld #セトリアーカイブ
```

---

## ② 最長未披露ランキング（毎日更新可能）

```sql
SELECT
  s.title,
  MAX(l.date)::text                        AS last_date,
  (CURRENT_DATE - MAX(l.date)::date)::int  AS days_since
FROM songs s
JOIN setlists sl ON s.id = sl.song_id
JOIN lives l     ON sl.live_id = l.id
WHERE l.setlist_status = 'NORMAL'
   OR EXISTS (SELECT 1 FROM setlists s2 WHERE s2.live_id = l.id)
GROUP BY s.id, s.title
HAVING MAX(l.date) < CURRENT_DATE - INTERVAL '2 years'
ORDER BY days_since DESC
LIMIT 10;
```

投稿テンプレート:
```
【{year}年間 聴けていない曲 TOP10😢】

1位：{title}（{days_since}日 / 最後：{last_date}）
2位：...

次のツアーで復活するかも…？
全履歴→ {URL}

#UVERworld
```

---

## ③ 今日と同じ日付の過去ライブ（Today in History）

```sql
SELECT
  l.date::text,
  l.tour_name,
  l.venue,
  l.prefecture,
  COUNT(sl.id)::int AS songs
FROM lives l
LEFT JOIN setlists sl ON l.id = sl.live_id
WHERE EXTRACT(MONTH FROM l.date) = EXTRACT(MONTH FROM CURRENT_DATE)
  AND EXTRACT(DAY   FROM l.date) = EXTRACT(DAY   FROM CURRENT_DATE)
  AND l.date < CURRENT_DATE
GROUP BY l.id, l.date, l.tour_name, l.title, l.venue, l.prefecture
ORDER BY l.date DESC;
```

投稿テンプレート:
```
【今日はUVERworldライブの日📅】

▶ {date} {tour_name}
  @{venue}（{prefecture}）{songs}曲

あの日会場にいた人いますか？
セトリ確認→ {URL}

#UVERworld #今日のライブ記録
```

---

## ④ ツアー皆勤賞 / レア曲（ツアー名を指定して実行）

```sql
-- :tour_name に対象ツアー名を入れる（例：'UVERworld ZERO LAG TOUR'）
WITH tour_lives AS (
  SELECT id FROM lives
  WHERE COALESCE(tour_name, title) = :tour_name
),
tour_total AS (
  SELECT COUNT(*)::int AS live_count FROM tour_lives
)
SELECT
  s.title,
  COUNT(sl.id)::int                                   AS cnt,
  (COUNT(sl.id)::numeric / tt.live_count * 100)::int  AS pct,
  tt.live_count
FROM songs s
JOIN setlists sl  ON s.id = sl.song_id
JOIN tour_lives tl ON sl.live_id = tl.id
CROSS JOIN tour_total tt
GROUP BY s.id, s.title, tt.live_count
ORDER BY cnt DESC;
```

投稿テンプレート（皆勤賞）:
```
【{tour_name} 全{live_count}公演 皆勤賞🏆】

全公演で演奏された曲
🔥 {title}（{live_count}/{live_count}）
🔥 ...

#UVERworld #{tour_name}
```

投稿テンプレート（レア曲 cnt=1）:
```
【{tour_name} "1公演だけ"のレア曲】

{live_count}公演のうち、たった1回だけ…
・{title}
・...

当てた会場にいた人は激レア体験✨

#UVERworld
```

---

## ⑤ 開幕曲 / ラスト曲ランキング

```sql
-- 開幕曲（position = 1）
SELECT s.title, COUNT(sl.id)::int AS cnt
FROM songs s
JOIN setlists sl ON s.id = sl.song_id
JOIN lives l     ON sl.live_id = l.id
WHERE (l.setlist_status = 'NORMAL' OR EXISTS (SELECT 1 FROM setlists s2 WHERE s2.live_id = l.id))
  AND sl.position = 1
GROUP BY s.id, s.title
ORDER BY cnt DESC
LIMIT 10;

-- ラスト曲（その公演の最大position）
SELECT s.title, COUNT(sl.id)::int AS cnt
FROM songs s
JOIN setlists sl ON s.id = sl.song_id
JOIN lives l     ON sl.live_id = l.id
WHERE (l.setlist_status = 'NORMAL' OR EXISTS (SELECT 1 FROM setlists s2 WHERE s2.live_id = l.id))
  AND sl.position = (SELECT MAX(sl2.position) FROM setlists sl2 WHERE sl2.live_id = l.id)
GROUP BY s.id, s.title
ORDER BY cnt DESC
LIMIT 10;
```

投稿テンプレート:
```
【UVERworld 歴代 開幕曲 TOP5🎸】

1位：{title}（{cnt}回）
2位：...

あなたが一番印象的な1曲目は？

#UVERworld #セトリ記録
```

---

## ⑥ 突然復活曲（最大空白期間からの復活）

```sql
WITH song_intervals AS (
  SELECT
    s.id, s.title, l.date,
    LAG(l.date) OVER (PARTITION BY s.id ORDER BY l.date) AS prev_date,
    (l.date - LAG(l.date) OVER (PARTITION BY s.id ORDER BY l.date))::int AS gap_days
  FROM songs s
  JOIN setlists sl ON s.id = sl.song_id
  JOIN lives l     ON sl.live_id = l.id
  WHERE l.setlist_status = 'NORMAL'
     OR EXISTS (SELECT 1 FROM setlists s2 WHERE s2.live_id = l.id)
)
SELECT title, date::text AS comeback_date, prev_date::text, gap_days
FROM song_intervals
WHERE gap_days IS NOT NULL
ORDER BY gap_days DESC
LIMIT 10;
```

投稿テンプレート:
```
「{title}」が{gap_days}日ぶり（約{years}年ぶり）に復活🔥

{prev_date} → {comeback_date}

あのとき会場にいた人は伝説👑

#UVERworld
```

---

## ⑦ 季節曲（特定の月に披露率が高い曲）

```sql
-- :target_month に月数値を入れる（例：8 = 夏）
WITH monthly_lives AS (
  SELECT EXTRACT(MONTH FROM date)::int AS month, COUNT(*)::int AS live_count
  FROM lives
  WHERE setlist_status = 'NORMAL'
     OR EXISTS (SELECT 1 FROM setlists s WHERE s.live_id = lives.id)
  GROUP BY EXTRACT(MONTH FROM date)
),
song_monthly AS (
  SELECT s.title, EXTRACT(MONTH FROM l.date)::int AS month, COUNT(sl.id)::int AS cnt
  FROM songs s
  JOIN setlists sl ON s.id = sl.song_id
  JOIN lives l     ON sl.live_id = l.id
  WHERE l.setlist_status = 'NORMAL'
     OR EXISTS (SELECT 1 FROM setlists s2 WHERE s2.live_id = l.id)
  GROUP BY s.id, s.title, EXTRACT(MONTH FROM l.date)
)
SELECT sm.title, sm.cnt, ml.live_count,
  ROUND(sm.cnt::numeric / ml.live_count * 100, 1) AS pct
FROM song_monthly sm
JOIN monthly_lives ml ON sm.month = ml.month
WHERE sm.month = :target_month
  AND sm.cnt >= 5
ORDER BY pct DESC
LIMIT 10;
```

投稿テンプレート:
```
【夏ライブで聴ける確率が高い曲☀️】

1位：{title}（夏公演の{pct}%で披露）
2位：...

今年の夏ツアーでも聴けるかも？

#UVERworld #夏フェス
```

---

## ⑧ 今日で◯周年（初披露記念日）

```sql
SELECT
  s.title,
  MIN(l.date)::text                                  AS first_date,
  EXTRACT(YEAR FROM AGE(CURRENT_DATE, MIN(l.date)))::int AS years_ago
FROM songs s
JOIN setlists sl ON s.id = sl.song_id
JOIN lives l     ON sl.live_id = l.id
WHERE l.setlist_status = 'NORMAL'
   OR EXISTS (SELECT 1 FROM setlists s2 WHERE s2.live_id = l.id)
GROUP BY s.id, s.title
HAVING EXTRACT(MONTH FROM MIN(l.date)) = EXTRACT(MONTH FROM CURRENT_DATE)
   AND EXTRACT(DAY   FROM MIN(l.date)) = EXTRACT(DAY   FROM CURRENT_DATE)
   AND EXTRACT(YEAR  FROM AGE(CURRENT_DATE, MIN(l.date))) > 0
ORDER BY first_date;
```

投稿テンプレート:
```
今日（{month}/{day}）は「{title}」が初披露されてから{years_ago}周年🎂

{first_date} に初めてライブで演奏された

今も愛され続ける名曲✨

#UVERworld #{title}
```

---

## ⑨ 地域限定曲（特定の都道府県でしか披露されていない曲）

```sql
WITH song_prefs AS (
  SELECT s.id, s.title, l.prefecture, COUNT(sl.id)::int AS cnt
  FROM songs s
  JOIN setlists sl ON s.id = sl.song_id
  JOIN lives l     ON sl.live_id = l.id
  WHERE (l.setlist_status = 'NORMAL' OR EXISTS (SELECT 1 FROM setlists s2 WHERE s2.live_id = l.id))
    AND l.prefecture IS NOT NULL
  GROUP BY s.id, s.title, l.prefecture
),
song_pref_count AS (
  SELECT id, COUNT(DISTINCT prefecture)::int AS pref_count
  FROM song_prefs
  GROUP BY id
)
SELECT sp.title, sp.prefecture, sp.cnt
FROM song_prefs sp
JOIN song_pref_count spc ON sp.id = spc.id
WHERE spc.pref_count = 1   -- 1都道府県のみで披露
ORDER BY sp.cnt DESC
LIMIT 20;
```

投稿テンプレート:
```
「{title}」は{prefecture}でしか披露されていないレア曲🗾

{prefecture}ファンだけが聴けた{cnt}回

#UVERworld #{prefecture}
```

---

## ⑩ フェス専用 / ワンマン専用曲

```sql
-- フェス率が高い曲（type = 'FESTIVAL' or 'EVENT' でフィルタ）
WITH song_counts AS (
  SELECT
    s.id, s.title,
    COUNT(sl.id)::int AS total,
    SUM(CASE WHEN l.type IN ('FESTIVAL', 'EVENT') THEN 1 ELSE 0 END)::int AS fes_cnt,
    SUM(CASE WHEN l.type NOT IN ('FESTIVAL', 'EVENT') OR l.type IS NULL THEN 1 ELSE 0 END)::int AS wo_cnt
  FROM songs s
  JOIN setlists sl ON s.id = sl.song_id
  JOIN lives l     ON sl.live_id = l.id
  WHERE l.setlist_status = 'NORMAL'
     OR EXISTS (SELECT 1 FROM setlists s2 WHERE s2.live_id = l.id)
  GROUP BY s.id, s.title
)
SELECT title, total, fes_cnt, wo_cnt,
  ROUND(fes_cnt::numeric / total * 100, 1) AS fes_pct
FROM song_counts
WHERE total >= 5
ORDER BY fes_pct DESC   -- ASC にするとワンマン専用
LIMIT 10;
```

投稿テンプレート:
```
【フェスでしか聴けない曲🎪】

「{title}」はフェス出演時の{fes_pct}%で披露
ワンマンではほぼ聴けないレア曲

#UVERworld #フェス
```

---

## 実装済み・動作確認済み一覧

| # | ネタ名 | 確認日 | 備考 |
|---|---|---|---|
| ① | 初披露/最終披露 | 2026-05-10 | — |
| ② | 最長未披露ランキング | 2026-05-10 | — |
| ③ | Today in History | 2026-05-10 | — |
| ④ | ツアー皆勤賞/レア曲 | 2026-05-10 | ZERO LAG TOURで確認 |
| ⑤ | 開幕曲/ラスト曲 | 2026-05-10 | — |
| ⑥ | 突然復活曲 | 2026-05-10 | — |
| ⑦ | 季節曲 | 2026-05-10 | — |
| ⑧ | 今日で◯周年 | 2026-05-10 | 該当日のみデータ出力 |
| ⑨ | 地域限定曲 | 未確認 | prefecture精度に依存 |
| ⑩ | フェス専用/ワンマン専用 | 未確認 | — |

## 未実装ネタ（将来追加候補）

- ⑤ セトリ連続記録（ウィンドウ関数・難易度高）
- ⑨ 相棒曲・共起分析（自己JOIN・計算コスト高）
- ⑫ セトリ変化率（前公演との差分）
- ⑬ 「この日しかない」組み合わせ
- ⑦ ライブ専用曲（音源未収録情報がDBにない）
