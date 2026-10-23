'use strict';

const CaptureShare = (() => {
  const el = id => document.getElementById(id);
  let captured = null, saved = null, revision = 0, busy = false;

  function gameURL() {
    let url = new URL(window.location.href);
    if (window.LESTER_SHARE_GAME_URL) {
      try {
        const canonical = new URL(window.LESTER_SHARE_GAME_URL);
        if (['https:', 'http:'].includes(canonical.protocol)) url = canonical;
      } catch { /* An invalid optional setting falls back to the current game page. */ }
    }
    url.username = ''; url.password = ''; url.search = ''; url.hash = '';
    url.searchParams.set('leaderboard', '1');
    return url.href;
  }

  function validCapture(value) {
    return value && Number.isInteger(value.elapsedSeconds) && value.elapsedSeconds >= 1 && value.elapsedSeconds <= 86400 && Number.isInteger(value.goodwill) && value.goodwill >= 0 && value.goodwill <= 100;
  }

  function message() {
    if (!captured) return null;
    const seconds = captured.elapsedSeconds;
    let text = `I caught Lester in ${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')} with ${captured.goodwill}% Guest Goodwill in Lester After Dark!`;
    if (saved) text += ` My saved capture ranked #${saved.rank} on the leaderboard.`;
    text += ' Think you can beat me?';
    const url = gameURL();
    return {title: 'Lester After Dark', text, url, copyText: `${text}\n\nPlay here: ${url}`};
  }

  function updateButtons() {
    el('shareCapture').disabled = el('copyCapture').disabled = busy;
  }

  function reset() {
    revision++; captured = saved = null;
    el('captureShare').hidden = true;
    el('shareStatus').textContent = '';
    el('shareManual').hidden = true; el('shareManualText').value = '';
    updateButtons();
  }

  function victory(value) {
    reset();
    if (!validCapture(value)) return;
    captured = {elapsedSeconds: value.elapsedSeconds, goodwill: value.goodwill};
    el('captureShare').hidden = false;
  }

  // Called only with a successful score API response for the current round.
  function savedScore(entry) {
    if (!captured || !validCapture(entry)) return;
    captured = {elapsedSeconds: entry.elapsedSeconds, goodwill: entry.goodwill};
    saved = Number.isSafeInteger(entry.rank) && entry.rank > 0 ? {rank: entry.rank} : null;
  }

  function legacyCopy(text) {
    const field = el('shareManualText');
    field.value = text; el('shareManual').hidden = false;
    field.focus(); field.select(); field.setSelectionRange(0, text.length);
    try { return document.execCommand?.('copy') === true; } catch { return false; }
  }

  async function copy() {
    if (!captured || busy) return;
    const current = revision, payload = message();
    busy = true; updateButtons(); el('shareStatus').textContent = '';
    let copied = false;
    try {
      if (navigator.clipboard?.writeText) {
        try { await navigator.clipboard.writeText(payload.copyText); copied = true; } catch { /* Use the selectable fallback below. */ }
      }
      if (current !== revision) return;
      if (!copied) copied = legacyCopy(payload.copyText);
      if (copied) {
        el('shareStatus').textContent = 'Challenge copied! Paste it to share with friends.';
        el('shareManual').hidden = true; el('copyCapture').focus();
      } else {
        el('shareStatus').textContent = 'Automatic copying is unavailable. Select the challenge below and copy it manually.';
      }
    } finally { busy = false; updateButtons(); }
  }

  async function share() {
    if (!captured || busy) return;
    if (typeof navigator.share !== 'function') return copy();
    const current = revision, {title, text, url} = message();
    busy = true; updateButtons(); el('shareStatus').textContent = '';
    try {
      // No asynchronous work before share(): keep the click's transient activation.
      await navigator.share({title, text, url});
      if (current === revision) el('shareStatus').textContent = 'Share completed.';
    } catch (error) {
      if (current === revision && error?.name !== 'AbortError') {
        el('shareStatus').textContent = 'Native sharing is unavailable. Use Copy Challenge to share instead.';
      }
    } finally { busy = false; updateButtons(); }
  }

  document.addEventListener('DOMContentLoaded', () => {
    reset();
    el('shareCapture').onclick = share;
    el('copyCapture').onclick = copy;
  });
  return {reset, victory, savedScore};
})();
