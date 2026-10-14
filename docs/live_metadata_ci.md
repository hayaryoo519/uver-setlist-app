# 追加情報検証のCI

`.github/workflows/test.yml` に `test-live-metadata-integration` ジョブを追加。
既存のpush(main/dev)・pull_request(main/dev)イベントで実行する。CI構成はローカルcommit `898cefb0` に含む。未pushで、GitHub Actions上の実行結果はまだ確認していない。

## 実行内容

- GitHub-hosted Ubuntu 24.04、Node 24。
- root/serverをnpm ci（rootは既存方針と同じlegacy-peer-deps）。
- ローカルのPostgreSQL 16ツールをインストールし、PG_BINを明示。
- Chromiumとシステム依存をインストール。
- 型チェック、合成APIのブラウザ18ケース。
- 最小の旧schemaでの使い捨てDB試験7項目。
- `npm run test:metadata-db --prefix server -- --worker --built-worker`：実認証/API/SQL＋実Worker transport/更新＋本番生成物の更新を同じ所有クラスタで順に確認。

統合コマンドはWindows/PostgreSQL 18で**22項目成功**。PG16/Ubuntuでの結果はCI実行後に確認する。
PG16を選んだ理由はリポジトリのdocker-compose.yml/docker-compose.local.ymlがpostgres:16-alpineを指定しているため。UbuntuのPG16とAlpineの実配備設定が同一という意味ではない。

## 隔離

- デプロイ/SSH/アプリ用secretsを参照しない。ジョブ権限はcontents:read、checkoutはpersist-credentials:false。
- APP_ENV=test、PG_BIN=/usr/lib/postgresql/16/bin。アプリ.env/既存DB/バックアップを使わない。
- system packageのインストールで既定PGサービスが存在しても、試験はinitdbによる新規クラスタ/未使用ポートだけに接続する。
- testsのdata_directory/HTTP所有権検証、SMTP/外部Push無効化、外部HTTP制限は既存のrunner/helperで適用する。
- ジョブの実行制限は25分。強制終了の後片付け保証はないが、データは合成fixtureのみでGitHub-hosted runnerは使い捨て。

## 成果物

失敗時に合成API browserのplaywright-report/metadataとtest-results/metadataだけを3日保存する。
実JWT/実API/SQL/Worker統合試験のtrace/ブラウザストレージ/tempクラスタ/ログをartifactへ保存しない。
合成reportであっても、CIを実アカウント/実データへ変更した場合は同じ公開方針を流用しない。

ジョブの権限/環境/secrets非参照/検証コマンド/artifact制限をYAML読み込みの2ユニットテストで固定した。
既存のバックエンド/フロント単体ジョブやデプロイワークフローは変更していない。

## 残件

- PR/push後の実Actions結果、PG16/Ubuntu/Chromiumの挙動を確認。
- 実Stagingのschema/設定差分、実購読/Push配送/OSクリック/過去の本番JS等。
- CI成功だけでリリース承認やデプロイ完了と扱わない。mainマージ後も本番はGitHub Release publishが別途必要。

本番/Stagingへの接続・適用・配信・デプロイは行っていない。
