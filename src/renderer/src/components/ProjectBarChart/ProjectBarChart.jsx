import { useEffect, useMemo, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useParams } from 'react-router-dom'
import {
  BarChart,
  Bar,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts'
import Select from 'react-select'
import { ReactComponent as ChevronRight } from '../../assets/chevron_right.svg'
import { ReactComponent as ChevronLeft } from '../../assets/chevron_left.svg'
import { setCurrentPeriod } from '../../stores/tracking'

import './projectBarChart.css'

const prettyTime = (s) => {
  const hours = Math.floor(s / 3600)
  const minutes = Math.floor((s - hours * 3600) / 60)
  const seconds = s - hours * 3600 - minutes * 60
  return `${hours ? hours + 'h' : ''} ${minutes ? minutes + 'm' : ''} ${seconds || 0 + 's'}`
}

const prettyTimeHoursMins = (s) => {
  const hours = Math.floor(s / 3600)
  const minutes = Math.floor((s - hours * 3600) / 60)
  return `${hours ? hours + 'h' : ''} ${minutes ? minutes + 'm' : ''}`
}

const periods = ['week', 'month', 'year']

const currentDate = new Date()
const currentDay = currentDate.getDay() // Current day of the week (0-6)
const startDay = new Date(new Date().setDate(currentDate.getDate() - currentDay)) // Start day (Monday)
const endDay = new Date(new Date().setDate(currentDate.getDate() - currentDay + 6)) // End day (Sunday)

export default function ProjectBarCharts({ appsColorMap }) {
  const { name } = useParams()
  const dispatch = useDispatch()
  const trackingData = useSelector((state) => state.trackingData)
  const project = trackingData[name]
  const [period, setPeriod] = useState('week')

  const currentPeriod = useSelector((state) => state.tracking.currentPeriod)
  const trackingLogsFinished = useMemo(
    () => project?.trackingLogs.filter((log) => log.endDate),
    [project?.trackingLogs]
  )
  const trackedApps = useMemo(
    () =>
      trackingLogsFinished.reduce(
        (acc, curr) =>
          curr.name && !acc.includes(curr.name.toLowerCase())
            ? [...acc, curr.name.toLowerCase()]
            : acc,
        []
      ),
    [trackingLogsFinished]
  )

  useEffect(() => {
    const currentDate = new Date()
    if (period === 'week') {
      dispatch(setCurrentPeriod({ start: startDay.getTime(), end: endDay.getTime() }))
    } else if (period === 'month') {
      const firstDayOfMonth = new Date(currentDate.setDate(1))
      const lastDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0)
      dispatch(
        setCurrentPeriod({ start: firstDayOfMonth.getTime(), end: lastDayOfMonth.getTime() })
      )
    } else if (period === 'year') {
      const firstDayOfYear = new Date(currentDate.getFullYear(), 0, 1)
      const lastDayOfYear = new Date(currentDate.getFullYear(), 11, 31)
      dispatch(setCurrentPeriod({ start: firstDayOfYear.getTime(), end: lastDayOfYear.getTime() }))
    }
  }, [period])

  const getChartDataForEachDay = () => {
    const { start, end } = currentPeriod
    const startDate = new Date(start)
    const endDate = new Date(end)
    const currentYear = startDate.getFullYear()
    const startDayToEndOfMonth =
      new Date(currentYear, startDate.getMonth() + 1, 0).getDate() - startDate.getDate()
    const daysBetwenStartAndEnd =
      startDate.getMonth() !== endDate.getMonth()
        ? startDayToEndOfMonth + endDate.getDate()
        : endDate.getDate() - startDate.getDate()
    let chartDataPerDay = []
    for (let i = 0; i <= daysBetwenStartAndEnd; i++) {
      const currentDate = new Date(
        startDate.getFullYear(),
        startDate.getMonth(),
        startDate.getDate() + i
      )
      const name = `${currentDate.getDate()}/${currentDate.getMonth() + 1}`
      chartDataPerDay.push({
        name: name,
        ...trackedApps.reduce((acc, app) => {
          acc[app] = trackingLogsFinished.reduce((acc, curr) => {
            if (
              curr.name === app &&
              new Date(curr.startDate).getDate() === currentDate.getDate() &&
              new Date(curr.startDate).getMonth() === currentDate.getMonth() &&
              new Date(curr.startDate).getFullYear() === currentDate.getFullYear()
            ) {
              acc += parseInt((curr.elapsedTime / 1000).toFixed(0))
            }
            return acc
          }, 0)
          return acc
        }, {})
      })
    }
    return chartDataPerDay
  }

  const getChartDataForEachMonth = () => {
    let chartDataPerMonth = []
    const { start, end } = currentPeriod
    const startDate = new Date(start)
    const endDate = new Date(end)
    const startYear = startDate.getFullYear()
    const endYear = endDate.getFullYear()
    const startToEndMonth = (endYear - startYear) * 12 + (endDate.getMonth() - startDate.getMonth())
    for (let i = 0; i <= startToEndMonth; i++) {
      const currentMonth = (startDate.getMonth() + i) % 11
      const currentYear = i > 11 ? endDate.getFullYear() : startDate.getFullYear()
      const name = `${currentMonth + 1}/${String(currentYear).substring(2, 4)}`
      chartDataPerMonth.push({
        name: name,
        ...trackedApps.reduce((acc, app) => {
          acc[app] = trackingLogsFinished.reduce((acc, curr) => {
            if (
              curr.name === app &&
              new Date(curr.startDate).getMonth() === currentMonth &&
              new Date(curr.startDate).getFullYear() === currentYear
            ) {
              acc += parseInt((curr.elapsedTime / 1000).toFixed(0))
            }
            return acc
          }, 0)
          return acc
        }, {})
      })
    }
    return chartDataPerMonth
  }

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

  // Function to handle next chart
  const nextChart = () => {
    if (period === 'week') {
      const start = addDaysToDate(currentPeriod.start, 6)
      const end = addDaysToDate(currentPeriod.end, 6)
      dispatch(setCurrentPeriod({ start: start.getTime(), end: end.getTime() }))
    } else if (period === 'month') {
      const start = addMonthsToDate(currentPeriod.start, 1)
      start.setDate(1)
      const end = new Date(start.getFullYear(), start.getMonth() + 1, 0)
      dispatch(setCurrentPeriod({ start: start.getTime(), end: end.getTime() }))
    } else if (period === 'year') {
      const start = addYearsToDate(currentPeriod.start, 1)
      const end = addYearsToDate(currentPeriod.end, 1)
      dispatch(setCurrentPeriod({ start: start.getTime(), end: end.getTime() }))
    }
  }

  // Function to handle previous chart
  const prevChart = () => {
    if (period === 'week') {
      const start = addDaysToDate(currentPeriod.start, -6)
      const end = addDaysToDate(currentPeriod.end, -6)
      dispatch(setCurrentPeriod({ start: start.getTime(), end: end.getTime() }))
    } else if (period === 'month') {
      const start = addMonthsToDate(currentPeriod.start, -1)
      start.setDate(1)
      const end = new Date(start.getFullYear(), start.getMonth() + 1, 0)
      dispatch(setCurrentPeriod({ start: start.getTime(), end: end.getTime() }))
    } else if (period === 'year') {
      const start = addYearsToDate(currentPeriod.start, -1)
      const end = addYearsToDate(currentPeriod.end, -1)
      dispatch(setCurrentPeriod({ start: start.getTime(), end: end.getTime() }))
    }
  }
  const dataChart = useMemo(() => {
    let chartDataPerDay = []
    if (period === 'week' || period === 'month') chartDataPerDay = getChartDataForEachDay()
    else if (period === 'year') chartDataPerDay = getChartDataForEachMonth()

    return chartDataPerDay
  }, [trackingLogsFinished, trackedApps, currentPeriod])

  useEffect(() => {
    const handleKeyDown = (e) => {
      console.log(e.keyCode)
      if (e.keyCode === 37) prevChart()
      else if (e.keyCode === 39) nextChart()
    }
    addEventListener('keydown', handleKeyDown)
    return () => {
      removeEventListener('keydown', handleKeyDown)
    }
  }, [currentPeriod, period])
  return (
    <>
      <div className="chart-controls">
        <ChevronLeft fill="white" onClick={prevChart} />
        <Select
          className="react-select-container"
          classNamePrefix="react-select"
          unstyled
          isSearchable={false}
          placeholder="Period"
          data={periods}
          onChange={(val) => setPeriod(val.value)}
          options={periods.map((val) => ({ label: val, value: val }))}
        />
        <ChevronRight fill="white" onClick={nextChart} />
      </div>
      <ResponsiveContainer width="100%" maxHeight={300}>
        <BarChart
          width={500}
          height={300}
          data={dataChart}
          margin={{
            top: 20
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
          {trackedApps.map((app, i) => (
            <Bar sty key={i} dataKey={app} stackId="a" fill={appsColorMap[app.toLowerCase()]} />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </>
  )
}
