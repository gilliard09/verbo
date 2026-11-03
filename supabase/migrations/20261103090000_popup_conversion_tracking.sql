-- Popup conversion tracking and Cakto purchase attribution.
-- Applied to production on 2026-11-03; this file keeps the schema change in source control.

ALTER TABLE public.eventos_modal_upgrade
  DROP CONSTRAINT IF EXISTS eventos_modal_upgrade_acao_check;

ALTER TABLE public.eventos_modal_upgrade
  ADD CONSTRAINT eventos_modal_upgrade_acao_check
  CHECK (acao IN ('exibido','clicou','dispensou','clicou_plus','clicou_vitalicio'));

CREATE INDEX IF NOT EXISTS idx_eventos_modal_user_acao_data
  ON public.eventos_modal_upgrade(user_id, acao, criado_em DESC);

DROP POLICY IF EXISTS "admins podem ler eventos de upgrade" ON public.eventos_modal_upgrade;
CREATE POLICY "admins podem ler eventos de upgrade"
ON public.eventos_modal_upgrade
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = (SELECT auth.uid()) AND p.is_admin IS TRUE
  )
);

CREATE TABLE IF NOT EXISTS public.cakto_purchases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id text NOT NULL UNIQUE,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  plan text NOT NULL CHECK (plan IN ('plus','fundador','plus_vitalicio')),
  product_id text NOT NULL,
  product_name text,
  offer_id text,
  amount numeric(12,2) NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'approved'
    CHECK (status IN ('approved','refunded','chargeback')),
  payment_method text,
  paid_at timestamptz,
  cakto_subscription_id text,
  popup_variant text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_cakto_purchases_user_paid
  ON public.cakto_purchases(user_id, paid_at DESC);
CREATE INDEX IF NOT EXISTS idx_cakto_purchases_popup_status
  ON public.cakto_purchases(popup_variant, status, paid_at DESC);

ALTER TABLE public.cakto_purchases ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admins podem ler vendas Cakto" ON public.cakto_purchases;
CREATE POLICY "admins podem ler vendas Cakto"
ON public.cakto_purchases
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = (SELECT auth.uid()) AND p.is_admin IS TRUE
  )
);

ALTER TABLE public.subscriptions
  ADD COLUMN IF NOT EXISTS cakto_order_id text;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'subscriptions_cakto_order_id_key'
      AND conrelid = 'public.subscriptions'::regclass
  ) THEN
    ALTER TABLE public.subscriptions
      ADD CONSTRAINT subscriptions_cakto_order_id_key UNIQUE (cakto_order_id);
  END IF;
END $$;

-- Importa as vendas vitalícias que já existiam antes do novo rastreamento.
INSERT INTO public.cakto_purchases
  (order_id,user_id,plan,product_id,product_name,amount,status,paid_at,popup_variant,created_at)
SELECT
  'legacy_subscription:' || s.id::text,
  s.user_id,
  'plus_vitalicio',
  'legacy',
  'Venda vitalícia histórica',
  COALESCE(s.price,0),
  'approved',
  COALESCE(s.started_at,s.created_at),
  (
    SELECT e.variante
    FROM public.eventos_modal_upgrade e
    WHERE e.user_id=s.user_id
      AND e.acao IN ('clicou','clicou_plus','clicou_vitalicio')
      AND e.criado_em <= COALESCE(s.started_at,s.created_at)
    ORDER BY e.criado_em DESC
    LIMIT 1
  ),
  COALESCE(s.created_at,now())
FROM public.subscriptions s
WHERE s.plan='plus_vitalicio' AND s.status='active'
ON CONFLICT (order_id) DO NOTHING;
