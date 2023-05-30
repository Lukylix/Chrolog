import { useParams } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import {
  stopTracking,
  toggleProject,
  removeTrackedApp as removeTrackedAppAction,
  addTrackedApp,
  saveTrackingData
} from '../../stores/trackingData.js'
import { setTrackedApps, setCurrentProject } from '../../stores/tracking.js'
import HeaderTracking from '../../components/HeaderTracking/Headertracking.jsx'
import { DataList } from '../../components/Datalist/Datalist.jsx'
import ProjectBarCharts from '../../components/ProjectBarChart/ProjectBarChart.jsx'
import { memo, useCallback, useEffect, useMemo, useState } from 'react'
import { ReactComponent as RemoveIcon } from '../../assets/close.svg'
import { ReactComponent as ChevronDown } from '../../assets/chevron_down.svg'
import { ReactComponent as PowerIcon } from '../../assets/power.svg'
import Select from 'react-select'

import './project.css'
import Loader from '../../components/Loader/Loader.jsx'
const { ipcRenderer } = window.require('electron')

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

const operators = ['>', '>=', '<', '<=']

const TrackedApp = memo(({ app, appsColorMap }) => {
  return (
    <div className="tracked-app">
      <div
        className="app-color"
        style={{ backgroundColor: appsColorMap[app.name.toLowerCase()] }}
      />
      <h4>
        {app.name} - {convertMs(app.elapsedTime)}
      </h4>
      <p className="app-end">{convertDate(app.endDate)}</p>
    </div>
  )
})

const ProjectLine = memo(({ lastInputTime, project, isTracking, name, trackingData }) => {
  return (
    <div className="project-line-vertical">
      <div className="project-line-header d-inline">
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
        {project.toggled ? (
          <PowerIcon
            fill="#FF6347"
            height="30px"
            onClick={() => {
              dispatch(toggleProject({ projectName: name }))
              if (trackingData[name].toggled) {
                dispatch(stopTracking({ projectName: name }))
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
})

const ProjectSettings = memo(
  ({ currentProject, processes, setInputValue, inputValue, trackedApps }) => {
    const dispatch = useDispatch()
    return (
      <div className="project-settings project-settings-track">
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
                    display: process.name.includes(inputValue.toLowerCase()) ? 'block' : 'none'
                  }}
                >
                  {process.name}
                </option>
              </div>
            )
          }}
        />
        <button
          onClick={() => {
            if (!currentProject) return alert('Please enter a project name')
            if (trackedApps.length === 0) return alert('Please select an app')
            trackedApps.forEach((app) => {
              ipcRenderer.send('create-tracked-app', {
                appName: app.name,
                projectName: name
              })
            })
            dispatch(addTrackedApp({ projectName: currentProject, app }))
            dispatch(setTrackedApps([]))
          }}
        >
          {currentProject == name ? 'Modify' : 'Create'}
        </button>
      </div>
    )
  }
)

const ProjectApps = memo(({ trackedApps, appsColorMap, apps }) => {
  return (
    <div className="project" style={{ gridTemplateColumns: '1fr auto' }}>
      <div className="d-inline gap-10">
        {apps?.map((app, i) => (
          <span
            className="tracked-app-apps"
            style={{ backgroundColor: appsColorMap[app.name.toLowerCase()] }}
            key={i}
          >
            {app.name}
            <RemoveIcon
              height="15px"
              width="15px"
              fill="#272727"
              onClick={() => removeTrackedApp(app.name)}
            />
          </span>
        ))}
        {trackedApps?.map((app, i) => (
          <span
            className="tracked-app-apps"
            style={{ backgroundColor: appsColorMap[app.name.toLowerCase()] }}
            key={i}
          >
            {app.name}
            <RemoveIcon
              height="15px"
              width="15px"
              fill="#272727"
              onClick={() => removeTrackedApp(app.name)}
            />
          </span>
        ))}
      </div>
    </div>
  )
})

const ProjectFilters = memo(
  ({ setOperator, operators, setFilterValue, filterValue, setFilters, filters, removeFilter }) => {
    return (
      <div className="feature-item  gap-10">
        <h3 className="filter-elapsed-time">Filter elapsed time :</h3>
        <div className="gap-10 filter-header">
          <Select
            className="react-select-container operator"
            project
            classNamePrefix="react-select"
            unstyled
            placeholder="Opérator"
            data={operators}
            onChange={(val) => setOperator(val.value)}
            options={operators.map((val) => ({ label: val, value: val }))}
          />
          <input
            className="filter-input"
            type="text"
            placeholder="Value"
            onChange={(e) => setFilterValue(e.target.value)}
          />
          <button
            onClick={() => {
              if (!filterValue) return alert('Please enter a value')
              if (!operator) return alert('Please select an operator')
              setFilters([...filters, { operator, value: filterValue }])
            }}
          >
            Create filter
          </button>
        </div>
        <h3>Filters :</h3>
        <div className="filters d-inline gap-10">
          {filters.map((filter, i) => (
            <span key={i} className="filter">
              Time {filter.operator} {filter.value}
              <RemoveIcon height="15px" width="15px" fill="white" onClick={() => removeFilter(i)} />
            </span>
          ))}
        </div>
      </div>
    )
  }
)

const TrackedAppBar = memo(({ bar }) => {
  return <div className="event-bar" style={{ width: `${bar.load}%`, backgroundColor: bar.color }} />
})

export default function Project() {
  const { name } = useParams()
  const trackingData = useSelector((state) => state.trackingData)
  const project = trackingData[name]
  const currentProject = useSelector((state) => state.tracking.currentProject)
  const trackedApps = useSelector((state) => state.tracking.trackedApps)
  const processes = useSelector((state) => state.processes)
  const lastInputTime = useSelector((state) => state.tracking.lastInputTime)
  const isTracking = useSelector((state) => state.tracking.isTracking)
  const minLogSecs = useSelector((state) => state.settings.minLogSecs)
  const currentPeriod = useSelector((state) => state.tracking.currentPeriod)
  const [inputValue, setInputValue] = useState('')
  const [operator, setOperator] = useState('')
  const [filterValue, setFilterValue] = useState('')
  const [filters, setFilters] = useState([
    { operator: '>', value: 30 > minLogSecs ? 30 : minLogSecs }
  ])
  const [currentProjectTrackingData, setCurrentProjectTrackingData] = useState(project)

  const dispatch = useDispatch()

  const removeTrackedApp = useCallback((appName) => {
    dispatch(removeTrackedAppAction({ appName, projectName: name }))
    ipcRenderer.send('delete-tracked-app', { appName, projectName: name })
  }, [])

  const removeFilter = useCallback((index) => {
    setFilters(filters.filter((_, i) => i !== index))
  }, [])

  useEffect(() => {
    ;(async () => {
      const trackingData = await ipcRenderer.invoke('load-data', filters)
      setCurrentProjectTrackingData(trackingData[name])
    })()
  }, [filters])

  const uniqueApps = useMemo(() => {
    return [...new Set(project?.trackingLogs.map((log) => log.name.toLowerCase()))]
  }, [project?.trackingLogs])

  const appsColorMap = useMemo(() => {
    let appWithColorMap = {}
    for (const appKey in uniqueApps) {
      const app = uniqueApps[appKey]
      appWithColorMap[app.toLowerCase()] = pastelColors[appKey % pastelColors.length]
    }
    for (const appKey in project?.apps) {
      const app = project?.apps[appKey]
      appWithColorMap[app.name.toLowerCase()] = pastelColors[appKey % pastelColors.length]
    }
    return appWithColorMap
  }, [uniqueApps, project?.apps])

  const projectAppsSorted = useMemo(
    () =>
      [...(currentProjectTrackingData?.trackingLogs || [])]
        .sort((a, b) => b.endDate - a.endDate)
        .filter((log) => log?.endDate),
    [currentProjectTrackingData?.trackingLogs]
  )

  const projectAppsSortedFiltered = useMemo(
    () =>
      projectAppsSorted.filter(
        (log) => log?.startDate >= currentPeriod?.start && log?.endDate <= currentPeriod?.end
      ),
    [projectAppsSorted, currentPeriod]
  )

  const projectBars = useMemo(() => {
    let projectBars = [],
      isFirst = true
    let centPercent = projectAppsSorted.reduce((acc, log) => acc + log.elapsedTime, 0)
    const min = 0.005
    const max = 0.01
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
          load: space.toFixed(2),
          isSpace: true,
          name: log.name,
          color: 'transparent'
        })
      projectBars.push({
        load: ((log.elapsedTime / centPercent) * 100).toFixed(2),
        isSpace: false,
        name: log.name,
        color: appsColorMap[log.name.toLowerCase()]
      })
      isFirst = false
    }
    return projectBars
  }, [projectAppsSorted])

  useEffect(() => {
    dispatch(setCurrentProject(name))
    return () => {
      dispatch(setCurrentProject(''))
    }
  }, [])

  return (
    <>
      <Loader />
      <div className="container">
        {processes.length > 0 && (
          <>
            <HeaderTracking />
            <div className="features  project-features">
              <div className="feature-item">
                {currentProjectTrackingData && (
                  <ProjectLine
                    project={project}
                    lastInputTime={lastInputTime}
                    isTracking={isTracking}
                    name={name}
                    trackingData={trackingData}
                  />
                )}
                <ProjectSettings
                  currentProject={currentProject}
                  processes={processes}
                  setInputValue={setInputValue}
                  inputValue={inputValue}
                  trackedApps={trackedApps}
                />
                <ProjectApps
                  trackedApps={trackedApps}
                  appsColorMap={appsColorMap}
                  apps={project?.apps}
                />
              </div>
              <ProjectFilters
                setOperator={setOperator}
                operators={operators}
                setFilterValue={setFilterValue}
                filterValue={filterValue}
                setFilters={setFilters}
                filters={filters}
                removeFilter={removeFilter}
              />
              <div className="feature-item grid-fill">
                <h3>Tracked Events</h3>
                <div className="event-bars">
                  {projectBars.map((bar, i) => (
                    <TrackedAppBar key={i} bar={bar} appsColorMap={appsColorMap} />
                  ))}
                </div>
              </div>

              <div className="feature-item grid-fill">
                <ProjectBarCharts
                  appsColorMap={appsColorMap}
                  trackingLogs={project?.trackingLogs || []}
                />
              </div>

              <div className="feature-item grid-fill">
                <details>
                  <summary>
                    Tracked Events details
                    <ChevronDown height={'24px'} fill="white" />
                  </summary>
                  {projectAppsSortedFiltered.map((app, i) => (
                    <TrackedApp key={i} app={app} appsColorMap={appsColorMap} />
                  ))}
                </details>
              </div>
            </div>
          </>
        )}
      </div>
    </>
  )
}
