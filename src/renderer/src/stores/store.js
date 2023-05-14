import { configureStore } from '@reduxjs/toolkit'
import trackingDataReducer from './trackingData'
import processesReducer from './processes'
import trackingReducer from './tracking'
import settingsReducer from './settings'

const addSettingsMiddleware = storeAPI => next => action => {
  if (action.type === 'trackingData/updateTrackingDataAfterInactivity') {
    const state = storeAPI.getState()
    const enrichedAction = {
      trackIngData: action,
      settings: state.settings,
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
    settings: settingsReducer
  },
  middleware: (getDefaultMiddleware) => getDefaultMiddleware().concat(addSettingsMiddleware)
})

export default store
