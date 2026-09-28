-- Pesqueiro.GG: aba Dicas (equipamentos, iscas, receitas, técnicas).
-- Rode no Supabase: SQL Editor > New query > Run. Pode rodar mais de uma vez.

create table if not exists public.tips (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  kind text not null check (kind in ('equipamento', 'isca', 'receita', 'tecnica', 'outro')),
  title text not null check (char_length(trim(title)) between 3 and 80),
  body text check (body is null or char_length(body) <= 4000),
  url text check (url is null or (char_length(url) <= 500 and url ~* '^https?://')),
  photo_path text,
  created_at timestamptz not null default now(),
  updated_at timestamptz
);

create index if not exists tips_created_idx on public.tips (created_at desc);
create index if not exists tips_kind_idx on public.tips (kind, created_at desc);

alter table public.tips enable row level security;
grant select, insert, update, delete on public.tips to authenticated;

drop policy if exists "dicas visiveis para logados" on public.tips;
create policy "dicas visiveis para logados" on public.tips
  for select to authenticated using (true);

drop policy if exists "cria as proprias dicas" on public.tips;
create policy "cria as proprias dicas" on public.tips
  for insert to authenticated with check (auth.uid() = user_id);

drop policy if exists "edita as proprias dicas" on public.tips;
create policy "edita as proprias dicas" on public.tips
  for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "apaga as proprias dicas" on public.tips;
create policy "apaga as proprias dicas" on public.tips
  for delete to authenticated using (auth.uid() = user_id);
