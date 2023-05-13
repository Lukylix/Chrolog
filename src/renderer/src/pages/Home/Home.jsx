import { useState, useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { stopTracking, toggleProject } from '../../stores/trackingData.js'
import { Link } from 'react-router-dom'
import { DataList } from '../../components/Datalist'
import HeaderTracking from '../../components/HeaderTracking/Headertracking.jsx'
import useTracking from '../../hooks/useTracking.js'
import { ReactComponent as EditIcon } from '../../assets/edit.svg'
import { setCurrentProject, setTrackedApps } from '../../stores/tracking.js'
import './home.css'
import Loader from '../../components/Loader/Loader.jsx'

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

  const { handleCreateProject, saveData, handleTrack } = useTracking()

  useEffect(() => {
    if (isTracking) handleTrack()
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

                    <DataList
                      data={processes}
                      dataKey="name"
                      placeholder="Select apps to track ..."
                      setSelecteds={(selecteds) => dispatch(setTrackedApps(selecteds(trackedApps)))}
                      onChange={setInputValue}
                      renderItem={(process, i, { onClick }) => {
                        return (
                          <div key={i}>
                            {process.icon && <img src={process.icon} alt={process.name} />}
                            <option
                              onClick={() => onClick(process)}
                              style={{
                                display: process.name
                                  ?.toLowerCase()
                                  .includes(inputValue.toLowerCase())
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
                              Date.now() - lastInputTime > 10000 && project.toggled
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
                        <button
                          onClick={() => {
                            dispatch(toggleProject({ projectName: projectKey }))
                            if (trackingData[projectKey].toggled) {
                              dispatch(stopTracking({ projectName: projectKey }))
                              saveData(trackingData)
                            }
                          }}
                          className={!project?.toggled || !isTracking ? 'bg-red' : 'bg-green'}
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
    </>
  )
}

export default Home
