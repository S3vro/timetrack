import type { AppData, Entry, Settings, WorkLocation } from './types.ts'
import { defaultData, LOCATION_LABELS, LOCATION_TYPES } from './types.ts'
import { entryDate, entryMinutes, locationByDate } from './calc.ts'
import { datePart, timePart } from './dates.ts'

/**
 * One CSV cell. Text starting with = + - @ (or tab/CR) is prefixed with ' so
 * spreadsheet apps don't execute it as a formula (CSV injection).
 */
const esc = (v: string | number) => {
  let s = String(v)
  if (typeof v === 'string' && /^[=+\-@\t\r]/.test(s)) s = `'${s}`
  return /[;"\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

const CSV_HEADER = ['date', 'type', 'start', 'end', 'duration_min', 'note', 'end_date', 'location', 'client_location']

/**
 * CSV (semicolon-separated, for German-locale Excel). Includes absences as rows.
 * `duration_min` is the raw session length (end − start); `end_date` differs from
 * `date` for overnight sessions. New columns are appended so existing imports keep working.
 */
export function toCsv(data: AppData, from: string, to: string, now: Date): string {
  const inRange = (d: string) => d >= from && d <= to
  const locs = locationByDate(data.locations)
  const locCells = (date: string) => {
    const l = locs.get(date)
    return l ? [LOCATION_LABELS[l.type], l.place] : ['', '']
  }
  const items: { sortKey: string; row: (string | number)[] }[] = []
  data.entries
    .filter((e: Entry) => inRange(entryDate(e)))
    .forEach((e) => {
      const d = entryDate(e)
      items.push({
        sortKey: e.start,
        row: [
          d, 'work', timePart(e.start), e.end ? timePart(e.end) : '', entryMinutes(e, now), e.note,
          e.end ? datePart(e.end) : '', ...locCells(d),
        ],
      })
    })
  data.absences
    .filter((a) => inRange(a.date))
    .forEach((a) => items.push({ sortKey: a.date, row: [a.date, a.type, '', '', 0, '', '', '', ''] }))
  const rows = [CSV_HEADER, ...items.sort((a, b) => a.sortKey.localeCompare(b.sortKey)).map((i) => i.row)]
  // BOM so Excel detects UTF-8
  return '﻿' + rows.map((r) => r.map(esc).join(';')).join('\r\n') + '\r\n'
}

const DT = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/
const D = /^\d{4}-\d{2}-\d{2}$/
const isObj = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v)
const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v)
const fail = (what: string, v: unknown): never => {
  throw new Error(`Invalid ${what}: ${JSON.stringify(v)}`)
}

function parseSettings(raw: unknown): Settings {
  const s = { ...defaultData().settings, ...(isObj(raw) ? raw : {}) }
  const workdaysOk =
    Array.isArray(s.workdays) && s.workdays.length > 0 &&
    s.workdays.every((d) => Number.isInteger(d) && d >= 1 && d <= 7) &&
    new Set(s.workdays).size === s.workdays.length
  if (!isNum(s.weeklyTargetMin) || s.weeklyTargetMin < 0) fail('weekly target', s.weeklyTargetMin)
  if (!workdaysOk) fail('workdays', s.workdays)
  if (typeof s.startDate !== 'string' || !D.test(s.startDate)) fail('start date', s.startDate)
  if (!isNum(s.initialBalanceMin)) fail('initial balance', s.initialBalanceMin)
  if (!isNum(s.vacationMinDays) || s.vacationMinDays < 0) fail('vacation minimum', s.vacationMinDays)
  const { weeklyTargetMin, workdays, startDate, initialBalanceMin, vacationMinDays } = s
  return { weeklyTargetMin, workdays: [...workdays].sort((a, b) => a - b), startDate, initialBalanceMin, vacationMinDays }
}

function parseLocations(raw: unknown): WorkLocation[] {
  if (raw === undefined) return [] // backups made before work locations existed
  if (!Array.isArray(raw)) fail('locations', raw)
  const seen = new Set<string>()
  return (raw as unknown[]).map((l) => {
    if (!isObj(l) || typeof l.date !== 'string' || !D.test(l.date)) return fail('location', l)
    if (!(LOCATION_TYPES as readonly unknown[]).includes(l.type)) return fail('location', l)
    if (seen.has(l.date)) return fail('location (duplicate date)', l)
    seen.add(l.date)
    const type = l.type as WorkLocation['type']
    const place = typeof l.place === 'string' ? l.place.trim() : ''
    return { date: l.date, type, place: type === 'client' ? place : '' }
  })
}

/** Validate a parsed backup; throws with a readable message on invalid data */
export function parseBackup(raw: unknown): AppData {
  if (!isObj(raw) || raw.version !== 1) throw new Error('Not a timetrack backup (version 1).')
  const { entries, absences } = raw
  if (!Array.isArray(entries) || !Array.isArray(absences)) throw new Error('Missing entries/absences.')
  for (const e of entries)
    if (!isObj(e) || typeof e.id !== 'string' || typeof e.start !== 'string' || !DT.test(e.start) ||
        (e.end !== null && (typeof e.end !== 'string' || !DT.test(e.end))))
      fail('entry', e)
  if (entries.filter((e) => e.end === null).length > 1)
    throw new Error('Invalid data: more than one session is running.')
  for (const a of absences)
    if (!isObj(a) || typeof a.id !== 'string' || typeof a.date !== 'string' || !D.test(a.date) ||
        !['vacation', 'sick'].includes(a.type as string))
      fail('absence', a)
  return {
    version: 1,
    settings: parseSettings(raw.settings),
    entries: (entries as Entry[]).map((e) => ({ id: e.id, start: e.start, end: e.end, note: typeof e.note === 'string' ? e.note : '' })),
    absences: absences as AppData['absences'],
    locations: parseLocations(raw.locations),
  }
}

export function download(filename: string, content: string, mime: string) {
  const url = URL.createObjectURL(new Blob([content], { type: mime }))
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  // revoke later: revoking synchronously can cancel the download in some browsers
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
