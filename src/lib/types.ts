/** Local date 'YYYY-MM-DD' */
export type DateStr = string
/** Local date-time 'YYYY-MM-DDTHH:mm' (no timezone, avoids DST surprises) */
export type DateTimeStr = string

export type AbsenceType = 'vacation' | 'sick'

export interface Entry {
  id: string
  start: DateTimeStr
  /** null = currently clocked in */
  end: DateTimeStr | null
  note: string
}

export interface Absence {
  id: string
  date: DateStr
  type: AbsenceType
}

export interface Settings {
  weeklyTargetMin: number
  /** ISO weekdays: 1 = Monday … 7 = Sunday */
  workdays: number[]
  startDate: DateStr
  initialBalanceMin: number
  /** Legal minimum vacation (§3 BUrlG, 5-day week = 20) – used for the marker only */
  vacationMinDays: number
}

export interface AppData {
  version: 1
  settings: Settings
  entries: Entry[]
  absences: Absence[]
}

export const defaultData = (): AppData => ({
  version: 1,
  settings: {
    weeklyTargetMin: 40 * 60,
    workdays: [1, 2, 3, 4, 5],
    startDate: '2026-10-01',
    initialBalanceMin: 0,
    vacationMinDays: 20,
  },
  entries: [],
  absences: [],
})
