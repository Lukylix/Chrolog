import { app, shell, BrowserWindow, nativeImage, ipcMain } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'
import ffi from '@lwahonen/ffi-napi'
import ref from '@lwahonen/ref-napi'
import { Database } from 'sqlite3'
import { Server } from 'socket.io'

const io = new Server(2356, {
  cors: {
    origin: '*'
  }
})

const appDataPath = app.getPath('appData')
const dbPath = join(appDataPath, 'Chrolog', 'tracking.sqlite')
const db = new Database(dbPath)

const MAX_PATH = 260
const PROCESS_QUERY_INFORMATION = 0x0400
const PROCESS_VM_READ = 0x0010

const TH32CS_SNAPPROCESS = 0x00000002
const PROCESSENTRY32_SIZE = 568

const kernel32 = new ffi.Library('kernel32', {
  OpenProcess: ['int32', ['uint32', 'bool', 'uint32']],
  CloseHandle: ['bool', ['int32']],
  CreateToolhelp32Snapshot: ['long', ['uint32', 'uint32']],
  Process32First: ['int32', ['long', 'pointer']],
  Process32Next: ['int32', ['long', 'pointer']]
})

const psapi = new ffi.Library('psapi', {
  GetModuleFileNameExA: ['uint32', ['int32', 'int32', 'pointer', 'uint32']]
})

let processes = []

var voidPtr = ref.refType(ref.types.void)
var stringPtr = ref.refType(ref.types.CString)

const user32 = new ffi.Library('user32', {
  GetForegroundWindow: ['int32', []],
  GetWindowTextA: ['long', ['long', stringPtr, 'long']],
  GetWindowThreadProcessId: ['uint32', ['int32', 'pointer']],
  EnumWindows: ['int', [voidPtr, 'int32']],
  SetWindowsHookExA: ['int', ['int', 'pointer', 'int', 'int']],
  CallNextHookEx: ['int', ['long', 'int', 'long', 'long']],
  UnhookWindowsHookEx: ['bool', ['int']]
})
const WH_KEYBOARD_LL = 13
const WH_MOUSE_LL = 14

let keyboardHookProc = ffi.Callback(
  'long',
  ['int', 'long', 'long'],
  function (code, wParam, lParam) {
    io.to('input_events').emit('keyboard_event', { wParam, lParam })
    return user32.CallNextHookEx(0, code, wParam, lParam)
  }
)

let lastMouseEventTime = Date.now()

let mouseHookProc = ffi.Callback('long', ['int', 'long', 'long'], function (code, wParam, lParam) {
  let currentTime = Date.now()

  if (currentTime - lastMouseEventTime > 100) {
    io.to('input_events').emit('mouse_event', { wParam, lParam })
    lastMouseEventTime = currentTime
  }
  return user32.CallNextHookEx(0, code, wParam, lParam)
})

let hKeyboardHook, hMouseHook

// Server-side
io.on('connection', function (socket) {
  console.log('a user connected')
  if (!hKeyboardHook) {
    hKeyboardHook = user32.SetWindowsHookExA(WH_KEYBOARD_LL, keyboardHookProc, 0, 0)
    if (hKeyboardHook === 0) {
      throw new Error('SetWindowsHookExA for keyboard failed')
    }
  }

  if (!hMouseHook) {
    hMouseHook = user32.SetWindowsHookExA(WH_MOUSE_LL, mouseHookProc, 0, 0)
    if (hMouseHook === 0) {
      throw new Error('SetWindowsHookExA for mouse failed')
    }
  }

  socket.on('join_room', function (room) {
    console.log('user joined room', room)
    socket.join(room)
    socket.emit('room_joined', `You have joined room ${room}`)
  })
})

function run(query, params = []) {
  return new Promise((resolve, reject) => {
    db.run(query, params, function (err) {
      if (err) return reject(err)
      resolve(this)
    })
  })
}
const timeoutPromise = (timeout) =>
  new Promise((resolve) => {
    setTimeout(() => resolve(true), timeout)
  })

function createWindow() {
  // Create the browser window.
  const mainWindow = new BrowserWindow({
    width: 900,
    height: 670,
    show: false,
    autoHideMenuBar: true,
    ...(process.platform === 'linux' ? { icon } : {}),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      nodeIntegration: true,
      contextIsolation: false,
      enableRemoteModule: true,
      disableGpu: true
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow.show()
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  // HMR for renderer base on electron-vite cli.
  // Load the remote URL for development or the local html file for production.
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }

  // Opens the developer tools when F12 is pressed
  mainWindow.webContents.on('before-input-event', (event, input) => {
    if (input.key.toLowerCase() === 'f12') {
      mainWindow.webContents.openDevTools()
      event.preventDefault()
    }
  })
  ipcMain.handle('get-active-app', async () => {
    const hwnd = user32.GetForegroundWindow()
    const processId = ref.alloc('uint32')
    user32.GetWindowThreadProcessId(hwnd, processId)
    const hProcess = kernel32.OpenProcess(PROCESS_QUERY_INFORMATION, false, processId.deref())
    if (hProcess) {
      const buffer = Buffer.alloc(MAX_PATH)
      const size = psapi.GetModuleFileNameExA(hProcess, 0, buffer, MAX_PATH)
      if (size > 0) {
        const processName = buffer.toString('utf8', 0, size)
        kernel32.CloseHandle(hProcess)
        return processName.split('\\').pop()
      }
      kernel32.CloseHandle(hProcess)
    }
    return null
  })
  let lastProcessFetchTime = 0
  ipcMain.handle('get-windows-with-icons', async () => {
    if (lastProcessFetchTime + 1000 > Date.now()) return
    lastProcessFetchTime = Date.now()


    const EnumWindowsProc = ffi.Callback('int', ['long', 'int32'], async (hwnd) => {
      const processId = ref.alloc('uint32')
      user32.GetWindowThreadProcessId(hwnd, processId)

      if (processId.deref() === 0) return 1

      const snapshot = kernel32.CreateToolhelp32Snapshot(TH32CS_SNAPPROCESS, 0)
      const entry = Buffer.alloc(PROCESSENTRY32_SIZE)
      entry.writeUInt32LE(PROCESSENTRY32_SIZE, 0)

      if (!kernel32.Process32First(snapshot, entry)) {
        kernel32.CloseHandle(snapshot)
        return 1
      }

      do {
        await timeoutPromise(50)
        if (entry.readUInt32LE(8) === processId.deref()) {
          const hProcess = kernel32.OpenProcess(
            PROCESS_QUERY_INFORMATION | PROCESS_VM_READ,
            false,
            processId.deref()
          )

          if (hProcess) {
            const buffer = Buffer.alloc(MAX_PATH)
            const size = psapi.GetModuleFileNameExA(hProcess, 0, buffer, MAX_PATH)

            if (size > 0) {
              const processName = buffer.toString('utf8', 0, size).split('\\').pop()
              const image = nativeImage.createFromPath(processName)

              if (!processes.find((p) => p.name === processName)) {
                processes.push({
                  pid: processId.deref(),
                  name: processName,
                  image: image.toDataURL()
                })
              }
            }

            kernel32.CloseHandle(hProcess)
          }

          break
        }
      } while (kernel32.Process32Next(snapshot, entry))

      kernel32.CloseHandle(snapshot)
      return 1
    })

    user32.EnumWindows(EnumWindowsProc, 0)
    return processes
  })

  ipcMain.handle('save-data', async (event, trackingData) => {
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
  })

  // Handle 'load-data' from renderer
  ipcMain.handle('load-data', () => {
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
  })

  let intervalId = null
  ipcMain.on('stop-tracking', (event) => {
    clearInterval(intervalId)
    event.returnValue = true
  })
  ipcMain.on('start-tracking', (event, appTitle) => {
    let isTracking = false
    let trackingData = {}
    let trackingTime = 0

    intervalId = setInterval(() => {
      if (isTracking) {
        trackingData[appTitle] = (trackingData[appTitle] || 0) + 1000
        trackingTime += 1000
        mainWindow.webContents.send('tracking-data', trackingData)
        mainWindow.webContents.send('tracking-time', trackingTime)
      }
    }, 1000)

    app.on('activate', () => {
      const activeApp = BrowserWindow.getFocusedWindow().getTitle()
      if (activeApp === appTitle) {
        if (!isTracking) {
          isTracking = true
          event.sender.send('tracking-started')
        }
      } else {
        if (isTracking) {
          isTracking = false
          event.sender.send('tracking-stopped')
        }
      }
    })
  })
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(() => {
  // Set app user model id for windows
  electronApp.setAppUserModelId('com.electron')

  // Default open or close DevTools by F12 in development
  // and ignore CommandOrControl + R in production.
  // see https://github.com/alex8088/electron-toolkit/tree/master/packages/utils
  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  createWindow()

  app.on('activate', function () {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

// In this file you can include the rest of your app"s specific main process
// code. You can also put them in separate files and require them here.
