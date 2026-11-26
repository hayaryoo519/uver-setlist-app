# Issue #273: 曲の表記揺れと安全な整理案

## 今回変更する範囲

本番データは変更しない。スキーマ変更・既存ID移動・曲削除・alias導入はない。

- `songIdentity.js` に登録時の共通判定を置く。**自動的に同一と扱う表記揺れは、確認済みの `ROSIER (LUNA SEA cover)` 系だけ**。括弧の全半角、大小文字、連続空白、括弧内外の空白を吸収する。`LUNA SEA`、`cover` の語を消したり、共演者・版・別アーティストを除去しない。
- 既存の完全一致IDを優先する。381/462の両方が残る現状で、どちらとも完全一致しない表記は曖昧なので409。勝手に381へ付け替えない。1候補なら取り込みで再利用する。
- 手動POSTは表記aliasの別タイトルや既存authorと異なるauthorを受けたら409にし、配信ID等を上書きしない。修正は管理者のID指定PUTで行う。
- 未レビューの大小文字/空白/括弧違いも、新たな重複を作るのではなく409で確認を求める。異なる曲を一律自動統合しない。取り込みで既存IDを明示できる場合は確認後にそれを指定する。CSV/年次収集等のID指定がない画面では、登録済みの正確なタイトルに修正して再実行する。
- 従来辞書の注記なしの正式名変換は手動POST/年次収集で維持する。完全一致既存IDは辞書変換より優先。CSV/ドラフト/単件取り込みに新しい辞書変換は追加しない。括弧付き辞書で注記が落ちる場合は自動翻訳せず、既存訳曲があるなら409で止める（Acoustic/SE/Awakening等の判断は人に残す）。
- 論理削除曲だけが一致する場合は409で止める。暗黙に復元・参照しない。復元時も既存同一候補との衝突を拒否する。
- 書き込みは同じchecked-out clientのトランザクション内で行う。登録系はBEGIN直後に共通advisory lockを取り、再検索後に作成する。新規行には従来形式のnormalized_titleも保存し、改名時は同時更新する。既存normalized_titleの一括補正はしない。

全曲SELECTは現状272曲の小規模カタログに限定した最小変更。将来の増加時には、承認済みalias/identityのDBモデルと索引へ段階移行する。アプリ外の直接SQLや旧コードは共通lockに参加しないため、恒久的なDB一意制約を置いたとの保証はしない。

## 調査した登録・参照経路

| 経路 | 調査結果 / 今回の対応 |
|---|---|
| `routes/songs.js` POST/PUT/restore | 旧POSTは翻訳後title完全一致、PUTは無正規化。共通判定と単一clientのトランザクションに変更。削除は既存の論理削除を維持 |
| `routes/lives.js` import-setlist | title完全一致後に作成していた。共通resolverに変更。pool.queryのBEGIN/COMMITでは同一接続を保証しないため、この経路だけ専用clientに修正 |
| `routes/import.js` CSV | title完全一致。共通resolver、全CSVの既存トランザクション維持。既存セトリを置換する仕様自体は変更しない |
| `routes/drafts.js` commit | UPPER/空白除去で検索。共通resolverに変更。明示songIdはそのまま保持。曖昧なタイトルは全体ROLLBACK |
| `services/collectYears.js` | 辞書変換後normalized_title検索/作成。共通resolverと従来の注記なし辞書変換に変更、公演単位ROLLBACK維持。曖昧な曲の公演は失敗として記録 |
| `routes/external_api.js` | 外部検索/候補返却。曲マスタを作成しない。setlist.fmの構造化cover/with情報を曲identityへ自動推測しない |
| `services/collector.js`, drafts解析 | normalized_title/fuzzy照合で候補IDを付けるが曲は作成しない。既存の曖昧な自動候補は管理者レビューが必要。候補照合全体の変更は今回対象外 |
| `scripts/seed_local.js` | 開発用の破壊的初期化・固定シード。オンライン登録経路ではない。今回は実行しない |
| Spotify/YouTube/music | 曲IDに配信ID・画像を更新するだけ。曲作成はない。既存マッピングの競合は統合時に人が確認 |

既知の永続参照は次のとおり。**公開statsの0公演は参照0の証拠ではない**。

- FK: `setlists.song_id`（position/noteを含む）、`prediction_songs.song_id`。どちらもsongsの物理削除時CASCADE。物理削除は参照喪失につながる。
- 非FK: `raw_setlists.parsed_json`の` song_id`/`songId`等、修正申請`corrections`の自由入力、監査/収集ログのJSON/本文、SNS下書き/公開済み本文、キャッシュ・保存済みバックアップ。これらに対象ID/曲名が含まれる可能性がある。公開APIだけで件数確定はできない。歴史的本文を一括置換しない。
- `playlist_history`は公演ID/外部playlist IDを保持（曲への直接FKなし）。作成済み外部playlistには曲移動が自動反映されない。再作成や外部API呼び出しはしない。
- 読み取り: songsのstats/timeline、livesのsongIdsフィルター/セットリスト、predictions、users参戦曲、statsランキング、socialPosts/今日のライブ、Spotify/YouTubeのplaylist生成、CSV/export/管理backup、フロントの曲詳細/一覧/予想/管理編集。共有URLは数値IDと旧title指定の両方を考慮する。React Queryのsongs/lives/predictions/statsキャッシュは将来の統合時に無効化する。

## 公開データからの候補

公開GET `/api/songs` の272曲全件と、下記各IDの公開 `/api/songs/:id/stats` を確認した。括弧の全半角・大小文字・空白を揃えたグルーピングでは **381/462の1組のみ**。辞書変換と記号除去も加えた監査で353/203が追加された。これは候補抽出であり統合判定ではない。

| ID / タイトル | stats公演数 | 判断根拠・扱い |
|---|---:|---|
| 381 ROSIER （LUNA SEA Cover） / 462 ROSIER (LUNA SEA cover) | 1 / 0（Issue記載） | 字面の括弧・caseだけが異なり、同じcover元表記。381保持候補。参照・配信ID確認後の承認まで統合しない |
| 463 ROSIER (LUNA SEAカバーw/RYUICHIさん) | 1（Issue記載） | 共演者注記が意味を持つ。**独立曲のまま保護** |
| 353 Secret / 203 シークレット | 0 / 9 | 既存翻訳辞書がSecretをシークレットへ写す。正式曲/別名の根拠を確認すべき候補。既存の353完全一致は維持し、自動統合しない |
| 361 バーベル / 207 バーベル～皇帝の新しい服 album ver.～ | 6 / 87 | 共通語幹だがalbum ver.は版情報。別版の可能性があり統合不可、原演奏記録確認 |
| 431 over the stoic～和音 / 461 和音〜over the stoic / 167 over the stoic | 21 / 1 / 123 | 複合演奏・順序差の可能性。表記統一候補とは区別し、組曲/メドレーの扱いを確認 |
| 348 CHANCE!04 / 7 CHANCE! | 0 / 288 | 数字は初期版等の意味があり得る。同じ語幹だけでは統合不可 |
| 448 laka / 103 シャカビーチ〜Laka Laka La〜 | 1 / 124 | 短縮・一部演奏の可能性。1公演の原セットリスト確認が必要。文字列類似だけでは統合不可 |

再調査は公開GETのJSONを一時ファイルへ取得し、NFKC→lowercase→連続空白を1個→括弧前後空白除去のキーでグループ化する。追加監査のみsongTranslations辞書と記号除去を使う。監査キーを登録時の自動統合キーとして流用しない。公開データの生スナップショット・会話・実行ログ・資格情報はGitへ入れない。

## 381/462整理の設計案（未実装・未実行）

### 実行前ゲート

1. 保持ID381、462をaliasとして扱うこと、タイトル/配信ID/album/author等の競合解決方針を人が承認する。463は触らない。
2. 本番接続を伴う作業は別途承認された運用だけで行う。このPRはその実行権限を与えない。DBカタログから実際の全FKを再列挙し、既知2表以外があれば停止。JSON/自由入力/クライアント保存値も非公開の管理手順で棚卸しする。
3. 匿名化した隔離fixtureで、本番と同じスキーマの復元・競合・旧URL・stats・予想・draft再確定を検証。権限保護したバックアップと更新対象行のbefore-imageを保存し、復元可能性を確認。アプリ/収集・通知・並行書き込みを停止したメンテナンス枠を確保する。

### 提案するモデルと移行

- `song_aliases`案: source_song_id 462 → canonical_song_id 381、旧タイトルも保持。移行用マイグレーションは別PRで後方互換に追加。循環/多段aliasを禁止し、削除・復元・renameと外部keyの規約を定義する。
- 新コードはstats/timeline/数値・title検索/ドラフトID解決のすべてでaliasを解決し、旧462 URLから381へ誘導できるようにする。旧行を消したり単にsoft-deleteするだけでは旧URL/旧クライアントを保護できないため禁止。
- aliasを読む新旧共存段階の検証後、単一トランザクションで対象曲と関連行をlock、setlists・prediction_songs・承認済みdraft JSON参照を更新する。既存位置・note・順序は保持。1公演に両IDがある場合は機械的に行削除せず、人が重複演奏か再演かを判断してから計画する。
- 統計は`COUNT(DISTINCT live_id)`の和集合で比較し、1/0の単純加算やCOUNT行数を合格条件にしない。未来/削除公演の扱いも現行APIと合わせる。
- 旧曲ID行とaliasを残し、旧コードへ戻した場合の一覧二重表示/統計分散も評価する。alias対応前の旧コードへの安易なロールバックは避ける。

### 復旧手順案

- COMMIT前: 1件でも整合性/旧URL/統計検証が不一致ならROLLBACK、メンテナンス停止維持。
- COMMIT後: 書き込み停止を維持し、before-imageに記録した**行ID単位**で逆変換する別の復旧トランザクションを承認して適用する。`WHERE song_id=381`の一括逆更新は、元々381だった参照まで壊すので禁止。統合後に追加された参照の帰属も確認する。
- 全体リストアは新規ユーザーデータを失うため最終手段。隔離復元→差分確認→承認を経る。コードは復旧PR経由、force push/既存migration改変/本番手動SQLをしない。
- 復旧時も463のID/タイトル/参照/note、予想のposition、旧462 URLとstats、総公演和集合、配信ID・外部playlist非更新を確認する。

### 463の未決事項

共演情報を`setlists.note`へ保持する案と、曲ごとの演奏単位の構造化参加者を導入する案は未決。既存の`live_collaborators`は公演単位であり曲単位のRYUICHI共演を表現できると仮定しない。どのUI/API/検索で共演情報を表示するか、旧463 URLをどうするかを含めて別途判断が必要。このPRでモデルを推測実装しない。

## 検証

通常の`server/index.js`は起動しない。実取り込み・通知・OAuth・メール送信は実行しない。

```powershell
cd server
npm test -- --runInBand
# PostgreSQL18のbinだけを使用。新しい専用一時clusterを作成し終了時に自身だけ停止・削除する。
$env:PG_BIN='C:/Program Files/PostgreSQL/18/bin'
node scripts/test-song-identity-db.js
cd ..
npm test -- --run
npm run build
```

DB検証は既存.env/db.jsを読まず、未使用ポート/127.0.0.1 bind/ランダムSCRAM資格情報/専用一時data directoryで新規clusterを起動する。全migration適用、表記揺れ再取込、並行作成、異なる曲/artist/version/guest、既存参照保持、手動作成/改名/再登録/CSV/単件/ドラフト、置換失敗時ROLLBACK、旧数値URL/stats、参照更新リハーサルのROLLBACKを検証する。認証はこのスクリプトでは隔離スタブなので、認可の確認は別のJest回帰テストに依存する。

実施結果: devベースの最終差分でbackend Jest 62 suites / 810 tests、frontend Vitest 32 files / 262 tests、production build、上記隔離PostgreSQL18検証はすべて成功。buildには既存の500KB超chunk警告がある。Claudeによる独立レビューで重要指摘を修正し、最終再確認では重要残存なし。認証・通知・既存DBを使う動作検証やDocker/Node24検証はしていない。

統合リハーサルは合成fixtureのsetlists・prediction_songs更新とROLLBACKまで。alias解決/恒久統合/COMMIT後復旧/本番参照件数の確認を完了したとは扱わない。

## 発見した既存不一致・制約

- 本修正以前に改名されて古いnormalized_titleを持つ既存曲は一括補正しない。そのキーと新規登録が衝突した場合、既存一意制約で保存は拒否されるが500になる場合がある。別途監査・承認後の補正が必要。
- 全migrationを新規DBへ適用しても`lives.status`は存在しないがCSVが書き込む。今回のDB検証はこの既存不一致を検出した後、**合成fixture内だけ**status列を追加して登録経路を検証した。製品migrationは変更していない。新規DBでのCSV利用には別途修正が必要。
- `DEVELOPMENT.md`はnpm run devで両サーバー起動と記載するがroot scriptはViteのみ。ポートも8000/9000等の古い記載がある。AGENTS/現行workflowの5173・API3001・Staging9001に従い、今回はどちらも通常起動しない。
- `DEVELOPMENT.md`のmainマージで本番反映という記述は現行Release publishトリガーと異なる。
- `docs/environments.md`のorigin/main resetによる配備説明は現行workflowのRelease対象SHA固定と異なる。同文書の同期・ユーザーのダミー化説明も現行syncのクリア方式と異なる。`docs/db_operations.md`の新Staging鍵+不存在ユーザーJWTで200という古い確認項目は現在の現行ユーザー認証では403になる。いずれも今回実行しない。
- `docs/social_post_playbook.md`には本番DBでSQLを実行する手順があるが、今回のAGENTS/Issueの本番DB直接操作禁止を優先する。
- `CLAUDE.md`のmigrationをserver/scriptsへ置く表現とAGENTSのserver/migrationsへSQL追加が不一致。今回はスキーマ変更なし。
- 開発基準Node24に対し検証マシンはNode22。Docker Desktop engineが停止中のためDocker検証は未実施。既存サービスを起動せず専用PostgreSQL18だけで検証する。
