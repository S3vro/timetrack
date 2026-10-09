<script setup lang="ts">
import { computed, ref } from 'vue'
import { useData } from '../stores/data'
import { dayRows } from '../lib/calc'
import { addDays, fmtDuration, parseDate, toDateStr } from '../lib/dates'
import { download, toCsv } from '../lib/io'

const store = useData()
const month = ref(toDateStr(new Date()).slice(0, 7)) // 'YYYY-MM'

const range = computed(() => {
  const [y, m] = month.value.split('-').map(Number)
  return { from: `${month.value}-01`, to: addDays(toDateStr(new Date(y, m, 1)), -1) }
})
const monthLabel = computed(() =>
  parseDate(range.value.from).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' }),
)
const rows = computed(() =>
  dayRows(store.data, range.value.from, range.value.to, new Date()).filter((r) => r.worked || r.target || r.absence || r.holiday),
)
const total = computed(() => ({
  worked: rows.value.reduce((s, r) => s + r.worked, 0),
  target: rows.value.reduce((s, r) => s + r.target, 0),
}))
const fmtDay = (s: string) => parseDate(s).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })
const cls = (m: number) => (m > 0 ? 'pos' : m < 0 ? 'neg' : 'text-muted')

function exportMonth() {
  download(`timetrack-${month.value}.csv`, toCsv(store.data, range.value.from, range.value.to, new Date()), 'text/csv;charset=utf-8')
}
function exportAll() {
  download(`timetrack-all.csv`, toCsv(store.data, '0000-01-01', '9999-12-31', new Date()), 'text/csv;charset=utf-8')
}
</script>

<template>
  <div class="grid gap-6">
    <div class="flex flex-wrap items-end justify-between gap-4">
      <div>
        <p class="eyebrow uppercase tracking-wide">Report</p>
        <h1 class="title">{{ monthLabel }}</h1>
      </div>
      <div class="flex items-center gap-2">
        <input type="month" class="input" v-model="month" />
        <button class="btn btn-ghost" @click="exportAll">Export all</button>
        <button class="btn btn-primary" @click="exportMonth">Export CSV</button>
      </div>
    </div>

    <section class="grid gap-6 sm:grid-cols-3">
      <div class="card"><p class="eyebrow">Worked</p><p class="num mt-2 text-[28px] font-semibold tracking-tight">{{ fmtDuration(total.worked) }}</p></div>
      <div class="card"><p class="eyebrow">Target</p><p class="num mt-2 text-[28px] font-semibold tracking-tight">{{ fmtDuration(total.target) }}</p></div>
      <div class="card"><p class="eyebrow">Difference</p><p class="num mt-2 text-[28px] font-semibold tracking-tight" :class="cls(total.worked - total.target)">{{ fmtDuration(total.worked - total.target, true) }}</p></div>
    </section>

    <section class="card p-2">
      <table class="num w-full text-[15px]">
        <thead class="text-left text-[13px] text-muted">
          <tr><th class="px-4 py-3 font-medium">Day</th><th class="font-medium"></th><th class="text-right font-medium">Worked</th><th class="text-right font-medium">Target</th><th class="px-4 text-right font-medium">Diff</th></tr>
        </thead>
        <tbody class="divide-y divide-black/[0.06] dark:divide-white/10">
          <tr v-for="r in rows" :key="r.date">
            <td class="px-4 py-2.5">{{ fmtDay(r.date) }}</td>
            <td>
              <span v-if="r.holiday" class="rounded-full bg-ios-orange/15 px-2.5 py-0.5 text-[12px] font-medium text-ios-orange">{{ r.holiday }}</span>
              <span v-else-if="r.absence" class="rounded-full bg-ios-teal/15 px-2.5 py-0.5 text-[12px] font-medium capitalize text-ios-teal">{{ r.absence.type }}</span>
            </td>
            <td class="text-right">{{ fmtDuration(r.worked) }}</td>
            <td class="text-right text-muted">{{ fmtDuration(r.target) }}</td>
            <td class="px-4 text-right font-medium" :class="cls(r.diff)">{{ fmtDuration(r.diff, true) }}</td>
          </tr>
          <tr v-if="!rows.length"><td colspan="5" class="px-4 py-6 text-center text-muted">No data for this month.</td></tr>
        </tbody>
      </table>
    </section>
  </div>
</template>
