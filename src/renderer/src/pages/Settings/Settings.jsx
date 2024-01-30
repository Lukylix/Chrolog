import Slider from '../../components/Slider/Slider'

import HeaderTracking from '../../components/HeaderTracking/Headertracking'
import Toggle from '../../components/Toggle/Toggle'
import { useEffect, useState } from 'react'
import DatalistProcesses from '../../components/DatalistProcesses/DatalistProcesses'
import { ReactComponent as CloseIcon } from '../../assets/close.svg'
import './settings.css'

import {
  minLogSecs,
  minLastInputSecs,
  startTrackingAtLaunch,
  extensionEnabled,
  browserProcesses,
  sitesExclusions
} from '../../signals/settings'
import { trackedApps } from '../../signals/tracking'
import { signal } from '@preact/signals-react'

const { ipcRenderer } = window.require('electron')

function convertSecondsToMinutes(seconds) {
  const minutes = Math.floor(seconds / 60) // Get the whole minutes
  const remainingSeconds = seconds % 60 // Get the remaining seconds

  return `${minutes}:${remainingSeconds < 10 ? '0' : ''}${remainingSeconds}`
}
const siteExclusionInput = signal('')

export default function Settings() {
  useEffect(() => {
    ipcRenderer.send('save-settings', {
      minLogSecs: minLogSecs.value,
      minLastInputSecs: minLastInputSecs.value,
      startTrackingAtLaunch: startTrackingAtLaunch.value,
      extensionEnabled: extensionEnabled.value,
      browserProcesses: browserProcesses.value,
      sitesExclusions: sitesExclusions.value
    })
  }, [
    minLogSecs.value,
    minLastInputSecs.value,
    startTrackingAtLaunch.value,
    extensionEnabled.value,
    browserProcesses.value,
    sitesExclusions.value
  ])
  return (
    <div className="container">
      <HeaderTracking />
      <div className="features">
        <div className="feature-item">
          <h1>Settings</h1>
          <div className="settings">
            <div className="d-grid gap-10">
              <div className="setting-group">
                <h4>Start at launch</h4>
                <button
                  style={{ backgroundColor: '#3282F7', marginBlock: '10px' }}
                  onClick={() => {
                    ipcRenderer.send('set-auto-launch')
                  }}
                >
                  Enable
                </button>
              </div>
              <div className="setting-group">
                <h4>Start tracking at launch</h4>
                <Toggle
                  toggled={startTrackingAtLaunch.value}
                  setIsToggled={(value) =>
                    (startTrackingAtLaunch.value = !startTrackingAtLaunch.value)
                  }
                />
              </div>

              <div className="setting-group">
                <h4>Minimum time to log {convertSecondsToMinutes(minLogSecs.value)}</h4>
                <Slider
                  min={0}
                  max={10 * 60}
                  value={minLogSecs.value}
                  onChange={(value) => (minLogSecs.value = value)}
                />
              </div>
              <div className="setting-group">
                <h4>Maximum afk time {convertSecondsToMinutes(minLastInputSecs.value)}</h4>
                <Slider
                  min={0}
                  max={2 * 60}
                  value={minLastInputSecs.value}
                  onChange={(value) => (minLastInputSecs.value = value)}
                />
              </div>
            </div>
            <div className="d-grid gap-10">
              <div className="setting-group">
                <h4>Enable extension</h4>
                <p>(Permit websites exclusion)</p>
                <Toggle
                  toggled={extensionEnabled.value}
                  setIsToggled={() => {
                    ipcRenderer.send('toggle-extension', !extensionEnabled.value)
                    extensionEnabled.value = !extensionEnabled.value
                  }}
                />
                {extensionEnabled.value && (
                  <>
                    <h4>Browser process</h4>
                    <div className="col-2-auto w-fit-content">
                      <DatalistProcesses />
                      <button
                        style={{ backgroundColor: '#3282F7', margin: '10px 10px 10px 5px' }}
                        onClick={() => {
                          browserProcesses.value = trackedApps.value
                        }}
                      >
                        Update
                      </button>
                    </div>
                    {browserProcesses.value.length > 0 && (
                      <div style={{ marginBottom: '10px' }}>
                        <div className="d-inline">
                          {browserProcesses.value.map((browser) => (
                            <span key={browser} className="browser-processes">
                              {browser}
                              <CloseIcon
                                fill="white"
                                height="15px"
                                className="close-icon"
                                onClick={() =>
                                  (browserProcesses.value = browserProcesses.value.filter(
                                    (site) => site !== browser
                                  ))
                                }
                              />
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                    <h4>Websites exclusion</h4>
                    <div className="col-2-auto w-fit-content">
                      <input
                        value={siteExclusionInput}
                        onChange={(event) => (siteExclusionInput.value = event.target.value)}
                      />
                      <button
                        style={{ backgroundColor: '#3282F7', margin: '10px' }}
                        onClick={() =>
                          (sitesExclusions.value = [
                            ...new Set([...sitesExclusions.value, siteExclusionInput])
                          ])
                        }
                      >
                        Add
                      </button>
                    </div>
                    {sitesExclusions.value.length > 0 && (
                      <div style={{ marginBottom: '10px' }}>
                        <div className="d-inline">
                          {sitesExclusions.value.map((siteExclusion) => (
                            <span key={siteExclusion} className="site-exclusion">
                              {siteExclusion}
                              <CloseIcon
                                fill="white"
                                height="15px"
                                className="close-icon"
                                onClick={() =>
                                  (sitesExclusions.value = sitesExclusions.filter(
                                    (site) => site !== siteExclusion
                                  ))
                                }
                              />
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
