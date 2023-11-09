import { memo, useCallback, useEffect, useRef } from 'react'

import './datalist.css'
import { signal } from '@preact/signals-react'

const input = signal('')
const activeClassName = signal('')

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
    const datalistRef = useRef()

    useEffect(() => {
      datalistRef.current.style.display = 'none'
    }, [])

    const onClick = useCallback((value) => {
      addSelected(value)
      selectedCallBack()
    }, [])
    return (
      <div className={`dropdown-container ${activeClassName}`}>
        <div className="input-container">
          <input
            onFocus={() => {
              datalistRef.current.style.display = 'grid'
              activeClassName.value = 'active'
            }}
            onBlur={() => {
              setTimeout(() => {
                datalistRef.current.style.display = 'none'
                activeClassName.value = ''
              }, 300)
            }}
            value={input}
            onChange={(e) => {
              onChange(e.target.value)
              input.value = e.target.value
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
                    item.toLowerCase().includes(input.toLowerCase()) && 'active'
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
