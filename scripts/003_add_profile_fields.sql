-- Add profile picture and bio fields to profiles table
alter table public.profiles
  add column if not exists avatar_url text,
  add column if not exists bio text;

-- Allow users to view other users' profiles (for future leaderboard/alliance features)
drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_all"
  on public.profiles for select
  to authenticated
  using (true);
