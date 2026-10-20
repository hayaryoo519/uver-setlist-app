# 開催国機能のProductionコードリリース：読み取り専用差分確認

2026-10-20、Gitの `origin/main` / `origin/dev` と最新公開Releaseを読み取り専用で比較した。**mainへのマージ、Release公開、Production接続・データ更新は行っていない。** 実サーバーの起動時刻やDB権限は未確認。

| 対象 | 観測値 |
|---|---|
| 現在のmain / 最新公開Release `v1.30.2` | `e389c326`。`server/routes/liveMetadata.js`、`033_live_metadata.sql`、管理UIを含まない |
| 現在のdev | `88cae715`。Issue #109関連の管理API・UI・検索・マイグレーション・同期保護を含む |
| mainからdevへの差分 | 94コミット、207ファイル、約12,213行追加・782行削除。**開催国だけの差分ではない** |
| DBスキーマ差分 | devには `030_users_session_version.sql`〜`034_live_artists.sql` の5ファイルが追加されている |
| 公開APIプレビュー | Productionは公演1081件、根拠48件のうち46件が公演同定できるが、`metadata.country` は公開されていない。2件は表記差で保留 |

開催国以外の変更・設定・migration副作用の内訳は[リリース範囲の棚卸し](live_country_release_scope_inventory.md)を参照。

## 本番デプロイworkflowの要注意差分

`origin/main...origin/dev` の `.github/workflows/deploy-production.yml` では、**mainにあるDBロールへの一時的な `CREATE ON SCHEMA public` 許可とEXIT trapによるREVOKEのブロックがdev側では削除されている**。mainからdevへ単純にコードを取り込むと、同時に追加されるCREATE TABLE系migrationを本番アプリロールが実行できない可能性がある。現在のProduction DB権限は未確認なので「必ず失敗する」とも「問題なく通る」とも断定しない。

本番Releaseの前に、main側の必要な一時権限付与・確実な取消しを**意図せず削除しない**形にworkflowを調整する。[Draft PR #249](https://github.com/hayaryoo519/uver-setlist-app/pull/249)で復元案と使い捨てDB検証を用意したが、未マージ・実本番権限未確認である。既存migrationを書き換えず、スキーマ変更の後方互換性、バックアップ、デプロイ後のsystemd起動時刻/ヘルスを別途確認する。workflowに資格情報の値を出力しない。

## Staging画面の利用者確認（2026-10-20）

利用者から、案内したStagingの確認項目（日本/海外フィルターと解除、対象公演の詳細・種別、楽曲/種別/詳細条件のPC・モバイル表示、普段のログイン/参戦記録/マイページ動線）について**問題なし**との報告を受けた。これは利用者による画面受け入れ報告であり、こちらが実機・全動線を再現した結果ではない。確認時のStagingはdev上の既存コードで、Draft PR #246/#249/#250の未マージ変更やProduction用のRelease候補と同一ビルドであるとは主張しない。実Push/OS、Production DB移行権限、公開CDN/過去Worker、監査履歴などはこの報告の範囲外。

## 推奨する順序（未実施）

1. 本番コードの対象差分とデプロイworkflowをレビューし、devに含まれる無関係の変更も受け入れるか判断する。Issue #109だけを安易にcherry-pickして依存migration/認証/同期ガードを落とさない。
2. main相当のRelease候補で隔離DB・CI・migrationを検証。Productionコードリリースは**別の明示承認**の後、既存の `main` → 公開Release手順で行う。Stagingの更新やDraft PR #246のマージは本番リリースにならない。
3. 本番の管理機能が動いていることを実環境で再確認し、Productionの既存国/候補・公演対応・最新revisionを確認する。[公開読み取り専用プレビュー](live_country_cross_environment_preview.md)の46件は管理者が保存可能な件数ではない。
4. Productionの国データ確定はコードリリースと**別途承認**。共通の公式出典は再利用できるが、公演ID・revision・既存の手動国はStagingから転記しない。国だけを管理APIで1件ずつ保存し、不一致/409で停止する。
