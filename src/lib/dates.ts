import type { DateStr, DateTimeStr } from './types.ts'

const pad = (n: number) => String(n).padStart(2, '0')

export const toDateStr = (d: Date): DateStr =>
  `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`

export const toDateTimeStr = (d: Date): DateTimeStr =>
  `${toDateStr(d)}T${pad(d.getHours())}:${pad(d.getMinutes())}`

/** Parse 'YYYY-MM-DD' as local midnight */
export const parseDate = (s: DateStr): Date => {
  const [y, m, d] = s.split('-').map(Number)
  return new Date(y, m - 1, d)
}

/** Parse 'YYYY-MM-DDTHH:mm' as local time */
export const parseDateTime = (s: DateTimeStr): Date => {
  const [date, time] = s.split('T')
  const [h, min] = time.split(':').map(Number)
  const d = parseDate(date)
  d.setHours(h, min, 0, 0)
  return d
}

export const addDays = (s: DateStr, n: number): DateStr => {
  const d = parseDate(s)
  d.setDate(d.getDate() + n)
  return toDateStr(d)
}

/** ISO weekday: 1 = Monday … 7 = Sunday */
export const isoWeekday = (s: DateStr): number => {
  const w = parseDate(s).getDay()
  return w === 0 ? 7 : w
}

export const mondayOf = (s: DateStr): DateStr => addDays(s, 1 - isoWeekday(s))

/** Inclusive range of dates; empty if from > to */
export function eachDay(from: DateStr, to: DateStr): DateStr[] {
  const out: DateStr[] = []
  for (let d = from; d <= to; d = addDays(d, 1)) out.push(d)
  return out
}

export const minutesBetween = (a: Date, b: Date) => Math.round((b.getTime() - a.getTime()) / 60000)

/** 125 -> '2:05', -30 -> '-0:30' */
export function fmtDuration(min: number, signed = false): string {
  const sign = min < 0 ? '-' : signed && min > 0 ? '+' : ''
  const abs = Math.abs(Math.round(min))
  return `${sign}${Math.floor(abs / 60)}:${pad(abs % 60)}`
}

const WD = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
export const weekdayName = (s: DateStr) => WD[isoWeekday(s) - 1]

export const fmtDateShort = (s: DateStr) => {
  const [, m, d] = s.split('-')
  return `${weekdayName(s)} ${d}.${m}.`
}
