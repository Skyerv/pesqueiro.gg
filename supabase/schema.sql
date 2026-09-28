-- Pesqueiro.GG
-- Rode este arquivo inteiro no Supabase: SQL Editor > New query > Run.

-- Perfis (um por conta)
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  nickname text not null check (char_length(trim(nickname)) between 1 and 24),
  avatar_path text,
  created_at timestamptz not null default now()
);

-- Registros de pesca
create table if not exists public.catches (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  species text not null check (char_length(trim(species)) between 1 and 40),
  qty int not null default 1 check (qty between 1 and 50),
  size_cm real check (size_cm > 0 and size_cm < 400),
  caught_on date not null default current_date,
  note text check (note is null or char_length(note) <= 140),
  photo_path text,
  created_at timestamptz not null default now()
);

create index if not exists catches_user_idx on public.catches (user_id);
create index if not exists catches_created_idx on public.catches (created_at desc);

-- Segurança: todo mundo logado vê tudo; cada um só mexe no que é seu
alter table public.profiles enable row level security;
alter table public.catches enable row level security;

drop policy if exists "perfis visiveis para logados" on public.profiles;
create policy "perfis visiveis para logados" on public.profiles
  for select to authenticated using (true);

drop policy if exists "cria o proprio perfil" on public.profiles;
create policy "cria o proprio perfil" on public.profiles
  for insert to authenticated with check (auth.uid() = id);

drop policy if exists "edita o proprio perfil" on public.profiles;
create policy "edita o proprio perfil" on public.profiles
  for update to authenticated using (auth.uid() = id) with check (auth.uid() = id);

drop policy if exists "registros visiveis para logados" on public.catches;
create policy "registros visiveis para logados" on public.catches
  for select to authenticated using (true);

drop policy if exists "cria os proprios registros" on public.catches;
create policy "cria os proprios registros" on public.catches
  for insert to authenticated with check (auth.uid() = user_id);

drop policy if exists "edita os proprios registros" on public.catches;
create policy "edita os proprios registros" on public.catches
  for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "apaga os proprios registros" on public.catches;
create policy "apaga os proprios registros" on public.catches
  for delete to authenticated using (auth.uid() = user_id);

-- Fotos: bucket público "fotos", cada pessoa só envia/apaga na própria pasta (<id>/arquivo.jpg)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('fotos', 'fotos', true, 8388608, array['image/jpeg','image/png','image/webp','image/gif'])
on conflict (id) do nothing;

drop policy if exists "envia fotos na propria pasta" on storage.objects;
create policy "envia fotos na propria pasta" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'fotos' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "atualiza fotos da propria pasta" on storage.objects;
create policy "atualiza fotos da propria pasta" on storage.objects
  for update to authenticated
  using (bucket_id = 'fotos' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "apaga fotos da propria pasta" on storage.objects;
create policy "apaga fotos da propria pasta" on storage.objects
  for delete to authenticated
  using (bucket_id = 'fotos' and (storage.foldername(name))[1] = auth.uid()::text);
