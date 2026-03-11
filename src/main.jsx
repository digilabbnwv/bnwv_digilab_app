import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import { AuthProvider } from './context/AuthContext'
import { initMockDB } from './lib/mockDB'
import './index.css'

const MOCK = import.meta.env.VITE_MOCK_MODE === 'true'

async function start() {
  if (MOCK) {
    await initMockDB()
    console.log('🧪 Mock modus actief — testdata geladen')
  }

  ReactDOM.createRoot(document.getElementById('root')).render(
    <React.StrictMode>
      <BrowserRouter basename={import.meta.env.BASE_URL}>
        <AuthProvider>
          <App />
        </AuthProvider>
      </BrowserRouter>
    </React.StrictMode>
  )
}

start()
