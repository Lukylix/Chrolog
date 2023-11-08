import './loader.css'
import { memo } from 'react'

import { currentPercent, isInitialLoad, isGettingProcessList } from '../../signals/tracking'
import { processes } from '../../signals/processes'

export default memo(() => {
  return processes.value.length < 1 || (isGettingProcessList.value && isInitialLoad.value) ? (
    <section className="loader">
      <h1>
        Loading process {currentPercent.value < 50 ? 'list' : 'infos'}... {currentPercent.value}%
      </h1>
      <div className="loader-bar-container">
        <div
          className="loader-bar"
          style={{
            width: `${currentPercent.value}%`
          }}
        />
      </div>
    </section>
  ) : (
    <></>
  )
})
