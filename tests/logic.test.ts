// Run: npm test   (Node >= 22.6, uses --experimental-strip-types)
import assert from 'node:assert/strict'
import { easterSunday, hessenHolidays } from '../src/lib/holidays.ts'
import { balance, prefillEntries, vacationDays } from '../src/lib/calc.ts'
import { defaultData } from '../src/lib/types.ts'
import { fmtDuration } from '../src/lib/dates.ts'
import { parseBackup, toCsv } from '../src/lib/io.ts'

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

// Pre-fill 2026-10-01..2026-10-09 at 9h: weekdays = Oct 1,2,5,6,7,8,9 = 7 days (Oct 3 is Saturday)
let n = 0
const d = defaultData()
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

// backup roundtrip + csv
assert.deepEqual(parseBackup(JSON.parse(JSON.stringify(d))), d)
assert.throws(() => parseBackup({ foo: 1 }))
const csv = toCsv(d, '2026-10-01', '2026-10-31', new Date())
assert.ok(csv.includes('2026-10-01;work;08:00;17:00;540;pre-filled'))
assert.ok(csv.includes('2026-10-12;vacation'))

console.log('all tests passed')
