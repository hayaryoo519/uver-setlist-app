# Cloudflare Tunnel ルーティング設定ミスによる 502 エラー

発生日: 2026-06-25

## 症状

- `uver-setlist-archive.org`（ルートドメイン）にアクセスすると 502 エラーになる
- `www.uver-setlist-archive.org` は正常に表示される

## 原因

DNS レコードの構成が以下になっていた。

| ドメイン | 向き先 |
|---|---|
| `www.uver-setlist-archive.org` | A レコード → サーバー直接（120.138.185.32） |
| `uver-setlist-archive.org` | Cloudflare Tunnel（toeic-bot）経由 |

Cloudflare ダッシュボードの「公開アプリケーションルート」に **古い設定が残っていた**ことが根本原因。

具体的には以下の2つのエントリが競合していた：

| # | ホスト名 | パス | サービス | 問題 |
|---|---|---|---|---|
| 1 | `uver-setlist-archive.org` | `api` | `localhost:8000` | `/api/*` しかマッチしない |
| 5 | `uver-setlist-archive.org` | `*` | `localhost:5000` | 全パスにマッチするが**5000番は未起動** |

ルートへのアクセスは `/api` にマッチせず、エントリ5（localhost:5000）に転送される。
ポート5000で何も動いていないため、Cloudflare が 502 を返していた。

なお、ローカルの `/etc/cloudflared/config.yml` を編集しても、ダッシュボードのリモート設定とマージされるため、**ダッシュボード側の古い設定が残り続ける**。

## 解決手順

1. Cloudflare Zero Trust ダッシュボード（one.dash.cloudflare.com）を開く
2. **ネットワーク → コネクタ → toeic-bot → 公開アプリケーションルート**
3. エントリ5（`uver-setlist-archive.org` → `localhost:5000`）を**削除**
4. エントリ1（`uver-setlist-archive.org` / パス: `api`）を**編集**し、パスを `.*`（空欄でも可）に変更して全パスを `localhost:8000` へ転送

## 補足

- `config.yml` のパスに `*` を入力すると `Bad Configuration: Validation failed` エラーになる。正規表現なので `.*` を使う（または空欄）。
- cloudflared はローカルの `config.yml` とダッシュボードのリモート設定を**マージ**して動く。どちらか一方を変えるだけでは解決しない場合があるので両方確認する。
- ポート5000は本プロジェクトでは使用していない。誰かが以前設定した古いエントリが残っていた。
