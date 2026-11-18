-- 開催国の補完可否を調べる集計専用SQL。実行は環境・接続先を確認して別途許可を得る。
-- 原文・国候補の値・公演ID・取得元ID・管理メモは出力しない。確定や再取得もしない。
BEGIN READ ONLY;
SET LOCAL statement_timeout = '15s';
SET LOCAL search_path = pg_catalog, public;

DO $guard$
BEGIN
    IF current_database() <> 'uver_setlist_staging'
       AND current_database() !~ '^country_audit_fixture_[a-z0-9]+$' THEN
        RAISE EXCEPTION 'Refusing country audit outside staging or a fixture database';
    END IF;
END;
$guard$;

WITH evidence AS (
    SELECT l.id,
        CASE WHEN l.date IS NULL THEN 'undated'
             WHEN l.date < (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Tokyo')::date THEN 'past'
             ELSE 'today_or_future' END AS cohort,
        NULLIF(BTRIM(l.setlistfm_id), '') IS NOT NULL AS has_setlistfm_id,
        NULLIF(BTRIM(l.external_source_id), '') IS NOT NULL AS has_external_source_id,
        COALESCE(m.overrides ? 'country', FALSE) AS has_manual_country,
        COALESCE(jsonb_typeof(m.overrides #> '{country,code}') = 'string'
            AND (m.overrides #>> '{country,code}') ~ '^[A-Za-z]{2}$', FALSE) AS has_manual_code,
        code_stats.code_count,
        code_stats.invalid_code,
        EXISTS (
            SELECT 1 FROM jsonb_array_elements(
                CASE WHEN jsonb_typeof(m.candidates->'conflicts') = 'array'
                     THEN m.candidates->'conflicts' ELSE '[]'::jsonb END
            ) AS conflict WHERE conflict->>'field' = 'countryCode'
        ) AS has_conflict_flag
    FROM public.lives l
    LEFT JOIN public.live_metadata m ON m.live_id = l.id
    CROSS JOIN LATERAL (
        SELECT COUNT(DISTINCT UPPER(raw_code #>> '{}')) FILTER (
                   WHERE jsonb_typeof(raw_code) = 'string'
                     AND (raw_code #>> '{}') ~ '^[A-Za-z]{2}$'
               ) AS code_count,
               COALESCE(BOOL_OR(jsonb_typeof(raw_code) <> 'string'
                   OR (raw_code #>> '{}') !~ '^[A-Za-z]{2}$'), FALSE) AS invalid_code
        FROM (
            SELECT m.candidates->'countryCode' AS raw_code
            UNION ALL
            SELECT snapshot.value->'countryCode'
            FROM jsonb_each(CASE WHEN jsonb_typeof(m.candidates->'sources') = 'object'
                                THEN m.candidates->'sources' ELSE '{}'::jsonb END) AS snapshot
        ) AS codes
        WHERE raw_code IS NOT NULL AND raw_code <> 'null'::jsonb
    ) AS code_stats
), classified AS (
    SELECT *, CASE
        WHEN has_manual_code THEN 'confirmed'
        WHEN has_manual_country THEN 'manual_needs_review'
        WHEN code_count > 1 OR has_conflict_flag THEN 'conflicting'
        WHEN invalid_code THEN 'invalid_candidate'
        WHEN code_count = 1 THEN 'single_candidate'
        ELSE 'missing_candidate'
    END AS country_state
    FROM evidence
)
SELECT cohort,
    COUNT(*)::integer AS total_lives,
    COUNT(*) FILTER (WHERE country_state = 'confirmed')::integer AS confirmed,
    COUNT(*) FILTER (WHERE country_state = 'manual_needs_review')::integer AS manual_needs_review,
    COUNT(*) FILTER (WHERE country_state = 'single_candidate')::integer AS single_candidate_unconfirmed,
    COUNT(*) FILTER (WHERE country_state = 'conflicting')::integer AS conflicting_unconfirmed,
    COUNT(*) FILTER (WHERE country_state = 'invalid_candidate')::integer AS invalid_candidate_unconfirmed,
    COUNT(*) FILTER (WHERE country_state = 'missing_candidate')::integer AS missing_candidate_unconfirmed,
    COUNT(*) FILTER (WHERE country_state = 'missing_candidate' AND has_setlistfm_id)::integer AS missing_candidate_with_setlistfm_id,
    COUNT(*) FILTER (WHERE country_state = 'missing_candidate' AND NOT has_setlistfm_id)::integer AS missing_candidate_without_setlistfm_id,
    COUNT(*) FILTER (WHERE has_external_source_id)::integer AS external_source_id_present
FROM classified GROUP BY cohort ORDER BY cohort;

ROLLBACK;
