# First-Party Attribution Capture Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Every `coaching_inquiries`/`macro_leads` row records where the visitor came from (source/campaign/content_idea_id), which page, and their genuine first-touch time — without ever risking a blocked form submission.

**Architecture:** One migration adds 5 nullable columns to both tables. Each page's existing inline `<script>` gains a small first-touch-capture block (localStorage-backed, try/catch-wrapped) that runs before the submit handler, and the submit handler spreads the captured fields into its existing insert call.

**Tech Stack:** Plain HTML/JS (no build step, no framework), Supabase Postgres via the browser `@supabase/supabase-js` client already loaded on both pages, migrations applied via the Supabase MCP.

---

## File Structure

- Create: `supabase/migrations/2026-08-28-lead-attribution.sql` — the 5-column addition to both tables
- Modify: `index.html` — add capture block + spread into the existing `coaching_inquiries` insert
- Modify: `macros.html` — add capture block + spread into the existing `macro_leads` insert

No test files — this repo has no test infrastructure (matches its existing all-inline-script style). Verification is manual per the design spec's own Testing section: each task ends with a real browser check against the live (already-migrated) Supabase table via the Supabase MCP, not an automated test run.

---

### Task 1: Migration — add attribution columns

**Files:**
- Create: `supabase/migrations/2026-08-28-lead-attribution.sql`

- [ ] **Step 1: Write the migration file**

```sql
-- supabase/migrations/2026-08-28-lead-attribution.sql
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

- [ ] **Step 2: Apply the migration via the Supabase MCP**

Use the `apply_migration` tool against project `vikpcejlyxieguorwysf`, `name: "2026-08-28-lead-attribution"`, with the SQL above as `query`.

- [ ] **Step 3: Verify the columns exist**

Use the Supabase MCP `execute_sql` tool against project `vikpcejlyxieguorwysf`:

```sql
select column_name from information_schema.columns
where table_name in ('coaching_inquiries', 'macro_leads')
  and column_name in ('source', 'campaign', 'content_idea_id', 'landing_path', 'first_touch_at')
order by table_name, column_name;
```

Expected: 10 rows (5 columns × 2 tables).

- [ ] **Step 4: Commit**

```bash
cd /c/Users/gregm/coaching-landing
git add supabase/migrations/2026-08-28-lead-attribution.sql
git commit -m "feat: add attribution columns to coaching_inquiries and macro_leads"
```

---

### Task 2: `index.html` — capture and submit attribution

**Files:**
- Modify: `index.html:132-169` (the existing inline `<script>` block)

- [ ] **Step 1: Add the capture block, right after `'use strict';` and before the existing `const SUPABASE_URL` line**

```javascript
  function captureAttribution() {
    try {
      const existing = localStorage.getItem('attribution');
      if (existing) return JSON.parse(existing);
    } catch (e) { /* corrupted or blocked -- fall through and capture fresh */ }

    const params = new URLSearchParams(location.search);
    const record = {
      source: params.get('utm_source'),
      campaign: params.get('utm_campaign'),
      content_idea_id: params.get('content_idea_id'),
      landing_path: location.pathname,
      first_touch_at: new Date().toISOString()
    };
    try { localStorage.setItem('attribution', JSON.stringify(record)); } catch (e) { /* storage blocked -- record still usable this page load */ }
    return record;
  }

  function readAttribution() {
    try {
      const raw = localStorage.getItem('attribution');
      return raw ? JSON.parse(raw) : {};
    } catch (e) { return {}; }
  }

  captureAttribution();
```

- [ ] **Step 2: Update the submit handler's insert call to spread in the captured fields**

Change (`index.html`, currently):

```javascript
    btn.disabled = true;
    const { error } = await supa.from('coaching_inquiries').insert({
      name: name, email: email, stage: stage, goal: goal, message: message
    });
```

to:

```javascript
    btn.disabled = true;
    const attribution = readAttribution();
    const { error } = await supa.from('coaching_inquiries').insert({
      name: name, email: email, stage: stage, goal: goal, message: message,
      source: attribution.source ?? null,
      campaign: attribution.campaign ?? null,
      content_idea_id: attribution.content_idea_id ?? null,
      landing_path: attribution.landing_path ?? null,
      first_touch_at: attribution.first_touch_at ?? null
    });
```

- [ ] **Step 3: Manual verification — direct visit (no attribution)**

Open `index.html` directly in a browser (or via a local static server) with dev tools open. Run `localStorage.clear()` in the console first. Fill in the form (any valid name/email) and submit. Confirm it redirects to `thanks.html` (no error shown).

Then, via the Supabase MCP `execute_sql` tool against project `vikpcejlyxieguorwysf`:

```sql
select name, email, source, campaign, content_idea_id, landing_path, first_touch_at
from coaching_inquiries order by created_at desc limit 1;
```

Expected: the row you just submitted, with `source`/`campaign`/`content_idea_id` all `null`, `landing_path` = `/index.html` or `/` (whatever the page's actual path is), `first_touch_at` populated with a recent timestamp.

- [ ] **Step 4: Manual verification — tagged visit**

Run `localStorage.clear()` again. Open the page with `?utm_source=test&utm_campaign=launch` appended to the URL. Submit the form again.

```sql
select name, source, campaign, first_touch_at
from coaching_inquiries order by created_at desc limit 1;
```

Expected: `source='test'`, `campaign='launch'`.

- [ ] **Step 5: Manual verification — first-touch persistence**

Without clearing `localStorage` from Step 4, reload the page with a *different* query string: `?utm_source=other&utm_campaign=different`. Submit again.

```sql
select name, source, campaign
from coaching_inquiries order by created_at desc limit 1;
```

Expected: `source='test'`, `campaign='launch'` — the *original* Step 4 values, not `'other'`/`'different'`. This confirms first-touch semantics (existing `localStorage` record wins over new URL params).

- [ ] **Step 6: Commit**

```bash
cd /c/Users/gregm/coaching-landing
git add index.html
git commit -m "feat: capture and persist first-touch attribution on coaching_inquiries"
```

---

### Task 3: `macros.html` — capture and submit attribution

**Files:**
- Modify: `macros.html` (the existing inline `<script>` block, same pattern as Task 2)

- [ ] **Step 1: Add the same capture block as Task 2, Step 1, in the equivalent position in `macros.html`'s `<script>` (after `'use strict';`, before the existing Supabase client setup)**

Identical code to Task 2 Step 1 — same two functions (`captureAttribution`, `readAttribution`), same call to `captureAttribution()`.

- [ ] **Step 2: Update the submit handler's insert call**

Change (`macros.html`, currently):

```javascript
    const { error } = await supa.from('macro_leads').insert({
      email: email, sex: sex, age: age, height_in: heightIn, weight_lb: weightLb,
      activity_level: activityLevel, goal: goal,
      calories: macros.calories, protein_g: macros.proteinG, fat_g: macros.fatG, carb_g: macros.carbG
    });
```

to:

```javascript
    const attribution = readAttribution();
    const { error } = await supa.from('macro_leads').insert({
      email: email, sex: sex, age: age, height_in: heightIn, weight_lb: weightLb,
      activity_level: activityLevel, goal: goal,
      calories: macros.calories, protein_g: macros.proteinG, fat_g: macros.fatG, carb_g: macros.carbG,
      source: attribution.source ?? null,
      campaign: attribution.campaign ?? null,
      content_idea_id: attribution.content_idea_id ?? null,
      landing_path: attribution.landing_path ?? null,
      first_touch_at: attribution.first_touch_at ?? null
    });
```

- [ ] **Step 3: Manual verification — same 3 scenarios as Task 2 (direct, tagged, first-touch-persists), against `macro_leads`**

```sql
select email, source, campaign, content_idea_id, landing_path, first_touch_at
from macro_leads order by created_at desc limit 1;
```

Run the same `localStorage.clear()` → direct submit → check-nulls, then `?utm_source=test&utm_campaign=launch` → submit → check-values, then different query string with existing `localStorage` → submit → check-original-values-persist sequence as Task 2 Steps 3-5, substituting the `macro_leads` table and this page's form (fill in valid sex/age/height/weight/activity/goal to get past validation).

- [ ] **Step 4: Commit**

```bash
cd /c/Users/gregm/coaching-landing
git add macros.html
git commit -m "feat: capture and persist first-touch attribution on macro_leads"
```

---

### Task 4: Cleanup test data

**Files:** none (data-only)

- [ ] **Step 1: Delete the manual-verification test rows from both tables**

Via the Supabase MCP `execute_sql` tool against project `vikpcejlyxieguorwysf` — identify the test rows by email/name used during Task 2/3 verification (or by `created_at` being within the verification window) and delete them, e.g.:

```sql
delete from coaching_inquiries where email = '<the test email used>';
delete from macro_leads where email = '<the test email used>';
```

Confirm afterward with a `select count(*)` scoped to that email returning `0` for both tables.

---

## Plan self-review notes

- **Spec coverage:** migration (Task 1) covers the schema; capture-and-persist logic (Tasks 2-3) covers both the localStorage first-touch mechanic and the query-param convention (`utm_source`/`utm_campaign`/`content_idea_id`) from the spec; the spec's 3-scenario manual test plan is reproduced verbatim as verification steps in Tasks 2 and 3, once per page as the spec requires (attribution is page-scoped since each page runs its own independent script, though `localStorage` itself is domain-scoped — a real cross-page persistence detail worth knowing during verification: if both pages are served from the same origin, a first touch captured on one page will carry over to a submission on the other, which is correct first-touch behavior, not a bug).
- **Error handling:** both `captureAttribution` and `readAttribution` wrap all `localStorage` access in try/catch per the spec's requirement that a submission must never be blocked by an attribution failure — matches the design's "Error handling" section exactly.
- **Placeholder scan:** none — every step has literal code, exact file targets, and concrete SQL with expected results.
- **Type consistency:** `readAttribution()`'s return shape (`source`, `campaign`, `content_idea_id`, `landing_path`, `first_touch_at`) is identical across Task 2 and Task 3's insert-spreading code, and matches the 5 migration columns 1:1 in both name and order.
- **Out-of-scope items** (client/billing carry-through, Content Manager report, tagged-link generation) are correctly absent from this plan, matching the design spec's own scope boundary.
