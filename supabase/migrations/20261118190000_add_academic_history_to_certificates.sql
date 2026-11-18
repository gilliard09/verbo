alter table public.certificates
  add column if not exists academic_history jsonb not null default '[]'::jsonb;
