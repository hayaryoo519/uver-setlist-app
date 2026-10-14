-- 検証DB専用。sync-db.shからON_ERROR_STOP/単一トランザクションで実行する。
-- 必須の既存テーブルがない/SQLが失敗した場合は同期全体を失敗させる。
TRUNCATE TABLE public.security_logs CASCADE;
TRUNCATE TABLE public.collector_logs CASCADE;

-- devのユーザー全除去を維持する。hash/期限/pending email等の新列も行ごと除去。
-- actor FKを持つ追加情報履歴も同じTRUNCATEに含め、未知依存では失敗させる。
DO $sanitize_accounts$
DECLARE
    table_name TEXT;
    private_tables TEXT[] := ARRAY['public.users', 'public.corrections', 'public.push_subscriptions'];
BEGIN
    FOREACH table_name IN ARRAY ARRAY[
        'user_spotify_tokens', 'user_google_tokens', 'playlist_history',
        'attendance', 'user_follows', 'predictions', 'prediction_songs', 'prediction_likes',
        'raw_setlists', 'social_posts', 'live_metadata_history', 'live_artist_history'
    ] LOOP
        IF to_regclass(format('public.%I', table_name)) IS NOT NULL THEN
            private_tables := array_append(private_tables, format('public.%I', table_name));
        END IF;
    END LOOP;
    EXECUTE 'TRUNCATE TABLE ' || array_to_string(private_tables, ', ') || ' RESTART IDENTITY';
END;
$sanitize_accounts$;

-- 古いバックアップにない任意テーブルだけスキップする。
-- OAuth資格情報/個人の外部プレイリスト履歴/未公開下書き/送信キューは持ち出さない。
-- CASCADEしない: 将来の未知の依存で失敗したら全体を巻き戻し、公開停止を継続する。
DO $sanitize_integrations$
BEGIN
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

-- 033/034導入前のバックアップも扱う。存在する新テーブルの処理失敗は隠さない。
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
