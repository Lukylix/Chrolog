import { signal, computed } from '@preact/signals-react'

const currentDate = new Date()
const currentDay = currentDate.getDay() // Current day of the week (0-6)
const startDay = new Date(new Date().setDate(currentDate.getDate() - currentDay)) // Start day (Monday)
const endDay = new Date(new Date().setDate(currentDate.getDate() - currentDay + 6)) // End day (Sunday)

export const isTracking = signal(false)
export const lastInputTime = signal(Date.now())
export const trackedApps = signal([])

export const isGettingProcessList = signal(false)
export const isLoadingData = signal(false)
export const processCount = signal(0)
export const currentProcess = signal(0)
export const completedProcess = signal(0)
export const isTrackingRunning = signal(false)
export const shouldRestartTracking = signal(false)
export const isInitialLoad = signal(true)
export const currentTab = signal('')
export const currentPeriod = signal({
  start: startDay.getTime(),
  end: endDay.getTime()
})

export const currentPercent = computed(() =>
  (((currentProcess.value + completedProcess.value) / processCount) * 100).toFixed(2)
)

export function addTrackedApp(app) {
  const { name } = app
  const index = trackedApps.value.findIndex((app) => app.name === name)
  if (index === -1) {
    trackedApps.value.push(app)
  }
}
