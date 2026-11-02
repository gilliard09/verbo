-- Compatibility migration for the initial production rollout.
-- Existing production rows were backfilled when this migration was first applied.
-- Fresh installations already backfill updated_at from created_at in
-- 20261102000000_add_updated_at_to_sermoes.sql, before setting NOT NULL.
-- Intentionally no data changes are needed here.
SELECT 1;
