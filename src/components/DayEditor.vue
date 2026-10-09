<script setup lang="ts">
import { computed } from 'vue'
import { useData } from '../stores/data'
import { entryDate, entryMinutes } from '../lib/calc'
import { fmtDuration, minutesBetween, parseDateTime } from '../lib/dates'
import type { AbsenceType, DateStr } from '../lib/types'

const props = defineProps<{ date: DateStr; now: Date }>()
const store = useData()

const entries = computed(() => store.sortedEntries.filter((e) => entryDate(e) === props.date))
const absence = computed(() => store.data.absences.find((a) => a.date === props.date)?.type ?? '')

/** Break before entry i = gap to previous entry's end */
function breakBefore(i: number): number | null {
  if (i === 0) return null
  const prev = entries.value[i - 1]
  if (!prev.end) return null
  return minutesBetween(parseDateTime(prev.end), parseDateTime(entries.value[i].start))
}

const setTime = (id: string, field: 'start' | 'end', v: string) => {
  if (!v) return
  store.updateEntry(id, { [field]: `${props.date}T${v}` })
}
const invalid = (s: string, e: string | null) => e !== null && e <= s

function addSession() {
  const last = entries.value.at(-1)
  const start = last?.end?.slice(11) ?? '08:00'
  store.addEntry({ start: `${props.date}T${start}`, end: `${props.date}T${start}`, note: '' })
}
function onAbsence(v: string) {
  store.setAbsence(props.date, (v || null) as AbsenceType | null)
}
</script>

<template>
  <div>
    <p v-if="!entries.length" class="pb-2 text-[15px] text-muted">No sessions.</p>
    <div class="divide-y divide-black/[0.06] dark:divide-white/10">
      <template v-for="(e, i) in entries" :key="e.id">
        <div v-if="breakBefore(i) !== null" class="flex items-center gap-2 py-1.5 text-[13px] text-muted">
          <span class="h-px flex-1 border-t border-dashed border-black/10 dark:border-white/15"></span>
          ☕ Break {{ fmtDuration(breakBefore(i)!) }}
          <span class="h-px flex-1 border-t border-dashed border-black/10 dark:border-white/15"></span>
        </div>
        <div class="group flex flex-wrap items-center gap-2 py-2.5" :class="{ 'rounded-xl bg-ios-red/10 px-2': invalid(e.start, e.end) }">
          <input type="time" class="input num w-[8.75rem]" :value="e.start.slice(11)" @change="setTime(e.id, 'start', ($event.target as HTMLInputElement).value)" />
          <span class="text-muted">→</span>
          <input v-if="e.end" type="time" class="input num w-[8.75rem]" :value="e.end.slice(11)" @change="setTime(e.id, 'end', ($event.target as HTMLInputElement).value)" />
          <span v-else class="flex w-[8.75rem] items-center gap-1.5 px-3 text-[15px] font-medium text-ios-green">
            <span class="h-2 w-2 animate-pulse rounded-full bg-ios-green"></span>Running
          </span>
          <span class="num w-14 text-right text-[15px] font-semibold">{{ fmtDuration(entryMinutes(e, now)) }}</span>
          <input class="input min-w-0 flex-1 bg-transparent focus:bg-white dark:bg-transparent" placeholder="Add note" :value="e.note" @change="store.updateEntry(e.id, { note: ($event.target as HTMLInputElement).value })" />
          <button class="btn btn-danger btn-icon opacity-0 transition group-hover:opacity-100" title="Delete" @click="store.deleteEntry(e.id)">✕</button>
        </div>
      </template>
    </div>
    <div class="flex items-center gap-3 pt-3">
      <button class="btn btn-ghost" @click="addSession">＋ Session</button>
      <select class="input ml-auto" :value="absence" @change="onAbsence(($event.target as HTMLSelectElement).value)">
        <option value="">No absence</option>
        <option value="vacation">🏖 Vacation</option>
        <option value="sick">🤒 Sick</option>
      </select>
    </div>
  </div>
</template>
