# Server Scripts

このディレクトリには、データベースのセットアップ、マイグレーション、管理タスク用の再利用可能なスクリプトが含まれています。

## セットアップ・初期化スクリプト

### `setup_uver_db.js`
データベースの初期セットアップを実行します。テーブルの作成と基本的な構造を設定します。

**使用方法:**
```bash
node server/scripts/setup_uver_db.js
```

### `seed_full_data.js`
データベースにシードデータ（UVERworldのライブ・楽曲データ）を投入します。

**使用方法:**
```bash
node server/scripts/seed_full_data.js
```

## マイグレーションスクリプト

### `migrate_admin.js`
ユーザーテーブルに管理者権限カラムを追加するマイグレーション。

**使用方法:**
```bash
node server/scripts/migrate_admin.js
```

### `migrate_add_status.js`
ステータス関連のカラムを追加するマイグレーション。

**使用方法:**
```bash
node server/scripts/migrate_add_status.js
```

### `create_corrections_table.js`
訂正リクエスト用のテーブルを作成します。

**使用方法:**
```bash
node server/scripts/create_corrections_table.js
```

### `create_security_logs_table.js`
セキュリティログ用のテーブルを作成します。

**使用方法:**
```bash
node server/scripts/create_security_logs_table.js
```

### `update_users_table.js`
ユーザーテーブルを更新します。

**使用方法:**
```bash
node server/scripts/update_users_table.js
```

## 管理タスク

### `promote_admin.js`
指定したメールアドレスのユーザーに管理者権限を付与します。

**使用方法:**
```bash
node server/scripts/promote_admin.js <email>
```

**例:**
```bash
node server/scripts/promote_admin.js user@example.com
```

---

## 注意事項

⚠️ **本番環境での実行には十分注意してください**

- これらのスクリプトは主に開発・検証環境での使用を想定しています
- 本番環境で実行する前に、必ず検証環境でテストしてください
- データベースのバックアップを取ってから実行することを推奨します

詳細は[環境構成ガイド](../../ENVIRONMENT_GUIDE.md)を参照してください。
