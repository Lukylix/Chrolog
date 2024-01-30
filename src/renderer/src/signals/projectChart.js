import { computed, effect, signal } from '@preact/signals-react'
import { currentPeriod } from './tracking'
import { currentProjectTrackingLogs, trackedApps } from './currentProject'

export const period = signal('week')

effect(() => {
  const currentDate = new Date()
  const currentDay = currentDate.getDay()
  if (period.value === 'week') {
    const startDay = new Date(
      currentDate.getFullYear(),
      currentDate.getMonth(),
      currentDate.getDate() - currentDay
    )
    const endDay = new Date(
      currentDate.getFullYear(),
      currentDate.getMonth(),
      currentDate.getDate() + (6 - currentDay),
      23,
      59,
      59,
      999
    )
    currentPeriod.value = { start: startDay.getTime(), end: endDay.getTime() }
  } else if (period.value === 'month') {
    const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1)
    const lastDayOfMonth = new Date(
      currentDate.getFullYear(),
      currentDate.getMonth() + 1,
      0,
      23,
      59,
      59,
      999
    )
    currentPeriod.value = { start: firstDayOfMonth.getTime(), end: lastDayOfMonth.getTime() }
  } else if (period.value === 'year') {
    const firstDayOfYear = new Date(currentDate.getFullYear(), 0, 1)
    const lastDayOfYear = new Date(currentDate.getFullYear(), 12, -1)
    currentPeriod.value = { start: firstDayOfYear.getTime(), end: lastDayOfYear.getTime() }
  }
})

const getChartDataForEachDay = (TrackingLogs) => {
  const { start, end } = currentPeriod.value
  const startDate = new Date(start)
  const endDate = new Date(end)
  const currentYear = startDate.getFullYear()
  const startDayToEndOfMonth =
    new Date(currentYear, startDate.getMonth() + 1, 0).getDate() - startDate.getDate()
  const daysBetwenStartAndEnd =
    startDate.getMonth() !== endDate.getMonth()
      ? startDayToEndOfMonth + endDate.getDate()
      : endDate.getDate() - startDate.getDate()

  const trackingLogsFiltered = TrackingLogs.filter(
    (log) => log.startDate >= startDate.getTime() && log.endDate <= endDate.getTime()
  )

  let trackedAppsLogsMap = {}
  for (const log of trackingLogsFiltered) {
    const logName = log.name.toLowerCase()
    if (!trackedAppsLogsMap[logName]) trackedAppsLogsMap[logName] = []
    const logStartDate = new Date(log.startDate)
    trackedAppsLogsMap[logName].push({
      ...log,
      year: logStartDate.getFullYear(),
      month: logStartDate.getMonth(),
      day: logStartDate.getDate()
    })
  }
  let chartDataPerDay = []
  for (let i = 0; i <= daysBetwenStartAndEnd; i++) {
    const currentDate = new Date(
      startDate.getFullYear(),
      startDate.getMonth(),
      startDate.getDate() + i
    )
    const year = currentDate.getFullYear()
    const month = currentDate.getMonth()
    const day = currentDate.getDate()
    const name = `${day}/${month + 1}`
    chartDataPerDay.push({
      name: name,
      ...trackedApps.value.reduce((acc, app) => {
        acc[app] = (trackedAppsLogsMap[app] || []).reduce(
          (acc2, curr) =>
            curr.startDate &&
            curr.endDate &&
            curr.day === day &&
            curr.month === month &&
            curr.year === year
              ? acc2 + curr.endDate - curr.startDate
              : acc2,
          0
        )
        return acc
      }, {})
    })
  }
  return chartDataPerDay
}

const getChartDataForEachMonth = (TrackingLogs) => {
  let chartDataPerMonth = []
  const { start, end } = currentPeriod.value
  const startDate = new Date(start)
  const endDate = new Date(end)
  const startYear = startDate.getFullYear()
  const endYear = endDate.getFullYear()
  const startToEndMonth = (endYear - startYear) * 12 + (endDate.getMonth() - startDate.getMonth())

  const trackingLogsFiltered = TrackingLogs.filter(
    (log) => log.startDate >= startDate.getTime() && log.endDate <= endDate.getTime()
  )

  let trackedAppsLogsMap = {}
  for (const log of trackingLogsFiltered) {
    const logName = log.name.toLowerCase()
    if (!trackedAppsLogsMap[logName]?.length) trackedAppsLogsMap[logName] = []

    const logStartDate = log.startDate ? new Date(log.startDate) : false
    trackedAppsLogsMap[logName].push({
      ...log,
      month: logStartDate.getMonth(),
      year: logStartDate.getFullYear()
    })
  }
  for (let i = 0; i <= startToEndMonth; i++) {
    const currentMonth = (startDate.getMonth() + i) % 12
    const currentYear = i > 12 ? endDate.getFullYear() : startDate.getFullYear()
    const name = `${currentMonth + 1}/${String(currentYear).substring(2, 4)}`
    chartDataPerMonth.push({
      name: name,
      ...trackedApps.value.reduce((acc, app) => {
        acc[app] = (trackedAppsLogsMap[app] || []).reduce((acc, curr) => {
          if (
            curr.startDate &&
            curr.endDate &&
            curr.month === currentMonth &&
            curr.year === currentYear
          ) {
            return acc + curr.endDate - curr.startDate
          }
          return acc
        }, 0)
        return acc
      }, {})
    })
  }
  return chartDataPerMonth
}

export const dataChart = computed(() => {
  if (period.value === 'week' || period.value === 'month')
    return getChartDataForEachDay(currentProjectTrackingLogs.value)
  else if (period.value === 'year')
    return getChartDataForEachMonth(currentProjectTrackingLogs.value)
  return []
})

export const currentChartTrackedApps = computed(() =>
  Object.keys(
    dataChart.value.reduce((acc, curr) => {
      for (const app in curr) {
        if (app !== 'name' && curr[app] > 0) acc[app] = true
      }
      return acc
    }, {})
  )
)
