import { app, shell, BrowserWindow, ipcMain, Tray, Menu, nativeImage } from 'electron'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import { join } from 'path'
import {
  createProjectListener,
  createTrackedAppListener,
  createTrackingLogListener,
  deleteTrackedAppListener,
  deleteTrackingLogListener,
  loadDataListener,
  saveDataListener,
  updateProjectPropertiesListener,
  updateTrackingLogListener
} from './utilis/database'
import {
  getActiveAppListener,
  getProcessCountListener,
  getProcessesListener,
  hookInputs
} from './utilis/system'
import Store from 'electron-store'
import os from 'os'
import installExtension, {
  REDUX_DEVTOOLS,
  REACT_DEVELOPER_TOOLS
} from 'electron-devtools-installer'
import { existsSync } from 'fs'

let startMinimized = (process.argv || []).indexOf('--hidden') !== -1

const store = new Store()

let tray = null



function createWindow() {
  let icon
  if (os.platform() === 'win32') icon = join(__dirname, '../../build/icon256.ico')
  else if (os.platform() === 'linux') icon = join(__dirname, '../../build/icon512.png')
  const mainWindow = new BrowserWindow({
    width: 900,
    height: 670,
    show: false,
    autoHideMenuBar: true,
    frame: false,
    titleBarStyle: 'hidden',
    icon,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      nodeIntegration: true,
      contextIsolation: false,
      enableRemoteModule: true,
      disableGpu: true
    }
  })

  function createTray() {
    const paths = [
      '../../build/icon256.ico',
      '../build/icon256.ico',
      './build/icon256.ico',
      '../../../../resources/icon256.ico',
      '../../../resources/icon256.ico',
      '../../resources/icon256.ico',
      './resources/icon256.ico',
      './resources/app.asar.unpacked/resources/icon256.ico',
      '../../resources/app.asar.unpacked/resources/icon256.ico',
      '../../../resources/app.asar.unpacked/resources/icon256.ico',
      '../../../../resources/app.asar.unpacked/resources/icon256.ico'
    ]
    for (const path of paths) {
      try {
        if (existsSync(join(app.getAppPath(), path))) {
          console.log(join(__dirname, path), ' icon found')
          const nativeImageIcon = nativeImage.createFromPath(join(app.getAppPath(), path))
          let appIcon = new Tray(nativeImageIcon)

          const contextMenu = Menu.buildFromTemplate([
            {
              label: 'Show',
              click: function () {
                mainWindow.show()
              }
            },
            {
              label: 'Exit',
              click: function () {
                app.isQuiting = true
                app.quit()
              }
            }
          ])

          appIcon.on('double-click', function (event) {
            mainWindow.show()
          })
          appIcon.setToolTip('Chrolog')
          appIcon.setContextMenu(contextMenu)
          return appIcon
        }
      } catch (error) {
        console.log(error)
      }
    }
  }

  hookInputs()

  if (!startMinimized)
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

  ipcMain.on('save-data', saveDataListener)
  ipcMain.handle('load-data', loadDataListener)

  ipcMain.on('update-tracking-log', updateTrackingLogListener)
  ipcMain.on('delete-tracking-log', deleteTrackingLogListener)
  ipcMain.on('create-tracking-log', createTrackingLogListener)
  ipcMain.on('update-project-properties', updateProjectPropertiesListener)
  ipcMain.on('create-project', createProjectListener)
  ipcMain.on('delete-tracked-app', deleteTrackedAppListener)
  ipcMain.on('create-tracked-app', createTrackedAppListener)

  // Opens the developer tools when F12 is pressed
  mainWindow.webContents.on('before-input-event', (event, input) => {
    if (input.key.toLowerCase() === 'f12') {
      mainWindow.webContents.openDevTools()
      event.preventDefault()
    }
  })
  ipcMain.handle('get-active-app', getActiveAppListener)

  ipcMain.on('get-windows-with-icons', getProcessesListener)

  ipcMain.handle('get-process-count', getProcessCountListener)

  ipcMain.on('open-config-folder', () => {
    const appDataPath = app.getPath('appData')
    const dirPath = join(appDataPath, 'Chrolog/storage')
    shell.openPath(dirPath)
  })

  ipcMain.on('save-settings', (event, data) => {
    store.set('settings', data)
  })
  ipcMain.handle('load-settings', () => {
    return store.get('settings')
  })
  ipcMain.on('set-auto-launch', (event) => {
    if (os.platform() === 'linux') {
      const desktopEnv = process.env.XDG_CURRENT_DESKTOP

      // Check if the current desktop environment supports autostart
      if (desktopEnv && desktopEnv.includes('GNOME')) {
        // Enable app to run at startup for GNOME
        app.setLoginItemSettings({
          openAtLogin: true,
          path: process.execPath,
          args: []
        })
      } else if (desktopEnv && desktopEnv.includes('KDE')) {
        // Enable app to run at startup for KDE
        // KDE Plasma does not provide a programmatic method to set autostart,
        // so you may need to instruct users to add your app manually via system settings.
        console.log('Please set up autostart for your app in KDE Plasma manually.')
      } else {
        // Unsupported desktop environment
        console.log('Autostart is not supported on this Linux desktop environment.')
      }
    } else if (os.platform() === 'win32') {
      const appPath = app.getPath('exe')
      app.setLoginItemSettings({
        openAtLogin: true,
        path: appPath,
        args: ['--hidden']
      })
    }
  })

  ipcMain.on('minimize-event', (event) => {
    event.preventDefault()
    mainWindow.hide()
    tray = createTray()
  })
  ipcMain.on('restore', (event) => {
    mainWindow.show()
    tray.destroy()
  })

  ipcMain.on('maximize-event', () => {
    if (mainWindow.isMaximized()) {
      mainWindow.unmaximize()
    } else {
      mainWindow.maximize()
    }
  })

  ipcMain.on('close-event', () => {
    mainWindow.close()
  })
  if (startMinimized) tray = createTray()
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(() => {
  // Install devtools extensions
  if (process.env.NODE_ENV === 'development')
    installExtension([REDUX_DEVTOOLS, REACT_DEVELOPER_TOOLS])
      .then((name) => console.log(`Added Extension:  ${name}`))
      .catch((err) => console.log('An error occurred: ', err))
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
