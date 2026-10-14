# Issue #109 差分レビュー・PR準備

## 状態

現在の作業ブランチ：`hayaryoo519/feature-issue-109-continue`。
棚卸し時点でtracked変更33ファイル＋新規77ファイル。下記の準備文書は棚卸し後の追加なので、その数に含まない。
DB同期保護の4ファイルだけをローカルcommit `678dcb01`（fix: harden staging database synchronization and sanitization）に分離済み。
認証ログ保護：`87c81d23`（2ファイル）。機能本体：`b834dc77`（77ファイル）。検証基盤/CI：`898cefb0`（26ファイル）。
この準備文書/管理review概要は別のdocs commitにまとめる。
push/PR作成/既存環境接続/適用/配信/デプロイは未実施。
一次レビューであり、全ファイルの独立レビューやリリース承認完了ではない。

## 一次レビューの確認範囲

- 033/034（改番前030/031）は新規・追加型。既存環境へ適用済みのマイグレーションは編集していない。
- メタデータ/辞書/reviewルートは管理者認可付き。通常の公演更新とメタデータ更新は分離。
- revision・公演行ロック・監査履歴・関連更新は同一トランザクション。artist参照をロックし、release/rollback経路も確認。
- 候補保存は手動overrideを書き換えず、同一候補ではrevisionを増やさない。
- 公開一覧/詳細のSELECTにimport_metadataは含めず、公開projectionは有効値だけを出す。
- 編集フォームは変更項目だけPATCHし、409でdraft保持。辞書即時保存と関連保存は別。
- review queryはadmin IDごとにキーを分け、エラーを確認済み/0件に扱わない。
- SW通知は同一origin・正確なURL一致。未保存編集中の再通知/別tabでの編集を破壊しない。
- JSON import追加はresolveJsonModuleに対応し、依存パッケージを新たに追加していない。
- CIはread-only権限、アプリ用secrets/既存DBなし。artifactは合成browser reportのみ。

### 修正した指摘

メタデータAPIの公演ID検証がJS safe integerまでで、DBのINTEGER上限を超える値がDBの500になり得た。
`2147483647`上限を追加し、GET/manual PATCH/candidate PATCHをDB接続前に400で拒否。
範囲外/非整数5ケースと最大有効ID1ケースを追加（6テスト）。

二次レビューでは、年代一括収集も単件取り込みと同じfestival辞書で既存FESTIVAL種別へ保存するよう修正。会場名/日付だけからの捏造を禁止する3テストを追加。
公開の共演者検索も辞書のNFKC/lowercase/trim/連続空白正規化に揃え、空白だけの入力と句読点保持を含む4テストを追加。
公開検索の同じassignmentに対するartist/role AND、およびmetadata保存時の一覧/review/該当詳細・辞書更新時の全詳細キャッシュ無効化も確認。

### 維持する制約・追加判断

1. 共演者のID/role管理は実装済みだが、自動抽出は未完了。Issue全体を無条件に閉じるPR説明にはしない。
2. 公演作成・曲作成・セトリ保存は複数リクエスト。後続失敗時の部分成功問題は既存課題として残す。今回のmetadata transactionだけで全importがatomicと説明しない。
3. setlist.fmでtourがない場合、infoを表示/保存tourのfallbackに使う既存互換動作が残る（原文tourは別に保持）。説明とツアー名の厳密な分離は追加判断が必要。
4. PWAの既存API用正規表現は`^/api/`等だが、Workbox RegExpRouteはurl.hrefに適用する。そのため今回のAPI非キャッシュ結果を「全private endpointを明示NetworkOnlyにした」と説明しない。将来APIキャッシュを修正するならprivate/public境界を先に設計する。
5. 同期SQLはAPI検証済みの既知override値を前提に保持する。未知キー除去の検証は済んだが、不正な既知値や全テーブルを含む本番バックアップ機密監査は未完了。同期許可と扱わない。
6. 実Push/OSクリック/過去の本番JS/実配備キャッシュ/PG16 CIは未確認。

## 分割順（A/B/C＋ログ保護をローカルcommit済み）

### A. DB同期保護（Issue #196の範囲も含む）

対象：scripts/sync-db.sh、scripts/sync/anonymize.sql、server/tests/scripts/syncDb.test.js、docs/db_operations.md。
新metadata表はSQL上optionalなので、機能導入前のschemaでも動作する。
共通docのリンク先/説明は独立PRで整合するよう調整が必要。Aの段階でfeature API/GUIまで検証済みとは記載しない。

### B. Issue #109 機能本体＋関連する通知/認証復帰

対象：033/034、metadata/artist/reviewのroutes/services/utils、lives/収集経路の接続、UI/types/hooks、通知/認証復帰、対応単体テストと機能doc、tsconfig。
共通ファイルは差分単位を確認してステージする。認証ヘッダログ除去は小さな独立fix commitとして扱える。
共演自動抽出等はfollow-upとして明記し、完了範囲を合意する。

### C. 隔離検証基盤＋CI

対象：server/scriptsの検証runner/helpersと安全性テスト、server/package.jsonの試験script、playwright.metadata.config.js/tests/e2e、通常Playwrightの除外、root package.jsonのscript、.gitignore、CI、検証doc。
実SQL/ブラウザ試験はAの匿名化SQLとBのAPI/UIを使うため、A/Bを前提とする。Cだけを先にマージしない。

4つのローカルcommitに分離済み。Aを独立PRにするか、同じDraft PR内で目的別commitとしてレビューするかは公開前に確定する。
A単独PRではdb_operationsからCの検証docへのリンクを調整し、B/CをAより先にマージしない。
大きな全体を`git add .`で無確認に取り込まない。

## PR本文草案（B/C用）

### 概要

Issue #109の固定タグ判定、取得元別候補・手動確定、海外/生誕メンバー/共演者構造化、管理review queue、公開表示/searchを追加。
再取得時の手動保持、revision競合、公開JSONへの原文/管理メモ非出力、通知/ログイン復帰も検証。

### DB変更

033/034の追加型マイグレーション。既存schema/公演/セトリを破壊する変更なし。
未適用の実環境では配備前に正式migrate経路で適用が必要。テストは全migration SQL直接適用で、migrate runnerのtracking/lock検証ではない。

### 検証

最新dev統合後はフロント229、バックエンド722（Windows依存admin suiteはローカル除外）。
合成browser18ケース。所有PG18/実bcrypt/JWT/API/Chromium/Worker/本番Workbox更新の統合コマンド23項目。
型チェック/差分チェック成功。既存のlarge chunk warningあり。
CIにはPG16/Ubuntuを追加したが、Actionsでの実行結果はPR作成後に確認する。

### 対象外/注意

共演自動抽出、全import atomic化、実Push/OSクリック、過去の本番JS/配備キャッシュ、実環境schema差分、全機密情報監査。
本番/Staging操作なし。実JWT/ストレージ/クラスタをartifactに保存しない。

## index snapshot検証

未ステージ/未追跡のコードや.envを使わず、git write-tree/git archiveでステージ済みソースだけをtempへ展開して実行した。
依存ディレクトリはインストール済みnode_modulesを共有したため、fresh npm ciやCIそのものの代用ではない。

- B直前のtree `c3a4324b`：backend 349/27 suites（Cの安全性テスト15件はまだ含まない）、frontend214/26 files、型チェック成功。
- C直前のtree `ad6eef54`：backend364/32 suites、frontend214/26 files、型チェック、合成browser18、PG18の実認証/Worker/Workbox統合22項目成功。
- Windows依存の既知admin suiteはどちらも除外。生成物のlarge chunk warningは継続。
- snapshot/合成reportをtempから削除。実JWTやブラウザストレージは保存しない。既存DBには接続していない。
- Actions/PG16/Node24/Linux結果は未確認。

## 最新dev確認で見つかった公開前ブロッカー

origin/dev `37110394` をfetchして確認。今回のベースe389c326以降にセッション失効・トークンhash/期限・pending email・ログ保護・依存更新が入っていた。
mainベースの履歴には本件外のproduction workflow変更も含む。5commitだけをdevへ載せ替えようとしたが、同期script/docで競合し、rebaseをabortして元へ戻した。
元の履歴はローカル `backup/issue-109-before-dev-base` に保持。リモートにはpushしていない。

- devには030_users_session_version/031_users_auth_token_hashes/032_users_pending_email_changeが存在。未配備のfeature SQLは内容を変えず033/034へ改番。
- 最新devの認可は現在のusers.role/session_version/deleted_atをDB照合する。旧JWTのみのfixture結果を統合後の認可検証とは扱わない。
- token hash/期限・pending_email等の新しい機密列を同期匿名化で除去する必要がある。既存devの同期保護を失わないよう統合する。
- 最新devのログ保護/認証画面/依存パッチも保持し、最新lockfileで依存を入れ直して再検証する。
- 改番後は旧ベース（前提SQL29ファイル）でDB9項目、backend366/33 suites成功。最新devの認証030〜032を含む統合結果ではない。
- その後origin/dev 37110394をmergeし、4競合を解消。最新認証/同期/依存patchを維持してfresh npm ci後に再検証。backend722、frontend229、browser18、実認証14/Worker＋本番生成物23成功（[統合記録](./live_metadata_dev_integration.md)）。
- 公開前の最終差分確認/Actionsはまだなのでpush/Draft PRは保留。

## PRへ進む条件

- [x] 主要な収集/UI差分の一次・二次レビューと指摘修正（独立レビュー完了ではない）。
- [x] Aの4ファイルを選択的stage/commit。
- [x] B/Cのcommit範囲確定とコードの整合確認。
- [x] indexだけをarchiveして独立snapshotで機能本体の単体/型チェックを確認。
- [x] 完全snapshotで単体/型/合成browser/実API・SQL・Worker・本番生成物を再確認。
- [x] origin/dev 37110394を統合し、最新認可/同期/依存patchを保持して再検証。
- [ ] 公開PRの範囲・baseと、文書リンク/差分を最終確認。
- [ ] featureブランチのpushとdev向けDraft PRを作成（devへ直接pushしない）。
- [ ] CI成功、PG16/Linux結果、レビュー指摘の解消。
- [ ] merge前にStaging自動デプロイの影響と033/034適用手順を確認。

devへのmerge/pushはStaging配備を起動する。CI成功/Draft PR作成を、Staging受け入れや本番リリース完了と扱わない。
