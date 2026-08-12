# Next.js成果物欠損で本番loginが500になる

## 症状

- `https://kakeibo.haya-ryooo.net/` は `/login` へ `307` リダイレクトする。
- リダイレクト先の `/login` が `500` を返す。
- `pm2 list` では `kakeibo` プロセスは `online`。
- プロセス停止ではなく、Next.js の実行時エラーでページ描画に失敗している状態。

確認コマンド:

```bash
curl -sS -I https://kakeibo.haya-ryooo.net/
curl -sS -L -o /tmp/kakeibo_home_response -w '%{http_code} %{url_effective} %{time_total}\n' https://kakeibo.haya-ryooo.net/
pm2 list
pm2 logs kakeibo --lines 120 --nostream
```

## 原因

本番ディレクトリの `.next` 内で Next.js の server chunk が欠損し、ビルド成果物が不整合になっていた。

実際の pm2 error log では次のエラーが出ていた。

```text
Cannot find module './5611.js'
Require stack:
- /home/haya-ryoo/apps/kakeibo/.next/server/webpack-runtime.js
- /home/haya-ryoo/apps/kakeibo/.next/server/pages/_document.js
- /home/haya-ryoo/apps/kakeibo/node_modules/next/dist/server/require.js
- /home/haya-ryoo/apps/kakeibo/node_modules/next/dist/server/next-server.js
- /home/haya-ryoo/apps/kakeibo/node_modules/next/dist/server/next.js
- /home/haya-ryoo/apps/kakeibo/node_modules/next/dist/server/lib/start-server.js
- /home/haya-ryoo/apps/kakeibo/node_modules/next/dist/cli/next-start.js
```

`next start` 自体は起動できるため pm2 上は `online` になるが、該当ページを描画するタイミングで欠損 chunk を require して `500` になる。

## 解決手順

`.next` を削除せず、調査用にタイムスタンプ付きで退避してから clean build する。

```bash
cd /home/haya-ryoo/apps/kakeibo

if [ -d .next ]; then
  mv .next ".next.bak.$(date +%Y%m%d%H%M%S)"
fi

npm run build
pm2 restart kakeibo --update-env
```

復旧確認:

```bash
curl -sS -L -o /tmp/kakeibo_home_response -w '%{http_code} %{url_effective} %{time_total}\n' https://kakeibo.haya-ryooo.net/
curl -sS -o /tmp/kakeibo_login_response -w '%{http_code} %{time_total}\n' https://kakeibo.haya-ryooo.net/login
```

期待値:

```text
200 https://kakeibo.haya-ryooo.net/login ...
200 ...
```

## 再発防止

Release workflow の `npm run build` 前に既存 `.next` を `.next.bak.YYYYMMDDHHMMSS` へ退避する。

対象:

```text
.github/workflows/release.yml
```

追加する処理:

```bash
if [ -d .next ]; then
  mv .next ".next.bak.$(date +%Y%m%d%H%M%S)"
fi
```

この対応は PR #332 で実施済み。

- PR: https://github.com/hayaryoo519/kakeibo/pull/332
- Merge commit: `83f59726c06fbbcdd39d8d5548a6640c039f3fcf`

## 関連

- 発生日: 2026-07-03
- 復旧時リリース: `v0.10.5`
- 運用ドキュメント: `Docs/operations/cicd.md`
