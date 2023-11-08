import { signal, computed } from '@preact/signals-react'

import { trackingData } from './trackingData'
import { minLogSecs } from './settings'
import { currentPeriod } from './tracking'

export const currentProjectName = signal('')
export const currentProject = computed(() => trackingData.value?.[currentProjectName.value] || {})
export const currentProjectTrackingLogs = computed(
  () =>
    [...(currentProject?.value?.trackingLogs || [])]
      .reverse()
      .sort((a, b) => b.startDate - a.startDate) || []
)
export const filters = signal([
  { operator: '>', value: 30 > minLogSecs.value ? 30 : minLogSecs.value }
])
export const trackingLogsPerApp = computed(() =>
  currentProjectTrackingLogs.value.reduce(
    (acc, log) => ({
      ...acc,
      [log.name]: (acc[log.name] || 0) + (log.endDate ? log.endDate - log.startDate : 0)
    }),
    {}
  )
)

export const trackedApps = computed(() => [
  ...new Set(
    currentProjectTrackingLogs.value.map((log) => log.name?.toLowerCase()).filter((log) => log)
  )
])

export const trackingLogsSortedFiltered = computed(() =>
  currentProjectTrackingLogs.value
    .filter(
      (log) =>
        log?.startDate >= currentPeriod.value?.start && log?.endDate <= currentPeriod.value?.end
    )
    .filter((log) => {
      for (const filter of filters.value) {
        switch (filter.operator) {
          case '>':
            if (log.endDate - log.startDate < filter.value * 1000) return false
            break
          case '>=':
            if (log.endDate - log.startDate <= filter.value * 1000) return false
            break
          case '<':
            if (log.endDate - log.startDate > filter.value * 1000) return false
            break
          case '<=':
            if (log.endDate - log.startDate >= filter.value * 1000) return false
            break
        }
      }
      return log.startDate && log.endDate
    })
)

export const currentPage = signal(1)

export const trackingLogsPaginated = computed(() =>
  [...trackingLogsSortedFiltered.value].splice((currentPage - 1) * 10, 10)
)

const allApps = computed(() => [
  ...new Set(
    [
      ...(currentProject.value?.trackingLogs || []).map((log) => log?.name?.toLowerCase()),
      ...(currentProject.value?.apps || []).map((app) => app?.name?.toLowerCase()),
      ...(trackedApps.value || []).map((app) => app?.name?.toLowerCase())
    ].filter((app) => app)
  )
])

let pastelColors = [
  '#8BB9DD',
  '#EFD469',
  '#7EBF80',
  '#967BB6',
  '#FFB085',
  '#9BE1B2',
  '#C4C4ED',
  '#FF6347',
  '#00C5CD',
  '#FF9AA2'
]

export const appsColorMap = computed(() => {
  let appWithColorMap = {}
  for (const appKey in allApps.value) {
    const app = allApps.value[appKey]
    appWithColorMap[app.toLowerCase()] = pastelColors[appKey % pastelColors.length]
  }
  return appWithColorMap
})

const getSpaceAndCentPercent = (projectApps) => {
  let centPercent = projectApps.reduce((acc, log) => acc + log.elapsedTime, 0)
  const min = 0.005
  const max = 0.01
  const inputMax = 100
  const inputMin = 0
  let scaled =
    ((max - min) / (inputMax < projectApps.length ? projectApps.length : inputMax - inputMin)) *
      (projectApps.length - inputMin) +
    min
  const spacePercent = (projectApps.length - 1) * centPercent * scaled
  centPercent = centPercent + spacePercent
  const space = (spacePercent / (projectApps.length - 1) / centPercent) * 100
  return { space, centPercent }
}

const projectLogsFusion = (trackingLogs) => {
  let projectAppsFusion = []
  let fusionIndex = 0
  for (let i = 1; i < trackingLogs.length; i++) {
    const log = trackingLogs[i]
    const previousLog = trackingLogs[i - 1]
    if (log.name !== previousLog.name) {
      let fusion = [...trackingLogs].splice(fusionIndex, i - fusionIndex)
      projectAppsFusion.push(
        fusion.reduce(
          (acc, log) => ({
            ...log,
            ...acc,
            elapsedTime: acc.elapsedTime + log.endDate - log.startDate
          }),
          { elapsedTime: 0 }
        )
      )
      fusionIndex = i
    }
  }
  return projectAppsFusion
}

export const projectBars = computed(() => {
  let projectBars = []
  let isFirst = true
  const projectAppsFusionedTemp = projectLogsFusion(currentProject.value?.trackingLogs || [])
  const { centPercent: centPercentTemp } = getSpaceAndCentPercent(projectAppsFusionedTemp)
  const newProjectApps = projectAppsFusionedTemp.filter(
    (log) => (log.elapsedTime / centPercentTemp) * 100 > 0.1
  )
  const newProjectAppsFusioned = projectLogsFusion(newProjectApps)
  const { centPercent, space } = getSpaceAndCentPercent(newProjectAppsFusioned)

  for (const log of newProjectAppsFusioned) {
    if (!isFirst) {
      projectBars.push({
        load: space.toFixed(2),
        isSpace: true,
        name: log.name,
        color: 'transparent'
      })
    }
    projectBars.push({
      load: ((log.elapsedTime / centPercent) * 100).toFixed(2),
      isSpace: false,
      name: log.name,
      color: appsColorMap.value[log.name.toLowerCase()]
    })
    isFirst = false
  }
  return projectBars
})

export const operator = signal('')
export const filter = signal('')
