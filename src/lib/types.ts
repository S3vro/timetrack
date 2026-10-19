import { toDateStr } from './dates.ts'

/** Local date 'YYYY-MM-DD' */
export type DateStr = string
/** Local date-time 'YYYY-MM-DDTHH:mm' (no timezone, avoids DST surprises) */
export type DateTimeStr = string

export type AbsenceType = 'vacation' | 'sick'

export const LOCATION_TYPES = ['home', 'office', 'client'] as const
export type LocationType = (typeof LOCATION_TYPES)[number]

export const LOCATION_LABELS: Record<LocationType, string> = {
  home: 'Home',
  office: 'Office',
  client: 'Client',
}

export interface Entry {
  id: string
  start: DateTimeStr
  /** null = currently clocked in. May lie on a later day than `start` (overnight session). */
  end: DateTimeStr | null
  note: string
}

export interface Absence {
  id: string
  date: DateStr
  type: AbsenceType
}

/** Where the work of one day was done (at most one per date) */
export interface WorkLocation {
  date: DateStr
  type: LocationType
  /** Client location; always '' unless type is 'client' */
  place: string
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
  locations: WorkLocation[]
}

export const defaultData = (): AppData => ({
  version: 1,
  settings: {
    weeklyTargetMin: 40 * 60,
    workdays: [1, 2, 3, 4, 5],
    startDate: toDateStr(new Date()),
    initialBalanceMin: 0,
    vacationMinDays: 20,
  },
  entries: [],
  absences: [],
  locations: [],
})
