# Issue #109 / #196 PR分離と一人開発の確認手順

## ユーザー判断

ユーザーは「同期保護を分離」「Draft解除OK」「一人開発なので別のレビュー担当者はいない」と指定した。
Ready化は承認済みだが、devへのmerge/push、Staging接続/配備/DB適用/試験書込み/実データ同期/実Push、本番Releaseは承認していない。

## PR構成

```text
dev (b18313ad)
  └─ #244 hayaryoo519/fix-issue196-sync-guards
       └─ #242 hayaryoo519/feature-issue-109-continue
```

- [PR #244](https://github.com/hayaryoo519/uver-setlist-app/pull/244)：**base dev**。同期script/匿名化SQL/偽クライアントテスト/運用文書5ファイルだけ。
- [PR #242](https://github.com/hayaryoo519/uver-setlist-app/pull/242)：**一時base hayaryoo519/fix-issue196-sync-guards**。機能/API/UI/認証復帰/独立AIレビュー修正/隔離CI。同期保護5ファイルを差分から除外する。

機能の実SQL/SQL rollback/Worker統合が同じ匿名化SQLを使うため、分離しても依存関係は残る。独立したdev向け2PRに見せて依存を隠したり、検証用に別の匿名化SQLを複製したりしない。
元の履歴はbackup/issue109-before-pr-split-813a1907に保持し、既存featureへのforce pushは行わない。同期保護branchをfeatureへmergeして共通祖先にし、PRの差分で分離する。

## 差分とCIの確認

- #244の5ファイル：scripts/sync-db.sh、scripts/sync/anonymize.sql、server/tests/scripts/syncDb.test.js、docs/db_operations.md、docs/staging_sync_guards.md。
- #242と同期保護branchの比較で、この5ファイルに差分がないことを確認する。
- #244のCIは既存backend/frontend。ローカル分離単体はbackend600/40 suites（Windows依存admin suite除外）、frontend86/14 files、bash/差分チェック成功。
- #242のCIはbackend/frontend/使い捨てPG16統合の3ジョブ。workflowのpull_request対象に仮baseを明示追加する。push対象main/devと配備workflowは変えない。
- #242のCIsuccessを#244単体の実dump試験実績と扱わない。偽コマンドshell試験/実SQL rollback/本物のdumpの一貫同期を区別する。
- 分離後の#242ローカル検証：backend746/56 suites（Windows依存admin suite除外）、frontend229/29 files、型チェック、合成browser18、所有PG18の実認証/SQL/Worker/現行2build Workbox統合23が成功。既存環境は使っていない。
- Ready化前に各PRのhead SHA・base・差分・CIを確認。以前の813a1907のCI結果を、新しいheadの証明として流用しない。

## 一人開発の本人チェック

別の人間レビュー担当者を捏造せず、GitHub上の承認レビューをAIが作成しない。担当者の不在だけを理由にReady化を永久に保留もしない。
独立AI静的レビューと再レビューの記録は[レビュー記録](./live_metadata_independent_review.md)にある。本人は次を確認し、対象SHA/合否/残件をPRコメント等へ記録する。

- #244：停止ACK、接続先指定、private SQL事前生成、transaction、cleanup失敗時停止維持、未知依存での失敗、全機密監査未完了。
- #242：省略/null/確認済みなし、再取得の手動保持、現在のDB権限/session失効、revision/監査、公開privacy、役割を含む検索、409でdraft保持。
- 各PRの範囲と残件が説明どおり。共演自動抽出、import全体atomic化、実Push/実機等の未完了を保持し、Issue #109を自動closeしない。
- CI成功と実Staging受け入れを区別。未確認を合格にしない。

必須レビューのbranch rule等がmergeを阻止する場合は、その事実を報告して本人判断を待つ。自分でルールを外したり管理者バイパスしたりしない。

## 後続の順序（ここでは実行しない）

1. 本人が#244のmergeとStaging自動配備の影響を別途判断する。Ready化をmerge許可と扱わない。
2. #244が実際にdevへ入った後に限り、#242のbaseをdevへ戻す。並行するdev変更を確認し、最新の認可/依存patchを維持する。
3. #242で同期保護が再び差分に出ないことを確認し、仮base用CI event設定を整理する。最新headの全CIを再確認する。同期保護branchはretarget完了前に削除しない。
4. 機能のmerge/配備/実環境受け入れは[Staging計画](./live_metadata_staging_acceptance.md)の別ゲートで判断する。本番データ同期・実配送の承認と混同しない。

既存Staging/本番への接続・更新、migration、実同期、Push配送、Release公開は、この分離/Ready化作業では行わない。
