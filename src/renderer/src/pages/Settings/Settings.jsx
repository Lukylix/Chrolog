import { useSelector, useDispatch } from 'react-redux'
import Slider from '../../components/Slider/Slider'
import {
  setBrowserProcesses,
  setExtensionEnabled,
  setMinLastInputSecs,
  setMinLogSecs,
  setSitesExclusions,
  setStartTrackingAtLaunch
} from '../../stores/settings'
import HeaderTracking from '../../components/HeaderTracking/Headertracking'
import Toggle from '../../components/Toggle/Toggle'
import { useEffect, useState } from 'react'
import DatalistProcesses from '../../components/DatalistProcesses/DatalistProcesses'
import { ReactComponent as CloseIcon } from '../../assets/close.svg'
import './settings.css'

const { ipcRenderer } = window.require('electron')

function convertSecondsToMinutes(seconds) {
  const minutes = Math.floor(seconds / 60) // Get the whole minutes
  const remainingSeconds = seconds % 60 // Get the remaining seconds

  return `${minutes}:${remainingSeconds < 10 ? '0' : ''}${remainingSeconds}`
}

export default function Settings() {
  const minLogSecs = useSelector((state) => state.settings.minLogSecs)
  const minLastInputSecs = useSelector((state) => state.settings.minLastInputSecs)
  const startTrackingAtLaunch = useSelector((state) => state.settings.startTrackingAtLaunch)
  const extensionEnabled = useSelector((state) => state.settings.extensionEnabled)
  const browserProcesses = useSelector((state) => state.settings.browserProcesses)
  const sitesExclusions = useSelector((state) => state.settings.sitesExclusions)
  const [browserInputValue, setBrowserInputValue] = useState('')
  const [siteExclusionInputValue, setSiteExclusionInputValue] = useState('')
  const trackedApps = useSelector((state) => state.tracking.trackedApps)

  const dispatch = useDispatch()
  useEffect(() => {
    ipcRenderer.send('save-settings', {
      minLogSecs,
      minLastInputSecs,
      startTrackingAtLaunch,
      extensionEnabled,
      browserProcesses,
      sitesExclusions
    })
  }, [
    minLogSecs,
    minLastInputSecs,
    startTrackingAtLaunch,
    extensionEnabled,
    browserProcesses,
    sitesExclusions
  ])
  return (
    <div className="container">
      <HeaderTracking />
      <h1>Settings</h1>
      <div className="features">
        <div className="feature-item settings">
          <h4>Start at launch</h4>
          <button
            style={{ backgroundColor: '#3282F7', marginBlock: '10px' }}
            onClick={(value) => {
              ipcRenderer.send('set-auto-launch')
            }}
          >
            Enable
          </button>

          <h4>Start tracking a lauch</h4>
          <Toggle
            toggled={startTrackingAtLaunch}
            setIsToggled={(value) => dispatch(setStartTrackingAtLaunch(!startTrackingAtLaunch))}
          />
          <h4>Enable extension</h4>
          <Toggle
            toggled={extensionEnabled}
            setIsToggled={(value) => {
              ipcRenderer.send('toggle-extension', !extensionEnabled)
              dispatch(setExtensionEnabled(!extensionEnabled))
            }}
          />
          <h4>Browser process</h4>
          <div className="d-inline">
            <DatalistProcesses
              inputValue={browserInputValue}
              setInputValue={setBrowserInputValue}
            />
            <button
              style={{ backgroundColor: '#3282F7', margin: '10px 10px 10px 5px' }}
              onClick={() => {
                dispatch(setBrowserProcesses(trackedApps))
              }}
            >
              Update
            </button>
          </div>
          <h4>Websites exclusion</h4>
          <div className="d-inline">
            <input
              value={siteExclusionInputValue}
              onChange={(event) => setSiteExclusionInputValue(event.target.value)}
            />
            <button
              style={{ backgroundColor: '#3282F7', margin: '10px' }}
              onClick={() => {
                dispatch(
                  setSitesExclusions([...new Set([...sitesExclusions, siteExclusionInputValue])])
                )
              }}
            >
              Add
            </button>
          </div>
          <div style={{ marginBottom: '10px' }}>
            <div className="d-inline">
              {sitesExclusions.map((siteExclusion) => (
                <span key={siteExclusion} className="site-exclusion">
                  {siteExclusion}
                  <CloseIcon
                    fill="white"
                    height="15px"
                    className="close-icon"
                    onClick={() =>
                      dispatch(
                        setSitesExclusions(sitesExclusions.filter((site) => site !== siteExclusion))
                      )
                    }
                  />
                </span>
              ))}
            </div>
          </div>
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
