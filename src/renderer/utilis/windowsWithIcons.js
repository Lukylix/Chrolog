// In the renderer process, import ipcRenderer
const { ipcRenderer } = window.require('electron')
const getWindowsWithIcons = async () => {
  // Send a message to the main process to execute the getProcessesWithIcons function
  const processesWithIcons = await ipcRenderer.invoke('get-windows-with-icons')
  console.log('processesWithIcons:', processesWithIcons)
  return processesWithIcons
}

export default getWindowsWithIcons
