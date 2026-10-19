<script setup lang="ts">
import { computed, ref } from 'vue'
import { useData } from '../stores/data'
import { analyzeEntries, entryDate, entryMinutes } from '../lib/calc'
import { datePart, fmtDuration, minutesBetween, parseDateTime, timePart } from '../lib/dates'
import type { AbsenceType, DateStr, Entry } from '../lib/types'
import SessionRow from './SessionRow.vue'
import DayLocation from './DayLocation.vue'

const props = defineProps<{ date: DateStr; now: Date }>()
const store = useData()

/*
 * Sessions are shown in chronological order, but the order is frozen while focus is
 * inside this editor: re-sorting would move a row while you are typing in it (and
 * moving a focused input in the DOM makes it lose focus). It re-sorts on focus leave.
 */
const root = ref<HTMLElement>()
const frozenOrder = ref<string[] | null>(null)
const daySessions = computed(() => store.sortedEntries.filter((e) => entryDate(e) === props.date))
const entries = computed(() => {
  const order = frozenOrder.value
  if (!order) return daySessions.value
  const pos = (e: Entry) => {
    const i = order.indexOf(e.id)
    return i === -1 ? order.length : i // sessions added meanwhile go last
  }
  return [...daySessions.value].sort((a, b) => pos(a) - pos(b))
})
function onFocusIn() {
  frozenOrder.value ??= daySessions.value.map((e) => e.id)
}
function onFocusOut(ev: FocusEvent) {
  if (!root.value?.contains(ev.relatedTarget as Node | null)) frozenOrder.value = null
}

const overlapping = computed(() => analyzeEntries(store.data.entries, props.now).overlapping)

/** Break before entry i = positive gap to the previous entry's end */
function breakBefore(i: number): number | null {
  const prev = entries.value[i - 1]
  if (!prev?.end) return null
  const gap = minutesBetween(parseDateTime(prev.end), parseDateTime(entries.value[i].start))
  return gap > 0 ? gap : null
}

const absence = computed(() => store.data.absences.find((a) => a.date === props.date)?.type ?? '')

function addSession() {
  const last = entries.value.at(-1)
  // continue at the last end – unless that is on the next day (overnight session)
  const start = last?.end && datePart(last.end) === props.date ? timePart(last.end) : '08:00'
  store.addEntry({ start: `${props.date}T${start}`, end: `${props.date}T${start}`, note: '' })
}
function onAbsence(v: string) {
  store.setAbsence(props.date, (v || null) as AbsenceType | null)
}
</script>

<template>
  <div ref="root" @focusin="onFocusIn" @focusout="onFocusOut">
    <p v-if="!entries.length" class="pb-2 text-[15px] text-muted">No sessions.</p>
    <div class="divide-y divide-black/[0.06] dark:divide-white/10">
      <template v-for="(e, i) in entries" :key="e.id">
        <div v-if="breakBefore(i) !== null" class="flex items-center gap-2 py-1.5 text-[13px] text-muted">
          <span class="h-px flex-1 border-t border-dashed border-black/10 dark:border-white/15"></span>
          ☕ Break {{ fmtDuration(breakBefore(i)!) }}
          <span class="h-px flex-1 border-t border-dashed border-black/10 dark:border-white/15"></span>
        </div>
        <SessionRow :entry="e" :minutes="entryMinutes(e, now)" :overlapping="overlapping.has(e.id)" />
      </template>
    </div>
    <div class="flex flex-wrap items-center gap-3 pt-3">
      <button class="btn btn-ghost" @click="addSession">＋ Session</button>
      <DayLocation :date="date" />
      <select class="input ml-auto" :value="absence" aria-label="Absence" @change="onAbsence(($event.target as HTMLSelectElement).value)">
        <option value="">No absence</option>
        <option value="vacation">🏖 Vacation</option>
        <option value="sick">🤒 Sick</option>
      </select>
    </div>
  </div>
</template>
