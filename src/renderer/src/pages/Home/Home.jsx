import { useState } from 'react'
import { Link } from 'react-router-dom'
import HeaderTracking from '../../components/HeaderTracking/Headertracking.jsx'
import { ReactComponent as RemoveIcon } from '../../assets/close.svg'
import { ReactComponent as PowerIcon } from '../../assets/power.svg'
import './home.css'
import Loader from '../../components/Loader/Loader.jsx'
import DatalistProcesses from '../../components/DatalistProcesses/DatalistProcesses.jsx'

const prettyTime = (ms) => {
  const s = Math.floor(ms / 1000)
  const hours = Math.floor(s / 3600)
  const minutes = Math.floor((s - hours * 3600) / 60)
  const seconds = parseInt(s - hours * 3600 - minutes * 60)
  return `${hours ? hours + 'h' : ''} ${minutes ? minutes + 'm' : ''} ${seconds || 0 + 's'}`
}

import { trackingData, createProject, toggleProject } from '../../signals/trackingData.js'
import { processes } from '../../signals/processes.js'
import { lastInputTime, trackedApps, isTracking } from '../../signals/tracking.js'
import { currentProject } from '../../signals/currentProject.js'

const handleCreateProject = (projectName, associatedApps) => {
  if (!projectName) return console.error('No project name defined')
  createProject({
    projectName,
    projectData: { toggled: true, apps: associatedApps }
  })
}

const removeTrackedApp = (appName) => {
  trackedApps.value = trackedApps.value.filter((trackedApp) => trackedApp.name !== appName)
}

const Home = () => {
  return (
    <>
      <Loader />
      <div className="container">
        {processes.value.length > 0 && (
          <>
            <HeaderTracking />
            <div className="features">
              <div className="feature-item ">
                <div className="project-settings">
                  <section className="project-header">
                    <h3>Add Project</h3>
                    <input
                      onChange={(e) => (currentProject.value = e.target.value)}
                      type="text"
                      placeholder="Project Name"
                    />

                    <DatalistProcesses />
                  </section>
                  <button
                    onClick={() => {
                      if (!currentProject.value) return alert('Please enter a project name')
                      if (trackedApps.value.length === 0) return alert('Please select an app')
                      handleCreateProject(currentProject.value, trackedApps.value)
                    }}
                  >
                    Create Project
                  </button>
                </div>
                {trackedApps.value?.length > 0 && (
                  <div className="app-list">
                    {trackedApps.value.map((app, i) => (
                      <span key={i}>
                        {app.name}
                        <RemoveIcon
                          height="15px"
                          width="15px"
                          fill="white"
                          onClick={() => removeTrackedApp(app.name)}
                        />
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {trackingData.value &&
                Object.keys(trackingData.value).map((projectKey, i) => {
                  const project = trackingData.value[projectKey]

                  return (
                    <Link
                      to={`/project/${projectKey}`}
                      key={i}
                      className="feature-item project-line"
                    >
                      <h3 className="ellipsis">
                        {
                          <span
                            className={`${
                              (Date.now() - lastInputTime.value > 5000 && !!project.toggled) ||
                              !isTracking.value ||
                              !!!project.toggled
                                ? 'red-dot'
                                : 'green-dot'
                            }`}
                          ></span>
                        }
                        {`${projectKey} - ${prettyTime(project.elapsedTime)}`}
                      </h3>
                      <div className="project">
                        <p className="ellipsis">
                          {project?.apps?.map((app) => app.name).join(', ') || ''}
                        </p>

                        <PowerIcon
                          fill={project.toggled ? '#1AA68A' : '#FF6347'}
                          height="30px"
                          onClick={(e) => {
                            e.preventDefault()
                            e.stopPropagation()
                            // do only toggle project
                            toggleProject({ projectName: projectKey })
                          }}
                        />
                      </div>
                    </Link>
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
