<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useData } from '../stores/data'
import { clientPlaces } from '../lib/calc'
import { LOCATION_LABELS, LOCATION_TYPES, type DateStr, type LocationType } from '../lib/types'

const props = defineProps<{ date: DateStr }>()
const store = useData()

const location = computed(() => store.data.locations.find((l) => l.date === props.date))
const suggestions = computed(() => clientPlaces(store.data.locations))
const listId = computed(() => `client-places-${props.date}`)

/** Clicking the active option clears the location */
const toggle = (type: LocationType) => store.setLocation(props.date, location.value?.type === type ? null : type)

// Draft for the client location (see SessionRow: v-model.lazy keeps a focused field untouched)
const place = ref('')
const syncPlace = () => (place.value = location.value?.place ?? '')
watch(() => location.value?.place, syncPlace, { immediate: true })
</script>

<template>
  <div class="flex flex-wrap items-center gap-2">
    <div class="seg" role="group" aria-label="Work location">
      <button
        v-for="t in LOCATION_TYPES" :key="t" type="button" class="seg-item cursor-pointer"
        :class="{ 'seg-active': location?.type === t }" :aria-pressed="location?.type === t"
        @click="toggle(t)"
      >{{ LOCATION_LABELS[t] }}</button>
    </div>
    <template v-if="location?.type === 'client'">
      <input
        v-model.lazy="place" class="input w-48" placeholder="Client location" aria-label="Client location"
        :list="listId" @change="store.setClientPlace(date, ($event.target as HTMLInputElement).value)" @blur="syncPlace"
      />
      <datalist :id="listId">
        <option v-for="p in suggestions" :key="p" :value="p" />
      </datalist>
    </template>
  </div>
</template>
