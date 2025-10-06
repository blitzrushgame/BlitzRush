-- Create user profiles table
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text unique not null,
  display_name text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS
alter table public.profiles enable row level security;

-- RLS policies for profiles
create policy "profiles_select_own"
  on public.profiles for select
  using (auth.uid() = id);

create policy "profiles_insert_own"
  on public.profiles for insert
  with check (auth.uid() = id);

create policy "profiles_update_own"
  on public.profiles for update
  using (auth.uid() = id);

create policy "profiles_delete_own"
  on public.profiles for delete
  using (auth.uid() = id);

-- Create game worlds table (10 different maps)
create table if not exists public.game_worlds (
  id serial primary key,
  name text not null,
  description text,
  map_data jsonb default '{}',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Insert the 10 game worlds
insert into public.game_worlds (name, description) values
  ('1', 'Map 1'),
  ('2', 'Map 2'),
  ('3', 'Map 3'),
  ('4', 'Map 4'),
  ('5', 'Map 5'),
  ('6', 'Map 6'),
  ('7', 'Map 7'),
  ('8', 'Map 8'),
  ('9', 'Map 9'),
  ('10', 'Map 10');

-- Create user game states table (tracks each user's progress in each world)
create table if not exists public.user_game_states (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  world_id integer not null references public.game_worlds(id) on delete cascade,
  game_data jsonb default '{}',
  last_played timestamp with time zone default timezone('utc'::text, now()) not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(user_id, world_id)
);

-- Enable RLS for user game states
alter table public.user_game_states enable row level security;

-- RLS policies for user game states
create policy "user_game_states_select_own"
  on public.user_game_states for select
  using (auth.uid() = user_id);

create policy "user_game_states_insert_own"
  on public.user_game_states for insert
  with check (auth.uid() = user_id);

create policy "user_game_states_update_own"
  on public.user_game_states for update
  using (auth.uid() = user_id);

create policy "user_game_states_delete_own"
  on public.user_game_states for delete
  using (auth.uid() = user_id);

-- Allow all users to read game world info (but not modify)
create policy "game_worlds_select_all"
  on public.game_worlds for select
  to authenticated
  using (true);
