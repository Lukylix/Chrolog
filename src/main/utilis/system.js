import ffi from '@lwahonen/ffi-napi'
import ref from '@lwahonen/ref-napi'
import { webContents, nativeImage } from 'electron'
import { timeoutPromise } from './utilis'
import fs from 'fs'
import path from 'path'
import x11 from 'x11'

const MAX_PATH = 260
const PROCESS_QUERY_INFORMATION = 0x0400
const PROCESS_VM_READ = 0x0010

const TH32CS_SNAPPROCESS = 0x00000002
const PROCESSENTRY32_SIZE = 568

const WH_KEYBOARD_LL = 13
const WH_MOUSE_LL = 14

let voidPtr = ref.refType(ref.types.void)
let stringPtr = ref.refType(ref.types.CString)

let kernel32,
  psapi,
  user32,
  keyboardHookProc,
  mouseHookProc,
  hKeyboardHook,
  hMouseHook,
  lastMouseEventTime,
  X,
  root
let lastProcessFetchTime = 0
let processes = []
let processesToBeFetched = 0
let completedProcesses = 0

if (process.platform === 'win32') {
  kernel32 = new ffi.Library('kernel32', {
    OpenProcess: ['int32', ['uint32', 'bool', 'uint32']],
    CloseHandle: ['bool', ['int32']],
    CreateToolhelp32Snapshot: ['long', ['uint32', 'uint32']],
    Process32First: ['int32', ['long', 'pointer']],
    Process32Next: ['int32', ['long', 'pointer']]
  })

  psapi = new ffi.Library('psapi', {
    GetModuleFileNameExA: ['uint32', ['int32', 'int32', 'pointer', 'uint32']]
  })

  user32 = new ffi.Library('user32', {
    GetForegroundWindow: ['int32', []],
    GetWindowTextA: ['long', ['long', stringPtr, 'long']],
    GetWindowThreadProcessId: ['uint32', ['int32', 'pointer']],
    EnumWindows: ['int', [voidPtr, 'int32']],
    SetWindowsHookExA: ['int', ['int', 'pointer', 'int', 'int']],
    CallNextHookEx: ['int', ['long', 'int', 'long', 'long']],
    UnhookWindowsHookEx: ['bool', ['int']],
    IsWindowVisible: ['bool', ['long']]
  })

  keyboardHookProc = ffi.Callback('long', ['int', 'long', 'long'], function (code, wParam, lParam) {
    // Send a 'keyboard_event' to all renderer processes
    webContents.getAllWebContents().forEach((webContent) => {
      webContent.send('keyboard_event', { wParam, lParam })
    })
    return user32.CallNextHookEx(0, code, wParam, lParam)
  })

  lastMouseEventTime = Date.now()

  mouseHookProc = ffi.Callback('long', ['int', 'long', 'long'], function (code, wParam, lParam) {
    let currentTime = Date.now()

    if (currentTime - lastMouseEventTime > 100) {
      // Send a 'mouse_event' to all renderer processes
      webContents.getAllWebContents().forEach((webContent) => {
        webContent.send('mouse_event', { wParam, lParam })
      })
      lastMouseEventTime = currentTime
    }
    return user32.CallNextHookEx(0, code, wParam, lParam)
  })
} else if (process.platform === 'linux') {
  lastMouseEventTime = Date.now()
}

const hookInputsWin32 = () => {
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
}

const handleEventLinux = (ev) => {
  if (ev.name === 'KeyPress') {
    let currentTime = Date.now()

    if (currentTime - lastMouseEventTime > 100) {
      // Send a 'keyboard_event' to all renderer processes
      webContents.getAllWebContents().forEach((webContent) => {
        webContent.send('keyboard_event', { keyCode: ev.keycode })
      })

      lastMouseEventTime = currentTime
    }
  } else if (ev.name === 'ButtonPress') {
    let currentTime = Date.now()

    if (currentTime - lastMouseEventTime > 100) {
      // Send a 'mouse_event' to all renderer processes
      webContents.getAllWebContents().forEach((webContent) => {
        webContent.send('mouse_event', { button: ev.button, x: ev.x, y: ev.y })
      })

      lastMouseEventTime = currentTime
    }
  }
}

const hookInputsLinux = () => {
  x11.createClient(function (err, display) {
    if (!display) {
      throw new Error('Could not connect to X11 server')
    }

    X = display.client
    root = display.screen[0].root

    X.ChangeWindowAttributes(root, {
      eventMask: x11.eventMask.KeyPress | x11.eventMask.ButtonPress
    })
    X.on('event', handleEventLinux)
  })
}

export const hookInputs = () => {
  if (process.platform === 'win32') hookInputsWin32()
  else if (process.platform === 'linux') hookInputsLinux()
}

const getActiveAppListenerWin32 = () => {
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
}

const getActiveAppListenerLinux = () => {
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
          if (err) {
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
              if (err) {
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
  if (process.platform === 'win32') return getActiveAppListenerWin32()
  else if (process.platform === 'linux') return await getActiveAppListenerLinux()
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
  const { processId, snapshot, entry } = processQueue.shift()
  await timeoutPromise(50)
  await getProcessInfos(processId, snapshot, entry)
  processQueueItem()
}

const enqueueProcess = (processId, snapshot, entry) => {
  processQueue.push({ processId, snapshot, entry })
  if (!isProcessing) processQueueItem()
}

const getProcessInfos = async (processId) => {
  const hProcess = kernel32.OpenProcess(
    PROCESS_QUERY_INFORMATION | PROCESS_VM_READ,
    false,
    processId
  )

  if (hProcess) {
    const buffer = Buffer.alloc(MAX_PATH)
    const size = psapi.GetModuleFileNameExA(hProcess, 0, buffer, MAX_PATH)

    if (size > 0) {
      const processName = buffer.toString('utf8', 0, size).split('\\').pop()
      const image = nativeImage.createFromPath(processName)
      if (!processes.find((p) => p.name === processName)) {
        processes.push({
          pid: processId,
          name: processName,
          image: image.toDataURL()
        })
      }
    }

    kernel32.CloseHandle(hProcess)
  }
  completedProcesses += 1
  webContents.getAllWebContents().forEach((webContent) => {
    webContent.send('processes-event', processes)
  })
  if (completedProcesses === processesToBeFetched) {
    console.log("Sending 'processes-event' to all renderer processes")
    webContents.getAllWebContents().forEach((webContent) => {
      webContent.send('processes-event', processes)
    })
  }
  // }
}

const getProcessesListenerWindows = async () => {
  if (lastProcessFetchTime + 1000 > Date.now() || processes.length > 0) return
  console.log('get-windows-with-icons')
  lastProcessFetchTime = Date.now()
  processes = []
  const EnumWindowsProc = ffi.Callback('int', ['long', 'int32'], (hwnd) => {
    let processId = ref.alloc('uint32')
    user32.GetWindowThreadProcessId(hwnd, processId)

    if (processId.deref() === 0 || !processId.deref()) return 1

    let snapshot = kernel32.CreateToolhelp32Snapshot(TH32CS_SNAPPROCESS, 0)
    if (!snapshot) return 1
    let entry = Buffer.alloc(PROCESSENTRY32_SIZE)
    entry.writeUInt32LE(PROCESSENTRY32_SIZE, 0)
    if (!entry) return 1
    if (!kernel32.Process32First(snapshot, entry)) {
      kernel32.CloseHandle(snapshot)
      return 1
    }
    processesToBeFetched += 1
    webContents.getAllWebContents().forEach((webContent) => {
      webContent.send('fetching-process-count', processesToBeFetched)
    })
    enqueueProcess(processId.deref())
    return 1
  })
  await timeoutPromise(2000)
  user32.EnumWindows(EnumWindowsProc, 0)
}

const getProcessesListenerLinux = async () => {
  if (lastProcessFetchTime + 1000 > Date.now() || processes.length > 0) return
  console.log('get-windows-with-icons')
  let processDirs = fs.readdirSync('/proc').filter((name) => !isNaN(Number(name)) && name !== '1')

  processes = processDirs.map((pid, i) => {
    webContents.getAllWebContents().forEach((webContent) => {
      webContent.send('fetching-process-count', i + 1)
    })
    const processPath = path.join('/proc', pid)
    const cmdline = fs.readFileSync(path.join(processPath, 'cmdline')).toString().split('\0')
    const name = cmdline[0].split('/').pop().split(' ')[0]
    let exeLink = ''
    try {
      exeLink = fs.readlinkSync(path.join(processPath, 'exe'))
    } catch (error) {
      if (error.code !== 'EACCES' && error.code !== 'ENOENT') {
        throw error
      }
      // if 'EACCES', permission was denied, so we continue without the link
    }
    return {
      pid: Number(pid),
      name,
      exeLink
    }
  })
  processes = [...new Set(processes.map((p) => p.name))].map((name) => {
    const process = processes.find((p) => p.name === name)
    const image = nativeImage.createFromPath(process.exeLink)
    return {
      pid: process.pid,
      name: process.name,
      image: image.toDataURL()
    }
  })
  console.log("Sending 'processes-event' to all renderer processes")
  webContents.getAllWebContents().forEach((webContent) => {
    webContent.send('processes-event', processes)
  })
  return processes
}

export const getProcessesListener = async () => {
  if (process.platform === 'win32') return getProcessesListenerWindows()
  if (process.platform === 'linux') return getProcessesListenerLinux()
}

let processCount = 0
let lastTimeFetchingProcessCount = 0

export const getProcessCountListener = async () => {
  if (lastTimeFetchingProcessCount + 1000 > Date.now()) return processCount
  if (processCount > 0) return processCount
  if (process.platform === 'linux') {
    processCount = fs.readdirSync('/proc').filter((name) => !isNaN(Number(name))).length
    return processCount
  } else if (process.platform === 'win32') {
    const CountWindowsProc = ffi.Callback('int', ['long', 'int32'], () => {
      processCount += 1
      return 1
    })
    user32.EnumWindows(CountWindowsProc, 0)
  }
  return processCount
}