# Has This Ever Been Litigated?

A tiny, replayable web game: enter any word or short phrase, see how often it appears in real U.S. judicial opinions, and open one matching case.

## How it works

- The single-page interface sends an exact-phrase query to `/api/search`.
- The server route searches CourtListener's public Legal Search API with `type=o`.
- Opinion counts, case names, courts, dates, citations, links, and matching text all come from the live API. The app does not invent fallback cases or numbers.
- The playful percentile compares the live result count with a fixed basket of 11 real CourtListener searches collected on September 13, 2026.
- Empty, loading, upstream-error, and successful-result states are all handled in the same loop.

CourtListener is operated by the nonprofit Free Law Project. This project is not affiliated with or endorsed by Free Law Project.

## Run locally

Requires Node.js 22.13 or newer.

```bash
npm install
npm run dev
```

Open the local URL printed by Vinext. No API key is required. To emit an absolute social-preview URL, copy `.env.example` to `.env.local` and set `SITE_URL` to the trusted deployment origin.

## Build and checks

```bash
npm run build
npm run lint
```

## Services and URLs

- Opinion data: https://www.courtlistener.com/api/rest/v4/search/
- Case pages: https://www.courtlistener.com/
- Production site: added here after the first deployment

## Data and privacy

Searches are sent through this site's server route to CourtListener. No accounts, database, analytics, or persistent user data are used. The search route caches successful responses briefly to reduce load on the public API.
