import { useState, useEffect } from 'react'
const { ipcRenderer } = window.require('electron')

import { DataList } from '../../components/Datalist'
import './main.css'
import getWindowsWithIcons from '../../../utilis/windowsWithIcons'

const convertSeconds = (seconds) => {
  let hours = Math.floor(seconds / 3600)
  let minutes = Math.floor((seconds % 3600) / 60)
  let remainingSeconds = seconds % 60
  if (!hours && !minutes) return `${remainingSeconds}s`
  if (!hours) return `${minutes}min ${remainingSeconds}s`
  if (!minutes) return `${hours}h ${remainingSeconds}s`
  return `${hours}h ${minutes}min ${remainingSeconds}s`
}

const Main = () => {
  const [processes, setProcesses] = useState([])
  const [trackedApps, setTrackedApps] = useState([])
  const [trackingData, setTrackingData] = useState({})
  const [isTracking, setIsTracking] = useState(false)
  const [trackingTime, setTrackingTime] = useState(0)
  const [inputValue, setInputValue] = useState('')

  useEffect(() => {
    ;(async () => {
      const processes = await getWindowsWithIcons()
      setProcesses(processes)
    })()
  }, [])

  const loadData = async () => {
    const trackingData = await ipcRenderer.invoke('load-data')
    setTrackingData(trackingData)
    processes.find((process) => {
      if (trackingData[process.name] && !trackedApps.find((app) => app.name === process.name))
        setTrackedApps((prevTrackedApps) => [...prevTrackedApps, process])
    })
  }

  const saveData = (trackingData) => {
    if (Object.keys(trackingData).length === 0) return
    ipcRenderer.invoke('save-data', trackingData)
  }

  useEffect(() => {
    loadData()
  }, [processes])

  useEffect(() => {
    let intervalId
    if (trackedApps.length > 0) {
      intervalId = setInterval(() => {
        setTrackingTime((prevTrackingTime) => prevTrackingTime + 1)
      }, 1000)
    } else {
      setTrackingTime(0)
    }

    return () => clearInterval(intervalId)
  }, [trackedApps])

  useEffect(() => {
    saveData(trackingData)
  }, [trackedApps, trackingData])

  const handleTrack = () => {
    if (trackedApps.length === 0) return // Don't start tracking if no process has been selected

    setIsTracking(true)

    const intervalId = setInterval(async () => {
      const activeApp = await ipcRenderer.invoke('get-active-app')
      console.log('activeApp', activeApp)

      const trackedApp = trackedApps.find((app) => app.name === activeApp)

      if (!trackedApp) return

      setTrackingData((prevData) => {
        const elapsedTime = prevData[trackedApp.name] || 0
        const newData = { ...prevData, [trackedApp.name]: elapsedTime + 1000 }

        saveData(newData) // save data through ipcRenderer

        return newData
      })
    }, 1000)

    setTrackingTime(0)

    ipcRenderer.on('window-closed', () => {
      clearInterval(intervalId)
      setIsTracking(false)
    })
  }

  useEffect(() => {
    handleTrack()
  }, [processes])

  ipcRenderer.on('window-closed', () => {
    setIsTracking(false)
  })

  const handleStopTrack = () => {
    setIsTracking(false)
  }
  return (
    <div className="container">
      {processes.length === 0 ? (
        <p>Loading...</p>
      ) : (
        <>
          <h2>Application Tracker</h2>
          <section className="header">
            <DataList
              data={processes}
              dataKey="name"
              setSelecteds={setTrackedApps}
              onChange={setInputValue}
              renderItem={(process, i, { onClick }) => {
                return (
                  <div key={i}>
                    {process.icon && <img src={process.icon} alt={process.name} />}
                    <option
                      onClick={() => onClick(process)}
                      style={{
                        display: process?.name?.toLowerCase().includes(inputValue.toLowerCase())
                          ? 'block'
                          : 'none'
                      }}
                    >
                      {process.name}
                    </option>
                  </div>
                )
              }}
            />
            {isTracking ? (
              <button onClick={handleStopTrack}>Start Tracking</button>
            ) : (
              <button onClick={handleTrack}>Stop Tracking</button>
            )}
          </section>
          <div className="features">
            <div className="feature-item">
              <article>
                <p>{`Tracking: ${trackedApps.map((app) => app.name).join(', ')}`}</p>
                <p>{`Total Time: ${convertSeconds(trackingTime)}`}</p>
              </article>
            </div>

            {Object.keys(trackingData).map((appKey, i) => {
              const app = { name: appKey, time: trackingData[appKey] }
              return (
                <div key={i} className="feature-item">
                  <article>{`${app.name}: ${convertSeconds(Math.round(app.time / 1000))}`}</article>
                </div>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}

export default Main
