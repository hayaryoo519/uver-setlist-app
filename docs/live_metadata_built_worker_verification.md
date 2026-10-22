# 実Workbox生成物の更新検証

```bash
PG_BIN='C:/Program Files/PostgreSQL/18/bin' npm run test:metadata-db --prefix server -- --built-worker
```

PostgreSQL 18.0（Windows）＋フルChromiumで**16項目成功**：既存実認証/API/SQL 13項目、本番生成物2版のbuild 1項目、PC/Pixel 5相当の更新2項目。

## 対象

所有tempディレクトリへ実vite.config.jsで本番ビルドを2回生成。実生成sw.js/registerSW.js/Workbox/precache/JS・CSSを所有Expressで配信する。
プロジェクトのdist/publicを上書きせず、.env・既存DB・既存サーバー・本番バックアップを使わない。

2版のJSにはテスト用識別markerだけを追加する。両版とも現在のアプリコードであり、過去の本番JSの再現ではない。
コピーするpublic資産はicons/offline.html/vite.svgだけ。sw-pushは元ソースをテスト用制御に埋め込み、旧protocol/新版protocolをモデル化する。
通知配送/クリックは合成、通知API/WindowClient/Workerと生成Workboxは実物。

## 確認した流れ

- 旧生成Workerに制御された旧markerのJSで実ログイン/追加情報保存。
- 旧protocolのfocusだけでは閉じたレビューが再開しない。
- 未保存入力を残して配信先を新版buildへ切替え、registration.updateを実行。
- registerType:autoUpdateの生成Workerが自動切替。旧JSはメモリ上に残り、ページを強制reloadしないため入力を保持。
- 新Workerの再通知も入力を置換しない。破棄して閉じた後の通知は保存済みレビューを再開。
- 明示的なページ再読込で新版markerのJSを取得し、保存済みメモを表示。
- この経路でアクセスした管理用API（metadata/review/auth等）のURLがCacheStorageにない。

現設定は単純なregisterSW.jsを生成し、frontendにはcontrollerchangeでの自動reload処理がない。今後登録方式を変える場合はこの入力保持試験も更新する。

## 隔離/限界

所有data_directoryと同一プロセスのExpress/loopback bindを検証してからbuild/配信する。cwd/NODE_ENV/VITE_API_URLは終了時復元する。
ブラウザの外部HTTP拒否に加え、SW fetchがcontext.routeを迂回し得るため、既知の外部font等はChromiumのDNS resolver制限で解決させない。任意IPへの完全なネットワーク防壁を実装したものではなく、fixtureには外部IP URLを入れない。
補助のsongs/users/corrections/attendance APIは空fixtureのまま。外部ジョブ/メール/Push送信は起動しない。

SW/import/register/indexにはno-cacheで配信する。この配信条件でのupdate/precache確認であり、実環境のCDN/HTTPキャッシュヘッダーや旧bundle互換性は未検証。
プライベートAPIの非キャッシュ確認も、このアクセス経路の確認であり全エンドポイントの監査完了ではない。

残件：本物の購読/配送/OSクリック、複数タブ、過去の本番JS、実配備のキャッシュ/PG/schema差分、実端末・他ブラウザ。
本番/Stagingへの接続・適用・配信・デプロイは行っていない。
