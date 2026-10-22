# Issue #109 独立AI静的レビュー記録

## 方法・対象

[Draft PR #242](https://github.com/hayaryoo519/uver-setlist-app/pull/242)について、実装担当とは別の新規CodexプロセスをOrcaから起動し、read-only sandboxで静的レビューを依頼した。
レビュー対象は`c571fa2fb52773d2b1f7907f1f505609748cd82c`、比較先はlocal origin/dev `37110394320d202fbcea1c2bcfd3c6ad28be0b50`。
メタデータ/artist API・候補/手動保持・公開projection/filter・認可/監査/revision・033/034・同期/匿名化を中心に確認した。

これは**独立したAI静的レビューであり、人間によるレビュー/配備承認ではない**。レビュー担当はファイル変更、テスト、DB接続、同期、配送、既存環境操作を行っていない。
共演自動抽出、全import atomic化、実同期/実Push等の既知の未完了を新規欠陥と扱わないよう、仕様と境界を提示した。

## 指摘と修正

3件のP2指摘があり、実装担当が回帰テストで再現を確認した。修正commitは`44e71a59`。

| 指摘 | 再現/影響 | 修正 |
|---|---|---|
| 候補タグ省略が明示空タグへ変換される | タグ未保存のBirthday Liveへ国候補だけを保存すると、tags空配列が生成され、公開の名称fallback/生誕review要件が消える | snapshotのいずれかに明示tagsがある場合だけ集約tagsを出す。明示tags空配列は尊重 |
| nullable sourceIdで省略更新先が変わる | setlistfm snapshotのsourceIdをnullにし、次にtags空配列を保存するとlegacy snapshotを作り、元のmensが残る | 優先順で選んだ保存済みsource-mapキーを省略更新先にする。別取得元の原文/候補を保持 |
| 管理の有効タグと公開表示が異なる | タグ未保存公演の管理GET/無関係な手動PATCH/resetで名称由来birthdayを返さず、公開/reviewだけ表示する | 公演タイトル/tour/special_noteを読み、GET/PATCHも共通effectiveLiveMetadataを使う。候補そのもの/監査snapshot/レスポンス形式は保持 |

追加8テストのうち7件が修正前に失敗し、修正後は8件とも成功。明示空タグのfallback抑制を維持するcontrolと、複数取得元での更新先/原文保持も含む。
名称fallbackは返却する有効値にだけ適用し、保存候補へ推測タグを書き戻さない。既存の取得元別ルール、手動確認・除外、revision/監査/関連のtransaction、現在のDB権限/セッション確認は変更しない。

## 修正後の検証

実装担当が実行した結果（レビュー担当自身の実行ではない）：

- backend **730 tests / 55 suites**成功。Windows依存admin suiteはローカル除外。
- frontend **229 tests / 29 files**成功。型チェック、bash構文、差分チェック成功。
- 所有PG18・架空アカウント・実bcrypt/JWT/API/SQL/PC-mobile Chromium・native Worker・現行コード2buildのWorkbox統合 **23項目成功**。
- 本物のdumpによる同期一貫試験、実Push配送/OSクリック、過去配備bundle/実キャッシュ、全機密監査は未実施。
- c571fa2fのCI成功を44e71a59の検証結果として流用しない。修正後の最新head結果は[PR checks](https://github.com/hayaryoo519/uver-setlist-app/pull/242/checks)で対象SHAと併せて確認する。

その後のdev PR #243取り込み（2e80441c）はroot/server lockfileと回帰テストだけの追加。fresh npm ci後にbackend745/56 suites、frontend229/29 files、browser18、所有PG18統合23、型/bash構文/差分チェックが成功した。これは実装担当の追加検証であり、44e71a59の静的レビューを依存関係全体の監査へ拡張するものではない。

## フォローアップ

44e71a59bde71f0eed5cbad8106c08dda96a3ef0の4ファイルと共通projection/関連呼び出しを、別の新規Codexプロセスでread-only再レビューした。
3指摘すべての解消と、今回の差分に追加のactionable defectが見つからないことを確認。明示空タグ、別snapshot、手動設定、認可/revision/ロック/監査transaction/rollback/release/公開privacyの静的確認も報告された。
再レビュー担当もファイル変更・テスト・DB/runtime検証を行っていない。局所的な静的レビュー結果を、全機密監査や人間の承認の代用にしない。
[Staging受け入れ計画](./live_metadata_staging_acceptance.md)は作成済みだが、実環境接続/配備/試験書込み/配送は未承認・未実施。
この時点ではDraft維持としていた。その後ユーザーが同期保護の分離・Ready化を承認し、別の人間レビュー担当者はいないと指定した。[分離/本人チェック手順](./live_metadata_pr_split.md)に従い、分離後のCIを確認してReady化する。これはmerge/配備承認ではない。重大な追加指摘がある場合は修正と再確認を先に行う。
