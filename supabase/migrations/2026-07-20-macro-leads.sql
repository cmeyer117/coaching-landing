create table if not exists macro_leads (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  sex text not null check (sex in ('male', 'female')),
  age int not null check (age between 13 and 100),
  height_in int not null check (height_in between 36 and 96),
  weight_lb numeric not null check (weight_lb between 60 and 600),
  activity_level int not null check (activity_level between 1 and 5),
  goal text not null check (goal in ('cut', 'bulk', 'recomp')),
  calories int not null check (calories > 0),
  protein_g int not null check (protein_g > 0),
  fat_g int not null check (fat_g > 0),
  carb_g int not null check (carb_g >= 0),
  created_at timestamptz not null default now()
);

alter table macro_leads add constraint macro_leads_email_len check (char_length(email) <= 200);

alter table macro_leads enable row level security;

create policy "anon insert-only on macro_leads"
  on macro_leads
  for insert
  to anon
  with check (true);
