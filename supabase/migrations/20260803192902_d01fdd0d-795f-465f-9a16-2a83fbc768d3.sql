create table public.nycoder_settings (
  id integer primary key default 1,
  system_prompt text not null default '',
  temperature numeric not null default 0.2,
  model_chain text[] not null default array['google/gemini-3.1-pro-preview','google/gemini-3.6-flash','google/gemini-2.5-flash'],
  self_improve boolean not null default true,
  updated_at timestamptz not null default now(),
  constraint nycoder_settings_singleton check (id = 1)
);
insert into public.nycoder_settings (id) values (1);
grant select on public.nycoder_settings to authenticated;
grant all on public.nycoder_settings to service_role;
alter table public.nycoder_settings enable row level security;
create policy "Nycoder settings read" on public.nycoder_settings for select to authenticated using (true);
create policy "Admins manage nycoder settings" on public.nycoder_settings for all using (has_role(auth.uid(),'admin')) with check (has_role(auth.uid(),'admin'));

create table public.nycoder_training (
  id uuid primary key default gen_random_uuid(),
  tag text not null default 'general',
  prompt text not null,
  answer text not null,
  active boolean not null default true,
  created_at timestamptz not null default now()
);
grant select on public.nycoder_training to authenticated;
grant all on public.nycoder_training to service_role;
alter table public.nycoder_training enable row level security;
create policy "Nycoder training read" on public.nycoder_training for select to authenticated using (true);
create policy "Admins manage nycoder training" on public.nycoder_training for all using (has_role(auth.uid(),'admin')) with check (has_role(auth.uid(),'admin'));

create table public.nycoder_memory (
  user_id uuid primary key references auth.users(id) on delete cascade,
  notes text not null default '',
  turns integer not null default 0,
  updated_at timestamptz not null default now()
);
grant select, insert, update on public.nycoder_memory to authenticated;
grant all on public.nycoder_memory to service_role;
alter table public.nycoder_memory enable row level security;
create policy "Users see own nycoder memory" on public.nycoder_memory for select to authenticated using (auth.uid() = user_id or has_role(auth.uid(),'admin'));
create policy "Users write own nycoder memory" on public.nycoder_memory for insert to authenticated with check (auth.uid() = user_id);
create policy "Users update own nycoder memory" on public.nycoder_memory for update to authenticated using (auth.uid() = user_id);

create table public.broadcasts (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  message text not null default '',
  video_url text,
  active boolean not null default true,
  created_at timestamptz not null default now()
);
grant select on public.broadcasts to authenticated;
grant all on public.broadcasts to service_role;
alter table public.broadcasts enable row level security;
create policy "Broadcasts read" on public.broadcasts for select to authenticated using (active);
create policy "Admins manage broadcasts" on public.broadcasts for all using (has_role(auth.uid(),'admin')) with check (has_role(auth.uid(),'admin'));

create table public.site_pages (
  slug text primary key,
  title text not null default '',
  content text not null default '',
  updated_at timestamptz not null default now()
);
insert into public.site_pages (slug, title, content) values
  ('home', 'WELCOME TO NYCODEHUB', 'Hitamo ururimi rwa porogaramu, ufungure template y''umushinga, wandike code urebe igisohoka ako kanya — NYCODER igufasha gukosora amakosa.'),
  ('payment', 'Kwishyura', 'Ishyura ukoresheje MoMo hanyuma wandike transaction ID.');
grant select on public.site_pages to anon;
grant select on public.site_pages to authenticated;
grant all on public.site_pages to service_role;
alter table public.site_pages enable row level security;
create policy "Site pages read" on public.site_pages for select using (true);
create policy "Admins manage site pages" on public.site_pages for all using (has_role(auth.uid(),'admin')) with check (has_role(auth.uid(),'admin'));

create trigger set_updated_at_nycoder_settings before update on public.nycoder_settings for each row execute function public.set_updated_at();
create trigger set_updated_at_site_pages before update on public.site_pages for each row execute function public.set_updated_at();