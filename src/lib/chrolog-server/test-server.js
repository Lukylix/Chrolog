const net = require('net')
const { open, load, close, DataType } = require('ffi-rs')

open({
  library: 'chrolog',
  path: `${import.meta.url}/../../../resources/chrolog.so`
})

function getActiveApp() {
  const currentApp = load({
    library: 'chrolog',
    funcName: 'GetActiveApp',
    retType: DataType.String,
    paramsType: [],
    paramsValue: []
  })
  return currentApp
}
const client = new net.Socket()

client.on('close', function () {
  console.log('Connection closed')
})

client.once('connect', function () {
  console.log('Connected')
  client.write('JOIN last-inputs-time')
})

client.on('error', async function (err) {
  console.log('Connection error. Retrying in 1 second...')
  await new Promise((resolve) => setTimeout(resolve, 1000))
  client.connect(9808, '127.0.0.1')
})

client.on('data', function (lastInputTime) {
  const lastInputTimeInt = parseInt(lastInputTime.toString() || 0)
  if (!lastInputTimeInt) console.log(lastInputTime.toString())
  console.log('lastInputTimeInt', lastInputTimeInt)
})

client.connect(9808, '127.0.0.1')

process.on('exit', function () {
  client.destroy()
  close('chrolog')
})
