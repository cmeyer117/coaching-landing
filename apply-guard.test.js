// Run with: node apply-guard.test.js
// Plain node, no framework (this static site has no test runner). The helper is a browser script that sets window.ApplyGuard.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');

const sandbox = { window: {} };
vm.createContext(sandbox);
vm.runInContext(fs.readFileSync(path.join(__dirname, 'apply-guard.js'), 'utf8'), sandbox);
const { honeypotTripped, tooFast, clampAttribution, MIN_FILL_MS } = sandbox.window.ApplyGuard;

// --- honeypot: any non-blank value in the hidden field means a bot filled every input ---
assert.equal(honeypotTripped(''), false);
assert.equal(honeypotTripped('   '), false, 'whitespace only is not a fill');
assert.equal(honeypotTripped(undefined), false);
assert.equal(honeypotTripped(null), false);
assert.equal(honeypotTripped('http://spam.example'), true);
assert.equal(honeypotTripped('x'), true);

// --- minimum fill time: a human needs more than MIN_FILL_MS between page load and submit ---
assert.equal(MIN_FILL_MS, 3000);
assert.equal(tooFast(1000, 1000 + 2999), true);
assert.equal(tooFast(1000, 1000 + 3000), false, 'exactly at the minimum is allowed');
assert.equal(tooFast(1000, 1000 + 60000), false);
assert.equal(tooFast(undefined, 5000), false, 'unknown load time never blocks a real person');
assert.equal(tooFast(NaN, 5000), false);

// --- attribution is clamped to migration 0007's limits so a long utm value can never reject a real application ---
const long = 'x'.repeat(500);
const c = clampAttribution({ source: long, campaign: long, content_idea_id: long, landing_path: 'p'.repeat(900), first_touch_at: '2026-10-02T12:00:00.000Z' });
assert.equal(c.source.length, 200);
assert.equal(c.campaign.length, 200);
assert.equal(c.content_idea_id.length, 200);
assert.equal(c.landing_path.length, 500);
assert.equal(c.first_touch_at, '2026-10-02T12:00:00.000Z');
// objects built inside the vm sandbox have another realm's prototype, so compare as plain JSON
const plain = (o) => JSON.parse(JSON.stringify(o));
const NULLS = { source: null, campaign: null, content_idea_id: null, landing_path: null, first_touch_at: null };
assert.deepEqual(plain(clampAttribution({ source: 'tiktok' })), { ...NULLS, source: 'tiktok' });
assert.deepEqual(plain(clampAttribution({})), NULLS);
assert.deepEqual(plain(clampAttribution(null)), NULLS, 'corrupt storage never throws');
assert.equal(clampAttribution({ source: 42 }).source, null, 'non-strings become null, not coerced');
assert.equal(clampAttribution({ first_touch_at: 'not a date' }).first_touch_at, null, 'unparseable timestamps are dropped so the timestamptz column cannot reject the row');

// --- the hidden honeypot input must not look like anything a browser or password manager auto-fills ---
// (a field named "website" can be filled by autofill, which would silently drop a REAL application)
const html = fs.readFileSync(path.join(__dirname, 'index.html'), 'utf8');
const hp = html.match(/<input[^>]*id="fHpCheck"[^>]*>/);
assert.ok(hp, 'honeypot input with id fHpCheck exists');
const tag = hp[0];
const idName = [(tag.match(/\bid="([^"]*)"/) || [])[1], (tag.match(/\bname="([^"]*)"/) || [])[1]].join(' ').toLowerCase();
for (const word of ['website', 'url', 'site', 'web', 'email', 'name', 'phone', 'address', 'company', 'user', 'login', 'password']) {
  assert.ok(!idName.includes(word), `honeypot id/name must not contain "${word}" (autofill target): ${idName}`);
}
assert.ok(/autocomplete="off"/.test(tag), 'autocomplete off');
assert.ok(/tabindex="-1"/.test(tag), 'not reachable by keyboard');
assert.ok(/data-1p-ignore/.test(tag) && /data-lpignore="true"/.test(tag), 'password managers told to ignore it');
assert.ok(!/id="fWebsite"/.test(html) && !/getElementById\('fWebsite'\)/.test(html), 'old field id fully removed');
assert.ok(/getElementById\('fHpCheck'\)/.test(html), 'submit handler reads the renamed field');

console.log('apply-guard: all cases pass');
