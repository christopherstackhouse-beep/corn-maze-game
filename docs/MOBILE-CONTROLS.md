# Mobile touch prototype — Phase 1

The existing game can now take touch input in landscape orientation. This is a functional prototype, not a claim of complete iOS/Android compatibility. Desktop keyboard/mouse controls remain available. No leaderboard API, production configuration, database, migration, or media asset changes are part of this feature.

## Controls and implementation

- Left joystick: analog forward/back and strafe with a small dead zone. Releasing returns to neutral; diagonal speed is capped using the existing movement/collision path.
- Right transparent aiming region: horizontal drag to look, independent of movement and actions. Touch down/up does not turn the camera. Tune `MOBILE_INPUT_CONFIG.lookSensitivity` (radians per CSS pixel) in `dist/touch-controls.js`.
- Fire Net, Give Map, Reload, Light, Minimap and Pause: tap the labeled buttons. Dragging off or cancelling a button does not activate it. Actions run on intentional release, with no tap auto-repeat.
- Sprint: hold the separate left button while moving. Multiple pointers may hold sprint; releasing the last one stops sprinting.

`touch-controls.js` owns pointer IDs/capture and input lifecycle only. `game.js` consumes the joystick axes and sprint state alongside keyboard state, and supplies the existing `fire`, `giveGuestMap`, `reload`, flashlight/minimap toggles and pause action. It does not simulate keys or duplicate targeting, collision, scoring or game rules.

Touch capability plus a coarse primary pointer enables the interface initially. Actual touch also enables it on hybrid devices; a real mouse pointer restores desktop input. Synthetic compatibility mouse clicks do not shoot. Touch play never requests pointer lock. Desktop pointer-lock loss still pauses, and Escape also explicitly pauses touch play.

Controls hide/reset during menus, leaderboard display, capture/defeat, guest attack, and alien cinematics. Blur, hidden tabs, pause, pointer cancellation/lost capture, and orientation changes release input. Portrait gameplay is paused behind a rotation prompt; landscape requires explicit resume, without the orientation-lock API. Controls and HTML overlays use safe-area insets. The mobile minimap is compacted/repositioned without changing its information.

## Repeatable checks

Use Node.js 24:

```sh
npm ci
npm test
npm run build
```

`tests/mobile-input.test.mjs` executes the real game scripts with the shared DOM harness in `tests/helpers/game.mjs`. It covers independent multitouch, analog speed/diagonals, button isolation/cancellation, pause/focus/visibility/capture reset, portrait transitions, desktop/hybrid input, and existing capture/defeat/alien result transitions. Existing gameplay and backend tests remain part of `npm test`.

For a local browser check, follow the README's local Wrangler/D1 development workflow. Use only local data or a separate preview database; never submit development scores to production. `npm run build` warns about missing production Turso configuration when using local D1; that warning is expected. Do not supply production credentials just to remove it.

## Device acceptance checklist

Use the branch preview when available, with staging/local leaderboard data:

1. On iOS Safari and Android Chrome, load the menu in both orientations. Confirm the Version 1.1 label and all menu buttons remain reachable by scrolling.
2. Start in portrait: see the rotation prompt. Rotate to landscape and explicitly resume. Try landscape phone sizes down to 568×320 CSS pixels, notched devices, and browser toolbar expansion/collapse.
3. Move in every direction, vary joystick displacement, turn with a second finger, hold sprint with another finger, and fire/give maps with an additional finger. Check that releasing, sliding off, and OS-cancelled touches never leave input held.
4. Use each action. Giving a map must not fire; tapping utility buttons must not turn the view. Check successful and missed nets, ordinary guest map delivery/penalties, reload timing, flashlight, minimap and pause.
5. Pause/resume, switch apps, hide the tab, rotate while moving, return from sleep, and reconnect a mouse on a hybrid device. Resume must start neutral. Desktop WASD/mouse/right-click/Shift/R/F/M/Escape must still work.
6. Exercise Lester's encounters, capture and defeat, hostile guest consequence, alien map extraction and alien net/incineration. Confirm controls disappear during sequences and audio/video/play fallback remain usable.
7. On a separate preview database, complete a capture, enter an arcade name with the onscreen keyboard, submit, retry if necessary, and read the shared leaderboard. No API or score-validation changes are required by this feature.

## Known limits and next phase

Real iOS Safari/Android hardware, notch insets, OS edge gestures, interruption/audio recovery, and long-session performance still need device validation. Pointer Events and pointer capture are required (current Safari/Chrome); no legacy Touch Events fallback or orientation locking is included. System edge gestures may cancel touches; cancellation is handled but system gestures are not disabled. Safari may still require the existing Play Video fallback after its autoplay restrictions intervene.

The layout is deliberately provisional. Next, use device feedback to tune sensitivity, handedness/button placement and HUD/minimap readability; profile raycasting/audio on slower phones; then finish the menu, results/onscreen-keyboard, accessibility and audiovisual device matrix. A complete mobile adaptation is outside this phase.

## Phase 1 validation record

On Node.js 24, `npm ci`, all 21 automated tests (the original 9 plus 12 mobile/input tests), and `npm run build` passed. All 34 tracked image/audio/video assets matched `main` byte for byte; backend/configuration files were unchanged.

A local headless Chromium smoke run used native CDP touch events to hold joystick, look, sprint and fire simultaneously. It verified real movement, horizontal rotation, one net per tap, neutral release, no scrolling, pause/resume, portrait gating, and control bounds at 568×320, 640×360, 812×375 and 844×390. Existing capture/defeat animations reached their results screens with controls hidden. A separate desktop browser context verified pointer lock, movement, mouse firing and Escape pause. No browser JavaScript errors were observed. These checks used local D1 only and do not establish physical iOS/Android, Vercel preview or production readiness.
