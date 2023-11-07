import { createSlice, current } from '@reduxjs/toolkit'

const currentDate = new Date()
const currentDay = currentDate.getDay() // Current day of the week (0-6)
const startDay = new Date(new Date().setDate(currentDate.getDate() - currentDay)) // Start day (Monday)
const endDay = new Date(new Date().setDate(currentDate.getDate() - currentDay + 6)) // End day (Sunday)

const trackingSlice = createSlice({
  name: 'tracking',
  initialState: {
    isTracking: false,
    lastInputTime: Date.now(),
    intervalId: null,
    trackedApps: [],
    currentProject: '',
    isGettingProcessList: false,
    isLoadingData: false,
    processCount: 0,
    currentProcess: 0,
    completedProcess: 0,
    shouldTrack: false,
    isTrackingRunning: false,
    shouldRestartTracking: false,
    currentTab: '',
    currentPeriod: {
      start: startDay.getTime(),
      end: endDay.getTime()
    }
  },
  reducers: {
    setIsTracking: (state, action) => {
      state.isTracking = action.payload
    },
    setLastInputTime: (state, action) => {
      state.lastInputTime = action.payload
    },
    setIntervalId: (state, action) => {
      state.intervalId = action.payload
    },
    setTrackedApps: (state, action) => {
      state.trackedApps = action.payload
    },
    setCurrentProject: (state, action) => {
      state.currentProject = action.payload
    },
    setIsGettingProcessList: (state, action) => {
      state.isGettingProcessList = action.payload
    },
    setIsLoadingData: (state, action) => {
      state.isLoadingData = action.payload
    },
    setProcessCount: (state, action) => {
      state.processCount = action.payload
    },
    setCurrentProcess: (state, action) => {
      state.currentProcess = action.payload
    },
    setCompletedProcess: (state, action) => {
      state.completedProcess = action.payload
    },
    setShouldTrack: (state, action) => {
      state.shouldTrack = action.payload
    },
    setIsTrackingRunning: (state, action) => {
      state.isTrackingRunning = action.payload
    },
    setShouldRestartTracking: (state, action) => {
      state.shouldRestartTracking = action.payload
    },
    setCurrentPeriod: (state, action) => {
      state.currentPeriod = action.payload
    },
    setCurrentTab: (state, action) => {
      state.currentTab = action.payload
    },
    addTrackedApp: (state, action) => {
      const { name } = action.payload
      const index = state.trackedApps.findIndex((app) => app.name === name)
      if (index === -1) {
        state.trackedApps.push(action.payload)
      }
    }
  }
})

export const {
  setIsTracking,
  setLastInputTime,
  setIntervalId,
  setTrackedApps,
  setCurrentProject,
  setIsGettingProcessList,
  setIsLoadingData,
  setProcessCount,
  setCurrentProcess,
  setCompletedProcess,
  setShouldTrack,
  setIsTrackingRunning,
  setShouldRestartTracking,
  setCurrentPeriod,
  setCurrentTab,
  addTrackedApp
} = trackingSlice.actions

export default trackingSlice.reducer
