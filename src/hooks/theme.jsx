import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { useMediaQuery } from './useMediaQuery'
import { readLocal, writeLocal } from '../lib/storage'
import { applyAccent } from '../config/accents'

const ThemeContext = createContext(null)
const KEY = 'manalife-theme'

export function ThemeProvider({ children }) {
  const [preference, setPreferenceState] = useState(() => readLocal(KEY, 'system'))
  const [accent, setAccent] = useState('violet')
  const systemDark = useMediaQuery('(prefers-color-scheme: dark)')
  const resolved = preference === 'system' ? (systemDark ? 'dark' : 'light') : preference

  useEffect(() => {
    document.documentElement.dataset.theme = resolved
    document.documentElement.style.colorScheme = resolved
  }, [resolved])

  useEffect(() => {
    applyAccent(accent, resolved)
  }, [accent, resolved])

  const setPreference = useCallback((value) => {
    setPreferenceState(value)
    writeLocal(KEY, value)
  }, [])

  const value = useMemo(() => ({ preference, resolved, setPreference, accent, setAccent }), [preference, resolved, setPreference, accent])
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export const useTheme = () => useContext(ThemeContext)
