import { webContents, app } from 'electron'
import fs from 'fs'
import path from 'path'
import x11 from 'x11'
import { exec } from 'child_process'
import sudo from 'sudo-prompt'

import { load, DataType, open, close, arrayConstructor } from 'ffi-rs'

let lastProcessFetchTime = 0
let processes = []
let processesToBeFetched = 0
let completedProcesses = 0

if (process.platform === 'win32') {
  const appDataPath = app.getPath('appData')
  let processPath = app.getPath('exe').replace(/(?!\\).[^\\]+\.exe$/gm, '')
  if (processPath.includes('node_modules'))
    processPath = processPath.replace(/node_modules.*/gm, '')
  const chrologPaths = [
    `${processPath}/resources/app.asar.unpacked/resources/chrolog.dll`,
    `${processPath}/resources/chrolog.dll`,
    `${appDataPath}/Chrolog/resources/chrolog.dll`
  ]
  let chrologPath = ''
  for (const path of chrologPaths) {
    if (fs.existsSync(path)) {
      chrologPath = path
      console.log('chrologPath', chrologPath)
      break
    }
  }
  if (chrologPath.length > 0)
    open({
      library: 'chrolog',
      path: chrologPath
    })
}

let shouldExit = false

app.on('before-quit', () => {
  shouldExit = true
  close('chrolog')
  console.log("I'm exiting")
})

let lastMouseEventTime = Date.now()
// let lastKeyboardEventTime = Date.now()

const hookInputsWin32 = async () => {
  do {
    ;(async () => {
      const lastInputTime = load({
        library: 'chrolog',
        funcName: 'GetLastInputTime',
        retType: DataType.Double,
        paramsType: [],
        paramsValue: []
      })
      if (lastInputTime < 1 || lastMouseEventTime === lastInputTime) return
      lastMouseEventTime = lastInputTime
      webContents.getAllWebContents().forEach((webContent) => {
        webContent.send('mouse_event')
      })
    })()
    await new Promise((resolve) => setTimeout(resolve, 100))
  } while (!shouldExit)
}

const hookInputsLinux = async () => {
  const options = {
    name: 'Chrolog Inputs'
  }

  exec('which node', (error, stdout, stderr) => {
    if (error) {
      console.log(`error: ${error.message}`)
      return
    }
    if (stderr) {
      console.log(`stderr: ${stderr}`)
      return
    }

    const nodePath = stdout.trim()
    const logPath = path.join(app.getPath('appData'), 'Chrolog/input.log')

    let scriptPath
    if (process.env.NODE_ENV === 'development')
      scriptPath = path.join(app.getAppPath(), './resources/hookLinuxInputs.js')
    else scriptPath = path.join(app.getAppPath(), '../../resources/resources/hookLinuxInputs.js')
    const tempFilePath = path.join(app.getPath('appData'), 'ipc_temp_file.txt')
    tempFilePath.replace('/resources/resources', '/resources')

    const command = `${nodePath} ${scriptPath} -- --log ${logPath} --tempFile ${tempFilePath}`
    sudo.exec(command, options, (error, stdout) => {
      if (error) {
        console.log('Error executing child process:', error)
      } else {
        console.log('Child process output:', stdout)
      }
    })

    fs.writeFileSync(tempFilePath, '')
    let fileContent = ''

    fs.watchFile(tempFilePath, { persistent: true, interval: 100 }, () => {
      fs.readFile(tempFilePath, 'utf8', (error, data) => {
        if (error) {
          console.log('Error reading file:', error)
          // Handle the error accordingly
          return
        }

        fileContent += data
        const messages = fileContent.split('\n')

        messages.forEach((message) => {
          const trimmedMessage = message.trim()

          if (trimmedMessage.includes('keyboard_event')) {
            webContents.getAllWebContents().forEach((webContent) => {
              webContent.send('keyboard_event')
            })
          }

          if (trimmedMessage.includes('mouse_event')) {
            webContents.getAllWebContents().forEach((webContent) => {
              webContent.send('mouse_event')
            })
          }
        })
        fileContent = ''
      })
    })
  })
}

export const hookInputs = async () => {
  if (process.platform === 'win32') hookInputsWin32()
  else if (process.platform === 'linux') hookInputsLinux()
}

async function getActiveAppGnome() {
  return new Promise((resolve) => {
    try {
      exec(
        'ps -p $(xdotool getwindowpid $(xdotool getwindowfocus)) -o comm=',
        (err, stdout, stderr) => {
          if (err) return resolve(null)
          const appName = stdout.trim()
          resolve(appName)
        }
      )
    } catch (e) {
      resolve(null)
    }
  })
}

const getActiveAppWin32 = () => {
  const currentApp = load({
    library: 'chrolog',
    funcName: 'GetActiveApp',
    retType: DataType.String,
    paramsType: [],
    paramsValue: []
  })
  return currentApp
}

const getActiveAppLinux = () => {
  return new Promise((resolve) => {
    try {
      x11.createClient((err, display) => {
        if (err || !display) {
          resolve(null)
          return
        }

        const X = display.client
        const root = display.screen[0].root

        X.InternAtom(false, '_NET_ACTIVE_WINDOW', (err, netActiveWindowAtom) => {
          if (err || !netActiveWindowAtom) {
            resolve(null)
            return
          }

          X.GetProperty(0, root, netActiveWindowAtom, x11.XA_WINDOW, 0, 4, (err, prop) => {
            if (err) {
              resolve(null)
              return
            }

            const activeWindowId = prop.data.readUInt32LE(0)
            X.InternAtom(false, '_NET_WM_PID', (err, netWmPidAtom) => {
              if (err || !netWmPidAtom) {
                resolve(null)
                return
              }

              X.GetProperty(0, activeWindowId, netWmPidAtom, x11.XA_CARDINAL, 0, 4, (err, prop) => {
                if (err) {
                  resolve(null)
                  return
                }

                const pid = prop.data.readUInt32LE(0)
                const commPath = path.join('/proc', pid.toString(), 'comm')
                fs.readFile(commPath, 'utf8', (err, comm) => {
                  if (err) {
                    resolve(null)
                    return
                  }

                  resolve(comm.trim())
                })
              })
            })
          })
        })
      })
    } catch (e) {
      resolve(null)
    }
  })
}

export const getActiveAppListener = async () => {
  if (process.platform === 'win32') {
    return getActiveAppWin32()
  } else if (process.platform === 'linux') {
    if (process.env.GNOME_DESKTOP_SESSION_ID) {
      return await getActiveAppGnome()
    } else {
      return await getActiveAppLinux()
    }
  }
}

// ...

let processQueue = []
let isProcessing = false

const processQueueItem = async () => {
  if (processQueue.length === 0) {
    isProcessing = false
    return
  }

  isProcessing = true
  const { processId } = processQueue.shift()
  await getProcessInfos(processId)
  processQueueItem()
}

const enqueueProcess = (processId) => {
  processQueue.push({ processId })
  if (!isProcessing) processQueueItem()
}

const getProcessInfos = async (processId) => {
  if (processId <= 0) return
  const [process, path] = load({
    library: 'chrolog',
    funcName: 'GetProcessInfos',
    retType: arrayConstructor({ type: DataType.StringArray, length: 2 }),
    paramsType: [DataType.I32],
    paramsValue: [processId]
  })
  if (!processes.find((p) => p.name === process) && process.length > 0) {
    processes.push({
      pid: processId,
      name: process,
      path: path
    })
  }
  completedProcesses += 1
  webContents.getAllWebContents().forEach((webContent) => {
    webContent.send('process-completed-event', completedProcesses)
  })
  if (completedProcesses >= processesToBeFetched && completedProcesses > 5) {
    webContents.getAllWebContents().forEach((webContent) => {
      webContent.send('processes-event', processes)
    })
    processes = []
    processesToBeFetched = 0
    completedProcesses = 0
  }
}

const addProcessToFetch = (pid) => {
  processesToBeFetched += 1
  webContents.getAllWebContents().forEach((webContent) => {
    webContent.send('fetching-process-count', processesToBeFetched)
  })
  enqueueProcess(pid)
}

const getProcessesListenerWindows = async () => {
  if (lastProcessFetchTime + 1000 > Date.now()) return
  console.log('get-windows-with-icons')
  lastProcessFetchTime = Date.now()
  processes = []
  const isSucess = load({
    library: 'chrolog',
    funcName: 'EnumWindowsProcessIds',
    retType: DataType.Boolean,
    paramsType: [],
    paramsValue: []
  })
  if (!isSucess) return
  let pid = 0
  do {
    pid = load({
      library: 'chrolog',
      funcName: 'GetNextProcessId',
      retType: DataType.I32,
      paramsType: [],
      paramsValue: []
    })
    if (pid <= 0) break
    processCount += 1
    processes.push(pid)
    addProcessToFetch(pid)
  } while (pid > 0)
}

const getProcessesListenerLinux = async () => {
  if (lastProcessFetchTime + 1000 > Date.now() || processes.length > 0) return
  console.log('get-windows-with-icons')
  let processDirs = []
  try {
    processDirs = fs
      .readdirSync('/proc')
      .filter((name) => !isNaN(Number(name.split('/')[0])) && name !== '1')
  } catch (error) {
    if (error.code !== 'EACCES' && error.code !== 'ENOENT') console.error(error)
  }

  processes = processDirs.map((pid, i) => {
    webContents.getAllWebContents().forEach((webContent) => {
      webContent.send('fetching-process-count', i + 1)
    })
    const processPath = path.join('/proc', pid)
    const cmdline = fs.readFileSync(path.join(processPath, 'cmdline')).toString().split('\0')
    const name = cmdline[0].split('/').pop().split(' ')[0]
    webContents.getAllWebContents().forEach((webContent) => {
      webContent.send('process-completed-event', completedProcesses)
    })
    return {
      pid: Number(pid),
      name
    }
  })
  processes = [...new Set(processes.map((p) => p.name))].map((name) => {
    const process = processes.find((p) => p.name === name)
    return {
      pid: process.pid,
      name: process.name
    }
  })
  webContents.getAllWebContents().forEach((webContent) => {
    webContent.send('processes-event', processes)
  })
  processes = []
  processesToBeFetched = 0
  completedProcesses = 0
}

export const getProcessesListener = async () => {
  if (process.platform === 'win32') return getProcessesListenerWindows()
  if (process.platform === 'linux') return getProcessesListenerLinux()
}

let processCount = 0
let lastTimeFetchingProcessCount = 0

export const getProcessCountListener = async () => {
  if (lastTimeFetchingProcessCount + 1000 > Date.now() || processes.length > 0) return processCount
  if (process.platform === 'linux') {
    processCount = fs.readdirSync('/proc').filter((name) => !isNaN(Number(name))).length
  }
  return processCount
}
