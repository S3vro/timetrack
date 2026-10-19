<script setup lang="ts">
import { computed } from 'vue'
import { useData } from '../stores/data'
import { useNow } from '../lib/useNow'
import { balance, dayRows, homeOfficeDays, vacationDays } from '../lib/calc'
import { addDays, fmtDuration, mondayOf, toDateStr } from '../lib/dates'
import DayEditor from '../components/DayEditor.vue'
import ProgressRing from '../components/ProgressRing.vue'

const store = useData()
const now = useNow()
const today = computed(() => toDateStr(now.value))
const longDate = computed(() =>
  now.value.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' }),
)

const todayRow = computed(() => dayRows(store.data, today.value, today.value, now.value)[0])
const week = computed(() => {
  const rows = dayRows(store.data, mondayOf(today.value), addDays(mondayOf(today.value), 6), now.value)
  return { worked: rows.reduce((s, r) => s + r.worked, 0), target: rows.reduce((s, r) => s + r.target, 0) }
})
const yesterdayBalance = computed(() => balance(store.data, addDays(today.value, -1), now.value))
const totalBalance = computed(() => yesterdayBalance.value + todayRow.value.diff)

const year = computed(() => now.value.getFullYear())
const vac = computed(() => vacationDays(store.data, year.value))
const vacMin = computed(() => store.data.settings.vacationMinDays)
const vacPercent = computed(() => (vacMin.value > 0 ? Math.min(100, (vac.value / vacMin.value) * 100) : 100))
const homeDays = computed(() => homeOfficeDays(store.data, year.value, now.value))
const since = computed(() => store.running?.start.slice(11))

const cls = (m: number) => (m > 0 ? 'pos' : m < 0 ? 'neg' : 'text-muted')
</script>

<template>
  <div class="grid gap-6">
    <div>
      <p class="eyebrow uppercase tracking-wide">{{ longDate }}</p>
      <h1 class="title">
        {{ store.running ? 'You’re clocked in' : 'Good to see you' }}
        <span v-if="todayRow.holiday" class="ml-2 align-middle text-[15px] font-medium text-ios-orange">· {{ todayRow.holiday }}</span>
      </h1>
    </div>

    <section class="card flex flex-col items-center gap-8 sm:flex-row sm:justify-between sm:px-10">
      <ProgressRing :value="todayRow.worked" :max="todayRow.target">
        <p class="num text-[34px] font-semibold leading-none tracking-tight">{{ fmtDuration(todayRow.worked) }}</p>
        <p class="eyebrow mt-1">of {{ fmtDuration(todayRow.target) }}</p>
        <p class="num mt-0.5 text-[13px] font-medium" :class="cls(todayRow.diff)">{{ fmtDuration(todayRow.diff, true) }}</p>
      </ProgressRing>

      <div class="flex flex-col items-center gap-3">
        <button
          class="h-16 w-56 cursor-pointer rounded-full text-[17px] font-semibold text-white transition duration-200 active:scale-[0.97]"
          :class="store.running
            ? 'bg-ios-red shadow-[0_8px_24px_rgb(255_59_48/0.35)] hover:brightness-105'
            : 'bg-ios-green shadow-[0_8px_24px_rgb(52_199_89/0.35)] hover:brightness-105'"
          @click="store.running ? store.clockOut() : store.clockIn()"
        >{{ store.running ? 'Clock Out' : 'Clock In' }}</button>
        <p class="eyebrow h-5">{{ store.running ? `since ${since}` : 'Not working' }}</p>
      </div>
    </section>

    <section class="grid gap-6 sm:grid-cols-2 md:grid-cols-4">
      <div class="card">
        <p class="eyebrow">This Week</p>
        <p class="num mt-2 text-[28px] font-semibold tracking-tight">{{ fmtDuration(week.worked) }}<span class="text-[17px] font-normal text-muted"> / {{ fmtDuration(week.target) }}</span></p>
        <div class="mt-3 h-1.5 overflow-hidden rounded-full bg-black/[0.06] dark:bg-white/10">
          <div class="h-full rounded-full bg-accent transition-all" :style="{ width: Math.min(100, week.target ? (week.worked / week.target) * 100 : 0) + '%' }"></div>
        </div>
        <p class="num mt-2 text-[13px] font-medium" :class="cls(week.worked - week.target)">{{ fmtDuration(week.worked - week.target, true) }}</p>
      </div>
      <div class="card">
        <p class="eyebrow">Balance</p>
        <p class="num mt-2 text-[28px] font-semibold tracking-tight" :class="cls(totalBalance)">{{ fmtDuration(totalBalance, true) }}</p>
        <p class="eyebrow num mt-3">until yesterday {{ fmtDuration(yesterdayBalance, true) }}</p>
      </div>
      <div class="card">
        <p class="eyebrow">Vacation {{ year }}</p>
        <p class="num mt-2 text-[28px] font-semibold tracking-tight">{{ vac }}<span class="text-[17px] font-normal text-muted"> days</span></p>
        <div class="mt-3 h-1.5 overflow-hidden rounded-full bg-black/[0.06] dark:bg-white/10">
          <div class="h-full rounded-full bg-ios-teal transition-all" :style="{ width: vacPercent + '%' }"></div>
        </div>
        <p v-if="vac >= vacMin" class="mt-2 text-[13px] font-medium text-ios-green">✓ Legal minimum reached</p>
        <p v-else class="eyebrow mt-2">{{ vacMin - vac }} to legal minimum ({{ vacMin }})</p>
      </div>
      <div class="card">
        <p class="eyebrow">Home office {{ year }}</p>
        <p class="num mt-2 text-[28px] font-semibold tracking-tight">{{ homeDays }}<span class="text-[17px] font-normal text-muted"> days</span></p>
        <p class="eyebrow mt-3">Days marked Home with recorded work</p>
      </div>
    </section>

    <section class="card">
      <h2 class="mb-4 text-[20px] font-semibold tracking-tight">Sessions</h2>
      <DayEditor :date="today" :now="now" />
    </section>
  </div>
</template>
