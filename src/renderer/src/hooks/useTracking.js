import { useCallback, useEffect, useRef } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import {
  createProject,
  updateTrackingData,
  updateTrackingDataAfterInactivity,
  stopTrackingAll,
  saveTrackingData
} from '../stores/trackingData.js'
import { setProcesses } from '../stores/processes.js'

import {
  setIsTracking,
  setLastInputTime,
  setLastTrackTime,
  setIsGettingProcessList,
  setIsLoadingData,
  setProcessCount,
  setCurrentProcess,
  setCompletedProcess,
  setShouldTrack,
  setIsTrackingRunning,
  setShouldRestartTracking,
  setCurrentTab
} from '../stores/tracking.js'
import {
  addSitesExclusion,
  setIsFirstSettingsLoad,
  setSettings,
  setSitesExclusions
} from '../stores/settings.js'
import { setInitialLoad } from '../stores/initialLoad.js'

const { ipcRenderer } = window.require('electron')

const useTracking = (isMaster = false) => {
  const isTracking = useSelector((state) => state.tracking.isTracking)
  const processes = useSelector((state) => state.processes)
  const isGettingProcessList = useSelector((state) => state.tracking.isGettingProcessList)
  const isLoadingData = useSelector((state) => state.tracking.isLoadingData)
  const processCount = useSelector((state) => state.tracking.processCount)
  const startTrackingAtLaunch = useSelector((state) => state.settings.startTrackingAtLaunch)
  const isFirstSettingsLoad = useSelector((state) => state.settings.isFirstSettingsLoad)
  const isTrackingRunning = useSelector((state) => state.tracking.isTrackingRunning)
  const trackingData = useSelector((state) => state.trackingData)
  const lastInputTime = useSelector((state) => state.tracking.lastInputTime)
  const lastTrackTime = useSelector((state) => state.tracking.lastTrackTime)
  const minLastInputSecs = useSelector((state) => state.settings.minLastInputSecs)
  const shouldTrack = useSelector((state) => state.tracking.shouldTrack)
  const currentTab = useSelector((state) => state.tracking.currentTab)
  const shouldRestartTracking = useSelector((state) => state.tracking.shouldRestartTracking)
  const browserProcesses = useSelector((state) => state.settings.browserProcesses)
  const sitesExclusions = useSelector((state) => state.settings.sitesExclusions)

  const dispatch = useDispatch()

  const track = useCallback(async () => {
    dispatch(setShouldTrack(false))
    if (!isTracking) return
    const activeApp = await ipcRenderer.invoke('get-active-app')
    if (!activeApp) return
    const allProjectTrackedApps = Object.keys(trackingData).reduce((acc, projectKey) => {
      const project = trackingData[projectKey]
      if (project.toggled) acc = [...acc, ...project.apps]
      return acc
    }, [])
    const trackedApp = allProjectTrackedApps.find(
      (app) => app.name.toLowerCase().trim() === activeApp.toLowerCase().trim()
    )
    if (!trackedApp) return dispatch(stopTrackingAll())
    if (
      (Date.now() - lastInputTime > 1000 * minLastInputSecs ||
        (browserProcesses.find((browser) => trackedApp.name.includes(browser)) &&
          sitesExclusions.find((site) => currentTab.includes(site)))) &&
      lastInputTime < lastTrackTime
    ) {
      dispatch(
        updateTrackingDataAfterInactivity({
          trackedAppName: trackedApp.name,
          lastInputTime: lastInputTime,
          lastTrackTime: lastTrackTime
        })
      )
      dispatch(setLastTrackTime(Date.now()))
      return
    }
    dispatch(setLastTrackTime(Date.now()))
    dispatch(
      updateTrackingData({
        trackedAppName: trackedApp.name
      })
    )
  }, [
    isTracking,
    lastInputTime,
    lastTrackTime,
    minLastInputSecs,
    trackingData,
    currentTab,
    browserProcesses,
    sitesExclusions
  ])
  useEffect(() => {
    ;(async () => {
      if (!isMaster) return
      const settings = await ipcRenderer.invoke('load-settings')
      dispatch(setSettings(settings))
      if (startTrackingAtLaunch && isFirstSettingsLoad && !isTracking) {
        dispatch(setIsTracking(true))
      }
      dispatch(setIsFirstSettingsLoad(false))
    })()
  }, [])

  useEffect(() => {
    let shouldClear = false
    ;(async () => {
      if (!isTrackingRunning && isMaster) {
        dispatch(setIsTrackingRunning(true))
        while (shouldClear === false) {
          dispatch(setShouldTrack(true))
          await new Promise((resolve) => setTimeout(resolve, 1000))
        }
        dispatch(setIsTrackingRunning(false))
        dispatch(setShouldRestartTracking(true))
      }
    })()
    return () => {
      shouldClear = true
    }
  }, [shouldRestartTracking])

  useEffect(() => {
    if (shouldTrack && isMaster) track()
  }, [shouldTrack])

  const loadData = useCallback(async () => {
    if (Object.keys(trackingData).length > 0 || isLoadingData) return
    console.log('loading data')
    dispatch(setIsLoadingData(true))
    const trackingDataRes = await ipcRenderer.invoke('load-data')
    dispatch(saveTrackingData(trackingDataRes))
    dispatch(setIsLoadingData(false))
  }, [trackingData, isLoadingData])

  const getProcesses = useCallback(async () => {
    if (isGettingProcessList) return
    dispatch(setCurrentProcess(0))
    dispatch(setCompletedProcess(0))
    dispatch(setIsGettingProcessList(true))
    ipcRenderer.send('get-windows-with-icons')
  }, [processes, isGettingProcessList])

  const getProcessCount = useCallback(async () => {
    if (processCount > 0) return
    const count = await ipcRenderer.invoke('get-process-count')
    dispatch(setProcessCount(count * 2))
  }, [processCount])

  useEffect(() => {
    if (!isMaster) return
    ipcRenderer.on('current-tab', (event, hostname) => {
      dispatch(setCurrentTab(hostname))
    })
    ipcRenderer.on('add-tab', (event, hostname) => {
      dispatch(addSitesExclusion(hostname))
    })
    ipcRenderer.on('window-closed', () => {
      dispatch(setIsTracking(false))
    })
    ipcRenderer.on('fetching-process-count', (event, count) => {
      dispatch(setCurrentProcess(count))
    })
    ipcRenderer.on('process-completed-event', (event, count) => {
      dispatch(setCompletedProcess(count))
    })
    ipcRenderer.on('processes-event', (event, processesRes) => {
      if (processesRes.length === 0) return
      dispatch(setProcesses(processesRes))
      dispatch(setIsGettingProcessList(false))
      dispatch(setInitialLoad(false))
    })
    ipcRenderer.on('keyboard_event', () => {
      dispatch(setLastInputTime(Date.now()))
    })

    ipcRenderer.on('mouse_event', () => {
      dispatch(setLastInputTime(Date.now()))
    })

    getProcessCount()
    loadData()
  }, [])

  useEffect(() => {
    if (!isMaster) return
    if (processCount == 0) getProcesses()
  }, [processCount])
  return { getProcesses }
}

export default useTracking
