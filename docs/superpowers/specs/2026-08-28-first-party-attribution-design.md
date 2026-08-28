# First-Party Attribution Capture — Design

## Problem

`coaching_inquiries` and `macro_leads` (the two lead-capture tables backing `index.html` and `macros.html`) insert only the fields the visitor typed into the form — no record of what brought them to the page. Content Manager tracks post performance; nothing connects a post to the inquiry or macro-lead it produced. The portfolio can measure what gets views but not what creates a coaching client — confirmed by direct code read of both forms' submit handlers (`index.html:158-160`, `macros.html:209-213`), neither of which touches `location.search` or any attribution field.

This is the foundational slice of the larger revenue-attribution loop (content → inquiry → client activation → payment) identified in the 2026-08-28 Codex full-portfolio pass. Carrying attribution through to client/billing state and building a Content conversion report are later, separate slices — this spec covers only the capture point.

## Goal

Every inquiry/macro-lead row records where the visitor came from (`source`, `campaign`, optionally `content_idea_id`), which page captured them (`landing_path`), and when they first arrived (`first_touch_at`) — using genuine first-touch semantics (a return visit later doesn't overwrite an earlier campaign attribution), with zero risk of ever blocking a form submission.

## Design

### 1. Migration

New file `supabase/migrations/2026-08-28-lead-attribution.sql`, adding to both tables:

```sql
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
```

All nullable — existing rows are unaffected, and a direct/organic visitor genuinely has no source/campaign, which must be representable, not defaulted to an empty string.

### 2. Capture logic (duplicated inline in both pages, per the repo's existing no-shared-JS style)

Runs once, near the top of each page's existing `<script>` IIFE, before the submit handler:

- Check `localStorage.getItem('attribution')`.
- If present and parses as JSON: leave it alone. That record **is** the visitor's first touch — a link clicked today must never overwrite one clicked last week.
- If absent (or unparseable): build a new record from the current page load — `utm_source`/`utm_campaign`/`content_idea_id` read from `URLSearchParams(location.search)` (each `null` if not present), `landing_path: location.pathname`, `first_touch_at: new Date().toISOString()` — and write it to `localStorage['attribution']`. A pure direct visit (no query params at all) still writes a record with `source`/`campaign`/`content_idea_id` all `null`, so "direct/organic" is a real, queryable category later, not silently missing data.
- All localStorage access wrapped in try/catch. Any failure (private browsing, storage disabled) means this submission simply carries no attribution — the capture step must never throw or block the page.

On submit, read `localStorage.getItem('attribution')` again (parse, fallback to `{}` on any failure) and spread `source`/`campaign`/`content_idea_id`/`landing_path`/`first_touch_at` into the existing insert payload alongside the current form fields.

Query param convention: `utm_source`/`utm_campaign` (industry-standard names) map to the `source`/`campaign` columns. `content_idea_id` is read verbatim. Nothing generates tagged links to this repo yet (confirmed — no `utm_`/attribution references anywhere in `content/src`), so this spec establishes the convention rather than matching an existing one.

### 3. Error handling

- localStorage unavailable at read (page load) or write (first-touch persist) or read (submit time): caught, treated as "no attribution available," submission proceeds with those fields `null`/absent. Never surfaced to the visitor, never blocks `Submit Application`/the macro-calculator submit.
- Malformed/corrupted `localStorage['attribution']` JSON: caught by the same try/catch, treated as absent (a fresh record is captured on next load, or `{}` is used at submit time if this happens exactly at submission).

## Testing

This repo has no test infrastructure (matches its all-inline-script, no-build-step style throughout) — verification is manual, done once per page after implementation:

1. Clear `localStorage`, visit `?utm_source=test&utm_campaign=launch`, submit. Confirm the row has `source='test'`, `campaign='launch'`, `landing_path` set, `first_touch_at` populated.
2. Clear `localStorage`, visit with no query params, submit. Confirm the row has `source`/`campaign`/`content_idea_id` all `null`, `landing_path`/`first_touch_at` still populated.
3. With step 1's `localStorage['attribution']` still present, revisit with different `?utm_source=other`, submit. Confirm the row still shows `source='test'` (the original first touch), not `'other'`.

## Out of scope

- Carrying attribution into `coaching-app`'s client/billing records (a later, separate slice per the Codex pass's own Week 3 sequencing).
- Any Content Manager report/dashboard consuming this data.
- Third-party pixels/tracking (the Codex pass explicitly recommends against this until first-party attribution is working).
- Generating tagged links from Content Manager — this spec only makes the landing pages capable of receiving and storing them.
