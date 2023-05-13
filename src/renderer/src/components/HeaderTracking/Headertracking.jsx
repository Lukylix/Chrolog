import { useSelector } from 'react-redux'
import useTracking from '../../hooks/useTracking.js'
import { Link } from 'react-router-dom'

export default function HeaderTracking() {
  const isTracking = useSelector((state) => state.tracking.isTracking)
  const { handleTrack, handleStopTrack } = useTracking()
  return (
    <div className="d-inline space-between">
      <Link to="/">
        <h2>Application Tracker</h2>
      </Link>
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
