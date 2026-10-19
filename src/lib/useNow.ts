import { shallowRef, type Ref } from 'vue'
import { toDateTimeStr } from './dates.ts'

const now = shallowRef(new Date())
let started = false

/**
 * Shared reactive "now" for live timers. It changes only when the clock minute changes
 * (all durations are shown in whole minutes), so views re-render once a minute
 * instead of every second. One timer for the whole app.
 */
export function useNow() {
  if (!started) {
    started = true
    setInterval(() => {
      const d = new Date()
      if (toDateTimeStr(d) !== toDateTimeStr(now.value)) now.value = d
    }, 1000)
  }
  return now as Readonly<Ref<Date>>
}
