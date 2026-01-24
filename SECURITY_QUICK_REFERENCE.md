# セキュリティログ - クイックリファレンス

## 📍 コマンド実行場所

**すべてのコマンドはプロジェクトルートで実行してください**

```bash
# 現在地を確認（Windows PowerShell）
cd

# プロジェクトルートに移動（例）
cd c:\Users\oault\.gemini\antigravity\scratch\uver-setlist-app
```

---

## 🚀 よく使うコマンド

### 最新ログを確認（最新10件）

```bash
node server/check_logs.js
```

### 詳細分析（統計・疑わしいIP・エラーなど）

```bash
node server/analyze_security.js
```

### データベーステーブルの作成（初回のみ）

```bash
node server/create_security_logs_table.js
```

---

## 📊 出力例

### check_logs.js の出力

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

### analyze_security.js の出力

```
=== セキュリティログ分析 ===

📊 過去7日間の統計:
  login_failed: 2件 (1 個のIP)

📅 今日のログイン失敗: 2件

✅ 疑わしいIPアドレスはありません

🎯 最も攻撃されているメールアドレス（過去7日間）:
  1. hacker@evil.com: 1回 (1 個のIPから)
  2. test@example.com: 1回 (1 個のIPから)
```

---

## 🚨 セキュリティ判断基準（簡易版）

| 状況 | 判断 | 対応 |
|------|------|------|
| 1日に1〜2件のログイン失敗 | ✅ 正常 | なし |
| 同一IPから5〜10回の失敗 | ⚠️ 注意 | 監視 |
| 同一IPから50回以上の失敗 | 🚨 危険 | **IPをブロック** |
| 短時間に大量のエラー | 🚨 危険 | **調査必須** |

---

## 📚 詳細ドキュメント

より詳しい情報は以下を参照：

- **[SECURITY_LOG_GUIDE.md](docs/SECURITY_LOG_GUIDE.md)** - 完全なセキュリティログ調査ガイド
  - SQLクエリ例
  - ケーススタディ
  - 対応アクション詳細
  - 定期チェックリスト

---

## 💡 Tips

### 定期的にチェック

```bash
# 毎日実行（推奨）
node server/check_logs.js

# 週1回実行（推奨）
node server/analyze_security.js
```

### 古いログの削除（30日以上前）

```sql
-- psqlで実行
DELETE FROM security_logs
WHERE timestamp < NOW() - INTERVAL '30 days';
```

### 特定のIPを調査

```sql
-- psqlで実行
SELECT * FROM security_logs
WHERE ip_address = '123.45.67.89'
ORDER BY timestamp DESC;
```

---

## 🔧 トラブルシューティング

### エラー: "client password must be a string"

**原因:** `.env` ファイルが正しく読み込まれていない

**解決方法:**
1. プロジェクトルートで実行していることを確認
   ```bash
   cd c:\Users\oault\.gemini\antigravity\scratch\uver-setlist-app
   ```

2. `.env` ファイルが `server/` ディレクトリに存在することを確認
   ```bash
   # ファイルの存在確認
   ls server/.env
   ```

3. `.env` ファイルの内容を確認
   ```
   DB_USER=postgres
   DB_PASSWORD=your_password
   DB_HOST=localhost
   DB_PORT=54332
   DB_NAME=uver_app_db
   ```

### エラー: "relation 'security_logs' does not exist"

**原因:** テーブルが作成されていない

**解決方法:**
```bash
node server/create_security_logs_table.js
```

### エラー: "connection refused"

**原因:** PostgreSQLサーバーが起動していない、またはポート番号が間違っている

**解決方法:**
1. PostgreSQLが起動していることを確認
2. `.env` の `DB_PORT` が正しいことを確認（デフォルト: 5432）
