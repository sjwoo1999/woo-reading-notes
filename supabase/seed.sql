-- Optional: create profile only if matching auth.users row exists (avoids FK error)
insert into public.profiles (id, full_name)
select '00000000-0000-0000-0000-000000000000', 'Sample User'
where exists (select 1 from auth.users where id = '00000000-0000-0000-0000-000000000000')
on conflict (id) do nothing;

-- books
insert into public.books (id, user_id, title, author, published_year, rating, progress)
values
  ('11111111-1111-1111-1111-111111111111', '00000000-0000-0000-0000-000000000000', 'Clean Architecture', 'Robert C. Martin', 2017, 5, 80),
  ('22222222-2222-2222-2222-222222222222', '00000000-0000-0000-0000-000000000000', 'Thinking, Fast and Slow', 'Daniel Kahneman', 2011, 4, 30)
on conflict do nothing;

-- notes
insert into public.notes (id, user_id, book_id, title, content)
values
  ('33333333-3333-3333-3333-333333333333', '00000000-0000-0000-0000-000000000000', '11111111-1111-1111-1111-111111111111', 'SRP 핵심', '각 모듈은 단 하나의 책임만.'),
  ('44444444-4444-4444-4444-444444444444', '00000000-0000-0000-0000-000000000000', '22222222-2222-2222-2222-222222222222', '시스템 1/2', '빠른 직관 vs 느린 분석.')
on conflict do nothing;

-- tags
insert into public.tags (id, user_id, name) values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '00000000-0000-0000-0000-000000000000', 'architecture'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '00000000-0000-0000-0000-000000000000', 'cognitive')
on conflict do nothing;

insert into public.book_tags (book_id, tag_id) values
  ('11111111-1111-1111-1111-111111111111', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'),
  ('22222222-2222-2222-2222-222222222222', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb')
on conflict do nothing;

-- entities
insert into public.entities (id, user_id, name, type, description) values
  ('eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', '00000000-0000-0000-0000-000000000000', 'Single Responsibility Principle', 'concept', '각 클래스는 하나의 책임.'),
  ('ffffffff-ffff-ffff-ffff-ffffffffffff', '00000000-0000-0000-0000-000000000000', 'Daniel Kahneman', 'person', '심리학자')
on conflict do nothing;

-- links
insert into public.links (id, user_id, src_type, src_id, dst_type, dst_id, link_type, weight)
values
  ('99999999-9999-9999-9999-999999999999', '00000000-0000-0000-0000-000000000000', 'book', '11111111-1111-1111-1111-111111111111', 'entity', 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', 'mentions', 1),
  ('aaaaaaaa-1111-2222-3333-bbbbbbbbbbbb', '00000000-0000-0000-0000-000000000000', 'note', '33333333-3333-3333-3333-333333333333', 'entity', 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', 'references', 0.8),
  ('bbbbbbbb-2222-3333-4444-cccccccccccc', '00000000-0000-0000-0000-000000000000', 'book', '22222222-2222-2222-2222-222222222222', 'entity', 'ffffffff-ffff-ffff-ffff-ffffffffffff', 'author', 1)
on conflict do nothing;
