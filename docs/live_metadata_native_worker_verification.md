# ローカル実Service Worker経路の検証

## 実行

```bash
npx playwright install chromium
PG_BIN='C:/Program Files/PostgreSQL/18/bin' npm run test:metadata-db --prefix server -- --worker
```

`--worker` は既存の実認証/API/所有DB/ブラウザ試験を含む。PostgreSQL 18.0（Windows）＋フルChromiumのPC/Pixel 5相当で**19チェックポイント成功**（実APIブラウザ15項目＋Workerの2構成＋更新の2構成）。

Windowsのheadless_shellでは `navigator.permissions` がgrantedでも `Notification.permission` がdeniedになったため、Workerモードだけ `channel: chromium` の新headlessを使う。拒否時に通知APIをモックへ差し替えたり、成功としてスキップしたりしない。

## 何が実物で、何が合成か

実物：
- ローカルのService Worker登録/activation。
- 配布する `public/sw-push.js` のpush/notificationclickハンドラ。
- ブラウザのnotification権限、showNotification/getNotifications/Notification.close。
- clients.matchAll、WindowClient.postMessage、ServiceWorkerContainerの実messageイベント。
- ページのAdminPage/編集モーダル、実JWT認証/API/使い捨てDB。

合成：
- Push配送の代わりに、テスト用MessageChannelからpayloadを渡す。
- OS通知を人間がクリックする代わりに、専用wrapperが元のnotificationclickハンドラへ合成eventを渡す。
- notification権限は自動化のgrantPermissionsで付与する。ユーザーの許可ダイアログ操作ではない。

**Web Push配送や実OSクリックの成功を証明するものではない。** VAPID/PushManager.subscribe/Pushサービスを呼ばない。

## 各構成での確認

1. 検証用originへ通知権限を付与し、Notification.permission=grantedを確認。
2. 既存Workerがない新規contextで、専用Workerをscope=/adminへ登録。
3. 専用Workerは /sw-push.js をimportし、元ハンドラを実行する。
4. 合成payloadから実通知を作成し、タイトル/対象URLがgetNotificationsで保持される。
5. close actionで通知は終了し、ページのモーダルを再開しない。
6. open actionの元ハンドラが実WindowClient.postMessageを送り、閉じたレビューが再開する。
7. 再通知で未保存メモを保持し、破棄して閉じた後の一覧更新でも再開要求が残らない。
8. 通知が残っていないことを確認し、登録を解除。context/ブラウザ/所有サーバー/DBを閉じる。

合成clickはWorkerへユーザー操作権限を与えないため、WindowClient.focusがInvalidAccessErrorとなることは許容する。focusの成功/拒否を実OSクリックの結果として扱わない。
openWindowの新規タブ/実OSの前面化は未検証。

## 旧→新protocolと実Worker更新

各構成で追加確認：
1. ページ再読込でcontrolled clientを作り、合成旧protocol（version=1）へ切り替える。
2. 旧protocolは同URLをfocusするだけで再開メッセージを送らず、閉じたレビューは再開しない。
3. 保存済みメモを読み直し、未保存メモを入力。
4. 新版（version=2）を同じscopeへregisterし、実際のwaiting状態を待つ。
5. waiting中のcontrollerは旧版のまま、入力も維持される。
6. テスト用activationコマンドでskipWaitingし、実controller切替を確認。ページを強制reloadせず入力を維持。
7. 新版からの再通知でも入力を置換せず、破棄して閉じた後の明示的な通知では保存済みレビューを再開。

旧protocolはwrapper内の合成モデルで、過去の本番SWソースではない。旧版でもpush側は現在の配布ハンドラを使用する。
更新ではwrapperのscript URLのversion queryを変える。実waiting/controllerchangeを検証したが、生成Workboxのprecache/同一URLのbyte変更/HTTPキャッシュ/旧JS bundleの検証ではない。
専用activationコマンドはテスト用だけ。アプリの本番自動更新/reloadポリシーが未保存入力を守ることまで証明しない。

## 隔離

専用URL `/__fixture-notification-worker.js` は `--worker` が起動する所有Viteにだけ追加する。通常のVite、配布するpublicファイル、実環境にはwrapperを追加しない。
no-storeで配信し、元SWを改変せずimportする。制御messageはwaitUntilで寿命を保持する。

通常の `--browser` はService Workerをblockしたまま。このモードだけallowし、既存登録を拒否して所有Workerを明示的に登録する。
Workerにはfetch handlerを追加しない。import/通知iconはローカルの既知のコード/URLだけ。ページcontextの外部HTTP拒否に頼って、未知のWorker通信まで遮断済みと扱わない。
通知のtitle/bodyは無害な固定fixture。JWT、管理メモ、パスワード、鍵を通知へ入れない。trace/ストレージの成果物保存もしない。

通常/エラー時は所有リソースを閉じる。強制終了時の後片付け保証はない。実環境へ接続せず、メール/外部ジョブ/Push送信は無効化したまま。

## 生成Workboxの追加確認

別の `--built-worker` モードで、実本番buildをtempへ2版生成し、旧JSを残したままの自動Worker更新/入力保持/明示reload/管理API非キャッシュも確認済み（[16項目](./live_metadata_built_worker_verification.md)）。過去の本番JSや実配備のHTTPキャッシュ条件ではない。

## 残件

- 本物のVAPID/購読/Push配送、許可ダイアログ、OS通知の実クリック。
- 新規タブ・複数タブ・生成Workbox/旧キャッシュ/旧JS bundleの更新組み合わせ（専用Workerのwaiting/controller切替は検証済み）。
- 実端末/Safari/Firefox、実環境の配備/通信制約。

これらを確認するまでは「実Web Push結合検証完了」と扱わない。本番/Stagingへの接続・配信・デプロイは行っていない。
