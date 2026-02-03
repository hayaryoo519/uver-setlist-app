# UVERworld Setlist App (MVP)

UVERworldのライブセットリストを記録・閲覧するための非公式Webアプリケーション（MVP）です。
「過去のライブのセットリストを振り返りたい」「あの時の曲順を知りたい」というファンの声に応えるために作成されました。

> [!WARNING]
> **3つの環境について**
> 
> このプロジェクトには独立した3つの環境があります：
> - **ローカル開発** (Windows PC): Docker Supabaseを使用
> - **検証 (Staging)**: Docker PostgreSQLを使用
> - **本番 (Production)**: 本番PostgreSQLを使用
> 
> **本番データベースは絶対に直接操作しないでください！**  
> 開発・テストは必ずローカル環境または検証環境で行ってください。  
> 詳細は [DEVELOPMENT.md](DEVELOPMENT.md) を参照してください。

## 機能
*   **ライブ一覧**: 過去のライブを日付順に表示。
*   **フィルタリング**: 開催年やキーワード（会場名・ツアー名）で絞り込みが可能。
*   **セットリスト詳細**: 各ライブのセットリスト（曲順、アンコール情報）を閲覧可能。
*   **My Page**: 参戦したライブの記録、聴いた楽曲の統計データの可視化。
*   **修正リクエスト**: ライブ情報やセットリストの誤りをユーザーが報告できる機能。
*   **管理者ダッシュボード**: 修正リクエストの承認・却下、セキュリティログの監視。

## 技術スタック
*   Frontend: React (Vite), React Router
*   Backend: Node.js (Express)
*   Database: PostgreSQL (Supabase/Docker)
*   Styling: Vanilla CSS (CSS Modules/Variables), TailwindCSS (部分的に導入)

## セットアップ

> [!IMPORTANT]
> **ドキュメント体系について**
> 
> - 💻 **開発者の方へ**: 環境構築やGitワークフローについては **[DEVELOPMENT.md](DEVELOPMENT.md)** を参照してください。
> - 🏗 **運用・インフラ管理者へ**: サーバー構成、デプロイ、セキュリティについては **[OPERATIONS.md](OPERATIONS.md)** を参照してください。

### ローカル開発環境のクイックスタート
1.  リポジトリをクローン
2.  `npm install`
3.  Dockerが起動していることを確認 (`docker ps`)
4.  `npm run dev`

## セキュリティログ

アプリケーションには最小限のセキュリティログシステムが実装されています。

### ログの確認方法

> **実行場所:** プロジェクトルート（`uver-setlist-app/`）

**簡易チェック（最新10件）:**
```bash
node server/check_logs.js
```

**詳細分析:**
```bash
node server/analyze_security.js
```

### 記録されるイベント
- **ログイン失敗**: 不正アクセス試行の検知
- **システムエラー**: 予期しないエラーの追跡

### 詳細ガイド
セキュリティログの詳細な調査方法については、**[OPERATIONS.md](OPERATIONS.md)** のセキュリティ運用セクションを参照してください。



## CI/CD
- Pull Request: CI only (GitHub-hosted runner)
- Deploy: self-hosted runner (push to dev / version tag only)

## 将来の展望 (Roadmap)
*   **マイページの充実・フォロー機能**: 他のCrew（ファン）をフォローし、参戦履歴やコレクションを共有。
*   **セットリストAI予想**: 過去のデータに基づき、次回のライブのセットリストをAIが予想。
*   **Crewのセットリスト予想**: ユーザー自身がセットリストを予想し、結果合わせを楽しめる機能。
*   **X (Twitter) 連携**: 参戦記録や予想結果をスムーズにSNSへシェア。
*   **楽曲コレクション**: 参加したライブを記録し、聴いた曲の回収率を表示。
*   **未聴曲リスト**: まだ聴いていない曲の可視化。

