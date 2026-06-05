import { useEffect, useState } from 'react';
import type { InterfaceSettings } from '../types/interfaceSettings';
import {
  applyBrowserColorScheme,
  applyInterfaceFontScale,
  clampFontScale,
  clearThemePreference,
  FONT_SCALE_STEP,
  getFontScaleShortcutDirection,
  getInitialDarkMode,
  getSystemDarkMode,
  isFontScaleShortcutModifier,
  readInterfaceSettings,
  saveInterfaceSettings,
  saveThemePreference,
} from '../utils/interfaceSettingsStorage';

export function useInterfacePreferences() {
  const [interfaceSettings, setInterfaceSettings] = useState(readInterfaceSettings);
  const [isDark, setIsDark] = useState(getInitialDarkMode);

  const updateInterfaceSettings = (settings: InterfaceSettings) => {
    setInterfaceSettings({
      ...settings,
      fontScale: clampFontScale(settings.fontScale),
    });
  };

  const adjustInterfaceFontScale = (stepCount: number) => {
    setInterfaceSettings((currentSettings) => ({
      ...currentSettings,
      fontScale: clampFontScale(currentSettings.fontScale + stepCount * FONT_SCALE_STEP),
    }));
  };

  const toggleDarkMode = () => {
    const nextValue = !isDark;

    if (interfaceSettings.followSystemDarkMode) {
      updateInterfaceSettings({
        ...interfaceSettings,
        followSystemDarkMode: false,
      });
    }

    saveThemePreference(nextValue ? 'dark' : 'light');
    setIsDark(nextValue);
  };

  useEffect(() => {
    saveInterfaceSettings(interfaceSettings);
  }, [interfaceSettings]);

  useEffect(() => {
    applyInterfaceFontScale(interfaceSettings.fontScale);
  }, [interfaceSettings.fontScale]);

  useEffect(() => {
    const handleFontScaleShortcut = (event: KeyboardEvent) => {
      if (!isFontScaleShortcutModifier(event)) {
        return;
      }

      const direction = getFontScaleShortcutDirection(event);

      if (direction === 0) {
        return;
      }

      event.preventDefault();
      adjustInterfaceFontScale(direction);
    };

    window.addEventListener('keydown', handleFontScaleShortcut);
    return () => window.removeEventListener('keydown', handleFontScaleShortcut);
  }, []);

  useEffect(() => {
    if (!interfaceSettings.followSystemDarkMode) {
      saveThemePreference(isDark ? 'dark' : 'light');
      return;
    }

    clearThemePreference();
    setIsDark(getSystemDarkMode());
  }, [interfaceSettings.followSystemDarkMode, isDark]);

  useEffect(() => {
    applyBrowserColorScheme(isDark);
  }, [isDark]);

  useEffect(() => {
    if (!interfaceSettings.followSystemDarkMode || typeof window === 'undefined' || !window.matchMedia) {
      return;
    }

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleSystemThemeChange = (event: MediaQueryListEvent) => {
      setIsDark(event.matches);
    };

    mediaQuery.addEventListener('change', handleSystemThemeChange);
    return () => mediaQuery.removeEventListener('change', handleSystemThemeChange);
  }, [interfaceSettings.followSystemDarkMode]);

  return {
    interfaceSettings,
    isDark,
    toggleDarkMode,
    updateInterfaceSettings,
  };
}
