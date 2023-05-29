import { createSlice } from '@reduxjs/toolkit'

const settingsSlice = createSlice({
  name: 'settings',
  initialState: {
    minLogSecs: 5,
    minLastInputSecs: 120,
    startTrackingAtLaunch: true,
    startAtLaunch: false,
    isFirstSettingsLoad: true
  },
  reducers: {
    setSettings: (state, action) => {
      state = action.payload
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
    }
  }
})

export const { setMinLogSecs, setMinLastInputSecs, setStartTrackingAtLaunch, setSettings, setStartAtLaunch, toggleStartAtLaunch, setIsFirstSettingsLoad } = settingsSlice.actions

export default settingsSlice.reducer
