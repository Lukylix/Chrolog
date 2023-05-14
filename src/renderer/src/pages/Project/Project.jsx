import { useParams } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import { stopTracking, toggleProject } from '../../stores/trackingData.js'
import { setTrackedApps, setCurrentProject } from '../../stores/tracking.js'
import HeaderTracking from '../../components/HeaderTracking/Headertracking.jsx'
import { DataList } from '../../components/Datalist/Datalist.jsx'
import { useEffect, useMemo, useState } from 'react'
import useTracking from '../../hooks/useTracking.js'

import './project.css'
import Loader from '../../components/Loader/Loader.jsx'

const convertMs = (ms) => {
  isNaN(ms) && (ms = 0)
  const seconds = Math.floor(ms / 1000)
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const remainingSeconds = seconds % 60
  if (!hours && !minutes) return `${remainingSeconds}s`
  if (!hours) return `${minutes}min ${remainingSeconds}s`
  if (!minutes) return `${hours}h ${remainingSeconds}s`
  return `${hours}h ${minutes}min ${remainingSeconds}s`
}
const convertDate = (date) => {
  let d
  if (typeof date === 'string') d = new Date(parseInt(date))
  else if (!date) return
  else d = new Date(date)

  return `${d.getDate()}/${d.getMonth() + 1} ${d.getHours()}:${d.getMinutes()}`
}

let pastelColors = [
  '#8BB9DD',
  '#EFD469',
  '#7EBF80',
  '#967BB6',
  '#FFB085',
  '#9BE1B2',
  '#C4C4ED',
  '#FF6347',
  '#00C5CD',
  '#FF9AA2'
]

export default function Project() {
  const { name } = useParams()
  const trackingData = useSelector((state) => state.trackingData)
  const project = trackingData[name]
  const isReady = useSelector((state) => state.tracking.isReady)
  const currentProject = useSelector((state) => state.tracking.currentProject)
  const trackedApps = useSelector((state) => state.tracking.trackedApps)
  const processes = useSelector((state) => state.processes)
  const lastInputTime = useSelector((state) => state.tracking.lastInputTime)
  const isTracking = useSelector((state) => state.tracking.isTracking)
  const [inputValue, setInputValue] = useState('')

  const appsColorMap = useMemo(() => {
    let appWithColorMap = {}
    for (const appKey in project.apps) {
      const app = project.apps[appKey]
      appWithColorMap[app.name] = pastelColors[appKey % pastelColors.length]
    }
    return appWithColorMap
  }, [project?.apps])

  useEffect(() => {
    console.log(appsColorMap)
  }, [appsColorMap])

  const projectAppsSorted = [...(project?.trackingLogs || [])]
    .sort((a, b) => b.endDate - a.endDate)
    .filter((log) => log?.endDate)

  const projectBars = useMemo(() => {
    let projectBars = [],
      isFirst = true
    let centPercent = projectAppsSorted.reduce((acc, log) => acc + log.elapsedTime, 0)
    const min = 0.005
    const max = 0.1
    const inputMax = 100
    const inputMin = 0
    let scaled =
      ((max - min) /
        (inputMax < projectAppsSorted.length ? projectAppsSorted.length : inputMax - inputMin)) *
        (projectAppsSorted.length - inputMin) +
      min
    const spacePercent = (projectAppsSorted.length - 1) * centPercent * scaled
    centPercent = centPercent + spacePercent
    const space = (spacePercent / (projectAppsSorted.length - 1) / centPercent) * 100
    for (const log of projectAppsSorted) {
      if (!isFirst)
        projectBars.push({
          load: space.toFixed(3),
          isSpace: true,
          name: log.name,
          color: 'transparent'
        })
      projectBars.push({
        load: ((log.elapsedTime / centPercent) * 100).toFixed(5),
        isSpace: false,
        name: log.name,
        color: appsColorMap[log.name]
      })
      isFirst = false
    }
    return projectBars
  }, [projectAppsSorted])

  const { handleCreateProject, saveData, handleTrack } = useTracking()

  useEffect(() => {
    dispatch(setCurrentProject(name))
    dispatch(setTrackedApps(project.apps))
    return () => {
      dispatch(setCurrentProject(''))
      dispatch(setTrackedApps([]))
    }
  }, [])

  useEffect(() => {
    if (isTracking) handleTrack()
  }, [])
  const dispatch = useDispatch()

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
                    <h3>Project</h3>
                    <input
                      onChange={(e) => dispatch(setCurrentProject(e.target.value))}
                      type="text"
                      placeholder="Project Name"
                      value={currentProject}
                    />

                    <DataList
                      data={processes}
                      dataKey="name"
                      placeholder="Select apps to track ..."
                      onChange={setInputValue}
                      setSelecteds={(selecteds) => dispatch(setTrackedApps(selecteds(trackedApps)))}
                      renderItem={(process, i, { onClick }) => {
                        return (
                          <div key={i}>
                            {process.icon && <img src={process.icon} alt={process.name} />}
                            <option
                              onClick={() => onClick(process)}
                              style={{
                                display: process.name.includes(inputValue.toLowerCase())
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
                    {currentProject == name ? 'Modify' : 'Create'}
                  </button>
                </div>
                {project && (
                  <div className="feature-item project-line">
                    <h3 className="ellipsis">
                      {
                        <span
                          className={`${
                            (Date.now() - lastInputTime > 10000 && project.toggled) || !isTracking
                              ? 'red-dot'
                              : 'green-dot'
                          }`}
                        ></span>
                      }
                      {`${name} - ${convertMs(project.elapsedTime)}`}
                    </h3>
                    <div className="project" style={{ gridTemplateColumns: '1fr auto' }}>
                      <p className="ellipsis">
                        {project?.apps?.map((app) => app.name).join(', ') || ''}
                      </p>
                      <button
                        onClick={() => {
                          dispatch(toggleProject({ projectName: name }))
                          if (project.toggled) {
                            dispatch(stopTracking({ projectName: name }))
                            saveData(trackingData)
                          }
                        }}
                        className={project?.toggled ? 'bg-red' : 'bg-green'}
                      >
                        Toggle {project?.toggled ? 'Off' : 'On'}
                      </button>
                    </div>
                  </div>
                )}
                <div className="feature-item">
                  <h3>Tracked Events</h3>
                  <h4>Project events over time</h4>
                  <div className="event-bars">
                    {projectBars.map((bar, i) => (
                      <div
                        key={i}
                        className="event-bar"
                        style={{ width: `${bar.load}%`, backgroundColor: bar.color }}
                      />
                    ))}
                  </div>

                  {projectAppsSorted.map((app, i) => (
                    <div key={i} className="tracked-app">
                      <div
                        className="app-color"
                        style={{ backgroundColor: appsColorMap[app.name] }}
                      />
                      <h4>
                        {app.name} - {convertMs(app.elapsedTime)}
                      </h4>
                      <p className="app-end">{convertDate(app.endDate)}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </>
  )
}
