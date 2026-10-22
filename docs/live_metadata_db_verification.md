# 追加情報の検証DB同期・実PostgreSQL検証

## 実装した同期方針

`scripts/sync-db.sh` は `scripts/sync/anonymize.sql` を、psqlrc無効・ON_ERROR_STOP・単一トランザクションで実行する。
従来のユーザー/修正申請匿名化・機密ログ削除に、033/034（改番前030/031）のデータの扱いを追加した。

| データ | 同期後 |
|---|---|
| live_metadata.candidates | 公開に利用する既知の固定タグだけ保持 |
| 原文・取得元別スナップショット・出典URL/ID・候補の国/メンバー・不一致 | 除去 |
| overrides.tagOverrides | 既知の固定タグのadd/removeだけ保持 |
| overrides.country / members | 確定国コード/対象IDだけ保持 |
| overrides.participants | artistIdとroleだけ保持 |
| classification・管理メモ・未知のJSONキー（関連項目内も含む） | 除去 |
| live_metadata_history / live_artist_history | 管理者ID・変更前後JSONを含むため全件削除し、採番をリセット |
| live_artists / live_collaborators | 公開用の正式名・別名・確認済み関連を保持 |
| user_spotify_tokens / user_google_tokens | OAuth資格情報を全件削除 |
| playlist_history | 個人の外部プレイリスト履歴を全件削除 |
| raw_setlists / social_posts | 非公開の取り込み下書き・承認済みを含む送信キュー/投稿履歴を全件削除 |
| lives.import_metadata | 非公開の取得元JSONをNULL化 |

候補tagsの未保存とtags=[]、確認済みのメンバー/共演者なし、既存のrevision、アーティストIDと関連を維持する。
手動除外がテキスト再判定で復活しないよう、有効情報を全消去するのではなく公開用の入力を保持する。
辞書は管理者が登録する公開名称/別名を扱う前提。未関連辞書も維持するが、辞書変更履歴は持ち出さない。
正式な公演名・既存の公開特記事項は従来どおり保持する。ここを一括消去するものではない。

033/034導入前のバックアップでは、存在しない新テーブルだけスキップする。
存在するテーブルの処理失敗は隠さない。新しい公開フィールド/タグを追加した場合は、同期ホワイトリストと公開情報保持のテストも更新する。

## 失敗時と運用条件

- 接続先はPGHOST（単一TCPホスト）/PGPORTを明示し、DB名は単純なSQL識別子に限定する。接続URI/接続文字列/CLIオプションをDB名として受け付けない。PGSERVICE/PGSERVICEFILE/PGHOSTADDRによる隠れた接続先変更は無効化する。
- **公開停止とワーカー停止が必須**。復元と匿名化の間には生データが存在する。
- `STAGING_OFFLINE_ACK=1` を必須とするが、これは運用者の確認でありサービス停止を自動実行するものではない。
- 既存DBが削除できなければ復元を開始しない。
- 展開/復元/匿名化の失敗やINT/TERMで、作成した同期先DBを削除する。安全削除は `dropdb --force` を使う（PostgreSQL 13以降のクライアントが必要）。
- 安全削除も失敗したら、生データ残存の可能性を警告する。成功と表示せず、公開停止を継続して運用者が削除する。
- SIGKILL/OS停止/電源断はtrapで処理できない。失敗状態や中断状態から勝手にサービスを再開しない。
- 成功後も自動再開しない。匿名化成功・マイグレーション・確認後に運用者が再開する。
- この変更は、全テーブルの個人情報監査の完了を意味しない。追加情報以外の既存/将来の自由記述は別途監査する。

実運用手順は [DB運用](./db_operations.md) を参照。本番DBに匿名化SQLを直接実行しない。
本番バックアップを使う同期は今回実行していない。

## 合成fixture専用の実DB検証

`server/scripts/test-live-metadata-db.js` を追加。
アプリのdb.js/.envを使わず、initdbで新しい使い捨てクラスタを作成する。
localhostの未使用ポートだけで起動し、接続先のdata_directoryがテスト所有のディレクトリと一致することを確認する。
既存のローカル・Staging・ProductionのDBやバックアップを参照しない。
APP_ENV=productionでは実行を拒否する。

```bash
# ローカル端末のみ。initdb / pg_ctl / psql をPATHへ入れて実行。
npm run test:metadata-db --prefix server

# Windowsでbinを明示する例（Git Bash）
PG_BIN='C:/Program Files/PostgreSQL/18/bin' npm run test:metadata-db --prefix server

# チェックインされた前提schema SQL＋033/034を使う合成fixture
PG_BIN='C:/Program Files/PostgreSQL/18/bin' npm run test:metadata-db --prefix server -- --full-schema

# 全schema + 実bcrypt/JWT/認可/ログインlimiterでの実API検証
PG_BIN='C:/Program Files/PostgreSQL/18/bin' npm run test:metadata-db --prefix server -- --real-auth

# 上記＋PC/モバイルブラウザを実APIへ接続
PG_BIN='C:/Program Files/PostgreSQL/18/bin' npm run test:metadata-db --prefix server -- --browser

# 上記＋所有Workerの通知API/実message経路（配送/OSクリックは合成）
PG_BIN='C:/Program Files/PostgreSQL/18/bin' npm run test:metadata-db --prefix server -- --worker

# temp内で2版の本番生成物/実Workboxをbuildし更新する（16項目）
PG_BIN='C:/Program Files/PostgreSQL/18/bin' npm run test:metadata-db --prefix server -- --built-worker
```

通常終了/エラー時はHTTPサーバー・接続プール・使い捨てPostgreSQLを閉じ、テストディレクトリを削除する。
強制終了等で残った場合は、表示されたテストディレクトリのクラスタだけを確認し、停止/削除する。既存クラスタを操作しない。
Windowsではpg_ctlのstdioを継承させず、daemonにパイプが残ることによる終了待ちを避ける。

### PostgreSQL 18.0（Windows）で成功した7チェックポイント

1. 033/034なしの旧schemaでも匿名化SQLが成功。
2. 最小のusers/lives依存schemaに033/034を適用し、再適用も可能。
3. 原文・管理メモ・未知JSONキー・両履歴を除去し、公開情報/辞書/関連/空タグ/確認済みなしを保持。
4. 実際のSQLエラーでpsqlが非0終了し、先行した匿名化も全てロールバック。
5. 実APIのSQLを実行：同時PATCHで200/409、Unicode別名検索、辞書更新、レビュー一覧取得。
6. 実際の候補再取得で手動設定と関連を保持し、同一候補はrevisionを増やさない。
7. 関連のFK・重複・役割CHECK・参照中アーティスト削除制約。

標準/--full-schemaモードのHTTP認可はfixture専用に差し替える。`--real-auth` では下記のとおり実認証も接続する。いずれも本番設定の結合テストではない。
標準モードの基盤schemaは合成fixtureに必要な最小限。`--full-schema` モードも追加し、PostgreSQL 18.0（Windows）で**9チェックポイント成功**。

- 改番前の検証では000〜029の29ファイル＋旧030/031を適用/再適用。runnerは現在、033より前のチェックイン済みSQLを番号順・1ファイル1トランザクションで適用してから033/034を適用する。最新devの認証030〜032との統合後の結果はまだ確認していない。
- 完全schemaのNOT NULL/FK/型制約を使い、同じ公開情報保持・実API SQL・同時更新・再取得を検証。
- 合成OAuth資格情報/外部プレイリスト履歴/非公開下書き/承認済み投稿キュー/import_metadataが同期後に残らない。
- 後続SQL失敗時は、先行したOAuth/投稿キュー削除もロールバックされる。

migrate.jsは.envを読むため実行せず、テスト所有PoolへSQLを直接適用する。適用履歴/advisory lockを含むmigrate.js自体の検証ではない。
これはリポジトリにあるschemaの検証であり、実Staging/本番のバージョン・設定・追加テーブル・schema差分を再現するものではない。

完全schemaの調査で従来の匿名化にOAuth資格情報/承認済み送信キューが残ることが判明したため、同期SQLを追加保護した。
任意テーブルが存在する場合の失敗は隠さず、追加TRUNCATEにCASCADEは使わない。未知の依存で失敗したら全体を巻き戻し、公開停止を継続する。

加えて、同期シェルはPostgreSQLコマンドを全て偽物にした20テストで、停止確認/本番拒否/復元・SQL失敗/シグナル/安全削除失敗を検証した。
フロント210テスト/合成APIの実ブラウザ18ケース成功。バックエンドの最新件数は [管理レビュー](./live_metadata_admin_review.md) を参照。型チェック・シェル構文・差分チェック成功。

## 実認証を接続した使い捨てDB検証

`--real-auth` は自動的に全schemaモードを選び、PostgreSQL 18.0（Windows）で**13チェックポイント成功**。

- bcrypt（cost 10）で合成管理者/一般ユーザーのパスワードを保存し、実際のauth/loginルートで比較。
- jsonwebtokenで実際に発行・署名検証する。鍵は実行ごとにランダム生成し、親のJWT_SECRETを使わない。
- 実authorize/adminCheck、実ログインlimiterを使う。誤パスワード401、ログイン成功、ログイン監査を確認。
- 認証なし/通常ユーザー/role改ざんJWT/署名済み期限切れJWT/別鍵署名JWTの5条件で6エンドポイント（追加情報GET/PATCH、レビューGET、辞書GET/POST/PATCH）を拒否。
- 30拒否応答はmessageだけで、追加情報・辞書・関連・両履歴が変わらない。
- 通常ユーザーの権限拒否と無効セッションを区別し、フロントの期限切れ判定と整合する。
- 再ログイン後のアクセス、実JWTでの同時PATCH 200/409・辞書更新/検索/レビュー・監査actor_idを確認。
- 同じIPからの6回目のログインは実limiterで429となり、ログインSQL/監査へ到達しない。

`verify-live-metadata-auth.js` はテスト所有data_directoryを再確認してからユーザー/鍵を変更する。
.env読込みとメール送信は明示的に遮断。db.js/index.jsは起動せず、実ルートだけを使い捨てPoolへ接続する。外部ジョブ・SMTP・Push・既存DBへアクセスしない。
JWTやパスワード/鍵をログへ出さない。併せて実authorizeのトークン欠落ログからヘッダー全体を除去し、Cookie/Authorizationの混入を防ぐ回帰テストを追加。

`--real-auth` 単体は **実認証＋Express API＋SQL** の検証。さらに `--browser` でPC/モバイルを実APIへ接続し、PostgreSQL 18＋Chromiumで**15項目成功**。対象API/補助fixture/隔離/残件は [実APIブラウザ結合検証](./live_metadata_integrated_browser_verification.md) を参照。
別の [合成APIブラウザ試験](./live_metadata_auth_verification.md) と区別して記録する。

## 最新dev統合後の確認

[統合記録](./live_metadata_dev_integration.md)：前提000〜032の32ファイル＋033/034、実認証14/Worker＋本番生成物23項目成功。
匿名化はdevの全user行削除を維持し、関連と追加情報履歴も同じTRUNCATEで処理。検証actorは削除後に新しい架空データで用意する。
同期scriptはprivate SQL事前生成＋復元/匿名化を同一transactionへ統合。以下の旧検証段階の「userダミー化/復元後に別匿名化」は現方式ではない。

## 継続検証

[CIジョブ](./live_metadata_ci.md) でPG16/Ubuntuに接続する使い捨て試験を追加。既存DBやアプリ用secretsは使わない。
`--worker --built-worker` の組合せはローカルPG18で22項目成功。GitHub Actions/PG16での結果は未確認。

## 残件

- 実Staging/本番への033/034適用は未実施。旧番号030/031も実環境へは適用していない。
- 本番と同じPostgreSQLバージョン/実schema差分・構成での確認（リポジトリの全schema SQLは合成データで検証済み）。
- 実環境でのAPI/認証/DB/ブラウザ結合確認（所有DBでの対象API結合と合成APIのPC/モバイル操作は検証済み）。
- 実Web Push配送/OSクリックからの遷移確認（模擬ハンドラ試験に加え、[所有Workerの実通知API/message経路・旧→新protocol切替](./live_metadata_native_worker_verification.md) は19項目成功）。
- 本番バックアップを使う同期前のサービス/ワーカー停止・バックアップ保護・他テーブルの機密情報監査。
