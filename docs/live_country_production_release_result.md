# 開催国機能のProductionコードリリース結果

2026-10-22、`dev` 全体を[PR #251](https://github.com/hayaryoo519/uver-setlist-app/pull/251)で `main` (`4efe393b11b610889df1b64f674dc2d8aefc0609`) にマージし、[Release v1.31.0](https://github.com/hayaryoo519/uver-setlist-app/releases/tag/v1.31.0)を公開した。国データの追加確定、Staging同期、ProductionへのID/リビジョン転記は行っていない。

- main向けCIのバックエンド・フロントエンド・メタデータ統合3ジョブが成功。mainとStagingで確認済みdevのファイル内容は一致。
- [Production配備Actions run 39798987482](https://github.com/hayaryoo519/uver-setlist-app/actions/runs/39798987482)は成功。ログでは新しいDBバックアップ完了、migration `030`〜`034` の各 `[DONE]`、APIヘルス成功を確認した。これは配備ログの確認であり、適用履歴・REVOKEをDBの別接続で独立監査した結果ではない。
- 公開の `/api/ping` は `pong`、`/lives` と `/api/lives` はHTTP 200。匿名の管理メタデータGETは旧コードの404から403に変わり、未認証アクセスを拒否している。
- 公開1081公演すべてで `metadata.country.status=unreviewed`。48件の公式根拠のうち46件は公開公演と同定できるが未確認、2件は公演同定不一致で保留。**検索に出る確認済み開催国はまだない**。「未確認」をJP扱いしない。
- 本番運用者の `sudo systemctl status uver-setlist --no-pager --lines=0` 報告では、`Active: active (running)`、起動は**2026-10-22 23:50:57 JST**、Main PID 85242 (`node index.js`)。旧起動時刻2026-10-08から更新されたことを確認。こちらから本番ホストへ直接SSH・DB接続した結果ではない。

## リリース後の表示と公開公演対応（2026-10-23）

本番の実ブラウザ（匿名・保存なし）で開催地を選ぶと、日本/海外ともに選択状態となり `検索結果 (0)` になった。スマホ幅では詳細フィルターパネルの下に件数が隠れるため、選択位置の近くに件数と未確認除外の説明を出す[Draft PR #255](https://github.com/hayaryoo519/uver-setlist-app/pull/255)を用意。CI 3ジョブは成功、dev/Productionには未マージ・未配備。現在のdevにはv1.31.0以降の別機能（#253）もあるため、UI改善の本番反映はリリース範囲を別途判断する。

既存のStaging4件と対応する日付（2026-10-04、2026-09-27、2025-12-31、2019-12-31）をProduction公開APIで**各日1件ずつ**確認。公演名/会場の表記は対応し、国状態はいずれも未確認。特に2026年のProduction公開IDはStagingとは異なる。これは公開公演の同定であり、管理APIの最新revision、既存手動値、監査履歴、保存可否を確認したものではない。

## 別の判断が必要なこと

Production DBのmigration履歴が34件になったこと、`live_metadata` / `live_artists` 表の存在、一時的なCREATE権限が取消済みであることの**独立した読み取り専用DB再確認**は未実施。配備成功だけで代用しない。Production国データの確認・保存は、既存状態・公演同定・最新revisionの環境固有チェックと**別の明示承認**が必要。Stagingの4件や48件の提案を自動コピーしない。[事前確認手順](live_country_production_operator_preflight.md)と[環境間プレビュー](live_country_cross_environment_preview.md)を参照。
