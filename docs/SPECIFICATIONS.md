# UVERworld Setlist Archive 仕様一覧

> [!NOTE]
> **仕様書の管理方針**
> - **Notion**: 高レベルな仕様、設計思想、プロジェクト全体のロードマップを管理（オーナー・ユーザー向け）。
> - **Git (`docs/`)**: 技術的な詳細仕様、最新の実装状況、開発者向けのドキュメントを管理。
> - 連携: 大規模な機能追加や仕様変更の際は、AIがGitとNotionの両方を同期させます。
>
> **関連リンク**
> - [Notion 仕様書 (Specifications)](https://www.notion.so/Specifications-3050e21e344d812da7a5f9f57bd46747)

## 1. 基本仕様 [🔗 Notion](https://www.notion.so/3050e21e344d81c9ac02d0434568b8e5)
- **目的**: UVERworldのライブセットリストの記録・閲覧・分析。
- **対象データ**: 過去のライブ履歴、ディスコグラフィ（アルバム・シングル・楽曲）。
- **ユーザー状態**:
  - **ゲスト**: 閲覧のみ。
  - **ログインユーザー**: 参戦記録（My Page）、セトリ予想の作成・いいねが可能。

## 2. セトリ予想機能 (Setlist Prediction) [🔗 Notion](https://www.notion.so/3340e21e344d81028611dbcf83f94139)
- **概要**: 今後開催されるライブのセットリストをユーザーが予想し、共有する機能。
- **ソフトウェア設計**:
  - **フロントエンド**: `dnd-kit` による宣言的な並び替え管理。楽曲検索はクライアントサイドでのサジェスト機能を搭載。
  - **バックエンド**: 予想作成時はトランザクション（Atomic）処理を行い、予想レコードと構成楽曲の整合性を保証。
- **データベース構成**:
  - `predictions`: 予想の基本情報（ユーザー、対象ライブ、タイトル等）を格納。
  - `prediction_songs`: 各予想に含まれる楽曲と演奏順 (`order_index`) を紐付け。
  - `prediction_likes`: ユーザーからの「いいね」を管理（ユニーク制約による重複防止）。
- **機能一覧**:
  - **予想ポータル**: 受付中のライブ一覧と、自分の予想履歴を確認できる。
  - **予想作成**: 
    - ドラッグ＆ドロップによる直感的な曲順操作。
    - 全楽曲リストから選択可能。
  - **ランキング/共有**:
    - 各ライブごとの「みんなの予想」を人気順（いいね数）・新着順で閲覧。
    - 各予想詳細ページから X (Twitter) へのシェア機能。
  - **インタラクション**:
    - 他のユーザーの予想に対する「いいね！」機能。
- **UI/UXルール**:
  - ボタン等のアクション要素には「セトリ予想」と表記。
  - タイトルや説明文などの詳細要素には「セットリスト予想」と表記。
  - ダッシュボードの次回ライブには「セトリ予想受付中 🔥」バッジを表示し、導線を強化。

## 3. 技術仕様
- **システム構成**: [🔗 Notion](https://www.notion.so/3050e21e344d811f9bb8feb1d3e4516e)
- **フロントエンド**: React + TypeScript (Vite), TanStack Query (サーバー状態管理), lucide-react (アイコン), dnd-kit (ドラッグ&ドロップ) [🔗 Notion](https://www.notion.so/3050e21e344d81859805e945566af6c4)
  - 型チェック: `allowJs: true` / `checkJs: false`（JSファイルはチェック対象外、TSXは厳格チェック）
  - 主要な型定義: `src/types/api.ts`（Live, Song, Prediction, User 等）
- **データベース運用**: バックアップ、環境間同期、匿名化の方針 [🔗 db_operations.md](./db_operations.md)
- **バックエンド**: Node.js (Express) [🔗 Notion](https://www.notion.so/3050e21e344d81139d79c8423744f68d)
- **データベース**: PostgreSQL [🔗 Notion](https://www.notion.so/3050e21e344d81b5a68ce71f92075312)
- **認証**: JWT (`src/contexts/AuthContext.tsx` による管理)
- **ルーティング**:
  - `/predictions`: 予想ポータル / ランキング
  - `/predictions/new`: 予想作成画面
  - `/predictions/:id`: 予想詳細画面
