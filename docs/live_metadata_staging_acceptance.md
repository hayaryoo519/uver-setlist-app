# Issue #109 Staging受け入れ計画

## 状態と操作境界

[Draft PR #242](https://github.com/hayaryoo519/uver-setlist-app/pull/242)の受け入れ計画。**この文書は実行承認・実確認の記録ではない。**
`c571fa2f`の[CI](https://github.com/hayaryoo519/uver-setlist-app/actions/runs/38571130062)は全3ジョブ成功。その後の[独立AIレビュー](./live_metadata_independent_review.md)の3指摘をコード候補`44e71a59`で修正し、別プロセスの静的再レビューで解消を確認。修正後の最新headの[PR checks](https://github.com/hayaryoo519/uver-setlist-app/pull/242/checks)を確認する。
PG16.15/Ubuntu/Node24の旧schema7項目・統合23項目、合成browser18ケースは既存Stagingの試験ではない。

- devへmerge/pushするとStaging自動配備が始まる。独立レビュー・候補範囲の承認・実行担当/時間帯の確定前には行わない。
- この受け入れのために本番バックアップ取得・実データ同期を行わない。同期保護の変更承認と、実データ同期の再開承認は別。
- 本番接続、main merge、Release公開は対象外。設定値/JWT/メールリンク/OAuthコード/DB原文/生ログ/認証済みbrowser storageを公開しない。
- 実Stagingへの接続・DB/API更新・外部配送・OS操作は、対象と影響を人間が承認した後の別作業。

## 1. merge前の判断ゲート

| 確認 | 合格条件 | 現在 |
|---|---|---|
| PR/CI | baseがdev、確認SHAとheadが一致、最新headの3ジョブ成功 | c571fa2fで成功。head更新時は再確認 |
| 独立レビュー | 指摘/根拠/対象外を記録し、重大指摘を解消または明示的に判断 | AI静的レビューの3指摘は修正・再確認済み。人間の判断は未承認 |
| 範囲 | 機能/認証復帰/同期保護/検証を同じPRで扱う合意。共演自動抽出・import全体atomic化等の未完了を保持 | 承認待ち |
| スキーマ | 030〜032と033/034の番号衝突なし。適用済みSQLを変更しない。対象環境の適用履歴・既存同名表・ロック影響を確認 | 静的確認済み、実環境未確認 |
| 運用 | 競合する配備/同期がない時間帯、復旧担当、機能確認担当を確定 | 未確認 |
| 試験データ/配送 | 専用検証アカウント/架空公演を限定し、メール/Push/OAuth/収集等が本番や既存利用者へ作用しない | 未確認 |

アプリが起動しているだけでは配送やバックグラウンド処理が安全とは限らない。公演作成や収集が通知を呼ぶ可能性もある。専用設定・通知先・ワーカー/外部通信の境界を確認できない場合は、Stagingへの試験書込みを開始しない。未対応の「無効化環境変数」を仮定しない。

## 2. 配備とmigrationの確認（承認後のみ）

現在の[Staging workflow](../.github/workflows/deploy-staging.yml)は、dev更新 → build → `docker compose run --rm app-staging node server/scripts/migrate.js` → `docker compose up -d` → pingの順。本PRはこのworkflowを変更しない。

1. 配備対象のdev SHAと、承認した候補との差分を確認。workflowはorigin/devを取得するので、PR headのSHAをそのまま配備SHAだと仮定しない。
2. 本番ではなくStaging専用DB/設定であることを、秘密値を表示せず確認。設定とuploadsの維持/コンテナ再作成の影響は既存[環境手順](./environments.md)を参照する。
3. 正式runner `server/scripts/migrate.js` で033/034が適用されることを確認。CIはSQLファイルの直接実行/再実行であり、runnerのtracking/advisory lockまで検証した結果ではない。
4. migration履歴・期待する表/制約/index・実際の配備SHAを、承認済みの方法で確認。終了コード0/pingだけをmigration完了の証明にしない。現行runnerにはロック取得失敗時に0で戻る経路がある。
5. 未適用確認の`--dry-run`も既存DBに接続し、`schema_migrations`がなければ作成する。完全read-onlyとは説明しない。承認前の実行は禁止。自動配備と手動migrationを並行実行しない。
6. 既存公演が未確認状態のまま読め、元の正式タイトル/tour/special_note/セトリが変わらないことを確認。新規表のFK/index作成は既存表ロックを取り得るため、CIの小規模fixtureから実ロック時間を保証しない。

## 3. 機能受け入れ（専用アカウント・架空データ）

以下は未実施。API操作は管理UIまたは承認されたAPIから行い、手作業で実DBの値を補正しない。

| 項目 | 操作/合格条件 |
|---|---|
| 公開互換 | 匿名の一覧/詳細/既存festival種別・検索・ページ移動が動く。正式表記とセトリを維持 |
| 候補と手動 | 取得元別原文/候補を管理者だけが確認。手動追加/除外、国、生誕メンバー、artist/roleの保存後に再取得しても手動値を保持 |
| 未確認となし | 未確認/nullリセットと確認済み空配列を区別。省略PATCHは保持。明示候補tags空配列が本文fallbackで復活しない |
| 意味の制約 | 日付から生誕、会場/timezoneから海外、festival参加者から対バン相手を捏造しない。確認済み非JPの国だけ海外。guest/supportだけでvsにしない |
| 辞書/役割 | NFKC/大小文字/空白正規化、句読点保持、alias検索。辞書保存と公演関連保存が別であることを確認。artist+roleは同じassignmentで検索 |
| 競合/失敗 | 専用fixtureを2画面で編集し、旧revisionの409でdraft保持。通信失敗を成功/確認済み/0件にしない。辞書失敗や関連失敗を区別 |
| cache | metadata保存後の一覧/review/該当詳細、辞書更新後の一覧/全詳細で最新値を表示。公開JSONにoriginal/candidates/管理メモ/historyがない |
| 認証/レビュー導線 | 未ログインから単件review URLを経由してログイン復帰。通常ユーザーの管理API拒否。対象なし/読込み/失敗の表示を区別 |
| 現在の権限/失効 | 専用fixtureアカウントだけを対象に降格・session失効・論理削除を確認する場合、古い署名済みJWTでも拒否。既存ユーザーを変更しない |
| PC/mobile dialog | 狭いviewportでmodalの配置、スクロール、focus循環/復帰、背景非操作、draft保持を確認 |
| Worker更新 | 制御中ページと新Workerの関係を確認。自動置換で編集を破壊せず、明示reloadだけ新JSへ切替。現在コード2buildのCI結果を過去配備bundle/CDNの証明にしない |
| 通知導線 | 専用購読の通知URLが同一originで一致、reviewを再open。別tabの編集中へ移動させない。実配送/許可/OSクリックは下記の別ゲート |

署名が正しくても不存在/削除済みユーザーのJWTは共通認証で拒否される。認証成功の確認に不存在IDを使わず、承認済みの専用検証アカウントを使う。同期後の鍵/ID再利用対策は[DB運用](./db_operations.md)の別手順であり、今回の受け入れで同期を起動しない。

## 4. 実Push/実端末の別ゲート

- 専用VAPID/購読、送信対象と同意、HTTPS origin、担当端末/ブラウザ、通知許可を確認してから実施する。既存購読へ一括送信しない。
- 「送信API受付」「Push service応答」「端末受信」「OS通知表示」「OSからのクリック」「正しいtab/新windowへの遷移」を分けて記録。
- 複数tab、新window、許可拒否/解除、mobile実機、Safari/Firefox、過去の配備bundle/実キャッシュヘッダーは、各環境で実施しない限り未確認。
- CIの合成push/clickやWindowClient message、2つの現行buildによるWorkbox更新を、実配送/OS操作の代替と説明しない。

## 5. 失敗時・復旧・報告

- 配備/migration/機能に失敗したら、次のmerge/Release/受け入れ書込みを止める。原因・適用済みファイル・配備SHA・停止影響を非公開で確認し、無条件の再実行やDB削除で隠さない。
- 033/034は追加型なので、コード復旧時も原則として表/履歴を残す。DBを手作業で巻き戻さない。復旧PRは現在のdevの認可/失効/ログ/依存パッチを維持し、古いmain由来のコードへ戻さない。
- 同期を別途承認して実施した場合だけ、[DB運用](./db_operations.md)の停止/全worker停止/cleanup失敗時停止維持を適用する。同期失敗後の自動再開は禁止。
- 報告は候補/配備SHA、Actionsリンク、日時/担当、確認項目、合否、残件、復旧判断だけ。認証trace/storage/temp SQL/DB/生ログは公開artifactにしない。合成fixture以外の画面/応答をそのまま貼らない。

### 結果記入欄

| 項目 | 記録 |
|---|---|
| 承認者・対象・時間帯 | 未承認 |
| 配備SHA・Actions | 未配備 |
| 実schema/migration履歴 | 未確認 |
| 機能/PC/mobile/権限 | 未確認 |
| 実Push/OS/複数tab/実端末 | 未確認 |
| 復旧判断・残件 | 独立レビューと実環境確認待ち |

CI成功・この計画の作成・Draft PRの存在を、Staging受け入れ/同期再開/本番リリースの完了と扱わない。
