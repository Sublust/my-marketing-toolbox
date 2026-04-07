import { createContext, useContext, useEffect, useMemo, useState } from 'react'

export type ThemeMode = 'light' | 'dark'

type ThemeState = {
  theme: ThemeMode
  setTheme: (t: ThemeMode) => void
  toggleTheme: () => void
}

const ThemeContext = createContext<ThemeState | null>(null)

function applyThemeClass(theme: ThemeMode) {
  const root = document.documentElement
  if (theme === 'dark') root.classList.add('dark')
  else root.classList.remove('dark')
  // Helps native form controls match theme.
  root.style.colorScheme = theme
}

function getInitialTheme(): ThemeMode {
  const raw = localStorage.getItem('theme')
  if (raw === 'light' || raw === 'dark') return raw
  return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

export function ThemeProvider(props: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<ThemeMode>(() => getInitialTheme())

  const setTheme = (t: ThemeMode) => {
    setThemeState(t)
    localStorage.setItem('theme', t)
    applyThemeClass(t)
  }

  const toggleTheme = () => setTheme(theme === 'dark' ? 'light' : 'dark')

  useEffect(() => {
    applyThemeClass(theme)
  }, [theme])

  const value = useMemo(() => ({ theme, setTheme, toggleTheme }), [theme])

  return <ThemeContext.Provider value={value}>{props.children}</ThemeContext.Provider>
}

export function useTheme() {
  const v = useContext(ThemeContext)
  if (!v) throw new Error('useTheme must be used inside ThemeProvider')
  return v
}

