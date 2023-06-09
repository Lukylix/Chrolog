import { useState, useEffect, useCallback } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { createProject, stopTracking, toggleProject } from '../../stores/trackingData.js'
import { Link } from 'react-router-dom'
import { DataList } from '../../components/Datalist/Datalist.jsx'
import HeaderTracking from '../../components/HeaderTracking/Headertracking.jsx'
import { ReactComponent as EditIcon } from '../../assets/edit.svg'
import { ReactComponent as RemoveIcon } from '../../assets/close.svg'
import { ReactComponent as PowerIcon } from '../../assets/power.svg'
import { setCurrentProject, setTrackedApps } from '../../stores/tracking.js'
import './home.css'
import Loader from '../../components/Loader/Loader.jsx'
import DatalistProcesses from '../../components/DatalistProcesses/DatalistProcesses.jsx'

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

const Home = () => {
  const trackingData = useSelector((state) => state.trackingData)
  const processes = useSelector((state) => state.processes)
  const lastInputTime = useSelector((state) => state.tracking.lastInputTime)
  const trackedApps = useSelector((state) => state.tracking.trackedApps)
  const currentProject = useSelector((state) => state.tracking.currentProject)
  const isTracking = useSelector((state) => state.tracking.isTracking)

  const [inputValue, setInputValue] = useState('')
  const dispatch = useDispatch()

  const handleCreateProject = useCallback((projectName, associatedApps) => {
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
  }, [])

  const removeTrackedApp = useCallback((appName) => {
    dispatch(setTrackedApps(trackedApps.filter((trackedApp) => trackedApp.name !== appName)))
  }, [])

  return (
    <>
      <Loader />
      <div className="container">
        {processes.length > 0 && (
          <>
            <HeaderTracking />
            <div className="features">
              <div className="feature-item ">
                <div className="project-settings">
                  <section className="project-header">
                    <h3>Add Project</h3>
                    <input
                      onChange={(e) => dispatch(setCurrentProject(e.target.value))}
                      type="text"
                      placeholder="Project Name"
                    />

                    <DatalistProcesses inputValue={inputValue} setInputValue={setInputValue} />
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
                <div className="app-list">
                  {trackedApps.map((app, i) => (
                    <span key={i}>
                      {app.name}
                      <RemoveIcon
                        height="15px"
                        width="15px"
                        fill="white"
                        onClick={() => removeTrackedApp(app.name)}
                      />
                      {trackedApps.length - 1 > i && ', '}
                    </span>
                  ))}
                </div>
              </div>

              {trackingData &&
                Object.keys(trackingData).map((projectKey, i) => {
                  const project = trackingData[projectKey]

                  return (
                    <div key={i} className="feature-item project-line">
                      <h3 className="ellipsis">
                        {
                          <span
                            className={`${
                              (Date.now() - lastInputTime > 10000 && project.toggled) ||
                              !isTracking ||
                              !project.toggled
                                ? 'red-dot'
                                : 'green-dot'
                            }`}
                          ></span>
                        }
                        {`${projectKey} - ${convertSeconds(
                          Math.round(project.elapsedTime / 1000)
                        )}`}
                      </h3>
                      <div className="project" style={{ gridTemplateColumns: '1fr auto auto' }}>
                        <p className="ellipsis">
                          {project?.apps?.map((app) => app.name).join(', ') || ''}
                        </p>
                        <Link to={`/project/${projectKey}`}>
                          <EditIcon fill="white" />
                        </Link>
                        {project?.toggled ? (
                          <PowerIcon
                            fill="#FF6347"
                            height="30px"
                            onClick={() => {
                              dispatch(toggleProject({ projectName: projectKey }))
                              if (trackingData[projectKey].toggled) {
                                dispatch(stopTracking({ projectName: projectKey }))
                              }
                            }}
                          />
                        ) : (
                          <PowerIcon
                            fill="#1AA68A"
                            height="30px"
                            onClick={() => {
                              dispatch(toggleProject({ projectName: projectKey }))
                              if (trackingData[projectKey].toggled) {
                                dispatch(stopTracking({ projectName: projectKey }))
                              }
                            }}
                          />
                        )}
                      </div>
                    </div>
                  )
                })}
            </div>
          </>
        )}
      </div>
    </>
  )
}

export default Home
