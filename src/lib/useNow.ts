import { onBeforeUnmount, ref } from 'vue'

/** Reactive "now", ticking every second (for the live timer) */
export function useNow() {
  const now = ref(new Date())
  const t = setInterval(() => (now.value = new Date()), 1000)
  onBeforeUnmount(() => clearInterval(t))
  return now
}
