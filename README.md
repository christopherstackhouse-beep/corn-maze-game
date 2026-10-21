# Lester After Dark

Complete source and assets for **North Fulck Farms presents Amazing Fall Fun Time**. This export preserves the current maze, characters, graphics, recorded dialogue, music, alien sequences, videos, and gameplay. It adds Vercel server functions for the existing anonymous shared leaderboard.

## Deploy from GitHub to Vercel

1. Extract the ZIP. Upload the **contents of `lester-after-dark/`** to a GitHub repository. `package.json`, `vercel.json`, `api/`, and `dist/` must be at the repository root.
2. Import that repository into Vercel. Use framework **Other**, repository root as the root directory, Node.js **24.x**, install command `npm ci`, build command `npm run build`, and output directory `dist`. These values are already configured in this project.
3. For the shared leaderboard, create a persistent **Turso/libSQL database** and a read/write auth token. Add the following server-side environment variables to your Vercel project, then deploy or redeploy:

| Variable | Value |
| --- | --- |
| `TURSO_DATABASE_URL` | Your persistent `libsql://…` database URL |
| `TURSO_AUTH_TOKEN` | Read/write database token |
| `RATE_LIMIT_SALT` | A long random secret for anonymous request limits |
| `CRON_SECRET` | A different long random secret for daily cleanup |

Generate a secret with `node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"`. Keep actual values in Vercel settings or a private local environment file. `.env.example` contains names only.

The build automatically applies checksummed database migrations. Subsequent deployments preserve existing scores. A daily Vercel cron removes expired unfinished runs and rate-limit records, while keeping submitted scores. Preview deployments can use a separate database if you want test scores kept separate.

The game and API run on the same Vercel domain. Leave `dist/leaderboard-config.js` unchanged. Players enter a name without signing in. Scores rank by shortest capture time, then highest remaining Guest Goodwill. The database persists independently of Vercel deployments.

The game can deploy without database variables, but the shared leaderboard reports that it is unavailable until the database is connected. No database account, production token, existing score export, or hosting subscription is included in this ZIP. Once the GitHub repository is connected to Vercel, later pushes can trigger new deployments.

## Run and verify locally

Use Node.js 24:

```sh
npm ci
npm test
npm run build
```

For a complete local game plus leaderboard preview using the included original Cloudflare adapter:

```sh
cp .dev.vars.example .dev.vars
# Set a local RATE_LIMIT_SALT in .dev.vars.
npm run db:local
npm run dev
```

Open the local URL printed by Wrangler. This uses a local development database. For Vercel development, use the Vercel CLI's `vercel dev` with your project environment configured. To run remote migrations manually with environment variables loaded in your shell, use `npm run db:setup`.

## Project contents

- `dist/`: complete browser game source and all runtime images, recordings, music, and video. This folder is intentionally checked in; the game does not require a bundler.
- `api/`: Vercel functions for leaderboard reads, run creation, score submission, and scheduled cleanup.
- `server/`: shared score rules and Cloudflare/Vercel database adapters.
- `migrations/`: persistent leaderboard schema.
- `scripts/`: deployment, schema setup, and development utilities.
- `tests/`: gameplay flow, leaderboard rules, persistence, and Vercel/libSQL integration checks.
- `docs/CLOUDFLARE-AND-GITHUB-PAGES.md`: optional original hosting instructions. The included manual GitHub Actions workflows target those alternatives; they are not needed for Vercel.
- `SOURCE-SNAPSHOT.json` and `ASSET-SHA256.txt`: original source revision and checksums for the preserved game files.

`npm run deploy` is the original optional Cloudflare deployment command. For Vercel, use the GitHub integration or Vercel CLI. Required runtime assets are already included; asset-generation utilities are optional and are not part of the build.

## Post-deployment check

Open the site, start a run, and capture Lester. Submit a name and confirm it appears with time and goodwill. Open the site in another browser to confirm the same scores are visible. Test both alien interactions and verify the recorded sounds and incineration video play after browser interaction enables audio.

This package was tested locally. Connecting a production database and performing a production deployment require your own service configuration.

References: [Vercel Node functions](https://vercel.com/docs/functions/runtimes/node-js), [Vercel configuration](https://vercel.com/docs/project-configuration/vercel-json), [Turso TypeScript SDK](https://docs.turso.tech/sdk/ts/reference), [Vercel cron jobs](https://vercel.com/docs/cron-jobs/manage-cron-jobs).
