-- Pesqueiro.GG: lista de locais de pesca, notas de 0 a 10 e vínculo com registros e dicas.
-- Rode no Supabase: SQL Editor > New query > Run. Pode rodar mais de uma vez.

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
