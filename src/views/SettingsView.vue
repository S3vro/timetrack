<script setup lang="ts">
import { computed, ref } from 'vue'
import { useData } from '../stores/data'
import { download, parseBackup } from '../lib/io'
import { addDays, toDateStr, weekdayName } from '../lib/dates'
import { defaultData } from '../lib/types'

const store = useData()
const s = computed(() => store.data.settings)

/** Number field bound to a setting; an empty or invalid entry is ignored instead of saved as 0 */
function numberSetting(get: () => number, set: (v: number) => void, min = -Infinity) {
  return computed({
    get,
    set: (v: number | string) => {
      if (typeof v === 'number' && Number.isFinite(v) && v >= min) set(v)
    },
  })
}
const weeklyHours = numberSetting(() => s.value.weeklyTargetMin / 60, (v) => (s.value.weeklyTargetMin = Math.round(v * 60)), 0)
const initialHours = numberSetting(() => s.value.initialBalanceMin / 60, (v) => (s.value.initialBalanceMin = Math.round(v * 60)))
const vacationMin = numberSetting(() => s.value.vacationMinDays, (v) => (s.value.vacationMinDays = Math.round(v)), 0)
const startDate = computed({
  get: () => s.value.startDate,
  set: (v: string) => v && (s.value.startDate = v), // ignore a cleared date field
})
const workdaysLabel = computed(() => {
  const days = s.value.workdays.map((d) => weekdayName(addDays('2024-01-01', d - 1))) // 2024-01-01 was a Monday
  return `${days.join(', ')} · daily target = weekly ÷ ${days.length}`
})

// Pre-fill
const pf = ref({ from: s.value.startDate, to: toDateStr(new Date()), start: '08:00', end: '17:00' })
const msg = ref('')
function runPrefill() {
  if (pf.value.end <= pf.value.start) return (msg.value = 'End must be after start.')
  const n = store.prefill(pf.value.from, pf.value.to, pf.value.start, pf.value.end)
  msg.value = `${n} day(s) pre-filled. Days with existing entries, absences, weekends and holidays were skipped.`
}

// Backup
function exportJson() {
  download(`timetrack-backup-${toDateStr(new Date())}.json`, JSON.stringify(store.data, null, 2), 'application/json')
}
async function importJson(ev: Event) {
  const file = (ev.target as HTMLInputElement).files?.[0]
  ;(ev.target as HTMLInputElement).value = ''
  if (!file) return
  try {
    const next = parseBackup(JSON.parse(await file.text()))
    if (!confirm(`Replace ALL current data with this backup (${next.entries.length} entries, ${next.absences.length} absences)?`)) return
    store.replaceAll(next)
    msg.value = 'Backup restored.'
  } catch (err) {
    msg.value = `Import failed: ${(err as Error).message}`
  }
}
function resetAll() {
  if (confirm('Delete ALL data? Export a backup first!')) store.replaceAll(defaultData())
}
</script>

<template>
  <div class="grid gap-8">
    <div>
      <p class="eyebrow uppercase tracking-wide">Preferences</p>
      <h1 class="title">Settings</h1>
    </div>

    <p v-if="msg" class="rounded-2xl bg-accent/10 p-4 text-[15px] text-accent">{{ msg }}</p>

    <!-- grouped list, iOS style -->
    <section>
      <h2 class="eyebrow mb-2 px-4 uppercase tracking-wide">Working time</h2>
      <div class="card divide-y divide-black/[0.06] p-0 dark:divide-white/10">
        <label class="flex items-center justify-between px-5 py-3.5 text-[15px]">Weekly target (hours)
          <input type="number" step="0.5" class="input num w-28 text-right" v-model.number="weeklyHours" /></label>
        <label class="flex items-center justify-between px-5 py-3.5 text-[15px]">Tracking start date
          <input type="date" class="input" v-model="startDate" /></label>
        <label class="flex items-center justify-between px-5 py-3.5 text-[15px]">Initial balance carry-over (hours, ±)
          <input type="number" step="0.25" class="input num w-28 text-right" v-model.number="initialHours" /></label>
        <label class="flex items-center justify-between px-5 py-3.5 text-[15px]">Legal minimum vacation (days)
          <input type="number" class="input num w-28 text-right" v-model.number="vacationMin" /></label>
      </div>
      <p class="eyebrow mt-2 px-4">{{ workdaysLabel }} · public holidays: Hessen</p>
    </section>

    <section>
      <h2 class="eyebrow mb-2 px-4 uppercase tracking-wide">Pre-fill</h2>
      <div class="card">
        <div class="flex flex-wrap items-end gap-3">
          <label class="grid gap-1 text-[13px] text-muted">From<input type="date" class="input text-ink dark:text-white" v-model="pf.from" /></label>
          <label class="grid gap-1 text-[13px] text-muted">To<input type="date" class="input text-ink dark:text-white" v-model="pf.to" /></label>
          <label class="grid gap-1 text-[13px] text-muted">Start<input type="time" class="input text-ink dark:text-white" v-model="pf.start" /></label>
          <label class="grid gap-1 text-[13px] text-muted">End<input type="time" class="input text-ink dark:text-white" v-model="pf.end" /></label>
          <button class="btn btn-primary ml-auto" @click="runPrefill">Pre-fill</button>
        </div>
      </div>
      <p class="eyebrow mt-2 px-4">Adds one block per working day without entries or absences. Never overwrites.</p>
    </section>

    <section>
      <h2 class="eyebrow mb-2 px-4 uppercase tracking-wide">Data</h2>
      <div class="card divide-y divide-black/[0.06] p-0 dark:divide-white/10">
        <button class="flex w-full cursor-pointer items-center justify-between px-5 py-3.5 text-left text-[15px] text-accent hover:bg-black/[0.02]" @click="exportJson">
          Export backup (JSON)<span class="text-muted">›</span></button>
        <label class="flex w-full cursor-pointer items-center justify-between px-5 py-3.5 text-[15px] text-accent hover:bg-black/[0.02]">
          Restore from backup…<span class="text-muted">›</span>
          <input type="file" accept="application/json,.json" class="hidden" @change="importJson" /></label>
        <button class="flex w-full cursor-pointer items-center justify-between px-5 py-3.5 text-left text-[15px] text-ios-red hover:bg-ios-red/5" @click="resetAll">
          Delete all data</button>
      </div>
      <p class="eyebrow mt-2 px-4">Data lives only in this browser's local storage. Export regularly.</p>
    </section>
  </div>
</template>
