import { useState, useEffect, useRef } from 'react'
const { ipcRenderer } = window.require('electron')

import { DataList } from '../../components/Datalist'
import './main.css'
import getWindowsWithIcons from '../../../utilis/windowsWithIcons'
import io from 'socket.io-client'

const convertSeconds = (seconds) => {
  isNaN(seconds) && (seconds = 0)
  let hours = Math.floor(seconds / 3600)
  let minutes = Math.floor((seconds % 3600) / 60)
  let remainingSeconds = seconds % 60
  if (!hours && !minutes) return `${remainingSeconds}s`
  if (!hours) return `${minutes}min ${remainingSeconds}s`
  if (!minutes) return `${hours}h ${remainingSeconds}s`
  return `${hours}h ${minutes}min ${remainingSeconds}s`
}

let socket = io.connect('http://localhost:2356')

const Main = () => {
  const [processes, setProcesses] = useState([])
  const [trackedApps, setTrackedApps] = useState([])
  const [trackingData, setTrackingData] = useState({})
  const [currentProject, setCurrentProject] = useState(null)
  const [isTracking, setIsTracking] = useState(false)
  const [isAlmostReady, setIsAlmostReady] = useState(false)
  const [isReady, setIsReady] = useState(false)

  const [inputValue, setInputValue] = useState('')
  const [trackingIntervalId, setTrackingIntervalId] = useState(null)
  const lastTimeToggle = useRef({ current: Date.now() })

  const lastInputTime = useRef({ current: Date.now() })
  const lastTrackTime = useRef({ current: Date.now() })
  useEffect(() => {
    return (() => {
      socket.on('connect', function () {
        socket.emit('join_room', 'input_events')
      })
      socket.on('keyboard_event', function () {
        lastInputTime.current.current = Date.now()
      })
      socket.on('mouse_event', function () {
        lastInputTime.current.current = Date.now()
      })
      socket.on('room_joined', function (message) {
        console.log(message)
      })
      const id = setTimeout(() => {
        setIsAlmostReady(true)
      }, 2000)
      return () => clearTimeout(id)
    })()
  }, [])

  useEffect(() => {
    ;(async () => {
      if (!isAlmostReady) return
      const processes = await getWindowsWithIcons()
      setProcesses(processes)
    })()
  }, [isAlmostReady])

  const handleCreateProject = (projectName, associatedApps) => {
    if (!projectName) {
      // Handle the case where projectName is not defined
      console.error('No project name defined')
      return
    }
    const matchingProjectKey =
      Object.keys(trackingData).find(
        (projectKey) => trackingData[projectKey].name === projectName
      ) || null

    if (matchingProjectKey)
      return setTrackingData((prevProjects) => {
        prevProjects[matchingProjectKey].apps = associatedApps
        return prevProjects
      })
    setTrackingData((prevProjects) => ({
      ...prevProjects,
      [projectName]: { name: projectName, toggled: true, apps: associatedApps }
    }))
    setTrackedApps([])
  }

  const loadData = async () => {
    const trackingData = await ipcRenderer.invoke('load-data')
    console.log('loaded data: ', trackingData)
    setTrackingData(trackingData)
  }

  const saveData = (trackingData) => {
    if (Object.keys(trackingData).length === 0) return
    console.log('saving data: ', trackingData)
    ipcRenderer.invoke('save-data', trackingData)
  }

  useEffect(() => {
    if (processes.length === 0) return
    loadData()
    setIsReady(true)
  }, [processes])

  const handleTrack = () => {
    if (isTracking) return // Don't start tracking if no process has been selected

    setIsTracking(true)

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
      if (Date.now() - lastInputTime.current.current > 1000 * 60 * 2) {
        if (lastInputTime.current.current < lastTrackTime.current.current) {
          setTrackingData((prevData) => {
            const matchingProjectsKeys = Object.keys(trackingData).filter(
              (projectKey) =>
                trackingData[projectKey].apps.find((app) => app.name === trackedApp.name) &&
                trackingData[projectKey].toggled
            )

            let newData = {}
            for (const projectName of matchingProjectsKeys) {
              const project = trackingData[projectName]
              const elapsedTime = prevData?.[projectName]?.elapsedTime || 0

              newData = {
                ...prevData,
                [projectName]: {
                  toggled: project.toggled || true,
                  elapsedTime: elapsedTime - (Date.now() - lastInputTime.current.current),
                  startDate: prevData[projectName]?.startDate || Date.now(),
                  endDate: Date.now(),
                  apps: project.apps || [],
                  trackingLogs: [
                    ...(prevData?.[projectName]?.trackingLogs || []),
                    {
                      name: activeApp,
                      startDate: prevData?.[projectName]?.app?.[activeApp]?.startDate,
                      elapsedTime:
                        Date.now() -
                        lastInputTime.current.current -
                        prevData?.[projectName]?.app?.[activeApp]?.startDate,

                      endDate: Date.now()
                    }
                  ]
                }
              }
            }
            saveData(newData) // save data through ipcRenderer
            return newData
          })
          lastTrackTime.current.current = lastInputTime.current.current
        }
        return
      }
      lastTrackTime.current.current = Date.now()
      setTrackingData((prevData) => {
        const matchingProjectsKeys = Object.keys(trackingData).filter(
          (projectKey) =>
            trackingData[projectKey].apps.find((app) => app.name === trackedApp.name) &&
            trackingData[projectKey].toggled
        )

        let newData = {}
        for (const projectName of matchingProjectsKeys) {
          const project = trackingData[projectName]
          const elapsedTime = prevData?.[projectName]?.elapsedTime || 0
          newData = {
            ...prevData,
            [projectName]: {
              toggled: project.toggled || true,
              elapsedTime: elapsedTime + 1000,
              apps: project.apps || [],
              startDate: prevData?.[projectName]?.startDate || Date.now(),
              trackingLogs: [
                ...(prevData?.[projectName]?.trackingLogs || []),
                {
                  name: activeApp,
                  startDate: Date.now()
                }
              ]
            }
          }
        }
        return newData
      })
    }, 1000)
    setTrackingIntervalId(intervalId)

    ipcRenderer.on('window-closed', () => {
      clearInterval(intervalId)
      setIsTracking(false)
    })
  }

  const handleStopTrack = () => {
    setIsTracking(false)
    clearInterval(trackingIntervalId)
  }

  const toggleProject = (projectName) => {
    setTrackingData((prevProjects) => {
      const projectsCopy = { ...prevProjects }
      const matchingProjectKey = Object.keys(prevProjects).find(
        (projectKey) => projectName === projectKey
      )
      const matchingProject = prevProjects[matchingProjectKey]

      if (matchingProject && Date.now() - lastTimeToggle.current.current < 100)
        projectsCopy[matchingProjectKey].toggled = !prevProjects[matchingProjectKey]?.toggled
      lastTimeToggle.current.current = Date.now()
      return projectsCopy
    })
  }
  return (
    <div className="container">
      {!isReady ? (
        <p>Loading...</p>
      ) : (
        <>
          <div className="d-inline space-between">
            <h2>Application Tracker</h2>
            {isTracking ? (
              <button onClick={handleStopTrack} className="bg-red">
                Stop Tracking
              </button>
            ) : (
              <button onClick={handleTrack} className="bg-green">
                Start Tracking
              </button>
            )}
          </div>
          <div className="features">
            <div className="feature-item project-settings">
              <section className="project-header">
                <h3>Add Project</h3>
                <input
                  onChange={(e) => setCurrentProject(e.target.value)}
                  type="text"
                  placeholder="Project Name"
                />

                <DataList
                  data={processes}
                  dataKey="name"
                  placeholder="Select apps to track ..."
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
                <div className="app-list">
                  {trackedApps.map((app, i) => (
                    <span key={i} className="app-item">
                      {app.name}
                    </span>
                  ))}
                </div>
              </section>
              <button
                onClick={() => {
                  if (!currentProject) return alert('Please enter a project name')
                  if (trackedApps.length === 0) return alert('Please select an app')
                  handleCreateProject(currentProject, trackedApps)
                }}
              >
                Create Project
              </button>
            </div>

            {Object.keys(trackingData).map((projectKey, i) => {
              const project = trackingData[projectKey]

              return (
                <div key={i} className="feature-item project-line">
                  <h3 className="ellipsis">
                    {`${projectKey} - ${convertSeconds(Math.round(project.elapsedTime / 1000))}`}
                    {
                      <span
                        className={`${
                          Date.now() - lastInputTime.current.current > 10000
                            ? 'red-dot'
                            : 'green-dot'
                        }`}
                      ></span>
                    }
                  </h3>
                  <div className="project">
                    <p className="ellipsis">
                      {project?.apps?.map((app) => app.name).join(', ') || ''}
                    </p>
                    <button
                      onClick={() => toggleProject(projectKey)}
                      className={project?.toggled ? 'bg-red' : 'bg-green'}
                    >
                      Toggle {project?.toggled ? 'Off' : 'On'}
                    </button>
                  </div>
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
