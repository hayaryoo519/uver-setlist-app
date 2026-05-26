
--- 

### [Page] 1. プロジェクト概要 (Overview) (ID: 3050e21e-344d-81c9-ac02-d0434568b8e5)

  # UVERworld Setlist Archive 概要

  UVERworldのライブセットリストを記録・閲覧するための非公式Webアプリケーションです。ファンが過去のライブを振り返り、統計情報を確認できるようにすることを目的に開発されています。

  ## 主な機能

  * ライブ一覧・詳細表示: 過去のライブセットリストを閲覧可能
  * 統計・フィルタリング: 年別、曲別などの絞り込み機能
  * My Page: 自身の参戦記録と視聴統計の管理
  * 修正リクエスト: データの正確性を維持するための報告機能
  * プッシュ通知: 新しいライブ情報の追加を通知
  ## 技術スタック

| レイヤー | 技術・ツール |
| --- | --- |
| Frontend | React (Vite), Vanilla CSS |
| Backend | Node.js (Express) |
| Database | PostgreSQL (Supabase / Local Docker) |
| Infrastructure | Ubuntu, Nginx, Docker, GitHub Actions |

  ## プロジェクトの背景と目的

  UVERworldは結成以来膨大な数のライブを行っており、そのセットリスト情報はファンの間で非常に価値の高いものです。しかし、非公式な情報は散在しており、一つの場所で体系的に（かつ統計的に）閲覧できる場所が不足していました。

  本プロジェクトは、以下の3点を主な目的としています：

  * 1. セットリストへの容易なアクセス: 日付や会場、特定の楽曲名で過去のライブを即座に検索可能にする。
  * 2. 統計の可視化: どの楽曲がどの程度演奏されているか、自身の参戦履歴と照らし合わせて分析可能にする。
  * 3. データの保守性: Crew（ファン）自身が誤りを報告し、常に最新で正確なデータを維持できるエコシステムを構築する。
  ## 2025-2026 主要追加機能

  * セットリスト予測: 公演前に曲順を予想し、他のユーザーと共有、「いいね」を競うソーシャル機能。
  * 外部 API 自動同期: Spotify (楽曲メタデータ) および setlist.fm (ライブ履歴) とのシームレスなデータ連携。
  * OCR セットリスト登録: 画像（写真やスクショ）からセットリストを自動抽出する AI アシスト機能。
  * リアルタイム監査: 管理者によるセキュリティログ監視と IP ベースの不正アクセス防止機能。

--- 

### [Page] 2. システム構成 (Architecture) (ID: 3050e21e-344d-811f-9bb8-feb1d3e4516e)

  # システム構成 (Architecture)

  本システムは、React(Frontend)、Node.js/Express(Backend)、PostgreSQL(Database)からなるSPA構成です。インフラはオンプレミスのUbuntuサーバー上でDockerを使用して構築されています。

  ## 構成図案 (Mermaid) 概念図

  ```mermaid
graph TD
    User([User Browser]) --> Nginx[Nginx Reverse Proxy]
    Nginx --> Frontend[Vite + React SPA]
    Nginx --> API[Node.js + Express API]
    API --> DB[(PostgreSQL)]
    API --> PWA[PWA / Push API]
    API --> Spotify[Spotify API]
    API --> SetlistFM[setlist.fm API]

```

  ## 技術選定の理由 (Technology Rationale)

  ### Frontend: React (Vite) + Vanilla CSS

  高速な開発体験とランタイムパフォーマンスを両立するためViteを採用。デザインの自由度と軽量化を優先し、外部CSSフレームワークではなくVanilla CSSを選択しました。これにより、UVERworldのクールな世界観を独自に表現しています。

  ### Backend: Node.js (Express)

  I/O負荷の高いデータ検索やPWAプッシュ通知を効率的に裁くため、非同期処理に強いNode.jsを採用しました。また、Frontendと同じJavaScript言語を使用することで開発効率を最大化しています。

  ### Database: PostgreSQL

  「ライブ」「楽曲」「ユーザー」という複雑に絡み合うデータを整合性を持って管理するため、強力なリレーショナルデータベースであるPostgreSQLを採用しました。JSONBサポートにより、PWA設定などの柔軟なデータ構造にも対応しています。

  ## 画面遷移図 (Page Transitions)

  ```mermaid
stateDiagram-v2
    [*] --> LandingPage
    LandingPage --> Login: ログイン
    LandingPage --> Dashboard: ゲスト利用
    
    Login --> Signup: アカウント作成
    Login --> Dashboard: 認証成功
    
    Dashboard --> LiveList: ライブ一覧
    Dashboard --> Songs: 楽曲一覧
    Dashboard --> MyPage: ユーザーページ
    
    LiveList --> LiveDetail: 公演詳細
    LiveDetail --> LivePrediction: セットリスト予測投稿
    LiveDetail --> CorrectionForm: 修正依頼
    
    AdminPage --> SecurityLogsPage: セキュリティログ
    AdminPage --> BulkImportPage: 一括インポート
    AdminPage --> DraftListPage: 下書き管理
    AdminPage --> Dashboard: 管理終了

```

  ## 稼働環境・データベース仕様 (Environments)

  ローカル環境 (Local): http://localhost:8000 / DB: Supabase (Port: 54332, Name: uver_app_db)

  検証環境 (Staging): http://192.168.0.13:9001 / DB: PostgreSQL (Port: 54325, Name: uver_setlist_staging)

  本番環境 (Production): https://uver-setlist-archive.org / DB: PostgreSQL (Port: 5432, Name: uver_setlist_prod)


--- 

### [Page] 3. データベース設計 (Database Schema) (ID: 3050e21e-344d-81b5-a68c-e71f92075312)

  # データベース設計 (Database Schema)

  PostgreSQLを使用したリレーショナルデータベース構成です。主要なテーブルとその役割は以下の通りです。

  ## 主要テーブル定義

  ### 1. lives (ライブ情報)

  ライブの基本情報（ツアー名、タイトル、日付、会場等）を保持します。

  ### 2. songs (楽曲情報)

  楽曲の基本情報を保持します。タイトルやアルバム情報が含まれます。

  ### 3. setlists (セットリスト情報)

  livesとsongsの中間テーブルで、曲順(position)を管理します。

  ### 4. users (ユーザー情報)

  会員情報、認証情報、管理者権限等を保持します。

  ### 5. corrections (修正依頼情報)

  ユーザーから送信されたデータの修正・追加依頼を記録します。ステータス管理機能を含みます。

  ## 詳細テーブル定義集

  ### lives 表

| カラム名 | 型 | 説明 |
| --- | --- | --- |
| id | SERIAL (PK) | ユニークID |
| tour_name | VARCHAR(255) | ツアータイトル |
| title | VARCHAR(255) | 公演名（○○公演など） |
| date | DATE | 開催日 |
| venue | VARCHAR(255) | 会場名（正規化済み） |
| type | VARCHAR(50) | 種類（ONEMAN, FESTIVAL等） |
| special_note | TEXT | ライブに関する備考・特記事項 |
| is_draft | BOOLEAN | 下書きフラグ（trueで管理者のみ表示） |

  ### songs 表

| カラム名 | 型 | 説明 |
| --- | --- | --- |
| id | SERIAL (PK) | ユニークID |
| title | VARCHAR(255) | 楽曲タイトル（正規化済み） |
| album | VARCHAR(255) | 収録アルバム名 |
| release_year | INTEGER | リリース年 |
| mv_url | VARCHAR(255) | YouTube等のMV URL |
| author | VARCHAR(255) | 作詞・作曲者情報 |
| image_url | VARCHAR(255) | アルバム・楽曲のアートワークURL |
| spotify_id | VARCHAR(255) | Spotify楽曲識別ID |
| is_instrumental | BOOLEAN | 歌唱なし楽曲フラグ |

  ### users 表

| カラム名 | 型 | 説明 |
| --- | --- | --- |
| id | UUID / SERIAL (PK) | ユーザーID |
| username | VARCHAR(30) | ユーザー名 |
| email | VARCHAR(255) | メールアドレス（ユニーク） |
| password | TEXT | ハッシュ化済みパスワード |
| role | VARCHAR(20) | 権限（user, admin） |

  ### corrections 表

| カラム名 | 型 | 説明 |
| --- | --- | --- |
| id | SERIAL (PK) | 依頼ID |
| user_id | FK (users.id) | 申請者ID |
| status | VARCHAR(20) | ステータス（pending, resolved等） |

  ### setlists 表 (中間テーブル)

| カラム名 | 型 | 説明 |
| --- | --- | --- |
| live_id | FK (lives.id) | 対象公演ID |
| song_id | FK (songs.id) | 対象楽曲ID |
| position | INTEGER | 演奏順(1から開始) |

  ### attendance 表 (ユーザー履歴)

| カラム名 | 型 | 説明 |
| --- | --- | --- |
| user_id | FK (users.id) | ユーザーID |
| live_id | FK (lives.id) | 参戦した公演ID |
| created_at | TIMESTAMP | 記録日時 |

  ## ER図 (Entity-Relationship Diagram)

  ```mermaid
erDiagram
    users ||--o{ attendance : "参戦履歴"
    users ||--o{ corrections : "修正依頼"
    users ||--o{ push_subscriptions : "プッシュ通知購読"
    users ||--o{ predictions : "作成したセトリ予想"
    users ||--o{ prediction_likes : "いいねしたセトリ予想"
    
    lives ||--o{ setlists : "セットリスト構成"
    lives ||--o{ attendance : "参戦ユーザー"
    lives ||--o{ corrections : "対象公演"
    lives ||--o{ predictions : "対象公演の予想"
    
    songs ||--o{ setlists : "演奏実績"
    songs ||--o{ prediction_songs : "予想曲"
    
    predictions ||--o{ prediction_songs : "予想曲目リスト"
    predictions ||--o{ prediction_likes : "獲得したいいね"
    
    lives {
        int id PK "公演ID"
        string tour_name "ツアー名"
        string title "公演タイトル"
        date date "開催日"
        string venue "会場"
        string type "公演種別"
        text special_note "備考"
        boolean is_draft "下書きフラグ"
    }
    
    songs {
        int id PK "楽曲ID"
        string title "曲名"
        string album "収録アルバム"
        int release_year "リリース年"
        string mv_url "MV URL"
        string author "作詞作曲"
        string image_url "画像URL"
        string spotify_id "Spotify ID"
        boolean is_instrumental "インストフラグ"
    }

    users {
        int id PK "ユーザーID"
        string username "表示名"
        string email "メールアドレス"
        string password "パスワード(Hash)"
        string role "権限"
        boolean is_verified "認証済み"
        timestamp created_at "作成日"
    }
    
    predictions {
        int id PK "予想ID"
        int user_id FK "ユーザーID"
        int live_id FK "ライブID"
        string title "予想タイトル"
        timestamp created_at "作成日時"
    }
    
    prediction_songs {
        int id PK "予想曲ID"
        int prediction_id FK "予想ID"
        int song_id FK "楽曲ID"
        int order_index "演奏順"
    }
    
    prediction_likes {
        int id PK "いいねID"
        int prediction_id FK "予想ID"
        int user_id FK "ユーザーID"
        timestamp created_at "いいね日時"
    }

    setlists {
        int live_id PK,FK "公演ID"
        int song_id PK,FK "楽曲ID"
        int position "演奏順"
    }
    
    attendance {
        int id PK "履歴ID"
        int user_id FK "ユーザーID"
        int live_id FK "ライブID"
        timestamp created_at "登録日時"
    }

    corrections {
        int id PK "依頼ID"
        int user_id FK "依頼者ID"
        int live_id FK "対象公演ID"
        string status "ステータス"
        jsonb details "修正内容"
    }

```

  ### 6. predictions (セットリスト予測)

  ユーザーが作成した次回のセットリスト予測情報を保持します。

| カラム名 | 型 | 説明 |
| --- | --- | --- |
| id | SERIAL (PK) | 予測ID |
| user_id | UUID (FK) | 作成者ID |
| live_id | INTEGER (FK) | 対象公演ID |
| title | VARCHAR(255) | 予想タイトル |
| created_at | TIMESTAMP | 作成日時 |

  ### 7. security_logs (セキュリティ監視)

  不正アクセス試行や重要な操作の履歴を記録します。

| カラム名 | 型 | 説明 |
| --- | --- | --- |
| id | SERIAL (PK) | ログID |
| event_type | VARCHAR(50) | イベント種別（LOGIN_FAILURE等） |
| message | TEXT | ログメッセージ詳細 |

  ### 8. prediction_songs (予想曲目リスト)

  各予想に含まれる楽曲と、その予想順序(order_index)を保持する中間テーブルです。

| カラム名 | 型 | 説明 |
| --- | --- | --- |
| id | SERIAL (PK) | 予想曲ID |
| prediction_id | INTEGER (FK) | 予想ID (predictions.id) |
| song_id | INTEGER (FK) | 楽曲ID (songs.id) |
| order_index | INTEGER | 予想された演奏順序 |

  ### 9. prediction_likes (予想へのいいね)

  ユーザーが作成したセトリ予想に対する「いいね」を管理します。同一ユーザーによる重複を防止する制約を含みます。

| カラム名 | 型 | 説明 |
| --- | --- | --- |
| id | SERIAL (PK) | いいねID |
| prediction_id | INTEGER (FK) | 予想ID (predictions.id) |
| user_id | INTEGER (FK) | ユーザーID (users.id) |
| created_at | TIMESTAMP | いいねされた日時 |


--- 

### [Page] 4. APIリファレンス (API Reference) (ID: 3050e21e-344d-8113-9d79-c8423744f68d)

  # APIリファレンス (API Reference)

  バックエンドAPI（Node.js/Express）の主要なエンドポイント一覧です。認証が必要なものには [Auth] と記載しています。

  ## 主要エンドポイント一覧

  ### Lives (ライブ関連)

  * GET /api/lives : ライブ一覧取得（フィルタリング可能）
  * GET /api/lives/:id : ライブ詳細とセットリスト取得
  * POST /api/lives : ライブ作成 [Admin Auth]
  ### Songs (楽曲関連)

  * GET /api/songs : 楽曲一覧取得
  * GET /api/songs/:id : 楽曲詳細取得
  ### Users / Auth (認証関連)

  * POST /api/auth/register : 新規登録
  * POST /api/auth/login : ログイン
  * GET /api/users/profile : プロフィール取得 [Auth]
  ## エンドポイント詳細とリクエスト・レスポンス例

  ### GET /api/lives/:id (ライブ詳細取得)

  指定したライブの詳細情報およびセットリストを取得します。

  ```json
{
  "id": 123,
  "tour_name": "UVERworld IDEALS TOUR",
  "title": "日本武道館公演",
  "date": "2024-12-25",
  "venue": "日本武道館",
  "setlist": [
    { "song_id": 45, "title": "CORE PRIDE", "position": 1 },
    { "song_id": 12, "title": "7th Trigger", "position": 2 }
  ]
}
```

  ### POST /api/auth/login (ログイン)

  ```json
{
  "email": "crew@example.com",
  "password": "password123"
}
```

  ```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "uuid",
    "username": "UVERCREW",
    "role": "user"
  }
}
```

  ### Admin / Management (管理・インポート関連) [Admin Auth]

  * POST /api/import/csv : セットリストCSV一括インポート
  * GET /api/external/setlistfm : setlist.fmからのデータ検索・取得
  * GET /api/drafts : 公演情報の下書き一覧取得
  * GET /api/logs/security : セキュリティ監査ログの閲覧
  ### Push Notifications (通知関連)

  * POST /api/push/subscribe : プッシュ通知の購読登録 (VAPID)

--- 

### [Page] 5. フロントエンド構成 (Frontend Structure) (ID: 3050e21e-344d-8185-9805-e945566af6c4)

  # フロントエンド構成 (Frontend Structure)

  React (Vite) を使用したSPA構成です。主要なページとコンポーネントの構造は以下の通りです。

  ## 主要ページ構造

  * Home (/) : 最新のライブ一覧表示
  * Live Detail (/lives/:id) : セットリスト詳細表示
  * My Page (/mypage) : 参戦統計、ユーザー設定 [Auth]
  * Admin Dashboard (/admin) : ライブ・楽曲管理 [Admin Auth]
  ## 主要コンポーネントとその役割

  ### Common (共通)

  * Header / Footer: 全ページ共通のナビゲーション。ログイン状態に応じたメニュー表示。
  * SEO: 各ページでメタデータ、タイトルを動的に設定。環境フラグによるバナー表示機能を含む。
  ### Live (ライブ関連)

  * LiveCard: ライブの基本情報をカード形式で表示。MyPage等のリストで使用。
  * SetlistTable: セットリストを曲順通りに表示。各曲の統計ページへのリンクを含む。
  ### MyPage (マイページ関連)

  * TrendChart: 参戦履歴を年別グラフで可視化。クリックによるフィルタリングに対応。
  * NotificationSettings: PWAプッシュ通知の購読・解除を管理。VAPIDを用いた鍵認証を使用。
  * Live Prediction (/lives/:id/predict) : セットリスト予測投稿・編集画面 [Auth]
  * Security Logs (/admin/logs) : 不審なアクセスや操作ログの監査画面 [Admin Auth]
  * Bulk Import (/admin/import) : 他サイトやCSVからのデータ一括登録画面 [Admin Auth]
  ### Admin / Advanced (高度な管理機能)

  * PredictionManager: ユーザーの予測投稿の作成、修正、いいね機能を統合。各ライブ詳細から遷移。
  * AuditTable: セキュリティログをフィルタリング・検索可能な形式で表示。特定IPのブロック判断等に使用。
  * Live Prediction (/lives/:id/predict) : セットリスト予測投稿・編集画面 [Auth]
  * Security Logs (/admin/logs) : 不審なアクセスや操作ログの監査画面 [Admin Auth]
  * Bulk Import (/admin/import) : 他サイトやCSVからのデータ一括登録画面 [Admin Auth]
  ### Admin / Advanced (高度な管理機能)

  * PredictionManager: ユーザーの予測投稿の作成、修正、いいね機能を統合。各ライブ詳細から遷移。
  * AuditTable: セキュリティログをフィルタリング・検索可能な形式で表示。特定IPのブロック判断等に使用。

--- 

### [Page] 6. インフラ・運用 (Infrastructure & Operations) (ID: 3050e21e-344d-81f4-a501-d69e8ad375d6)

  # インフラ・運用 (Infrastructure & Operations)

  ## 環境構成

  Local (Development), Staging (Testing), Production (Live) の3環境で運用されています。

  ## デプロイフロー

  GitHub Actions を使用した自動デプロイが構築されています。devブランチへのプッシュでStaging、Release作成でProductionへデプロイされます。

  ## セキュリティ監視

  定期的なセキュアログ分析、NginxによるIPブロッキング等が実施されています。

  ## 運用マニュアル / コマンドリファレンス

  ### デプロイ手順 (Manual)

  ```bash
# サーバーへログイン
ssh [user]@[host]

# ディレクトリへ移動
cd ~/apps/uver-setlist-app

# 最新化とマイグレーション
git pull origin main
npm install --legacy-peer-deps
cd server && npm run migrate
cd ..

# ビルドと再起動
npm run build
sudo systemctl restart uver-app-prod

```

  ### ログ確認・監視

| 対象 | コマンド |
| --- | --- |
| アプリ稼働状況 | systemctl status uver-app-prod |
| アプリ実行ログ | journalctl -u uver-app-prod -f |
| セキュリティログ分析 | node server/analyze_security.js |

  ## 環境変数 (.env) 管理一覧

  システムの動作に不可欠な外部APIキーや認証情報は以下の環境変数として定義されています。実際のシークレット値は共有ストレージ（BitWarden等）で管理してください。

  * DB_URL: PostgreSQL接続文字列（ホスト、ポート、ユーザー名、パスワード、DB名）
  * JWT_SECRET: 認証トークンの署名用シークレットキー。ランダムな32文字以上の文字列を推奨。
  * SETLIST_FM_API_KEY: [setlist.fm] からのデータインポートに必要。
  * SPOTIFY_CLIENT_ID / SECRET: アルバムのアートワークや30秒試聴データの取得に利用。
  * VAPID_PUBLIC_KEY / PRIVATE_KEY: PWAプッシュ通知の署名に必要。web-pushライブラリで生成可能。
  * OPENAI_API_KEY: セトリ画像からのOCR抽出（GPT-4o Vision）に必要。
  ## データベース運用方針 (Backup & Sync) 🛡️

  高水準のレジリエンスと安全性を確保するため、以下の自動化プロセスを導入しています。詳細は 🔗 📖 運用手順書 (db_operations.md) を参照。

  * 高信頼バックアップ: 毎晩 03:00 実行。pg_dump -Fc 形式。
  * 厳格な検証: 日次の軽量整合性チェックに加え、週次の別インスタンスでのフルリストア検証を実施。
  * 多層の安全性ガード: 環境変数とホスト名の二段階チェックにより、本番DBへの誤操作を物理的に遮断。
  * 確実な匿名化: 検証環境（Staging）へのデータ同期時は、即時に個人情報をダミー化・クリア。
  * 監視と死活確認: 失敗時の即時通知（Discord）に加え、週次の健全性レポートによる死活監視を実施。

--- 

### [Page] 📖 データベース同期・バックアップ詳細手順 (Operational Manual) (ID: 3510e21e-344d-8109-b45a-ed2e2adaa03f)

    本ドキュメントでは、データベースのバックアップと同期の手順を説明します。

    ## 1. 本番データのバックアップ取得

    ```bash
# 本番環境（~/apps/uver-setlist-app）で実行
./scripts/backup-db.sh
```

    ## 2. 検証環境（Docker）への同期実行

    ```bash
# 環境変数を指定して実行
STAGING_DB_NAME=uver_setlist_staging \
PGHOST=127.0.0.1 \
PGPORT=54325 \
PGUSER=postgres \
PGPASSWORD=postgres \
./scripts/sync-db.sh ./backups/backup_YYYYMMDD_HHMMSS.dump.gz
```

    ## 3. スキーマ（テーブル構造）の更新

    ```bash
# 検証環境（~/apps/uver-setlist-staging）で実行
docker compose exec app-staging npm run migrate
```


--- 

### [Page] 7.管理者仕様 (Admin Specifications) (ID: 3050e21e-344d-81f6-ad95-dc62cd40b362)

  ## 管理者権限 (Admin Role) 概要

  本システムにおける「管理者」は、ライブデータや楽曲情報の整合性を維持し、コミュニティから寄せられる修正依頼を適切に処理する権限を持ちます。全ての破壊的な操作（削除・更新）および外部APIとの連携は管理者のみが行えます。

  ## 主要機能 (Dashboard)

  ### 1. ライブ管理 (Lives Tab)

  * ライブの新規追加・編集・削除: 公演日、会場、ツアー名、公演種別（ONEMAN, FESTIVAL等）の管理。
  * 一括削除機能: 複数の公演を選択して一度に削除可能。
  * セットリストエディタ: 特定の公演の曲順をドラッグ＆ドロップ（または選択式）で編集。
  ### 2. 楽曲管理 (Songs Tab)

  * 全楽曲のマスターデータの管理。タイトル、収録アルバム、リリース年、MV URL、作詞/作曲者情報の編集。
  ### 3. ユーザー管理 (Users Tab)

  * 全ユーザーの一覧表示と検索。
  * 権限変更: 一般ユーザーを管理者に昇格、またはその逆の操作。
  ### 4. 修正依頼対応 (Corrections Tab)

  * 一般ユーザーから提出された「セットリスト間違い」「会場名間違い」などの修正依頼の承認・却下。
  * クイック適用: 依頼に含まれるセットリスト案をワンクリックで実データに反映。
  ### 5. 統計データ (Stats Tab)

  * システムの利用状況（ユーザー数、ライブ数、曲数など）を一覧できるダッシュボード。APIは /api/stats?admin=true を使用。
  ## 高度なデータ操作と連携

  ### Setlist.fm 外部連携 (Collect Tab)

  外部サイト「setlist.fm」からUVERworldの公式データを検索し、直接DBにインポートできます。年指定での一括検索や、既存データとの重複チェック（開催日・会場による）を自動で行います。

  ### CSV インポート (Import Tab)

  指定されたフォーマットのCSVファイルをアップロードすることで、複数のライブデータを一括で登録できます。過去のアーカイブデータを移行する際に使用します。

  ## 通知とセキュリティログ

  ### プッシュ通知の手動送信

  新しくセットリストが確定した際など、特定のライブを指定してPWA購読ユーザーにプッシュ通知を即座に送信できます。送信結果（成功・失敗数）もその場で確認可能です。

  ### セキュリティログの監査

  不正なログイン試行や、重要なデータの変更履歴（Auditing）を確認できる管理者専用ページ（/admin/security-logs）へのアクセス権を持ちます。

  ## 1. ライブ・公演データの包括的管理

  ### 詳細な登録項目とバリデーション

  * ツアー名/公演タイトル: ツアー名（例: IDEALS TOUR）と個別の公演タイトル（例: 日本武道館 1日目）を分離して管理可能。
  * 会場タイプ自動判定: 会場名に「アリーナ」「ドーム」「Zepp」などが含まれる場合、保存時に自動で公演タイプ（ARENA, LIVEHOUSE等）を付与。
  * ステータス管理: 開催日に基づき、FINISHED（過去）または SCHEDULED（予定）を自動設定。
  ### 一括操作 (Batch Operations)

  複数の公演を選択し、一括で削除する機能を備えています。DBの整合性を保つため、関連付けられたセットリストデータも含めてクリーンアップされます。

  ## 2. セットリストの自動生成とインポート機能

  ### Setlist.fm 連携のヒューリスティック(Heuristics)

  外部API（setlist.fm）からデータを取得する際、以下のロジックでメタデータを補完します：

  * 生誕祭判定: 日付がメンバーの誕生日（例: 12/21 TAKUYA∞）と一致する場合、自動的に「○○生誕祭」のラベルを付与。
  * フェス判定: 会場と時期（例: 8月の蘇我）から「ROCK IN JAPAN」等のフェス名を推測。
  * 既存チェック: 開催日と会場の組み合わせで、既にDBに登録済みかどうかを判定し、重複登録を防止。
  ### CSV インポート仕様

  * 対応項目: 日付, 会場, 都道府県, ツアー名, 公演タイトル, 公演タイプ, 曲名, 曲順, 付加情報。
  * 既存上書き: 同じ公演が既に存在する場合、基本情報を更新した上でセットリストの中身を全入れ替え（洗い替え）します。
  ## 3. ユーザー修正依頼 (Corrections) の承認フロー

  ### 依頼の種類と処理ロジック

  * Pending (保留): ユーザーからの新規投稿状態。管理者の査読を待機。
  * Reviewed (確認中): 管理者が内容を確認し、事実関係を調査中の状態。
  * Resolved (完了): 修正をデータに反映済み。反映時には管理者メモを残すことが推奨されます。
  ### セットリスト修正の「クイック適用」機能

  ユーザーが提案したセットリスト案を、管理者画面上でDB内の既存楽曲データとマッチング。以下の手順で適用されます：

  * 1. 表記揺れの吸収: 小文字・大文字の差異や余計な空白を無視して楽曲を検索。
  * 2. 未登録楽曲の作成: DBに存在しない曲が含まれている場合、その場で「楽曲作成」を行ってから反映可能。
  * 3. ID紐付け: 確定した楽曲IDを曲順通りに配列化し、公演に一括で関連付け。
  ## 4. システム運用・監査 (Operations & Auditing)

  * プッシュ通知のルール: 管理者が「送信」ボタンを押した瞬間、Firebase/VAPID経由で全ての購読者に通知が配信されます。送信失敗時にはエラーログを即座に確認可能です。
  * セキュリティログ: 「誰が」「いつ」「どの公演を編集したか」や、連続したログイン失敗などの不審なアクティビティを時系列で閲覧可能です。
  ## 5. 高度なデータ登録・抽出機能

  ### 下書き保存と公開管理 (Draft Manager)

  * セットリスト未確定の公演や、編集途中のデータを「下書き(is_draft: true)」として保存できます。管理画面の「Drafts」タブから一覧表示・再編集が可能です。
  ### OCR画像認識による自動抽出 (Setlist OCR)

  * ライブ会場の掲示物やSNSのセットリスト画像をアップロードすることで、OpenAI GPT-4o Vision APIを用いて楽曲名・曲順を自動抽出します。抽出結果は即座に下書きとして保存されます。
  ## 6. 運用時のテクニックと補足機能

  ### 曖昧検索 (Fuzzy Match) と補完ロジック

  * セットリスト適用時、楽曲タイトルの大文字・小文字、余計な空白を自動で無視してマスターデータと照合します。これによって「Chance!」と「CHANCE!」などの表記揺れを吸収します。
  * 未登録楽曲のクイック作成: 修正依頼に知らない曲が含まれている場合、その場でタイトルのみの楽曲データを一時作成し、セットリストに組み込むことができます。
  ### 既存公演への外部データ適用

  * 既に登録済みの公演に対しても、個別に [setlist.fm] から最新データを検索し、セットリストを最新状態に上書きインポートすることが可能です。フェスやイベント名の自動推測アルゴリズムも適用されます。

--- 

### [Page] 8.セキュリティ仕様 (Security Specifications) (ID: 3050e21e-344d-810d-99d3-e645dc0dd2e9)

  ## 1. 認証と認可 (Authentication & Authorization)

  ### ユーザー認証 (Authentication)

  * 方式: JWT (JSON Web Token) を利用したステートレス認証。有効期限は1時間。
  * パスワード保護: bcrypt を使用したハッシュ化。saltRound は 10 に設定。
  * メール認証: 新規登録時に 32byte の 16進数トークンを生成し、メールリンク経由での認証を必須化。未認証ユーザーはログイン不可。
  ### アクセス認可 (Authorization)

  * ロールベース制御 (RBAC): 'user' と 'admin' の2種類のロールを定義。
  * ミドルウェア: authorize (JWT検証) と adminCheck (管理者フラグ確認) を全保護エンドポイントで適用。
  ## 2. インフラ・ネットワークセキュリティ

  ### リバースプロキシ (Nginx)

  * SSL/TLS 終端: HTTPS 通信を Nginx で処理し、安全な暗号化通信を保証。
  * ポート制限: 公開ポートは 80, 443 に限定。SSH(22) や DB(5432) への外部アクセスを遮断。
  ### アプリケーション保護 (Express)

  * Helmet.js: セキュリティヘッダーの自動付与（XSS保護、クリックジャッキング対策等）。
  * CORS 設定: オリジン許可リストによる不適切な外部サイトからの API コール制限。
  ## 3. 監査・モニタリング (Auditing)

  ### セキュリティログの記録機能

  重要なイベントが発生した際、ip_address, user_email, event_type, message, details (JSON) を `security_logs` テーブルに記録します。

  * 記録対象: ログイン失敗（存在しないユーザー、パスワード不一致）、認証エラー、システム例外等。
  ### 自動・手動分析ツール

  * analyze_security.js: ログデータを統計的に分析し、短時間での同一IPからの攻撃試行をリアルタイムで特定可能。
  ## 4. 運用セキュリティポリシー

  * レート制限: ログイン、会員登録、パスワードリセットのエンドポイントには IP ごとのレート制限（Rate Limiter）を適用し、ブルートフォース攻撃を防止。
  * IPブロック: 攻撃が疑われる特定IPは、Nginx レベルで deny 設定を行う手動介入ルールを策定。
  ### リアルタイム監査と防衛 (Real-time Auditing)

  * 管理者ダッシュボードの「Security Logs」タブには、全ユーザーの重要操作（楽曲削除、ライブ更新、管理者昇格等）がリアルタイムで記録・表示されます。これによって不正操作を即座に特定可能です。
  * プッシュ通知状況の記録: 送信に失敗したデバイス（トークン失効等）もログとして残り、購読解除処理の自動化（将来的な予定）の判断材料として活用されます。

--- 

### [Page] 9.セットリスト予想機能 (実装済み) (ID: 3340e21e-344d-8102-8611-dbcf83f94139)

  ## 概要

  ライブ開催前に、Crew（ユーザー）がその日のセットリストを予想し、投稿・共有できる機能です。ライブ終了後はセットリストと照合して自動採点し、スコアランキングを公開します。

  > 最終更新: 2026-05-01 / ステータス: 本番稼働中

---

  ## 実装済み機能一覧

| 機能 | 概要 |
| --- | --- |
| 予想ポータル | 受付中のライブ一覧と自分の予想履歴を確認 |
| 予想作成 | dnd-kit によるドラッグ＆ドロップ。アルバム・シングル収録曲のみ選択可能 |
| 受付締め切り | ライブ当日 JST 0:00 をもって自動終了（サーバーサイド判定） |
| ランキング閲覧 | 人気順・新着順・スコア順で閲覧 |
| いいね | 他ユーザーの予想への「いいね！」 |
| Xシェア | 予想内容をツイート。スコアあり時は得点・ラベル・一致曲数を自動挿入 |
| スコアリング | ライブ後の自動採点・100点満点スコア算出（後述） |
| ダッシュボード連携 | 次回ライブに「セトリ予想受付中 🔥」バッジと CTA を表示 |

---

  ## スコアリング仕様

  ライブのセットリストが確定（setlist_status = 'NORMAL'）した後、全予想を自動採点して100点満点のスコアを算出します。

  ### スコア計算式

  ```javascript
denominator    = max(actual_count, predicted_count)
match_score    = round((matched_count    / denominator) × 70, 2)   # 最大70pt
position_score = round((position_matched / denominator) × 20, 2)   # 最大20pt
streak_bonus   = round(min(max_streak × 2, 10), 2)                 # 最大10pt
total_score    = match_score + position_score + streak_bonus        # 最大100pt
```

| 要素 | 配点 | 判定基準 |
| --- | --- | --- |
| 一致スコア | 70pt | 予想曲が実際のセトリに含まれていた割合 |
| 順番スコア | 20pt | 同じ位置（順番）で一致した曲の割合 |
| 連続ボーナス | 10pt | 予想内での最長連続一致数 × 2（上限10pt） |

  > denominator に max を使う理由: 予想曲数を少なくして的中率を上げる「抜け駆け」を防ぐため。

  ### スコアラベル

| スコア | ラベル |
| --- | --- |
| 90〜100pt | 神予想 |
| 75〜89pt | 優秀 |
| 50〜74pt | 合格 |
| 25〜49pt | 惜しい |
| 0〜24pt | 次回に期待 |

  ### スコア計算のトリガー

| タイミング | 処理 |
| --- | --- |
| 管理者がセトリを保存 PUT /api/lives/:id/setlist | setlist_status = 'NORMAL' → 全予想をバックグラウンドで自動再計算 |
| 管理者がインポート POST /api/lives/:id/import-setlist | 同上 |
| 管理者が手動実行 POST /api/lives/:id/recalculate-scores | べき等な全予想再計算 |

  ### スコアのUI表示

  * 予想一覧: カード右端に 🏆 85.5 / 100pt ＋ 内訳バッジ（M/P/S）。スコアありのライブは「スコア順」タブが出現。
  * 予想詳細: 合計点（大きく表示）＋ 3要素のバーグラフ＋一致曲数サマリー。スコアがあれば全ユーザーにXシェアボタンを表示。
  ### 今後の課題（未実装）

  * rank カラムへの順位書き込み（現在は NULL）
  * ライブ単位の専用ランキングページ
  * プッシュ通知「スコアが出ました！」
---

  ## UI/UX 設計方針（ペルソナ別）

  知識量に応じて参加ハードルを下げつつ、ガチ勢がこだわれる奥深さを両立させます。

  ### 👤 ペルソナC: 「最近ファンになった初心者Crew」（ビギナー）

  * 特徴: 知っている曲は10〜20曲程度。アニメやフェスから入った。
  * UI/UX案: 「定番曲で埋める」ボタンによるテンプレ入力や、「AI おまかせ予想」によるオート生成でゼロからの作成ハードルを下げる。バッジ（🔥定番、✨最新）でガイドする。
  ### 👤 ペルソナB: 「ライブ大好き中堅Crew」（ミドル）

  * 特徴: ライブには行くが、昔の曲はタイトルがすぐ出てこない。
  * UI/UX案: 強力な「あいまい検索＆サジェスト（ひらがな対応）」。「前回のライブ履歴」横並び表示からのドラッグ＆ドロップ追加。残り曲数のプログレスバー表示。
  ### 👤 ペルソナA: 「歴の長いガチ勢Crew」（ベテラン）

  * 特徴: 全曲把握しており、バージョン違いやメドレーなどマニアックな予想をしたい。
  * UI/UX案: メドレー指定オプションや（2018 Remix）などのバージョン選択。セトリ間に「MC枠」を挿入できる高度なブロックUI。完全なドラッグ＆ドロップ並び替え。
---

  ## ソフトウェア設計仕様

  ### フロントエンド構成

  * DND 状態管理: 楽曲の並び替えは arrayMove でメモリ上の配列を操作し、保存時に order_index を付与して一括送信。
  * 楽曲検索: クライアントサイドフィルタリング（ひらがな/カタカナ名寄せ）でリアルタイムサジェストを実現。
  * スコア表示: total_score が null でなければスコアパネルを表示。getScoreLabel() でラベルを算出。
  ### バックエンド構成

  * トランザクション: POST /api/predictions で予想レコードと全楽曲インデックスを1トランザクション内で保存。
  * 締め切り判定: POST /api/predictions で todayJST >= liveDate をチェックし、超過時は 403 を返す。
  * スコア計算: server/services/scoreCalculator.js に集約。UPSERT で何度でも再計算可能（べき等）。
  * 自動トリガー: セトリ保存 API がレスポンスを返した後、バックグラウンドで recalculateScoresForLive() を非同期実行。
  ### APIエンドポイント一覧

| メソッド | パス | 認証 | 説明 |
| --- | --- | --- | --- |
| GET | /api/predictions/lives | 不要 | 予想受付中のライブ一覧 |
| GET | /api/predictions | 不要 | 予想一覧（`?live_id=&sort=popular\ |
| GET | /api/predictions/:id | 不要 | 予想詳細（スコア内訳含む） |
| POST | /api/predictions | 必須 | 予想投稿（締め切りチェック付き） |
| POST | /api/predictions/:id/like | 必須 | いいねトグル |
| POST | /api/lives/:id/recalculate-scores | 管理者 | 全予想スコアの手動再計算 |

---

  ## データベース構成

  ```sql
-- 予想本体
CREATE TABLE predictions (
    id         SERIAL PRIMARY KEY,
    user_id    INTEGER REFERENCES users(id),
    live_id    INTEGER REFERENCES lives(id),
    title      VARCHAR(255) DEFAULT 'セットリスト予想',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 予想曲目（順序保持）
CREATE TABLE prediction_songs (
    id            SERIAL PRIMARY KEY,
    prediction_id INTEGER REFERENCES predictions(id) ON DELETE CASCADE,
    song_id       INTEGER REFERENCES songs(id),
    order_index   INTEGER NOT NULL
);

-- いいね（重複防止）
CREATE TABLE prediction_likes (
    id            SERIAL PRIMARY KEY,
    prediction_id INTEGER REFERENCES predictions(id) ON DELETE CASCADE,
    user_id       INTEGER REFERENCES users(id),
    created_at    TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(prediction_id, user_id)
);

-- スコア採点結果（UPSERT）
CREATE TABLE prediction_scores (
    id               SERIAL PRIMARY KEY,
    prediction_id    INTEGER NOT NULL REFERENCES predictions(id) ON DELETE CASCADE,
    live_id          INTEGER NOT NULL REFERENCES lives(id) ON DELETE CASCADE,
    user_id          INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    predicted_count  INTEGER      NOT NULL DEFAULT 0,
    actual_count     INTEGER      NOT NULL DEFAULT 0,
    matched_count    INTEGER      NOT NULL DEFAULT 0,
    position_matched INTEGER      NOT NULL DEFAULT 0,
    max_streak       INTEGER      NOT NULL DEFAULT 0,
    match_score      NUMERIC(5,2) NOT NULL DEFAULT 0,
    position_score   NUMERIC(5,2) NOT NULL DEFAULT 0,
    streak_bonus     NUMERIC(5,2) NOT NULL DEFAULT 0,
    total_score      NUMERIC(5,2) NOT NULL DEFAULT 0,
    rank             INTEGER,
    calculated_at    TIMESTAMP DEFAULT NOW(),
    CONSTRAINT prediction_scores_prediction_id_key UNIQUE (prediction_id)
);
```


--- 

### [Page] 10. 楽曲詳細 & 演奏推移チャート (ID: 3630e21e-344d-81c3-ae1f-ecf2d2cd92e9)

  ## 概要

  各楽曲の演奏履歴や、年別の演奏回数の推移を視覚的に確認できる機能。

  ## 機能一覧

  * 演奏推移チャート (Performance Timeline): Recharts を使用した棒グラフ。楽曲が各年に何回演奏されたかを時系列で表示。
  * ライブ履歴一覧: その曲が演奏された過去のライブ一覧を表示。
  ## データ取得

  GET /api/songs/:id にて、楽曲基本情報、ライブ履歴、および年別集計データ（yearlyStats）をまとめて取得。

