-- 検証DB専用。sync-db.shからON_ERROR_STOP/単一トランザクションで実行する。
-- 必須の既存テーブルがない/SQLが失敗した場合は同期全体を失敗させる。
UPDATE public.users SET
    email = 'dummy_' || id || '@example.com',
    username = 'user_' || id,
    password = 'anonymized_hash',
    verification_token = NULL,
    reset_password_token = NULL,
    reset_password_expires = NULL;

TRUNCATE TABLE public.security_logs CASCADE;
TRUNCATE TABLE public.push_subscriptions CASCADE;
TRUNCATE TABLE public.collector_logs CASCADE;

UPDATE public.corrections SET
    description = '（非公開）',
    suggested_data = NULL,
    admin_note = NULL;

-- 古いバックアップにない任意テーブルだけスキップする。
-- OAuth資格情報/個人の外部プレイリスト履歴/未公開下書き/送信キューは持ち出さない。
-- CASCADEしない: 将来の未知の依存で失敗したら全体を巻き戻し、公開停止を継続する。
DO $sanitize_integrations$
DECLARE
    table_name TEXT;
BEGIN
    FOREACH table_name IN ARRAY ARRAY['user_spotify_tokens', 'user_google_tokens', 'playlist_history', 'raw_setlists', 'social_posts'] LOOP
        IF to_regclass(format('public.%I', table_name)) IS NOT NULL THEN
            EXECUTE format('TRUNCATE TABLE public.%I RESTART IDENTITY', table_name);
        END IF;
    END LOOP;
    IF EXISTS (SELECT 1 FROM information_schema.columns AS columns
               WHERE columns.table_schema = 'public' AND columns.table_name = 'lives' AND columns.column_name = 'import_metadata') THEN
        UPDATE public.lives SET import_metadata = NULL;
    END IF;
END;
$sanitize_integrations$;

-- 自由記述や未知の値をタグ配列に残さない。関数はこのpsql接続内だけの一時スキーマに置く。
CREATE FUNCTION pg_temp.public_live_tags(input_tags JSONB) RETURNS JSONB
LANGUAGE sql IMMUTABLE AS $tags$
    SELECT COALESCE(jsonb_agg(tag ORDER BY position), '[]'::jsonb)
    FROM jsonb_array_elements(input_tags) WITH ORDINALITY AS entries(tag, position)
    WHERE tag IN ('"mens"'::jsonb, '"womens"'::jsonb, '"birthday"'::jsonb,
                  '"christmas"'::jsonb, '"anniversary"'::jsonb, '"vs"'::jsonb);
$tags$;

-- 030/031より古いバックアップも扱う。存在する新テーブルの処理失敗は隠さない。
DO $sanitize_metadata$
BEGIN
    IF to_regclass('public.live_metadata') IS NOT NULL THEN
        UPDATE public.live_metadata AS lm SET
            -- 公開に使うタグだけ残す。未保存と明示的な空タグの違いを維持する。
            -- original/sources/sourceId/sourceUrl/国・メンバー候補/不一致等はコピーしない。
            candidates = CASE WHEN lm.candidates ? 'tags'
                THEN jsonb_build_object('tags', pg_temp.public_live_tags(lm.candidates->'tags'))
                ELSE '{}'::jsonb END,
            -- 公開用手動設定を既知のフィールドだけ再構築する。
            -- classificationや将来追加される自由記述を含む未知キーは持ち出さない。
            overrides = jsonb_strip_nulls(jsonb_build_object(
                'tagOverrides', CASE WHEN jsonb_typeof(lm.overrides->'tagOverrides') = 'object'
                    THEN jsonb_build_object('add', pg_temp.public_live_tags(lm.overrides #> '{tagOverrides,add}'), 'remove', pg_temp.public_live_tags(lm.overrides #> '{tagOverrides,remove}')) END,
                'country', CASE WHEN jsonb_typeof(lm.overrides->'country') = 'object'
                    THEN jsonb_build_object('code', lm.overrides #> '{country,code}') END,
                'members', CASE WHEN jsonb_typeof(lm.overrides->'members') = 'object'
                    THEN jsonb_build_object('ids', lm.overrides #> '{members,ids}') END,
                'participants', CASE WHEN jsonb_typeof(lm.overrides->'participants') = 'object'
                    THEN jsonb_build_object('items', COALESCE((
                        SELECT jsonb_agg(jsonb_build_object('artistId', item->'artistId', 'role', item->'role') ORDER BY position)
                        FROM jsonb_array_elements(lm.overrides #> '{participants,items}') WITH ORDINALITY AS entries(item, position)
                    ), '[]'::jsonb)) END
            ));
    END IF;
    -- 履歴のbefore/after JSONにも原文・管理メモ・管理者IDが残るため、全件除外する。
    IF to_regclass('public.live_metadata_history') IS NOT NULL THEN
        TRUNCATE TABLE public.live_metadata_history RESTART IDENTITY;
    END IF;
    IF to_regclass('public.live_artist_history') IS NOT NULL THEN
        TRUNCATE TABLE public.live_artist_history RESTART IDENTITY;
    END IF;
    -- live_artistsの公開名称/別名とlive_collaboratorsの確認済み関連は維持する。
END;
$sanitize_metadata$;
