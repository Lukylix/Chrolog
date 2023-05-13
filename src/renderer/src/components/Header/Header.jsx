const { ipcRenderer } = window.require('electron')

import { ReactComponent as Close } from '../../assets/close.svg'
import { ReactComponent as Minimize } from '../../assets/minimize.svg'
import { ReactComponent as Maximize } from '../../assets/fullscreen.svg'

import './header.css'

export default function Header() {
  const minimize = () => ipcRenderer.send('minimize-event')
  const maximize = () => ipcRenderer.send('maximize-event')
  const close = () => ipcRenderer.send('close-event')

  return (
    <nav className="header">
      <Minimize fill="white" onClick={minimize} style={{ transform: 'translateY(-2px)' }} />
      <Maximize fill="#3282f7" onClick={maximize} />
      <Close fill="#f3696c" onClick={close} />
    </nav>
  )
}
