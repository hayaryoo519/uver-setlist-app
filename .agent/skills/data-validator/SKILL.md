---
name: data-validator
description: セットリストデータの整合性を自動チェックする（曲数欠番、日付ずれ、重複曲、会場名の揺れ等）
---

# Data Validator Skill

セットリストデータの整合性を検証するスキル。ローカルDBまたは本番DBのデータ品質をチェックし、問題をレポートする。

## 使用タイミング
- ユーザーが「データチェック」「整合性チェック」「バリデーション」等を依頼した場合
- 特定の年のセットリストデータを確認する場合
- データインポート後の検証時

## チェック項目

### 1. セットリスト Position 欠番チェック
各ライブの `setlists` テーブルで `position` カラムに欠番がないか確認する。

```sql
-- positionの欠番を検出するクエリ
SELECT l.date, l.venue, sl.position,
  LAG(sl.position) OVER (PARTITION BY l.id ORDER BY sl.position) as prev_position
FROM lives l
JOIN setlists sl ON l.id = sl.live_id
WHERE EXTRACT(YEAR FROM l.date) = :year
ORDER BY l.date, sl.position;
```

欠番がある場合は、メドレー曲の未登録や削除ミスの可能性を報告する。

### 2. 日付の妥当性チェック
- 同じツアーで日付が連続していない場合を検出
- 未来日付のライブが `setlists` を持っていないか確認
- 日付が重複しているライブがないか確認

```sql
-- 同日に複数ライブがある場合を検出（Day/Nightは正常）
SELECT date, COUNT(*) as live_count
FROM lives
GROUP BY date
HAVING COUNT(*) > 2
ORDER BY date;
```

### 3. 曲名の重複・揺れチェック
- 同一曲が異なる表記で登録されていないか確認
- 正規化した曲名で比較し、重複候補を検出

```sql
-- 類似曲名の検出
SELECT s1.id, s1.title, s2.id, s2.title
FROM songs s1
JOIN songs s2 ON s1.id < s2.id
WHERE LOWER(REPLACE(s1.title, ' ', '')) = LOWER(REPLACE(s2.title, ' ', ''));
```

### 4. 会場名の揺れチェック
- 同一会場が異なる表記で登録されていないか確認（例: 「日本ガイシホール」vs「Nippon Gaishi Hall」）

```sql
-- 会場名の一覧と使用回数
SELECT venue, COUNT(*) as usage_count
FROM lives
GROUP BY venue
ORDER BY venue;
```

### 5. 孤立データチェック
- `songs` テーブルに存在するが `setlists` で一度も使われていない曲
- `setlists` に参照されているが `songs` に存在しない曲ID

```sql
-- 一度も演奏されていない曲
SELECT s.id, s.title
FROM songs s
LEFT JOIN setlists sl ON s.id = sl.song_id
WHERE sl.id IS NULL;
```

## 出力フォーマット
チェック結果は以下のフォーマットで報告する：

```
=== データ整合性チェックレポート ===
対象: 2015年 / 全年

✅ 正常項目
- Position連番: 問題なし (58/61 ライブ)

⚠️ 警告
- Position欠番: 3件検出
  - 2015-11-22 真駒内セキスイハイムアリーナ (position 23 欠番)
  - ...

❌ エラー
- 曲名重複: 2件検出
  - "GOLD" (id: 5) と "Gold" (id: 123)
  - ...
```

## 接続情報
- ローカルDB: `server/.env` の `DATABASE_URL` を使用
- 本番DB: ユーザーの明示的な指示がある場合のみ。`OPERATIONS.md` を参照
