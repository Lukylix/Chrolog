import { useDispatch, useSelector } from 'react-redux'
import { setTrackedApps } from '../../stores/tracking'
import { ReactComponent as RefreshIcon } from '../../assets/refresh.svg'
import useTracking from '../../hooks/useTracking'
import { DataList } from '../DataList'
import './datalistProcesses.css'

export default function DatalistProcesses({ inputValue, setInputValue }) {
  const trackedApps = useSelector((state) => state.tracking.trackedApps)
  const processCount = useSelector((state) => state.tracking.processCount)
  const currentProcess = useSelector((state) => state.tracking.currentProcess)
  const completedProcess = useSelector((state) => state.tracking.completedProcess)
  const isGettingProcessList = useSelector((state) => state.tracking.isGettingProcessList)
  const currentPrecent = (((currentProcess + completedProcess) / processCount) * 100).toFixed(2)
  const processes = useSelector((state) => state.processes)

  const { getProcesses } = useTracking()

  const dispatch = useDispatch()

  return (
    <div className="d-inline">
      <div className="d-inline">
        {isGettingProcessList && (
          <div className="load-processes">
            <div
              className="load-processes-bar"
              style={{
                width: `${currentPrecent}%`
              }}
            />
          </div>
        )}

        <DataList
          data={processes}
          dataKey="name"
          placeholder="Select apps to track ..."
          setSelecteds={(selecteds) => dispatch(setTrackedApps(selecteds(trackedApps)))}
          onChange={setInputValue}
          renderItem={(process, i, { onClick }) => {
            return (
              <div key={i}>
                {process.icon && <img src={process.icon} alt={process.name} />}
                <option
                  onClick={() => onClick(process)}
                  style={{
                    display: process.name?.toLowerCase().includes(inputValue.toLowerCase())
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
