-- Restore the original creation time as the baseline for existing sermons.
-- The first migration's DEFAULT populated old rows with the migration time.
DROP TRIGGER IF EXISTS set_sermoes_updated_at ON public.sermoes;

UPDATE public.sermoes
SET updated_at = COALESCE(created_at, data_criacao, updated_at)
WHERE updated_at = '2026-11-02 13:30:19.333337+00'::timestamptz;

CREATE TRIGGER set_sermoes_updated_at
BEFORE UPDATE ON public.sermoes
FOR EACH ROW
EXECUTE FUNCTION public.set_sermoes_updated_at();
