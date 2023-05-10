import { app, shell, BrowserWindow, nativeImage, ipcMain } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'
import ffi from '@lwahonen/ffi-napi'
import ref from '@lwahonen/ref-napi'
import { Database } from 'sqlite3'
const db = new Database('tracking.db')


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
  EnumWindows: ['int', [voidPtr, 'int32']]
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
    console.log('processId', processId.deref())
    const hProcess = kernel32.OpenProcess(PROCESS_QUERY_INFORMATION, false, processId.deref())
    console.log('hProcess', hProcess)
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

  ipcMain.handle('get-windows-with-icons', async () => {
    const EnumWindowsProc = ffi.Callback('int', ['long', 'int32'], (hwnd) => {
      const processId = ref.alloc('uint32')
      user32.GetWindowThreadProcessId(hwnd, processId)

      let hProcess
      if (processId.deref() !== 0) {
        // Check if the process ID corresponds to an actual process
        const snapshot = kernel32.CreateToolhelp32Snapshot(TH32CS_SNAPPROCESS, 0)
        const entry = Buffer.alloc(PROCESSENTRY32_SIZE)
        entry.writeUInt32LE(PROCESSENTRY32_SIZE, 0)
        let found = false
        if (kernel32.Process32First(snapshot, entry)) {
          do {
            const entryProcessId = entry.readUInt32LE(8)
            if (entryProcessId === processId.deref()) {
              found = true

              break
            }
          } while (kernel32.Process32Next(snapshot, entry))
        }
        kernel32.CloseHandle(snapshot)
        if (found) {
          hProcess = kernel32.OpenProcess(
            PROCESS_QUERY_INFORMATION | PROCESS_VM_READ,
            false,
            processId.deref()
          )
        }
      }
      if (hProcess) {
        const buffer = Buffer.alloc(MAX_PATH)

        const size = psapi.GetModuleFileNameExA(hProcess, 0, buffer, MAX_PATH)
        // let size = 0
        if (size > 0) {
          const processName = buffer.toString('utf8', 0, size).split('\\').pop()
          const image = nativeImage.createFromPath(processName)
          if (!processes.find((p) => p.name === processName)) {
            processes.push({ pid: processId.deref(), name: processName, image: image.toDataURL() })
          }
        }
        kernel32.CloseHandle(hProcess)
      }
      return 1
    })
    user32.EnumWindows(EnumWindowsProc, 0)

    return processes
  })
  ipcMain.handle('save-data', (event, trackingData) => {
    db.run("CREATE TABLE if not exists tracking_data (name TEXT, elapsedTime INTEGER)")
    const stmt = db.prepare('REPLACE INTO tracking_data (name, elapsedTime) VALUES (?, ?)');
    Object.entries(trackingData).forEach(([name, elapsedTime]) => {
      stmt.run(name, elapsedTime)
    })
  })

  // Handle 'load-data' from renderer
  ipcMain.handle('load-data', () => {
    db.run("CREATE TABLE if not exists tracking_data (name TEXT, elapsedTime INTEGER)")
    const rows = db.prepare('SELECT * FROM tracking_data').all()
    if (Object.keys(rows).length === 0) return {}
    const trackingData = {}
    for (const rowKey in rows) {
      const row = rows[rowKey]
      trackingData[rowKey] = row.elapsedTime
    }


    return trackingData

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
