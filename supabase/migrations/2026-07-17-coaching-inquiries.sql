create table if not exists coaching_inquiries (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null,
  stage text not null check (stage in ('beginner', 'intermediate', 'advanced')),
  goal text not null check (goal in ('cut', 'bulk', 'recomp', 'contest-prep')),
  message text not null default '',
  created_at timestamptz not null default now()
);

alter table coaching_inquiries enable row level security;

-- Public lead-capture form: anyone can insert (that's the whole point of a public
-- apply form), nobody but Carl reads it back out through the anon key path today
-- (no public page displays inquiries) — same anon-key pattern Row/Coaching
-- Dashboard already use, scoped down to insert-only since there's no reason for
-- public read/update/delete on someone else's submitted inquiry.
create policy "anon insert-only on coaching_inquiries"
  on coaching_inquiries
  for insert
  to anon
  with check (true);
