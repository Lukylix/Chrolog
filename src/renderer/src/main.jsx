import React from 'react'
import { HashRouter as Router, Route, Routes } from 'react-router-dom'
import ReactDOM from 'react-dom/client'
import './assets/index.css'
import './main.css'
import Home from './pages/Home/Home'
import Project from './pages/Project/Project'
import { Provider } from 'react-redux'
import store from './stores/store.js'

import Header from './components/Header/Header'
import Settings from './pages/Settings/Settings'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <Provider store={store}>
      <Router>
        <div className="main">
          <Header />
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/project/:name" element={<Project />} />
            <Route path="/settings" element={<Settings />} />
          </Routes>
        </div>
      </Router>
    </Provider>
  </React.StrictMode>
)
