import { defineStore } from 'pinia'
import { computed, ref, watch } from 'vue'
import type { AbsenceType, AppData, DateStr, Entry, LocationType } from '../lib/types.ts'
import { defaultData } from '../lib/types.ts'
import { parseBackup } from '../lib/io.ts'
import { endAfter, entryDate, prefillEntries } from '../lib/calc.ts'
import { timePart, toDateTimeStr } from '../lib/dates.ts'

const KEY = 'timetrack:v1'
const LEGACY_KEY = 'stempel:v1'
/** Unreadable stored data is copied here before anything else can touch it */
const CORRUPT_KEY = 'timetrack:v1:unreadable'
const uid = () => crypto.randomUUID()

interface Loaded {
  data: AppData
  /** Set when stored data exists but could not be read; saving stays paused until resolved */
  error: string | null
}

function load(): Loaded {
  let raw: string | null
  try {
    // migrate data saved under the old app name
    raw = localStorage.getItem(KEY) ?? localStorage.getItem(LEGACY_KEY)
  } catch (err) {
    return { data: defaultData(), error: `Local storage is not available (${(err as Error).message}) – changes are NOT saved.` }
  }
  if (raw === null) return { data: defaultData(), error: null }
  try {
    return { data: parseBackup(JSON.parse(raw)), error: null }
  } catch (err) {
    console.error('Could not read stored data', err)
    let copy = ''
    try {
      if (localStorage.getItem(CORRUPT_KEY) !== raw) localStorage.setItem(CORRUPT_KEY, raw)
      copy = ` A raw copy is kept in local storage under "${CORRUPT_KEY}".`
    } catch { /* storage full – the original is still untouched under its key */ }
    return {
      data: defaultData(),
      error:
        `Your saved data could not be read (${(err as Error).message}). ` +
        `Saving is paused so nothing gets overwritten – changes you make now are NOT saved.${copy} ` +
        'Restore a backup in Settings, or delete all data to start fresh.',
    }
  }
}

export const useData = defineStore('data', () => {
  const loaded = load()
  const data = ref<AppData>(loaded.data)
  const loadError = ref<string | null>(loaded.error)
  const saveError = ref<string | null>(null)
  /** Last JSON written or received; avoids redundant writes and ping-pong between tabs */
  let lastSerialized = loaded.error ? '' : JSON.stringify(loaded.data)

  watch(
    data,
    (v) => {
      if (loadError.value) return
      const json = JSON.stringify(v)
      if (json === lastSerialized) return
      try {
        localStorage.setItem(KEY, json)
        lastSerialized = json
        saveError.value = null
      } catch (err) {
        saveError.value = `Saving failed: ${(err as Error).message}`
      }
    },
    { deep: true },
  )

  // Keep several open tabs in sync: adopt data another tab has saved
  window.addEventListener('storage', (ev) => {
    if (ev.storageArea !== localStorage || ev.key !== KEY || ev.newValue === null) return
    try {
      const next = parseBackup(JSON.parse(ev.newValue))
      lastSerialized = JSON.stringify(next)
      data.value = next
      loadError.value = null
    } catch (err) {
      console.warn('Ignoring unreadable data saved by another tab', err)
    }
  })

  const running = computed(() => data.value.entries.find((e) => e.end === null) ?? null)
  const sortedEntries = computed(() => [...data.value.entries].sort((a, b) => a.start.localeCompare(b.start)))
  const findEntry = (id: string) => data.value.entries.find((x) => x.id === id)

  function clockIn() {
    if (running.value) return
    data.value.entries.push({ id: uid(), start: toDateTimeStr(new Date()), end: null, note: '' })
  }
  function clockOut() {
    if (!running.value) return
    running.value.end = toDateTimeStr(new Date())
  }
  function addEntry(e: Omit<Entry, 'id'>) {
    data.value.entries.push({ ...e, id: uid() })
  }
  /** Change the start clock time; the end keeps its clock time (next day if it is earlier than the start) */
  function setStartTime(id: string, time: string) {
    const e = findEntry(id)
    if (!e) return
    e.start = `${entryDate(e)}T${time}`
    if (e.end) e.end = endAfter(e.start, timePart(e.end))
  }
  /** Change the end clock time; an end earlier than the start means the next day */
  function setEndTime(id: string, time: string) {
    const e = findEntry(id)
    if (e?.end) e.end = endAfter(e.start, time)
  }
  function setNote(id: string, note: string) {
    const e = findEntry(id)
    if (e) e.note = note
  }
  function deleteEntry(id: string) {
    data.value.entries = data.value.entries.filter((e) => e.id !== id)
  }
  function setAbsence(date: DateStr, type: AbsenceType | null) {
    data.value.absences = data.value.absences.filter((a) => a.date !== date)
    if (type) data.value.absences.push({ id: uid(), date, type })
  }
  /** Set or clear (null) the work location of a day; a client location is kept when re-selecting Client */
  function setLocation(date: DateStr, type: LocationType | null) {
    const prev = data.value.locations.find((l) => l.date === date)
    data.value.locations = data.value.locations.filter((l) => l.date !== date)
    if (type) data.value.locations.push({ date, type, place: type === 'client' ? (prev?.place ?? '') : '' })
  }
  function setClientPlace(date: DateStr, place: string) {
    const loc = data.value.locations.find((l) => l.date === date)
    if (loc?.type === 'client') loc.place = place.trim()
  }
  function prefill(from: DateStr, to: DateStr, startTime: string, endTime: string): number {
    const added = prefillEntries(data.value, from, to, startTime, endTime, uid)
    data.value.entries.push(...added)
    return added.length
  }
  /** Replace everything (restore / reset); also resumes saving after unreadable data */
  function replaceAll(next: AppData) {
    loadError.value = null
    data.value = next
  }

  return {
    data, loadError, saveError, running, sortedEntries,
    clockIn, clockOut, addEntry, setStartTime, setEndTime, setNote, deleteEntry,
    setAbsence, setLocation, setClientPlace, prefill, replaceAll,
  }
})
