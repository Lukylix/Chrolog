import { signal } from '@preact/signals-react'

const { ipcRenderer } = window.require('electron')

export const trackingData = signal({})

export function createProject(project) {
  const { projectName, projectData } = project
  ipcRenderer.send('create-project', { projectName, ...projectData })
  trackingData.value = { ...trackingData.value, [projectName]: projectData }
}

export function toggleProject(project) {
  const { projectName } = project
  ipcRenderer.send('update-project-properties', {
    projectName,
    toggled: !!!trackingData.value?.[projectName]?.toggled || false
  })

  const trackingLogs = trackingData.value[projectName]?.trackingLogs.map((log) => {
    if (!log?.endDate)
      return {
        ...log,
        elapsedTime: Date.now() - log.startDate,
        endDate: Date.now()
      }
    return log
  })

  trackingData.value = {
    ...trackingData.value,
    [projectName]: {
      ...trackingData.value[projectName],
      toggled: !!!trackingData.value?.[projectName]?.toggled || false,
      trackingLogs
    }
  }
}

export function removeTrackingLog(log) {
  const { name, projectName, endDate, startDate } = log
  const trackingLogs =
    trackingData.value?.[projectName]?.trackingLogs.filter(
      (log) => log.name !== name || log.startDate !== startDate || log.endDate !== endDate
    ) || []
  trackingData.value = {
    ...trackingData.value,
    [projectName]: {
      ...trackingData.value[projectName],
      trackingLogs: trackingLogs
    }
  }
}

export function removeTrackedApp(payload) {
  const { projectName, appName } = payload
  const apps = trackingData.value?.[projectName]?.apps.filter((app) => app.name !== appName) || []
  trackingData.value = {
    ...trackingData.value,
    [projectName]: {
      ...trackingData.value[projectName],
      apps: apps
    }
  }
}

export function addTrackedApp(payload) {
  const { projectName, app } = payload
  const apps = trackingData.value?.[projectName]?.apps || []
  trackingData.value = {
    ...trackingData.value,
    [projectName]: {
      ...trackingData.value[projectName],
      apps: [...apps, app]
    }
  }
}

export function stopTrackingAll({ settings }) {
  const { minLogSecs, isInactivity, minLastInputSecs } = settings
  trackingData.value = Object.keys(trackingData.value).reduce((acc, projectName) => {
    let trackingLogs = []
    let logAsEnded = false
    for (let log of trackingData.value[projectName]?.trackingLogs || []) {
      const endDate = isInactivity ? Date.now() - minLastInputSecs * 1000 : Date.now()
      const elapsedTime = endDate - log.startDate

      if (log.endDate) {
        trackingLogs.push(log)
        continue
      }

      if (elapsedTime > minLogSecs * 1000) {
        const trackingLog = {
          ...log,
          elapsedTime: elapsedTime,
          endDate: endDate
        }
        trackingLogs.push(trackingLog)
        ipcRenderer.send('create-tracking-log', {
          projectName,
          trackingLog
        })
        logAsEnded = true
      }
    }
    const elapsedTime = trackingLogs.reduce(
      (acc, curr) =>
        curr.endDate ? acc + curr.endDate - curr.startDate : acc + Date.now() - curr.startDate,
      0
    )
    if (logAsEnded) {
      ipcRenderer.send('update-project-properties', {
        projectName,
        elapsedTime
      })
    }
    return {
      ...acc,
      [projectName]: {
        ...trackingData.value[projectName],
        trackingLogs,
        elapsedTime
      }
    }
  }, {})
}

export function updateTrackingData({ trackedAppName, settings }) {
  const { minLogSecs } = settings
  const matchingProjectsKeys = Object.keys(trackingData.value).filter(
    (projectKey) =>
      trackingData.value[projectKey].apps.find(
        (app) => app.name.trim() === trackedAppName.trim()
      ) && !!trackingData.value[projectKey].toggled
  )
  if (matchingProjectsKeys.length === 0) {
    return stopTrackingAll({ settings })
  }
  let trackingDataCopy = { ...trackingData.value }
  for (const projectName of matchingProjectsKeys) {
    const project = trackingData.value[projectName]
    if (!project?.trackingLogs) project.trackingLogs = []

    const currentTrackingLogIndex = project.trackingLogs.findIndex(
      (log) => log?.name === trackedAppName && log?.startDate && !log.endDate
    )
    if (currentTrackingLogIndex >= 0) {
      project.trackingLogs[currentTrackingLogIndex] = {
        ...project?.trackingLogs[currentTrackingLogIndex],
        elapsedTime: Date.now() - project?.trackingLogs[currentTrackingLogIndex]?.startDate
      }
    }
    let trackingLogs = []
    let logAsEnded = false
    for (const logIndex in project.trackingLogs) {
      const trackingLog = project.trackingLogs[logIndex]
      if (!trackingLog.endDate && trackingLog.name !== trackedAppName) {
        const elapsedTime = Date.now() - trackingLog.startDate
        if (elapsedTime < minLogSecs * 1000) continue
        const newTrackingLog = {
          ...trackingLog,
          elapsedTime,
          endDate: Date.now()
        }
        trackingLogs.push(newTrackingLog)
        ipcRenderer.send('create-tracking-log', { projectName, trackingLog: newTrackingLog })
        logAsEnded = true
      } else {
        trackingLogs.push(trackingLog)
      }
    }

    if (currentTrackingLogIndex < 0) {
      trackingLogs.push({
        name: trackedAppName,
        startDate: Date.now(),
        elapsedTime: 0
      })
    }

    const elapsedTime = trackingLogs.reduce(
      (acc, curr) =>
        curr.endDate ? acc + curr.endDate - curr.startDate : acc + Date.now() - curr.startDate,
      0
    )
    if (logAsEnded) {
      ipcRenderer.send('update-project-properties', {
        projectName,
        elapsedTime
      })
    }

    trackingDataCopy[projectName] = {
      ...project,
      trackingLogs,
      elapsedTime: elapsedTime,
      startDate: project.startDate || Date.now()
    }
  }

  trackingData.value = trackingDataCopy
}
