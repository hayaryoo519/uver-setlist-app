# 追加情報通知のService Worker検証

## 検証済みの範囲

`server/tests/scripts/swPush.test.js` は実際に配布する `public/sw-push.js` をNodeの隔離VMで読み、Push/notificationclickハンドラを実行する。12テスト成功。
Service Worker APIは模擬オブジェクトであり、実Push配送、OS通知、ブラウザ権限や実WindowClientを検証したものではない。
管理画面のURL直接遷移/フォーカス/未保存入力は別途 [合成APIの実ブラウザ検証](./live_metadata_browser_verification.md) で確認している。

```bash
npm test --prefix server -- --runInBand tests/scripts/swPush.test.js
```

確認内容：
- Push payloadの単件レビューURL/通知タグを通知のdataに保持。
- 「閉じる」ではタブを開かない。
- 同一originの正規化済みURLと完全一致するタブだけをフォーカスし、`metadata-review-notification` メッセージを送る。
- `metadata=4` の通知で `metadata=42` のタブへ誘導しない。
- 他URLのタブをnavigateせず、未保存入力を上書きしない。別タブで対象を開く。
- 未確認一覧URLも保持する。
- 外部origin、javascriptスキーム、非文字列のURLは同一originのホームへ戻す。
- 不正なPush JSONは処理内で記録し、通知しない。

## 修正内容

従来の `client.url.includes(url)` は公演IDの前方一致で別公演のタブをフォーカスし得たため、完全一致に変更。
通知URLはURL APIで正規化し、同一originのhttp(s)だけを許可する。既存のアプリ通知は管理画面への同一origin URLを使用している。

## 同じ通知URLの再クリック

ページ側は、管理者・同一origin・現在URLとの完全一致・有効な追加情報リンクを確認して再開要求へ変換する。
- 公演タブで閉じたモーダルは、明示的な通知メッセージにより再び開く。
- 追加情報/通常公演/セトリの編集が開いている場合は再開要求を消費し、入力を置き換えない。閉じた直後にも通知を残して再開しない。
- 一覧のキャッシュ再取得だけではモーダルを再開しない。
- 同じ未確認一覧通知はレビュー条件をUNCONFIRMEDへ戻す。
- URLが残っていても、別の管理タブを通知で切り替えてアンマウントしない。その場合は既存タブのフォーカスだけとなる。

Service Worker送信側は既存の12テスト、受信側は3件のユニットテストを追加。PC/モバイルの実ブラウザではメッセージを模擬投入し、再開・未保存保持・閉じた後の再開防止・一覧条件再選択を確認した。
新旧Worker/ページの混在ではこの契約が利用できないことがあるため、実配信と更新の結合確認は引き続き必要。

## 実Worker transportの追加確認

Node VM/DOM模擬messageとは別に、所有Viteへ登録したWorkerからの実WindowClient.postMessage、ネイティブ通知API/保存/終了、ページの再開/未保存保持をPC/モバイルで確認した（[19項目の検証](./live_metadata_native_worker_verification.md)）。
配送とOSクリックeventは合成なので、下記の残件を完了扱いにしない。

## 未検証/残件

- 実Pushサービス、購読/VAPID、ブラウザ権限、OS通知からのクリック。
- 実ブラウザのWindowClient.focus/openWindowとユーザー操作制限。
- 実認証期限切れからログイン後の対象URL復帰（合成APIでは [認証復帰を検証済み](./live_metadata_auth_verification.md)）。
- 実Push/OSクリックから同一URLのタブへメッセージが届くこと（実Worker→ページ経路はローカルの合成clickで検証済み）。
- 実端末/複数タブ/Service Worker更新・旧キャッシュを含む結合確認。

これらを確認するまでは「実Web Push検証完了」と扱わない。本番/Stagingへ通知を送信したり接続したりしていない。
