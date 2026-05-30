# エージェント会話ログ自動資産化フック (Agent Activity Logger)

本プロジェクトには、AIコーディングアシスタント（エージェント）との会話履歴・コマンド実行結果・解決ノウハウを自動的に Markdown 形式で資産化（アセット化）するグローバルフックが導入されています。

---

## 📌 1. 本プロジェクトにおける適用状況

本リポジトリは、開発者がエージェントと対話した履歴を自動で蓄積できるように安全にフックされています。

* **実体スクリプト**: `/home/haya-ryoo/.local/share/antigravity-logger/` (グローバル共通管理)
* **プロジェクト用 Git フック**: `.git/hooks/pre-push`
  * `git push`（または対話の完了時）に背後で自動的に動作します。
  * **安全ラップ構造**: 既存の pre-push フックがある場合は、元のフックを `pre-push.local` に退避した上で、既存処理が正常終了した場合にのみロガーが走るよう二重安全対策されています。

---

## ⚙️ 2. 環境変数による挙動制御 (.env)

本プロジェクトの `.env` または `.env.local` に以下の環境変数を定義することで、ログ出力の挙動を安全に制御できます。本フックは `AGENT_LOG_` から始まるキー以外の環境変数は一切無視し、他のシステム挙動を壊さないように独立設計されています。

```bash
# 1. 個人用 Obsidian 日誌の保存先 (WSLパスは自動で Linux マウントパスに置換されます)
AGENT_LOG_OBSIDIAN_DIR="C:\\Users\\oault\\ドキュメント\\Obsidian\\ローカル\\Daily"

# 2. 個人日誌 (Obsidian) にのみ保存し、共有リポジトリにはコミットしたくない場合 (既定: true)
AGENT_LOG_OBSIDIAN_ONLY=true

# 3. プロジェクト内にも活動履歴を残したい場合 (Opt-in)
# AGENT_LOG_OBSIDIAN_ONLY=false にした上で、リポジトリ内の保存先ディレクトリを指定します
# AGENT_LOG_PROJECT_DIR="docs/activity_logs"
```

> [!IMPORTANT]
> **情報漏洩防止のための安全機能 (Redaction)**
> 本リポジトリの Git 管理下にログを配置する場合（`AGENT_LOG_PROJECT_DIR` のオプトイン時）、スクリプトが自動的に `Notion APIキー` や `AWSシークレット` 等のセンシティブなシークレットキーを検出し、**`[REDACTED]`** に一括で自動マスク（置き換え）します。生の情報が誤ってコミットされることはありません。

---

## 🌐 3. 他のプロジェクト（ワークスペース）で同じ仕組みを使う方法

本プロジェクト以外の別のGitプロジェクトや、新規作成したリポジトリでも同じ自動資産化フックを使用したい場合は、その**プロジェクトのルートディレクトリで以下のコマンドを1回実行するだけ**で、安全にフックが自動インストールされます。

```bash
node /home/haya-ryoo/.local/share/antigravity-logger/install-logger-hook.cjs
```

これにより、すべての開発スペースで一元化された安全な自動資産化が有効化されます。

---

## 🔗 4. 詳細仕様
アーキテクチャの構成、詳細な安全設計（冪等性の確保、WSL解決ロジック、Redaction対象等）は、グローバルの詳細仕様書を参照してください。
👉 **[グローバル詳細仕様書 (README.md)](file:///home/haya-ryoo/.local/share/antigravity-logger/README.md)**
