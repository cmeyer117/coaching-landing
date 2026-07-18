# Black Magma Macros — free macro calculator lead magnet

## Purpose

Free, public macro calculator branded "Black Magma Macros," added to the coaching landing site. Visitor enters basic stats, gives an email, gets calorie/macro targets instantly. Feeds the same coaching lead pipeline as the existing "Apply for Coaching" form.

## Scope

New static page in the existing `coaching-landing` repo. No new infra, no external API — all math is local. One new Supabase table.

## Architecture

- New page: `macros.html`, same pattern as `index.html` — single static HTML file, no build step, same fonts/color tokens/component styles (`.field`, `.btn`, `.apply-status` classes reused), Supabase JS loaded via the same CDN `<script>` tag.
- Linked from `index.html` (nav or a CTA card) — exact placement is an implementation detail, not a design decision.
- No redirect on submit (unlike the apply form's `thanks.html`) — results reveal inline on the same page, since immediate value is the point of a lead magnet.

## Inputs

Single form, one submit ("Get My Macros"):

- Sex (male/female — needed for Mifflin-St Jeor)
- Age (years)
- Height (ft/in, US audience)
- Weight (lb)
- Activity level, 5 tiers, plain-English labels (not "sedentary/light/moderate" jargon):
  1. Little to no exercise, desk job
  2. Light exercise 1-3x/week
  3. Moderate exercise 3-5x/week
  4. Heavy exercise 6-7x/week
  5. Very heavy exercise + physical job
- Goal: cut / bulk / recomp
- Email (required to reveal results)

No body-fat %, no lean-mass entry, no dietary-pattern picker — deliberately excluded per beginner-simplicity call.

**Input bounds** (client-side validation, invalid → inline error, same as email validation): age 13-100, height 36-96 in, weight 60-600 lb. These aren't medical limits — they're sanity bounds to keep the formula from producing nonsense (e.g. negative carbs) at the edges.

## Formula (practical estimate, in line with common ISSN/Helms/Barbell Medicine calculator approaches — not a personalized medical calculation)

1. **BMR** — Mifflin-St Jeor:
   - Male: `10 × weight_kg + 6.25 × height_cm - 5 × age + 5`
   - Female: `10 × weight_kg + 6.25 × height_cm - 5 × age - 161`
2. **TDEE** — BMR × activity multiplier: `1.2, 1.375, 1.55, 1.725, 1.9` for tiers 1-5.
3. **Calorie target** — goal adjustment on TDEE:
   - Cut: TDEE × 0.8 (≈20% deficit)
   - Bulk: TDEE × 1.125 (≈12.5% surplus)
   - Recomp: TDEE × 0.95 (small deficit)
4. **Protein** — `1g × weight_lb`, flat (within ISSN 1.6-2.2g/kg range, no lean-mass complexity).
5. **Fat** — `25%` of calorie target ÷ 9 kcal/g.
6. **Carbs** — remaining calories (`calories - protein×4 - fat×9`) ÷ 4 kcal/g. If this goes below a 50g floor, clamp carbs to 50g and reduce fat instead (protein and calorie target are never sacrificed) — protects against the protein+fat floor eating the whole budget for small/light users.

Implemented as one pure function, `calculateMacros(inputs) → { calories, proteinG, fatG, carbG }`, unit-agnostic internally (converts lb→kg, ft/in→cm at the boundary; height persisted as total inches). All intermediate math done in floats; only the four returned values are rounded (to the nearest whole gram/calorie), once, at the end — no cascading rounding error.

## Data flow

1. User fills form, clicks "Get My Macros."
2. Client validates email (same regex/pattern as the apply form) and required fields. Invalid → inline error in a status line, same as `index.html`'s `.apply-status.error` pattern.
3. Valid → `calculateMacros()` runs locally, produces the four numbers.
4. Insert into `macro_leads` (Supabase, anon key — same project as `coaching_inquiries`): raw inputs + computed results.
5. Insert error → inline status error, button re-enabled, results NOT shown (email gate stays intact — no insert, no results, matches "email required to see results" intent).
6. Insert success → results panel reveals inline (calories + 3 macros in grams), a one-line disclaimer ("Estimate only, not medical or nutrition advice — adjust based on real-world results"), plus a CTA: "Ready for real coaching?" linking to `index.html#apply`.

## Data model — `macro_leads`

Follows the exact convention of the existing `coaching_inquiries` table/migration:

```sql
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
```

Insert-only anon policy, same rationale as `coaching_inquiries`: public lead capture needs public insert, nothing reads it back out through the public page.

## Error handling

Mirrors the apply form exactly: inline `.apply-status` / `.apply-status.error` text, button `disabled` during the request, re-enabled on failure, no page reload, no alert()/confirm() dialogs.

## Testing

`calculateMacros()` is a pure function — gets an inline assert-based self-check in the page's `<script>` block (a handful of known input/output pairs, e.g. a documented reference case), consistent with the repo's no-build/no-framework setup. No test runner added.

## Out of scope

- Body-fat-% or lean-mass-based protein targeting
- Dietary-pattern picker (low-carb/low-fat/balanced)
- Adaptive-metabolism modeling (Precision Nutrition-style)
- Metric unit toggle
- Editing/re-running a saved calculation (each submit is a new lead row)
- Spam/rate-limit protection (honeypot, CAPTCHA) — anon insert-only is spam-prone by nature; acceptable for MVP, same exposure the existing apply form already has
