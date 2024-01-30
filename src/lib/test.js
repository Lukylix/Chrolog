const { load, DataType, open, arrayConstructor, close } = require('ffi-rs')

const getProcessInfos = async (processId) => {
  if (processId <= 0) return

  const [process, path] = load({
    library: 'chrolog',
    funcName: 'GetProcessInfos',
    retType: arrayConstructor({ type: DataType.StringArray, length: 2 }),
    paramsType: [DataType.I32],
    paramsValue: [processId]
  })
  return { process, path }
}

if (process.platform === 'win32') {
  const chrologPath = new URL('../../resources/chrolog.dll', import.meta.url)
  open({
    library: 'chrolog',
    path: chrologPath
  })
} else if (process.platform === 'linux') {
  const chrologPath = new URL('../../resources/chrolog.so', import.meta.url)
  console.log('chrologPath', chrologPath.href)
  open({
    library: 'chrolog',
    path: chrologPath
  })
}

const testLastInputs = async () => {
  const startTime = Date.now()
  while (Date.now() - startTime < 5000) {
    const lastinputTime = load({
      library: 'chrolog',
      funcName: 'GetLastInputTime',
      retType: DataType.Double,
      paramsType: [],
      paramsValue: []
    })
    const lastinputTimeDate = new Date(lastinputTime)
    console.log('lastinputTime', lastinputTimeDate.toLocaleString())
    await new Promise((resolve) => setTimeout(resolve, 200))
  }
  close('chrolog')
}

const enumProcess = async () => {
  let processes = []
  const isSucess = load({
    library: 'chrolog',
    funcName: 'EnumWindowsProcessIds',
    retType: DataType.Boolean,
    paramsType: [],
    paramsValue: []
  })
  console.log('isSucess', isSucess)
  if (!isSucess) return
  let pids = []
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
    pids.push(pid)
  } while (pid > 0)

  console.log('pids', pids)
  console.log('pids.length', pids.length)
  for (let i = 0; i < pids.length; i++) {
    const { process, path } = await getProcessInfos(pids[i])
    processes.push({ process, path })
  }
  console.log('processes', processes)
}
;(async () => {
  await enumProcess()
  await testLastInputs()
})()
