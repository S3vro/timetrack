// Run: npm test   (Node >= 22.6, uses --experimental-strip-types)
import assert from 'node:assert/strict'
import { easterSunday, hessenHolidays } from '../src/lib/holidays.ts'
import {
  analyzeEntries, balance, clientPlaces, endAfter, entryMinutes, homeOfficeDays, prefillEntries,
  vacationDays, workedByDate,
} from '../src/lib/calc.ts'
import type { AppData, Entry } from '../src/lib/types.ts'
import { defaultData } from '../src/lib/types.ts'
import { daysBetween, fmtDuration, toDateStr } from '../src/lib/dates.ts'
import { parseBackup, toCsv } from '../src/lib/io.ts'

const entry = (id: string, start: string, end: string | null): Entry => ({ id, start, end, note: '' })
const clone = <T>(v: T): T => JSON.parse(JSON.stringify(v))

// Hessen 2026 – reference: https://www.feiertage-deutschland.de/bundesland/hessen/
const h26 = [...hessenHolidays(2026).keys()].sort()
assert.deepEqual(h26, [
  '2026-01-01', '2026-04-03', '2026-04-06', '2026-05-01', '2026-05-14',
  '2026-05-25', '2026-06-04', '2026-10-03', '2026-12-25', '2026-12-26',
])
// 2027 from the same reference
assert.equal(easterSunday(2027), '2027-03-28')
assert.ok(hessenHolidays(2027).has('2027-05-27')) // Corpus Christi

assert.equal(fmtDuration(65), '1:05')
assert.equal(fmtDuration(-30, true), '-0:30')
assert.equal(fmtDuration(60, true), '+1:00')
assert.equal(daysBetween('2026-10-24', '2026-10-26'), 2) // across the DST switch (25 Oct 2026)

// default start date is today
assert.equal(defaultData().settings.startDate, toDateStr(new Date()))

// Pre-fill 2026-10-01..2026-10-09 at 9h: weekdays = Oct 1,2,5,6,7,8,9 = 7 days (Oct 3 is Saturday)
let n = 0
const d = defaultData()
d.settings.startDate = '2026-10-01'
d.entries = prefillEntries(d, '2026-10-01', '2026-10-09', '08:00', '17:00', () => String(n++))
assert.equal(d.entries.length, 7)
// each day +60 min vs 8h target
assert.equal(balance(d, '2026-10-09', new Date(2026, 9, 9, 18)), 7 * 60)
// pre-fill again: nothing added (non-destructive)
assert.equal(prefillEntries(d, '2026-10-01', '2026-10-09', '08:00', '17:00', () => 'x').length, 0)

// vacation day: target 0, worked 0 → no change; counts as vacation
d.absences.push({ id: 'v', date: '2026-10-12', type: 'vacation' })
assert.equal(balance(d, '2026-10-12', new Date(2026, 9, 13)), 7 * 60)
assert.equal(vacationDays(d, 2026), 1)

// ── overnight sessions ──────────────────────────────────────────────
assert.equal(endAfter('2026-10-19T22:00', '01:30'), '2026-10-20T01:30') // earlier clock time → next day
assert.equal(endAfter('2026-10-19T08:00', '17:00'), '2026-10-19T17:00')
assert.equal(endAfter('2026-10-19T08:00', '08:00'), '2026-10-19T08:00') // zero length stays same day
const night = entry('n', '2026-10-19T22:00', '2026-10-20T01:30')
assert.equal(entryMinutes(night, new Date()), 210)
assert.equal(workedByDate([night], new Date()).get('2026-10-19'), 210) // belongs to the start day
assert.equal(workedByDate([night], new Date()).get('2026-10-20'), undefined)

// ── overlaps are flagged and counted once ──────────────────────────
{
  const now = new Date(2026, 9, 19, 23)
  const a = analyzeEntries([
    entry('a', '2026-10-19T08:00', '2026-10-19T12:00'),
    entry('b', '2026-10-19T11:00', '2026-10-19T13:00'), // overlaps a by 1h
    entry('c', '2026-10-19T13:00', '2026-10-19T14:00'), // adjacent to b: no overlap
    entry('d', '2026-10-19T09:00', '2026-10-19T10:00'), // fully inside a
    entry('z', '2026-10-19T15:00', '2026-10-19T15:00'), // zero length: ignored
  ], now)
  assert.deepEqual([...a.counted], [['a', 240], ['d', 0], ['b', 60], ['c', 60], ['z', 0]])
  assert.deepEqual([...a.overlapping].sort(), ['a', 'b', 'd'])

  // overlap across midnight: second session starts before the overnight one ended
  const x = analyzeEntries([
    entry('night', '2026-10-19T22:00', '2026-10-20T02:00'),
    entry('early', '2026-10-20T01:00', '2026-10-20T03:00'),
  ], now)
  assert.equal(x.counted.get('night'), 240)
  assert.equal(x.counted.get('early'), 60)

  // running session overlapping a pre-filled block
  const r = analyzeEntries([
    entry('pre', '2026-10-19T08:00', '2026-10-19T17:00'),
    entry('run', '2026-10-19T16:00', null),
  ], new Date(2026, 9, 19, 18))
  assert.equal(r.counted.get('run'), 60) // 17:00–18:00 only
  assert.ok(r.overlapping.has('run') && r.overlapping.has('pre'))
}

// ── work locations ──────────────────────────────────────────────────
d.locations = [
  { date: '2026-10-01', type: 'home', place: '' },
  { date: '2026-10-02', type: 'client', place: 'ACME Frankfurt' },
  { date: '2026-10-05', type: 'client', place: 'Beta GmbH' },
  { date: '2026-10-06', type: 'client', place: 'ACME Frankfurt' },
  { date: '2026-10-10', type: 'home', place: '' }, // Saturday, nothing worked → not counted
]
assert.equal(homeOfficeDays(d, 2026, new Date(2026, 9, 19)), 1)
assert.deepEqual(clientPlaces(d.locations), ['ACME Frankfurt', 'Beta GmbH']) // most recent first

// ── backup validation ───────────────────────────────────────────────
assert.deepEqual(parseBackup(clone(d)), d) // roundtrip
assert.throws(() => parseBackup({ foo: 1 }))
{
  const old = clone(d) as Partial<AppData>
  delete old.locations
  assert.deepEqual(parseBackup(old).locations, []) // backups from before this feature
  const twoRunning = clone(d)
  twoRunning.entries.push(entry('r1', '2026-10-19T08:00', null), entry('r2', '2026-10-19T09:00', null))
  assert.throws(() => parseBackup(twoRunning), /more than one session is running/)
  const badLoc = clone(d)
  badLoc.locations.push({ date: '2026-10-20', type: 'moon' as 'home', place: '' })
  assert.throws(() => parseBackup(badLoc), /Invalid location/)
  const dupLoc = clone(d)
  dupLoc.locations.push({ date: '2026-10-01', type: 'office', place: '' })
  assert.throws(() => parseBackup(dupLoc), /duplicate date/)
  const homeWithPlace = clone(d)
  homeWithPlace.locations[0].place = 'should be dropped'
  assert.equal(parseBackup(homeWithPlace).locations[0].place, '')
  const badSettings = clone(d)
  badSettings.settings.workdays = []
  assert.throws(() => parseBackup(badSettings), /Invalid workdays/)
}

// ── CSV ─────────────────────────────────────────────────────────────
{
  const c = clone(d)
  c.entries.push({ ...entry('n', '2026-10-13T22:00', '2026-10-14T01:30'), note: '=HYPERLINK("x")' })
  const csv = toCsv(c, '2026-10-01', '2026-10-31', new Date())
  const lines = csv.slice(1).trimEnd().split('\r\n')
  assert.equal(lines[0], 'date;type;start;end;duration_min;note;end_date;location;client_location')
  assert.ok(lines.includes('2026-10-01;work;08:00;17:00;540;pre-filled;2026-10-01;Home;'))
  assert.ok(lines.includes('2026-10-02;work;08:00;17:00;540;pre-filled;2026-10-02;Client;ACME Frankfurt'))
  assert.ok(lines.includes('2026-10-12;vacation;;;0;;;;'))
  // overnight end date + formula-injection guard
  assert.ok(lines.includes(`2026-10-13;work;22:00;01:30;210;"'=HYPERLINK(""x"")";2026-10-14;;`))
}

console.log('all tests passed')
