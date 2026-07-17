# Coaching Landing Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build and deploy a public, single-page marketing/lead-capture site for Carl's coaching brand — hero, transformation story, founding-client offer, credibility section, and an apply form that writes to Supabase.

**Architecture:** New standalone repo (`coaching-landing`), plain static HTML/CSS/JS, no build step, no framework — mirrors the `row` repo's proven pattern. One new Supabase table (`coaching_inquiries`) in the existing shared project. Deployed as its own Vercel project, separate from Row (Row is gated and holds client PII; this page must be public with zero gate).

**Tech Stack:** Vanilla HTML/CSS/JS, Supabase JS client v2 via CDN (same anon-key pattern as Row/Coaching Dashboard), Vercel static hosting.

---

### Task 1: Initialize the repo

**Files:**
- Create: `c:\Users\gregm\coaching-landing\.gitignore`
- Create: `c:\Users\gregm\coaching-landing\.claude\launch.json`

- [ ] **Step 1: Create the directory and initialize git**

```bash
mkdir -p /c/Users/gregm/coaching-landing
cd /c/Users/gregm/coaching-landing
git init
```

- [ ] **Step 2: Write `.gitignore`**

```
.vercel
```

- [ ] **Step 3: Write `.claude/launch.json`** (for local preview during development)

```json
{
  "version": "0.0.1",
  "configurations": [
    {
      "name": "coaching-landing",
      "runtimeExecutable": "npx",
      "runtimeArgs": ["serve", "-l", "5560", "."],
      "port": 5560
    }
  ]
}
```

- [ ] **Step 4: Commit** (includes this plan doc, already written to disk at `docs/superpowers/plans/2026-07-17-coaching-landing-page.md` before Task 1 ran)

```bash
git add .gitignore .claude/launch.json docs/superpowers/plans/2026-07-17-coaching-landing-page.md
git commit -m "chore: initialize coaching-landing repo"
```

---

### Task 2: `index.html` — hero, transformation, founding-clients, who-this-is sections

**Files:**
- Create: `c:\Users\gregm\coaching-landing\index.html`

- [ ] **Step 1: Write the page shell, CSS, and first four sections**

```html
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="theme-color" content="#050506">
<title>Carl Meyer — Faith. Iron. Ambition.</title>
<meta name="description" content="1:1 online bodybuilding coaching from a competitive athlete pursuing his IFBB Pro card. Faith-first, real training, no guru act.">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600;700&display=swap" rel="stylesheet">
<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
<style>
:root {
  --text-primary: #F4F1EA; --text-secondary: #B8B6B0; --text-tertiary: #76746E;
  --accent: #6EE7B7; --danger: #FF6B6B;
  --font: -apple-system, BlinkMacSystemFont, "Inter", "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
  --font-serif: 'Instrument Serif', Georgia, serif;
  --font-mono: 'JetBrains Mono', ui-monospace, "SF Mono", Menlo, Consolas, monospace;
}
* { box-sizing: border-box; }
html, body { margin: 0; padding: 0; background: #000; color: var(--text-secondary); font-family: var(--font); }
body { overflow-x: hidden; }
.section { max-width: 720px; margin: 0 auto; padding: 60px 20px; }
.eyebrow { font-family: var(--font-mono); font-size: 12px; font-weight: 700; letter-spacing: 0.2em; text-transform: uppercase; color: var(--accent); margin-bottom: 14px; }
h1, h2 { font-family: var(--font-serif); color: var(--text-primary); font-weight: 700; margin: 0 0 16px; }
.hero { padding-top: max(80px, env(safe-area-inset-top)); text-align: center; }
.hero h1 { font-size: 34px; font-style: italic; line-height: 1.25; max-width: 620px; margin-left: auto; margin-right: auto; }
.hero .subhead { font-size: 17px; color: var(--text-primary); margin-bottom: 28px; }
.photo-slot { background: linear-gradient(135deg, rgba(110,231,183,0.06), rgba(255,255,255,0.03)); border: 1px dashed rgba(255,255,255,0.12); border-radius: 16px; display: flex; align-items: center; justify-content: center; color: var(--text-tertiary); font-size: 13px; }
.hero .photo-slot { height: 380px; margin-bottom: 28px; }
.btn { display: inline-block; padding: 14px 28px; border: 0; border-radius: 12px; background: linear-gradient(135deg, #6EE7B7 0%, #34D399 100%); color: #052e16; font-family: inherit; font-size: 15px; font-weight: 700; cursor: pointer; text-decoration: none; }
.transformation-split { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 20px; }
.transformation-split .photo-slot { height: 320px; }
.transformation-caption { text-align: center; font-family: var(--font-serif); font-style: italic; font-size: 22px; color: var(--text-primary); }
.founding-card { background: rgba(255,255,255,0.04); border: 1px solid rgba(110,231,183,0.15); border-radius: 20px; padding: 32px 28px; text-align: center; }
.founding-card p { font-size: 16px; line-height: 1.6; color: var(--text-secondary); }
.who-list { font-size: 16px; line-height: 1.8; }
.who-list p { margin: 0 0 14px; }
@media (max-width: 480px) {
  .hero h1 { font-size: 26px; }
  .transformation-split { grid-template-columns: 1fr; }
  .section { padding: 40px 16px; }
}
</style>
</head>
<body>

<section class="section hero">
  <div class="eyebrow">Faith. Iron. Ambition.</div>
  <h1>"Physical training is of some value. Godliness has value for all things." &mdash; 1 Timothy 4:8</h1>
  <div class="subhead">I'm in the best shape of my life &mdash; and nobody knows what that cost.</div>
  <div class="photo-slot">📷 hero photo</div>
  <a href="#apply" class="btn">Apply for Coaching</a>
</section>

<section class="section">
  <h2>This Wasn't 90 Days</h2>
  <div class="transformation-split">
    <div class="photo-slot">📷 old me</div>
    <div class="photo-slot">📷 current me</div>
  </div>
</section>

<section class="section" id="founding">
  <div class="founding-card">
    <h2>Now Taking Founding Clients</h2>
    <p>I'm opening a small number of 1:1 coaching spots. While I compete toward my IFBB Pro card and run my own firm, I only take on what I can give real attention &mdash; full programming, real feedback, nothing generic. Once these founding spots are filled, the rate goes up for anyone after.</p>
    <a href="#apply" class="btn">Apply for Coaching</a>
  </div>
</section>

<section class="section">
  <h2>Who This Is</h2>
  <div class="who-list">
    <p>Competitive bodybuilder chasing an IFBB Pro card.</p>
    <p>Faith first &mdash; in training and everywhere else.</p>
    <p>Real programming, not a template. I'm not ahead of you &mdash; I'm just going first.</p>
  </div>
</section>

</body>
</html>
```

- [ ] **Step 2: Verify locally**

```bash
cd /c/Users/gregm/coaching-landing
npx serve -l 5560 .
```

Open `http://localhost:5560` in a browser. Confirm: hero renders with the verse headline and subhead, both photo slots show placeholder styling (not broken image icons), the founding-clients card renders, "Who This Is" section renders, both "Apply for Coaching" buttons scroll toward `#apply` (target doesn't exist yet until Task 3 — that's expected). Check at 375px width too — sections should stack cleanly, no horizontal overflow.

- [ ] **Step 3: Commit**

```bash
git add index.html
git commit -m "feat: add hero, transformation, founding-clients, who-this-is sections"
```

---

### Task 3: Apply form + Supabase wiring

**Files:**
- Modify: `c:\Users\gregm\coaching-landing\index.html`

- [ ] **Step 1: Add the form section CSS**

Add to the `<style>` block, right after `.who-list p { margin: 0 0 14px; }`:

```css
.apply-card { background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.06); border-radius: 20px; padding: 28px; }
.field { display: flex; flex-direction: column; gap: 6px; margin-bottom: 14px; }
.field label { font-size: 11px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; color: var(--text-tertiary); }
.field input, .field select, .field textarea {
  padding: 12px 14px; border: 1px solid rgba(255,255,255,0.08); border-radius: 10px;
  background: rgba(0,0,0,0.28); color: var(--text-primary); font-family: inherit; font-size: 15px; outline: none;
}
.field textarea { min-height: 90px; resize: vertical; }
.row2 { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.apply-status { font-size: 13px; color: var(--text-tertiary); margin-top: 10px; min-height: 16px; }
.apply-status.error { color: var(--danger); }
.apply-submit { width: 100%; padding: 14px; border: 0; border-radius: 12px; background: linear-gradient(135deg, #6EE7B7 0%, #34D399 100%); color: #052e16; font-family: inherit; font-size: 15px; font-weight: 700; cursor: pointer; }
.apply-submit:disabled { opacity: 0.6; cursor: not-allowed; }
@media (max-width: 480px) { .row2 { grid-template-columns: 1fr; } }
```

- [ ] **Step 2: Add the form section HTML**

Insert right before `</body>`:

```html
<section class="section" id="apply">
  <h2>Apply for Coaching</h2>
  <div class="apply-card">
    <div class="field"><label>Name</label><input id="fName" type="text" placeholder="Your name"></div>
    <div class="field"><label>Email</label><input id="fEmail" type="email" placeholder="you@example.com"></div>
    <div class="row2">
      <div class="field"><label>Stage</label>
        <select id="fStage">
          <option value="beginner">Beginner</option>
          <option value="intermediate" selected>Intermediate</option>
          <option value="advanced">Advanced</option>
        </select>
      </div>
      <div class="field"><label>Goal</label>
        <select id="fGoal">
          <option value="cut">Cut</option>
          <option value="bulk">Bulk</option>
          <option value="recomp" selected>Recomp</option>
          <option value="contest-prep">Contest prep</option>
        </select>
      </div>
    </div>
    <div class="field"><label>Message</label><textarea id="fMessage" placeholder="Tell me a bit about where you're at and what you want."></textarea></div>
    <button type="button" class="apply-submit" id="applySubmitBtn">Submit Application</button>
    <div class="apply-status" id="applyStatus"></div>
  </div>
</section>

<script>
(function () {
  'use strict';
  const SUPABASE_URL = 'https://vikpcejlyxieguorwysf.supabase.co';
  const SUPABASE_KEY = 'sb_publishable_EvWPtfW1FBW5Vf-H6w0yHw_PcXK4imv';
  const supa = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

  function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

  document.getElementById('applySubmitBtn').addEventListener('click', async () => {
    const btn = document.getElementById('applySubmitBtn');
    const statusEl = document.getElementById('applyStatus');
    statusEl.className = 'apply-status';

    const name = document.getElementById('fName').value.trim();
    const email = document.getElementById('fEmail').value.trim();
    const stage = document.getElementById('fStage').value;
    const goal = document.getElementById('fGoal').value;
    const message = document.getElementById('fMessage').value.trim();

    if (!name) { statusEl.textContent = 'Name is required.'; statusEl.className = 'apply-status error'; return; }
    if (!isValidEmail(email)) { statusEl.textContent = 'A valid email is required.'; statusEl.className = 'apply-status error'; return; }

    btn.disabled = true;
    const { error } = await supa.from('coaching_inquiries').insert({
      name: name, email: email, stage: stage, goal: goal, message: message
    });
    if (error) {
      statusEl.textContent = 'Something went wrong: ' + error.message;
      statusEl.className = 'apply-status error';
      btn.disabled = false;
      return;
    }
    window.location.href = 'thanks.html';
  });
})();
</script>
```

- [ ] **Step 3: Verify locally**

Reload `http://localhost:5560`. Confirm: clicking either "Apply for Coaching" button scrolls to the form. Try submitting with an empty name (should show "Name is required," not submit). Try an invalid email like `test` (should show the email error). The real Supabase insert will fail at this point since the `coaching_inquiries` table doesn't exist yet (Task 5) — that's expected; confirm the error path shows a message rather than crashing silently or leaving the button permanently disabled.

- [ ] **Step 4: Commit**

```bash
git add index.html
git commit -m "feat: add apply form with Supabase submission"
```

---

### Task 4: `thanks.html`

**Files:**
- Create: `c:\Users\gregm\coaching-landing\thanks.html`

- [ ] **Step 1: Write the page**

```html
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Application received — Carl Meyer</title>
<link href="https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
<style>
:root { --text-primary: #F4F1EA; --text-secondary: #B8B6B0; --accent: #6EE7B7; --font: -apple-system, BlinkMacSystemFont, "Inter", sans-serif; --font-serif: 'Instrument Serif', Georgia, serif; }
* { box-sizing: border-box; }
html, body { margin: 0; background: #000; color: var(--text-secondary); font-family: var(--font); min-height: 100vh; }
.wrap { max-width: 480px; margin: 0 auto; padding: max(100px, 20vh) 20px 40px; text-align: center; }
h1 { font-family: var(--font-serif); font-style: italic; color: var(--text-primary); font-size: 28px; }
p { font-size: 16px; line-height: 1.6; }
a { color: var(--accent); }
</style>
</head>
<body>
<div class="wrap">
  <h1>Application received.</h1>
  <p>Thanks for applying &mdash; I read every one myself. I'll reach out directly if it looks like a fit.</p>
  <p><a href="index.html">&larr; Back to the page</a></p>
</div>
</body>
</html>
```

- [ ] **Step 2: Verify locally**

Navigate to `http://localhost:5560/thanks.html` directly. Confirm it renders correctly and the back link works.

- [ ] **Step 3: Commit**

```bash
git add thanks.html
git commit -m "feat: add post-application thanks page"
```

---

### Task 5: `coaching_inquiries` Supabase table

**Files:**
- Create: `c:\Users\gregm\coaching-landing\supabase\migrations\2026-07-17-coaching-inquiries.sql`

- [ ] **Step 1: Write the migration**

```sql
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
```

- [ ] **Step 2: Apply the migration**

Apply against the `vikpcejlyxieguorwysf` Supabase project via the Supabase MCP `apply_migration` tool (confirm project ID first with `list_projects` if using a fresh session), or the Supabase dashboard SQL editor.

- [ ] **Step 3: Verify the table exists**

Run `list_tables` (Supabase MCP, verbose) or check the dashboard Table Editor — confirm `coaching_inquiries` appears with the columns above, RLS enabled, and only an insert policy (no select/update/delete policy for `anon`).

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/2026-07-17-coaching-inquiries.sql
git commit -m "feat: add coaching_inquiries table migration"
```

---

### Task 6: Create the GitHub repo and push

- [ ] **Step 1: Create the repo and push**

```bash
cd /c/Users/gregm/coaching-landing
gh repo create cmeyer117/coaching-landing --public --source=. --remote=origin --push
```

- [ ] **Step 2: Verify**

```bash
git remote -v
```

Expected: `origin` pointing at `https://github.com/cmeyer117/coaching-landing.git` (or `git@github.com:...` depending on Carl's configured protocol), both fetch and push.

---

### Task 7: Deploy to Vercel

- [ ] **Step 1: Deploy**

```bash
cd /c/Users/gregm/coaching-landing
npx vercel --prod --yes
```

This creates a new Vercel project (first run will prompt for/infer project name — accept `coaching-landing`) and deploys to production immediately, since there's no gate/passphrase and nothing to stage behind a preview first for a brand-new public page.

- [ ] **Step 2: Verify the deployment**

Note the production URL Vercel prints (something like `https://coaching-landing-<hash>.vercel.app` or `https://coaching-landing.vercel.app`). Confirm with:

```bash
curl -s -o /dev/null -w "%{http_code}\n" "<the production URL>/index.html"
curl -s -o /dev/null -w "%{http_code}\n" "<the production URL>/thanks.html"
```

Both should return `200`.

---

### Task 8: End-to-end verification

- [ ] **Step 1: Full form submission against production**

Open the production URL in a browser. Fill out the apply form with a real test entry (e.g. name "Test Applicant", a real-format test email, any stage/goal, a short message) and submit. Confirm redirect to `thanks.html`.

- [ ] **Step 2: Confirm the row landed in Supabase**

Query `coaching_inquiries` (Supabase MCP `execute_sql` or dashboard) and confirm the test row is present with the correct values.

- [ ] **Step 3: Clean up the test row**

```sql
delete from coaching_inquiries where name = 'Test Applicant';
```

- [ ] **Step 4: Mobile check**

Resize to 375px width (or load on an actual phone). Confirm: hero headline wraps cleanly, transformation photos stack vertically instead of side-by-side, form fields are full-width and usable, no horizontal scroll anywhere on the page.

- [ ] **Step 5: Validation edge cases**

On the live page, try submitting with an empty name (should block with an inline message, no network call needed since it's checked client-side first) and an invalid email format (should block similarly). Confirm neither creates a row in `coaching_inquiries`.

---

## Self-Review Notes

- **Spec coverage:** hero/transformation/founding-clients/who-this-is sections (Task 2), apply form with stage/goal vocabulary matching the Coaching Dashboard (Task 3), thanks page (Task 4), `coaching_inquiries` table (Task 5), standalone repo + Vercel project separate from Row (Tasks 1, 6, 7), no fabricated social proof (Task 2 copy has none), founding-client scarcity framing without a posted price (Task 2 founding-card copy) — all covered.
- **Out of scope confirmed not built:** no email notifications, no booking/payment, no CMS, no client login, no custom domain.
- **Placeholder scan:** the only "placeholder" content is the photo slots, which the spec explicitly calls out as an approved v1 deferral (Carl supplies real files later) — not a plan-writing shortcut. All copy, form logic, validation, and table schema are real and complete.
- **Type/naming consistency:** `stage`/`goal` values (`beginner/intermediate/advanced`, `cut/bulk/recomp/contest-prep`) match exactly between the form's `<select>` options (Task 3), the JS insert payload (Task 3), and the migration's check constraints (Task 5) — same vocabulary as the Coaching Dashboard's own `coaching_clients` table, as the spec requires.
