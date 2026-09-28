-- Pesqueiro.GG: mais fotos/vídeos por registro e local da captura.
-- Rode no Supabase: SQL Editor > New query > Run. Pode rodar mais de uma vez.

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
