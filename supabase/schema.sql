-- extensions
create extension if not exists "uuid-ossp";
create extension if not exists "pg_trgm";

-- helper: current user id
create or replace function auth_uid() returns uuid language sql stable as $$
  select coalesce((select auth.uid()), '00000000-0000-0000-0000-000000000000'::uuid)
$$;

-- profiles
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- books
create table if not exists public.books (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null default auth_uid(),
  title text not null,
  author text,
  publisher text,
  published_year int,
  isbn text,
  rating int check (rating between 0 and 5),
  progress int check (progress between 0 and 100),
  summary text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- notes
create table if not exists public.notes (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null default auth_uid(),
  book_id uuid references public.books(id) on delete set null,
  title text,
  content text,
  location text,
  highlight_color text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- tags
create table if not exists public.tags (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null default auth_uid(),
  name text not null,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique (user_id, name)
);

create table if not exists public.book_tags (
  book_id uuid not null references public.books(id) on delete cascade,
  tag_id uuid not null references public.tags(id) on delete cascade,
  primary key (book_id, tag_id)
);

create table if not exists public.note_tags (
  note_id uuid not null references public.notes(id) on delete cascade,
  tag_id uuid not null references public.tags(id) on delete cascade,
  primary key (note_id, tag_id)
);

-- entities
create table if not exists public.entities (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null default auth_uid(),
  name text not null,
  type text not null,
  description text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- links
create table if not exists public.links (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null default auth_uid(),
  src_type text not null check (src_type in ('book','note','entity')),
  src_id uuid not null,
  dst_type text not null check (dst_type in ('book','note','entity')),
  dst_id uuid not null,
  link_type text not null,
  weight numeric,
  note text,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  constraint no_self_loop check (not (src_type = dst_type and src_id = dst_id))
);

-- attachments (optional)
create table if not exists public.attachments (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null default auth_uid(),
  owner_type text not null check (owner_type in ('book','note')),
  owner_id uuid not null,
  file_path text not null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- indices
create index if not exists idx_books_user_updated on public.books(user_id, updated_at desc);
create index if not exists idx_books_title_trgm on public.books using gin (title gin_trgm_ops);
create index if not exists idx_notes_user_updated on public.notes(user_id, updated_at desc);
create index if not exists idx_notes_content_trgm on public.notes using gin (content gin_trgm_ops);
create index if not exists idx_tags_user_name on public.tags(user_id, name);
create index if not exists idx_entities_user_name on public.entities(user_id, name);
create index if not exists idx_links_user_src on public.links(user_id, src_type, src_id);
create index if not exists idx_links_user_dst on public.links(user_id, dst_type, dst_id);

-- RLS
alter table public.profiles enable row level security;
alter table public.books enable row level security;
alter table public.notes enable row level security;
alter table public.tags enable row level security;
alter table public.book_tags enable row level security;
alter table public.note_tags enable row level security;
alter table public.entities enable row level security;
alter table public.links enable row level security;
alter table public.attachments enable row level security;

-- owner-only policies
drop policy if exists "profiles owner" on public.profiles;
create policy "profiles owner" on public.profiles
  for all using (id = auth_uid()) with check (id = auth_uid());

drop policy if exists "books owner select" on public.books;
create policy "books owner select" on public.books
  for select using (user_id = auth_uid());
drop policy if exists "books owner modify" on public.books;
create policy "books owner modify" on public.books
  for all using (user_id = auth_uid()) with check (user_id = auth_uid());

drop policy if exists "notes owner select" on public.notes;
create policy "notes owner select" on public.notes
  for select using (user_id = auth_uid());
drop policy if exists "notes owner modify" on public.notes;
create policy "notes owner modify" on public.notes
  for all using (user_id = auth_uid()) with check (user_id = auth_uid());

drop policy if exists "tags owner select" on public.tags;
create policy "tags owner select" on public.tags
  for select using (user_id = auth_uid());
drop policy if exists "tags owner modify" on public.tags;
create policy "tags owner modify" on public.tags
  for all using (user_id = auth_uid()) with check (user_id = auth_uid());

drop policy if exists "book_tags owner select" on public.book_tags;
create policy "book_tags owner select" on public.book_tags
  for select using (
    exists (select 1 from public.books b where b.id = book_id and b.user_id = auth_uid())
    and exists (select 1 from public.tags t where t.id = tag_id and t.user_id = auth_uid())
  );
drop policy if exists "book_tags owner modify" on public.book_tags;
create policy "book_tags owner modify" on public.book_tags
  for all with check (
    exists (select 1 from public.books b where b.id = book_id and b.user_id = auth_uid())
    and exists (select 1 from public.tags t where t.id = tag_id and t.user_id = auth_uid())
  );

drop policy if exists "note_tags owner select" on public.note_tags;
create policy "note_tags owner select" on public.note_tags
  for select using (
    exists (select 1 from public.notes n where n.id = note_id and n.user_id = auth_uid())
    and exists (select 1 from public.tags t where t.id = tag_id and t.user_id = auth_uid())
  );
drop policy if exists "note_tags owner modify" on public.note_tags;
create policy "note_tags owner modify" on public.note_tags
  for all with check (
    exists (select 1 from public.notes n where n.id = note_id and n.user_id = auth_uid())
    and exists (select 1 from public.tags t where t.id = tag_id and t.user_id = auth_uid())
  );

drop policy if exists "entities owner select" on public.entities;
create policy "entities owner select" on public.entities
  for select using (user_id = auth_uid());
drop policy if exists "entities owner modify" on public.entities;
create policy "entities owner modify" on public.entities
  for all using (user_id = auth_uid()) with check (user_id = auth_uid());

drop policy if exists "links owner select" on public.links;
create policy "links owner select" on public.links
  for select using (user_id = auth_uid());
drop policy if exists "links owner modify" on public.links;
create policy "links owner modify" on public.links
  for all using (user_id = auth_uid()) with check (user_id = auth_uid());

drop policy if exists "attachments owner select" on public.attachments;
create policy "attachments owner select" on public.attachments
  for select using (user_id = auth_uid());
drop policy if exists "attachments owner modify" on public.attachments;
create policy "attachments owner modify" on public.attachments
  for all using (user_id = auth_uid()) with check (user_id = auth_uid());

-- updated_at triggers
create or replace function set_updated_at() returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

do $$
begin
  if not exists (select 1 from pg_trigger where tgname = 'books_set_updated_at') then
    create trigger books_set_updated_at before update on public.books
      for each row execute function set_updated_at();
  end if;
  if not exists (select 1 from pg_trigger where tgname = 'notes_set_updated_at') then
    create trigger notes_set_updated_at before update on public.notes
      for each row execute function set_updated_at();
  end if;
  if not exists (select 1 from pg_trigger where tgname = 'tags_set_updated_at') then
    create trigger tags_set_updated_at before update on public.tags
      for each row execute function set_updated_at();
  end if;
  if not exists (select 1 from pg_trigger where tgname = 'entities_set_updated_at') then
    create trigger entities_set_updated_at before update on public.entities
      for each row execute function set_updated_at();
  end if;
  if not exists (select 1 from pg_trigger where tgname = 'links_set_updated_at') then
    create trigger links_set_updated_at before update on public.links
      for each row execute function set_updated_at();
  end if;
  if not exists (select 1 from pg_trigger where tgname = 'attachments_set_updated_at') then
    create trigger attachments_set_updated_at before update on public.attachments
      for each row execute function set_updated_at();
  end if;
end $$;
