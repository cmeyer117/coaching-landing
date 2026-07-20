# Black Magma Macros Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build and deploy `macros.html`, a free public macro calculator ("Black Magma Macros") on the existing `coaching-landing` site — visitor enters stats, gives an email, gets calorie/macro targets instantly, feeds the same lead pipeline as the apply form.

**Architecture:** New static page in the existing no-build `coaching-landing` repo, same visual system and Supabase anon-key pattern as `index.html`. One new Supabase table (`macro_leads`) mirroring `coaching_inquiries`'s insert-only RLS convention. All math is a local pure function, no external API.

**Tech Stack:** Vanilla HTML/CSS/JS, Supabase JS client v2 via CDN, Node (for TDD scratch-testing the pure function only — nothing ships with a test runner).

**Design spec:** `docs/superpowers/specs/2026-07-18-black-magma-macros-design.md` (codex-luna reviewed, approved).

---

### Task 1: TDD the `calculateMacros()` pure function

**Files:**
- Create (scratch, deleted at end of task): `c:\Users\gregm\coaching-landing\.scratch-test-macros.mjs`

- [ ] **Step 1: Write the failing test**

```js
// .scratch-test-macros.mjs
import assert from 'node:assert/strict';

function calculateMacros(inputs) {
  throw new Error('not implemented');
}

// Normal case: male, 25, 5'10" (70in), 180lb, moderate activity (tier 3), cut
const r1 = calculateMacros({ sex: 'male', age: 25, heightIn: 70, weightLb: 180, activityLevel: 3, goal: 'cut' });
assert.deepEqual(r1, { calories: 2242, proteinG: 180, fatG: 62, carbG: 240 });

// Carb-floor case: female, 90, 5'0" (60in), 65lb, sedentary (tier 1), cut
// -> pre-floor carbs computes to ~49.5g, below the 50g floor, so it clamps to 50
// and fat absorbs the difference instead.
const r2 = calculateMacros({ sex: 'female', age: 90, heightIn: 60, weightLb: 65, activityLevel: 1, goal: 'cut' });
assert.deepEqual(r2, { calories: 611, proteinG: 65, fatG: 17, carbG: 50 });

console.log('all passed');
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd /c/Users/gregm/coaching-landing && node .scratch-test-macros.mjs`
Expected: throws `Error: not implemented`

- [ ] **Step 3: Write the implementation**

Replace the stub `calculateMacros` in `.scratch-test-macros.mjs` with:

```js
function calculateMacros({ sex, age, heightIn, weightLb, activityLevel, goal }) {
  const ACTIVITY_MULTIPLIERS = { 1: 1.2, 2: 1.375, 3: 1.55, 4: 1.725, 5: 1.9 };
  const GOAL_ADJUSTMENTS = { cut: 0.8, bulk: 1.125, recomp: 0.95 };
  const CARB_FLOOR_G = 50;

  const weightKg = weightLb * 0.45359237;
  const heightCm = heightIn * 2.54;

  const bmr = sex === 'male'
    ? 10 * weightKg + 6.25 * heightCm - 5 * age + 5
    : 10 * weightKg + 6.25 * heightCm - 5 * age - 161;

  const tdee = bmr * ACTIVITY_MULTIPLIERS[activityLevel];
  const calories = tdee * GOAL_ADJUSTMENTS[goal];

  const proteinG = weightLb;
  let fatG = (0.25 * calories) / 9;
  let carbG = (calories - proteinG * 4 - fatG * 9) / 4;

  if (carbG < CARB_FLOOR_G) {
    carbG = CARB_FLOOR_G;
    fatG = (calories - proteinG * 4 - carbG * 4) / 9;
  }

  return {
    calories: Math.round(calories),
    proteinG: Math.round(proteinG),
    fatG: Math.round(fatG),
    carbG: Math.round(carbG),
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node .scratch-test-macros.mjs`
Expected: prints `all passed`

- [ ] **Step 5: Delete the scratch file (nothing to commit this task)**

```bash
rm /c/Users/gregm/coaching-landing/.scratch-test-macros.mjs
```

The verified function body from Step 3 is reused verbatim in Task 3 — keep it at hand.

---

### Task 2: `macros.html` — page shell, styles, and form (no wiring yet)

**Files:**
- Create: `c:\Users\gregm\coaching-landing\macros.html`

- [ ] **Step 1: Write the full page**

```html
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="theme-color" content="#050506">
<title>Black Magma Macros — Free Macro Calculator</title>
<meta name="description" content="Free macro calculator from Carl Meyer's coaching. Get your calories, protein, fat, and carbs in 30 seconds.">
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
.section { max-width: 640px; margin: 0 auto; padding: 60px 20px; }
.eyebrow { font-family: var(--font-mono); font-size: 12px; font-weight: 700; letter-spacing: 0.2em; text-transform: uppercase; color: var(--accent); margin-bottom: 14px; }
h1, h2 { font-family: var(--font-serif); color: var(--text-primary); font-weight: 700; margin: 0 0 16px; }
.hero { padding-top: max(60px, env(safe-area-inset-top)); text-align: center; }
.hero h1 { font-size: 30px; font-style: italic; line-height: 1.25; }
.hero .subhead { font-size: 16px; color: var(--text-primary); margin-bottom: 0; }
.calc-card { background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.06); border-radius: 20px; padding: 28px; }
.field { display: flex; flex-direction: column; gap: 6px; margin-bottom: 14px; }
.field label { font-size: 11px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; color: var(--text-tertiary); }
.field input, .field select {
  padding: 12px 14px; border: 1px solid rgba(255,255,255,0.08); border-radius: 10px;
  background: rgba(0,0,0,0.28); color: var(--text-primary); font-family: inherit; font-size: 15px; outline: none;
}
.row2 { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.row3 { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 12px; }
.calc-status { font-size: 13px; color: var(--text-tertiary); margin-top: 10px; min-height: 16px; }
.calc-status.error { color: var(--danger); }
.calc-submit { width: 100%; padding: 14px; border: 0; border-radius: 12px; background: linear-gradient(135deg, #6EE7B7 0%, #34D399 100%); color: #052e16; font-family: inherit; font-size: 15px; font-weight: 700; cursor: pointer; }
.calc-submit:disabled { opacity: 0.6; cursor: not-allowed; }
.results { display: none; margin-top: 24px; border-top: 1px solid rgba(255,255,255,0.08); padding-top: 24px; }
.results.show { display: block; }
.results-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin: 16px 0; }
.results-stat { background: rgba(0,0,0,0.28); border-radius: 12px; padding: 16px; text-align: center; }
.results-stat .num { font-family: var(--font-serif); font-size: 28px; color: var(--text-primary); }
.results-stat .label { font-size: 11px; text-transform: uppercase; letter-spacing: 0.08em; color: var(--text-tertiary); margin-top: 4px; }
.results-cal { text-align: center; font-family: var(--font-serif); font-size: 40px; color: var(--accent); font-style: italic; }
.disclaimer { font-size: 12px; color: var(--text-tertiary); line-height: 1.5; margin-top: 16px; }
.results .btn { display: block; text-align: center; margin-top: 20px; padding: 14px 28px; border: 0; border-radius: 12px; background: linear-gradient(135deg, #6EE7B7 0%, #34D399 100%); color: #052e16; font-family: inherit; font-size: 15px; font-weight: 700; text-decoration: none; }
@media (max-width: 480px) {
  .hero h1 { font-size: 24px; }
  .section { padding: 40px 16px; }
  .row2, .row3 { grid-template-columns: 1fr; }
  .results-grid { grid-template-columns: 1fr 1fr; }
}
</style>
</head>
<body>

<section class="section hero">
  <div class="eyebrow">Black Magma Macros</div>
  <h1>Your calories and macros, dialed in 30 seconds.</h1>
  <div class="subhead">Free calculator. No guesswork, no fluff.</div>
</section>

<section class="section" id="calc">
  <div class="calc-card">
    <div class="field"><label>Sex</label>
      <select id="mSex">
        <option value="male">Male</option>
        <option value="female">Female</option>
      </select>
    </div>
    <div class="row2">
      <div class="field"><label>Age</label><input id="mAge" type="number" min="13" max="100" placeholder="25"></div>
      <div class="field"><label>Weight (lb)</label><input id="mWeight" type="number" min="60" max="600" placeholder="180"></div>
    </div>
    <div class="row2">
      <div class="field"><label>Height (ft)</label><input id="mHeightFt" type="number" min="3" max="8" placeholder="5"></div>
      <div class="field"><label>Height (in)</label><input id="mHeightIn" type="number" min="0" max="11" placeholder="10"></div>
    </div>
    <div class="field"><label>Activity Level</label>
      <select id="mActivity">
        <option value="1">Little to no exercise, desk job</option>
        <option value="2">Light exercise 1-3x/week</option>
        <option value="3" selected>Moderate exercise 3-5x/week</option>
        <option value="4">Heavy exercise 6-7x/week</option>
        <option value="5">Very heavy exercise + physical job</option>
      </select>
    </div>
    <div class="field"><label>Goal</label>
      <select id="mGoal">
        <option value="cut">Cut</option>
        <option value="bulk">Bulk</option>
        <option value="recomp" selected>Recomp</option>
      </select>
    </div>
    <div class="field"><label>Email (to see your results)</label><input id="mEmail" type="email" maxlength="200" placeholder="you@example.com"></div>
    <button type="button" class="calc-submit" id="mSubmitBtn">Get My Macros</button>
    <div class="calc-status" id="mStatus"></div>

    <div class="results" id="mResults">
      <div class="results-cal"><span id="mResCalories"></span> cal</div>
      <div class="results-grid">
        <div class="results-stat"><div class="num" id="mResProtein"></div><div class="label">Protein (g)</div></div>
        <div class="results-stat"><div class="num" id="mResFat"></div><div class="label">Fat (g)</div></div>
        <div class="results-stat"><div class="num" id="mResCarb"></div><div class="label">Carbs (g)</div></div>
      </div>
      <div class="disclaimer">Estimate only, not medical or nutrition advice — adjust based on real-world results.</div>
      <a href="index.html#apply" class="btn">Ready for real coaching?</a>
    </div>
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

Open `http://localhost:5560/macros.html`. Confirm: hero renders, form renders with all fields (sex, age, weight, height ft/in, activity dropdown with plain-English labels, goal, email), "Get My Macros" button does nothing yet (no JS wired), results panel is hidden. Check at 375px width — fields stack cleanly, no horizontal overflow.

- [ ] **Step 3: Commit**

```bash
git add macros.html
git commit -m "feat: add macros.html page shell and form"
```

---

### Task 3: Wire `calculateMacros()`, validation, and Supabase submit

**Files:**
- Modify: `c:\Users\gregm\coaching-landing\macros.html`

- [ ] **Step 1: Add the script block**

Insert right before `</body>`:

```html
<script>
(function () {
  'use strict';
  const SUPABASE_URL = 'https://vikpcejlyxieguorwysf.supabase.co';
  const SUPABASE_KEY = 'sb_publishable_EvWPtfW1FBW5Vf-H6w0yHw_PcXK4imv';
  const supa = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

  function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

  function calculateMacros({ sex, age, heightIn, weightLb, activityLevel, goal }) {
    const ACTIVITY_MULTIPLIERS = { 1: 1.2, 2: 1.375, 3: 1.55, 4: 1.725, 5: 1.9 };
    const GOAL_ADJUSTMENTS = { cut: 0.8, bulk: 1.125, recomp: 0.95 };
    const CARB_FLOOR_G = 50;

    const weightKg = weightLb * 0.45359237;
    const heightCm = heightIn * 2.54;

    const bmr = sex === 'male'
      ? 10 * weightKg + 6.25 * heightCm - 5 * age + 5
      : 10 * weightKg + 6.25 * heightCm - 5 * age - 161;

    const tdee = bmr * ACTIVITY_MULTIPLIERS[activityLevel];
    const calories = tdee * GOAL_ADJUSTMENTS[goal];

    const proteinG = weightLb;
    let fatG = (0.25 * calories) / 9;
    let carbG = (calories - proteinG * 4 - fatG * 9) / 4;

    if (carbG < CARB_FLOOR_G) {
      carbG = CARB_FLOOR_G;
      fatG = (calories - proteinG * 4 - carbG * 4) / 9;
    }

    return {
      calories: Math.round(calories),
      proteinG: Math.round(proteinG),
      fatG: Math.round(fatG),
      carbG: Math.round(carbG),
    };
  }

  // Self-check (matches spec Task 1 TDD cases) - logs an assertion failure to
  // the console if the formula ever regresses, since there's no test runner here.
  (function selfCheck() {
    const r1 = calculateMacros({ sex: 'male', age: 25, heightIn: 70, weightLb: 180, activityLevel: 3, goal: 'cut' });
    console.assert(r1.calories === 2242 && r1.proteinG === 180 && r1.fatG === 62 && r1.carbG === 240,
      'calculateMacros self-check failed (normal case)', r1);

    const r2 = calculateMacros({ sex: 'female', age: 90, heightIn: 60, weightLb: 65, activityLevel: 1, goal: 'cut' });
    console.assert(r2.calories === 611 && r2.proteinG === 65 && r2.fatG === 17 && r2.carbG === 50,
      'calculateMacros self-check failed (carb-floor case)', r2);
  })();

  document.getElementById('mSubmitBtn').addEventListener('click', async () => {
    const btn = document.getElementById('mSubmitBtn');
    const statusEl = document.getElementById('mStatus');
    const resultsEl = document.getElementById('mResults');
    statusEl.className = 'calc-status';
    resultsEl.classList.remove('show');

    const sex = document.getElementById('mSex').value;
    const age = parseInt(document.getElementById('mAge').value, 10);
    const weightLb = parseFloat(document.getElementById('mWeight').value);
    const heightFt = parseInt(document.getElementById('mHeightFt').value, 10);
    const heightInPart = parseInt(document.getElementById('mHeightIn').value, 10);
    const activityLevel = parseInt(document.getElementById('mActivity').value, 10);
    const goal = document.getElementById('mGoal').value;
    const email = document.getElementById('mEmail').value.trim();

    if (isNaN(age) || age < 13 || age > 100) {
      statusEl.textContent = 'Age must be between 13 and 100.'; statusEl.className = 'calc-status error'; return;
    }
    if (isNaN(weightLb) || weightLb < 60 || weightLb > 600) {
      statusEl.textContent = 'Weight must be between 60 and 600 lb.'; statusEl.className = 'calc-status error'; return;
    }
    if (isNaN(heightFt) || isNaN(heightInPart)) {
      statusEl.textContent = 'Enter your height in feet and inches.'; statusEl.className = 'calc-status error'; return;
    }
    const heightIn = heightFt * 12 + heightInPart;
    if (heightIn < 36 || heightIn > 96) {
      statusEl.textContent = 'Height must be between 3\'0" and 8\'0".'; statusEl.className = 'calc-status error'; return;
    }
    if (!isValidEmail(email)) {
      statusEl.textContent = 'A valid email is required to see your results.'; statusEl.className = 'calc-status error'; return;
    }

    const macros = calculateMacros({ sex, age, heightIn, weightLb, activityLevel, goal });

    btn.disabled = true;
    const { error } = await supa.from('macro_leads').insert({
      email: email, sex: sex, age: age, height_in: heightIn, weight_lb: weightLb,
      activity_level: activityLevel, goal: goal,
      calories: macros.calories, protein_g: macros.proteinG, fat_g: macros.fatG, carb_g: macros.carbG
    });
    btn.disabled = false;

    if (error) {
      statusEl.textContent = 'Something went wrong: ' + error.message;
      statusEl.className = 'calc-status error';
      return;
    }

    document.getElementById('mResCalories').textContent = macros.calories;
    document.getElementById('mResProtein').textContent = macros.proteinG;
    document.getElementById('mResFat').textContent = macros.fatG;
    document.getElementById('mResCarb').textContent = macros.carbG;
    resultsEl.classList.add('show');
  });
})();
</script>
```

- [ ] **Step 2: Verify locally**

Reload `http://localhost:5560/macros.html`. Open the browser console first (self-check should print no assertion failures). Try submitting with age `5` (should block with the age error). Try weight `10` (should block). Try email `test` (should block). Then fill in valid values (e.g. male, 25, 180lb, 5'10", moderate, cut, a real-format test email) and submit — the Supabase insert will fail since `macro_leads` doesn't exist yet (Task 4), confirm it shows an inline error rather than crashing, and the button re-enables.

- [ ] **Step 3: Commit**

```bash
git add macros.html
git commit -m "feat: wire calculateMacros, validation, and Supabase submit"
```

---

### Task 4: `macro_leads` Supabase table

**Files:**
- Create: `c:\Users\gregm\coaching-landing\supabase\migrations\2026-07-20-macro-leads.sql`

- [ ] **Step 1: Write the migration**

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

- [ ] **Step 2: Apply the migration**

Apply against the `vikpcejlyxieguorwysf` Supabase project via the Supabase MCP `apply_migration` tool (confirm project ID first with `list_projects` if in a fresh session).

- [ ] **Step 3: Verify the table exists**

Run `list_tables` (Supabase MCP) or check the dashboard Table Editor — confirm `macro_leads` appears with the columns above, RLS enabled, and only an insert policy (no select/update/delete for `anon`).

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/2026-07-20-macro-leads.sql
git commit -m "feat: add macro_leads table migration"
```

---

### Task 5: Link from `index.html`

**Files:**
- Modify: `c:\Users\gregm\coaching-landing\index.html:79-85` (right after the founding-clients section)

- [ ] **Step 1: Add a CTA card**

Insert a new section right after the `</section>` closing the `founding` section (after line 85) and before the "Who This Is" section:

```html
<section class="section">
  <div class="founding-card">
    <h2>Free: Black Magma Macros</h2>
    <p>Get your calories, protein, fat, and carbs dialed in 30 seconds — no strings, just a free calculator.</p>
    <a href="macros.html" class="btn">Get My Macros</a>
  </div>
</section>
```

- [ ] **Step 2: Verify locally**

Reload `http://localhost:5560/index.html`. Confirm the new card renders between "Now Taking Founding Clients" and "Who This Is," and the "Get My Macros" button navigates to `macros.html`.

- [ ] **Step 3: Commit**

```bash
git add index.html
git commit -m "feat: link macros.html from index.html"
```

---

### Task 6: Deploy and verify end-to-end

**Note:** this Vercel project is NOT git-connected — deploys are manual.

- [ ] **Step 1: Deploy**

```bash
cd /c/Users/gregm/coaching-landing
npx vercel --prod --yes
```

- [ ] **Step 2: Verify the deployment responds**

```bash
curl -s -o /dev/null -w "%{http_code}\n" "https://coaching-landing-nu.vercel.app/macros.html"
```

Expected: `200`

- [ ] **Step 3: Full form submission against production**

Open `https://coaching-landing-nu.vercel.app/macros.html` in a browser. Fill in real-format test values (e.g. male, 25, 180lb, 5'10", moderate, cut, a test email) and submit. Confirm the results panel reveals inline with calories + 3 macros, the disclaimer text, and the "Ready for real coaching?" CTA.

- [ ] **Step 4: Confirm the row landed in Supabase**

Query `macro_leads` (Supabase MCP `execute_sql`) and confirm the test row is present with the correct computed values.

- [ ] **Step 5: Clean up the test row**

```sql
delete from macro_leads where email = '<the test email used>';
```

- [ ] **Step 6: Mobile check**

Resize to 375px width. Confirm: form fields stack full-width, results grid stays readable (2-column), no horizontal scroll.

- [ ] **Step 7: Validation edge cases on production**

Try submitting with age `200`, weight `10`, and an invalid email — confirm each blocks with an inline message before any network call, and no row is created in `macro_leads` for these attempts.

- [ ] **Step 8: Update HANDOFF.md**

Edit `G:\My Drive\Claude\HANDOFF.md` (Edit only, not full-file Write) — move the Black Magma Macros entry from "brainstormed and spec'd, implementation not started" to built/deployed/verified, with the live URL.

---

## Self-Review Notes

- **Spec coverage:** all 6 form inputs incl. activity plain-English labels (Task 2), input bounds validation matching DB checks (Task 3 + Task 4), Mifflin-St Jeor/TDEE/goal-adjustment/protein/fat/carb-floor formula exactly as specified incl. single-point end rounding (Task 1/3), `macro_leads` table matching `coaching_inquiries` RLS convention (Task 4), inline results reveal with disclaimer + coaching CTA, no redirect (Task 3), nav link from `index.html` (Task 5), assert-based inline self-check instead of a test runner (Task 3) — all covered.
- **Out of scope confirmed not built:** no body-fat/lean-mass input, no dietary-pattern picker, no metric toggle, no saved-calculation editing, no spam/rate-limit protection (matches spec's explicit MVP exposure call).
- **Placeholder scan:** none — all code blocks are complete and copy-pasteable, no TODOs.
- **Type/naming consistency:** `calculateMacros()` signature (`sex, age, heightIn, weightLb, activityLevel, goal`) and return shape (`calories, proteinG, fatG, carbG`) are identical across Task 1's TDD version and Task 3's shipped version. Form field IDs (`mSex`, `mAge`, `mWeight`, `mHeightFt`, `mHeightIn`, `mActivity`, `mGoal`, `mEmail`) match between Task 2's HTML and Task 3's script. DB column names (`height_in`, `weight_lb`, `activity_level`, `protein_g`, `fat_g`, `carb_g`) match between Task 3's insert payload and Task 4's migration.
