import { memo, useCallback, useEffect, useRef, useState } from 'react'

import './datalist.css'

export const DataList = memo(
  ({
    name = 'select',
    placeholder = 'Select',
    data = [],
    dataKey = 'name',
    addSelected = () => {},
    selectedCallBack = () => {},
    renderItem = undefined,
    onChange = () => {}
  }) => {
    const [inputValue, setInputValue] = useState('')
    const [active, setActive] = useState(false)
    const datalistRef = useRef()

    useEffect(() => {
      datalistRef.current.style.display = 'none'
    }, [])

    const onClick = useCallback((value) => {
      addSelected(value)
      selectedCallBack()
    }, [])
    return (
      <div
        className={`dropdown-container ${data.length > 20 && 'w30'} ${data.length > 10 && 'w20'} ${
          active && 'active'
        }`}
      >
        <div className="input-container">
          <input
            onFocus={() => {
              datalistRef.current.style.display = 'grid'
              setActive(true)
            }}
            onBlur={() => {
              setTimeout(() => {
                datalistRef.current.style.display = 'none'
                setActive(false)
              }, 300)
            }}
            value={inputValue}
            onChange={(e) => {
              onChange(e.target.value)
              setInputValue(e.target.value)
            }}
            autoComplete="off"
            list=""
            name={name}
            id={name}
            placeholder={placeholder}
          />
        </div>
        <div className="datalist" ref={datalistRef}>
          {renderItem
            ? data?.map((item, i) => renderItem(item, i, { onClick }))
            : data?.map((item, i) => (
                <option
                  key={i}
                  onClick={(e) => onClick(e.target.value)}
                  className={`datalist-item ${
                    item.toLowerCase().includes(inputValue.toLowerCase()) && 'active'
                  }`}
                >
                  {item || item?.[dataKey]}
                </option>
              ))}
        </div>
      </div>
    )
  }
)
