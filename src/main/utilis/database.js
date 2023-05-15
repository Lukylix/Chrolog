import { Database } from 'sqlite3'
import { app } from 'electron'
import { join } from 'path'
import fs from 'fs'

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
  await run(
    'CREATE TABLE if not exists app_data (projectName TEXT, appName TEXT, icon TEXT, pid INTEGER)'
  )

  // Create table for tracking data if it doesn't exist
  await run(
    'CREATE TABLE if not exists tracking_data (projectName TEXT, appName TEXT, elapsedTime INTEGER, startDate INTEGER, endDate INTEGER)'
  )

  const selectProjectSql = `SELECT * FROM project_data WHERE name = ?`
  const updateProjectSql = `UPDATE project_data SET toggled = ?, elapsedTime = ?, startDate = ?, endDate = ? WHERE name = ?`
  const insertProjectSql = `INSERT INTO project_data (name, toggled, elapsedTime, startDate, endDate) VALUES (?, ?, ?, ?, ?)`

  const selectAppSql = `SELECT * FROM app_data WHERE projectName = ? AND appName = ?`
  const insertAppSql = `INSERT INTO app_data (projectName, appName, icon, pid) VALUES (?, ?, ?, ?)`

  const selectTrackingSql = `SELECT * FROM tracking_data WHERE projectName = ? AND appName = ?`
  const updateTrackingSql = `UPDATE tracking_data SET elapsedTime = ?, startDate = ?, endDate = ? WHERE projectName = ? AND appName = ?`
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
        name: appName,
        elapsedTime: appElapsedTime,
        startDate: appStartDate,
        endDate: appEndDate
      } = trackingLog

      db.get(selectTrackingSql, [projectName, appName], async function (err, row) {
        if (err) return console.error(err.message)

        if (row) {
          await run(
            updateTrackingSql,
            [appElapsedTime, appStartDate, appEndDate, projectName, appName],
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


export const loadDataListener = () => {
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
        await run(
          'CREATE TABLE if not exists app_data (projectName TEXT, appName TEXT, icon TEXT, pid INTEGER)'
        )
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
            'CREATE TABLE if not exists tracking_data (projectName TEXT, appName TEXT, elapsedTime INTEGER, startDate INTEGER, endDate INTEGER)'
          )
          db.all('SELECT * FROM tracking_data', (err, trackingRows) => {
            if (err) return reject(err)

            trackingRows.forEach((trackingRow) => {
              if (trackingData[trackingRow.projectName]) {
                trackingData[trackingRow.projectName].trackingLogs.push({
                  name: trackingRow.appName,
                  elapsedTime: trackingRow.elapsedTime,
                  startDate: trackingRow.startDate,
                  endDate: trackingRow.endDate
                })
              }
            })

            resolve(trackingData)
          })
        })
      })
    })
  })
}
