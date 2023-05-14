import { useSelector, useDispatch } from 'react-redux'
import Slider from '../../components/Slider/Slider'
import {
  setMinLastInputSecs,
  setMinLogSecs,
  setStartAtLaunch,
  setStartTrackingAtLaunch
} from '../../stores/settings'
import HeaderTracking from '../../components/HeaderTracking/Headertracking'
import Toggle from '../../components/Toggle/Toggle'
import { useEffect } from 'react'

const { ipcRenderer } = window.require('electron')

function convertSecondsToMinutes(seconds) {
  const minutes = Math.floor(seconds / 60) // Get the whole minutes
  const remainingSeconds = seconds % 60 // Get the remaining seconds

  return `${minutes}:${remainingSeconds < 10 ? '0' : ''}${remainingSeconds}`
}

const setAutoLaunch = (value) => {
  ipcRenderer.send('set-auto-launch', value)
}

export default function Settings() {
  const minLogSecs = useSelector((state) => state.settings.minLogSecs)
  const minLastInputSecs = useSelector((state) => state.settings.minLastInputSecs)
  const startTrackingAtLaunch = useSelector((state) => state.settings.startTrackingAtLaunch)
  const startAtLaunch = useSelector((state) => state.settings.startAtLaunch)
  const dispatch = useDispatch()

  useEffect(() => {
    return () => {
      ipcRenderer.send('save-settings', {
        minLogSecs,
        minLastInputSecs,
        startTrackingAtLaunch
      })
    }
  }, [])
  return (
    <div className="container">
      <HeaderTracking />
      <h1>Settings</h1>
      <div className="features">
        <div className="feature-item settings">
          <h4>Start tracking a lauch</h4>
          <Toggle
            toggled={startTrackingAtLaunch}
            setIsToggled={(value) =>
              dispatch(setStartTrackingAtLaunch(value(startTrackingAtLaunch)))
            }
          />
          <h4>Start at launch</h4>
          <Toggle
            toggled={startAtLaunch}
            setIsToggled={(value) => {
              dispatch(setStartAtLaunch(value(startAtLaunch)))
              setAutoLaunch(startAtLaunch)
            }}
          />
          <h4>Minimum time to log {convertSecondsToMinutes(minLogSecs)}</h4>
          <Slider
            min={0}
            max={10 * 60}
            value={minLogSecs}
            onChange={(value) => dispatch(setMinLogSecs(value))}
          />
          <h4>Maximun afk time {convertSecondsToMinutes(minLastInputSecs)}</h4>
          <Slider
            min={0}
            max={2 * 60}
            value={minLastInputSecs}
            onChange={(value) => dispatch(setMinLastInputSecs(value))}
          />
        </div>
      </div>
    </div>
  )
}
