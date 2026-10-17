# 追加情報の実認証/API/DB/ブラウザ結合検証

## 実行

```bash
# Chromium未インストールの場合だけ
npx playwright install chromium

# PostgreSQLクライアントがPATHにあるローカル端末
npm run test:metadata-db --prefix server -- --browser

# Windows / Git Bash
PG_BIN='C:/Program Files/PostgreSQL/18/bin' npm run test:metadata-db --prefix server -- --browser
```

`--browser` は全schema＋実認証モードを含む。
PostgreSQL 18.0（Windows）とChromiumのPC/Pixel 5相当エミュレーションで **15チェックポイント成功**（既存の実認証/API/SQL 13項目＋ブラウザ2構成）。

## 実際に接続する対象

ブラウザ → 独立したVite → 同一プロセスが所有するExpress → 使い捨てPostgreSQL。
次のAPIはモック応答を使わず、実ルート/認証/SQLを実行する。

- POST /api/auth/login：bcrypt比較、JWT発行、ログイン監査、実limiter。
- GET/PATCH /api/lives/:id/metadata：実authorize/adminCheck、ロック/revision、履歴。
- GET /api/lives/metadata-review：実管理レビューSQL。
- GET /api/live-artists：実辞書検索。
- GET /api/lives、GET /api/lives/:id：実一覧/詳細SQLと公開metadata projection。

管理画面バッジ/検索補助の GET /api/songs、/api/users、/api/corrections、/api/users/me/attended_lives は空fixtureで応答する。
これらの機能・参戦操作・アプリ全体の結合試験が完了したことを意味しない。

## 各ブラウザ構成で確認した流れ

1. セッションを注入せず、単件レビューURLからログインへ進む。
2. 実bcryptで誤パスワードを拒否し、正しい合成パスワードで実JWTを受け取る。
3. 元の単件レビューへ復帰する。
4. 国KRと管理用メモをUIから保存し、DBのoverridesと履歴actor_id=1を確認。
5. 実候補保存サービスをトランザクションで再実行し、手動overrides全体が維持される。
6. ページ再読込でも国と管理メモを表示する。
7. 実署名済み期限切れJWTを使って実authorizeの403を発生させる。
8. returnToを保持したログインへ移動し、実再ログイン後に対象と保存済みメモへ戻る。
9. 公開一覧で全角別名を検索し、共演者名称と確定国を表示する。
10. 公開一覧APIの応答と一覧/詳細DOMに管理メモが出ない。
11. 実詳細APIから対バン相手を表示する。

未知API、想定外のAPI失敗、未処理JavaScript例外があれば失敗する。
ログイン401/期限切れmetadata403は意図した失敗として個別のUI/復帰を検証する。

## 隔離と後片付け

- initdbで合成DBを新規作成。全migration SQLを使うが、既存DB/本番バックアップは使わない。
- data_directoryの一致をrunnerとブラウザhelperで確認。
- API URLは外部の任意設定から受け取らず、プロセス内で起動したloopback-only HTTPサーバーから導出。
- Viteは未使用ポート/strictPortで起動し、既存サーバーを再利用しない。
- ViteのenvDirは所有tempディレクトリに固定し、既存.envを読み込ませない。proxy先は所有Expressだけ。
- Tailwind等の相対config探索を通常起動に揃えるため、一時的にcwdをプロジェクトルートへ移し、終了時に復元。
- ブラウザcontextは指定したVite origin以外のHTTP通信を拒否。Service Workerは無効。
- index.js/外部ジョブを起動せず、メール/Pushモジュールを送信禁止の実装に置換。
- 実認証では実行ごとに生成する鍵を使う。各構成の実limiterのbucketだけを初期化し、limiter自体は無効にしない。
- 正常/エラー時にcontext、Chromium、Vite、Express、Pool、使い捨てPGを閉じてtempを削除。cwd/VITE_API_URLも復元。
- DB不一致/プロセス内HTTPサーバーなし/外部bindを起動前に拒否する3ユニットテストを追加。

JWT/パスワード/鍵を含む可能性があるため、この経路ではtraceやブラウザストレージを成果物へ保存しない。
強制終了は完全な後片付けを保証しない。残存時はテストが表示した所有クラスタ/プロセスだけを確認し、既存環境を操作しない。

## 実Worker経路の追加試験

通常の `--browser` はService Workerを無効のままとする。`--worker` は所有Viteの専用Workerを使い、元のsw-pushハンドラから実WindowClient messageをページへ届ける試験も追加。専用Workerの旧→新protocol/waiting/controller切替も追加し、**19項目成功**。
通知API/Workerが実物でも配送とOSクリックは合成なので、[実Worker検証の境界](./live_metadata_native_worker_verification.md) を参照。

## 残件

- Staging/本番と同じPGバージョン・schema差分・配備構成での確認。
- 実Web Push購読/配送/OS通知/Service Worker更新・複数タブ。
- 実スマートフォン/Safari/Firefox。
- 外部取り込みと定期ジョブ、メール、補助APIを含むアプリ全体の結合試験。
- PR/コミット/デプロイ/既存環境へのmigration適用。

本番/Stagingへの接続、実Push送信、既存DBの変更は行っていない。
