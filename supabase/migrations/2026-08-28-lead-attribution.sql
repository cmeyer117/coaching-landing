alter table coaching_inquiries
  add column source text,
  add column campaign text,
  add column content_idea_id text,
  add column landing_path text,
  add column first_touch_at timestamptz;

alter table macro_leads
  add column source text,
  add column campaign text,
  add column content_idea_id text,
  add column landing_path text,
  add column first_touch_at timestamptz;
