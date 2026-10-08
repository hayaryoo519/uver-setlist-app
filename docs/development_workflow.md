# 開発ワークフロー (Development Workflow)

ローカル開発からリリースまでの一連の手順をまとめます。

---

## 環境概要

| 環境 | ブランチ | URL | DB |
|:---|:---|:---|:---|
| **ローカル (Local)** | `feature/*` | `http://localhost:5173` | Docker Supabase (port: 54332) |
| **検証 (Staging)** | `dev` | `http://<staging-server>:9001` | Docker PostgreSQL (port: 54325) |
| **本番 (Production)** | `main` | `https://uver-setlist-archive.org` | Host PostgreSQL (port: 5432) |

詳細は [`docs/environments.md`](./environments.md) を参照。

---

## Step 1 : ローカル開発

### ブランチを作成する
```bash
git checkout dev
git pull origin dev
git checkout -b feature/xxx
```

### 開発サーバーを起動する
Claude Code のプロンプトで `/dev-start` と入力するか、手動で起動します。

```bash
# フロントエンド（ルートで実行）
npm run dev

# バックエンド（別ターミナルで実行）
cd server && npm run dev

# Vite は /api と /uploads を http://127.0.0.1:3001 にプロキシします。
# ローカルでは server/.env の PORT を 3001 に設定してください。
```

### コミットする
```bash
git add <ファイル>
git commit -m "feat: xxx"   # コミットプレフィックス: feat / fix / docs / refactor / chore
```

コミットメッセージ規則：
| プレフィックス | 用途 |
|:---|:---|
| `feat:` | 新機能 |
| `fix:` | バグ修正 |
| `docs:` | ドキュメントのみの変更 |
| `refactor:` | 機能変更を伴わないリファクタリング |
| `chore:` | ビルド・設定変更など |

---

## Step 2 : dev ブランチへマージ → Staging 検証

### dev へマージする
```bash
git checkout dev
git merge feature/xxx
git push origin dev
```

`dev` へのプッシュで **Staging 環境へ自動デプロイ**されます。デプロイ後は `http://127.0.0.1:9001/api/ping` を最大20秒リトライし、起動確認に失敗した場合は Actions を失敗扱いにします。

### Staging 環境を起動する（必要な場合）
```bash
docker compose up -d    # 起動
docker compose stop     # 一時停止
docker compose down     # 完全停止（データ保持）
```

### DB マイグレーションを確認する（スキーマ変更がある場合）

`dev` への push で起動する `deploy-staging.yml` は、Staging のマイグレーションを自動実行します。
以下は未適用ファイルの事前確認や、障害対応で手動実行が必要な場合に使用します。

```bash
# Staging サーバー上で実行
docker compose run --rm app-staging node server/scripts/migrate.js --dry-run
docker compose run --rm app-staging node server/scripts/migrate.js
```

### 動作確認する
- `http://<staging-server>:9001` でブラウザ確認
- 追加・修正した機能を中心に検証

---

## Step 3 : PR を作成して main へマージ

### GitHub CLI で PR を作成する
```powershell
& "C:\Program Files\GitHub CLI\gh.exe" pr create `
  --base main `
  --head dev `
  --title "タイトル" `
  --body "変更内容の説明"
```

### マージする
GitHub 上でレビュー → Merge pull request。

---

## Step 4 : 本番デプロイ

**GitHub Release を publish すると自動デプロイ**されます（main へのマージだけでは動きません）。

### リリース前チェック

Release publish 前に、最低限以下を確認します。

セキュリティ改善の第一弾は、後述の「セキュリティ改善のリリース条件」も満たしてください。PR作成・CI成功だけではリリース準備完了になりません。

```bash
npm test
npm run build
cd server
npm test
npm run migrate:dry
```

DB変更がある場合は、[`docs/db_operations.md`](./db_operations.md) の「本番DBのスキーマ変更ルール」も確認してください。

### 自動デプロイの流れ
1. `gh release create vX.Y.Z` でリリース publish
2. GitHub Actions (`deploy-production.yml`) が self-hosted ランナーで起動
3. ReleaseイベントのコミットSHAを取得し、mainに含まれることを確認 → 対象SHAへreset → `npm ci` → DBバックアップ → `node scripts/migrate.js` → `npm run build` → `systemctl restart uver-setlist` → `/api/ping` ヘルスチェック（配備対象固定はPR #204）

### 手動デプロイが必要な場合

通常は GitHub Release 経由でデプロイします。以下は Actions 障害時など、復旧のために手動実行が必要な場合のみ使用します。

```bash
ssh <server-user>@server01
cd ~/apps/uver-setlist-app/server

git fetch origin main && git reset --hard origin/main
npm ci
node scripts/migrate.js

cd ~/apps/uver-setlist-app
npm ci --legacy-peer-deps
npm run build
sudo systemctl restart uver-setlist
```

### ログ確認
```bash
sudo systemctl status uver-setlist          # 稼働状況
sudo journalctl -u uver-setlist -f          # リアルタイムログ
sudo journalctl -u uver-setlist -n 50       # 直近50行
sudo journalctl -u uver-setlist --since "1 hour ago" | grep -E "Error|500"  # エラー絞り込み
```

Actions 成功後は、ブラウザでもトップページ、ログイン、ライブ一覧、ライブ詳細、変更した機能を確認します。

---

## Step 5 : リリースタグを打つ

バージョン規則は [`docs/versioning_policy.md`](./versioning_policy.md) を参照。

```
v[MAJOR].[MINOR].[PATCH]

MAJOR : 破壊的変更・大規模リニューアル
MINOR : 新機能追加（例: v1.5.x → v1.6.0）
PATCH : バグ修正・軽微なUI調整（例: v1.6.0 → v1.6.1）
```

### 手順

```powershell
# ① main を最新化
git checkout main
git pull origin main

# ② 最新タグを確認
git tag --sort=-v:refname | Select-Object -First 5

# ③ リリース作成
& "C:\Program Files\GitHub CLI\gh.exe" release create vX.Y.Z `
  --title "vX.Y.Z - 簡潔なタイトル" `
  --notes "## 新機能`n- xxx`n`n## バグ修正`n- xxx"
```

---

## Issue 管理

```powershell
# Issue を一覧表示
& "C:\Program Files\GitHub CLI\gh.exe" issue list --repo hayaryoo519/uver-setlist-app

# Issue を閉じる
& "C:\Program Files\GitHub CLI\gh.exe" issue close <番号> --repo hayaryoo519/uver-setlist-app
```

---

## 全体フロー図

```
feature/xxx (ローカル開発)
    │
    │ git merge / PR
    ▼
  dev ブランチ ──→ 自動デプロイ ──→ Staging (<staging-server>:9001)
    │                                   │
    │  動作確認 OK                       │ node scripts/migrate.js
    │ PR --base main                    │（スキーマ変更がある場合）
    ▼
  main ブランチ（マージだけでは本番へデプロイしない）
    │
    │ gh release create vX.Y.Z
    ▼
  GitHub Release (タグ) ──→ 自動デプロイ ──→ Production (uver-setlist-archive.org)
```

---

## CI/CD 構成

### ワークフロー一覧

| ファイル | トリガー | ランナー | 内容 |
|:---|:---|:---|:---|
| `test.yml` | push/PR → `main`, `dev` | GitHub hosted | バックエンド・フロントエンドのテスト実行 |
| `deploy-staging.yml` | push → `dev` | self-hosted | build → migrate → `docker compose up -d` → `/api/ping` health check |
| `deploy-production.yml` | Release published | self-hosted | git pull → backup → migrate → build → restart → health check |

### self-hosted ランナー

| 項目 | 内容 |
|:---|:---|
| サーバー | `server01` (`<server-user>` ユーザー) |
| インストール先 | `/home/<server-user>/actions-runner` |
| systemd サービス名 | `actions.runner.hayaryoo519-uver-setlist-app.server01` |
| 自動起動 | enabled（OS 再起動後も自動起動） |

```bash
# ランナーの状態確認
sudo systemctl status actions.runner.hayaryoo519-uver-setlist-app.server01

# 再起動
sudo systemctl restart actions.runner.hayaryoo519-uver-setlist-app.server01

# ログ確認
sudo journalctl -u actions.runner.hayaryoo519-uver-setlist-app.server01 -f
```

### GitHub Secrets

| Secret 名 | 用途 |
|:---|:---|
| `SUDO_PASSWORD` | 本番デプロイ時の `sudo systemctl restart uver-setlist` に使用 |

### よくあるトラブル

| 症状 | 原因 | 対処 |
|:---|:---|:---|
| ジョブが "Waiting for runner..." のまま | ランナーが停止中 | `sudo systemctl start actions.runner.*` |
| "A session for this runner already exists" | 旧プロセスのセッションが残存 | 数分待って `sudo systemctl restart actions.runner.*` |
| `npm error ERESOLVE` (フロントエンド) | `react-helmet-async` の React 19 非対応 | `npm ci --legacy-peer-deps` を使用（ワークフロー設定済み） |

---

## セキュリティ改善のリリース条件

2026-10-07時点の計画。実行結果はIssue #197に記録し、秘密情報・ホスト詳細・生ログは公開しません。

### リリースを分ける単位

第一弾は準備済みのPR #198〜#203と配備対象固定の #204をまとめます。権限・検証環境の保護と配備の再現性を改善する範囲です。DBスキーマ変更はありません。

| 対象 | 反映先 | リリース後に変わること |
|:---|:---|:---|
| #198 | 本番のデプロイ・バックアップ処理 | envコピーとバックアップ生成時の権限を固定 |
| #199 → #200 → #201 | StagingのDocker、CI | Node24、収集CLIのLF正規化、非root実行 |
| #203 | Stagingのアプリ | capabilities除去と権限昇格の制限 |
| #202 | StagingのDB | ホスト公開をIPv4 loopbackへ限定 |
| #204 | 本番デプロイ | Releaseが指すコミットを配備 |

本番はsystemdで動くため、#199/#201/#203では本番Node・実行ユーザーは変わりません。Docker更新・FW/SSH確認も第一弾に含みません。Docker 28未満のloopback公開の制約は #202 の文書に従い、接続制限の完了と扱いません。

次はIssue #196の検証DB同期・匿名化・OAuth情報除外と機密ログ対策を優先し、認可・セッション失効は別の目的のPRで進めます。並行して管理者監査を済ませ、Issue #197の本番Node更新・専用ユーザー化・Docker/FW/SSH対策を、影響するサービスと復旧経路が確定したものから別リリースにします。第一弾の配備だけで #196/#197 を閉じません。

#### リクエスト・認可ログの保護（2026-10-09）

アプリの共通リクエストログは応答完了時の時刻・許可したHTTPメソッド・登録済みルートのパターン・応答コードだけを記録します。実URL、クエリ、パスの実値、ヘッダー、Cookie、本文は記録しません。静的ファイルや未一致/正規表現ルートは `<unmatched>` とし、認証失敗・管理者権限拒否・共通エラーも固定文言にします。認証/認可とAPI応答の仕様、DBの監査ログは変更しません。

Stagingでは架空の秘密値をクエリ・未一致パス・ヘッダーに入れ、認証拒否が従来どおり403となること、対象時間帯のコンテナログにその値がないこと、メソッド/ルート/応答コードが残ることを確認します。実OAuth認可コードや個人メール、実トークンを試験用に使いません。

この対策は新しい共通アプリログに限定します。メールのmockリンク/宛先、認証処理のDB/SMTPエラー、外部連携のエラー、他の個別ルート/バックグラウンドサービス、DB監査ログのdetailsや保存済みログ、プロキシアクセスログは別途対策が必要です。既存ログの削除や権限変更は自動実行しません。APIエラー応答内の詳細情報も今回の変更対象外です。本番反映には別途リリースが必要です。

### 1. devへ順番に取り込む

- [ ] 第一弾の範囲・未解決リスクをIssue #197へ記録。対象外のdev差分があれば追加検証または次回へ分離。
- [ ] #198 → #199 → #200 → #201 → #203 → #202 → #204の順に取り込む。各dev pushのStagingデプロイ完了を待ち、複数のデプロイを同時に走らせない。
- [ ] #199取り込み後、#200のbaseをdevへ変更し、重複差分を除いてCIを確認。#200取り込み後、#201も同様に行う。親ブランチの差分を含めたままマージしない。
- [ ] dev向け各PRのフロント・バックエンドCI成功。#199でNode/bcrypt起動、#200でCLI起動、#201で実行UIDと書込み先、#203で実プロセスの権限制限、#202でDB再作成後の再接続を確認。
- [ ] 第一弾の全変更が揃ったdevでテストとビルドを確認。既存の隔離テスト結果は事前確認であり、この統合確認の代用にしない。

### 2. Stagingでリリース候補を確認する

検証用アカウント・架空データで確認します。この試験のために本番DB同期を実行しません。

- [ ] 公開画面、ライブ一覧・詳細、ログイン、管理画面の認可が正常。一般ユーザーは管理画面を利用できない。
- [ ] 認証済みの画像アップロード・表示・削除が正常。収集CLIの実行と必要な外部連携を確認。
- [ ] デプロイ時のマイグレーション成功、DB接続、DB再作成後のアプリ再接続、再起動後のpingと機能確認が成功。
- [ ] アプリの実UID/GID、CapEff/CapBnd=0、NoNewPrivs=1、必要な書込み先、コードへの書込み不可を確認。
- [ ] DBの公開設定、サーバー内・Docker内部の正規接続と別端末からの通常接続拒否を確認。LANの確認結果をWAN遮断の証明として扱わない。
- [ ] 各結果の候補SHA・日時・担当・成功/失敗・制約をIssue #197へ記録。未検証の対象機能を残したまま「確認済み」にしない。

### 本人に依頼するStaging確認

第一弾のログイン・認可・画像/OCR・DB再接続・権限確認は担当エンジニアが検証用データで実施します。本人のメールアドレスや外部サービスのアカウントは使いません。

2026-10-07のStaging点検では、メール送信とSpotifyの設定がなく、YouTubeのOAuth戻り先は本番でした。この状態で本人に連携確認を依頼しません。これらは第一弾で変更しない既存の設定不足としてIssue #196へ残し、専用のStaging認証情報と戻り先を整備後に確認します。本番は今回Node/systemdを変更しないため、第一弾だけで本番のメール・OAuthまで検証済みとはしません。

| 本人の確認 | 操作手順 | 合格条件 |
|:---|:---|:---|
| YouTubeのOAuth同意 | 担当者がStaging専用の戻り先・Google設定を確認後、Stagingで自分の検証アカウントにログイン → ライブ詳細の「YouTube Musicと連携してプレイリスト作成」 → Google画面で対象アカウントを選び同意 | Stagingへ戻り、連携成功。選んだライブの曲で自分のアカウントに検証用プレイリストが作られる。本番へ遷移しない |
| SpotifyのOAuth同意 | Staging専用の設定完了後、ライブ詳細の「Spotifyと連携してプレイリスト作成」 → 対象アカウントで同意 | Stagingへ戻り、連携成功。選んだ曲の検証用プレイリストが自分のアカウントに作られる |
| 実メール受信 | Staging用メール設定完了後、受信できる自分の検証アドレスで登録 → 認証メールのリンクを開く。再設定も同じ検証アカウントで行う | 差出人とリンク先がStaging用。認証後ログインでき、再設定したパスワードでログインできる |

結果は「確認項目・日時・合否・エラー文」を担当者へ伝えます。パスワード、メール内の認証URL、OAuthコード・トークンは貼りません。作成した検証プレイリストの削除は本人が行います。設定前の項目は「未確認」で維持します。

管理者確認が必要なサーバー点検は、SSHでサーバーに入り `sudo bash ~/.local/state/uver-security/server-admin-audit.sh` を実行します。設定は変更せず、権限600の報告ファイルを作成します。担当者へ実行完了だけを知らせ、生ログは公開Issueへ貼りません。この監査と本番Node/ユーザー分離は第一弾とは別の残件です。

### 3. 本番へ出せる条件を満たす

ここまで満たした状態を「リリース準備完了」とします。mainへマージする前に候補をレビューできる状態にします。

- [ ] dev→main PRに第一弾の差分、Stagingの確認結果、本番で変わる範囲と残件を記載。main向けCIも成功。
- [ ] 現在の本番コミット、Nodeパス、サービス設定を内容を公開せず記録。復旧担当と方法を確認。
- [ ] 既存バックアップの作成日時・600権限・チェックサム・隔離環境での復元確認を記録。新規バックアップの権限と失敗時停止は #198 の隔離試験結果を参照。復元確認のために本番DBへ書き込まない。
- [ ] 第一弾のDB差分がないことを確認。他の変更を含める場合は後方互換性と復旧可否を別途評価。
- [ ] 本番Node20の残存、本番ユーザー分離・FW/SSH等の未完了をリリースノートとIssueに明記し、第一弾の部分改善としてレビュー。
- [ ] 人間がdev→main PRをマージ。mainのCIと候補との差分を確認し、配備するmainのSHAを確定。
- [ ] バージョン方針に従って重複しないPATCH番号を選択。`release-tag.js` の固定文言・MINOR提案をそのまま使わず、今回の内容でノートを用意。

Releaseは検証したSHAを `gh release create <version> --target <main-sha> --draft --notes-file <notes-file>` でまずDraftにします。Draft作成は本番デプロイを起動しません。候補SHA・変更範囲・停止影響・残件のレビュー後、`gh release edit <version> --draft=false` で公開します。公開は本番デプロイを開始する操作です。

### 4. リリース完了を判定する

- [ ] 本番Actions成功。サーバーのHEADがRelease対象SHAと一致。
- [ ] `sudo systemctl status uver-setlist` でActive、PIDと起動時刻を確認。今回の再起動時刻になっていることを確認し、旧プロセス残存を見落とさない。
- [ ] サーバー内と公開URLのping、トップ、ログイン、ライブ一覧・詳細、必要なメール・外部連携・アップロードを確認。
- [ ] envと新しいバックアップの権限維持を確認。秘密値・ユーザー情報をログやIssueへ貼らない。
- [ ] 配備SHA・Actionsリンク・確認日時・結果・残件をIssue #197に記録。対象PRだけを完了とし、未解決項目を維持。

### 失敗したとき

Stagingで失敗したら次の取り込み・Release公開を止め、原因のPRを修正するかdevでrevertして再配備します。DBのボリュームを削除して復旧しません。
本番は直前の検証済みコミットへ戻す変更を通常のPR経路でmainへ取り込み、新しい復旧Releaseを公開します。既存タグの付け替えや既存Releaseの再実行に頼りません。第一弾はDBスキーマを変更しないため、DBリストアを通常のコード復旧に含めません。将来スキーマ変更を含める場合は、旧コード互換性を確認してから復旧方法を決めます。

---

最終更新日: 2026-10-07
