import { useCallback } from 'react'
import './toggle.css'

export default function Toggle({ toggled = false, setIsToggled = () => {} }) {
  const handleToggle = useCallback(() => {
    setIsToggled(!toggled)
  }, [])

  return (
    <label className="switch">
      <input type="checkbox" checked={toggled} onChange={handleToggle} />
      <span className="slider round"></span>
    </label>
  )
}
