import { createSlice } from '@reduxjs/toolkit'

const processesSlice = createSlice({
  name: 'processes',
  initialState: [],
  reducers: {
    setProcesses: (state, action) => {
      return [...new Set([...state, ...action.payload])]
    },
    addProcess: (state, action) => {
      state.push(action.payload)
    },
    removeProcess: (state, action) => {
      return state.filter((process) => process.name !== action.payload.name)
    },
    updateProcess: (state, action) => {
      const { name, data } = action.payload
      const processIndex = state.findIndex((process) => process.name === name)
      if (processIndex > -1) {
        state[processIndex] = { ...state[processIndex], ...data }
      }
    },
    clearProcesses: () => []
  }
})

export const { addProcess, removeProcess, updateProcess, clearProcesses, setProcesses } = processesSlice.actions

export default processesSlice.reducer
