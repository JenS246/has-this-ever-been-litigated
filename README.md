# Has This Ever Been Litigated?

A tiny, replayable web game: enter any word or short phrase, see how often it appears in real U.S. judicial opinions, and open one matching case.

## How it works

- The static React app sends exact-phrase searches to a small Node.js proxy at `https://litigated.150-136-117-187.sslip.io`.
- The proxy authenticates to CourtListener's Legal Search API with `type=o`; the CourtListener token remains server-side.
- Opinion counts, case names, courts, dates, citations, links, and matching text all come from the live API. The app does not invent fallback cases or numbers.
- The playful percentile compares the live result count with a fixed basket of 11 real CourtListener searches collected on September 13, 2026.
- Empty, loading, upstream-error, and successful-result states are handled in the same loop.

CourtListener is operated by the nonprofit Free Law Project. This project is not affiliated with or endorsed by Free Law Project.

## Run locally

Requires Node.js 22.13 or newer.

```bash
npm install
npm run dev
```

To run the API, copy `.env.example` to `.env`, set a CourtListener API token, and run `npm run start:api`.

Open the local URL printed by Vite.

## Build and checks

```bash
npm run build
npm run lint
```

The production bundle is written to `dist/`.

## URLs and deployment

- Game: https://jens246.github.io/has-this-ever-been-litigated/
- Source: https://github.com/JenS246/has-this-ever-been-litigated
- API: https://litigated.150-136-117-187.sslip.io/api/health
- Opinion data: https://www.courtlistener.com/api/rest/v4/search/

Pushes to `main` trigger `.github/workflows/pages.yml`, which builds the app and publishes `dist/` to GitHub Pages. Vite's base path is set to `/has-this-ever-been-litigated/` so static assets resolve correctly.

## Data and privacy

Searches pass through the project's stateless proxy and are not stored. The CourtListener credential is loaded from the ignored `.env` file and is never committed.

## Backend operations

- PM2 service: `has-this-ever-been-litigated-api`
- Local bind: `0.0.0.0:8793`
- Public URL: `https://litigated.150-136-117-187.sslip.io`
- Data: none; the proxy is stateless
- Backup/restore: clone the GitHub repository, restore the untracked `.env` from a secret backup, install dependencies, and start the PM2 command documented in `ops/backend-services.json`
- Caddy route: `ops/Caddyfile.host`
