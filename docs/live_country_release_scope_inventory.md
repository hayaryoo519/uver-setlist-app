# Productionリリース候補の範囲（読み取り専用棚卸し）

2026-10-21にGit上の `origin/main` (`e389c326`) と `origin/dev` (`88cae715`) を比較。`main..dev` は94 Gitコミット（first-parentでは36件のマージ）、207ファイルの差分。**ローカルの古い `main` との比較ではない。** この時点で本番用の統合候補SHAは作成・配備していない。2026-10-21にPR #250/#249を順にdevへマージ後、`origin/dev` は `0e4efdf1`（mainとの差は101コミット、210ファイル）となった。Productionコードは未変更。

## 開催国以外に含まれる主な変更

- Staging同期の個人情報・原子性・テストアカウントなどの保護（#209〜#216、#244）。本番データをStagingへ同期する承認を意味しない。
- リクエスト、OAuth、メール、通知、SNS、外部API等のログ秘匿（#217〜#223、#232〜#238）。
- 現在ユーザー権限、session失効、認証入力・レート制限、トークン保護、メールアドレス変更/再送、メール配送設定（#224〜#231）。既存のログイン/メール動線に影響し得る。
- ライブラリのセキュリティ更新（#239〜#243）、予想表示の所有者フィルター（#235）。
- Issue #109の公演メタデータ・管理レビュー/公開検索と表示調整（#242、#244、#245、#247）。#242はfirst-parent一覧に直接現れないが、後続の統合経由でdevに含まれる。

## 開催国だけの切り出し可否（2026-10-21の静的調査）

PR #242は同期ガード作業ブランチへ先にマージされ、そのマージ差分は113ファイル（管理/公開UI・API・auth連携・Worker・検証を含む）。新しい管理APIは `authorize` / `adminCheck` を使う。`main` の旧認証は署名済みJWT内のroleをそのまま信頼する一方、devの認証はDB上の現在のroleと `session_version` を参照するため、管理レビューを旧認証へ単純接続するのは安全ではない。後者はmigration 030と認証コードにも依存する。したがって、033/034と国UIだけのcherry-pickを既存Staging確認と同等のリリース候補とは扱えない。

「開催国だけ」の候補を選ぶなら、認証・migration・公開投影・安全な同期/取り込み・必要なUI/テストを一体で切り出し、**別候補として隔離DB/CI/Stagingを再実施**する。現在Stagingで確認されたdev全体を出す案とは、範囲・検証・運用影響が異なる。いずれも現時点で本番Releaseは行っていない。

## DB・設定上の確認点

- 未リリースのmigration `030`〜`034`。`030`は `users.session_version` をデフォルト0で追加し、`032`はメール変更用カラムを追加する。`031`はハッシュ/期限用カラム追加に加えて、**期限なしの既存verification tokenへ24時間の期限を付与するUPDATEを含む**。既存リンクの扱いと実行時間/ロックをRelease前に評価する。`033/034`は公演メタデータ/アーティスト表を追加する。適用済みSQLは編集しない。
- 現行のProductionデプロイworkflowは `main` に存在する一時CREATE権限処理を `dev` で失っている。復元は[PR #249](https://github.com/hayaryoo519/uver-setlist-app/pull/249)でdevへマージ済み。隔離PG18とCIのPG16で権限制限→GRANT→migration 033/034→REVOKEを確認したが、実本番ロールの権限は未確認。
- migrate runnerのアドバイザリーロック競合で終了コード0になると配備がmigration未適用のまま進む。終了コード1とStaging workflowのfail-fastは[PR #250](https://github.com/hayaryoo519/uver-setlist-app/pull/250)でdevへマージ済み。モック単体テスト/両PR統合状態のCI 3ジョブは成功。Stagingの最終配備[run 39457811351](https://github.com/hayaryoo519/uver-setlist-app/actions/runs/39457811351)も成功したが、Productionへの適用は未実施。
- devのメール配送設定は本番相当の `NODE_ENV` で有効な送信者/パスワードとHTTPS `APP_URL` を必要とする。サーバー起動は設定不備でも継続するため、pingだけではメール動線の健全性を証明できない。Release前に秘密値を表示せず `server/scripts/check_email_configuration.js` の適用可否を運用担当が確認し、SMTP/実配送は別の安全な手順で判断する。Productionの現在の設定値は取得していない。

## 次の判断点

1. `dev` の全変更を本番に含めるか、別の最小リリース候補を設計するかを決める。後者もmigration・認証・同期ガードの依存を落とさないよう個別レビューが必要。
2. #249/#250はdevへ統合済みでCIとStaging自動配備も成功。引き続きProductionリリース候補のSHA/範囲をレビューし、本番固有の事前条件を確認する。
3. [本番運用者の読み取り専用事前確認](live_country_production_operator_preflight.md)で権限、migration履歴/ロック、メール設定、バックアップ/復旧と利用時間帯を確認。**公開ReleaseとProductionデータ更新はそれぞれ別の明示承認を待つ。** Stagingの画面受け入れ報告は[別記](live_country_production_release_preflight.md)であり、本番設定の証明にはならない。
