# Production開催国レビュー結果（2026-10-24）

Issue #109のコードRelease v1.31.0後、Stagingから公演ID・revision・保存値をコピーせず、Production公開公演を公式出典の証拠マニフェスト/初回4件の記録と日付・公演名・会場で独立照合した。利用者の「本番50件について開催国だけを保存してよいか」という確認に続く「つぎ９へ」を、対象50件への実行指示として扱った。**開催国以外の保存、同期、直接SQL更新は行っていない。**

| 項目 | 結果 |
|---|---|
| 初回4件（Stagingとは別の本番公演） | JP3、KR1。公開で各日1件の同定、管理者GETで未確認・手動国なし、最新revisionを確認 |
| 追加根拠48件 | 46件を本番公開で一意同定（JP45、KR1）。2件は公演名/会場の同定不一致で**保留・更新なし** |
| 公式出典 | 記録済み24 URLは当日すべてHTTP 200。出典本文の全行をこの日に再審査した結果とは言わず、過去の公演別レビューを参照 |
| 認証付き管理GET | 対象50件すべてで国未確認、手動国なし、revision取得、国以外のoverride・候補・artist関連の指紋を保存前に確認 |
| 保存 | `PATCH /api/lives/:id/metadata` に `{revision,patch:{country:{code}}}` **のみ**を1件ずつ送信。自動競合リトライ/無監査の一括SQLなし。4件の検証後、残り46件の保存直前再チェックも通過 |
| 逐次検証 | 各件の管理GETで国confirmed・revision +1、国以外の手動設定/候補/artist指紋不変を確認。公開詳細の公演名・日付・会場・種別・セトリ・国以外の属性が不変、KRのみ海外タグとなることを確認。50/50件成功、停止・競合0件 |
| 独立した保存後確認 | 認証付き管理GETで50/50件の国、revision +1、非国指紋を再照合。公開GETでは1081件中JP48 / KR2 / 未確認1031、対象50件の国一致50/50。PC/スマホ幅の本番ブラウザで「日本」48件・「海外」2件を確認 |

保留の2日付は**2019-11-05 / 2026-08-29**。公開プレビューでは根拠48件中46件が `already_confirmed`、2件が `identity_mismatch`。表記差を自動的に同一視せず、別レビューまで保存しない。残る1031件にも国の一律JP推定を適用しない。

**監査の境界:** 管理API/公開APIからのrevision・値・非国指紋確認は行ったが、Production DBに別接続して `live_metadata_history` の各行やmigration履歴をSQLで独立監査した結果ではない。管理用候補原文・メモ・トークンは出力/文書化していない。画面上の0件説明改善[PR #255](https://github.com/hayaryoo519/uver-setlist-app/pull/255)は2026-10-24に`dev`へマージ・Stagingに配備したが、**Productionには配備しなかった**。その後、利用者の判断で開催地フィルタ表示自体を一時撤去した（下記）。この国データ確定とは別作業。

## 保留2件の追加読み取り調査（未保存）

- **2019-11-05（Production公開ID 1229）:** Productionは公演名 `BIRTHDAY LIVE`、会場 `Zepp Sapporo`、種別ONEMAN、当日は公開1件。[公式2019特設日程](https://www.uverworld.jp/feature/2019_livetour) は同日 `真太郎 生誕祭`・`ZEPP SAPPORO`・地区 `北海道札幌市` と独立して記載。生誕祭/BIRTHDAY LIVEの対応は強い手掛かりだが、Stagingの `Zepp Sapporo Event` とも公演名が異なるため、管理者による公演同定レビューを省略しない。
- **2026-08-29（Production公開ID 1268）:** Productionは `音楽と髭達2026 -TIME MACHINE-`、`HARD OFF ECOスタジアム新潟`、種別FESTIVAL、当日は公開1件。[公式公演詳細](https://www.uverworld.jp/schedule/detail/3175) は同日・同イベント・会場（空白等に差がある）と[会場公式](https://www.hardoff-eco-stadium.jp/)へのリンクを記載。会場公式は `〒950-0932 新潟県新潟市中央区長潟570` と明示。表記差を黙って自動正規化せず、個別にイベント同定を確認する。

両公式URL/内容の該当箇所は2026-10-24に再取得した。両件の国は**依然 `unreviewed`**。再調査時にOrcaの管理者セッションは `/login` に移り、認証付きGETは403だったため、既存手動値や最新revisionは再確認できていない。**追加の本番保存は承認・ログイン後の個別管理GETと出典/同定確認まで行わない。**

## 国フィルターの結果説明（コードのみ、Production未配備）

PR #255を`dev`の`723b449b`へマージ。フロントエンド対象テスト24件、型チェック、ビルド、GitHub CIの3ジョブ成功。Stagingデプロイrun `40059790715`成功後、公開APIで642件中JP3/KR1/未確認638を確認。新規ブラウザのPC・スマホ幅で「日本」3件・「海外」1件、各選択の近くに現在の件数と未確認を含めない説明が出ることを確認した。直前の`dev`（#253）デプロイrun `39803854233`はAPI起動ヘルスチェックで失敗していたため、**成功したのは今回のrun**であり、前回の失敗を成功扱いしない。この時点でProductionはv1.31.0だった。表示変更だけをmainへ戻す[Draft PR #256](https://github.com/hayaryoo519/uver-setlist-app/pull/256)はCI成功後、開催地フィルタ表示の巻き戻し判断に伴い**クローズ・未配備**。#253の無関係なdev変更はProductionへ持ち込んでいない。

## v1.31.1：公開開催地フィルタ表示の一時撤去

利用者の指示により、日本/海外ボタンとStagingで追加した「開催国未確認」説明を公開アーカイブから撤去。`countryCode`/`overseas`の保存済み条件は厳密な絞り込みと解除可能なチップを維持。国確定値50件、管理画面レビュー、公開メタデータ、認証、DB/API、他のフィルタは維持し、国を一律JPに変更していない。

- Staging: [PR #257](https://github.com/hayaryoo519/uver-setlist-app/pull/257) を`dev`の`5a3ce77b`へマージ。初回CIのE2Eは旧ボタンを要求して失敗したためテストを修正。修正後のPC/スマホ合成E2Eは25成功/1意図的スキップ、CI 3ジョブ成功、デプロイrun `40071584588`成功。新規ブラウザ両幅で開催地ボタン/説明なし、他のフィルタあり、公開642件（JP3/KR1/未確認638）を確認。
- Production: v1.31.0の`main`に表示差分のみ適用した[PR #258](https://github.com/hayaryoo519/uver-setlist-app/pull/258)を`d2217d24`へマージ。main CI 3ジョブ成功。GitHub Release `v1.31.1`をこのSHAでpublishし、Production Actions run `40072332378`成功。新DBバックアップ完了、migrationは変更なし、API ping健康チェック通過。新規本番ブラウザPC/スマホ両幅で開催地ボタン/説明なし、他のフィルタあり。公開1081件（JP48/KR2/未確認1031）は変更なし。
- **未確認:** Productionホストでの `sudo systemctl status uver-setlist` による起動時刻・PID検証は運用者の確認待ち。Production DB履歴の独立SQL監査も未実施。既存PWA利用者には古いService Workerが残る可能性があり、新規ブラウザでの検証と区別する。
