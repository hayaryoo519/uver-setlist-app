# 通知リンクの認証後復帰

最新dev統合後は現在のDB role/session_version/deleted_atを照合する認可も維持し、実認証14/Worker＋本番生成物23項目成功（[統合記録](./live_metadata_dev_integration.md)）。以下の旧13項目等は統合前の履歴。

## 修正した経路

未ログインまたはページ読み込み時にJWT期限切れを検出した場合、`ProtectedRoute` はRouter stateに遷移元locationを渡してログイン画面へ進む。これは既存の挙動。
一方、保護APIの401等を検出するAuthContextのfetch interceptorは、従来 `/login` へ強制遷移して遷移元を失っていた。

現在は以下の経路で復帰する：
- Router経由：`location.state.from` のpathname/search/hashを使用。
- API経由：`/login?returnTo=<URLエンコードされた復帰先>` へ移動。ログイン画面はstateがなければqueryを使用。
- ログイン失敗時は復帰先を保持したまま再試行できる。`/api/auth/` の認証失敗はセッション期限切れ処理の対象外。
- ログイン成功後はreplaceで復帰し、戻る操作で不要なログイン画面へ戻らない。
- 一般ユーザーが管理ページへ復帰しようとしても、既存のrequireAdminガードが拒否する。

単件URLのmetadata ID、未確認一覧のreview条件、hashを保持する。復帰先の処理自体は権限や認証を付与しない。

## 安全な復帰先

`src/utils/authReturnTo.ts` をLogin/Signup/強制ログイン遷移で共用する。
- 単一スラッシュから始まる同一アプリ内のURLだけを許可。
- 絶対外部URL、protocol-relative URL、バックスラッシュ、制御文字、不正なlocationオブジェクトを拒否。
- URL正規化/パスのデコード後にも検証し、encoded先頭スラッシュ等を拒否。
- login/signup/検証・パスワード再設定ページ/APIへの復帰は拒否し、認証ループや認証用token URLのコピーを避ける。
- 不正または欠落なら `/mypage`。
- Router stateの任意オブジェクトは復帰先へコピーしない。

復帰先はアドレスバー/アクセスログに出るので、秘密情報をURLに置かない。自由記述の管理メモを復帰先に入れるものではない。

## 検証

合成APIのChromium PC/Pixel 5相当で、既存suiteに3シナリオを追加：
1. 未ログイン→単件通知→ログイン失敗→再試行→対象の追加情報モーダル。
2. 読み込み時に期限切れJWT→未確認一覧通知→失敗/再試行→UNCONFIRMED条件。
3. 公演追加情報の再取得が401→ログインURLのreturnTo保持→再ログイン→対象モーダル。

全9シナリオ×2構成、18ケース成功。fixtureの初期セッション設定は一度だけ行い、強制遷移時に消去したセッションを再注入しない。
APIの401は安定して表示されたモーダルの明示的な再取得で発生させる。開発StrictModeの初回中止要求でone-shot応答を消費させない。

ユニット検証：復帰先のvalidation、Login成功後のRouter state/query復帰と外部URL拒否、未ログイン/一般ユーザーの管理ガード。

```bash
npm test -- --run
npm run test:e2e:metadata
```

## 残件

このブラウザ試験のログインAPI応答/JWTは合成fixture。別途 [使い捨てDBの--real-auth試験](./live_metadata_db_verification.md) で、実bcrypt/JWT/認可/limiter＋Express API＋SQLを13項目検証した。
追加の `--browser` モードでは、対象の実認証/API/SQLへPC/モバイルを接続した [結合試験](./live_metadata_integrated_browser_verification.md) も完了。
補助API/外部機能を含む全アプリ結合、購読/VAPID・OS通知・Service Workerからのクリックを接続した結合検証ではない。
実環境の認証期限切れ/複数タブ/Worker更新を含む確認は引き続き必要。本番/Stagingへの接続・実Push配信は行っていない。
