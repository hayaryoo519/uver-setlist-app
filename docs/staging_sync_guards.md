# Staging DB同期保護（Issue #196・分離PR）

## 範囲

Issue #109の機能PR #242から同期保護だけを分離する。baseはdev `b18313ad`、ブランチは`hayaryoo519/fix-issue196-sync-guards`。

- `scripts/sync-db.sh`：明示TCP接続、接続先上書き無効化、公開/全ワーカー停止ACK、失敗/中断時cleanup、private SQL削除、停止維持。
- `scripts/sync/anonymize.sql`：既知公開値だけを保持。users/個人活動/OAuth/queue/ログ/履歴を除去、原文/管理メモ/未知JSON/取り込みJSONを持ち出さない。
- `server/tests/scripts/syncDb.test.js`：偽PostgreSQLクライアントと合成ファイルによるshell制御の回帰テスト。
- `docs/db_operations.md`と本書：操作境界と残件。

機能API/UI、033/034のschema追加、メタデータのCI runnerはこのPRに含めない。匿名化SQLの追加情報表は存在する場合だけ処理するので、機能導入前のschemaでも動く設計。

## 維持する安全策

最新devの「private SQLをDB変更前に生成」「復元＋匿名化を1つのtransaction」「ユーザー行/関連を全除去」を維持する。SQL生成の失敗では既存DBを変更しない。

STAGING_OFFLINE_ACK=1はアクセスと全ワーカーを停止したという担当者の確認であり、script自身が停止やメンテナンス画面を設定する機能ではない。Basic認証だけで停止済みと扱わない。
未完了の再作成済みDBはEXIT/INT/TERMでdropdb --force、private SQLも終了時に削除する。cleanup失敗時は残存の可能性を警告し、アプリを自動再開しない。SIGKILL/停電のcleanupは保証しない。
既知のアカウント関連を同じTRUNCATEへ含めるが、未知のアカウントFKをCASCADEで消して隠さず失敗させる。

追加情報の公開手動値はAPI検証済みの既知値を前提として保持する。全テーブル/不正な既知値/公開自由入力/画像/バックアップ原本/保存済みログ/外部連携設定まで含む機密監査は未完了。

## 検証と限界

このPR単体のshellテストは偽コマンドによる起動引数/事前拒否/終了状態/削除/シグナル経路を確認する。実dumpや実DBに対するsync-db.sh全体試験ではない。
元の機能PRでは所有する使い捨てPG16/PG18・合成schema/データを用いて同じ匿名化SQLの実行/rollback/公開値保持を確認した。分離後も機能PRの統合CIがこのブランチのSQLを使って再確認する。これはこのPR単体のCIが実SQL試験を実行するという意味ではない。

## 依存PRの順序

1. 本同期保護PR：**dev向け**にレビューする。
2. 機能PR #242：一時的に本ブランチをbaseとして、同期保護5ファイルを差分から除外する。機能の統合試験は依存する匿名化SQLも含めて実行する。
3. 本PRのマージを人間が別途判断した後に限り、#242のbaseをdevへ戻し、差分/最新dev/CIを再確認する。自動でマージやretargetはしない。

devへのmerge/pushはStaging自動配備を開始する。Ready for reviewへの変更は配備承認ではない。
ユーザーは分離とReady化を承認し、別の人間レビュー担当者はいないと指定した。レビュー担当者を捏造・自己承認せず、独立AI静的レビュー/本人判断/CI/実環境受け入れを区別して記録する。

**本番/Stagingへの接続・DB適用・実同期・実Push配送・Release公開はこの分離作業で行わない。** 実データ同期の再開は未承認。手順は[DB運用](./db_operations.md)を参照。
