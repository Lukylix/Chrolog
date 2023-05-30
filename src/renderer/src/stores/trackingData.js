import { createSlice } from '@reduxjs/toolkit'

const { ipcRenderer } = window.require('electron')

const trackingDataSlice = createSlice({
  name: 'trackingData',
  initialState: {},
  reducers: {
    saveTrackingData: (state, action) => {
      Object.keys(action.payload).map((projectName) => {
        action.payload[projectName] = {
          ...action.payload[projectName],
          elapsedTime:
            action.payload[projectName]?.trackingLogs
              ?.map((log) => log.elapsedTime)
              .reduce((acc, curr) => acc + curr, 0) || 0
        }
      })
      return { ...state, ...action.payload }
    },
    createProject: (state, action) => {
      const { projectName, projectData } = action.payload
      ipcRenderer.send('create-project', { projectName, ...projectData })
      return { ...state, [projectName]: projectData }
    },
    toggleProject: (state, action) => {
      const { projectName } = action.payload
      return {
        ...state,
        [projectName]: {
          ...state[projectName],
          toggled: !state?.[projectName]?.toggled || false
        }
      }
    },
    removeTrackingLog: (state, action) => {
      const { id, projectName } = action.payload
      const trackingLogs = state?.[projectName]?.trackingLogs.filter((log) => log.id !== id)
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
      const { minLogSecs } = action.payload.settings
      let trackingData = Object.keys(state).reduce((acc, projectName) => {
        let trackingLogs = []
        for (let log of state[projectName]?.trackingLogs) {
          if (!log.endDate) {
            let trackingLogId
            if (Date.now() - log.startDate > minLogSecs * 1000) {
              trackingLogId = ipcRenderer.invoke('create-tracking-log', {
                projectName,
                trackingLog: {
                  ...log,
                  elapsedTime: Date.now() - log.startDate,
                  endDate: Date.now()
                }
              })
              log = {
                ...log,
                id: trackingLogId || log.id || null,
                elapsedTime: Date.now() - log.startDate,
                endDate: Date.now(),
                toKeep: true
              }
            } else {
              log = {
                ...log,
                toKeep: false
              }
            }
            log = { ...log, toKeep: true }
          }
          log = { ...log, toKeep: true }
          trackingLogs.push(log)
        }

        trackingLogs = trackingLogs.filter((log) => log.toKeep)

        return {
          ...acc,
          [projectName]: {
            ...state[projectName],
            trackingLogs
          }
        }
      }, {})
      Object.keys(trackingData).map((projectName) => {
        trackingData[projectName] = {
          ...trackingData[projectName],
          elapsedTime:
            trackingData[projectName]?.trackingLogs
              ?.map((log) => log.elapsedTime)
              .reduce((acc, curr) => acc + curr, 0) || 0
        }
      })
      return trackingData
    },
    updateTrackingData: (state, action) => {
      const { trackedAppName } = action.payload
      const { lastInputTime, lastTrackTime, minLastInputSecs } = action.payload.settings
      const matchingProjectsKeys = Object.keys(state).filter(
        (projectKey) =>
          state[projectKey].apps.find((app) => app.name === trackedAppName) &&
          !!state[projectKey].toggled
      )

      for (const projectName of matchingProjectsKeys) {
        const project = state[projectName]
        const elapsedTime = state[projectName]?.elapsedTime || 0
        const trackedApp = state[projectName]?.trackingLogs?.find(
          (app) => app?.name === trackedAppName && app?.startDate && !app?.endDate
        )
        let trackingLogs = (project?.trackingLogs || []).map((log) => {
          if (log?.name === trackedAppName && !log.endDate && !log.startDate) {
            return {
              ...log,
              startDate: trackedApp?.startDate || Date.now(),
              elapsedTime: trackedApp?.elapsedTime + 1000
            }
          }
          return log
        })
        trackingLogs = trackingLogs.map((log) => {
          if (log?.name !== trackedAppName && !log?.endDate && log?.startDate)
            return {
              ...log,
              elapsedTime: Date.now() - log.startDate,
              endDate: Date.now()
            }
          return log
        })

        if (!trackedApp) {
          trackingLogs.push({
            name: trackedAppName,
            startDate: Date.now(),
            elapsedTime: 0
          })
        }
        if (lastTrackTime - lastInputTime > 1000 * minLastInputSecs)
          return (state[projectName] = {
            ...project,
            elapsedTime: trackingLogs
              .map((log) => log.elapsedTime)
              .reduce((acc, curr) => acc + curr, 0),
            trackingLogs,
            startDate: state[projectName].startDate || Date.now()
          })

        state[projectName] = {
          ...project,
          elapsedTime: elapsedTime + 1000,
          trackingLogs,
          startDate: state[projectName].startDate || Date.now()
        }
      }
    },
    updateTrackingDataAfterInactivity: async (state, action) => {
      const { minLogSecs } = action.payload.settings
      const { trackedAppName } = action.payload.trackingData
      const matchingProjectsKeys = Object.keys(state).filter(
        (projectKey) =>
          state[projectKey].apps.find((app) => app.name === trackedAppName) &&
          !!state[projectKey].toggled
      )

      for (const projectName of matchingProjectsKeys) {
        const project = state[projectName]
        const elapsedTime = project?.elapsedTime || 0
        const trackedApp = state[projectName]?.trackingLogs?.find(
          (app) => app.name === trackedAppName && app.startDate && !app.endDate
        )
        let trackingLogs

        for (const log of project?.trackingLogs || []) {
          if (log.name === trackedAppName && !log.endDate) {
            let trackingLogId
            if (elapsedTime > minLogSecs * 1000)
              trackingLogId = await ipcRenderer.invoke('create-tracking-log', {
                projectName,
                trackingLog: {
                  ...log,
                  elapsedTime: elapsedTime,
                  toKeep: elapsedTime > minLogSecs * 1000,
                  endDate: Date.now()
                }
              })

            return {
              ...log,
              id: trackingLogId || log.id || null,
              elapsedTime: elapsedTime,
              toKeep: elapsedTime > minLogSecs * 1000,
              endDate: Date.now()
            }
          } else if (!log.endDate) {
            return {
              ...log,
              toKeep: false
            }
          }
          return log
        }
        trackingLogs = trackingLogs.filter((log) => !log.elapsedTime < 0 && log.toKeep)
          .map((log) => {
            delete log.toKeep
            return log
          })
        ipcRenderer.send('update-project-properties', {
          ...project,
          elapsedTime: trackingLogs
            .map((log) => log.elapsedTime)
            .reduce((acc, curr) => acc + curr, 0),
          trackingLogs
        })
        state[projectName] = {
          ...project,
          elapsedTime: trackingLogs
            .map((log) => log.elapsedTime)
            .reduce((acc, curr) => acc + curr, 0),
          trackingLogs
        }
      }
    }
  }
})

export const {
  saveTrackingData,
  createProject,
  toggleProject,
  updateTrackingData,
  updateTrackingDataAfterInactivity,
  stopTracking,
  stopTrackingAll,
  removeTrackedApp,
  addTrackedApp,
  removeTrackingLog
} = trackingDataSlice.actions
export default trackingDataSlice.reducer
