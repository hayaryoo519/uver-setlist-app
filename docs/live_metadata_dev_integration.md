# 最新dev統合の確認

## 対象

origin/dev `37110394`（Axios更新PR #241まで）をfeatureへ統合。
030〜032の認証schema/現在のDB権限照合/session_version/ログ保護/メール変更/UI/依存パッチを保持し、追加情報は033/034。
既存環境・本番バックアップを使わず、既存migrationのSQLは変更していない。

## 競合の解消

- lives POST：追加情報候補のtransactionを維持し、取得原文/会場等のdebug出力は復活させない。
- 認可：devのgetCurrentUser/getOptionalUserIdとDB role/session_version/deleted_at確認を維持。資格情報を出さない固定ログへ統一。
- 同期：devのprivate SQL（umask077）事前生成＋復元/匿名化の同一transactionを維持。生成失敗では既存DBを変更しない。
- 同期の公開/ワーカー停止ACK、明示接続、失敗/INT/TERM時の強制DB削除、private SQL削除も維持。自動再開なし。
- users/corrections/個人活動/関連/外部資格情報/下書き/送信queue/追加情報履歴を一括TRUNCATE。userのhash/期限/pending email等も行ごと除去。未知FKはCASCADEで隠さず失敗。
- 公開メタデータ/辞書/共演関連は保持し、原文/管理メモ/未知JSON/取り込みJSONは除去。
- prod workflowはorigin/dev版を採用し、古いmain由来の本件外変更をPRへ持ち込まない。

## 検証

fresh npm ci（root legacy-peer-deps/server通常）で最新lockfileを使用。

- backend **722 tests / 55 suites**成功（既知Windows依存admin suiteは除外）。
- frontend **229 tests / 29 files**成功。Settingsの架空AuthUserを必須型に合わせた。
- tsc、bash構文、合成API PC/mobile browser **18 cases**成功。
- PG18：前提SQL **32 files**（000〜032、014欠番）＋033/034の適用/再適用。
- 実bcrypt/JWT/認可/API/SQL **14 checkpoints**成功。
- Worker＋本番Workbox生成物統合 **23 checkpoints**成功。
- 従来の未認証/一般ユーザー/偽造/期限切れ/別署名30リクエストに加え、有効な署名でも現在の権限降格/session_version変更/soft deleteの18リクエストを6管理APIで拒否し、metadata DB状態を保持。
- user除去後は新しい架空actorをseed。匿名化SQL失敗ではusers/OAuth/queueもrollbackすることを確認。

SQL生成/同一transaction/失敗cleanupは偽クライアントのshell試験、匿名化・rollbackは所有PostgreSQLの実SQL試験。本物のdumpからsync-db.shを一貫実行する試験までは未実施。
本番生成物のlarge chunk warningは継続。

## 公開PRとCI

featureブランチをpushし、dev向け[Draft PR #242](https://github.com/hayaryoo519/uver-setlist-app/pull/242)を作成。
`c571fa2f`の[Actions](https://github.com/hayaryoo519/uver-setlist-app/actions/runs/38571130062)で全3ジョブ成功。
Ubuntu/Node24/PostgreSQL16.15でbackend726件（admin suite込み）、合成browser18ケース、旧schema7項目、実認証/Worker/本番生成物23項目を確認。
初回CIのserver-onlyブラウザ依存とPG起動を修正した。詳細は[CI記録](./live_metadata_ci.md)。

## 残件

- npm ci時点のaudit指摘：root17（low1/moderate7/high9）、server25（moderate21/high4）。直接依存のdevパッチは維持したが全指摘解消とは扱わない。audit fix --forceは実行していない。
- [独立AIレビュー](./live_metadata_independent_review.md)の3指摘は44e71a59で修正済み。追加8テストを含むbackend730、frontend229、所有PG18統合23は成功。別の新規Codexによる44e71a59のフォローアップ静的レビューで3件解消を確認。最新head CIは[PR checks](https://github.com/hayaryoo519/uver-setlist-app/pull/242/checks)を参照。
- 人間のレビュー/配備判断、[Staging受け入れ計画](./live_metadata_staging_acceptance.md)の承認と実環境確認。
- 全機密監査/実同期/実環境schema/実Push配送/OSクリック/旧配備bundleは未確認。

feature push/Draft PR作成は実施済み。devへのmerge/push、既存Stagingや本番の接続・変更・配信・デプロイ、Release公開は実施していない。
