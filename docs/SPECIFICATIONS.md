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
  - **ログインユーザー**: 参戦記録（My Page）、セトリ予想の作成・いいね、他ユーザーのフォローが可能。

## 2. セトリ予想機能 (Setlist Prediction) [🔗 Notion](https://www.notion.so/3340e21e344d81028611dbcf83f94139)

- **概要**: 今後開催されるライブのセットリストをユーザーが予想し、共有する機能。
- **ソフトウェア設計**:
  - **フロントエンド**: `dnd-kit` による宣言的な並び替え管理。楽曲検索はクライアントサイドでのサジェスト機能を搭載。
  - **バックエンド**: 予想作成時はトランザクション（Atomic）処理を行い、予想レコードと構成楽曲の整合性を保証。
- **データベース構成**:
  - `predictions`: 予想の基本情報（ユーザー、対象ライブ、タイトル等）を格納。
  - `prediction_songs`: 各予想に含まれる楽曲と演奏順 (`order_index`) を紐付け。
  - `prediction_likes`: ユーザーからの「いいね」を管理（ユニーク制約による重複防止）。
  - `prediction_scores`: スコア採点結果（後述）。
- **機能一覧**:
  - **予想ポータル**: 受付中のライブ一覧と、自分の予想履歴を確認できる。
  - **予想作成**:
    - ドラッグ＆ドロップによる直感的な曲順操作。
    - アルバム・シングル収録曲のみ選択可能（ディスコグラフィ連動）。
    - **受付締め切り**: ライブ当日 JST 0:00 をもって自動終了。サーバーサイドで判定。
    - 2026-05-01 よりも前の公演は予想セクション自体を非表示。
  - **ランキング/共有**:
    - 各ライブごとの「みんなの予想」を人気順（いいね数）・新着順・**スコア順**で閲覧。
    - スコア算出済みのライブでは「スコア順」タブが表示される。
    - 各予想詳細ページから X (Twitter) へのシェア機能（スコアありの場合は結果をツイートに自動挿入）。
  - **インタラクション**:
    - 他のユーザーの予想に対する「いいね！」機能。
- **UI/UXルール**:
  - ボタン等のアクション要素には「セトリ予想」と表記。
  - タイトルや説明文などの詳細要素には「セットリスト予想」と表記。
  - ダッシュボードの次回ライブには「セトリ予想受付中 🔥」バッジを表示し、導線を強化。

### 2-1. スコアリング仕様

ライブのセットリストが確定（`setlist_status = 'NORMAL'`）した後、全予想を自動採点する。

**スコア計算式**:

```
denominator    = max(actual_count, predicted_count)
match_score    = round((matched_count    / denominator) × 70, 2)   # 最大70pt
position_score = round((position_matched / denominator) × 20, 2)   # 最大20pt
streak_bonus   = round(min(max_streak × 2, 10), 2)                 # 最大10pt
total_score    = match_score + position_score + streak_bonus        # 最大100pt
```

| 要素 | 配点 | 判定基準 |
|---|---|---|
| 一致スコア | 70pt | 予想曲が実際のセトリに含まれていた割合 |
| 順番スコア | 20pt | 同じ位置（順番）で一致した曲の割合 |
| 連続ボーナス | 10pt | 予想内での最長連続一致 × 2（上限10pt） |

> `denominator` に `max` を使うことで、曲数を少なく予想して的中率を上げる行為を防止。

**スコアラベル**:

| スコア | ラベル |
|---|---|
| 90〜100pt | 神予想 |
| 75〜89pt | 優秀 |
| 50〜74pt | 合格 |
| 25〜49pt | 惜しい |
| 0〜24pt | 次回に期待 |

**スコア計算のトリガー**:

| タイミング | 処理 |
|---|---|
| `PUT /api/lives/:id/setlist`（管理者） | `setlist_status = 'NORMAL'` → バックグラウンドで全予想を自動再計算 |
| `POST /api/lives/:id/import-setlist`（管理者） | 同上 |
| `POST /api/lives/:id/recalculate-scores`（管理者） | 手動で全予想を再計算（べき等） |

**DBテーブル (`prediction_scores`)**:

| カラム | 型 | 説明 |
|---|---|---|
| `prediction_id` | INTEGER UNIQUE | 予想ID（1予想につき1スコア） |
| `live_id` | INTEGER | ライブID |
| `user_id` | INTEGER | ユーザーID |
| `predicted_count` | INTEGER | 予想曲数 |
| `actual_count` | INTEGER | 実際の曲数 |
| `matched_count` | INTEGER | 一致曲数 |
| `position_matched` | INTEGER | 順番まで一致した曲数 |
| `max_streak` | INTEGER | 最長連続一致数 |
| `match_score` | NUMERIC(5,2) | 一致スコア |
| `position_score` | NUMERIC(5,2) | 順番スコア |
| `streak_bonus` | NUMERIC(5,2) | 連続ボーナス |
| `total_score` | NUMERIC(5,2) | 合計スコア |
| `rank` | INTEGER | 順位（将来用、現在は NULL） |

**スコア関連APIエンドポイント**:

| メソッド | パス | 認証 | 説明 |
|---|---|---|---|
| GET | `/api/predictions?sort=score` | 任意 | スコア降順で予想一覧を返す |
| GET | `/api/predictions/:id` | 任意 | スコア内訳を含む予想詳細 |
| POST | `/api/predictions` | 必須 | 締め切りチェック付きで予想を投稿 |
| POST | `/api/lives/:id/recalculate-scores` | 管理者 | 指定ライブの全予想スコアを再計算 |

## 3. フォロー機能 & ユーザープロフィール

### 3-1. フォロー機能
- ユーザー同士が相互フォローできる。フォロー/アンフォローはトグル式。
- 自己フォロー不可（DB の `CHECK` 制約 + API レベルで二重防護）。
- フォローボタン (`FollowButton`) は未ログイン・自分自身のプロフィールでは非表示。

### 3-2. フォローフィード (My Page)
- フォロー中ユーザーのセトリ予想を新着順で一覧表示（1回のJOINクエリで取得、N+1なし）。
- フォロー0件の場合は「セトリ予想ランキングからフォローできます」の誘導文を表示。

### 3-3. 公開プロフィール (`/users/:id`)
- ログイン不要で閲覧可能。
- **タブ構成**:
  | タブ | 公開条件 |
  |---|---|
  | 予想 | 常に公開（`is_public` に関わらず） |
  | 参戦ライブ | `is_public = true` のみ |
  | 楽曲ランキング | `is_public = true` のみ（フロント集計、追加APIなし） |
- 自分のプロフィールには「マイページへ」リンク、他人のプロフィールにはフォローボタンを表示。

### 3-4. プライバシー設計 (`is_public`)
- **制御対象**: 参戦ライブ・楽曲ランキングのみ。セトリ予想は常に公開。
- **デフォルト**: `true`（公開）。新規登録時に選択可能、登録後は Settings で変更可能。
- `is_public = false` のユーザーの参戦ライブ取得 (`GET /api/users/:id/attended_lives`) は 403 を返す。

### 3-5. ユーザー名リンク
以下の画面でユーザー名をクリックすると `/users/:id` へ遷移：
- セトリ予想ランキング（ランキングカード内）
- セトリ予想詳細ページ（「〇〇 の予想」見出し）
- My Page フォローフィード内

### 3-6. DBテーブル
- `user_follows`: フォロー関係を管理（`follower_id`, `following_id`、複合主キー）
- `users.is_public`: 参戦記録の公開/非公開フラグ（`BOOLEAN NOT NULL DEFAULT TRUE`）

### 3-7. APIエンドポイント
| メソッド | パス | 認証 | 説明 |
|---|---|---|---|
| POST | `/api/follows/:userId` | 必須 | フォロー/アンフォロー トグル |
| GET | `/api/follows/my/stats` | 必須 | 自分のフォロー数/フォロワー数 |
| GET | `/api/follows/stats/:userId` | 任意 | 対象ユーザーの統計 + `is_following` |
| GET | `/api/feed` | 必須 | フォロー中ユーザーの予想フィード |
| GET | `/api/users/:id/profile` | 任意 | 公開プロフィール + フォロー統計 |
| GET | `/api/users/:id/attended_lives` | 任意 | 参戦ライブ（非公開なら403） |
| GET | `/api/users/:id/predictions` | 任意 | 予想一覧（常に公開） |

---

## 4. 技術仕様
- **システム構成**: ローカル・検証・本番の各環境設定 [🔗 docs/environments.md](./environments.md) / [🔗 Notion](https://www.notion.so/3050e21e344d811f9bb8feb1d3e4516e)
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
  - `/users/:id`: 公開ユーザープロフィール
