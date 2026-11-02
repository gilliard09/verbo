-- Repair rows that received one shared DEFAULT timestamp when updated_at
-- was first introduced. The migration timestamp is detected from the data,
-- never hardcoded, and genuine per-row update timestamps are left untouched.
DO $$
DECLARE
  v_timestamp timestamptz;
  v_distinct_timestamps bigint;
BEGIN
  SELECT MIN(updated_at), COUNT(DISTINCT updated_at)
    INTO v_timestamp, v_distinct_timestamps
    FROM public.sermoes;

  IF v_distinct_timestamps = 1 AND v_timestamp IS NOT NULL THEN
    DROP TRIGGER IF EXISTS set_sermoes_updated_at ON public.sermoes;

    UPDATE public.sermoes
       SET updated_at = COALESCE(created_at, data_criacao, updated_at)
     WHERE updated_at = v_timestamp
       AND updated_at > COALESCE(created_at, data_criacao, updated_at);

    CREATE TRIGGER set_sermoes_updated_at
    BEFORE UPDATE ON public.sermoes
    FOR EACH ROW
    EXECUTE FUNCTION public.set_sermoes_updated_at();
  END IF;
END;
$$;
