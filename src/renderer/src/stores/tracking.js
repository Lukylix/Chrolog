import { createSlice, current } from '@reduxjs/toolkit'

const trackingSlice = createSlice({
  name: 'tracking',
  initialState: {
    isReady: false,
    isTracking: false,
    lastInputTime: Date.now(),
    lastTrackTime: Date.now(),
    intervalId: null,
    trackedApps: [],
    currentProject: '',
    isGettingProcessList: false,
    isLoadingData: false,
    processCount: 0,
    currentProcess: 0,
    completedProcess: 0
  },
  reducers: {
    setIsReady: (state, action) => {
      state.isReady = action.payload
    },
    setIsTracking: (state, action) => {
      state.isTracking = action.payload
    },
    setLastInputTime: (state, action) => {
      state.lastInputTime = action.payload
    },
    setLastTrackTime: (state, action) => {
      state.lastTrackTime = action.payload
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
    }
  }
})

export const {
  setIsAlmostReady,
  setIsReady,
  setIsTracking,
  setLastInputTime,
  setLastTrackTime,
  setIntervalId,
  setTrackedApps,
  setCurrentProject,
  setIsGettingProcessList,
  setIsLoadingData,
  setProcessCount,
  setCurrentProcess,
  setCompletedProcess
} = trackingSlice.actions

export default trackingSlice.reducer
