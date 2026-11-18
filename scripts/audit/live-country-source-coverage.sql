-- 元データの明示的な国コードを回収できるかの件数集計。原文・コード値・IDは返さない。
-- JSONのcountryCode / country.codeのみ調べる。自由記述・会場名・時差から推測しない。
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

WITH live_cohorts AS (
    SELECT id, import_metadata,
        CASE WHEN date IS NULL THEN 'undated'
             WHEN date < (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Tokyo')::date THEN 'past'
             ELSE 'today_or_future' END AS cohort
    FROM public.lives
), documents AS (
    SELECT l.cohort, l.id AS live_id, 'metadata_original'::text AS source_kind,
           m.candidates->'original' AS document
    FROM live_cohorts l LEFT JOIN public.live_metadata m ON m.live_id = l.id
    UNION ALL
    SELECT l.cohort, l.id, 'source_original', snapshot.value->'original'
    FROM live_cohorts l JOIN public.live_metadata m ON m.live_id = l.id
    CROSS JOIN LATERAL jsonb_each(
        CASE WHEN jsonb_typeof(m.candidates->'sources') = 'object'
             THEN m.candidates->'sources' ELSE '{}'::jsonb END
    ) AS snapshot
    UNION ALL
    SELECT cohort, id, 'import_metadata', import_metadata FROM live_cohorts
    UNION ALL
    SELECT COALESCE(l.cohort, 'unlinked'), l.id, 'parsed_draft', r.parsed_json
    FROM public.raw_setlists r LEFT JOIN live_cohorts l ON l.id = r.live_id
), evaluated AS (
    SELECT *,
        jsonb_path_exists(document, '$.**.countryCode')
            OR jsonb_path_exists(document, '$.**.country.code') AS has_country_field,
        jsonb_path_exists(document, '$.**.countryCode ? (@.type() == "string" && @ like_regex "^[A-Za-z]{2}$")')
            OR jsonb_path_exists(document, '$.**.country.code ? (@.type() == "string" && @ like_regex "^[A-Za-z]{2}$")') AS has_code_shape
    FROM documents
), expected_groups AS (
    SELECT DISTINCT cohort, source_kind FROM live_cohorts
    CROSS JOIN (VALUES ('metadata_original'), ('source_original'), ('import_metadata'), ('parsed_draft')) AS kinds(source_kind)
    UNION SELECT 'unlinked', 'parsed_draft'
)
SELECT g.cohort, g.source_kind,
    COUNT(*) FILTER (WHERE e.document IS NOT NULL AND e.document <> 'null'::jsonb)::integer AS documents_present,
    COUNT(*) FILTER (WHERE e.has_country_field)::integer AS documents_with_country_field,
    COUNT(*) FILTER (WHERE e.has_code_shape)::integer AS documents_with_code_shape,
    COUNT(DISTINCT e.live_id) FILTER (WHERE e.has_code_shape)::integer AS lives_with_code_shape,
    COUNT(*) FILTER (WHERE e.source_kind = 'parsed_draft')::integer AS draft_records,
    COUNT(*) FILTER (WHERE e.source_kind = 'parsed_draft' AND (e.document IS NULL OR e.document = 'null'::jsonb))::integer AS unparsed_draft_records
FROM expected_groups g LEFT JOIN evaluated e ON e.cohort = g.cohort AND e.source_kind = g.source_kind
GROUP BY g.cohort, g.source_kind ORDER BY g.cohort, g.source_kind;

ROLLBACK;
