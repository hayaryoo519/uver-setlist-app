# 開催国：Staging／Production共通根拠の公開読み取り専用プレビュー

`../scripts/audit/live-country-evidence.json` はイベント固有の公式出典を照合した**48件の提案**（JP 47 / KR 1）。日付・Staging観測時の公演名・会場・国コード・公式出典だけを記録し、Staging/Productionの公演ID、revision、管理用候補、トークン、管理メモ、原文を含めない。既存の根拠調査は [2019年](live_country_2019_2021_source_review.md)、[2022年](live_country_2022_2023_source_review.md)、[2024・2025年](live_country_2024_2025_source_review.md)、[公式ツアー日程](live_country_tour_schedule_batch.md)、[2026年](live_country_next_source_review.md) を参照。

`scripts/audit/preview-live-country.mjs` は固定された二つの公開APIに**匿名GETだけ**行い、日付・公演名・会場の厳密な公演対応を出力する。日付だけ、会場だけ、都道府県が会場名に含まれることでは一致にしない。同日別公演がある場合は `ambiguous_public_record` として保留。国が既に確定済みなら `already_confirmed` / `different_confirmed_country` を分ける。公開APIに国の状態がない環境は `metadata_unavailable` とし、「更新可能」と表示しない。`public_unreviewed_match` は公開側の一意対応だけで、管理者レビュー・保存承認・revisionを意味しない。

```bash
node --test scripts/audit/preview-live-country.check.mjs
node scripts/audit/preview-live-country.mjs --environment staging
node scripts/audit/preview-live-country.mjs --environment production
# 必要な場合だけ --details を追加。公開IDと非機密の照合状態を表示する。
```

## 匿名公開GETの事前プレビュー（2026-10-18）

| 環境 | 公開公演総数 | 根拠48件の公演同定 | 公開国状態 | 例外 |
|---|---:|---:|---|---|
| Staging | 642 | 48件の一意一致 | 一致48件すべて `unreviewed` | なし。ただし管理APIのrevision/監査履歴は未確認 |
| Production | 1081 | 46件の一意一致 | 公開APIに `metadata.country` がなく46件とも `metadata_unavailable` | 残り2件は公演名または会場の不一致 |

Productionの2例：2019-11-05はStaging由来の公演名「Zepp Sapporo Event」に対しProduction公開名「BIRTHDAY LIVE」（同会場）。2026-08-29は音楽と髭達の公演名の文字幅・会場の空白等が異なる。**自動同一視せず保留**する。Productionの公開APIに国状態がなく、認証なしの `/api/lives/:id/metadata` GETはHTTP 404だった。これは実際に稼働しているProductionのDBスキーマや管理権限を確定する証拠ではなく、**現在の公開データだけでは国の既存確定・更新可否・revisionを確認できない**という境界である。Productionへのログイン、DB接続、更新、Release publishは行っていない。

### 本番コードの読み取り専用確認（2026-10-18）

`origin/main` の `e389c326` と最新公開Release `v1.30.2`（同じcommit）を確認したところ、`server/routes/liveMetadata.js`、`server/migrations/033_live_metadata.sql`、管理UI `LiveMetadataEditor.tsx` は含まれていなかった。公開APIの応答とも整合する。ただし実サーバーの起動コード/適用済みDB migrationを直接照合したわけではない。**本番の国確定作業に先立って、該当機能を含むコードのmainへの取り込み・公開Release・デプロイ検証が別途必要**であり、通常のDB変更の後方互換性と既存の同期ガードをレビューする。PR #246の診断資料のマージやStagingのデータ保存だけでは本番に機能も国も反映されない。

## 次の停止条件

このプレビューの一致件数を一括PATCH対象にはしない。Stagingでも保存前に、各公演の管理APIで最新revision、既存の手動国、他属性、候補・出典を再確認し、書き込み範囲の明示承認が必要。保存する場合も国だけを1件ずつrevision付きPATCHし、409や不一致で停止する。Productionはまず必要なコードのリリース状況を別途確認し、Production固有の公演/出典/既存設定を再照合して**別の承認**を得る。StagingのIDやrevisionを転記せず、Stagingで保存した国がProductionへ伝播すると主張しない。
