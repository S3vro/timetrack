import type { AppData, Entry } from './types.ts'
import { defaultData } from './types.ts'
import { entryDate, entryMinutes } from './calc.ts'

const esc = (v: string | number) => {
  const s = String(v)
  return /[;"\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

/** CSV (semicolon-separated, for German-locale Excel). Includes absences as rows. */
export function toCsv(data: AppData, from: string, to: string, now: Date): string {
  const rows: (string | number)[][] = [['date', 'type', 'start', 'end', 'duration_min', 'note']]
  const inRange = (d: string) => d >= from && d <= to
  const items: { date: string; row: (string | number)[] }[] = []
  data.entries
    .filter((e: Entry) => inRange(entryDate(e)))
    .forEach((e) =>
      items.push({
        date: e.start,
        row: [entryDate(e), 'work', e.start.slice(11), e.end ? e.end.slice(11) : '', entryMinutes(e, now), e.note],
      }),
    )
  data.absences
    .filter((a) => inRange(a.date))
    .forEach((a) => items.push({ date: a.date, row: [a.date, a.type, '', '', 0, ''] }))
  items.sort((a, b) => a.date.localeCompare(b.date)).forEach((i) => rows.push(i.row))
  // BOM so Excel detects UTF-8
  return '﻿' + rows.map((r) => r.map(esc).join(';')).join('\r\n') + '\r\n'
}

const DT = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/
const D = /^\d{4}-\d{2}-\d{2}$/

/** Validate a parsed backup; throws with a readable message on invalid data */
export function parseBackup(raw: unknown): AppData {
  const o = raw as Partial<AppData>
  if (!o || typeof o !== 'object' || o.version !== 1) throw new Error('Not a timetrack backup (version 1).')
  if (!Array.isArray(o.entries) || !Array.isArray(o.absences)) throw new Error('Missing entries/absences.')
  for (const e of o.entries)
    if (typeof e.id !== 'string' || !DT.test(e.start) || (e.end !== null && !DT.test(e.end)))
      throw new Error(`Invalid entry: ${JSON.stringify(e)}`)
  for (const a of o.absences)
    if (typeof a.id !== 'string' || !D.test(a.date) || !['vacation', 'sick'].includes(a.type))
      throw new Error(`Invalid absence: ${JSON.stringify(a)}`)
  return {
    version: 1,
    settings: { ...defaultData().settings, ...o.settings },
    entries: o.entries.map((e) => ({ ...e, note: e.note ?? '' })),
    absences: o.absences,
  }
}

export function download(filename: string, content: string, mime: string) {
  const url = URL.createObjectURL(new Blob([content], { type: mime }))
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}
