import sqlite3 from 'sqlite3'
import { app } from 'electron'
import { join } from 'path'
import fs from 'fs'

const { Database } = sqlite3
const appDataPath = app.getPath('appData')
const dirPath = join(appDataPath, 'Chrolog/storage')

// Check if the directory exists, if not create it
if (!fs.existsSync(dirPath)) {
  fs.mkdirSync(dirPath, { recursive: true })
}

const dbPath = join(dirPath, 'tracking.sqlite')
const db = new Database(dbPath)

export function run(query, params = []) {
  return new Promise((resolve, reject) => {
    db.run(query, params, function (err) {
      if (err) return reject(err)
      resolve(this)
    })
  })
}

export async function saveDataListener(event, trackingData) {
  // Create table for project data if it doesn't exist
  await run(
    'CREATE TABLE if not exists project_data (name TEXT, toggled BOOLEAN, elapsedTime INTEGER, startDate INTEGER, endDate INTEGER)'
  )

  // Create table for app data if it doesn't exist
  await run('CREATE TABLE if not exists app_data (projectName TEXT, appName TEXT)')

  // Create table for tracking data if it doesn't exist
  await run(
    'CREATE TABLE if not exists tracking_data (id INTEGER PRIMARY KEY AUTOINCREMENT, projectName TEXT, appName TEXT, elapsedTime INTEGER, startDate INTEGER, endDate INTEGER)'
  )

  const selectProjectSql = `SELECT * FROM project_data WHERE name = ?`
  const updateProjectSql = `UPDATE project_data SET toggled = ?, elapsedTime = ?, startDate = ?, endDate = ? WHERE name = ?`
  const insertProjectSql = `INSERT INTO project_data (name, toggled, elapsedTime, startDate, endDate) VALUES (?, ?, ?, ?, ?)`

  const selectAppSql = `SELECT * FROM app_data WHERE projectName = ? AND appName = ?`
  const insertAppSql = `INSERT INTO app_data (projectName, appName) VALUES (?, ?)`

  const selectTrackingSql = `SELECT * FROM tracking_data WHERE logId = ?`
  const updateTrackingSql = `UPDATE tracking_data SET elapsedTime = ?, startDate = ?, endDate = ? WHERE logId = ?`
  const insertTrackingSql = `INSERT INTO tracking_data (projectName, appName, elapsedTime, startDate, endDate) VALUES (?, ?, ?, ?, ?)`

  for (const projectName of Object.keys(trackingData)) {
    const { toggled, elapsedTime, startDate, endDate, apps, trackingLogs } =
      trackingData[projectName]

    db.get(selectProjectSql, [projectName], async function (err, row) {
      if (err) return console.error(err.message)

      if (row) {
        await run(
          updateProjectSql,
          [toggled, elapsedTime, startDate, endDate, projectName],
          function (err) {
            if (err) return console.error(err.message)
          }
        )
      } else {
        await run(
          insertProjectSql,
          [projectName, toggled, elapsedTime, startDate, endDate],
          function (err) {
            if (err) return console.error(err.message)
          }
        )
      }
    })

    // Iterate over apps
    if (!apps?.length) continue
    for (const app of apps) {
      const { name: appName, icon, pid } = app

      db.get(selectAppSql, [projectName, appName], async function (err, row) {
        if (err) return console.error(err.message)

        if (!row) {
          await run(insertAppSql, [projectName, appName, icon, pid], function (err) {
            if (err) return console.error(err.message)
          })
        }
      })
    }

    // Iterate over trackingLogs
    if (!trackingLogs?.length) continue
    for (const trackingLog of trackingLogs) {
      const {
        logId,
        name: appName,
        elapsedTime: appElapsedTime,
        startDate: appStartDate,
        endDate: appEndDate
      } = trackingLog

      db.get(selectTrackingSql, [logId], async function (err, row) {
        if (err) return console.error(err.message)

        if (row) {
          await run(
            updateTrackingSql,
            [appElapsedTime, appStartDate, appEndDate, logId],
            function (err) {
              if (err) return console.error(err.message)
            }
          )
        } else {
          await run(
            insertTrackingSql,
            [projectName, appName, appElapsedTime, appStartDate, appEndDate],
            function (err) {
              if (err) return console.error(err.message)
            }
          )
        }
      })
    }
  }
}

// Create a tracking log
export async function createTrackingLogListener(event, trackingData) {
  const { projectName, trackingLog } = trackingData
  const { name, elapsedTime, startDate, endDate } = trackingLog
  const insertTrackingSql = `INSERT INTO tracking_data (projectName, appName, elapsedTime, startDate, endDate) VALUES (?, ?, ?, ?, ?)`
  const trackingLogRes = await run(insertTrackingSql, [
    projectName,
    name,
    elapsedTime,
    startDate,
    endDate
  ])
  return trackingLogRes.lastID
}

// Update a tracking log
export async function updateTrackingLogListener(event, trackingLog) {
  const { id, appName, elapsedTime, startDate, endDate } = trackingLog
  const updateTrackingSql = `UPDATE tracking_data SET elapsedTime = ?, startDate = ?, endDate = ? WHERE id = ?`
  return await run(updateTrackingSql, [elapsedTime, startDate, endDate, id])
}

// Delete a tracking log
export async function deleteTrackingLogListener(event, data) {
  const { name, projectName, endDate, startDate } = data
  const deleteTrackingSql = `DELETE FROM tracking_data WHERE projectName = ? AND appName = ? AND endDate = ? AND startDate = ?`
  return await run(deleteTrackingSql, [projectName, name, endDate, startDate])
}

// Update project properties (except trackingLogs)
export async function updateProjectPropertiesListener(event, projectData) {
  const { projectName, toggled, elapsedTime, startDate, endDate } = projectData
  if (!projectName) return console.error('No project name provided')
  if (!toggled && toggled !== false && !elapsedTime && !startDate && !endDate)
    return console.error('No data provided')

  let updateProjectSql = `UPDATE project_data SET`
  let updateProjectValues = []
  if (toggled) {
    updateProjectSql += ' toggled = ?,'
    updateProjectValues.push(toggled)
  } else if (toggled === false) {
    updateProjectSql += ' toggled = ?,'
    updateProjectValues.push(toggled)
  }
  if (elapsedTime) {
    updateProjectSql += ' elapsedTime = ?,'
    updateProjectValues.push(elapsedTime)
  }
  if (startDate) {
    updateProjectSql += ' startDate = ?,'
    updateProjectValues.push(startDate)
  }
  if (endDate) {
    updateProjectSql += ' endDate = ?,'
    updateProjectValues.push(endDate)
  }
  updateProjectSql = updateProjectSql.slice(0, -1)
  updateProjectSql += ' WHERE name = ?'

  return await run(updateProjectSql, [...updateProjectValues, projectName])
}

export async function deleteTrackedAppListener(event, appData) {
  const { projectName, appName } = appData
  const deleteAppSql = `DELETE FROM app_data WHERE projectName = ? AND appName = ?`
  return await run(deleteAppSql, [projectName, appName])
}

export async function createTrackedAppListener(event, appData) {
  const { projectName, appName } = appData
  const insertAppSql = `INSERT INTO app_data (projectName, appName) VALUES (?, ?)`
  return await run(insertAppSql, [projectName, appName])
}

export async function createProjectListener(event, projectData) {
  const { projectName, toggled, elapsedTime, startDate, endDate } = projectData
  const insertProjectSql = `INSERT INTO project_data (name, toggled, elapsedTime, startDate, endDate) VALUES (?, ?, ?, ?, ?)`
  const project = await run(insertProjectSql, [
    projectName,
    toggled,
    elapsedTime,
    startDate,
    endDate
  ])
  const insertAppSql = `INSERT INTO app_data (projectName, appName) VALUES (?, ?)`
  for (const app of projectData.apps) {
    await run(insertAppSql, [projectName, app.name, app.icon, app.pid])
  }
  return project
}

export const loadDataListener = (event, filters = []) => {
  return new Promise((resolve, reject) => {
    let trackingData = {}
    db.serialize(async () => {
      // Load project data
      await run(
        'CREATE TABLE if not exists project_data (name TEXT, toggled BOOLEAN, elapsedTime INTEGER, startDate INTEGER, endDate INTEGER)'
      )
      db.all('SELECT * FROM project_data', async (err, projectRows) => {
        if (err) return reject(err)

        projectRows.forEach((projectRow) => {
          if (!projectRow.name) return
          trackingData[projectRow.name] = {
            toggled: projectRow.toggled,
            elapsedTime: projectRow.elapsedTime,
            startDate: projectRow.startDate,
            endDate: projectRow.endDate,
            trackingLogs: [],
            apps: []
          }
        })

        // Load app data
        await run('CREATE TABLE if not exists app_data (projectName TEXT, appName TEXT)')
        db.all('SELECT * FROM app_data', async (err, appRows) => {
          if (err) return reject(err)

          appRows.forEach((appRow) => {
            if (trackingData[appRow.projectName]) {
              trackingData[appRow.projectName].apps.push({
                name: appRow.appName,
                icon: appRow.icon,
                pid: appRow.pid
              })
            }
          })

          // Load tracking data
          await run(
            'CREATE TABLE if not exists tracking_data (id INTEGER PRIMARY KEY AUTOINCREMENT, projectName TEXT, appName TEXT, elapsedTime INTEGER, startDate INTEGER, endDate INTEGER)'
          )

          const selectTrackingSql = `SELECT * FROM tracking_data ${
            filters.length ? 'WHERE ' : ''
          }${filters.map((filter) => `elapsedTime ${filter.operator} ?`).join(' AND ')}`
          const filterValues = filters.map((filter) => (parseInt(filter.value) || 0) * 1000)
          db.all(selectTrackingSql, filterValues, async (err, trackingRows) => {
            if (err) return reject(err)

            trackingRows.forEach((trackingRow) => {
              if (trackingData[trackingRow.projectName]) {
                trackingData[trackingRow.projectName].trackingLogs.push({
                  name: trackingRow.appName,
                  elapsedTime: trackingRow.elapsedTime,
                  startDate: trackingRow.startDate,
                  endDate: trackingRow.endDate,
                  id: trackingRow.id
                })
              }
            })

            for (const projectName of Object.keys(trackingData)) {
              trackingData[projectName].elapsedTime = 0
              for (const trackingLog of trackingData[projectName].trackingLogs) {
                trackingData[projectName].elapsedTime += trackingLog.elapsedTime
              }
            }
            resolve(trackingData)
          })
        })
      })
    })
  })
}
