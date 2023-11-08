import { signal } from '@preact/signals-react'

import { isInitialLoad, currentProcess, completedProcess, isGettingProcessList } from './tracking'

const { ipcRenderer } = window.require('electron')

export const processes = signal([])

export function processesCallback(event, processesRes) {
  if (processesRes.length === 0) return
  processes.value = processesRes
  isGettingProcessList.value = false
  isInitialLoad.value = false
}

export function addProcess(process) {
  processes.value.push({ process })
}

export function removeProcess(name) {
  processes.value = processes.value.filter((process) => process.name !== name)
}

export async function getProcesses() {
  if (isGettingProcessList.value) return
  currentProcess.value = 0
  completedProcess.value = 0
  isGettingProcessList.value = true
  ipcRenderer.send('get-windows-with-icons')
}
