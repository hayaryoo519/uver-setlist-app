---
description: 開発環境を起動する（サーバー + Vite + ブラウザ）
---
# 開発環境起動

// turbo-all

1. バックエンドサーバーを起動する
```
node server/index.js
```
※ バックグラウンドで実行すること（WaitMsBeforeAsync: 2000）

2. Vite開発サーバーを起動する
```
npx vite --host
```
※ バックグラウンドで実行すること（WaitMsBeforeAsync: 2000）

3. 数秒待ってからブラウザで `http://localhost:5173` を開く

4. サーバーとViteの起動ログを確認し、エラーがないことを確認する

5. 起動完了をユーザーに報告する
