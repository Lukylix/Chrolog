import { useEffect } from 'react'

import {
  isTracking,
  isGettingProcessList,
  isLoadingData,
  processCount,
  lastInputTime,
  currentTab,
  completedProcess,
  currentProcess,
  isInitialLoad,
  isTrackingRunning
} from '../signals/tracking.js'
import {
  startTrackingAtLaunch,
  isFirstSettingsLoad,
  minLastInputSecs,
  browserProcesses,
  sitesExclusions,
  minLogSecs,
  setSettings,
  addSitesExclusion
} from '../signals/settings.js'
import { getProcesses, processes } from '../signals/processes.js'
import { trackingData, updateTrackingData, stopTrackingAll } from '../signals/trackingData.js'
import { effect } from '@preact/signals-react'

const { ipcRenderer } = window.require('electron')

let shouldSkipTrack = false

const track = async () => {
  if (!isTracking.value) return
  const activeApp = await ipcRenderer.invoke('get-active-app')
  if (!activeApp) return
  const isBrowser = browserProcesses.value.find((browser) => activeApp.includes(browser))
  const isExcluedSite = sitesExclusions.value.find((site) => currentTab.value.includes(site))
  const isInactivity = Date.now() - lastInputTime.value > minLastInputSecs.value * 1000
  const isStillInactive = isInactivity && shouldSkipTrack
  shouldSkipTrack = isInactivity
  if (isStillInactive) return
  if (isInactivity || (isBrowser && isExcluedSite)) {
    return stopTrackingAll({
      trackedAppName: activeApp,
      settings: {
        minLogSecs: minLogSecs.value,
        isInactivity: isInactivity.value,
        minLastInputSecs: minLastInputSecs.value
      }
    })
  }

  updateTrackingData({
    trackedAppName: activeApp,
    settings: {
      minLogSecs: minLogSecs.value
    }
  })
}

const getProcessCount = async () => {
  if (processCount.vlaue > 0) return
  const count = await ipcRenderer.invoke('get-process-count')
  processCount.value = count * 2
}

effect(() => {
  isTracking.value
})

const loadData = async () => {
  if (Object.keys(trackingData.value).length > 0 || isLoadingData.value) return
  console.log('loading data')
  isLoadingData.value = true
  const trackingDataRes = await ipcRenderer.invoke('load-data')
  trackingData.value = trackingDataRes
  isLoadingData.value = false
}

const useTracking = () => {
  useEffect(() => {
    const currentTabCallback = (e, hostname) => (currentTab.value = hostname)
    ipcRenderer.on('current-tab', currentTabCallback)
    const addTabCallback = (e, hostname) => addSitesExclusion(hostname)
    ipcRenderer.on('add-tab', addTabCallback)
    const windowClosedCallback = () => isTracking.value === false
    ipcRenderer.on('window-closed', windowClosedCallback)
    const fetchingProcessCountCallback = (event, count) => (currentProcess.value = count)
    ipcRenderer.on('fetching-process-count', fetchingProcessCountCallback)
    const processCompletedCallback = (event, count) => (completedProcess.value = count)
    ipcRenderer.on('process-completed-event', processCompletedCallback)
    const processesCallback = (event, processesRes) => {
      processes.value = processesRes
      isGettingProcessList.value = false
      isInitialLoad.value = false
    }
    ipcRenderer.on('processes-event', processesCallback)
    const lastInputTimeCallback = () => (lastInputTime.value = Date.now())
    ipcRenderer.on('input_event', lastInputTimeCallback)
    getProcessCount()
    loadData()
    return () => {
      ipcRenderer.removeListener('current-tab', currentTabCallback)
      ipcRenderer.removeListener('add-tab', addTabCallback)
      ipcRenderer.removeListener('window-closed', windowClosedCallback)
      ipcRenderer.removeListener('fetching-process-count', fetchingProcessCountCallback)
      ipcRenderer.removeListener('process-completed-event', processCompletedCallback)
      ipcRenderer.removeListener('processes-event', processesCallback)
      ipcRenderer.removeListener('input_event', lastInputTimeCallback)
    }
  }, [])

  useEffect(() => {
    ;(async () => {
      const settings = await ipcRenderer.invoke('load-settings')
      if (!settings) return
      setSettings(settings)
      if (startTrackingAtLaunch.value && isFirstSettingsLoad.value && !isTracking.value) {
        isTracking.value = true
      }
      isFirstSettingsLoad.value = false
    })()
  }, [])

  useEffect(() => {
    let intervalId = null
    if (isTracking.value) {
      track()
      intervalId = setInterval(track, 100)
      isTrackingRunning.value = true
    }
    return () => {
      clearInterval(intervalId)
      isTrackingRunning.value = false
    }
  }, [isTracking.value, track])

  useEffect(() => {
    if (processCount.value === 0) getProcesses()
  }, [processCount.value])
}

export default useTracking
