import { webContents, app } from 'electron'
import fs from 'fs'
import net from 'net'

import { load, DataType, open, close, arrayConstructor } from 'ffi-rs'

let lastProcessFetchTime = 0
let processes = []
let processesToBeFetched = 0
let completedProcesses = 0
let isChrologLoaded = false
let client

if (process.platform === 'win32') {
  const appDataPath = app.getPath('appData').replace(/\/$/, '')
  let processPath = app
    .getPath('exe')
    .replace(/(?!\\).[^\\]+\.exe$/gm, '')
    .replace(/\/+$/, '')
  if (processPath.includes('node_modules'))
    processPath = processPath.replace(/node_modules.*/gm, '').replace(/\/$/, '')
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
  if (chrologPath.length > 0) {
    open({
      library: 'chrolog',
      path: chrologPath
    })
    isChrologLoaded = true
  }
} else if (process.platform === 'linux') {
  const appDataPath = app.getPath('appData').replace(/\/$/, '')
  let processPath = app
    .getPath('exe')
    .replace(/(?!\/).[^\/]+$/gm, '')
    .replace(/\/$/, '')
  if (processPath.includes('node_modules'))
    processPath = processPath.replace(/node_modules.*/gm, '').replace(/\/$/, '')
  const chrologPaths = [
    `${processPath}/resources/app.asar.unpacked/resources/chrolog.so`,
    `${processPath}/resources/chrolog.so`,
    `${appDataPath}/Chrolog/resources/chrolog.so`
  ]
  let chrologPath = ''
  for (const path of chrologPaths) {
    if (fs.existsSync(path)) {
      chrologPath = path
      console.log('chrologPath', chrologPath)
      break
    }
  }
  if (chrologPath.length > 0) {
    open({
      library: 'chrolog',
      path: chrologPath
    })
    console.log('Chrolog lib loaded')
    isChrologLoaded = true
  }

  client = new net.Socket()
  let isWaitingForConnection = true

  client.on('close', function () {
    if (isWaitingForConnection) return
    console.log('Connection closed by server. Retrying in 1 second...')
  })

  client.once('connect', function () {
    isWaitingForConnection = false
    console.log('Connected')
    client.write('JOIN last-inputs-time')
  })

  client.on('error', async function (err) {
    await new Promise((resolve) => setTimeout(resolve, 1000))
    isWaitingForConnection = true
    client.connect(9808, '127.0.0.1')
  })

  client.connect(9808, '127.0.0.1')
}

let shouldExit = false

app.on('before-quit', () => {
  shouldExit = true
  if (isChrologLoaded) close('chrolog')
  console.log("I'm exiting")
})

let lastEventTime = Date.now()

const hookInputsWin32 = async () => {
  if (!isChrologLoaded) return
  do {
    ;(async () => {
      const lastInputTime = load({
        library: 'chrolog',
        funcName: 'GetLastInputTime',
        retType: DataType.Double,
        paramsType: [],
        paramsValue: []
      })
      if (lastInputTime < 1 || lastEventTime === lastInputTime) return
      lastEventTime = lastInputTime
      webContents.getAllWebContents().forEach((webContent) => {
        webContent.send('input_event')
      })
    })()
    await new Promise((resolve) => setTimeout(resolve, 100))
  } while (!shouldExit)
}

const hookInputsLinux = async () => {
  if (!isChrologLoaded) return
  client.on('data', function (data) {
    const lastInputTimeInt = parseInt(data.toString() || 0)
    if (lastInputTimeInt < 1 || lastEventTime === lastInputTimeInt) return
    lastEventTime = lastInputTimeInt
    webContents.getAllWebContents().forEach((webContent) => {
      webContent.send('input_event')
    })
  })
}

export const hookInputs = async () => {
  if (process.platform === 'win32') hookInputsWin32()
  else if (process.platform === 'linux') hookInputsLinux()
}

const getActiveApp = () => {
  if (!isChrologLoaded) return
  const currentApp = load({
    library: 'chrolog',
    funcName: 'GetActiveApp',
    retType: DataType.String,
    paramsType: [],
    paramsValue: []
  })
  return currentApp
}

export const getActiveAppListener = async () => {
  return getActiveApp()
}

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
  if (processId <= 0 || !isChrologLoaded) return
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

export const getProcessesListener = async () => {
  if (lastProcessFetchTime + 1000 > Date.now() || !isChrologLoaded) return
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

let processCount = 0
let lastTimeFetchingProcessCount = 0

export const getProcessCountListener = async () => {
  if (lastTimeFetchingProcessCount + 1000 > Date.now() || processes.length > 0) return processCount
  if (process.platform === 'linux') {
    processCount = fs.readdirSync('/proc').filter((name) => !isNaN(Number(name))).length
  }
  return processCount
}
