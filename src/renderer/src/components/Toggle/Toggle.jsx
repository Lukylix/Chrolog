import './toggle.css'

export default function Toggle({ toggled = false, setIsToggled = () => {} }) {
  const handleToggle = () => {
    setIsToggled((toggled) => !toggled)
  }

  return (
    <label className="switch">
      <input type="checkbox" checked={toggled} onChange={handleToggle} />
      <span className="slider round"></span>
    </label>
  )
}
