const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

(async () => {
  for (const [file, buttonId, statusId] of [['index.html', 'applySubmitBtn', 'applyStatus'], ['macros.html', 'mSubmitBtn', 'mStatus']]) {
    const source = fs.readFileSync(path.join(__dirname, file), 'utf8');
    const match = source.match(new RegExp("document\\.getElementById\\('" + buttonId + "'\\)\\.addEventListener\\('click', async \\(\\) => \\{([\\s\\S]*?)\\n  \\}\\);"));
    assert.ok(match, 'actual callback exists');
    const values = { fName: 'Fixture', fEmail: 'fixture@example.test', fStage: 'beginner', fGoal: 'muscle', fMessage: '', fHpCheck: '', mSex: 'male', mAge: '25', mWeight: '180', mHeightFt: '5', mHeightIn: '10', mActivity: '3', mGoal: 'cut', mEmail: 'fixture@example.test' };
    const nodes = new Map();
    const get = id => {
      if (!nodes.has(id)) nodes.set(id, { value: values[id] ?? '', disabled: false, textContent: '', classList: { remove() {}, add() { throw new Error('must not acknowledge failed save'); } } });
      return nodes.get(id);
    };
    let writes = 0;
    const window = { location: { href: 'fixture' }, ApplyGuard: { honeypotTripped: () => false, tooFast: () => false, clampAttribution: () => ({}) } };
    const callback = vm.runInNewContext('(async () => {' + match[1] + '\n})', {
      document: { getElementById: get }, window,
      supa: { from: () => ({ insert: async () => { writes++; throw new Error('synthetic lost response'); } }) },
      isValidEmail: () => true, readAttribution: () => ({}), pageLoadedAt: 0,
      calculateMacros: () => ({ calories: 2242, proteinG: 180, fatG: 62, carbG: 240 }),
    });
    let rejected = false;
    try { await callback(); } catch { rejected = true; }
    assert.equal(rejected, false, file + ' must handle rejected save');
    assert.equal(get(buttonId).disabled, false);
    assert.match(get(statusId).textContent, /unknown|confirm/i);
    assert.equal(window.location.href, 'fixture');
    assert.equal(writes, 1, 'no automatic retry');
  }
  console.log('PASS actual landing callbacks recover uncertain writes');
})().catch(error => { console.error(error); process.exitCode = 1; });
