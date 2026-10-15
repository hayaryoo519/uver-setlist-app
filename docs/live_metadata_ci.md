# 追加情報検証のCI

`.github/workflows/test.yml` に `test-live-metadata-integration` ジョブを追加。
既存のpush(main/dev)・pull_request(main/dev)イベントで実行する。CI構成はcommit `898cefb0` に含む。dev向け[Draft PR #242](https://github.com/hayaryoo519/uver-setlist-app/pull/242)を公開済み。
SHA `c571fa2f` の[Actions run 38571130062](https://github.com/hayaryoo519/uver-setlist-app/actions/runs/38571130062)で全3ジョブ成功を確認した。backendはLinuxのadmin suite込み726 tests/56 suites、frontendも成功。

修正/独立AI再レビュー後の`a201d4cb`でも[Actions run 38577262475](https://github.com/hayaryoo519/uver-setlist-app/actions/runs/38577262475)の全3ジョブ成功を確認。
その後devのPR #243（b18313ad）をfeatureへ取り込み、fresh npm ci後にローカルbackend745/frontend229/browser18/PG18統合23が成功した。依存更新後の最新headは[PR checks](https://github.com/hayaryoo519/uver-setlist-app/pull/242/checks)で確認する。

## 実行内容

- GitHub-hosted Ubuntu 24.04、Node 24。
- root/serverをnpm ci（rootは既存方針と同じlegacy-peer-deps）。
- ローカルのPostgreSQL 16ツールをインストールし、PG_BINを明示。
- Chromiumとシステム依存をインストール。
- 型チェック、合成APIのブラウザ18ケース。
- 最小の旧schemaでの使い捨てDB試験7項目。
- `npm run test:metadata-db --prefix server -- --worker --built-worker`：実認証/API/SQL＋実Worker transport/更新＋本番生成物の更新を同じ所有クラスタで順に確認。

最新dev統合後の統合コマンドはWindows/PostgreSQL 18とCIのUbuntu/PostgreSQL 16.15で**23項目成功**。旧schema試験7項目、型チェック、合成browser18ケースもCIで成功。
初回CIのserver-only環境ではPlaywrightのトップレベルrequire/mock解決が失敗したため、ブラウザ実行時の遅延読み込みとvirtual mockへ変更。root node_modulesなしのsnapshotでもbackend722件成功（Windows依存admin suite除外）。
PostgreSQL起動はUnixの既定ソケット場所に依存しないTCP専用に変更し、合成データ投入前の起動診断だけを出す。Windowsでは従来の起動オプションを維持する。
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

- 候補SHA変更時は最新headのActions結果を再確認。c571fa2fの成功を未検証の変更へ流用しない。
- 実Stagingのschema/設定差分、実購読/Push配送/OSクリック/過去の本番JS等。
- CI成功だけでリリース承認やデプロイ完了と扱わない。mainマージ後も本番はGitHub Release publishが別途必要。

本番/Stagingへの接続・適用・配信・デプロイは行っていない。
