-- Table for storing mapping elements per file/page
create table public.bp_file_mappings (
  id uuid primary key default gen_random_uuid(),
  file_id uuid references public.bp_page_files(id) on delete cascade not null,
  page_index int not null default 0,
  elements jsonb not null default '[]'::jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(file_id, page_index)
);

-- RLS: admin-only
alter table public.bp_file_mappings enable row level security;

create policy "Admins can manage bp_file_mappings"
  on public.bp_file_mappings
  for all
  to authenticated
  using (public.has_role(auth.uid(), 'admin'))
  with check (public.has_role(auth.uid(), 'admin'));

-- Auto-update updated_at
create or replace function public.update_bp_file_mappings_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger bp_file_mappings_updated_at
  before update on public.bp_file_mappings
  for each row execute function public.update_bp_file_mappings_updated_at();