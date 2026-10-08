# データベース運用・同期マニュアル

本ドキュメントでは、本番環境のデータを安全にバックアップし、検証環境（Docker）へ同期する手順を説明します。

## 1. 本番データのバックアップ取得

本番環境（`~/apps/uver-setlist-app`）で、カスタム形式（`-Fc`）のバックアップを取得します。

```bash
# 手動実行する場合
./scripts/backup-db.sh
```

`BACKUP_DIR`を省略した場合は、リポジトリ直下の`backups/`へ保存されます。
別の保存先を使う場合のみ`BACKUP_DIR=/path/to/backups`を指定してください。

- **出力先**: `backups/backup_YYYYMMDD_HHMMSS.dump.gz`
- **自動実行**: Production Actions はマイグレーション直前に同じバックアップを取得します。
- **特徴**: gzip圧縮後のバックアップに対する整合性チェックサム（sha256）が自動生成されます。
- **アクセス権**: スクリプトは `umask 077` で実行し、新規の保存ディレクトリは700、ダンプ・チェックサムは600で作成します。既存ファイル・ディレクトリの権限は変更しません。バックアップは実行ユーザーと管理者だけが利用する前提です。
- **本番デプロイ**: `.env` の退避・復元は600で行います。サービスとデプロイの実行ユーザーを分離する場合は、環境ファイルとバックアップの必要なアクセス権も合わせて見直してください。

生成されるファイル:

```text
backup_YYYYMMDD_HHMMSS.dump.gz
backup_YYYYMMDD_HHMMSS.dump.gz.sha256
```

保存・転送後の検証:

```bash
cd backups
sha256sum -c backup_YYYYMMDD_HHMMSS.dump.gz.sha256
```

### リモート転送後の自動検証

`REMOTE_BACKUP_SERVER` が設定されている場合は、バックアップ本体とチェックサムを転送した後、リモート保存先で `sha256sum -c` を自動実行します。

- チェックサムには保存先に依存しないファイル名だけを記録する。
- リモート検証に失敗した場合はバックアップ処理を失敗扱いにし、ローカル世代管理は実行しない。
- `REMOTE_BACKUP_SERVER` が未設定の場合は、従来どおりローカル保存のみ行う。

### バックアップの世代管理

Production Actions の自動バックアップでディスクを圧迫しないよう、ローカル保存分に世代管理を適用します。

#### 仕様

- **保持期間**: 既定で30日。環境変数 `BACKUP_RETENTION_DAYS` で上書き可能。
- **削除タイミング**: 新しいバックアップの作成、構造検証、gzip圧縮、SHA256生成、および設定済みの場合はリモート転送がすべて成功した後に実行する。
- **削除対象**: `BACKUP_DIR` 直下にある、保持期間を超えた `backup_*.dump.gz` と対応する `backup_*.dump.gz.sha256` のみ。
- **対象外**: 作成途中の `.dump`、命名規則に一致しないファイル、サブディレクトリ、リモート転送先のファイルは削除しない。
- **安全策**: 削除前に対象ファイルをログ出力する。今回作成したバックアップは削除対象に含めない。
- **失敗時の扱い**: 削除に失敗した場合は警告ログを出すが、正常に作成できたバックアップを無効扱いにせず、デプロイも停止しない。

#### 補足

リモート転送先の保持期間は、保存先の容量やバックアップ方針が未確定のため、この実装では扱いません。必要になった時点で別途決めます。

---

## 2. 検証環境（Docker）への同期

本番のバックアップファイルを、検証環境の PostgreSQL コンテナに流し込みます。

### 実行コマンド
スクリプトがあるディレクトリで、Staging専用の接続情報を指定して実行します。先に「4. メンテナンス中の実行手順」に従ってStagingアプリを停止し、並行するデプロイ・同期がないことを確認します。

```bash
STAGING_DB_NAME=uver_setlist_staging \
PGHOST=127.0.0.1 \
PGPORT=54325 \
PGUSER=postgres \
PGPASSWORD=postgres \
./scripts/sync-db.sh ./backups/backup_YYYYMMDD_HHMMSS.dump.gz
```

### 注意点・工夫したポイント
- **所有者エラーの回避**: `pg_restore` に `--no-owner --no-privileges` を使用しているため、本番（`<server-user>`）と検証（`postgres`）でユーザー名が異なっていても同期可能です。
- **TCP接続の強制**: `PGHOST=127.0.0.1` を指定することで、Dockerのポートマッピング経由での接続を確実にします。
- **別端末からの接続**: 検証DBのホスト公開はIPv4 localhost限定です。直接LAN接続せず、SSHトンネル経由で接続してください。コンテナ内からは従来どおり `db-staging:5432` を使います。
- **自動匿名化**: 同期完了後、以下の処理が自動で実行されます。
  - `users` テーブルを空にし、所有する連番をリセット。本番ユーザーのID・管理者権限・登録/削除時刻・公開設定・認証情報を保持しません。関連テーブルと同じTRUNCATE文で処理し、想定外の外部キー参照はCASCADEで消さず同期失敗にします。
  - `corrections` テーブルのクリア。説明だけでなくライブ名等の自由入力、申請者・審査者の関連も残しません。
  - `security_logs`, `push_subscriptions`, `collector_logs` 等の機密テーブルのクリア。
  - `user_spotify_tokens`, `user_google_tokens`, `playlist_history` のクリア。アクセストークン・暗号化された更新トークン・本番ユーザーのプレイリストIDを残しません。連携導入前のバックアップでこれらのテーブルが存在しない場合は、そのテーブルのみスキップします。同期後の外部連携はStaging専用設定と検証用アカウントでやり直してください。
  - `attendance`, `user_follows`, `predictions`, `prediction_songs`, `prediction_likes`, `raw_setlists`, `social_posts` のクリア。参戦・フォロー・いいねの関連、予想タイトル、OCR本文/JSON/画像URL、収集元URL、投稿候補/エラーを本番から持ち込みません。導入前のバックアップは存在するテーブルだけを処理します。外部キーで関連するテーブルを一括処理し、想定外の依存はCASCADEで削除せず同期失敗にします。
- **未加工データの非公開**: 復元SQLと匿名化を1つのトランザクションで実行し、匿名化成功後にだけコミットします。別のDB接続から復元途中の未加工データは読めません。これはDBの可視性の制御であり、HTTPアクセスの遮断やメンテナンス画面の自動設定ではありません。
- **失敗時の停止**: SQL生成に失敗した場合は既存DBを変更しません。復元・匿名化のSQLエラーは非ゼロで終了し、ロールバック後に同期先DBを削除します。DB再作成時に接続中などで削除できなければ、復元には進みません。異常終了時もアプリを自動再開しません。
- **一時SQLの保護**: 復元SQLは秘密値を含むため、権限600の一時ファイルに生成し、終了時に削除します。圧縮前のSQLを置ける容量が必要です。強制終了（SIGKILL）やホスト停止では削除されないことがあるため、再開前に担当者が残存ファイルを確認します。実行ログやSQLを公開Issueへ貼らないでください。
- **未対応の範囲**: バックアップ原本の保護、匿名化対象の網羅性、Staging専用の外部連携設定は別途確認が必要です。この変更だけで安全な同期全体が完成したとは扱わず、実データを使った同期はまだ実施しません。

### 同期データの扱いと残件（2026-10-08）

| 対象 | 同期後の扱い | 影響・残件 |
|:---|:---|:---|
| users | 空にし、所有する連番をリセット | 本番由来のユーザー行・権限・時刻を残さない。同期後は独立した検証アカウントを準備。DB削除は既存JWTの失効を保証しない |
| 参戦・フォロー・予想・いいね | 空にする | 個人の活動や関係を検証環境へ残さない。必要な画面検証は架空データで準備 |
| 修正申請・OCR下書き・SNS投稿候補/履歴 | 空にする | 自由入力、原文、画像/投稿URL、申請・審査・投稿者の関連も削除。下書き/投稿画面の検証は架空データで準備 |
| OAuth/プレイリスト・push・セキュリティ/収集ログ | 空にする | トークン、通知先、IP等を保持しない |
| songs・lives・setlists・album_cache | 保持 | 公開カタログ・正式セットリストを使った検証を維持。公開ノート/インポートメタデータへの機密情報混入は別途確認 |
| schema_migrations | 保持 | 既存migration適用履歴を維持 |
| アップロード画像・バックアップ原本・env・実行ログ | DB同期では変更しない | DBの画像URLを消してもファイルは消えない。画像の静的公開、ファイル同期と残存物、秘密値、ログの保護を別途確認 |

クリア対象はStaging同期先だけです。本番の履歴や画像を削除しません。新しいテーブル/列を追加したときはこの一覧と同期処理を見直し、個人情報を含むデータを確認なしにコピーしないでください。

---

## 3. スキーマ（テーブル構造）の最新化

検証環境が本番より進んでいる（新しい機能の開発中）場合、同期した本番データには新しいテーブルが存在しません。
同期完了後、必ずマイグレーションを実行してください。

```bash
# 検証環境のディレクトリ（~/apps/uver-setlist-staging）で実行
docker compose exec app-staging npm run migrate
```

- **重要**: これを行わないと、新機能（例: `predictions` テーブルなど）にアクセスする際に API が 500/404 エラーを返します。

---

## 4. メンテナンス中の実行手順

1. Stagingのデプロイ完了を待ち、同期中にdev push・別の同期・アプリ再起動を実行しないよう調整します。
2. `~/apps/uver-setlist-staging` で `docker compose stop app-staging` を実行し、`docker compose ps --status running app-staging` に稼働中アプリがないことを確認します。DBコンテナは停止しません。
3. Staging接続情報で同期スクリプトを実行します。終了コードが0でなければアプリを停止したまま、残存DB・一時SQL・非公開の診断を確認します。成功した扱いで再開しません。
4. 成功後、同じStagingディレクトリで `docker compose run --rm app-staging node server/scripts/migrate.js` を実行します。失敗時は停止を維持します。
5. 本番と異なるStaging専用のJWT署名鍵で、同期前のStagingセッションを失効させます。ユーザーIDを再利用するため、以前のJWTを新しい検証アカウントへ結び付けないことを再開条件にします。DBのユーザー削除だけでJWTが失効したとは扱いません。鍵の値はログやIssueへ貼りません。
6. 下記の専用CLIで独立した検証アカウントを準備します。本番アカウント・パスワード・固定の共有パスワードをコピーしません。`server/scripts/seed_local.js` はライブ/セットリストも初期化するため、この同期後のStagingでは実行しません。JWT鍵更新と旧セッション拒否の実確認が済むまでは実データ同期を再開しません。
7. ここまで成功した後にだけ `docker compose up -d app-staging` を実行し、`curl --fail http://127.0.0.1:9001/api/ping` と公開画面・DB接続・検証アカウントのログイン/認可を確認します。起動後の実APIでも同期前のJWTが403、新しいJWTが認証を通ることを確認します。

同期スクリプトはCompose・プロキシを自動操作しません。停止中は通常画面の代わりに接続エラーとなることがあるため、必要なメンテナンス告知は事前に設定します。実データ同期の再開前には、匿名化対象とStaging専用設定の残件も確認します。

### StagingのJWT鍵更新

Composeが読む設定は `~/apps/uver-setlist-staging/.env` の `JWT_SECRET` です。本番の `~/apps/uver-setlist-app/server/.env` は変更しません。デプロイとの重複を避け、旧設定とアップロード画像を公開ディレクトリ外の700ディレクトリ/600ファイルへ退避します。旧設定の退避ファイルにも秘密値があるため、IssueやCIへ添付しません。

Stagingアプリを停止した状態で、次の処理で鍵だけを更新します。曖昧な定義や複数定義、シンボリックリンク、保護されていない設定ファイルは更新を拒否します。

```bash
cd ~/apps/uver-setlist-staging
python3 - <<'PY'
import os, pathlib, re, secrets, stat, tempfile
path = pathlib.Path('.env')
assert path.is_file() and not path.is_symlink()
assert path.stat().st_uid == os.getuid()
assert stat.S_IMODE(path.stat().st_mode) == 0o600
original = path.read_bytes()
pattern = r'(?m)^(?:export[ \t]+)?JWT_SECRET[ \t]*=[^\r\n]*$'
text = original.decode()
definitions = re.findall(pattern, text)
assert len(definitions) == 1
assert re.fullmatch(r'(?:export[ \t]+)?JWT_SECRET[ \t]*=[ \t]*[A-Za-z0-9_-]+[ \t]*', definitions[0])
updated = re.sub(pattern, 'JWT_SECRET=' + secrets.token_hex(64), text)
fd, temporary = tempfile.mkstemp(prefix='.env.jwt-', dir='.')
try:
    with os.fdopen(fd, 'wb') as stream:
        stream.write(updated.encode())
        stream.flush()
        os.fsync(stream.fileno())
    assert path.read_bytes() == original
    os.replace(temporary, path)
finally:
    if os.path.exists(temporary):
        os.unlink(temporary)
PY
```

引用符付き/複数行など、この処理が拒否する設定はdotenvの実際の読み取り結果を非公開で確認してから別途対応します。鍵・JWTそのものをstdoutへ出しません。停止中は新しい鍵で旧JWTの署名検証が失敗することを確認し、手順6へ進みます。`docker compose restart` は変更後の環境変数を取り込まないため、再開時は `docker compose up -d --no-deps --force-recreate app-staging` を使います。現在のuploadsはコンテナ内にあるため、再作成後に退避画像を復元して内容の一致を確認します。

再開後は秘密値を表示しない検証処理で、次を再開条件にします。既存ユーザーのデータを読む代わりに、存在しない検証用ユーザーID（例: -2147483648）を使った短寿命のJWTで `GET /api/users/me/attended_lives` を呼びます。

- 更新前のStaging鍵で署名したJWT: 403、無効なトークンの応答。
- 本番鍵で署名した同じ架空ユーザーのJWT: Stagingで403。鍵の比較も一致/不一致だけを記録。
- 新しいStaging鍵で署名したJWT: 200、空配列。DB接続と認証を確認し、ユーザー作成やDB書き込みはしません。
- 稼働コンテナの鍵と設定ファイルの鍵が一致し、本番鍵と不一致。設定ファイル600、画像の内容一致、ヘルスチェック成功。

失敗時は再開完了と扱わず、Stagingを停止して非公開の診断を確認します。旧鍵をそのまま戻すと旧JWTも再び有効になるため、復旧でも新しい鍵を使います。更新はStagingの全ログインを失効させます。本番のセッションは失効させません。

2026-10-08に実Stagingで鍵更新・コンテナ再作成・画像4ファイルの復元を実施し、上記の旧JWT/本番署名JWT拒否、新JWT受け入れ、設定600、ヘルスチェックを確認しました。更新前も本番と異なる鍵でした。本番設定・DBは変更せず、実データ同期と検証アカウントの作成も実行していません。外部連携設定・公開自由入力・ファイル/ログ保護などの残件は引き続き同期再開条件です。

### 同期後の専用検証アカウント作成（Linuxサーバー）

同期・migration・旧セッション失効の確認後、アプリを停止したままStagingディレクトリで実行します。ホストの実行ユーザーとコンテナのnodeユーザーはUID1000が一致する構成です。

```bash
cd ~/apps/uver-setlist-staging
mkdir -p "$HOME/.local/state"
staging_credentials_dir=$(mktemp -d "$HOME/.local/state/uver-staging-accounts.XXXXXX")
docker compose run --rm -e APP_ENV=staging \
  --volume "$staging_credentials_dir:/run/staging-accounts" \
  app-staging node server/scripts/create_staging_accounts.js \
  /run/staging-accounts/accounts.json
```

CLIは明示的なStaging設定と実接続先DB名を確認し、usersが空の場合だけadmin/userを1名ずつトランザクションで作成します。ユーザー名/メールは架空、パスワードは各アカウントごとの乱数、保存はbcrypt。メール送信・外部連携・カタログ変更は行いません。

資格情報はホスト側の `$staging_credentials_dir/accounts.json`（ディレクトリ700/ファイル600）に保存されます。stdoutやIssueへパスワードを出さず、担当者が非公開の方法で利用します。認証済み・プロフィール非公開の検証アカウントです。既存ユーザーがいる場合、出力先が既存の場合、保護ディレクトリでない場合は失敗し、既存のユーザー/ファイルを上書きしません。成功を確認したら手順7の起動・ログイン/認可確認へ進みます。

COMMIT時の接続エラーは成立したか不明な場合があるため、資格情報ファイルを保持します。終了コードが非ゼロならアプリを停止したまま、DBの件数と非公開ファイルの状態を確認し、既存ユーザーを消して無条件に再実行しないでください。このCLI自体はJWT鍵を更新せず、旧トークンも失効させません。

---

## 5. 本番DBのスキーマ変更ルール

### 基本ルール

- 本番DBを手作業で直接変更しない。
- スキーマ変更は `server/migrations/` に連番の SQL ファイルを追加し、`server/scripts/migrate.js` で適用する。
- 適用済みの SQL ファイルは編集しない。修正が必要な場合は、新しい連番ファイルを追加する。
- 通常リリースでは、旧コードと新コードの両方で動作する後方互換な変更だけを行う。

```text
025_add_xxx.sql
026_create_xxx.sql
```

### 通常リリースで扱える変更

- nullable なカラム追加
- デフォルト値付きカラム追加
- 新規テーブル追加
- 既存データを壊さない小規模なデータ補正

`NOT NULL` カラム追加、外部キー追加、大きなテーブルへのインデックス追加、大量レコード更新は、ロック時間と処理時間を確認してから実施してください。

### 複数回のリリースに分ける変更

- 使用中カラムの削除
- カラム名変更
- 型の破壊的変更
- 旧コードが読み書きできなくなる制約追加
- 既存値の意味を変える変更

例えばカラム名を変更する場合は、新カラム追加、両方への書き込み、既存データ移行、読み取り先の切替、旧カラム削除の順で段階的に行います。

### Release publish 前の確認

```bash
npm test
npm run build
cd server
npm test
npm run migrate:dry
```

以下に該当する場合は、通常リリースとして扱わず、作業手順と復旧方法を事前に決めます。

- 長時間のDBロックが発生する可能性がある
- 大量データ更新を行う
- 旧コードとの互換性を維持できない
- 復旧に手作業が必要になる可能性がある

### 失敗時の対応

- 原因を確認する前に Release やマイグレーションを再実行しない。
- DBを手作業で巻き戻さない。
- 追加型の変更であれば、原則としてDBはそのまま残し、必要に応じてアプリを前バージョンへ戻す。
- データ破損や個人情報への影響が疑われる場合は、先にサービスを停止する。
