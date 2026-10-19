<script setup lang="ts">
import { useData } from './stores/data'
const store = useData()
const logo = `${import.meta.env.BASE_URL}logo.png`
const links = [
  { to: '/', label: 'Today' },
  { to: '/week', label: 'Week' },
  { to: '/report', label: 'Report' },
  { to: '/settings', label: 'Settings' },
]
</script>

<template>
  <header class="sticky top-0 z-10 border-b border-black/5 bg-canvas/75 backdrop-blur-xl backdrop-saturate-150 dark:border-white/10 dark:bg-black/70">
    <div class="mx-auto flex max-w-4xl items-center justify-between px-6 py-3">
      <div class="flex items-center gap-2">
        <img :src="logo" alt="" class="h-8 w-8 rounded-lg shadow-sm" />
        <span class="text-[17px] font-semibold tracking-tight">timetrack</span>
        <span v-if="store.running" class="ml-2 flex items-center gap-1.5 text-[13px] text-ios-green">
          <span class="h-2 w-2 animate-pulse rounded-full bg-ios-green"></span>Working
        </span>
      </div>
      <nav class="seg">
        <RouterLink v-for="l in links" :key="l.to" :to="l.to" class="seg-item" exact-active-class="seg-active">{{ l.label }}</RouterLink>
      </nav>
    </div>
  </header>
  <main class="mx-auto max-w-4xl px-6 py-8">
    <p v-if="store.loadError" class="mb-4 rounded-2xl bg-ios-red/10 p-4 text-[15px] text-ios-red">{{ store.loadError }}</p>
    <p v-if="store.saveError" class="mb-4 rounded-2xl bg-ios-red/10 p-4 text-[15px] text-ios-red">{{ store.saveError }}</p>
    <RouterView v-slot="{ Component }">
      <Transition enter-active-class="transition duration-200" enter-from-class="opacity-0 translate-y-1" mode="out-in">
        <component :is="Component" />
      </Transition>
    </RouterView>
  </main>
</template>
