
create table public.auto_webinar_guest_messages (
  id uuid primary key default gen_random_uuid(),
  guest_registration_id uuid references public.guest_event_registrations(id) on delete cascade,
  guest_email text not null,
  guest_name text,
  config_id uuid references public.auto_webinar_config(id) on delete cascade,
  video_id uuid references public.auto_webinar_videos(id) on delete set null,
  content text not null,
  sent_at_second integer not null,
  created_at timestamptz default now()
);

alter table public.auto_webinar_guest_messages enable row level security;

create policy "anyone_can_insert_guest_messages" on public.auto_webinar_guest_messages for insert with check (true);
create policy "authenticated_can_read_guest_messages" on public.auto_webinar_guest_messages for select to authenticated using (true);
