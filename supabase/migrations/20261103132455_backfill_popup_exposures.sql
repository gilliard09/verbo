-- Reconstruct historic popup impressions from the per-profile flags.
-- The first and second step timestamps are complete; older third-step flags
-- without timestamps use profile creation time as a conservative fallback.
INSERT INTO public.eventos_modal_upgrade (user_id, acao, variante, criado_em)
SELECT p.id, 'exibido', v.variante, COALESCE(v.exibido_em, p.created_at, now())
FROM public.profiles p
CROSS JOIN LATERAL (
  VALUES
    ('degrau_1'::text, p.viu_upgrade_sermao_1, p.viu_upgrade_sermao_1_em),
    ('degrau_2'::text, p.viu_upgrade_sermao_2, p.viu_upgrade_sermao_2_em),
    ('degrau_3'::text, p.viu_upgrade_sermoes, p.viu_upgrade_sermoes_em),
    ('fundador'::text, p.viu_upgrade_fundador, p.viu_upgrade_fundador_em)
) AS v(variante, foi_exibido, exibido_em)
WHERE v.foi_exibido IS TRUE
  AND NOT EXISTS (
    SELECT 1 FROM public.eventos_modal_upgrade e
    WHERE e.user_id=p.id AND e.variante=v.variante AND e.acao='exibido'
  );
