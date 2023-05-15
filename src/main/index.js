import { app, shell, BrowserWindow, ipcMain } from 'electron'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import { join } from 'path'
import { loadDataListener, saveDataListener } from './utilis/database'
import {
  getActiveAppListener,
  getProcessCountListener,
  getProcessesListener,
  hookInputs
} from './utilis/system'
import Store from 'electron-store'
import os from 'os'

const store = new Store()

function createWindow() {
  let icon
  if (os.platform() === 'win32') icon = join(__dirname, '../../resources/icon256.ico')
  else if (os.platform() === 'linux') icon = join(__dirname, '../../resources/icon512.png')
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
  hookInputs()

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

  ipcMain.handle('load-data', loadDataListener)

  ipcMain.on('save-settings', (event, data) => {
    store.set('settings', data)
  })
  ipcMain.handle('load-settings', () => {
    return store.get('settings')
  })
  ipcMain.on('set-auto-launch', (event, data) => {
    if (os.platform() === 'linux') {
      const desktopEnv = process.env.XDG_CURRENT_DESKTOP

      // Check if the current desktop environment supports autostart
      if (desktopEnv && desktopEnv.includes('GNOME')) {
        // Enable app to run at startup for GNOME
        app.setLoginItemSettings({
          openAtLogin: data,
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
        openAtLogin: data,
        path: appPath,
        args: []
      })
    }
  })

  ipcMain.on('minimize-event', () => {
    mainWindow.minimize()
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
