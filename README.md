# timetrack – personal time tracking

Vue 3 + TypeScript + Tailwind CSS v4 + Vite. Static app for GitHub Pages; all data stays in the browser's `localStorage` (key `timetrack:v1`; data from the old key `stempel:v1` is migrated automatically).

## Features
- Clock in / out, multiple sessions per day; breaks = gaps between sessions
- Target 40 h/week (8 h Mon–Fri), Hessen public holidays computed automatically
- Overtime/undertime per day, week, month and total (from tracking start date + optional carry-over)
- Vacation / sick days; vacation counter per year with marker at the legal minimum (20 days, 5-day week, §3 BUrlG)
- Everything editable (Week view)
- Pre-fill working days with a fixed block (non-destructive)
- CSV export (`;`-separated, UTF-8 BOM for Excel), JSON backup & restore

## Develop
```bash
npm install
npm run dev      # http://localhost:5173
npm test         # logic tests (Node >= 22.6)
npm run build
```

## Deploy (GitHub Pages)
1. Push to a GitHub repo, branch `main`.
2. Repo **Settings → Pages → Build and deployment → Source: GitHub Actions**.
3. Every push to `main` runs `.github/workflows/deploy.yml` (tests, build, deploy).

`vite.config.ts` uses `base: './'` and the router uses hash mode, so the repo name doesn't matter.

## Data model
```ts
{ version: 1,
  settings: { weeklyTargetMin, workdays, startDate, initialBalanceMin, vacationMinDays },
  entries:  [{ id, start: 'YYYY-MM-DDTHH:mm', end: ... | null, note }],   // end null = running
  absences: [{ id, date: 'YYYY-MM-DD', type: 'vacation' | 'sick' }] }
```
An entry belongs to the day it starts on.
