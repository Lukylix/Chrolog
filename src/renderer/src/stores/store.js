import { configureStore } from '@reduxjs/toolkit'
import trackingDataReducer from './trackingData'
import processesReducer from './processes'
import trackingReducer from './tracking'
import settingsReducer from './settings'
import initialLoadReducer from './initialLoad'
import initialLoad from './initialLoad'

const addSettingsMiddleware = (storeAPI) => (next) => (action) => {
  if (action.type === 'trackingData/updateTrackingDataAfterInactivity') {
    const state = storeAPI.getState()
    const enrichedAction = {
      ...action,
      payload: {
        trackIngData: action.payload,
        settings: state.settings
      }
    }
    return next(enrichedAction)
  } else if (action.type === 'trackingData/updateTrackingData') {
    const state = storeAPI.getState()
    const enrichedAction = {
      ...action,
      payload: {
        trackedAppName: action.payload.trackedAppName,
        settings: state.settings
      }
    }
    return next(enrichedAction)
  } else if (action.type === 'trackingData/stopTrackingAll') {
    const state = storeAPI.getState()
    const enrichedAction = {
      ...action,
      payload: {
        settings: state.settings
      }
    }
    return next(enrichedAction)
  } else {
    return next(action)
  }
}

const store = configureStore({
  reducer: {
    trackingData: trackingDataReducer,
    processes: processesReducer,
    tracking: trackingReducer,
    settings: settingsReducer,
    initialLoad: initialLoadReducer
  },
  middleware: (getDefaultMiddleware) => getDefaultMiddleware().concat(addSettingsMiddleware)
})

export default store
