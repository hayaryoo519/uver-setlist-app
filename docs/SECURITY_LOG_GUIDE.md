# セキュリティログ調査ガイド

このドキュメントでは、`security_logs` テーブルに記録されたログの調査方法と、セキュリティ判断の基準をまとめます。

## 📊 いつ使用するべきか

### 定期的な確認（推奨）

| タイミング | コマンド | 目的 |
|----------|---------|------|
| **毎日** | `node server/check_logs.js` | 最新の異常を早期発見 |
| **毎週** | `node server/analyze_security.js` | 週間トレンドの把握 |
| **毎月** | 古いログの削除 | データベース容量の管理 |

### 特定の状況での確認

#### 🚨 即座に確認すべき状況

1. **ユーザーから「ログインできない」という報告があった時**
   - 本当にパスワードを忘れたのか
   - 攻撃を受けているのか判断

2. **サーバーのパフォーマンスが低下した時**
   - 大量のログイン試行攻撃の可能性
   - システムエラーの急増を確認

3. **深夜や休日に異常なトラフィックを検知した時**
   - 自動化された攻撃の可能性
   - 疑わしいIPを特定

#### ⚠️ 定期的に確認すべき状況

1. **新機能をリリースした後**
   - 予期しないエラーが発生していないか
   - ユーザーの混乱によるログイン失敗が増えていないか

2. **セキュリティニュースで大規模な攻撃が報道された時**
   - 自分のアプリも標的になっていないか
   - 同様のパターンがないか確認

3. **月初・月末**
   - 月間統計の確認
   - 古いログの削除

### 記録されるイベント

| イベントタイプ | 説明 | 記録される情報 |
|--------------|------|--------------|
| `login_failed` | ログイン失敗 | メールアドレス、IP、失敗理由 |
| `error` | システムエラー | エラーメッセージ、スタックトレース、URL |
| `suspicious` | 不審なアクティビティ | （将来的に追加予定） |

### ログの保存期間

- **現在**: 無制限（手動削除が必要）
- **推奨**: 定期的に古いログ（30日以上前）を削除

---


## 🔍 確認方法

> [!IMPORTANT]
> **コマンド実行場所**
> 
> すべてのコマンドは、**プロジェクトのルートディレクトリ**（`uver-setlist-app/`）で実行してください。
> 
> ```bash
> # 現在地を確認
> pwd  # Linux/Mac
> cd   # Windows PowerShell
> 
> # プロジェクトルートに移動（例）
> cd c:\Users\oault\.gemini\antigravity\scratch\uver-setlist-app
> ```

### 方法1: 簡易スクリプト（推奨）

最新10件のログを確認：

```bash
# プロジェクトルートで実行
node server/check_logs.js
```

**出力例:**
```
Found 2 log(s):

--- Log #1 ---
ID: 2
Time: Sat Jan 24 2026 01:08:07 GMT+0900
Type: login_failed
Message: ユーザーが存在しません
Email: hacker@evil.com
IP: ::1
```

### 方法2: データベース直接クエリ

> [!NOTE]
> PostgreSQLクライアント（`psql`）を使用してデータベースに直接接続する場合は、任意の場所から実行できます。

#### データベースに接続

```bash
# 任意の場所で実行可能
psql -U your_username -d uverworld_setlist
```


#### 最新のログを確認

```sql
SELECT 
    id,
    timestamp,
    event_type,
    message,
    user_email,
    ip_address
FROM security_logs
ORDER BY timestamp DESC
LIMIT 20;
```

#### ログイン失敗のみを確認

```sql
SELECT 
    timestamp,
    message,
    user_email,
    ip_address
FROM security_logs
WHERE event_type = 'login_failed'
ORDER BY timestamp DESC;
```

#### 特定のIPアドレスからのアクセスを確認

```sql
SELECT 
    timestamp,
    event_type,
    message,
    user_email
FROM security_logs
WHERE ip_address = '123.45.67.89'
ORDER BY timestamp DESC;
```

#### 過去24時間のログを確認

```sql
SELECT 
    event_type,
    COUNT(*) as count
FROM security_logs
WHERE timestamp > NOW() - INTERVAL '24 hours'
GROUP BY event_type;
```

#### 同一IPからの連続失敗を検出

```sql
SELECT 
    ip_address,
    user_email,
    COUNT(*) as attempt_count,
    MIN(timestamp) as first_attempt,
    MAX(timestamp) as last_attempt
FROM security_logs
WHERE event_type = 'login_failed'
    AND timestamp > NOW() - INTERVAL '1 hour'
GROUP BY ip_address, user_email
HAVING COUNT(*) >= 3
ORDER BY attempt_count DESC;
```

### 方法3: カスタムスクリプトの作成

特定の調査用にスクリプトを作成できます：

**実行場所:** プロジェクトルート（`uver-setlist-app/`）

```bash
# プロジェクトルートで実行
node server/analyze_security.js
```

**スクリプト例:** `server/analyze_security.js`

```javascript
const { Pool } = require('pg');
require('dotenv').config();


const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
});

async function analyzeSecurityLogs() {
    const client = await pool.connect();
    try {
        // 過去7日間の統計
        const stats = await client.query(`
            SELECT 
                event_type,
                COUNT(*) as count,
                COUNT(DISTINCT ip_address) as unique_ips
            FROM security_logs
            WHERE timestamp > NOW() - INTERVAL '7 days'
            GROUP BY event_type
        `);

        console.log('=== 過去7日間の統計 ===');
        stats.rows.forEach(row => {
            console.log(`${row.event_type}: ${row.count}件 (${row.unique_ips} 個のIP)`);
        });

        // 疑わしいIPアドレス（5回以上失敗）
        const suspicious = await client.query(`
            SELECT 
                ip_address,
                COUNT(*) as failed_attempts,
                array_agg(DISTINCT user_email) as targeted_emails
            FROM security_logs
            WHERE event_type = 'login_failed'
                AND timestamp > NOW() - INTERVAL '24 hours'
            GROUP BY ip_address
            HAVING COUNT(*) >= 5
            ORDER BY failed_attempts DESC
        `);

        if (suspicious.rows.length > 0) {
            console.log('\n⚠️  疑わしいIPアドレス:');
            suspicious.rows.forEach(row => {
                console.log(`  ${row.ip_address}: ${row.failed_attempts}回失敗`);
                console.log(`    対象: ${row.targeted_emails.join(', ')}`);
            });
        }

    } finally {
        client.release();
        await pool.end();
    }
}

analyzeSecurityLogs();
```

---

## 🚨 セキュリティ判断基準

### 正常なパターン

| 状況 | 判断 |
|------|------|
| 1日に1〜2件のログイン失敗 | ✅ 正常（ユーザーのタイプミス） |
| 異なるIPから散発的な失敗 | ✅ 正常 |
| エラーログが1日に数件 | ✅ 正常（バグや一時的な問題） |

### 注意が必要なパターン

| 状況 | 判断 | 対応 |
|------|------|------|
| 同一IPから5回以上の連続失敗 | ⚠️ 注意 | IPを監視、必要に応じてブロック |
| 存在しないメールアドレスへの大量試行 | ⚠️ 注意 | アカウント列挙攻撃の可能性 |
| 短時間（5分以内）に10回以上の失敗 | ⚠️ 注意 | ブルートフォース攻撃の可能性 |

### 危険なパターン

| 状況 | 判断 | 対応 |
|------|------|------|
| 同一IPから100回以上の失敗 | 🚨 危険 | **即座にIPをブロック** |
| 複数の異なるIPから同一アカウントへの攻撃 | 🚨 危険 | **分散攻撃、該当アカウントを一時ロック** |
| システムエラーが急増（1時間に50件以上） | 🚨 危険 | **サービス障害の可能性、調査必須** |
| 深夜（2〜5時）に大量のログイン試行 | 🚨 危険 | **自動化された攻撃の可能性** |

---

## 📋 定期チェックリスト

### 毎日（推奨）

**実行場所:** プロジェクトルート（`uver-setlist-app/`）

```bash
# 最新のログを確認
node server/check_logs.js
```

**確認ポイント:**
- [ ] 異常な数のログイン失敗がないか
- [ ] 同一IPからの連続失敗がないか
- [ ] システムエラーが急増していないか

### 毎週（推奨）

```sql
-- 過去7日間の統計
SELECT 
    DATE(timestamp) as date,
    event_type,
    COUNT(*) as count
FROM security_logs
WHERE timestamp > NOW() - INTERVAL '7 days'
GROUP BY DATE(timestamp), event_type
ORDER BY date DESC, event_type;
```

**確認ポイント:**
- [ ] 日別のログイン失敗数の推移
- [ ] 特定の日に異常な増加がないか
- [ ] エラーの傾向

### 毎月（推奨）

```sql
-- 古いログの削除（30日以上前）
DELETE FROM security_logs
WHERE timestamp < NOW() - INTERVAL '30 days';
```

**確認ポイント:**
- [ ] ログのサイズが肥大化していないか
- [ ] 長期的なトレンド分析

---

## 🛡️ 対応アクション

### レベル1: 監視強化

**条件:** 同一IPから5〜10回の失敗

**対応:**
1. IPアドレスをメモ
2. 24時間監視
3. 継続する場合はレベル2へ

### レベル2: 警告

**条件:** 同一IPから10〜50回の失敗

**対応:**
1. ログに記録
2. 該当IPからのアクセスを監視
3. 必要に応じてレート制限を強化

### レベル3: ブロック

**条件:** 同一IPから50回以上の失敗

**対応:**
1. **ファイアウォールでIPをブロック**
2. ログを保存（証拠として）
3. 必要に応じて管理者に報告

**IPブロック方法（例）:**
```bash
# Nginxの場合
# /etc/nginx/conf.d/blocked_ips.conf に追加
deny 123.45.67.89;

# サービス再起動
sudo systemctl reload nginx
```

---

## 📝 ログ分析の例

### ケーススタディ1: ブルートフォース攻撃

**ログの内容:**
```
IP: 203.0.113.45
失敗回数: 127回
期間: 2026-01-24 02:00 〜 02:15（15分間）
対象: admin@example.com, test@example.com, user@example.com
```

**判断:** 🚨 **ブルートフォース攻撃**

**対応:**
1. 即座にIP `203.0.113.45` をブロック
2. ログを保存
3. 対象アカウントのパスワードを確認（弱いパスワードの場合は変更を促す）

### ケーススタディ2: ユーザーのパスワード忘れ

**ログの内容:**
```
IP: 192.168.1.100
失敗回数: 3回
期間: 2026-01-24 10:00 〜 10:05（5分間）
対象: user@example.com（同一ユーザー）
```

**判断:** ✅ **正常（ユーザーのパスワード忘れ）**

**対応:**
- 特になし
- 必要に応じてユーザーにパスワードリセットを案内

### ケーススタディ3: アカウント列挙攻撃

**ログの内容:**
```
IP: 198.51.100.23
失敗回数: 45回
期間: 2026-01-24 03:00 〜 03:30（30分間）
対象: すべて異なるメールアドレス（存在しないアカウント）
```

**判断:** ⚠️ **アカウント列挙攻撃**

**対応:**
1. IP `198.51.100.23` を監視リストに追加
2. 継続する場合はブロック
3. レート制限の強化を検討

---

## 🔧 便利なSQLクエリ集

### 今日のログイン失敗数

```sql
SELECT COUNT(*) as today_failures
FROM security_logs
WHERE event_type = 'login_failed'
    AND DATE(timestamp) = CURRENT_DATE;
```

### 最も攻撃されているメールアドレス

```sql
SELECT 
    user_email,
    COUNT(*) as attack_count
FROM security_logs
WHERE event_type = 'login_failed'
    AND timestamp > NOW() - INTERVAL '7 days'
GROUP BY user_email
ORDER BY attack_count DESC
LIMIT 10;
```

### 時間帯別のログイン失敗

```sql
SELECT 
    EXTRACT(HOUR FROM timestamp) as hour,
    COUNT(*) as failures
FROM security_logs
WHERE event_type = 'login_failed'
    AND timestamp > NOW() - INTERVAL '7 days'
GROUP BY hour
ORDER BY hour;
```

### エラーの種類別集計

```sql
SELECT 
    message,
    COUNT(*) as count
FROM security_logs
WHERE event_type = 'error'
    AND timestamp > NOW() - INTERVAL '24 hours'
GROUP BY message
ORDER BY count DESC;
```

---

## 📚 参考情報

### 一般的な攻撃パターン

1. **ブルートフォース攻撃**: 同一IPから大量のログイン試行
2. **辞書攻撃**: 一般的なパスワードを順番に試行
3. **クレデンシャルスタッフィング**: 他サイトから漏洩したパスワードを使用
4. **アカウント列挙**: 存在するアカウントを特定する試み
5. **分散攻撃（DDoS）**: 複数のIPから同時攻撃

### セキュリティのベストプラクティス

- ✅ 定期的にログを確認（最低でも週1回）
- ✅ 異常なパターンを早期に検知
- ✅ 疑わしいIPは即座に対応
- ✅ ログを定期的にバックアップ
- ✅ 古いログは削除してパフォーマンスを維持

---

## 🚀 今後の改善案

Phase 2として、以下の機能を追加できます：

- [ ] **自動アラート**: 異常検知時にメール通知
- [ ] **IPブロックリスト**: 自動的に危険なIPをブロック
- [ ] **ダッシュボード**: アドミン画面でグラフ表示
- [ ] **レート制限**: 同一IPからの連続試行を制限
- [ ] **2要素認証**: セキュリティをさらに強化

現時点では、このガイドに従って手動でログを確認することで、十分なセキュリティを確保できます。
