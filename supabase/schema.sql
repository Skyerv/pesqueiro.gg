-- Pesqueiro.GG
-- Rode este arquivo inteiro no Supabase: SQL Editor > New query > Run.
-- Instalação nova: rode este arquivo inteiro. Projeto que já existia: rode também os arquivos de supabase/migrations.

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


-- Local da captura (tudo opcional)
alter table public.catches add column if not exists spot_name text
  check (spot_name is null or char_length(trim(spot_name)) between 1 and 60);
alter table public.catches add column if not exists lat double precision
  check (lat is null or lat between -90 and 90);
alter table public.catches add column if not exists lng double precision
  check (lng is null or lng between -180 and 180);

-- Fotos e vídeos extras de cada registro (a foto principal continua em catches.photo_path)
create table if not exists public.catch_media (
  id uuid primary key default gen_random_uuid(),
  catch_id uuid not null references public.catches (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  path text not null,
  kind text not null check (kind in ('image', 'video')),
  position int not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists catch_media_catch_idx on public.catch_media (catch_id, position);

alter table public.catch_media enable row level security;
grant select, insert, delete on public.catch_media to authenticated;

drop policy if exists "midias visiveis para logados" on public.catch_media;
create policy "midias visiveis para logados" on public.catch_media
  for select to authenticated using (true);

-- Só adiciona mídia em registro próprio
drop policy if exists "adiciona midia nos proprios registros" on public.catch_media;
create policy "adiciona midia nos proprios registros" on public.catch_media
  for insert to authenticated
  with check (
    auth.uid() = user_id
    and exists (select 1 from public.catches c where c.id = catch_id and c.user_id = auth.uid())
  );

drop policy if exists "apaga as proprias midias" on public.catch_media;
create policy "apaga as proprias midias" on public.catch_media
  for delete to authenticated using (auth.uid() = user_id);

-- Bucket de fotos passa a aceitar vídeos (até 50 MB, o máximo do plano gratuito)
update storage.buckets
set file_size_limit = 52428800,
    allowed_mime_types = array[
      'image/jpeg', 'image/png', 'image/webp', 'image/gif',
      'video/mp4', 'video/quicktime', 'video/webm', 'video/3gpp'
    ]
where id = 'fotos';


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


-- Locais (informações editáveis por qualquer um da turma, como uma wiki)
create table if not exists public.spots (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(trim(name)) between 2 and 60),
  city text check (city is null or char_length(city) <= 60),
  price text check (price is null or char_length(price) <= 80),
  description text check (description is null or char_length(description) <= 2000),
  lat double precision check (lat is null or lat between -90 and 90),
  lng double precision check (lng is null or lng between -180 and 180),
  created_by uuid references public.profiles (id) on delete set null,
  updated_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz
);

-- Um local por nome (sem diferenciar maiúsculas)
create unique index if not exists spots_name_key on public.spots (lower(trim(name)));

alter table public.spots enable row level security;
grant select, insert, update, delete on public.spots to authenticated;

drop policy if exists "locais visiveis para logados" on public.spots;
create policy "locais visiveis para logados" on public.spots
  for select to authenticated using (true);

drop policy if exists "cria locais" on public.spots;
create policy "cria locais" on public.spots
  for insert to authenticated with check (created_by = auth.uid());

drop policy if exists "turma edita locais" on public.spots;
create policy "turma edita locais" on public.spots
  for update to authenticated using (true) with check (updated_by = auth.uid());

drop policy if exists "apaga os proprios locais" on public.spots;
create policy "apaga os proprios locais" on public.spots
  for delete to authenticated using (created_by = auth.uid());

-- Nota de cada pessoa para cada local (uma por pessoa, pode mudar)
create table if not exists public.spot_reviews (
  spot_id uuid not null references public.spots (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  score int not null check (score between 0 and 10),
  comment text check (comment is null or char_length(comment) <= 500),
  created_at timestamptz not null default now(),
  updated_at timestamptz,
  primary key (spot_id, user_id)
);

alter table public.spot_reviews enable row level security;
grant select, insert, update, delete on public.spot_reviews to authenticated;

drop policy if exists "notas visiveis para logados" on public.spot_reviews;
create policy "notas visiveis para logados" on public.spot_reviews
  for select to authenticated using (true);

drop policy if exists "da a propria nota" on public.spot_reviews;
create policy "da a propria nota" on public.spot_reviews
  for insert to authenticated with check (auth.uid() = user_id);

drop policy if exists "muda a propria nota" on public.spot_reviews;
create policy "muda a propria nota" on public.spot_reviews
  for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "apaga a propria nota" on public.spot_reviews;
create policy "apaga a propria nota" on public.spot_reviews
  for delete to authenticated using (auth.uid() = user_id);

-- Registros e dicas podem apontar para um local
alter table public.catches add column if not exists spot_id uuid references public.spots (id) on delete set null;
alter table public.tips add column if not exists spot_id uuid references public.spots (id) on delete set null;
create index if not exists catches_spot_idx on public.catches (spot_id);
create index if not exists tips_spot_idx on public.tips (spot_id);

-- Nomes de locais já usados nos registros viram locais da lista.
-- Só cria os locais; os registros são ligados a eles pelo nome, sem ser alterados.
insert into public.spots (name, lat, lng)
select distinct on (lower(trim(spot_name))) trim(spot_name), lat, lng
from public.catches
where spot_name is not null and char_length(trim(spot_name)) >= 2
order by lower(trim(spot_name)), (lat is null), created_at desc
on conflict do nothing;
