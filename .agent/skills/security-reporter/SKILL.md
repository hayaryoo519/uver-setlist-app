---
name: security-reporter
description: セキュリティログとアクセスログを分析し、不審なアクティビティをレポートする（本番環境対応）
---

# Security Reporter Skill

`security_logs` テーブルやサーバーログからセキュリティ関連の情報を収集・分析し、レポートを生成するスキル。

## 使用タイミング
- ユーザーが「セキュリティ」「アクセスログ」「不審アクセス」等を依頼した場合
- 定期的なセキュリティ監査時
- 不正アクセスの疑いがある場合

---

## データ取得方法

### 方法1: 本番API経由（推奨）

本番環境には管理者認証付きのAPIが用意されている。`read_url_content` やブラウザツールで取得する。

**エンドポイント一覧:**

| エンドポイント | メソッド | 説明 |
|:---|:---|:---|
| `https://uver-setlist-archive.org/api/logs/recent` | GET | 最新10件のセキュリティログ |
| `https://uver-setlist-archive.org/api/logs/analysis` | GET | 週間分析データ（統計、不審IP、攻撃対象メール） |
| `https://uver-setlist-archive.org/api/logs/cleanup` | DELETE | 30日以上前のログを削除 |

**注意:** すべてのエンドポイントは管理者認証（`authorize` + `adminCheck`）が必要。
ブラウザからアクセスする場合は、まず本番サイトに管理者アカウントでログインしてからアクセスする。

**`/api/logs/recent` レスポンス例:**
```json
{
  "logs": [
    {
      "id": 1,
      "timestamp": "2026-02-25T12:30:00Z",
      "event_type": "login_success",
      "message": "ログイン成功",
      "user_email": "admin@example.com",
      "ip_address": "192.168.0.1"
    }
  ]
}
```

**`/api/logs/analysis` レスポンス例:**
```json
{
  "stats": [
    { "event_type": "login_success", "count": "28", "unique_ips": "5" },
    { "event_type": "login_failed", "count": "3", "unique_ips": "2" }
  ],
  "todayFailures": 0,
  "suspiciousIPs": [
    {
      "ip_address": "203.x.x.x",
      "failed_attempts": "7",
      "targeted_emails": ["user@test.com"],
      "first_attempt": "2026-02-25T01:00:00Z",
      "last_attempt": "2026-02-25T03:00:00Z"
    }
  ],
  "targetedEmails": [
    { "user_email": "admin@example.com", "attack_count": "3" }
  ],
  "totalLogs": 156
}
```

### 方法2: SSH経由で本番DB直接クエリ

ユーザーから明示的に指示された場合のみ使用する。

**接続手順:**
```bash
# 1. 本番サーバーにSSH接続
ssh haya-ryoo@192.168.0.13

# 2. 本番DBに接続
psql -U haya-ryoo -d uver_setlist_prod

# 3. クエリを実行（以下のSQLセクション参照）
```

**⚠️ 注意事項:**
- 本番DBへの接続はユーザーの明示的な指示がある場合のみ
- DELETE操作は絶対にユーザーの確認なしに実行しない
- 接続後は必ず切断を確認する

### 方法3: ローカルDB（開発環境）

ローカル開発サーバーが起動中の場合、`server/.env` の `DATABASE_URL` を使用。
```
http://localhost:8000/api/logs/recent
http://localhost:8000/api/logs/analysis
```

---

## 分析用SQLクエリ（SSH経由で使用）

### 1. ログイン試行の統計
```sql
SELECT
  event_type,
  COUNT(*) as count,
  COUNT(DISTINCT ip_address) as unique_ips,
  COUNT(DISTINCT user_email) as unique_emails
FROM security_logs
WHERE event_type IN ('login_success', 'login_failed')
  AND timestamp >= NOW() - INTERVAL '7 days'
GROUP BY event_type;
```

### 2. ブルートフォース検出（IPアドレス別の失敗ログイン）
```sql
SELECT
  ip_address,
  COUNT(*) as fail_count,
  array_agg(DISTINCT user_email) as targeted_emails,
  MIN(timestamp) as first_attempt,
  MAX(timestamp) as last_attempt
FROM security_logs
WHERE event_type = 'login_failed'
  AND timestamp >= NOW() - INTERVAL '24 hours'
GROUP BY ip_address
HAVING COUNT(*) >= 5
ORDER BY fail_count DESC;
```

### 3. 不審なIP検出（複数アカウント対象）
```sql
SELECT
  ip_address,
  COUNT(DISTINCT user_email) as target_accounts,
  COUNT(*) as total_attempts
FROM security_logs
WHERE event_type = 'login_failed'
  AND timestamp >= NOW() - INTERVAL '7 days'
GROUP BY ip_address
HAVING COUNT(DISTINCT user_email) >= 2
ORDER BY target_accounts DESC;
```

### 4. 時間帯別アクセスパターン
```sql
SELECT
  EXTRACT(HOUR FROM timestamp) as hour,
  event_type,
  COUNT(*) as count
FROM security_logs
WHERE timestamp >= NOW() - INTERVAL '7 days'
GROUP BY EXTRACT(HOUR FROM timestamp), event_type
ORDER BY hour;
```

### 5. イベントタイプ別サマリー
```sql
SELECT
  event_type,
  COUNT(*) as count,
  MIN(timestamp) as first_occurrence,
  MAX(timestamp) as last_occurrence
FROM security_logs
WHERE timestamp >= NOW() - INTERVAL '30 days'
GROUP BY event_type
ORDER BY count DESC;
```

### 6. 直近20件のログ
```sql
SELECT timestamp, event_type, message, user_email, ip_address
FROM security_logs
ORDER BY timestamp DESC
LIMIT 20;
```

---

## アラートレベル判定

| レベル | 条件 | アクション |
|:---|:---|:---|
| 🟢 **正常** | 失敗ログイン < 5回/日 | 報告のみ |
| 🟡 **注意** | 同一IPから5-10回失敗 | 監視強化を推奨 |
| 🔴 **危険** | 同一IPから10回以上失敗、または複数アカウントが対象 | IPブロックを推奨 |

---

## IPブロック手順（危険レベル時）

`OPERATIONS.md` に記載の手順に従う：

```bash
# 1. 本番サーバーにSSH接続
ssh haya-ryoo@192.168.0.13

# 2. nginx設定にブロック対象IPを追加
# /home/haya-ryoo/web/nginx.conf または block_ips.conf に追加
deny <対象IP>;

# 3. nginx設定を反映
docker exec web-nginx nginx -s reload
```

**⚠️ IPブロックの実行は必ずユーザーの承認を得てから行うこと。**

---

## 出力フォーマット

```
🔒 セキュリティレポート
対象環境: 本番 (uver-setlist-archive.org)
期間: 過去7日間 (2026-02-18 ～ 2026-02-25)

━━━━━━━━━━━━━━━━━━━━
🟢 総合評価: 正常
━━━━━━━━━━━━━━━━━━━━

📊 ログイン統計（過去7日間）
  成功: 28件 (ユニークIP: 5)
  失敗: 3件 (ユニークIP: 2)
  今日の失敗: 0件

⚠️ 不審なIPアドレス
  なし（過去24時間で5回以上失敗したIPなし）

🎯 攻撃対象メールアドレス
  なし

🕐 総ログ数: 156件

📝 直近のイベント
  2026-02-25 21:30 login_success admin@xxx.com (192.168.x.x)
  2026-02-25 20:15 login_failed  unknown@test.com (203.x.x.x)
  ...
```
