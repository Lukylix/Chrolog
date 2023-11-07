import { configureStore } from '@reduxjs/toolkit'
import trackingDataReducer from './trackingData'
import processesReducer from './processes'
import trackingReducer from './tracking'
import settingsReducer from './settings'
import initialLoadReducer from './initialLoad'

const store = configureStore({
  reducer: {
    trackingData: trackingDataReducer,
    processes: processesReducer,
    tracking: trackingReducer,
    settings: settingsReducer,
    initialLoad: initialLoadReducer
  }
})

export default store
