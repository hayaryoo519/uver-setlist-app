# Productionコードリリース前の運用者確認（読み取り専用）

**更新（2026-10-22）:** 事前確認後に[Release v1.31.0を配備済み](live_country_production_release_result.md)。以下は配備前に使った手順・観測値の記録であり、現在の本番migration状態を示すものではない。再実行すれば新しい状態を読み取り専用で確認できる。

対象候補：`dev` 全体（2026-10-21時点 `0e4efdf1`）。開催国の**コードリリース**と、国データの手動確定は別作業。`main` へのマージ・公開Releaseは、この事前確認が揃う前に行わない。現時点でこちらには本番ホスト/DBへの読み取り専用接続がない。

## 公開・Gitから確認済み

- `origin/main=e389c326`、`origin/dev=0e4efdf1`（mainから101コミット）。最新公開Release `v1.30.2` はmainの `e389c326`。Production公開 `/api/ping` は `pong`、未認証の `/api/lives/1277/metadata` は404。これらは本番DBスキーマ、メール配送、管理権限の証明ではない。
- Stagingでは同じdev SHAへの自動配備が成功し、公開国はKR1/JP3、追加48件は未確認のまま。[配備・確認記録](live_country_production_release_preflight.md)を参照。

## 運用者からの実行結果（2026-10-22報告）

以下は運用者が上記手順で得て共有した**集計結果**で、こちらの本番DBへの独立接続ではない：DB名/ロールは期待どおり、永続CREATE権限なし、migration履歴あり、適用済み29件と配備済み29件が一致（差分なし）、`live_metadata` / `live_artists` は未作成。これは030〜034適用前の状態と整合する。メール設定、バックアップ、Node/systemd、並行配備の状態は未報告のため引き続き停止条件。

`dev` → `main` の[Draft PR #251](https://github.com/hayaryoo519/uver-setlist-app/pull/251)を作成し、head `0e4efdf1` のmain向けCI 3ジョブは成功。PR作成やCI成功だけでProductionに配備したことにはならない。

## 運用者にお願いする読み取り専用確認

本番ホストの通常のアプリ実行権限で、**現在デプロイ済みの** `~/apps/uver-setlist-app/server` から以下を実行する。`.env`、パスワード、トークン、生データ、ログ原文は貼らない。結果は真偽値・件数・migrationファイル名だけ共有する。別ホストやStagingの `.env` を使わない。

```bash
cd ~/apps/uver-setlist-app/server
node - <<'NODE'
const fs = require('node:fs');
const path = require('node:path');
require('dotenv').config({ path: path.resolve('.env'), quiet: true });
const { Pool } = require('pg');
(async () => {
  if (process.env.DB_NAME !== 'uver_setlist_prod') throw Error('Wrong DB_NAME; stopped before connecting');
  const pool = new Pool({ user: process.env.DB_USER, password: process.env.DB_PASSWORD,
    host: process.env.DB_HOST, port: process.env.DB_PORT, database: process.env.DB_NAME,
    connectionTimeoutMillis: 5000, max: 1 });
  let client;
  try {
    client = await pool.connect();
    await client.query('BEGIN READ ONLY');
    await client.query("SET LOCAL statement_timeout = '5s'");
    const identity = (await client.query(`SELECT current_database() AS db, current_user AS role,
      has_schema_privilege(current_user, 'public', 'CREATE') AS schema_create`)).rows[0];
    if (identity.db !== 'uver_setlist_prod') throw Error('Connected to wrong database');
    const objects = (await client.query(`SELECT to_regclass('public.schema_migrations') IS NOT NULL AS history,
      to_regclass('public.live_metadata') IS NOT NULL AS metadata,
      to_regclass('public.live_artists') IS NOT NULL AS artists`)).rows[0];
    const applied = objects.history
      ? (await client.query('SELECT filename FROM public.schema_migrations ORDER BY filename')).rows.map(x => x.filename)
      : [];
    const deployed = fs.readdirSync(path.resolve('migrations')).filter(x => /^\d+_.*\.sql$/.test(x)).sort();
    console.log(JSON.stringify({ database_expected: true,
      role_matches_config: identity.role === process.env.DB_USER,
      schema_create_before_release: identity.schema_create,
      migration_history_exists: objects.history,
      metadata_table_already_exists: objects.metadata,
      artists_table_already_exists: objects.artists,
      applied_count: applied.length,
      deployed_code_count: deployed.length,
      applied_not_in_deployed_code: applied.filter(x => !deployed.includes(x)),
      deployed_code_not_applied: deployed.filter(x => !applied.includes(x)) }, null, 2));
    await client.query('ROLLBACK');
  } finally {
    if (client) client.release();
    await pool.end();
  }
})().catch(() => { console.error('Read-only preflight failed; details withheld'); process.exitCode = 1; });
NODE
```

期待する確認：DB名とロールの一致、適用履歴の存在、**旧コードのmigrationと履歴の差分が説明可能**、033/034の表の事前存在がないか説明可能。`schema_create_before_release` は権限状態の観測値であり、真偽だけで勝手にGRANT/REVOKEしない。SQLは `BEGIN READ ONLY` でSELECTのみを実行するが、接続先を取り違えたら直ちに停止する。`migrate:dry` はmigration履歴表を作る可能性があり、ここでは使わない。

同じホストで、秘密値を表示せずに次も確認する：Nodeの実行バージョンとsystemdの起動状態/時刻、バックアップ保存先の容量・直近の復元可能なバックアップ、別のデプロイ/同期が実行中でないこと。新コードのメール設定はHTTPS `APP_URL` と有効な送信者/認証情報を要求するが、旧コードのpingだけでは確認できない。**現行mainにはまだ候補の `server/scripts/check_email_configuration.js` がない**ため、本番サーバーで現在の `.env` の存在・形式だけを秘密値なしで確認する例を以下に示す。SMTP到達性や実配送は検証しない。

```bash
cd ~/apps/uver-setlist-app/server
node - <<'NODE'
const path = require('node:path');
require('dotenv').config({ path: path.resolve('.env'), quiet: true });
const user = process.env.EMAIL_USER;
const password = process.env.EMAIL_PASS;
const senderValid = typeof user === 'string' && /^[^\s@<>,;"]+@[^\s@<>,;"]+$/.test(user) && !/your_email/i.test(user);
const passwordValid = typeof password === 'string' && password.trim().length > 0 && !/your_app_password/i.test(password);
let urlValid = false;
try {
  const url = new URL(process.env.APP_URL || '');
  urlValid = url.protocol === 'https:' && !url.username && !url.password && !url.search && !url.hash
    && url.pathname === '/' && !['localhost', '127.0.0.1', '[::1]'].includes(url.hostname);
} catch (_) { /* report a boolean only */ }
console.log(JSON.stringify({ node_major: Number(process.versions.node.split('.')[0]),
  production_mode: !['development', 'test'].includes(process.env.NODE_ENV),
  email_sender_format_valid: senderValid, email_password_present: passwordValid,
  app_url_https_valid: urlValid }));
NODE
systemctl show uver-setlist -p ActiveState -p ActiveEnterTimestamp
```

上記は秘密値・宛先を出さない形式の確認で、候補コードそのものの実行ではない。バックアップの構造/チェックサム・保存先容量・復旧手順も運用者が確認し、結果だけ共有する。`--smtp` は外部通信を伴うため別判断。

## 停止条件と次の承認

想定外のmigration履歴・表、DB/ロール不一致、権限の説明不足、メール設定未確認、バックアップ/容量/復旧手順不備、並行デプロイがあれば停止。Productionホストの状態を確認せずにGitHub Releaseをpublishしない。事前確認が揃った後に `main` マージ候補SHA・CIを確定し、**公開Releaseは別の明示的な実行確認**を受ける。国データはリリース後も未確認のままで、別承認なしに保存しない。
