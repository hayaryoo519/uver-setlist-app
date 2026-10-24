-- Production country-only review: aggregate read-only audit, no ids/notes/candidate contents output.
-- Run as the application's DB role after separately confirming DB_NAME=uver_setlist_prod.
-- Never invoke through a migration runner or with an elevated postgres role for the privilege check.
BEGIN READ ONLY;
SET LOCAL statement_timeout = '15s';
SET LOCAL search_path = pg_catalog, public;

DO $guard$
BEGIN
  IF current_database() <> 'uver_setlist_prod' THEN
    RAISE EXCEPTION 'Refusing country history audit outside Production';
  END IF;
END;
$guard$;

WITH country_history AS (
  SELECT h.live_id, h.before_state, h.after_state, m.revision AS current_revision,
         m.candidates AS current_candidates, m.overrides AS current_overrides
  FROM public.live_metadata_history h
  JOIN public.live_metadata m ON m.live_id = h.live_id
  WHERE h.operation = 'manual'
    AND h.after_state #>> '{overrides,country,code}' IN ('JP', 'KR')
), checked AS (
  SELECT *,
    before_state #>> '{overrides,country,code}' IS NULL AS newly_confirmed,
    (after_state->>'revision')::integer = (before_state->>'revision')::integer + 1 AS revision_advanced,
    before_state->'candidates' IS NOT DISTINCT FROM after_state->'candidates' AS candidates_unchanged,
    ((before_state->'overrides') - 'country') IS NOT DISTINCT FROM ((after_state->'overrides') - 'country') AS other_overrides_unchanged,
    current_revision = (after_state->>'revision')::integer
      AND current_candidates IS NOT DISTINCT FROM after_state->'candidates'
      AND current_overrides IS NOT DISTINCT FROM after_state->'overrides' AS current_state_matches
  FROM country_history
)
SELECT
  (SELECT count(*) FROM public.schema_migrations)::integer AS migration_count,
  (SELECT count(*) FROM public.schema_migrations WHERE filename IN (
    '030_users_session_version.sql', '031_users_auth_token_hashes.sql',
    '032_users_pending_email_change.sql', '033_live_metadata.sql', '034_live_artists.sql'
  ))::integer AS expected_new_migrations,
  has_schema_privilege(current_user, 'public', 'CREATE') AS app_role_can_create_schema_objects,
  count(*)::integer AS country_history_rows,
  count(DISTINCT live_id)::integer AS distinct_lives,
  count(*) FILTER (WHERE newly_confirmed)::integer AS newly_confirmed_rows,
  count(*) FILTER (WHERE revision_advanced)::integer AS revision_advanced_rows,
  count(*) FILTER (WHERE candidates_unchanged AND other_overrides_unchanged)::integer AS country_only_rows,
  count(*) FILTER (WHERE current_state_matches)::integer AS matching_current_rows
FROM checked;

ROLLBACK;
