import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { AuthProvider } from './context/AuthProvider.tsx'
import { ThemeProvider } from './context/ThemeProvider.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider>
      <AuthProvider>
        <div className="min-h-dvh bg-gray-50 text-gray-900 dark:bg-gray-900 dark:text-gray-100">
          <App />
        </div>
      </AuthProvider>
    </ThemeProvider>
  </StrictMode>,
)
