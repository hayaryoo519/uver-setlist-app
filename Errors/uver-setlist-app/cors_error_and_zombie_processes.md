# 本番環境におけるCORSエラーおよびsystemdサービスの重複稼働（ゾンビプロセス）

## 症状
- 本番環境（`https://uver-setlist-archive.org/dashboard`）にて、ダッシュボード等のデータが表示されず、APIからデータを取得できない状態になった。
- ブラウザの開発者ツールでAPI呼び出し（`/api/stats` や `/api/lives`）を確認すると、CORSエラー（CORS policy violation / 500 Internal Server Error）が返されていた。

## 原因
1. **CORS設定の不足**:
   本番環境の環境変数ファイル (`server/.env`) において、`ALLOWED_ORIGINS=https://uver-setlist-archive.org` と www なしのドメインのみが許可されていた。そのため、ブラウザで `https://www.uver-setlist-archive.org` (wwwあり) からアクセスした際に CORS policy violation が発生した。
2. **systemdサービスの重複（ゾンビプロセス）**:
   本番サーバー上で `uver-setlist.service` と `uver-app-prod.service` の2つの Node.js アプリサービスが同時に自動起動（enabled）で稼働していた。ポート 8000 のバインドに成功した片方のサービスのみが API リクエストを処理できていたが、もう片方もバックグラウンド処理（ライブ監視など）を行い続けており、プロセスの競合やリソースの無駄が発生していた。

## 解決手順
1. **本番の `.env` 修正**:
   `/home/haya-ryoo/apps/uver-setlist-app/server/.env` の `ALLOWED_ORIGINS` を編集し、wwwあり/なしの両オリジンを許可するように設定した。
   ```text
   ALLOWED_ORIGINS=https://uver-setlist-archive.org,https://www.uver-setlist-archive.org
   ```
2. **重複サービスの停止と無効化**:
   不要な `uver-setlist.service` を停止し、OS起動時の自動起動を無効にした。
   ```bash
   sudo systemctl stop uver-setlist
   sudo systemctl disable uver-setlist
   ```
3. **ポート 8000 を専有するプロセスのクリアと本番サービスの再起動**:
   ポートを専有していた古いプロセスを kill し、正しいサービスを再起動した。
   ```bash
   sudo fuser -k 8000/tcp
   sudo systemctl restart uver-app-prod
   ```

## 再発防止
- 環境変数の `ALLOWED_ORIGINS` を変更する際は、wwwあり/なしのサブドメインを確実にカンマ区切りで両方指定する。
- リリース時やデプロイ手順書を整備し、不要な systemd サービス（`uver-setlist.service`）が有効化されないようサービス一覧の監視・クリーンアップを行う。
- 再起動やデプロイ後は、`sudo systemctl status uver-app-prod` で正しい PID のみがポート 8000 を使用して起動していることを確認する。
