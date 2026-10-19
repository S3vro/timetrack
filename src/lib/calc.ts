import type { Absence, AppData, DateStr, DateTimeStr, Entry, Settings, WorkLocation } from './types.ts'
import { addDays, datePart, eachDay, isoWeekday, minutesBetween, parseDateTime, timePart, toDateStr } from './dates.ts'
import { holidayName } from './holidays.ts'

export const entryDate = (e: Entry): DateStr => datePart(e.start)

/** Raw duration of one entry in minutes; running entries count up to `now`, invalid ones (end ≤ start) count 0 */
export function entryMinutes(e: Entry, now: Date): number {
  const end = e.end ? parseDateTime(e.end) : now
  return Math.max(0, minutesBetween(parseDateTime(e.start), end))
}

/**
 * End date-time for a session that starts at `start` and ends at clock time `endTime`:
 * the same day, or the next day if `endTime` is earlier than the start time (overnight).
 * An end equal to the start stays on the same day (zero-length, flagged invalid in the UI).
 */
export function endAfter(start: DateTimeStr, endTime: string): DateTimeStr {
  const day = datePart(start)
  return `${endTime < timePart(start) ? addDays(day, 1) : day}T${endTime}`
}

export interface EntryAnalysis {
  /** Minutes that count towards the balance, per entry id (overlapping time is counted only once) */
  counted: Map<string, number>
  /** Ids of entries that overlap with at least one other entry */
  overlapping: Set<string>
}

/**
 * Sweep over all entries in chronological order. Time already covered by an earlier
 * entry is not counted again; it stays with the entry that started first.
 */
export function analyzeEntries(entries: Entry[], now: Date): EntryAnalysis {
  const counted = new Map<string, number>()
  const overlapping = new Set<string>()
  const sorted = [...entries].sort((a, b) => a.start.localeCompare(b.start) || a.id.localeCompare(b.id))
  let coveredUntil = -Infinity
  let coveredBy = ''
  for (const e of sorted) {
    const start = parseDateTime(e.start)
    const end = e.end ? parseDateTime(e.end) : now
    if (end <= start) {
      counted.set(e.id, 0)
      continue
    }
    const from = new Date(Math.max(start.getTime(), coveredUntil))
    counted.set(e.id, Math.max(0, minutesBetween(from, end)))
    if (start.getTime() < coveredUntil) overlapping.add(e.id).add(coveredBy)
    if (end.getTime() > coveredUntil) {
      coveredUntil = end.getTime()
      coveredBy = e.id
    }
  }
  return { counted, overlapping }
}

/** Counted minutes per day (an entry belongs to the day it starts on) */
export function workedByDate(entries: Entry[], now: Date): Map<DateStr, number> {
  const { counted } = analyzeEntries(entries, now)
  const m = new Map<DateStr, number>()
  for (const e of entries) m.set(entryDate(e), (m.get(entryDate(e)) ?? 0) + (counted.get(e.id) ?? 0))
  return m
}

export const absenceByDate = (abs: Absence[]) => new Map(abs.map((a) => [a.date, a]))
export const locationByDate = (locs: WorkLocation[]) => new Map(locs.map((l) => [l.date, l]))

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
  location?: WorkLocation
}

export function dayRows(data: AppData, from: DateStr, to: DateStr, now: Date): DayRow[] {
  const worked = workedByDate(data.entries, now)
  const abs = absenceByDate(data.absences)
  const locs = locationByDate(data.locations)
  return eachDay(from, to).map((date) => {
    const w = worked.get(date) ?? 0
    const t = dayTarget(date, data.settings, abs)
    return {
      date, worked: w, target: t, diff: w - t,
      holiday: holidayName(date), absence: abs.get(date), location: locs.get(date),
    }
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

/** Days in a year marked "Home" on which work was actually recorded */
export function homeOfficeDays(data: AppData, year: number, now: Date): number {
  const worked = workedByDate(data.entries, now)
  return data.locations.filter(
    (l) => l.type === 'home' && l.date.startsWith(`${year}-`) && (worked.get(l.date) ?? 0) > 0,
  ).length
}

/** Distinct client locations used so far, most recently used first */
export function clientPlaces(locations: WorkLocation[]): string[] {
  const latest = new Map<string, DateStr>()
  for (const l of locations) {
    if (l.type !== 'client' || !l.place) continue
    if ((latest.get(l.place) ?? '') < l.date) latest.set(l.place, l.date)
  }
  return [...latest].sort((a, b) => b[1].localeCompare(a[1]) || a[0].localeCompare(b[0])).map(([p]) => p)
}

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
