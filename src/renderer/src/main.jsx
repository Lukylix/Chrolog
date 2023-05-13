import React from 'react'
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom'
import ReactDOM from 'react-dom/client'
import './assets/index.css'
import './main.css'
import Home from './pages/Home/Home'
import Project from './pages/Project/Project'
import { Provider } from 'react-redux'
import store from './stores/store.js'
import useTracking from './hooks/useTracking'
import Header from './components/Header/Header'

const Tracking = () => {
  useTracking()
  return <></>
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <Provider store={store}>
      <Tracking />
      <Header />
      <Router>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/project/:name" element={<Project />} />
        </Routes>
      </Router>
    </Provider>
  </React.StrictMode>
)
