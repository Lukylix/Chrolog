import { Link, useLocation } from 'react-router-dom'
import { ReactComponent as SettingsIcon } from '../../assets/settings.svg'
import { ReactComponent as BackIcon } from '../../assets/back.svg'
import { ReactComponent as FileIcon } from '../../assets/file.svg'
import { ReactComponent as PowerIcon } from '../../assets/power.svg'
import { ReactComponent as ChrologIcon } from '../../assets/chrolog.svg'
import './headerTracker.css'

import { isTracking } from '../../signals/tracking.js'

const { ipcRenderer } = window.require('electron')

export default function HeaderTracking() {
  const location = useLocation()
  const path = location.pathname
  return (
    <div className="d-inline space-between">
      <div className="d-inline">
        <Link to="/">
          <h2>
            <ChrologIcon
              height="35px"
              fill="white"
              style={{ transform: 'translateY(8px)', marginRight: '2px' }}
            />
            hrolog Tracker
          </h2>
        </Link>
        <div className="icons-title">
          {path === '/' && (
            <>
              <Link className="icon-title settings-icon" to="/settings">
                <SettingsIcon fill="white" />
              </Link>
              <a onClick={() => ipcRenderer.send('open-config-folder')} className="icon-title">
                <FileIcon fill="white" />
              </a>
            </>
          )}
          {path !== '/' && (
            <Link className="icon-title" to="/">
              <BackIcon fill="white" />
            </Link>
          )}
        </div>
      </div>

      <PowerIcon
        fill={isTracking.value ? '#1AA68A' : '#FF6347'}
        height="45px"
        onClick={() => (isTracking.value = !isTracking.value)}
      />
    </div>
  )
}
