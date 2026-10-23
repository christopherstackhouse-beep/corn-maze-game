# Share your capture

On a successful Lester capture, the results panel keeps Capture Time, Guest Goodwill, Save Score, View Leaderboard and Another Night, and adds **Share My Capture** and **Copy Challenge**. Sharing is available without entering an arcade name or saving a score. Defeats and new runs do not expose a previous capture's sharing controls.

The message uses the frozen capture time and goodwill. A saved rank is added only after the current round receives a successful score API response, using that response's time, goodwill and positive integer rank. It describes the rank at save time; rankings can change afterward. Arcade names are deliberately omitted. Sharing neither creates nor submits a score, and saving never opens the native share sheet. Score saving still opens the existing leaderboard; closing it returns to the results, with sharing available.

## Public link configuration

`dist/share-config.js` contains the optional public setting:

```js
window.LESTER_SHARE_GAME_URL = '';
```

Empty means the current game origin and page path. To point all shares at production later, set it to the absolute public HTTP(S) game URL, including any game subdirectory. No Vercel preview hostname is hardcoded. Invalid or non-HTTP(S) settings fall back to the current game page. This frontend setting is public: never put secrets, credentials or private URLs into it.

Every generated URL removes user info, all query parameters, and the fragment, then adds only `?leaderboard=1`. No run ID, arcade name, rank, authentication credential or development parameter is encoded in a shared URL. Result statistics remain in the share text, not the URL.

**Until a canonical production URL is configured, shares from a Vercel preview point to that preview.** A protected preview may require Vercel access in another browser; bypass credentials are intentionally never copied. Public production URLs are the appropriate destination for unrestricted friend-to-friend sharing.

On a fresh load with exactly `leaderboard=1`, the existing leaderboard opens and makes its normal GET request. The game does not auto-start or POST a run/score. Close returns to the menu's start button. An unavailable leaderboard displays its existing error and can still be closed. The canonical share URL does not change the leaderboard's same-origin API configuration.

## Native share and copy fallbacks

The native `navigator.share({title, text, url})` call occurs synchronously inside the intentional Share My Capture click, before any await. Pending operations disable both share buttons to prevent duplicate dialogs. User cancellation (`AbortError`) is quiet; other failures tell the player to use Copy Challenge. No automatic share sheet follows a score save.

Copy Challenge uses the Clipboard API when available. If unavailable/rejected, a selected read-only textarea and the legacy copy command are tried. Success is reported only after clipboard fulfilment or a true legacy-copy result. Otherwise the visible, selected challenge text can be copied manually; no success is claimed. Share My Capture also takes this copy path when native sharing is absent.

Native sharing and clipboard permissions vary by browser, platform, secure context and embedding policy. Physical iOS Safari/Android Chrome sharing and OS share destinations still require real-device acceptance checks. Existing gameplay, mobile inputs, audio/media and backend rules are unchanged.

## Verification

Use Node.js 24, `npm ci`, `npm test` and `npm run build`. `tests/share-capture.test.mjs` covers victory/defeat/reset, frozen statistics, confirmed/stale/invalid rank responses, native invocation/cancellation/errors, operation deduplication, clipboard/manual fallbacks, clean/default/canonical URLs, and direct leaderboard links including service failure.

For browser acceptance, use local or staging APIs only: win, share before saving, save and close the leaderboard, share the confirmed result, cancel native sharing, copy the message, and open its URL in a fresh browser. Confirm no run or score is created on arrival, then close and enter the maze. Check every results action remains reachable by scrolling in small landscape, portrait and desktop viewports. Never use production scores for testing.

Validation for this change: Node.js 24 `npm ci`, all 43 tests (31 existing plus 12 sharing tests), and `npm run build` passed. Local Chromium checked real clipboard write/read, denied-copy manual selection, clean/canonical URLs, a fresh browser opening the leaderboard without POSTs, score-save/open/close behavior, victory/defeat visibility, and reachability of every results action at 568×320, 640×360, 812×375, 375×812 and 1280×800. Native sharing was stubbed to verify transient user activation, payloads, cancellation and errors; an actual OS share sheet was not exercised. Browser API responses were stubbed, and no production scores were touched. No browser JavaScript errors were observed. Physical iOS Safari/Android Chrome and a Vercel branch preview remain unverified.
