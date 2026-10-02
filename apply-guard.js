// Apply-form guard: a honeypot, a minimum fill time, and attribution clamping. Pure helpers, no DOM, no network.
//
// WHAT THIS IS AND IS NOT: it stops bots that load the page in a browser and fill every input. It does NOT stop
// anyone who posts straight to the public Supabase API (the anon key is public by design); that is bounded only by
// coaching-app migration 0007's insert-only policy, and has no rate limit. A real fix would route the submit through
// a server function with a rate limit or a captcha.
(function () {
  'use strict';

  var MIN_FILL_MS = 3000; // the form sits below the fold; a person needs longer than this to scroll, type and submit

  // The hidden field is invisible to people. Anything in it means a script filled every input it found.
  function honeypotTripped(value) {
    return typeof value === 'string' && value.trim() !== '';
  }

  // loadedAtMs unknown/invalid never blocks a real person.
  function tooFast(loadedAtMs, nowMs) {
    if (typeof loadedAtMs !== 'number' || !isFinite(loadedAtMs)) return false;
    return nowMs - loadedAtMs < MIN_FILL_MS;
  }

  // Limits must match supabase/migrations/0007 in coaching-app (the RLS with-check rejects longer values, which would
  // bounce a genuine application over a long utm_* tag in the URL). Non-strings become null; bad timestamps are dropped.
  function str(v, max) {
    return typeof v === 'string' ? v.slice(0, max) : null;
  }
  function clampAttribution(a) {
    var x = a && typeof a === 'object' ? a : {};
    var ts = typeof x.first_touch_at === 'string' && !isNaN(Date.parse(x.first_touch_at)) ? x.first_touch_at : null;
    return {
      source: str(x.source, 200),
      campaign: str(x.campaign, 200),
      content_idea_id: str(x.content_idea_id, 200),
      landing_path: str(x.landing_path, 500),
      first_touch_at: ts,
    };
  }

  var api = { honeypotTripped: honeypotTripped, tooFast: tooFast, clampAttribution: clampAttribution, MIN_FILL_MS: MIN_FILL_MS };
  if (typeof window !== 'undefined') window.ApplyGuard = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})();
