import { useEffect, useState } from 'react'
import ComputerSettingsIcon from './icons/ComputerSettingsIcon'
import SunIcon from './icons/SunIcon'
import MoonIcon from './icons/MoonIcon'
import { Button } from './ui/button'
import {
  applyThemeMode,
  getThemeMode,
  setThemeMode,
  subscribeToPreferences,
  type ThemeMode,
} from '#/lib/preferences'

export default function ThemeToggle() {
  const [mode, setMode] = useState<ThemeMode>('auto')

  useEffect(() => {
    const initial = getThemeMode()
    setMode(initial)
    applyThemeMode(initial)
    return subscribeToPreferences(() => setMode(getThemeMode()))
  }, [])

  useEffect(() => {
    if (mode !== 'auto') return
    const media = window.matchMedia('(prefers-color-scheme: dark)')
    const onChange = () => applyThemeMode('auto')
    media.addEventListener('change', onChange)
    return () => media.removeEventListener('change', onChange)
  }, [mode])

  function toggleMode() {
    const next: ThemeMode =
      mode === 'light' ? 'dark' : mode === 'dark' ? 'auto' : 'light'
    setThemeMode(next)
  }

  const label =
    mode === 'auto'
      ? 'Theme mode: auto (system). Click to switch to light mode.'
      : `Theme mode: ${mode}. Click to switch mode.`

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={toggleMode}
      aria-label={label}
      title={label}
      className="stroke-ring"
    >
      {mode === 'auto' ? (
        <ComputerSettingsIcon />
      ) : mode === 'dark' ? (
        <MoonIcon />
      ) : (
        <SunIcon />
      )}
    </Button>
  )
}
