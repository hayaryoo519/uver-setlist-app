# 実際のデータベーススキーマ (Actual DB Schema)

## album_cache

| カラム名 | 型 | NULL許容 | デフォルト値 |
| --- | --- | --- | --- |
| album_title | character varying(255) | NO |  |
| image_url | text | NO |  |
| updated_at | timestamp with time zone | YES | CURRENT_TIMESTAMP |

### 制約 (Constraints)

| 制約名 | 制約タイプ | 対象カラム | 参照先テーブル | 参照先カラム |
| --- | --- | --- | --- | --- |
| album_cache_pkey | PRIMARY KEY | album_title | album_cache | album_title |

## attendance

| カラム名 | 型 | NULL許容 | デフォルト値 |
| --- | --- | --- | --- |
| user_id | integer | NO |  |
| live_id | integer | NO |  |
| created_at | timestamp without time zone | YES | CURRENT_TIMESTAMP |

### 制約 (Constraints)

| 制約名 | 制約タイプ | 対象カラム | 参照先テーブル | 参照先カラム |
| --- | --- | --- | --- | --- |
| attendance_pkey | PRIMARY KEY | user_id | attendance | user_id |
| attendance_pkey | PRIMARY KEY | user_id | attendance | live_id |
| attendance_pkey | PRIMARY KEY | live_id | attendance | user_id |
| attendance_pkey | PRIMARY KEY | live_id | attendance | live_id |
| attendance_live_id_fkey | FOREIGN KEY | live_id | lives | id |
| attendance_user_id_fkey | FOREIGN KEY | user_id | users | id |

## collector_logs

| カラム名 | 型 | NULL許容 | デフォルト値 |
| --- | --- | --- | --- |
| id | integer | NO | nextval('collector_logs_id_seq'::regclass) |
| level | character varying(10) | YES |  |
| message | text | YES |  |
| details | jsonb | YES |  |
| created_at | timestamp with time zone | YES | CURRENT_TIMESTAMP |

### 制約 (Constraints)

| 制約名 | 制約タイプ | 対象カラム | 参照先テーブル | 参照先カラム |
| --- | --- | --- | --- | --- |
| collector_logs_pkey | PRIMARY KEY | id | collector_logs | id |

## corrections

| カラム名 | 型 | NULL許容 | デフォルト値 |
| --- | --- | --- | --- |
| id | integer | NO | nextval('corrections_id_seq'::regclass) |
| user_id | integer | YES |  |
| live_id | integer | YES |  |
| live_date | text | YES |  |
| live_venue | text | YES |  |
| live_title | text | YES |  |
| correction_type | text | NO |  |
| description | text | NO |  |
| status | text | YES | 'pending'::text |
| created_at | timestamp without time zone | YES | CURRENT_TIMESTAMP |
| reviewed_at | timestamp without time zone | YES |  |
| reviewed_by | integer | YES |  |
| admin_note | text | YES |  |
| suggested_data | jsonb | YES |  |

### 制約 (Constraints)

| 制約名 | 制約タイプ | 対象カラム | 参照先テーブル | 参照先カラム |
| --- | --- | --- | --- | --- |
| corrections_pkey | PRIMARY KEY | id | corrections | id |
| corrections_live_id_fkey | FOREIGN KEY | live_id | lives | id |
| corrections_reviewed_by_fkey | FOREIGN KEY | reviewed_by | users | id |
| corrections_user_id_fkey | FOREIGN KEY | user_id | users | id |

## lives

| カラム名 | 型 | NULL許容 | デフォルト値 |
| --- | --- | --- | --- |
| id | integer | NO | nextval('lives_id_seq'::regclass) |
| date | date | NO |  |
| venue | character varying(255) | NO |  |
| title | character varying(255) | YES |  |
| tour_name | character varying(255) | YES |  |
| type | character varying(50) | YES |  |
| prefecture | character varying(50) | YES |  |
| special_note | character varying(255) | YES |  |
| setlistfm_id | character varying | YES |  |
| setlist_status | character varying | YES |  |
| import_metadata | jsonb | YES |  |
| normalized_tour_name | text | YES |  |
| normalized_title | text | YES |  |
| normalized_venue | text | YES |  |
| external_source_id | text | YES |  |
| normalization_version | text | YES |  |

### 制約 (Constraints)

| 制約名 | 制約タイプ | 対象カラム | 参照先テーブル | 参照先カラム |
| --- | --- | --- | --- | --- |
| lives_pkey | PRIMARY KEY | id | lives | id |

## playlist_history

| カラム名 | 型 | NULL許容 | デフォルト値 |
| --- | --- | --- | --- |
| id | integer | NO | nextval('playlist_history_id_seq'::regclass) |
| user_id | integer | YES |  |
| live_id | integer | YES |  |
| playlist_id | text | NO |  |
| created_at | timestamp with time zone | YES | CURRENT_TIMESTAMP |
| platform | character varying(20) | YES | 'spotify'::character varying |

### 制約 (Constraints)

| 制約名 | 制約タイプ | 対象カラム | 参照先テーブル | 参照先カラム |
| --- | --- | --- | --- | --- |
| playlist_history_pkey | PRIMARY KEY | id | playlist_history | id |
| playlist_history_live_id_fkey | FOREIGN KEY | live_id | lives | id |
| playlist_history_user_id_fkey | FOREIGN KEY | user_id | users | id |

## prediction_likes

| カラム名 | 型 | NULL許容 | デフォルト値 |
| --- | --- | --- | --- |
| prediction_id | integer | NO |  |
| user_id | integer | NO |  |
| created_at | timestamp without time zone | YES | now() |

### 制約 (Constraints)

| 制約名 | 制約タイプ | 対象カラム | 参照先テーブル | 参照先カラム |
| --- | --- | --- | --- | --- |
| prediction_likes_pkey | PRIMARY KEY | prediction_id | prediction_likes | prediction_id |
| prediction_likes_pkey | PRIMARY KEY | prediction_id | prediction_likes | user_id |
| prediction_likes_pkey | PRIMARY KEY | user_id | prediction_likes | prediction_id |
| prediction_likes_pkey | PRIMARY KEY | user_id | prediction_likes | user_id |
| prediction_likes_prediction_id_fkey | FOREIGN KEY | prediction_id | predictions | id |
| prediction_likes_user_id_fkey | FOREIGN KEY | user_id | users | id |

## prediction_scores

| カラム名 | 型 | NULL許容 | デフォルト値 |
| --- | --- | --- | --- |
| id | integer | NO | nextval('prediction_scores_id_seq'::regclass) |
| prediction_id | integer | NO |  |
| live_id | integer | NO |  |
| user_id | integer | NO |  |
| predicted_count | integer | NO | 0 |
| actual_count | integer | NO | 0 |
| matched_count | integer | NO | 0 |
| position_matched | integer | NO | 0 |
| max_streak | integer | NO | 0 |
| match_score | numeric | NO | 0 |
| position_score | numeric | NO | 0 |
| streak_bonus | numeric | NO | 0 |
| total_score | numeric | NO | 0 |
| rank | integer | YES |  |
| calculated_at | timestamp without time zone | YES | now() |

### 制約 (Constraints)

| 制約名 | 制約タイプ | 対象カラム | 参照先テーブル | 参照先カラム |
| --- | --- | --- | --- | --- |
| prediction_scores_pkey | PRIMARY KEY | id | prediction_scores | id |
| prediction_scores_prediction_id_key | UNIQUE | prediction_id | prediction_scores | prediction_id |
| prediction_scores_prediction_id_fkey | FOREIGN KEY | prediction_id | predictions | id |
| prediction_scores_live_id_fkey | FOREIGN KEY | live_id | lives | id |
| prediction_scores_user_id_fkey | FOREIGN KEY | user_id | users | id |

## prediction_songs

| カラム名 | 型 | NULL許容 | デフォルト値 |
| --- | --- | --- | --- |
| id | integer | NO | nextval('prediction_songs_id_seq'::regclass) |
| prediction_id | integer | NO |  |
| song_id | integer | NO |  |
| position | integer | NO |  |

### 制約 (Constraints)

| 制約名 | 制約タイプ | 対象カラム | 参照先テーブル | 参照先カラム |
| --- | --- | --- | --- | --- |
| prediction_songs_pkey | PRIMARY KEY | id | prediction_songs | id |
| prediction_songs_prediction_id_fkey | FOREIGN KEY | prediction_id | predictions | id |
| prediction_songs_song_id_fkey | FOREIGN KEY | song_id | songs | id |

## predictions

| カラム名 | 型 | NULL許容 | デフォルト値 |
| --- | --- | --- | --- |
| id | integer | NO | nextval('predictions_id_seq'::regclass) |
| user_id | integer | NO |  |
| live_id | integer | YES |  |
| title | character varying(255) | YES | 'セットリスト予想'::character varying |
| created_at | timestamp without time zone | YES | now() |
| updated_at | timestamp without time zone | YES | now() |
| deleted_at | timestamp without time zone | YES |  |

### 制約 (Constraints)

| 制約名 | 制約タイプ | 対象カラム | 参照先テーブル | 参照先カラム |
| --- | --- | --- | --- | --- |
| predictions_pkey | PRIMARY KEY | id | predictions | id |
| predictions_live_id_fkey | FOREIGN KEY | live_id | lives | id |
| predictions_user_id_fkey | FOREIGN KEY | user_id | users | id |

## push_subscriptions

| カラム名 | 型 | NULL許容 | デフォルト値 |
| --- | --- | --- | --- |
| id | integer | NO | nextval('push_subscriptions_id_seq'::regclass) |
| user_id | integer | YES |  |
| endpoint | text | NO |  |
| p256dh | text | NO |  |
| auth | text | NO |  |
| created_at | timestamp without time zone | YES | now() |

### 制約 (Constraints)

| 制約名 | 制約タイプ | 対象カラム | 参照先テーブル | 参照先カラム |
| --- | --- | --- | --- | --- |
| push_subscriptions_endpoint_key | UNIQUE | endpoint | push_subscriptions | endpoint |
| push_subscriptions_pkey | PRIMARY KEY | id | push_subscriptions | id |
| push_subscriptions_user_id_fkey | FOREIGN KEY | user_id | users | id |

## raw_setlists

| カラム名 | 型 | NULL許容 | デフォルト値 |
| --- | --- | --- | --- |
| id | integer | NO | nextval('raw_setlists_id_seq'::regclass) |
| live_id | integer | YES |  |
| source | character varying(50) | NO | 'manual'::character varying |
| raw_text | text | NO |  |
| parsed_json | jsonb | YES |  |
| status | character varying(20) | NO | 'pending'::character varying |
| created_at | timestamp without time zone | YES | now() |
| updated_at | timestamp without time zone | YES | now() |
| raw_image_url | text | YES |  |
| source_url | text | YES |  |
| duplicate_count | integer | YES | 1 |
| official_setlist | boolean | YES | false |
| raw_text_hash | character varying(32) | YES |  |
| confidence | numeric | YES |  |

### 制約 (Constraints)

| 制約名 | 制約タイプ | 対象カラム | 参照先テーブル | 参照先カラム |
| --- | --- | --- | --- | --- |
| raw_setlists_pkey | PRIMARY KEY | id | raw_setlists | id |
| raw_setlists_live_id_fkey | FOREIGN KEY | live_id | lives | id |

## schema_migrations

| カラム名 | 型 | NULL許容 | デフォルト値 |
| --- | --- | --- | --- |
| id | integer | NO | nextval('schema_migrations_id_seq'::regclass) |
| filename | character varying(255) | NO |  |
| applied_at | timestamp without time zone | YES | now() |

### 制約 (Constraints)

| 制約名 | 制約タイプ | 対象カラム | 参照先テーブル | 参照先カラム |
| --- | --- | --- | --- | --- |
| schema_migrations_filename_key | UNIQUE | filename | schema_migrations | filename |
| schema_migrations_pkey | PRIMARY KEY | id | schema_migrations | id |

## security_logs

| カラム名 | 型 | NULL許容 | デフォルト値 |
| --- | --- | --- | --- |
| id | integer | NO | nextval('security_logs_id_seq'::regclass) |
| timestamp | timestamp without time zone | YES | now() |
| event_type | character varying(50) | NO |  |
| message | text | YES |  |
| user_email | character varying(255) | YES |  |
| ip_address | character varying(45) | YES |  |
| details | jsonb | YES |  |
| created_at | timestamp without time zone | YES | now() |

### 制約 (Constraints)

| 制約名 | 制約タイプ | 対象カラム | 参照先テーブル | 参照先カラム |
| --- | --- | --- | --- | --- |
| security_logs_pkey | PRIMARY KEY | id | security_logs | id |

## setlists

| カラム名 | 型 | NULL許容 | デフォルト値 |
| --- | --- | --- | --- |
| id | integer | NO | nextval('setlists_id_seq'::regclass) |
| live_id | integer | YES |  |
| song_id | integer | YES |  |
| position | integer | YES |  |
| note | character varying(255) | YES |  |

### 制約 (Constraints)

| 制約名 | 制約タイプ | 対象カラム | 参照先テーブル | 参照先カラム |
| --- | --- | --- | --- | --- |
| setlists_pkey | PRIMARY KEY | id | setlists | id |
| setlists_live_id_fkey | FOREIGN KEY | live_id | lives | id |
| setlists_song_id_fkey | FOREIGN KEY | song_id | songs | id |

## songs

| カラム名 | 型 | NULL許容 | デフォルト値 |
| --- | --- | --- | --- |
| id | integer | NO | nextval('songs_id_seq'::regclass) |
| title | character varying(255) | NO |  |
| album | character varying(255) | YES |  |
| release_year | integer | YES |  |
| mv_url | character varying(255) | YES |  |
| author | character varying(255) | YES |  |
| image_url | text | YES |  |
| normalized_title | character varying | YES |  |
| spotify_track_id | text | YES |  |
| yt_video_id | text | YES |  |
| deleted_at | timestamp with time zone | YES |  |

### 制約 (Constraints)

| 制約名 | 制約タイプ | 対象カラム | 参照先テーブル | 参照先カラム |
| --- | --- | --- | --- | --- |
| songs_pkey | PRIMARY KEY | id | songs | id |
| songs_title_key | UNIQUE | title | songs | title |

## user_follows

| カラム名 | 型 | NULL許容 | デフォルト値 |
| --- | --- | --- | --- |
| follower_id | integer | NO |  |
| following_id | integer | NO |  |
| created_at | timestamp without time zone | YES | now() |

### 制約 (Constraints)

| 制約名 | 制約タイプ | 対象カラム | 参照先テーブル | 参照先カラム |
| --- | --- | --- | --- | --- |
| user_follows_pkey | PRIMARY KEY | follower_id | user_follows | follower_id |
| user_follows_pkey | PRIMARY KEY | follower_id | user_follows | following_id |
| user_follows_pkey | PRIMARY KEY | following_id | user_follows | follower_id |
| user_follows_pkey | PRIMARY KEY | following_id | user_follows | following_id |
| user_follows_follower_id_fkey | FOREIGN KEY | follower_id | users | id |
| user_follows_following_id_fkey | FOREIGN KEY | following_id | users | id |

## user_google_tokens

| カラム名 | 型 | NULL許容 | デフォルト値 |
| --- | --- | --- | --- |
| user_id | integer | NO |  |
| access_token | text | NO |  |
| refresh_token_encrypted | text | NO |  |
| encryption_version | integer | NO | 1 |
| expires_at | timestamp with time zone | NO |  |
| updated_at | timestamp with time zone | YES | CURRENT_TIMESTAMP |

### 制約 (Constraints)

| 制約名 | 制約タイプ | 対象カラム | 参照先テーブル | 参照先カラム |
| --- | --- | --- | --- | --- |
| user_google_tokens_pkey | PRIMARY KEY | user_id | user_google_tokens | user_id |
| user_google_tokens_user_id_fkey | FOREIGN KEY | user_id | users | id |

## user_spotify_tokens

| カラム名 | 型 | NULL許容 | デフォルト値 |
| --- | --- | --- | --- |
| user_id | integer | NO |  |
| access_token | text | NO |  |
| refresh_token_encrypted | text | NO |  |
| encryption_version | integer | NO | 1 |
| expires_at | timestamp with time zone | NO |  |
| updated_at | timestamp with time zone | YES | CURRENT_TIMESTAMP |

### 制約 (Constraints)

| 制約名 | 制約タイプ | 対象カラム | 参照先テーブル | 参照先カラム |
| --- | --- | --- | --- | --- |
| user_spotify_tokens_pkey | PRIMARY KEY | user_id | user_spotify_tokens | user_id |
| user_spotify_tokens_user_id_fkey | FOREIGN KEY | user_id | users | id |

## users

| カラム名 | 型 | NULL許容 | デフォルト値 |
| --- | --- | --- | --- |
| id | integer | NO | nextval('users_id_seq'::regclass) |
| username | character varying(255) | YES |  |
| email | character varying(255) | NO |  |
| password | character varying(255) | NO |  |
| role | character varying(50) | YES | 'user'::character varying |
| created_at | timestamp without time zone | YES | CURRENT_TIMESTAMP |
| is_verified | boolean | YES | false |
| verification_token | text | YES |  |
| reset_password_token | character varying(255) | YES |  |
| reset_password_expires | bigint | YES |  |
| is_public | boolean | NO | true |
| deleted_at | timestamp with time zone | YES |  |

### 制約 (Constraints)

| 制約名 | 制約タイプ | 対象カラム | 参照先テーブル | 参照先カラム |
| --- | --- | --- | --- | --- |
| users_email_key | UNIQUE | email | users | email |
| users_pkey | PRIMARY KEY | id | users | id |

