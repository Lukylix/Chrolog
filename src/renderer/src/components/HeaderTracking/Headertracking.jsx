import { useSelector } from 'react-redux'
import useTracking from '../../hooks/useTracking.js'
import { Link, useLocation } from 'react-router-dom'
import { ReactComponent as SettingsIcon } from '../../assets/settings.svg'
import { ReactComponent as BackIcon } from '../../assets/back.svg'
import './headerTracker.css'

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
        {path === '/' && (
          <Link className="icon-title settings-icon" to="/settings">
            <SettingsIcon fill="white" />
          </Link>
        )}
        {path === '/settings' && (
          <Link className="icon-title" to="/">
            <BackIcon fill="white" />
          </Link>
        )}
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
