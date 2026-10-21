# Lester After Dark

Browser corn-maze game with an anonymous, shared arcade leaderboard.

## What is implemented

- Only successful captures can submit through the game UI. The timer stops on the net hit, before the victory animation. Pauses and scripted cutscenes are excluded. Capture time is stored as whole seconds and displayed as `minutes:seconds`.
- Ranking: shorter time first, then higher remaining Guest Goodwill. Identical time and goodwill are ordered by submission time, then a stable ID. The top 25 are displayed; all submitted scores remain in the database.
- Names are 1–16 characters. No player account or sign-in. Names are labels, not verified identities, so different people can use the same name. A name may appear more than once, like an arcade score table.
- Scores are in Cloudflare D1, not localStorage, a file in the repository, or an ephemeral server disk. Local storage only remembers the last arcade name.
- The board refreshes every 15 seconds while open, with a manual refresh button. A failed save can be retried without duplicating the score.
- The alien defeat uses `dist/alien-incineration.mp4` and switches to the existing results screen on the video's `ended` event. Game sound is suspended during the film. If autoplay is blocked, a Play Video button appears. A failed media load offers a Continue button.

## Hosting choice

**Recommended: keep the code in GitHub and publish the whole game on Cloudflare Workers.** The Worker serves `dist/`, the score API, and the D1 database on one origin. No frontend URL configuration is needed.

**GitHub Pages also works**, but Pages only hosts the game files. The same Cloudflare Worker and D1 database must remain deployed separately. The supplied Pages workflow inserts the backend origin into `dist/leaderboard-config.js`, and the backend allowlists the Pages origin. Both game copies then share one board.

Simply uploading `dist/` to GitHub Pages without deploying and connecting the API will not provide a working shared leaderboard. The UI reports that the leaderboard is unavailable; it never substitutes browser-local scores.

## One-time production setup

These steps create real hosting resources. They have not been run by Codex. Both included deployment workflows are **manual only**; pushing source does not publish the game.

1. Push this full repository to GitHub, including `server/`, `migrations/`, the workflows, `package-lock.json`, and all of `dist/`.
2. In a terminal with Node 24, run `npm ci`, then `npx wrangler login` using your Cloudflare account.
3. Run `npx wrangler d1 create lester-leaderboard`. Copy the actual returned database UUID. Keep this same database for every release so the leaderboard survives updates.
4. In GitHub repository **Settings > Secrets and variables > Actions**, add:

   | Kind | Name | Value |
   |---|---|---|
   | Secret | `CLOUDFLARE_API_TOKEN` | Cloudflare deployment token scoped to your account, with Workers Scripts Edit and D1 Edit permissions |
   | Secret | `CLOUDFLARE_ACCOUNT_ID` | Your Cloudflare account ID |
   | Secret | `LEADERBOARD_RATE_LIMIT_SALT` | A long random private string, generated once and kept as a secret |
   | Variable | `CLOUDFLARE_D1_DATABASE_ID` | The real UUID from step 3 |
   | Variable | `LEADERBOARD_ALLOWED_ORIGINS` | Empty for Cloudflare-only hosting. For Pages, `https://YOUR-USERNAME.github.io`, plus any custom game origin, comma separated. No paths or trailing slashes. |

5. Run **Actions > Publish game and shared leaderboard > Run workflow**. It tests the API, applies the schema to the remote database, deploys the Worker and game, and sets the private rate-limit salt.
6. Open the Worker URL reported by the deployment. Confirm `/api/leaderboard` returns JSON. Play a real round, submit a name, and check the board from another browser/device.

Do not store the deployment token or rate-limit salt in JavaScript, the repository, `wrangler.json`, or the frontend config file. Player requests need neither secret.

### If you specifically want GitHub Pages

After the Cloudflare backend above is live:

1. Set the repository variable `LEADERBOARD_API_URL` to the exact deployed Worker origin, for example `https://YOUR-REAL-WORKER.YOUR-REAL-SUBDOMAIN.workers.dev`, with no trailing slash or `/api` suffix.
2. Confirm `LEADERBOARD_ALLOWED_ORIGINS` contains the real Pages origin. Run the Cloudflare workflow again after changing that variable.
3. In repository **Settings > Pages > Build and deployment**, select **GitHub Actions**.
4. Run **Actions > Publish game on GitHub Pages > Run workflow**.

Relative image, sound, video and script URLs support a project URL such as `https://YOUR-USERNAME.github.io/YOUR-REPOSITORY/`. The API URL is configured independently, so it does not accidentally target the Pages project path.

## Local development

```sh
npm ci
cp .dev.vars.example .dev.vars
npm run db:local
npm run dev
```

Open `http://localhost:4173`. Wrangler runs the actual Worker API and static assets with a persistent local D1 database. Local data is separate from the production database. `npm test` exercises the production API against real SQLite, including reopen/persistence, tie ordering, retries, validation, CORS, rate limits and cleanup. These tests do not replace the final hosted cross-device check.

The Cloudflare database ID can remain absent for local development. For a manual remote deployment instead of GitHub Actions, first run `node scripts/configure-cloudflare.mjs YOUR-REAL-DATABASE-UUID`, set `RATE_LIMIT_SALT` with `npx wrangler secret put RATE_LIMIT_SALT`, then run `npm run db:remote` and `npm run deploy`.

## Data and practical limits

Names, whole-second capture times, final goodwill and submission timestamps are public score data. Anonymous run tokens expire after 24 hours. A daily cleanup removes unsubmitted expired runs and request-limit buckets, preserving scores. Request limits store only short-lived salted hashes of addresses, not raw IP addresses.

The backend validates field ranges, issues unpredictable run tokens, checks elapsed time against the server's run window, uses parameterized SQL, and permits one saved score per run. It limits score submission attempts and run creation. As with most games that run entirely in a browser, a determined player can modify the client or forge a result. This is a casual arcade board, not a cheat-proof competition or verified identity system. Full cheat resistance would require authoritative gameplay verification on the server.

No production database, public endpoint, domain, account or deployment credential has been created as part of this change. The current ChatGPT Sites publication remains unchanged until a later publishing step. Its static hosting configuration does not execute this Cloudflare API; use the supplied Cloudflare deployment for the shared board.

## Hosting documentation

- https://developers.cloudflare.com/workers/static-assets/binding/
- https://developers.cloudflare.com/d1/get-started/
- https://developers.cloudflare.com/d1/reference/migrations/
- https://developers.cloudflare.com/workers/ci-cd/external-cicd/github-actions/
- https://docs.github.com/en/pages/getting-started-with-github-pages/what-is-github-pages
