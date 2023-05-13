import { useSelector } from 'react-redux'
import './loader.css'

export default function Loader() {
  const processes = useSelector((state) => state.processes)
  const processCount = useSelector((state) => state.tracking.processCount)
  const currentProcess = useSelector((state) => state.tracking.currentProcess)
  const completedProcess = useSelector((state) => state.tracking.completedProcess)
  const currentPrecent = (((currentProcess + completedProcess) / processCount) * 100).toFixed(2)

  return !processes.length > 0 ? (
    <section className="loader">
      <h1>
        Loading process {currentPrecent < 50 ? 'list' : 'infos'}... {currentPrecent}%
      </h1>
      <div className="loader-bar-container">
        <div
          className="loader-bar"
          style={{
            width: `${currentPrecent}%`
          }}
        />
      </div>
    </section>
  ) : (
    <></>
  )
}
