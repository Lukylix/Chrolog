import { configureStore } from '@reduxjs/toolkit'
import trackingDataReducer from './trackingData'
import processesReducer from './processes'
import trackingReducer from './tracking'

const store = configureStore({
  reducer: {
    trackingData: trackingDataReducer,
    processes: processesReducer,
    tracking: trackingReducer
  }
})

export default store
