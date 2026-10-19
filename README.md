# timetrack – personal time tracking

Vue 3 + TypeScript + Tailwind CSS v4 + Vite. Static app for GitHub Pages; all data stays in the browser's `localStorage` (key `timetrack:v1`; data from the old key `stempel:v1` is migrated automatically).

## Features
- Clock in / out, multiple sessions per day; breaks = gaps between sessions
- Overnight sessions: an end time earlier than the start means the next day (shown as `+1`)
- Overlapping sessions are highlighted; overlapping time is counted only once
- Work location per day: Home / Office / Client (with client location, suggestions from past entries); shown in report + CSV, yearly home-office day counter on the dashboard
- Target 40 h/week (8 h Mon–Fri), Hessen public holidays computed automatically
- Overtime/undertime per day, week, month and total (from tracking start date + optional carry-over)
- Vacation / sick days; vacation counter per year with marker at the legal minimum (20 days, 5-day week, §3 BUrlG)
- Everything editable (Week view)
- Pre-fill working days with a fixed block (non-destructive)
- CSV export (`;`-separated, UTF-8 BOM for Excel), JSON backup & restore
- Unreadable stored data is never overwritten (saving pauses, raw copy kept); open tabs stay in sync

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
  absences: [{ id, date: 'YYYY-MM-DD', type: 'vacation' | 'sick' }],
  locations:[{ date: 'YYYY-MM-DD', type: 'home' | 'office' | 'client', place }] }  // place: client location, '' otherwise
```
An entry belongs to the day it starts on (also when it ends on the next day). At most one entry can be running.
`locations` is optional in backups made before it existed.
