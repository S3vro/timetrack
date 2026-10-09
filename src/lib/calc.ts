import type { Absence, AppData, DateStr, Entry, Settings } from './types.ts'
import { eachDay, isoWeekday, minutesBetween, parseDateTime, toDateStr } from './dates.ts'
import { holidayName } from './holidays.ts'

export const entryDate = (e: Entry): DateStr => e.start.slice(0, 10)

/** Duration of one entry in minutes; running entries count up to `now` */
export function entryMinutes(e: Entry, now: Date): number {
  const end = e.end ? parseDateTime(e.end) : now
  return Math.max(0, minutesBetween(parseDateTime(e.start), end))
}

export function workedByDate(entries: Entry[], now: Date): Map<DateStr, number> {
  const m = new Map<DateStr, number>()
  for (const e of entries) m.set(entryDate(e), (m.get(entryDate(e)) ?? 0) + entryMinutes(e, now))
  return m
}

export const absenceByDate = (abs: Absence[]) => new Map(abs.map((a) => [a.date, a]))

/** Is this a regular working day (workday, no holiday)? Absences not considered. */
export const isWorkday = (date: DateStr, s: Settings) =>
  s.workdays.includes(isoWeekday(date)) && !holidayName(date)

export function dayTarget(date: DateStr, s: Settings, absences: Map<DateStr, Absence>): number {
  if (date < s.startDate || !isWorkday(date, s) || absences.has(date)) return 0
  return s.weeklyTargetMin / s.workdays.length
}

export interface DayRow {
  date: DateStr
  worked: number
  target: number
  diff: number
  holiday?: string
  absence?: Absence
}

export function dayRows(data: AppData, from: DateStr, to: DateStr, now: Date): DayRow[] {
  const worked = workedByDate(data.entries, now)
  const abs = absenceByDate(data.absences)
  return eachDay(from, to).map((date) => {
    const w = worked.get(date) ?? 0
    const t = dayTarget(date, data.settings, abs)
    return { date, worked: w, target: t, diff: w - t, holiday: holidayName(date), absence: abs.get(date) }
  })
}

/** Overtime balance from settings.startDate up to and including `to` (+ initial balance) */
export function balance(data: AppData, to: DateStr, now: Date): number {
  const rows = dayRows(data, data.settings.startDate, to, now)
  return data.settings.initialBalanceMin + rows.reduce((s, r) => s + r.diff, 0)
}

/** Vacation days taken in a year (only days that would otherwise be working days count) */
export const vacationDays = (data: AppData, year: number) =>
  data.absences.filter(
    (a) => a.type === 'vacation' && a.date.startsWith(`${year}-`) && isWorkday(a.date, data.settings),
  ).length

/**
 * Build pre-fill entries: one block per working day in [from, to] that has
 * no entry and no absence yet. Non-destructive.
 */
export function prefillEntries(
  data: AppData,
  from: DateStr,
  to: DateStr,
  startTime: string,
  endTime: string,
  newId: () => string,
): Entry[] {
  const hasEntry = new Set(data.entries.map(entryDate))
  const abs = absenceByDate(data.absences)
  return eachDay(from, to)
    .filter((d) => isWorkday(d, data.settings) && !hasEntry.has(d) && !abs.has(d))
    .map((d) => ({ id: newId(), start: `${d}T${startTime}`, end: `${d}T${endTime}`, note: 'pre-filled' }))
}

export const today = () => toDateStr(new Date())
