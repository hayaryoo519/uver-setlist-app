# UVERworld Setlist Archive

UVERworld のライブセットリストを記録・閲覧・分析するための非公式 Web アプリケーションです。

🔗 **https://uver-setlist-archive.org**

---

## 機能

### 閲覧（ゲスト利用可）
- **ライブ一覧**: 過去のライブを年・ツアー・キーワードで絞り込み
- **セットリスト詳細**: 各ライブの曲順・アンコール情報を閲覧
- **楽曲一覧**: 演奏頻度・アルバム別の統計
- **ダッシュボード**: ライブ数・演奏楽曲ランキング・年別統計・ツアー別統計

### ログイン後
- **マイページ**: 自分の参戦記録と聴いた楽曲の統計
- **セトリ予想**: 次回ライブのセットリストを予想して共有・いいね
- **フォロー**: 他ユーザーをフォローしてフィードで予想を閲覧
- **修正申請**: セットリストの誤りを報告

### その他
- PWA 対応（ホーム画面への追加・プッシュ通知）
- Spotify / YouTube Music 連携（プレイリスト作成）

---

## 技術スタック

| 層 | 技術 |
|---|---|
| フロントエンド | React 19 + Vite + TanStack React Query |
| バックエンド | Node.js / Express 5 |
| データベース | PostgreSQL |
| 認証 | JWT + bcrypt |
| インフラ | Cloudflare + systemd (本番) / Docker Compose (検証) |

---

## 開発への参加

詳細は [`docs/development_workflow.md`](./docs/development_workflow.md) を参照してください。

```powershell
# フロントエンド
npm run dev

# バックエンド（別ターミナルで）
cd server && npm run dev
```

---

## ライセンス

非公式ファンサイトです。UVERworld および所属レーベルとは無関係です。
