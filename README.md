# UVERworld Setlist App (MVP)

UVERworldのライブセットリストを記録・閲覧するための非公式Webアプリケーション（MVP）です。
「過去のライブのセットリストを振り返りたい」「あの時の曲順を知りたい」というファンの声に応えるために作成されました。

> [!WARNING]
> **3つの環境について**
> 
> このプロジェクトには独立した3つの環境があります：
> - **ローカル開発** (Windows PC): Docker Supabaseを使用
> - **検証 (Staging)** (192.168.0.13:9000): Docker PostgreSQLを使用  
> - **本番 (Production)** (192.168.0.13:8000): 本番PostgreSQLを使用
> 
> **本番データベースは絶対に直接操作しないでください！**  
> 開発・テストは必ずローカル環境または検証環境で行ってください。  
> 詳細は [ENVIRONMENT_GUIDE.md](ENVIRONMENT_GUIDE.md) を参照してください。

## 機能
*   **ライブ一覧**: 過去のライブを日付順に表示。
*   **フィルタリング**: 開催年やキーワード（会場名・ツアー名）で絞り込みが可能。
*   **セットリスト詳細**: 各ライブのセットリスト（曲順、アンコール情報）を閲覧可能。

## 技術スタック
*   React (Vite)
*   React Router
*   Vanilla CSS (CSS Modules/Variables)

## セットアップ

> [!IMPORTANT]
> **環境を理解してから作業を開始してください**  
> セットアップする前に、必ず [ENVIRONMENT_GUIDE.md](ENVIRONMENT_GUIDE.md) を読んで3つの環境の違いを理解してください。

### ローカル開発環境のセットアップ
1.  リポジトリをクローン
2.  依存関係をインストール: `npm install`
3.  Docker Supabaseが起動していることを確認: `docker ps | findstr supabase`
4.  開発サーバーを起動: `npm run dev`

### 環境ごとの詳細セットアップ
各環境のセットアップ手順、データベース設定、使い分けについては [ENVIRONMENT_GUIDE.md](ENVIRONMENT_GUIDE.md) を参照してください。

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
セキュリティログの詳細な調査方法については、[SECURITY_LOG_GUIDE.md](docs/SECURITY_LOG_GUIDE.md) を参照してください。

### 管理画面からのアクセス
管理者は以下のURLから直接アクセスできます：
```
http://localhost:5173/admin/security-logs
```

## 将来の展望 (Roadmap)
*   **楽曲コレクション**: 参加したライブを記録し、聴いた曲の回収率を表示。
*   **未聴曲リスト**: まだ聴いていない曲の可視化。
*   **Android対応**: PWA化によるモバイル体験の向上。
*   **ゲーミフィケーション (称号/バッジ)**: 参戦実績に応じたバッジ機能。
    *   参戦回数によるランクアップ（New Crew → Core Crew）
    *   都道府県制覇などの実績解除（Japan Explorer）
    *   特定楽曲の視聴（Lucky Survivor）

