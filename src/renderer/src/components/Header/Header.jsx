const { ipcRenderer } = window.require('electron')

import { ReactComponent as Close } from '../../assets/close.svg'
import { ReactComponent as Minimize } from '../../assets/minimize.svg'
import { ReactComponent as Maximize } from '../../assets/fullscreen.svg'

import './header.css'
import { memo, useCallback } from 'react'
import useTracking from '../../hooks/useTracking'

const Header = memo(() => {
  const minimize = useCallback(() => ipcRenderer.send('minimize-event'), [])
  const maximize = useCallback(() => ipcRenderer.send('maximize-event'), [])
  const close = useCallback(() => ipcRenderer.send('close-event'), [])
  useTracking(true)

  return (
    <div className="header">
      <div className="dragable"></div>
      <nav className="nav">
        <Minimize fill="white" onClick={minimize} style={{ transform: 'translateY(-2px)' }} />
        <Maximize fill="#3282f7" onClick={maximize} />
        <Close height="24px" width="24px" fill="#f3696c" onClick={close} />
      </nav>
    </div>
  )
})
export default Header
