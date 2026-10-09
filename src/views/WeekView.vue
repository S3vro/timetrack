<script setup lang="ts">
import { computed, ref } from 'vue'
import { useData } from '../stores/data'
import { useNow } from '../lib/useNow'
import { dayRows } from '../lib/calc'
import { addDays, fmtDuration, mondayOf, parseDate, toDateStr } from '../lib/dates'
import DayEditor from '../components/DayEditor.vue'

const store = useData()
const now = useNow()
const monday = ref(mondayOf(toDateStr(new Date())))
const todayStr = computed(() => toDateStr(now.value))

const rows = computed(() => dayRows(store.data, monday.value, addDays(monday.value, 6), now.value))
const sum = computed(() => ({
  worked: rows.value.reduce((s, r) => s + r.worked, 0),
  target: rows.value.reduce((s, r) => s + r.target, 0),
}))
const rangeLabel = computed(() => {
  const f = (s: string) => parseDate(s).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
  return `${f(monday.value)} – ${f(addDays(monday.value, 6))}`
})
const dayName = (s: string) => parseDate(s).toLocaleDateString('en-GB', { weekday: 'long' })
const dayNum = (s: string) => parseDate(s).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
const cls = (m: number) => (m > 0 ? 'pos' : m < 0 ? 'neg' : 'text-muted')
const jump = (v: string) => v && (monday.value = mondayOf(v))
</script>

<template>
  <div class="grid gap-6">
    <div class="flex flex-wrap items-end justify-between gap-4">
      <div>
        <p class="eyebrow uppercase tracking-wide">Week</p>
        <h1 class="title">{{ rangeLabel }}</h1>
      </div>
      <div class="flex items-center gap-2">
        <button class="btn btn-ghost btn-icon" @click="monday = addDays(monday, -7)">‹</button>
        <button class="btn btn-ghost" @click="monday = mondayOf(toDateStr(new Date()))">Today</button>
        <button class="btn btn-ghost btn-icon" @click="monday = addDays(monday, 7)">›</button>
        <input type="date" class="input" :value="monday" @change="jump(($event.target as HTMLInputElement).value)" />
      </div>
    </div>

    <div class="card flex items-center justify-between py-4">
      <span class="eyebrow">Total</span>
      <span class="num text-[17px] font-semibold">
        {{ fmtDuration(sum.worked) }} <span class="font-normal text-muted">/ {{ fmtDuration(sum.target) }}</span>
        <span class="ml-2 text-[15px]" :class="cls(sum.worked - sum.target)">{{ fmtDuration(sum.worked - sum.target, true) }}</span>
      </span>
    </div>

    <section
      v-for="r in rows" :key="r.date" class="card"
      :class="[{ 'opacity-60': !r.target && !r.worked && !r.absence }, r.date === todayStr ? 'ring-2 ring-accent/40' : '']"
    >
      <div class="mb-3 flex items-baseline justify-between">
        <div class="flex items-baseline gap-2">
          <h3 class="text-[20px] font-semibold tracking-tight">{{ dayName(r.date) }}</h3>
          <span class="text-[15px] text-muted">{{ dayNum(r.date) }}</span>
          <span v-if="r.holiday" class="rounded-full bg-ios-orange/15 px-2.5 py-0.5 text-[12px] font-medium text-ios-orange">{{ r.holiday }}</span>
          <span v-if="r.absence" class="rounded-full bg-ios-teal/15 px-2.5 py-0.5 text-[12px] font-medium capitalize text-ios-teal">{{ r.absence.type }}</span>
        </div>
        <span class="num text-[15px] font-medium">
          {{ fmtDuration(r.worked) }} <span class="font-normal text-muted">/ {{ fmtDuration(r.target) }}</span>
          <span class="ml-1.5" :class="cls(r.diff)">{{ fmtDuration(r.diff, true) }}</span>
        </span>
      </div>
      <DayEditor :date="r.date" :now="now" />
    </section>
  </div>
</template>
