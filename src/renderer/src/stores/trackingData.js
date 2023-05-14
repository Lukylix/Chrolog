import { createSlice } from '@reduxjs/toolkit'

const trackingDataSlice = createSlice({
  name: 'trackingData',
  initialState: {},
  reducers: {
    saveTrackingData: (state, action) => {
      return { ...state, ...action.payload }
    },
    createProject: (state, action) => {
      const { projectName, projectData } = action.payload
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
    stopTrackingAll: (state) => {
      const trackingData = Object.keys(state).reduce((acc, projectName) => {
        return {
          ...acc,
          [projectName]: {
            ...state[projectName],
            trackingLogs: state[projectName]?.trackingLogs.map((log) => {
              if (!log.endDate)
                return {
                  ...log,
                  elapsedTime: Date.now() - log.startDate,
                  endDate: Date.now()
                }
              return log
            })
          }
        }
      }, {})
      return trackingData
    },

    updateTrackingData: (state, action) => {
      const { trackedAppName } = action.payload
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
            console.log(`Tracking ${trackedAppName}`)
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
        state[projectName] = {
          ...project,
          elapsedTime: elapsedTime + 1000,
          trackingLogs: trackingLogs
        }
      }
    },
    updateTrackingDataAfterInactivity: (state, action) => {
      const { minLogSecs } = action.payload.settings
      const { trackedAppName, lastInputTime, lastTrackTime } = action.payload.trackingData
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
        const trackingLogs = (project?.trackingLogs || [])
          .map((log) => {
            if (log.name === trackedAppName && !log.endDate) {
              console.log(`End tracking ${trackedAppName}`)
              const elapsedTime = trackedApp.elapsedTime + 1000 - (Date.now() - lastInputTime)
              return {
                ...log,
                elapsedTime: elapsedTime,
                toKeep: elapsedTime > minLogSecs * 1000,
                endDate: Date.now()
              }
            }
            return log
          })
          .filter((log) => !log.elapsedTime < 0 && log.toKeep)
          .map((log) => {
            delete log.toKeep
            return log
          })
        state[projectName] = {
          ...project,
          elapsedTime: elapsedTime + 1000 - (lastTrackTime - lastInputTime),
          trackingLogs: trackingLogs
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
  stopTrackingAll
} = trackingDataSlice.actions
export default trackingDataSlice.reducer
