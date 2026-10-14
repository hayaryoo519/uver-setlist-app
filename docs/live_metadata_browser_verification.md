# 追加情報の実ブラウザ検証（合成API fixture）

## 検証範囲

Playwrightで実際のChromiumを起動し、PC（1280×720）とPixel 5相当（393×727、タッチ/モバイル設定）の2構成で検証。
APIは合成データを返す。バックエンドを起動せず、既存DB・本番バックアップ・実アカウント・外部サービスは使わない。
これは実DOM/ブラウザ/画面操作の検証であり、実API＋DB＋ブラウザを一緒に動かす結合試験ではない。別の `--browser` モードで [対象APIの実結合試験](./live_metadata_integrated_browser_verification.md) も追加済み。
SQL/排他制御は別途 [使い捨てPostgreSQL検証](./live_metadata_db_verification.md) で確認した。

## 実行方法

```bash
# 対応するChromiumが未インストールなら、まず一度実行
npx playwright install chromium

npm run test:e2e:metadata
# 実ウィンドウを表示する場合
npm run test:e2e:metadata -- --headed
```

専用設定：`playwright.metadata.config.js`
- Viteのみをlocalhost:5188に起動。既存の稼働中サーバーを再利用せず、ポート使用中なら失敗する。
- 通常のplaywright.config.jsのserver/.envに基づくバックエンド起動は利用しない。
- APIのViteプロキシ先はlocalhost:9として、未処理要求も既存バックエンドへ送らない。
- ブラウザcontextの全通信を制御し、APIはfixtureで応答。localhost:5188以外への通信は拒否。
- Service Workerを無効化し、通信の横取り/キャッシュでAPI fixtureを迂回させない。
- セッションは偽のfixture用ユーザー/token。未ログイン/期限切れ/401の合成条件も利用する。JWTの実認証を検証するものではない。
- 未定義API要求と未処理JavaScript例外があればテスト失敗。

通常の `npm run test:e2e` ではこの専用suiteを除外する。通常suiteは別の環境/既存設定を使うため、今回の安全なfixture検証と混同しない。

## 成功した18ケース（9シナリオ×2構成）

1. **単件取り込み→確認→保存→公開検索→再取得**
   - 取得画面から合成setlist.fm応答をインポート。原文付きのPOST payloadを確認。
   - 管理者通知の単件URLから追加情報を開き、取得元間の国不一致を表示。
   - 国KR・対象TAKUYA∞・対バン相手を確定し、クリスマスを手動除外。
   - 公開画面で全角の別名、国、対象、アーティストID/役割を組み合わせて対象公演だけを検索。
   - 原文にクリスマスが残っても除外したタグは表示しない。
   - 合成候補を再取得しても手動設定/関連を保持し、公開詳細にも表示。
   - 取得文中のHTML様文字列はテキストとして扱い、実行しない。
2. **アーティストと役割を同じ関連に一致**
   - A=対バン/B=ゲストの公演をA=ゲスト検索で返さない。
   - 未確認の共演者はID検索に含めない。
   - モバイルパネルでも選択/チップ解除を確認。
3. **通知リンク・キーボード・競合**
   - Tab/Shift+Tabの循環、Escape時の未保存破棄確認。
   - 409で入力を保持し、再読込まで保存を禁止。
   - 最新情報を明示的に読んでから保存できる。
   - 閉じた後の一覧更新でモーダルを再び開かない。
   - SW→ページのメッセージを模擬投入し、同じ通知URLの明示的な再クリックでは再開する。
   - 編集中の再通知は未保存入力を保持し、閉じた後も再開要求を残さない。
   - 画面位置/下部ナビの重なり/背景スクロール停止と復元を確認。
4. **辞書登録・名称修正**
   - 辞書の即時登録だけで公演へ自動追加しない。
   - 役割を追加して公演情報を保存した時だけ関連付ける。
   - 正式名を変更してもIDを維持し、公開に新名称が反映される。
   - 全角別名で同じIDを検索できる。
5. **レビュー一覧の失敗・回復**
   - 500を件数0と表示せず、レビュー条件を利用不可にする。
   - 再取得で正常な件数と操作へ回復。

6. **未確認一覧への再通知**
   - 一覧条件を手動で変更した後、同じ未確認一覧通知の模擬メッセージでUNCONFIRMEDへ戻す。
   - 不要な単件モーダルを開かない。

7. **未ログインから単件通知へ復帰**：ログイン失敗/再試行後も対象モーダルへ戻る。
8. **読み込み時の期限切れから一覧へ復帰**：失敗/再試行後もUNCONFIRMED条件を保持。
9. **APIの401から単件通知へ復帰**：強制遷移でもreturnToを保持して再ログイン後に戻る。

認証API/JWTは合成fixture。実認証の結合試験ではない（[認証復帰の検証](./live_metadata_auth_verification.md)）。

通知メッセージはブラウザ内で合成投入している。実Service Worker/OS通知から受信した試験ではない（[通知検証](./live_metadata_push_verification.md)）。

候補判定/手動設定のvalidation/公開projection等はfixtureでも共有のサーバー関数を使うが、保存・競合・取得はHTTP mockである。
再取得のテストは合成候補の差し替えであり、実際の外部取得・定期ジョブを動かしたものではない。

## 見つかったUI問題と修正

操作の自動テストが成功した後にスクリーンショットを確認すると、モバイルのモーダルが長い管理ページ内の位置へ引っ張られ、下部ナビと重なる問題があった。
親要素のtransform/animationやスタッキングコンテキストの影響を避けるため、`LiveMetadataEditor` をdocument.body直下のPortalへ移した。

- 専用overlayのz-indexを1200とし、下部ナビより前面にする。
- 表示中は背景のbodyスクロールを止め、終了時は以前のoverflow値を復元。
- フォーカス復帰で背景を不必要にスクロールしない。
- モーダル内スクロールの連鎖と長い文字列の横はみ出しを抑える。
- overlayがviewportと一致し、下部ナビの位置でも前面にあることをブラウザで検証。
- Portal配置/overflow復元のユニット回帰テストを追加。

## 成果物

`test-results/metadata/` 以下に各構成の画像を保存する。
- metadata-review.png：保存後の管理レビュー。
- metadata-public-filter.png：複合公開フィルター。
- metadata-role-filter.png：役割/アーティストの絞り込み。
- metadata-viewport-dialog.png：viewportに配置されたモーダル。

HTMLレポートは `playwright-report/metadata/`。失敗時はtraceと追加スクリーンショットも保存する。
これらはGit管理対象外のローカル生成物。画像は合成データだが、実環境のログ/trace/スクリーンショットを同じように公開しない。
開発モードのReact Query Devtoolsアイコンは画像に含まれ得る。

## 残件

- 実Stagingとのschema差分/本番と同じPostgreSQLバージョンでの確認（リポジトリ全schema SQLは合成DBで [検証済み](./live_metadata_db_verification.md)）。
- 実環境/補助API/外部機能を含むアプリ全体の結合検証（所有DBでの対象APIの [実結合](./live_metadata_integrated_browser_verification.md) は完了）。
- 実Web Pushからの遷移、実際の外部取得/APIエラー/部分失敗の操作確認（[通知ハンドラの模擬検証](./live_metadata_push_verification.md) は完了）。
- 実スマートフォンのキーボード/セーフエリア、Safari/WebKit/Firefoxでの確認。
- リリース/PR/既存Stagingへのマイグレーション適用は今回行っていない。
