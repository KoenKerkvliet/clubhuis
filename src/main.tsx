import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { HashRouter } from 'react-router-dom'
import { App } from '@/App'
import { AuthProvider } from '@/context/AuthContext'
import { UpdateBanner } from '@/components/layout/UpdateBanner'
import '@/index.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <HashRouter>
      <AuthProvider>
        <App />
        <UpdateBanner />
      </AuthProvider>
    </HashRouter>
  </StrictMode>,
)
