import { app, shell, BrowserWindow, ipcMain, Tray, Menu, nativeImage, webContents } from 'electron'
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
import { existsSync } from 'fs'
import { createServer as createHttpServer } from 'http'
import { URL } from 'url'

let startMinimized = (process.argv || []).indexOf('--hidden') !== -1

const store = new Store()

let tray = null

function createWindow() {
  let icon
  if (os.platform() === 'win32') icon = new URL('../../build/icon256.ico', import.meta.url)
  else if (os.platform() === 'linux') icon = new URL('../../build/icon512.png', import.meta.url)

  const mainWindow = new BrowserWindow({
    width: 900,
    height: 670,
    show: false,
    autoHideMenuBar: true,
    frame: false,
    titleBarStyle: 'hidden',
    icon: os.platform() === 'linux' ? icon.pathname : icon.href,
    webPreferences: {
      preload: new URL('../preload/index.mjs', import.meta.url),
      sandbox: false,
      nodeIntegration: true,
      contextIsolation: false,
      enableRemoteModule: true,
      disableGpu: true
    }
  })

  function createTray() {
    const iconName = os.platform() === 'linux' ? 'icon256.png' : 'icon256.ico'
    const pathsToTry = ['resources', 'resources/app.asar.unpacked/resources', 'build']
    const appPath = app.getAppPath()
    let paths = []
    for (const path of pathsToTry) {
      for (let i = 0; i < 5; i++) {
        let pathPrefix = './'
        for (let j = 0; j < i; j++) {
          pathPrefix += '../'
        }
        paths.push(join(appPath, `${pathPrefix}${path}/${iconName}`))
      }
    }

    for (const path of paths) {
      try {
        if (existsSync(path)) {
          console.log(path, ' icon found.')
          const nativeImageIcon = nativeImage.createFromPath(path)
          let appIcon = new Tray(nativeImageIcon)
          const contextMenu = Menu.buildFromTemplate([
            {
              label: 'Show',
              click: function () {
                mainWindow.show()
                if (tray) tray.destroy()
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
          if (os.platform() === 'win32')
            appIcon.on('click', function () {
              mainWindow.show()
              if (tray) tray.destroy()
            })
          appIcon.setToolTip('Chrolog')
          appIcon.setContextMenu(contextMenu)
          return appIcon
        }
      } catch (error) {
        console.log(error)
      }
    }
    return false
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
    const fileToLoad = process.env.NODE_ENV != 'development' ? 'index.html' : 'dev.html'
    const realtivePathToload = `out/renderer/${fileToLoad}`
    mainWindow.loadFile(realtivePathToload)
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

  ipcMain.on('open-config-folder', async () => {
    const appDataPath = app.getPath('appData')
    const dirPath = join(appDataPath, 'Chrolog/storage')
    shell.openPath(dirPath)
  })

  ipcMain.on('save-settings', async (event, data) => {
    store.set('settings', data)
  })
  let httpServer
  const createServer = async () => {
    httpServer = createHttpServer((req, res) => {
      if (req.method === 'POST') {
        if (req.url.includes('/current-tab')) {
          let body = ''
          req.on('data', (chunk) => {
            body += chunk.toString()
          })
          req.on('end', () => {
            const parsedBody = JSON.parse(body)
            webContents.getAllWebContents().forEach((webContents) => {
              webContents.send('current-tab', parsedBody?.domain)
            })
            res.end('ok')
          })
        } else if (req.url.includes('/add-tab')) {
          let body = ''
          req.on('data', (chunk) => {
            body += chunk.toString()
          })
          req.on('end', () => {
            const parsedBody = JSON.parse(body)
            webContents.getAllWebContents().forEach((webContents) => {
              webContents.send('add-tab', parsedBody?.domain)
            })
            console.log('adding ', parsedBody?.domain)
            const settings = store.get('settings')
            store.set('settings', {
              ...settings,
              sitesExclusions: [
                ...new Set([...(settings?.sitesExclusions || []), parsedBody?.domain])
              ]
            })
            res.end('ok')
          })
        }
      }
    })
    httpServer.listen(9807)
  }

  if (store.get('settings')?.extensionEnabled) {
    createServer()
  }

  ipcMain.on('toggle-extension', async (event, value) => {
    if (value && !httpServer) {
      createServer()
    } else if (!value && httpServer) {
      httpServer.close()
    }
  })

  ipcMain.handle('load-settings', () => {
    const settings = store.get('settings')
    return settings
  })
  ipcMain.on('set-auto-launch', async (event) => {
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

  ipcMain.on('minimize-event', async (event) => {
    event.preventDefault()
    tray = createTray()
    if (tray) {
      mainWindow.hide()
    }
  })
  ipcMain.on('restore', async (event) => {
    mainWindow.show()
    tray.destroy()
  })

  ipcMain.on('maximize-event', async () => {
    if (mainWindow.isMaximized()) {
      mainWindow.unmaximize()
    } else {
      mainWindow.maximize()
    }
  })

  ipcMain.on('close-event', async () => {
    mainWindow.close()
  })
  if (startMinimized) tray = createTray()
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(() => {
  // Set app user model id for windows
  electronApp.setAppUserModelId('Chrolog')

  // Default open or close DevTools by F12 in development
  // and ignore CommandOrControl + R in production.
  // see https://github.com/alex8088/electron-toolkit/tree/master/packages/utils
  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window, { escToCloseWindow: false })
  })

  createWindow()

  app.on('activate', function () {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})
