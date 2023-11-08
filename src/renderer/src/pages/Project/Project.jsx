import { useParams } from 'react-router-dom'

import HeaderTracking from '../../components/HeaderTracking/Headertracking.jsx'
import ProjectBarCharts from '../../components/ProjectBarChart/ProjectBarChart.jsx'
import DataListProcesses from '../../components/DatalistProcesses/DatalistProcesses.jsx'
import { memo, useEffect } from 'react'
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

import { lastInputTime, currentPeriod, trackedApps, isTracking } from '../../signals/tracking.js'
import {
  trackingData,
  removeTrackedApp,
  addTrackedApp,
  removeTrackingLog
} from '../../signals/trackingData.js'
import { toggleProject } from '../../signals/trackingData.js'
import {
  trackingLogsSortedFiltered,
  filters,
  currentProject,
  appsColorMap,
  currentProjectName,
  projectBars,
  trackingLogsPaginated,
  currentPage,
  operator,
  filter
} from '../../signals/currentProject.js'
import { processes } from '../../signals/processes.js'
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

const operators = ['>', '>=', '<', '<=']

const TrackedApp = memo(({ app, removeTrackingLog }) => {
  return (
    <div className="tracked-app">
      <div
        className="app-color"
        style={{ backgroundColor: appsColorMap.value[app.name.toLowerCase()] }}
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

const ProjectLine = memo(() => {
  return (
    <div className="project-line-vertical">
      <div className="project-line-header d-inline">
        <h3 className="ellipsis">
          {
            <span
              className={`${
                (Date.now() - lastInputTime.value > 10000 && currentProject.value.toggled) ||
                !isTracking.value ||
                !currentProject.value.toggled
                  ? 'red-dot'
                  : 'green-dot'
              }`}
            ></span>
          }
          {`${currentProjectName} - ${prettyTime(currentProject.value.elapsedTime)}`}
        </h3>

        <PowerIcon
          fill={currentProject.value.toggled ? '#1AA68A' : '#FF6347'}
          height="30px"
          onClick={() => {
            toggleProject({ projectName: currentProjectName.value })
          }}
        />
      </div>
    </div>
  )
})

const ProjectSettings = memo(({}) => {
  const { name } = useParams()
  return (
    <div className="project-settings project-settings-track">
      <DataListProcesses />
      <button
        onClick={() => {
          if (!currentProject.value) return alert('Please enter a project name')
          if (trackedApps.value.length === 0) return alert('Please select an app')
          trackedApps.value.forEach((app) => {
            ipcRenderer.send('create-tracked-app', {
              appName: app.name,
              projectName: currentProjectName.value
            })
            addTrackedApp({ projectName: currentProjectName.value, app })
          })

          trackedApps.value = []
        }}
      >
        Save
      </button>
    </div>
  )
})

const ProjectApps = memo(() => {
  const apps = currentProject.value.apps
  return (
    <div className="project" style={{ gridTemplateColumns: '1fr auto' }}>
      <div className="d-inline inline-gap-10">
        {apps?.map((app, i) => (
          <span
            className="tracked-app-apps"
            style={{
              backgroundColor: appsColorMap.value[app.name.toLowerCase()],
              width: 'max-content'
            }}
            key={i}
          >
            {app.name}
            <RemoveIcon
              className="cross-icon"
              height="15px"
              width="15px"
              fill="#272727"
              onClick={() => removeTrackedAppCall(app.name)}
            />
          </span>
        ))}
        {trackedApps.value?.map((app, i) => (
          <span
            className="tracked-app-apps"
            style={{
              backgroundColor: appsColorMap.value[app.name.toLowerCase()],
              width: 'max-content'
            }}
            key={i}
          >
            {app.name}
            <RemoveIcon
              className="cross-icon"
              height="15px"
              width="15px"
              fill="#272727"
              onClick={() => removeTrackedAppCall(app.name)}
            />
          </span>
        ))}
      </div>
    </div>
  )
})

const ProjectFilters = memo(() => {
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
          onChange={(val) => (operator.value = val.value)}
          options={operators.map((val) => ({ label: val, value: val }))}
        />
        <input
          className="filter-input"
          type="text"
          placeholder="Time value"
          onChange={(e) => (filter.value = e.target.value)}
        />
        <button
          onClick={() => {
            if (!filter.value) return alert('Please enter a value')
            if (!operator.value) return alert('Please select an operator')
            filters.value = [...filters.value, { operator: operator.value, value: filter.value }]
          }}
        >
          Create filter
        </button>
      </div>
      <h3>Filters :</h3>
      <div className="filters d-inline gap-10">
        {filters.value.map((filter, i) => (
          <span key={i} className="filter">
            Time {filter.operator} {filter.value}
            <RemoveIcon height="15px" width="15px" fill="white" onClick={() => removeFilter(i)} />
          </span>
        ))}
      </div>
    </div>
  )
})

const TrackedAppBar = memo(({ bar }) => {
  return <div className="event-bar" style={{ width: `${bar.load}%`, backgroundColor: bar.color }} />
})

const TrackedAppsOverview = memo(() => {
  return (
    <div className="feature-item grid-fill">
      <h3>App's usage overview</h3>
      <div className="event-bars">
        {projectBars.value.map((bar, i) => (
          <TrackedAppBar key={i} bar={bar} />
        ))}
      </div>
    </div>
  )
})

const removeTrackingLogCallback = (trackingLog) => {
  removeTrackingLog({ ...trackingLog, projectName: currentProjectName })
  ipcRenderer.send('delete-tracking-log', { ...trackingLog, projectName: currentProjectName })
}

const TrackedEventsDetails = memo(() => {
  return (
    <div className="feature-item grid-fill">
      <details>
        <summary>
          Tracked events details
          <ChevronDown height={'24px'} fill="white" />
        </summary>

        {trackingLogsPaginated.value.map((app, i) => (
          <TrackedApp key={i} app={app} removeTrackingLog={removeTrackingLogCallback} />
        ))}
        {trackingLogsPaginated.value.length === 0 && (
          <p className="no-data">
            No data to display. Please select another period using the graph controls.
          </p>
        )}
        <div className="pagination">
          <ChevronLeft
            fill="white"
            onClick={() =>
              (currentPage.value =
                currentPage.value > 1 ? currentPage.value - 1 : currentPage.value)
            }
          />
          <span className="page-number">{currentPage}</span>
          <ChevronRight
            fill="white"
            onClick={() =>
              (currentPage.value =
                trackingLogsPaginated.value.length < 10 ? currentPage.value : currentPage.value + 1)
            }
          />
        </div>
      </details>
    </div>
  )
})

const removeFilter = (index) => {
  filters.value = filters.value.filter((_, i) => i !== index)
}

const removeTrackedAppCall = (appName) => {
  removeTrackedApp({ appName, projectName: currentProjectName.value })
  ipcRenderer.send('delete-tracked-app', { appName, projectName: currentProjectName.value })
}

export default function Project() {
  const { name } = useParams()
  useEffect(() => {
    currentProjectName.value = name
  }, [])
  return (
    <>
      <Loader />
      <div className="container">
        {processes.value.length > 0 && (
          <>
            <HeaderTracking />
            <div className="features  project-features">
              <div className="feature-item">
                <ProjectLine />
                <ProjectSettings />
                <ProjectApps />
              </div>
              <ProjectFilters />
              <TrackedAppsOverview />

              <div className="feature-item grid-fill">
                <ProjectBarCharts />
              </div>
              <TrackedEventsDetails />
            </div>
          </>
        )}
      </div>
    </>
  )
}
