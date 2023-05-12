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
  setIsLoadingData
} from '../stores/tracking.js'

import getWindowsWithIcons from '../../utilis/windowsWithIcons.js'
import io from 'socket.io-client'
const { ipcRenderer } = window.require('electron')

let socket = io.connect('http://localhost:2356')

const useTracking = () => {
  const trackingData = useSelector((state) => state.trackingData)
  const lastInputTime = useSelector((state) => state.tracking.lastInputTime)
  const lastTrackTime = useSelector((state) => state.tracking.lastTrackTime)
  const isTracking = useSelector((state) => state.tracking.isTracking)
  const intervalId = useSelector((state) => state.tracking.intervalId)
  const processes = useSelector((state) => state.processes)
  const isGettingProcessList = useSelector((state) => state.tracking.isGettingProcessList)
  const isLoadingData = useSelector((state) => state.tracking.isLoadingData)

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
    ipcRenderer.invoke('save-data', trackingData)
  }

  const getProcesses = async () => {
    if (processes.length > 0 || isGettingProcessList) return
    dispatch(setIsGettingProcessList(true))
    const processesRes = await getWindowsWithIcons()
    if (!processesRes) return
    dispatch(setProcesses(processesRes))
    dispatch(setIsGettingProcessList(false))
  }

  useEffect(() => {
    ; (() => {
      socket.on('connect', function () {
        socket.emit('join_room', 'input_events')
      })
      socket.on('keyboard_event', function () {
        dispatch(setLastInputTime(Date.now()))
      })
      socket.on('mouse_event', function () {
        dispatch(setLastInputTime(Date.now()))
      })
      socket.on('room_joined', function (message) {
        console.log(message)
      })
    })()
  }, [])

  useEffect(() => {
    loadData()
    getProcesses()
    dispatch(setIsReady(true))
  }, [])

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
