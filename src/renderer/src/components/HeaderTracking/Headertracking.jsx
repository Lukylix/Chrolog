import { useSelector } from 'react-redux'
import useTracking from '../../hooks/useTracking.js'
import { Link, useLocation } from 'react-router-dom'
import { ReactComponent as SettingsIcon } from '../../assets/settings.svg'
import { ReactComponent as BackIcon } from '../../assets/back.svg'
import { ReactComponent as FileIcon } from '../../assets/file.svg'
import './headerTracker.css'

const { ipcRenderer } = window.require('electron')

export default function HeaderTracking() {
  const isTracking = useSelector((state) => state.tracking.isTracking)
  const { handleTrack, handleStopTrack } = useTracking()
  const location = useLocation()
  const path = location.pathname
  return (
    <div className="d-inline space-between">
      <div className="d-inline">
        <Link to="/">
          <h2>Chrolog Tracker </h2>
        </Link>
        <div className="icons-title">
          {path === '/' && (
            <Link className="icon-title settings-icon" to="/settings">
              <SettingsIcon fill="white" />
            </Link>
          )}
          {(path === '/settings' || path === '/project') && (
            <Link className="icon-title" to="/">
              <BackIcon fill="white" />
            </Link>
          )}
          <a onClick={() => ipcRenderer.send('open-config-folder')} className="icon-title">
            <FileIcon fill="white" />
          </a>
        </div>
      </div>
      {isTracking ? (
        <button onClick={handleStopTrack} className="bg-red">
          Stop Tracking
        </button>
      ) : (
        <button onClick={handleTrack} className="bg-green">
          Start Tracking
        </button>
      )}
    </div>
  )
}
