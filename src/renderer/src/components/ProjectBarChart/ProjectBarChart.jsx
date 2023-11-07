import { memo, useCallback, useEffect, useMemo, useState } from 'react'
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

const prettyTime = (ms) => {
  const s = Math.floor(parseInt(ms) / 1000)
  const hours = Math.floor(s / 3600)
  const minutes = Math.floor((s - hours * 3600) / 60)
  const seconds = parseInt(s - hours * 3600 - minutes * 60)
  return `${hours ? hours + 'h' : ''} ${minutes ? minutes + 'm' : ''} ${seconds || 0 + 's'}`
}

const prettyTimeHoursMins = (ms) => {
  const s = Math.floor(parseInt(ms) / 1000)
  const hours = Math.floor(s / 3600)
  const minutes = Math.floor((s - hours * 3600) / 60)
  return `${hours ? hours + 'h' : ''} ${minutes ? minutes + 'm' : ''}`
}

const periods = ['week', 'month', 'year']

const ProjectBarCharts = memo(({ appsColorMap, projectName }) => {
  const dispatch = useDispatch()
  const [period, setPeriod] = useState('week')
  const trackingLogs = useSelector((state) => state.trackingData[projectName].trackingLogs || [])
  const currentPeriod = useSelector((state) => state.tracking.currentPeriod)

  const trackingLogsPerApp = useMemo(
    () =>
      trackingLogs.reduce(
        (acc, log) => ({
          ...acc,
          [log.name]: (acc[log.name] || 0) + (log.endDate ? log.endDate - log.startDate : 0)
        }),
        {}
      ),
    [trackingLogs.length]
  )
  useEffect(() => {
    for (const appName in trackingLogsPerApp) {
      console.log(appName, prettyTime(trackingLogsPerApp[appName]))
    }
  }, [trackingLogsPerApp])

  const trackedApps = useMemo(
    () => [...new Set(trackingLogs.map((log) => log.name?.toLowerCase()).filter((log) => log))],
    [trackingLogs.length]
  )

  useEffect(() => {
    console.log('trackedApps', trackedApps)
  }, [trackedApps.length])

  useEffect(() => {
    const currentDate = new Date()
    const currentDay = currentDate.getDay()
    if (period === 'week') {
      const startDay = new Date(
        currentDate.getFullYear(),
        currentDate.getMonth(),
        currentDate.getDate() - currentDay
      )
      const endDay = new Date(
        currentDate.getFullYear(),
        currentDate.getMonth(),
        currentDate.getDate() + (7 - currentDay),
        1,
        59,
        59,
        999
      )
      dispatch(setCurrentPeriod({ start: startDay.getTime(), end: endDay.getTime() }))
    } else if (period === 'month') {
      const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1)
      const lastDayOfMonth = new Date(
        currentDate.getFullYear(),
        currentDate.getMonth() + 1,
        1,
        0,
        0,
        0,
        0
      )
      dispatch(
        setCurrentPeriod({ start: firstDayOfMonth.getTime(), end: lastDayOfMonth.getTime() })
      )
    } else if (period === 'year') {
      const firstDayOfYear = new Date(currentDate.getFullYear(), 0, 1)
      const lastDayOfYear = new Date(currentDate.getFullYear(), 11, 31)
      dispatch(setCurrentPeriod({ start: firstDayOfYear.getTime(), end: lastDayOfYear.getTime() }))
    }
  }, [period])

  const getChartDataForEachDay = useCallback(() => {
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

    const trackingLogsFiltered = trackingLogs.filter(
      (log) => log.startDate >= startDate.getTime() && log.endDate <= endDate.getTime()
    )

    let trackedAppsLogsMap = {}
    for (const log of trackingLogsFiltered) {
      const logName = log.name.toLowerCase()
      if (!trackedAppsLogsMap[logName]) trackedAppsLogsMap[logName] = []
      const logStartDate = new Date(log.startDate)
      const logEndDate = new Date(log.endDate || Date.now())
      trackedAppsLogsMap[logName].push({
        ...log,
        startDate: logStartDate,
        endDate: logEndDate,
        year: logStartDate.getFullYear(),
        month: logStartDate.getMonth(),
        day: logStartDate.getDate()
      })
    }

    console.log('trackinglogs filtered', trackingLogsFiltered.length)
    console.log(
      'trackedAppsLogsMap',
      Object.keys(trackedAppsLogsMap).reduce(
        (acc, curr) => acc + trackedAppsLogsMap[curr].length,
        0
      )
    )

    for (let i = 0; i <= daysBetwenStartAndEnd; i++) {
      const currentDate = new Date(
        startDate.getFullYear(),
        startDate.getMonth(),
        startDate.getDate() + i
      )
      const year = currentDate.getFullYear()
      const month = currentDate.getMonth()
      const day = currentDate.getDate()
      const name = `${day}/${month + 1}`
      chartDataPerDay.push({
        name: name,
        ...trackedApps.reduce((acc, app) => {
          acc[app] = (trackedAppsLogsMap[app] || []).reduce(
            (acc2, curr) =>
              curr.startDate &&
              curr.endDate &&
              curr.day === day &&
              curr.month === month &&
              curr.year === year
                ? acc2 + curr.endDate.getTime() - curr.startDate.getTime()
                : acc2,

            0
          )
          return acc
        }, {})
      })
    }
    return chartDataPerDay
  }, [trackingLogs.length, trackedApps, currentPeriod])

  const getChartDataForEachMonth = useCallback(() => {
    let chartDataPerMonth = []
    const { start, end } = currentPeriod
    const startDate = new Date(start)
    const endDate = new Date(end)
    const startYear = startDate.getFullYear()
    const endYear = endDate.getFullYear()
    const startToEndMonth = (endYear - startYear) * 12 + (endDate.getMonth() - startDate.getMonth())

    let trackedAppsLogsMap = {}
    for (const log of trackingLogs) {
      const logName = log.name.toLowerCase()
      if (!trackedAppsLogsMap[logName]?.length) trackedAppsLogsMap[logName] = []
      const logStartDate = log.startDate ? new Date(log.startDate) : false
      const logEndDate = log.endDate ? new Date(log.endDate) : false

      trackedAppsLogsMap[logName].push({
        ...log,
        ...((logStartDate && { startDate: logStartDate }) || {}),
        ...((logEndDate && { endDate: logEndDate }) || {}),
        month: logStartDate.getMonth(),
        year: logStartDate.getFullYear()
      })
    }
    console.log('startToEndMonth', startToEndMonth)
    for (let i = 0; i <= startToEndMonth; i++) {
      const currentMonth = (startDate.getMonth() + i) % 11
      const currentYear = i > 11 ? endDate.getFullYear() : startDate.getFullYear()
      const name = `${currentMonth + 1}/${String(currentYear).substring(2, 4)}`
      chartDataPerMonth.push({
        name: name,
        ...trackedApps.reduce((acc, app) => {
          acc[app] = (trackedAppsLogsMap[app] || []).reduce((acc, curr) => {
            if (
              curr.startDate &&
              curr.endDate &&
              curr.month === currentMonth &&
              curr.year === currentYear
            ) {
              acc += curr.endDate.getTime() - curr.startDate.getTime()
            }
            return acc
          }, 0)
          return acc
        }, {})
      })
    }
    return chartDataPerMonth
  }, [trackingLogs, trackedApps, currentPeriod])

  const addDaysToDate = useCallback((date, days) => {
    let result = new Date(date)
    result.setDate(result.getDate() + days)
    return result
  }, [])

  const addMonthsToDate = useCallback((date, months) => {
    let result = new Date(date)
    result.setMonth(result.getMonth() + months)
    return result
  }, [])

  const addYearsToDate = useCallback((date, years) => {
    let result = new Date(date)
    result.setFullYear(result.getFullYear() + years)
    return result
  }, [])

  // Function to handle next chart
  const nextChart = useCallback(() => {
    if (period === 'week') {
      const start = addDaysToDate(currentPeriod.start, 7)
      const end = addDaysToDate(currentPeriod.end, 7)
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
  }, [currentPeriod, period])

  // Function to handle previous chart
  const prevChart = useCallback(() => {
    if (period === 'week') {
      const start = addDaysToDate(currentPeriod.start, -7)
      const end = addDaysToDate(currentPeriod.end, -7)
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
  }, [currentPeriod, period])

  const dataChart = useMemo(() => {
    let chartDataPerDay = []
    if (period === 'week' || period === 'month') chartDataPerDay = getChartDataForEachDay()
    else if (period === 'year') chartDataPerDay = getChartDataForEachMonth()

    return chartDataPerDay
  }, [currentPeriod])

  useEffect(() => {
    for (const day of dataChart) {
      for (const key in day) {
        if (key === 'name') continue
        if (day[key] <= 0) continue
        console.log(day[key], prettyTime(day[key]))
      }
    }
  }, [dataChart.length])

  const dataChartPositive = useMemo(() => {
    return dataChart.map((data) => {
      for (let key in data) {
        if (key !== 'name') data[key] += data[key] < 0 ? 0 : data[key]
      }
      return data
    })
  }, [dataChart])

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
      <ResponsiveContainer width="100%" height={300}>
        <BarChart
          width={500}
          height={300}
          data={dataChartPositive}
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
          {trackedApps.map((app, i) => (
            <Bar sty key={i} dataKey={app} stackId="a" fill={appsColorMap[app.toLowerCase()]} />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </>
  )
})
export default ProjectBarCharts
