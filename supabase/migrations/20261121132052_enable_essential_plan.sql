-- Add the Essential plan throughout the subscription and course-access schema.
-- Founder remains accepted for existing legacy accounts, but is no longer sold.

ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_plano_check;
ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_plano_check
  CHECK (plano = ANY (ARRAY['gratuito', 'essencial', 'plus', 'fundador']));

ALTER TABLE public.planos_pendentes
  DROP CONSTRAINT IF EXISTS planos_pendentes_plano_check;
ALTER TABLE public.planos_pendentes
  ADD CONSTRAINT planos_pendentes_plano_check
  CHECK (plano = ANY (ARRAY['essencial', 'plus', 'fundador']));

ALTER TABLE public.cakto_purchases
  DROP CONSTRAINT IF EXISTS cakto_purchases_plan_check;
ALTER TABLE public.cakto_purchases
  ADD CONSTRAINT cakto_purchases_plan_check
  CHECK (plan = ANY (ARRAY['essencial', 'plus', 'fundador', 'plus_vitalicio']));

ALTER TABLE public.cursos
  DROP CONSTRAINT IF EXISTS cursos_plano_minimo_check;
ALTER TABLE public.cursos
  ADD CONSTRAINT cursos_plano_minimo_check
  CHECK (plano_minimo IS NULL OR plano_minimo = ANY (ARRAY['essencial', 'plus', 'fundador']));

-- The two courses included in Essential must not require Plus or legacy Founder.
UPDATE public.cursos
SET plano_minimo = 'essencial'
WHERE id IN (
  '66734e43-c640-483f-a4c2-99d1f28c3e83',
  'be7f5b30-0e7f-4c66-95c1-b1af6ec2d4df'
);

-- Apply pending Cakto purchases completely when the user creates an account.
CREATE OR REPLACE FUNCTION public.aplicar_plano_pendente()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $function$
DECLARE
  pendente RECORD;
BEGIN
  SELECT *
    INTO pendente
  FROM public.planos_pendentes
  WHERE lower(email) = lower(NEW.email)
    AND processado = FALSE
  ORDER BY criado_em DESC
  LIMIT 1;

  IF FOUND THEN
    UPDATE public.profiles
    SET
      plano = pendente.plano,
      hotmart_subscription_id = pendente.hotmart_subscription_id,
      cakto_subscription_id = pendente.cakto_subscription_id,
      plano_expira_em = NULL,
      plano_atualizado_em = pg_catalog.now()
    WHERE id = NEW.id;

    UPDATE public.planos_pendentes
    SET processado = TRUE
    WHERE id = pendente.id;
  END IF;

  RETURN NEW;
END;
$function$;
