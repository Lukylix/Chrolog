import fs from 'fs'
import { exec } from 'child_process'

const options = {
  name: 'Chrolog inputs hook'
}

// Process the arguments
let logPath
const args = process.argv.slice(2)
for (let i = 0; i < args.length; i++) {
  if (args[i] === '--log' && i < args.length - 1) {
    logPath = args[i + 1]
    break
  }
}

exec(`logkeys -k && logkeys --start --output ${logPath}`, options, (error, stdout, stderr) => {
  if (error || stderr) console.error(error || stderr)
})

fs.watch(logPath, (eventType) => {
  if (eventType === 'change') {
    console.log('keyboard_event')
  }
})
