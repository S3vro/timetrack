import { defineStore } from 'pinia'
import { computed, ref, watch } from 'vue'
import type { AbsenceType, AppData, DateStr, Entry } from '../lib/types.ts'
import { defaultData } from '../lib/types.ts'
import { parseBackup } from '../lib/io.ts'
import { prefillEntries } from '../lib/calc.ts'
import { toDateTimeStr } from '../lib/dates.ts'

const KEY = 'timetrack:v1'
const LEGACY_KEY = 'stempel:v1'
const uid = () => crypto.randomUUID()

function load(): AppData {
  try {
    // migrate data saved under the old app name
    const raw = localStorage.getItem(KEY) ?? localStorage.getItem(LEGACY_KEY)
    return raw ? parseBackup(JSON.parse(raw)) : defaultData()
  } catch (err) {
    console.error('Could not load stored data, starting empty', err)
    return defaultData()
  }
}

export const useData = defineStore('data', () => {
  const data = ref<AppData>(load())
  const saveError = ref<string | null>(null)

  watch(
    data,
    (v) => {
      try {
        localStorage.setItem(KEY, JSON.stringify(v))
        saveError.value = null
      } catch (err) {
        saveError.value = `Saving failed: ${(err as Error).message}`
      }
    },
    { deep: true },
  )

  const running = computed(() => data.value.entries.find((e) => e.end === null) ?? null)
  const sortedEntries = computed(() => [...data.value.entries].sort((a, b) => a.start.localeCompare(b.start)))

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
  function updateEntry(id: string, patch: Partial<Omit<Entry, 'id'>>) {
    const e = data.value.entries.find((x) => x.id === id)
    if (e) Object.assign(e, patch)
  }
  function deleteEntry(id: string) {
    data.value.entries = data.value.entries.filter((e) => e.id !== id)
  }
  function setAbsence(date: DateStr, type: AbsenceType | null) {
    data.value.absences = data.value.absences.filter((a) => a.date !== date)
    if (type) data.value.absences.push({ id: uid(), date, type })
  }
  function prefill(from: DateStr, to: DateStr, startTime: string, endTime: string): number {
    const added = prefillEntries(data.value, from, to, startTime, endTime, uid)
    data.value.entries.push(...added)
    return added.length
  }
  function replaceAll(next: AppData) {
    data.value = next
  }

  return {
    data, saveError, running, sortedEntries,
    clockIn, clockOut, addEntry, updateEntry, deleteEntry, setAbsence, prefill, replaceAll,
  }
})
