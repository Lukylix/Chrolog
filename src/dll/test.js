const { load, DataType, open, arrayConstructor } = require('ffi-rs')

const getProcessInfos = async (processId) => {
  if (processId <= 0) return

  const [process, path] = load({
    library: 'chrolog',
    funcName: 'GetProcessInfos',
    retType: arrayConstructor({ type: DataType.StringArray, length: 2 }),
    paramsType: [DataType.I32],
    paramsValue: [processId]
  })
  console.log(process)
  console.log(path)
}

open({
  library: 'chrolog',
  path: `${__dirname}/../../resources/chrolog.dll`
})

processes = []
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
  getProcessInfos(pids[i])
}