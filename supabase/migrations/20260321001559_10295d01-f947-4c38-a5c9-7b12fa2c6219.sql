create table public.omega_tests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  test_date date not null,
  omega3_index numeric,
  omega6_3_ratio numeric,
  aa numeric,
  epa numeric,
  dha numeric,
  la numeric,
  notes text,
  created_at timestamptz default now()
);

alter table public.omega_tests enable row level security;

create policy "Users manage own tests"
  on public.omega_tests
  for all
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());