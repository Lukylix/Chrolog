import { useParams } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import {
  stopTracking,
  toggleProject,
  removeTrackedApp as removeTrackedAppAction,
  addTrackedApp,
  saveTrackingData,
  removeTrackingLog
} from '../../stores/trackingData.js'
import { setTrackedApps, setCurrentProject } from '../../stores/tracking.js'
import HeaderTracking from '../../components/HeaderTracking/Headertracking.jsx'
import { DataList } from '../../components/Datalist/Datalist.jsx'
import ProjectBarCharts from '../../components/ProjectBarChart/ProjectBarChart.jsx'
import DataListProcesses from '../../components/DatalistProcesses/DatalistProcesses.jsx'
import { memo, useCallback, useEffect, useMemo, useState } from 'react'
import { ReactComponent as RemoveIcon } from '../../assets/close.svg'
import { ReactComponent as DeleteIcon } from '../../assets/delete.svg'
import { ReactComponent as ChevronDown } from '../../assets/chevron_down.svg'
import { ReactComponent as PowerIcon } from '../../assets/power.svg'
import { ReactComponent as ChevronRight } from '../../assets/chevron_right.svg'
import { ReactComponent as ChevronLeft } from '../../assets/chevron_left.svg'
import Select from 'react-select'

import './project.css'
import Loader from '../../components/Loader/Loader.jsx'
const { ipcRenderer } = window.require('electron')

const prettyTime = (ms) => {
  const s = Math.floor(ms / 1000)
  const hours = Math.floor(s / 3600)
  const minutes = Math.floor((s - hours * 3600) / 60)
  const seconds = parseInt(s - hours * 3600 - minutes * 60)
  return `${hours ? hours + 'h' : ''} ${minutes ? minutes + 'm' : ''} ${seconds || 0 + 's'}`
}
const convertDate = (date) => {
  let d
  if (typeof date === 'string') d = new Date(parseInt(date))
  else if (!date) return
  else d = new Date(date)

  return `${d.getDate()}/${d.getMonth() + 1} ${d.getHours()}h${d.getMinutes()}`
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

const TrackedApp = memo(({ app, appsColorMap, removeTrackingLog }) => {
  return (
    <div className="tracked-app">
      <div
        className="app-color"
        style={{ backgroundColor: appsColorMap[app.name.toLowerCase()] }}
      />
      <h4>
        {app.name} - {prettyTime(app.elapsedTime)}
      </h4>
      <div className="d-inline flex-end">
        <p>{convertDate(app.startDate)}</p>
        <DeleteIcon
          className="remove-icon"
          height="20px"
          width="20px"
          fill="white"
          onClick={() => removeTrackingLog(app)}
        />
      </div>
    </div>
  )
})

const ProjectLine = memo(({ project, isTracking, name, trackingData }) => {
  const dispatch = useDispatch()
  const lastInputTime = useSelector((state) => state.tracking.lastInputTime)

  return (
    <div className="project-line-vertical">
      <div className="project-line-header d-inline">
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
          {`${name} - ${prettyTime(project.elapsedTime)}`}
        </h3>

        <PowerIcon
          fill={project.toggled ? '#1AA68A' : '#FF6347'}
          height="30px"
          onClick={() => {
            dispatch(toggleProject({ projectName: name }))
            if (trackingData[name].toggled) {
              dispatch(stopTracking({ projectName: name }))
            }
          }}
        />
      </div>
    </div>
  )
})

const ProjectSettings = memo(
  ({ currentProject, processes, setInputValue, inputValue, trackedApps }) => {
    const dispatch = useDispatch()
    const { name } = useParams()
    return (
      <div className="project-settings project-settings-track">
        {/* <input
          onChange={(e) => dispatch(setCurrentProject(e.target.value))}
          type="text"
          placeholder="Project Name"
          value={currentProject}
        /> */}
        <DataListProcesses inputValue={inputValue} setInputValue={setInputValue} />
        <button
          onClick={() => {
            if (!currentProject) return alert('Please enter a project name')
            if (trackedApps.length === 0) return alert('Please select an app')
            trackedApps.forEach((app) => {
              ipcRenderer.send('create-tracked-app', {
                appName: app.name,
                projectName: name
              })
              dispatch(addTrackedApp({ projectName: currentProject, app }))
            })

            dispatch(setTrackedApps([]))
          }}
        >
          Save
        </button>
      </div>
    )
  }
)

const ProjectApps = memo(({ trackedApps, appsColorMap, apps, removeTrackedApp = () => {} }) => {
  return (
    <div className="project" style={{ gridTemplateColumns: '1fr auto' }}>
      <div className="d-inline inline-gap-10">
        {apps?.map((app, i) => (
          <span
            className="tracked-app-apps"
            style={{ backgroundColor: appsColorMap[app.name.toLowerCase()], width: 'max-content' }}
            key={i}
          >
            {app.name}
            <RemoveIcon
              className="cross-icon"
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
            style={{ backgroundColor: appsColorMap[app.name.toLowerCase()], width: 'max-content' }}
            key={i}
          >
            {app.name}
            <RemoveIcon
              className="cross-icon"
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
  ({
    setOperator,
    operators,
    operator,
    setFilterValue,
    filterValue,
    setFilters,
    filters,
    removeFilter
  }) => {
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
            placeholder="Time value"
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

const getSpaceAndCentPercent = (projectApps) => {
  let centPercent = projectApps.reduce((acc, log) => acc + log.elapsedTime, 0)
  const min = 0.005
  const max = 0.01
  const inputMax = 100
  const inputMin = 0
  let scaled =
    ((max - min) / (inputMax < projectApps.length ? projectApps.length : inputMax - inputMin)) *
      (projectApps.length - inputMin) +
    min
  const spacePercent = (projectApps.length - 1) * centPercent * scaled
  centPercent = centPercent + spacePercent
  const space = (spacePercent / (projectApps.length - 1) / centPercent) * 100
  return { space, centPercent }
}

const projectLogsFusion = (trackingLogs) => {
  let projectAppsFusion = []
  let fusionIndex = 0
  for (let i = 1; i < trackingLogs.length; i++) {
    const log = trackingLogs[i]
    const previousLog = trackingLogs[i - 1]
    if (log.name !== previousLog.name) {
      let fusion = [...trackingLogs].splice(fusionIndex, i - fusionIndex)
      projectAppsFusion.push(
        fusion.reduce(
          (acc, log) => ({
            ...log,
            ...acc,
            elapsedTime: acc.elapsedTime + log.endDate - log.startDate
          }),
          { elapsedTime: 0 }
        )
      )
      fusionIndex = i
    }
  }
  return projectAppsFusion
}

const TrackedAppsOverview = memo(({ trackingLogs, appsColorMap }) => {
  const projectBars = useMemo(() => {
    let projectBars = []
    let isFirst = true
    const projectAppsFusionedTemp = projectLogsFusion(trackingLogs)
    const { centPercent: centPercentTemp } = getSpaceAndCentPercent(projectAppsFusionedTemp)
    const newProjectApps = projectAppsFusionedTemp.filter(
      (log) => (log.elapsedTime / centPercentTemp) * 100 > 0.1
    )
    const newProjectAppsFusioned = projectLogsFusion(newProjectApps)
    const { centPercent, space } = getSpaceAndCentPercent(newProjectAppsFusioned)

    for (const log of newProjectAppsFusioned) {
      if (!isFirst) {
        projectBars.push({
          load: space.toFixed(2),
          isSpace: true,
          name: log.name,
          color: 'transparent'
        })
      }
      projectBars.push({
        load: ((log.elapsedTime / centPercent) * 100).toFixed(2),
        isSpace: false,
        name: log.name,
        color: appsColorMap[log.name.toLowerCase()]
      })
      isFirst = false
    }
    return projectBars
  }, [trackingLogs])

  return (
    <div className="feature-item grid-fill">
      <h3>App's usage overview</h3>
      <div className="event-bars">
        {projectBars.map((bar, i) => (
          <TrackedAppBar key={i} bar={bar} appsColorMap={appsColorMap} />
        ))}
      </div>
    </div>
  )
})

const TrackedEventsDetails = memo(({ trackingLogs, appsColorMap, filters }) => {
  const currentPeriod = useSelector((state) => state.tracking.currentPeriod)
  const trackingData = useSelector((state) => state.trackingData)
  const [currentPage, setCurrentPage] = useState(1)
  const trackingLogsSortedFiltered = useMemo(
    () =>
      trackingLogs
        .filter(
          (log) => log?.startDate >= currentPeriod?.start && log?.endDate <= currentPeriod?.end
        )
        .filter((log) => {
          for (const filter of filters) {
            switch (filter.operator) {
              case '>':
                if (log.endDate - log.startDate < filter.value * 1000) return false
                break
              case '>=':
                if (log.endDate - log.startDate <= filter.value * 1000) return false
                break
              case '<':
                if (log.endDate - log.startDate > filter.value * 1000) return false
                break
              case '<=':
                if (log.endDate - log.startDate >= filter.value * 1000) return false
                break
            }
          }
          return log.startDate && log.endDate
        }),
    [trackingLogs, currentPeriod]
  )

  const { name } = useParams()
  const trackingLogsPaginated = useMemo(
    () => [...trackingLogsSortedFiltered].splice((currentPage - 1) * 10, currentPage * 10),
    [currentPage, trackingLogsSortedFiltered]
  )
  const dispatch = useDispatch()
  const removeTrackingLogCallback = useCallback(
    (trackingLog) => {
      dispatch(removeTrackingLog({ ...trackingLog, projectName: name }))
      ipcRenderer.send('delete-tracking-log', { ...trackingLog, projectName: name })
    },
    [trackingData]
  )

  return (
    <div className="feature-item grid-fill">
      <details>
        <summary>
          Tracked events details
          <ChevronDown height={'24px'} fill="white" />
        </summary>

        {trackingLogsPaginated.map((app, i) => (
          <TrackedApp
            key={i}
            app={app}
            appsColorMap={appsColorMap}
            removeTrackingLog={removeTrackingLogCallback}
          />
        ))}
        {trackingLogsPaginated.length === 0 && (
          <p className="no-data">
            No data to display. Please select another period using the graph controls.
          </p>
        )}
        <div className="pagination">
          <ChevronLeft
            fill="white"
            onClick={() => setCurrentPage((prev) => (prev > 1 ? prev - 1 : prev))}
          />
          <span className="page-number">{currentPage}</span>
          <ChevronRight fill="white" onClick={() => setCurrentPage((prev) => prev + 1)} />
        </div>
      </details>
    </div>
  )
})

export default function Project() {
  const { name } = useParams()
  const trackingData = useSelector((state) => state.trackingData)
  const project = useSelector((state) => state.trackingData[name])
  const trackedApps = useSelector((state) => state.tracking.trackedApps)
  const processes = useSelector((state) => state.processes)
  const isTracking = useSelector((state) => state.tracking.isTracking)
  const minLogSecs = useSelector((state) => state.settings.minLogSecs)

  const [inputValue, setInputValue] = useState('')
  const [operator, setOperator] = useState('')
  const [filterValue, setFilterValue] = useState('')
  const [filters, setFilters] = useState([
    { operator: '>', value: 30 > minLogSecs ? 30 : minLogSecs }
  ])

  const currentProject = useSelector((state) => state.trackingData[name])

  const dispatch = useDispatch()

  const removeTrackedApp = useCallback((appName) => {
    dispatch(removeTrackedAppAction({ appName, projectName: name }))
    ipcRenderer.send('delete-tracked-app', { appName, projectName: name })
  }, [])

  const removeFilter = useCallback((index) => {
    setFilters(filters.filter((_, i) => i !== index))
  }, [])

  const allApps = useMemo(
    () =>
      [
        ...new Set([
          ...(project?.trackingLogs || []).map((log) => log.name.toLowerCase()),
          ...(project?.apps.map((app) => app.name.toLowerCase()) || []),
          ...(trackedApps.map((app) => app.name.toLowerCase()) || [])
        ])
      ].filter((app) => !!app),
    [project?.trackingLogs, project?.apps, trackedApps]
  )

  const appsColorMap = useMemo(() => {
    let appWithColorMap = {}
    for (const appKey in allApps) {
      const app = allApps[appKey]
      appWithColorMap[app.toLowerCase()] = pastelColors[appKey % pastelColors.length]
    }
    return appWithColorMap
  }, [allApps])

  const trackingLogsEnded = useMemo(
    () => (currentProject?.trackingLogs || []).filter((log) => log?.endDate),
    [currentProject?.trackingLogs]
  )

  const trackingLogsSorted = useMemo(
    () => trackingLogsEnded.sort((a, b) => b.endDate - a.endDate),
    [currentProject?.trackingLogsEnded]
  )

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
                <ProjectLine
                  project={project}
                  isTracking={isTracking}
                  name={name}
                  trackingData={trackingData}
                />

                <ProjectSettings
                  currentProject={name}
                  processes={processes}
                  setInputValue={setInputValue}
                  inputValue={inputValue}
                  trackedApps={trackedApps}
                />
                <ProjectApps
                  trackedApps={trackedApps}
                  appsColorMap={appsColorMap}
                  apps={project?.apps}
                  removeTrackedApp={removeTrackedApp}
                />
              </div>
              <ProjectFilters
                setOperator={setOperator}
                operators={operators}
                operator={operator}
                setFilterValue={setFilterValue}
                filterValue={filterValue}
                setFilters={setFilters}
                filters={filters}
                removeFilter={removeFilter}
              />
              <TrackedAppsOverview trackingLogs={trackingLogsSorted} appsColorMap={appsColorMap} />

              <div className="feature-item grid-fill">
                <ProjectBarCharts appsColorMap={appsColorMap} projectName={name} />
              </div>
              <TrackedEventsDetails
                trackingLogs={trackingLogsSorted}
                appsColorMap={appsColorMap}
                filters={filters}
              />
            </div>
          </>
        )}
      </div>
    </>
  )
}
