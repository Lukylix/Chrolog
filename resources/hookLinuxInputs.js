import { exec } from 'child_process'
import ChrologIOhook from 'chrolog-iohook'
import fs from 'fs'

const tempFilePath =
  process.argv[
    process.argv.findIndex((arg, index) => arg === '--tempFile' && process.argv[index + 1]) + 1
  ]

fs.writeFileSync(tempFilePath, '')

exec(`chmod +rw ${tempFilePath}`, (error) => {
  if (error) {
    console.error(error)
    process.exit(1)
  }
})

// Function to send message to the parent process
function send(message) {
  fs.writeFileSync(tempFilePath, message)
}
console.log('Creating instance...')

const instance = new ChrologIOhook()

console.log('Hooking inputs...')

// Set keyboard callback
instance.setKeyboardCallback(() => {
  send('keyboard_event')
})

console.log('Hooking mouse...')

instance.setMouseCallback(() => {
  send('mouse_event')
})

console.log('Starting logger...')

// Start the logger
instance.log()

console.log('Inputs hooked')

// Cleanup the temp file on exit
process.on('exit', () => {
  if (fs.existsSync(tempFilePath)) {
    fs.unlinkSync(tempFilePath)
  }
})
