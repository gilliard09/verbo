-- Enforce sermon limits centrally for every insert path, including offline sync.
-- Free: 3 sermons. Essential: 20 sermons. Legacy Founder and Plus: unlimited.
-- Expired subscriptions are treated as Free.

CREATE OR REPLACE FUNCTION public.check_limite_sermoes()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $function$
DECLARE
  v_total integer;
  v_plano text;
  v_expira_em timestamptz;
  v_limite integer;
BEGIN
  -- Serialize concurrent creations by the same user so two requests cannot
  -- both pass the count check at the same time.
  PERFORM pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(NEW.user_id::text, 0)
  );

  -- Idempotent retries may arrive after the original INSERT succeeded but
  -- its response was lost. Allow that same record to reach the unique check
  -- and existing retry/update handling, even if the account is now at limit.
  IF EXISTS (
    SELECT 1
    FROM public.sermoes s
    WHERE s.id = NEW.id
      AND s.user_id = NEW.user_id
  ) THEN
    RETURN NEW;
  END IF;

  SELECT p.plano, p.plano_expira_em
    INTO v_plano, v_expira_em
  FROM public.profiles p
  WHERE p.id = NEW.user_id;

  IF v_expira_em IS NOT NULL AND v_expira_em <= pg_catalog.now() THEN
    v_plano := 'gratuito';
  END IF;

  -- Unknown or missing plans fail closed as Free.
  v_limite := CASE
    WHEN v_plano IN ('plus', 'fundador') THEN NULL
    WHEN v_plano = 'essencial' THEN 20
    ELSE 3
  END;

  IF v_limite IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT pg_catalog.count(*)
    INTO v_total
  FROM public.sermoes s
  WHERE s.user_id = NEW.user_id;

  IF v_total >= v_limite THEN
    RAISE EXCEPTION 'Limite de % sermões do plano % atingido. Faça upgrade para continuar.',
      v_limite,
      COALESCE(v_plano, 'gratuito')
      USING ERRCODE = 'P0001';
  END IF;

  RETURN NEW;
END;
$function$;
