import { memo, useCallback, useEffect, useRef, useState } from 'react'

import './datalist.css'

export const DataList = memo(
  ({
    name = 'select',
    placeholder = 'Select',
    data = [],
    dataKey = 'name',
    setSelecteds = () => {},
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

    const addSelected = useCallback((value) => {
      console.log('Add Seelected', value)
      setSelecteds((selecteds) => {
        return [...new Set([value, ...selecteds])]
      })
    }, [])
    const onClick = useCallback((value) => {
      console.log('On Click')
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
                  style={{
                    display: item.toLowerCase().includes(inputValue.toLowerCase())
                      ? 'block'
                      : 'none'
                  }}
                >
                  {item || item?.[dataKey]}
                </option>
              ))}
        </div>
      </div>
    )
  }
)
