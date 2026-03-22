-- Tabela folderów dla plików BP
create table public.bp_page_folders (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  description text,
  created_at timestamptz default now()
);
alter table public.bp_page_folders enable row level security;

create policy "Admin select bp_page_folders" on public.bp_page_folders for select to authenticated using (public.has_role(auth.uid(), 'admin'));
create policy "Admin insert bp_page_folders" on public.bp_page_folders for insert to authenticated with check (public.has_role(auth.uid(), 'admin'));
create policy "Admin update bp_page_folders" on public.bp_page_folders for update to authenticated using (public.has_role(auth.uid(), 'admin'));
create policy "Admin delete bp_page_folders" on public.bp_page_folders for delete to authenticated using (public.has_role(auth.uid(), 'admin'));

-- Tabela metadanych plików BP
create table public.bp_page_files (
  id uuid primary key default gen_random_uuid(),
  file_name text not null,
  original_name text not null,
  file_url text not null,
  file_size bigint not null default 0,
  mime_type text,
  folder text not null default 'default',
  description text,
  position int not null default 0,
  uploaded_by uuid references auth.users(id),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
alter table public.bp_page_files enable row level security;

create policy "Admin select bp_page_files" on public.bp_page_files for select to authenticated using (public.has_role(auth.uid(), 'admin'));
create policy "Admin insert bp_page_files" on public.bp_page_files for insert to authenticated with check (public.has_role(auth.uid(), 'admin'));
create policy "Admin update bp_page_files" on public.bp_page_files for update to authenticated using (public.has_role(auth.uid(), 'admin'));
create policy "Admin delete bp_page_files" on public.bp_page_files for delete to authenticated using (public.has_role(auth.uid(), 'admin'));

-- Seed domyślny folder
insert into public.bp_page_folders (name, description) values ('default', 'Domyślny folder');