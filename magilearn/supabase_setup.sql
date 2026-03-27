-- ============================================================
-- MagiLearn — Supabase SQL Setup
-- Ejecutar en: Supabase Dashboard → SQL Editor → Run
-- ============================================================

-- 1. Perfiles de usuario
create table if not exists profiles (
  id uuid references auth.users primary key,
  name text,
  avatar text default '🦁',
  age int default 7,
  prof text default 'sofia',
  langs text[] default '{en}',
  total_xp int default 0,
  streak int default 0,
  last_date text,
  sessions int default 0,
  words int default 0,
  plan jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 2. Progreso por materia
create table if not exists progress (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references profiles(id) on delete cascade,
  subject text not null,
  correct int default 0,
  total int default 0,
  stars int default 0,
  difficulty int default 1,
  xp int default 0,
  recent int[] default '{}',
  unique(user_id, subject)
);

-- 3. Historial de calidad IA
create table if not exists quality (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references profiles(id) on delete cascade,
  key text not null,
  ratings int[] default '{}',
  flagged bool default false,
  improved text,
  original_text text,
  corrected_text text,
  created_at timestamptz default now()
);

-- 4. Row Level Security (cada usuario solo ve sus datos)
alter table profiles enable row level security;
alter table progress enable row level security;
alter table quality enable row level security;

create policy "own_profile" on profiles for all using (auth.uid() = id) with check (auth.uid() = id);
create policy "own_progress" on progress for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own_quality" on quality for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- 5. Auto-crear perfil al registrarse
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, name)
  values (new.id, split_part(new.email, '@', 1))
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
