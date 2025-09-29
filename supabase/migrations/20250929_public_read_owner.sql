-- Public read model with single owner write access
-- 1) Owner config and helper function
create schema if not exists app;

create table if not exists app.config (
  owner_user_id uuid primary key
);

create or replace function app.owner_id()
returns uuid language sql stable as $$
  select coalesce((select owner_user_id from app.config limit 1), '00000000-0000-0000-0000-000000000000'::uuid)
$$;

-- 2) Update RLS policies to allow public SELECT for the single owner
-- books
drop policy if exists "books owner select" on public.books;
create policy "books public select (owner or self)" on public.books
  for select using (user_id = auth.uid() or user_id = app.owner_id());

drop policy if exists "books owner modify" on public.books;
create policy "books owner modify" on public.books
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- notes
drop policy if exists "notes owner select" on public.notes;
create policy "notes public select (owner or self)" on public.notes
  for select using (user_id = auth.uid() or user_id = app.owner_id());

drop policy if exists "notes owner modify" on public.notes;
create policy "notes owner modify" on public.notes
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- tags
drop policy if exists "tags owner select" on public.tags;
create policy "tags public select (owner or self)" on public.tags
  for select using (user_id = auth.uid() or user_id = app.owner_id());

drop policy if exists "tags owner modify" on public.tags;
create policy "tags owner modify" on public.tags
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- book_tags
drop policy if exists "book_tags owner select" on public.book_tags;
create policy "book_tags public select (owner or self)" on public.book_tags
  for select using (
    exists (
      select 1 from public.books b
      where b.id = book_id and b.user_id in (auth.uid(), app.owner_id())
    ) and exists (
      select 1 from public.tags t
      where t.id = tag_id and t.user_id in (auth.uid(), app.owner_id())
    )
  );

drop policy if exists "book_tags owner modify" on public.book_tags;
create policy "book_tags owner modify" on public.book_tags
  for all with check (
    exists (
      select 1 from public.books b
      where b.id = book_id and b.user_id = auth.uid()
    ) and exists (
      select 1 from public.tags t
      where t.id = tag_id and t.user_id = auth.uid()
    )
  );

-- note_tags
drop policy if exists "note_tags owner select" on public.note_tags;
create policy "note_tags public select (owner or self)" on public.note_tags
  for select using (
    exists (
      select 1 from public.notes n
      where n.id = note_id and n.user_id in (auth.uid(), app.owner_id())
    ) and exists (
      select 1 from public.tags t
      where t.id = tag_id and t.user_id in (auth.uid(), app.owner_id())
    )
  );

drop policy if exists "note_tags owner modify" on public.note_tags;
create policy "note_tags owner modify" on public.note_tags
  for all with check (
    exists (
      select 1 from public.notes n
      where n.id = note_id and n.user_id = auth.uid()
    ) and exists (
      select 1 from public.tags t
      where t.id = tag_id and t.user_id = auth.uid()
    )
  );

-- entities
drop policy if exists "entities owner select" on public.entities;
create policy "entities public select (owner or self)" on public.entities
  for select using (user_id = auth.uid() or user_id = app.owner_id());

drop policy if exists "entities owner modify" on public.entities;
create policy "entities owner modify" on public.entities
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- links
drop policy if exists "links owner select" on public.links;
create policy "links public select (owner or self)" on public.links
  for select using (user_id = auth.uid() or user_id = app.owner_id());

drop policy if exists "links owner modify" on public.links;
create policy "links owner modify" on public.links
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- attachments
drop policy if exists "attachments owner select" on public.attachments;
create policy "attachments public select (owner or self)" on public.attachments
  for select using (user_id = auth.uid() or user_id = app.owner_id());

drop policy if exists "attachments owner modify" on public.attachments;
create policy "attachments owner modify" on public.attachments
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- NOTE:
-- After applying, insert your owner user id once:
--   insert into app.config(owner_user_id) values ('<YOUR_AUTH_USERS_UUID>')
--   on conflict (owner_user_id) do update set owner_user_id = excluded.owner_user_id;

