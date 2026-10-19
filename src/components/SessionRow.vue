<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useData } from '../stores/data'
import { datePart, daysBetween, fmtDuration, timePart } from '../lib/dates'
import type { Entry } from '../lib/types'

const props = defineProps<{ entry: Entry; minutes: number; overlapping: boolean }>()
const store = useData()

/*
 * The inputs edit local drafts (v-model.lazy) and write to the store on `change`.
 * Unlike a bound :value, v-model never overwrites a field while it has focus, so a
 * re-render can't reset a half-typed time or note.
 */
const start = ref('')
const end = ref('')
const note = ref('')
function syncDrafts() {
  start.value = timePart(props.entry.start)
  end.value = props.entry.end ? timePart(props.entry.end) : ''
  note.value = props.entry.note
}
watch(() => [props.entry.start, props.entry.end, props.entry.note], syncDrafts, { immediate: true })

const value = (ev: Event) => (ev.target as HTMLInputElement).value
function commitStart(v: string) {
  if (v) store.setStartTime(props.entry.id, v)
}
function commitEnd(v: string) {
  if (v) store.setEndTime(props.entry.id, v)
}

const invalid = computed(() => props.entry.end !== null && props.entry.end <= props.entry.start)
/** Days the end lies after the start day (overnight sessions) */
const endDayOffset = computed(() =>
  props.entry.end ? daysBetween(datePart(props.entry.start), datePart(props.entry.end)) : 0,
)
const warning = computed(() =>
  invalid.value ? 'End must be after start' : props.overlapping ? 'Overlaps another session – overlapping time is counted once' : '',
)
</script>

<template>
  <div
    class="group flex flex-wrap items-center gap-2 py-2.5"
    :class="{ 'rounded-xl bg-ios-red/10 px-2': invalid, 'rounded-xl bg-ios-orange/10 px-2': !invalid && overlapping }"
  >
    <input
      v-model.lazy="start" type="time" class="input num w-[8.75rem]" aria-label="Start"
      @change="commitStart(value($event))" @blur="syncDrafts"
    />
    <span class="text-muted">→</span>
    <span v-if="entry.end" class="relative">
      <input
        v-model.lazy="end" type="time" class="input num w-[8.75rem]" aria-label="End"
        @change="commitEnd(value($event))" @blur="syncDrafts"
      />
      <span
        v-if="endDayOffset > 0"
        class="absolute -top-1.5 -right-1.5 rounded-full bg-accent px-1.5 text-[11px] font-semibold text-white"
        title="Ends on a later day"
      >+{{ endDayOffset }}</span>
    </span>
    <span v-else class="flex w-[8.75rem] items-center gap-1.5 px-3 text-[15px] font-medium text-ios-green">
      <span class="h-2 w-2 animate-pulse rounded-full bg-ios-green"></span>Running
    </span>
    <span class="num w-14 text-right text-[15px] font-semibold">{{ fmtDuration(minutes) }}</span>
    <input
      v-model.lazy="note" class="input min-w-40 flex-1 bg-transparent focus:bg-white dark:bg-transparent" placeholder="Add note"
      aria-label="Note" @change="store.setNote(entry.id, value($event))"
    />
    <button class="btn btn-danger btn-icon opacity-0 transition group-hover:opacity-100 focus-visible:opacity-100" title="Delete" @click="store.deleteEntry(entry.id)">✕</button>
    <p v-if="warning" class="w-full px-1 text-[13px]" :class="invalid ? 'text-ios-red' : 'text-ios-orange'">{{ warning }}</p>
  </div>
</template>
