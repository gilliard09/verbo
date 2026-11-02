-- Add a reliable server timestamp for offline conflict resolution.
ALTER TABLE public.sermoes
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

UPDATE public.sermoes
SET updated_at = COALESCE(created_at, data_criacao, now())
WHERE updated_at IS NULL;

CREATE OR REPLACE FUNCTION public.set_sermoes_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS set_sermoes_updated_at ON public.sermoes;

CREATE TRIGGER set_sermoes_updated_at
BEFORE UPDATE ON public.sermoes
FOR EACH ROW
EXECUTE FUNCTION public.set_sermoes_updated_at();
