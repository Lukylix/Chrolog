import { createSlice, current } from '@reduxjs/toolkit'

const { ipcRenderer } = window.require('electron')

const trackingDataSlice = createSlice({
  name: 'trackingData',
  initialState: {},
  reducers: {
    saveTrackingData: (state, action) => {
      return action.payload
    },
    createProject: (state, action) => {
      const { projectName, projectData } = action.payload
      ipcRenderer.send('create-project', { projectName, ...projectData })
      return { ...state, [projectName]: projectData }
    },
    toggleProject: (state, action) => {
      const { projectName } = action.payload
      ipcRenderer.send('update-project-properties', {
        projectName,
        toggled: !!!state?.[projectName]?.toggled || false
      })
      return {
        ...state,
        [projectName]: {
          ...state[projectName],
          toggled: !!!state?.[projectName]?.toggled || false
        }
      }
    },
    removeTrackingLog: (state, action) => {
      const { name, projectName, endDate, startDate } = action.payload
      const trackingLogs = state?.[projectName]?.trackingLogs.filter(
        (log) => log.name !== name || log.startDate !== startDate || log.endDate !== endDate
      )
      return {
        ...state,
        [projectName]: {
          ...state[projectName],
          trackingLogs: trackingLogs
        }
      }
    },
    removeTrackedApp: (state, action) => {
      const { projectName, appName } = action.payload
      const apps = state[projectName]?.apps.filter((app) => app.name !== appName)
      return {
        ...state,
        [projectName]: {
          ...state[projectName],
          apps: apps
        }
      }
    },
    addTrackedApp: (state, action) => {
      const { projectName, app } = action.payload
      const apps = state[projectName]?.apps || []
      return {
        ...state,
        [projectName]: {
          ...state[projectName],
          apps: [...apps, app]
        }
      }
    },
    stopTracking: (state, action) => {
      const { projectName } = action.payload
      const trackingLogs = state[projectName]?.trackingLogs.map((log) => {
        if (!log?.endDate)
          return {
            ...log,
            elapsedTime: Date.now() - log.startDate,
            endDate: Date.now()
          }
        return log
      })
      return {
        ...state,
        [projectName]: {
          ...state[projectName],
          trackingLogs: trackingLogs
        }
      }
    },
    stopTrackingAll: (state, action) => {
      const { minLogSecs, isInactivity, minLastInputSecs } = action.payload.settings
      let trackingData = Object.keys(state).reduce((acc, projectName) => {
        let trackingLogs = []
        let logAsEnded = false
        for (let log of state[projectName]?.trackingLogs) {
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
            ...state[projectName],
            trackingLogs,
            elapsedTime
          }
        }
      }, {})
      return trackingData
    },
    updateTrackingData: (state, action) => {
      const { trackedAppName } = action.payload
      const { minLogSecs } = action.payload.settings
      const matchingProjectsKeys = Object.keys(state).filter(
        (projectKey) =>
          state[projectKey].apps.find((app) => app.name === trackedAppName) &&
          !!state[projectKey].toggled
      )

      for (const projectName of matchingProjectsKeys) {
        const project = state[projectName]
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

        if (!currentTrackingLogIndex || currentTrackingLogIndex < 0) {
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

        state[projectName] = {
          ...project,
          trackingLogs,
          elapsedTime: elapsedTime,
          startDate: project.startDate || Date.now()
        }
      }
      return state
    }
  }
})

export const {
  saveTrackingData,
  createProject,
  toggleProject,
  updateTrackingData,
  stopTracking,
  stopTrackingAll,
  removeTrackedApp,
  addTrackedApp,
  removeTrackingLog
} = trackingDataSlice.actions
export default trackingDataSlice.reducer
