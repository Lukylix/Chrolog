import { exec } from 'child_process'
import { open, load, close, DataType } from 'ffi-rs'
import { fileURLToPath } from 'url'
import fs from 'fs'

const tempFilePath =
  process.argv[
    process.argv.findIndex((arg, index) => arg === '--tempFile' && process.argv[index + 1]) + 1
  ]

const changeFilePermissions = (filePath) => {
  exec(`chmod 666 ${filePath}`)
}

const createFileIfNotExists = (filePath) => {
  const folderPath = filePath.replace(/(?!\/).[^\/]+$/gm, '')
  if (!fs.existsSync(folderPath)) {
    fs.mkdirSync(folderPath, { recursive: true })
  }

  fs.writeFileSync(tempFilePath, '')
  changeFilePermissions(tempFilePath)
}

createFileIfNotExists(tempFilePath)

// Function to send message to the parent process
const send = (message) => {
  fs.writeFileSync(tempFilePath, message, { flag: 'r+' })
}

const processPath = fileURLToPath(import.meta.url)
  .replace(/(?!\/).[^\/]+$/gm, '')
  .replace(/\/$/, '')
console.log('processPath', processPath)
const chrologPath = `${processPath}/chrolog.so`
open({
  library: 'chrolog',
  path: chrologPath
})

let shouldExit = false

// Cleanup the temp file on exit
process.on('exit', () => {
  shouldExit = true
  if (fs.existsSync(tempFilePath)) {
    fs.unlinkSync(tempFilePath)
  }
  close('chrolog')
})

let lastMouseEventTime = 0
;(async () => {
  do {
    const lastInputTime = load({
      library: 'chrolog',
      funcName: 'GetLastInputTime',
      retType: DataType.Double,
      paramsType: [],
      paramsValue: []
    })
    if (lastInputTime < 1 || lastMouseEventTime === lastInputTime) continue
    lastMouseEventTime = lastInputTime
    send('input_event')

    await new Promise((resolve) => setTimeout(resolve, 100))
  } while (!shouldExit)
})()
