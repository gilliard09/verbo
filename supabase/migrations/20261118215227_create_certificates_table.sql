-- Registro oficial dos certificados emitidos pela Academia Verbo.
-- Os campos de nome e data preservam o histórico do documento, mesmo que
-- o aluno ou o curso sejam renomeados posteriormente.

create table if not exists public.certificates (
  id uuid primary key default gen_random_uuid(),
  verification_code text not null unique default ('VRB-' || upper(replace(gen_random_uuid()::text, '-', ''))),
  user_id uuid not null references auth.users(id) on delete restrict,
  curso_id uuid not null references public.cursos(id) on delete restrict,
  student_name text not null,
  course_name text not null,
  completion_date date not null,
  issued_at timestamptz not null default now(),
  status text not null default 'valid'
    check (status in ('valid', 'revoked')),
  revoked_at timestamptz,
  revocation_reason text,
  created_at timestamptz not null default now(),
  constraint certificates_revocation_consistency
    check (
      (status = 'valid' and revoked_at is null)
      or (status = 'revoked' and revoked_at is not null)
    )
);

comment on table public.certificates is
  'Registro oficial e imutável dos certificados emitidos pela Academia Verbo. Os campos student_name, course_name e completion_date preservam os dados históricos exibidos no documento.';
comment on column public.certificates.verification_code is
  'Código público aleatório e único usado futuramente na validação do QR Code.';
comment on column public.certificates.student_name is
  'Nome do aluno congelado no momento da emissão do certificado.';
comment on column public.certificates.course_name is
  'Nome do curso congelado no momento da emissão do certificado.';
comment on column public.certificates.completion_date is
  'Data real em que o aluno concluiu o curso, distinta da data de emissão.';
comment on column public.certificates.issued_at is
  'Data e hora em que o certificado foi oficialmente emitido.';

create unique index if not exists certificates_one_active_per_user_course
  on public.certificates (user_id, curso_id)
  where status = 'valid';

create index if not exists certificates_user_id_idx
  on public.certificates (user_id);

create index if not exists certificates_curso_id_idx
  on public.certificates (curso_id);

create index if not exists certificates_issued_at_idx
  on public.certificates (issued_at desc);

alter table public.certificates enable row level security;

revoke all on table public.certificates from anon, authenticated;
grant select on table public.certificates to authenticated;

drop policy if exists "Students can read their own certificates" on public.certificates;
create policy "Students can read their own certificates"
  on public.certificates
  for select
  to authenticated
  using ((select auth.uid()) = user_id);
