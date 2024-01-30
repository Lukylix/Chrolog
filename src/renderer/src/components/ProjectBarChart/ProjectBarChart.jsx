import { memo, useEffect } from 'react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import Select from 'react-select'
import { ReactComponent as ChevronRight } from '../../assets/chevron_right.svg'
import { ReactComponent as ChevronLeft } from '../../assets/chevron_left.svg'

import { appsColorMap } from '../../signals/currentProject'
import { currentPeriod, currentPeriodYear } from '../../signals/tracking'
import { period, dataChart, currentChartTrackedApps } from '../../signals/projectChart'

import { prettyTime, prettyTimeHoursMins } from '../../utlis/prettyTime'

import './projectBarChart.css'

const periods = ['week', 'month', 'year']

const addDaysToDate = (date, days) => {
  let result = new Date(date)
  result.setDate(result.getDate() + days)
  return result
}

const addMonthsToDate = (date, months) => {
  let result = new Date(date)
  result.setMonth(result.getMonth() + months)
  return result
}

const addYearsToDate = (date, years) => {
  let result = new Date(date)
  result.setFullYear(result.getFullYear() + years)
  return result
}

const nextChart = () => {
  if (period.value === 'week') {
    const start = addDaysToDate(currentPeriod.value.start, 7)
    const end = addDaysToDate(currentPeriod.value.end, 7)
    currentPeriod.value = { start: start.getTime(), end: end.getTime() }
  } else if (period.value === 'month') {
    const start = addMonthsToDate(currentPeriod.value.start, 1)
    start.setDate(1)
    const end = new Date(start.getFullYear(), start.getMonth() + 1, 0)
    currentPeriod.value = { start: start.getTime(), end: end.getTime() }
  } else if (period.value === 'year') {
    const start = addYearsToDate(currentPeriod.value.start, 1)
    const end = addYearsToDate(currentPeriod.value.end, 1)
    currentPeriod.value = { start: start.getTime(), end: end.getTime() }
  }
}

const prevChart = () => {
  if (period.value === 'week') {
    const start = addDaysToDate(currentPeriod.value.start, -7)
    const end = addDaysToDate(currentPeriod.value.end, -7)
    currentPeriod.value = { start: start.getTime(), end: end.getTime() }
  } else if (period.value === 'month') {
    const start = addMonthsToDate(currentPeriod.value.start, -1)
    start.setDate(1)
    const end = new Date(start.getFullYear(), start.getMonth() + 1, 0)
    currentPeriod.value = { start: start.getTime(), end: end.getTime() }
  } else if (period.value === 'year') {
    const start = addYearsToDate(currentPeriod.value.start, -1)
    const end = addYearsToDate(currentPeriod.value.end, -1)
    currentPeriod.value = { start: start.getTime(), end: end.getTime() }
  }
}

const ProjectBarCharts = memo(() => {
  useEffect(() => {
    const handleKeyDown = (e) => {
      const leftArrow = 37
      const rightArrow = 39
      if (e.keyCode === leftArrow) prevChart()
      else if (e.keyCode === rightArrow) nextChart()
    }
    addEventListener('keydown', handleKeyDown)
    return () => {
      removeEventListener('keydown', handleKeyDown)
    }
  }, [])
  return (
    <div className="feature-item grid-fill">
      <h2 className="graph-year">
        {/*Signal Optimization */}
        <>{currentPeriodYear}</>
      </h2>
      <div className="chart-controls">
        <ChevronLeft fill="white" onClick={prevChart} />
        <Select
          className="react-select-container"
          classNamePrefix="react-select"
          unstyled
          isSearchable={false}
          data={periods}
          defaultValue={{ label: period.value, value: period.value }}
          onChange={(val) => (period.value = val.value)}
          options={periods.map((val) => ({ label: val, value: val }))}
        />
        <ChevronRight fill="white" onClick={nextChart} />
      </div>
      <ResponsiveContainer width="100%" aspect={2.5}>
        <BarChart
          width={500}
          height={300}
          data={dataChart.value}
          margin={{
            top: 20,
            left: 10
          }}
        >
          <XAxis dataKey="name" stroke="white" />
          <YAxis stroke="white" tickFormatter={prettyTimeHoursMins} />
          <Tooltip
            contentStyle={{ backgroundColor: '#21252b', borderRadius: '10px' }}
            formatter={prettyTime}
            cursor={{ fill: '#282c34' }}
          />
          <Legend />
          {currentChartTrackedApps.value.map((app, i) => (
            <Bar
              sty
              key={i}
              dataKey={app}
              stackId="a"
              fill={appsColorMap.value[app.toLowerCase()]}
            />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
})
export default ProjectBarCharts
