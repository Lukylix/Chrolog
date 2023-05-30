import { createSlice } from '@reduxjs/toolkit'

const initialLoadSlice = createSlice({
  name: 'intialLoad',
  initialState: true,
  reducers: {
    setInitialLoad: (state, action) => {
      return action.payload
    }
  }
})

export const { setInitialLoad } = initialLoadSlice.actions

export default initialLoadSlice.reducer
