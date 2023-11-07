import { useCallback, useEffect, useRef } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import {
  createProject,
  updateTrackingData,
  stopTrackingAll,
  saveTrackingData
} from '../stores/trackingData.js'
import { setProcesses } from '../stores/processes.js'

import {
  setIsTracking,
  setLastInputTime,
  setIsGettingProcessList,
  setIsLoadingData,
  setProcessCount,
  setCurrentProcess,
  setCompletedProcess,
  setIsTrackingRunning,
  setCurrentTab
} from '../stores/tracking.js'
import { addSitesExclusion, setIsFirstSettingsLoad, setSettings } from '../stores/settings.js'
import { setInitialLoad } from '../stores/initialLoad.js'
import { useState } from 'react'

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
  const minLastInputSecs = useSelector((state) => state.settings.minLastInputSecs)
  const currentTab = useSelector((state) => state.tracking.currentTab)
  const browserProcesses = useSelector((state) => state.settings.browserProcesses)
  const sitesExclusions = useSelector((state) => state.settings.sitesExclusions)
  const minLogSecs = useSelector((state) => state.settings.minLogSecs)
  const [shouldSkipTrack, setShouldSkipTrack] = useState(false)

  const dispatch = useDispatch()

  const track = useCallback(async () => {
    if (!isTracking || !isMaster) return
    const activeApp = await ipcRenderer.invoke('get-active-app')
    if (!activeApp) return
    const isBrowser = browserProcesses.find((browser) => activeApp.includes(browser))
    const isExcluedSite = sitesExclusions.find((site) => currentTab.includes(site))
    const isInactivity = Date.now() - lastInputTime > minLastInputSecs * 1000
    const isStillInactive = isInactivity && shouldSkipTrack
    setShouldSkipTrack(isInactivity)
    if (isStillInactive) return

    if (isInactivity || (isBrowser && isExcluedSite)) {
      return dispatch(
        stopTrackingAll({
          trackedAppName: activeApp,
          settings: {
            minLogSecs,
            isInactivity,
            minLastInputSecs
          }
        })
      )
    }
    dispatch(
      updateTrackingData({
        trackedAppName: activeApp,
        settings: {
          minLogSecs
        }
      })
    )
  }, [
    isTracking,
    lastInputTime,
    minLastInputSecs,
    currentTab,
    browserProcesses,
    sitesExclusions,
    shouldSkipTrack
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
    const currentTabCallback = (event, hostname) => {
      dispatch(setCurrentTab(hostname))
    }
    ipcRenderer.on('current-tab', currentTabCallback)

    const addTabCallback = (event, hostname) => {
      dispatch(addSitesExclusion(hostname))
    }
    ipcRenderer.on('add-tab', addTabCallback)
    const windowClosedCallback = () => {
      dispatch(setIsTracking(false))
    }
    ipcRenderer.on('window-closed', windowClosedCallback)
    const fetchingProcessCountCallback = (event, count) => {
      dispatch(setCurrentProcess(count))
    }
    ipcRenderer.on('fetching-process-count', fetchingProcessCountCallback)
    const processCompletedCallback = (event, count) => {
      dispatch(setCompletedProcess(count))
    }
    ipcRenderer.on('process-completed-event', processCompletedCallback)
    const processesCallback = (event, processesRes) => {
      if (processesRes.length === 0) return
      dispatch(setProcesses(processesRes))
      dispatch(setIsGettingProcessList(false))
      dispatch(setInitialLoad(false))
    }
    ipcRenderer.on('processes-event', processesCallback)
    const keyboardEventCallback = () => {
      dispatch(setLastInputTime(Date.now()))
    }
    ipcRenderer.on('keyboard_event', keyboardEventCallback)
    const mouseEventCallback = () => {
      dispatch(setLastInputTime(Date.now()))
    }
    ipcRenderer.on('mouse_event', mouseEventCallback)
    console.log('Listeners added')
    getProcessCount()
    loadData()
    return () => {
      ipcRenderer.removeListener('current-tab', currentTabCallback)
      ipcRenderer.removeListener('add-tab', addTabCallback)
      ipcRenderer.removeListener('window-closed', windowClosedCallback)
      ipcRenderer.removeListener('fetching-process-count', fetchingProcessCountCallback)
      ipcRenderer.removeListener('process-completed-event', processCompletedCallback)
      ipcRenderer.removeListener('processes-event', processesCallback)
      ipcRenderer.removeListener('keyboard_event', keyboardEventCallback)
      ipcRenderer.removeListener('mouse_event', mouseEventCallback)
      console.log('Listeners removed')
    }
  }, [])

  useEffect(() => {
    if (!isMaster) return
    let intervalId = null
    if (isTracking) {
      track()
      intervalId = setInterval(track, 100)
      dispatch(setIsTrackingRunning(true))
    }
    return () => {
      clearInterval(intervalId)
      dispatch(setIsTrackingRunning(false))
    }
  }, [isTracking, track])

  useEffect(() => {
    if (!isMaster) return
    if (processCount == 0) getProcesses()
  }, [processCount])
  return { getProcesses }
}

export default useTracking
