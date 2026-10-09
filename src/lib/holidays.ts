import type { DateStr } from './types.ts'
import { addDays, toDateStr } from './dates.ts'

/** Easter Sunday (Gregorian), anonymous Gregorian algorithm (Meeus/Jones/Butcher) */
export function easterSunday(year: number): DateStr {
  const a = year % 19
  const b = Math.floor(year / 100)
  const c = year % 100
  const d = Math.floor(b / 4)
  const e = b % 4
  const f = Math.floor((b + 8) / 25)
  const g = Math.floor((b - f + 1) / 3)
  const h = (19 * a + b - d - g + 15) % 30
  const i = Math.floor(c / 4)
  const k = c % 4
  const l = (32 + 2 * e + 2 * i - h - k) % 7
  const m = Math.floor((a + 11 * h + 22 * l) / 451)
  const month = Math.floor((h + l - 7 * m + 114) / 31)
  const day = ((h + l - 7 * m + 114) % 31) + 1
  return toDateStr(new Date(year, month - 1, day))
}

/** Statutory public holidays in Hessen (10 per year) */
export function hessenHolidays(year: number): Map<DateStr, string> {
  const e = easterSunday(year)
  return new Map<DateStr, string>([
    [`${year}-01-01`, 'New Year'],
    [addDays(e, -2), 'Good Friday'],
    [addDays(e, 1), 'Easter Monday'],
    [`${year}-05-01`, 'Labour Day'],
    [addDays(e, 39), 'Ascension Day'],
    [addDays(e, 50), 'Whit Monday'],
    [addDays(e, 60), 'Corpus Christi'],
    [`${year}-10-03`, 'German Unity Day'],
    [`${year}-12-25`, 'Christmas Day'],
    [`${year}-12-26`, '2nd Christmas Day'],
  ])
}

const cache = new Map<number, Map<DateStr, string>>()
export function holidayName(date: DateStr): string | undefined {
  const y = Number(date.slice(0, 4))
  if (!cache.has(y)) cache.set(y, hessenHolidays(y))
  return cache.get(y)!.get(date)
}
