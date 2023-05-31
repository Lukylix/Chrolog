import { createSlice } from '@reduxjs/toolkit'

const settingsSlice = createSlice({
  name: 'settings',
  initialState: {
    minLogSecs: 5,
    minLastInputSecs: 120,
    startTrackingAtLaunch: true,
    startAtLaunch: false,
    isFirstSettingsLoad: true,
    extensionEnabled: false,
    browserProcesses: ['chrome', 'brave', 'operagx', 'msedge'],
    sitesExclusions: []
  },
  reducers: {
    setSettings: (state, action) => {
      const {
        minLogSecs,
        minLastInputSecs,
        startTrackingAtLaunch,
        startAtLaunch,
        extensionEnabled,
        browserProcesses,
        sitesExclusions
      } = action.payload
      console.log(action.payload)
      if (minLogSecs) state.minLogSecs = minLogSecs
      if (minLastInputSecs) state.minLastInputSecs = minLastInputSecs
      if (startTrackingAtLaunch) state.startTrackingAtLaunch = startTrackingAtLaunch
      if (startAtLaunch) state.startAtLaunch = startAtLaunch
      if (extensionEnabled) state.extensionEnabled = extensionEnabled
      if (browserProcesses) state.browserProcesses = browserProcesses
      if (sitesExclusions) state.sitesExclusions = sitesExclusions
      return state
    },
    setMinLogSecs: (state, action) => {
      state.minLogSecs = action.payload
    },
    setMinLastInputSecs: (state, action) => {
      state.minLastInputSecs = action.payload
    },
    setStartTrackingAtLaunch: (state, action) => {
      state.startTrackingAtLaunch = action.payload
    },
    setStartAtLaunch: (state, action) => {
      state.startAtLaunch = action.payload
    },
    toggleStartAtLaunch: (state) => {
      state.startAtLaunch = !state.startAtLaunch
    },
    setIsFirstSettingsLoad: (state, action) => {
      state.isFirstSettingsLoad = action.payload
    },
    setExtensionEnabled: (state, action) => {
      state.extensionEnabled = action.payload
    },
    setSitesExclusions: (state, action) => {
      state.sitesExclusions = action.payload
    },
    setBrowserProcesses: (state, action) => {
      state.browserProcesses = action.payload
    }
  }
})

export const {
  setMinLogSecs,
  setMinLastInputSecs,
  setStartTrackingAtLaunch,
  setSettings,
  setStartAtLaunch,
  toggleStartAtLaunch,
  setIsFirstSettingsLoad,
  setExtensionEnabled,
  setSitesExclusions,
  setBrowserProcesses
} = settingsSlice.actions

export default settingsSlice.reducer
