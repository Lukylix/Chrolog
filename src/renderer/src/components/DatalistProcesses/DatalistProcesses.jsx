import { ReactComponent as RefreshIcon } from '../../assets/refresh.svg'
import { DataList } from '../Datalist/Datalist'
import './datalistProcesses.css'
import { processes, getProcesses } from '../../signals/processes'
import { isGettingProcessList, currentPercent, trackedApps } from '../../signals/tracking'
import { useState } from 'react'
import { signal } from '@preact/signals-react'

const addTrackedApp = (app) => {
  trackedApps.value = [...new Set([...trackedApps.value, app])]
}

const input = signal('')

export default function DatalistProcesses() {
  return (
    <div className="d-inline w-100">
      <div className="d-inline processes-datalist">
        {isGettingProcessList.value && (
          <div className="load-processes">
            <div
              className="load-processes-bar"
              style={{
                width: `${currentPercent.value}%`
              }}
            />
          </div>
        )}
        <DataList
          data={processes.value}
          dataKey="name"
          onChange={(v) => (input.value = v)}
          placeholder="Select apps to track ..."
          addSelected={(selected) => addTrackedApp(selected)}
          renderItem={(process, i, { onClick }) => {
            return (
              <div key={i}>
                {process.icon && <img src={process.icon} alt={process.name} />}
                <option
                  onClick={() => onClick(process)}
                  style={{
                    display: process.name?.toLowerCase().includes(input.value.toLowerCase())
                      ? 'block'
                      : 'none'
                  }}
                >
                  {process.name}
                </option>
              </div>
            )
          }}
        />
      </div>
      <RefreshIcon fill="white" className="refresh-icon" onClick={() => getProcesses()} />
    </div>
  )
}
