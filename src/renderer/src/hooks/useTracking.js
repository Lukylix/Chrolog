import { useEffect } from 'react'
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
  setIntervalId,
  setIsReady,
  setIsTracking,
  setLastInputTime,
  setLastTrackTime,
  setIsGettingProcessList,
  setIsLoadingData,
  setProcessCount,
  setCurrentProcess,
  setCompletedProcess
} from '../stores/tracking.js'

const { ipcRenderer } = window.require('electron')

const useTracking = () => {
  const trackingData = useSelector((state) => state.trackingData)
  const lastInputTime = useSelector((state) => state.tracking.lastInputTime)
  const lastTrackTime = useSelector((state) => state.tracking.lastTrackTime)
  const isTracking = useSelector((state) => state.tracking.isTracking)
  const intervalId = useSelector((state) => state.tracking.intervalId)
  const processes = useSelector((state) => state.processes)
  const isGettingProcessList = useSelector((state) => state.tracking.isGettingProcessList)
  const isLoadingData = useSelector((state) => state.tracking.isLoadingData)
  const processCount = useSelector((state) => state.tracking.processCount)

  const dispatch = useDispatch()

  const handleCreateProject = (projectName, associatedApps) => {
    if (!projectName) {
      // Handle the case where projectName is not defined
      console.error('No project name defined')
      return
    }
    dispatch(
      createProject({
        projectName,
        projectData: { toggled: true, apps: associatedApps }
      })
    )
  }

  const loadData = async () => {
    if (Object.keys(trackingData).length > 0 || isLoadingData) return
    dispatch(setIsLoadingData(true))
    const trackingDataRes = await ipcRenderer.invoke('load-data')
    console.log('loaded data: ', trackingDataRes)
    dispatch(saveTrackingData(trackingDataRes))
    dispatch(setIsLoadingData(false))
  }

  const saveData = (trackingData) => {
    if (Object.keys(trackingData).length === 0) return
    console.log('saving data: ', trackingData)
    ipcRenderer.send('save-data', trackingData)
  }

  const getProcesses = async () => {
    if (processes.length > 0 || isGettingProcessList) return
    dispatch(setIsGettingProcessList(true))
    ipcRenderer.send('get-windows-with-icons')
  }
  const getProcessCount = async () => {
    if (processCount > 0) return
    const count = await ipcRenderer.invoke('get-process-count')
    console.log('process count: ', count)
    dispatch(setProcessCount(count))
  }

  useEffect(() => {
    ipcRenderer.on('fetching-process-count', (event, count) => {
      dispatch(setCurrentProcess(count))
    })
    ipcRenderer.on('process-completed-event', (event, count) => {
      dispatch(setCompletedProcess(count))
    })
    ipcRenderer.on('processes-event', (event, processesRes) => {
      dispatch(setProcesses(processesRes))
      dispatch(setIsGettingProcessList(false))
    })
    ipcRenderer.on('keyboard_event', () => {
      dispatch(setLastInputTime(Date.now()))
    })

    ipcRenderer.on('mouse_event', () => {
      dispatch(setLastInputTime(Date.now()))
    })
    getProcessCount()
    loadData()

    dispatch(setIsReady(true))
  }, [])

  useEffect(() => {
    if (processCount == 0) getProcesses()
  }, [processCount])
  const handleTrack = () => {
    if (isTracking) return // Don't start tracking if no process has been selected

    dispatch(setIsTracking(true))

    const intervalId = setInterval(async () => {
      const activeApp = await ipcRenderer.invoke('get-active-app')
      if (!activeApp) return
      const allProjectTrackedApps = Object.keys(trackingData).reduce((acc, projectKey) => {
        const project = trackingData[projectKey]
        if (project.toggled) acc = [...acc, ...project.apps]
        return acc
      }, [])
      const trackedApp = allProjectTrackedApps.find((app) => app.name === activeApp)
      if (!trackedApp) return
      if (Date.now() - lastInputTime > 1000 * 60 * 2) {
        if (lastInputTime < lastTrackTime) {
          dispatch(
            updateTrackingDataAfterInactivity({
              trackedAppName: trackedApp.name,
              lastInputTime: lastInputTime,
              lastTrackTime: lastTrackTime
            })
          )
          saveData(trackingData)
          dispatch(setLastTrackTime(lastInputTime))
        }
        return
      }
      dispatch(setLastTrackTime(Date.now()))
      dispatch(
        updateTrackingData({
          trackedAppName: trackedApp.name
        })
      )
    }, 1000)
    dispatch(setIntervalId(intervalId))

    ipcRenderer.on('window-closed', () => {
      dispatch(setIsTracking(false))
    })
  }

  const handleStopTrack = () => {
    dispatch(setIsTracking(false))
    clearInterval(intervalId)
    dispatch(stopTrackingAll())
    saveData(trackingData)
  }

  return {
    handleCreateProject,
    loadData,
    saveData,
    handleTrack,
    handleStopTrack
  }
}
export default useTracking
