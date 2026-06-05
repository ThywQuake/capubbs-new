import type { InterfaceSettings, SidebarThreadCollapseMode } from '../types/interfaceSettings';

type ThemePreference = 'dark' | 'light';

type InterfaceSettingsCachePayload = {
  settings: InterfaceSettings;
  updatedAt: string;
  version: number;
};

const THEME_STORAGE_KEY = 'capubbs-theme';
const INTERFACE_SETTINGS_STORAGE_KEY = 'capubbs-interface-settings';
const INTERFACE_SETTINGS_STORAGE_VERSION = 6;

export const DEFAULT_FONT_SCALE = 95;
const FONT_SCALE_RANGE = 15;
export const FONT_SCALE_MIN = DEFAULT_FONT_SCALE - FONT_SCALE_RANGE;
export const FONT_SCALE_MAX = DEFAULT_FONT_SCALE + FONT_SCALE_RANGE;
export const FONT_SCALE_STEP = 5;

const SIDEBAR_EXPANDED_WIDTH_PX = 248;
const SIDEBAR_COLLAPSED_WIDTH_PX = 78;
const SIDEBAR_MINIMIZED_WIDTH_PX = 48;

export function getInitialDarkMode() {
  const interfaceSettings = readInterfaceSettings();

  if (interfaceSettings.followSystemDarkMode) {
    return getSystemDarkMode();
  }

  const storedTheme = readThemePreference();

  if (storedTheme) {
    return storedTheme === 'dark';
  }

  return false;
}

export function readInterfaceSettings(): InterfaceSettings {
  const fallbackSettings = getDefaultInterfaceSettings();

  if (typeof window === 'undefined') {
    return fallbackSettings;
  }

  try {
    const storedSettings = window.localStorage.getItem(INTERFACE_SETTINGS_STORAGE_KEY);

    if (!storedSettings) {
      return fallbackSettings;
    }

    const parsedSettings: unknown = JSON.parse(storedSettings);

    if (!isObjectRecord(parsedSettings)) {
      return fallbackSettings;
    }

    const settingsRecord = isObjectRecord(parsedSettings.settings) ? parsedSettings.settings : parsedSettings;

    return normalizeInterfaceSettings(settingsRecord, fallbackSettings);
  } catch {
    return fallbackSettings;
  }
}

export function saveInterfaceSettings(settings: InterfaceSettings) {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    const payload: InterfaceSettingsCachePayload = {
      settings,
      updatedAt: new Date().toISOString(),
      version: INTERFACE_SETTINGS_STORAGE_VERSION,
    };

    window.localStorage.setItem(INTERFACE_SETTINGS_STORAGE_KEY, JSON.stringify(payload));
  } catch {
    return;
  }
}

export function saveThemePreference(theme: ThemePreference) {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    window.localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch {
    // localStorage may be disabled in private or embedded browsing contexts.
  }
}

export function clearThemePreference() {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    window.localStorage.removeItem(THEME_STORAGE_KEY);
  } catch {
    return;
  }
}

export function getSystemDarkMode() {
  if (typeof window === 'undefined' || !window.matchMedia) {
    return false;
  }

  return window.matchMedia('(prefers-color-scheme: dark)').matches;
}

export function applyInterfaceFontScale(fontScale: number) {
  if (typeof document === 'undefined') {
    return;
  }

  const root = document.documentElement;
  const sidebarScaleRatio = fontScale / DEFAULT_FONT_SCALE;
  const normalizedScale = (fontScale - DEFAULT_FONT_SCALE) / FONT_SCALE_RANGE;
  const cardLineHeight = 1.7 + normalizedScale * 0.12;
  const cardTitleLineHeight = 1.4 + normalizedScale * 0.08;

  root.dataset.fontScale = String(fontScale);
  root.style.fontSize = `${fontScale}%`;
  root.style.setProperty(
    '--capubbs-sidebar-expanded-width',
    `${(SIDEBAR_EXPANDED_WIDTH_PX * sidebarScaleRatio).toFixed(2)}px`,
  );
  root.style.setProperty(
    '--capubbs-sidebar-collapsed-width',
    `${(SIDEBAR_COLLAPSED_WIDTH_PX * sidebarScaleRatio).toFixed(2)}px`,
  );
  root.style.setProperty(
    '--capubbs-sidebar-minimized-width',
    `${(SIDEBAR_MINIMIZED_WIDTH_PX * sidebarScaleRatio).toFixed(2)}px`,
  );
  root.style.setProperty('--capubbs-thread-card-line-height', cardLineHeight.toFixed(2));
  root.style.setProperty('--capubbs-thread-card-title-line-height', cardTitleLineHeight.toFixed(2));
}

export function applyBrowserColorScheme(isDark: boolean) {
  if (typeof document === 'undefined') {
    return;
  }

  const theme = isDark ? 'dark' : 'light';
  const root = document.documentElement;
  root.classList.toggle('dark', isDark);
  root.dataset.theme = theme;
  root.style.colorScheme = theme;
}

export function clampFontScale(fontScale: number) {
  return Math.min(
    FONT_SCALE_MAX,
    Math.max(FONT_SCALE_MIN, Math.round(fontScale / FONT_SCALE_STEP) * FONT_SCALE_STEP),
  );
}

export function isFontScaleShortcutModifier(event: KeyboardEvent) {
  return (event.ctrlKey || event.metaKey) && !event.altKey;
}

export function getFontScaleShortcutDirection(event: KeyboardEvent) {
  if (event.key === '+' || event.key === '=' || event.code === 'Equal' || event.code === 'NumpadAdd') {
    return 1;
  }

  if (event.key === '-' || event.key === '_' || event.code === 'Minus' || event.code === 'NumpadSubtract') {
    return -1;
  }

  return 0;
}

function readThemePreference(): ThemePreference | null {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    const storedTheme = window.localStorage.getItem(THEME_STORAGE_KEY);

    if (storedTheme === 'dark' || storedTheme === 'light') {
      return storedTheme;
    }
  } catch {
    return null;
  }

  return null;
}

function normalizeInterfaceSettings(
  settings: Record<string, unknown>,
  fallbackSettings: InterfaceSettings,
): InterfaceSettings {
  return {
    autoCollapseTopBarOnThread:
      typeof settings.autoCollapseTopBarOnThread === 'boolean'
        ? settings.autoCollapseTopBarOnThread
        : fallbackSettings.autoCollapseTopBarOnThread,
    autoExpandSidebarOnCollapsedOptionClick:
      typeof settings.autoExpandSidebarOnCollapsedOptionClick === 'boolean'
        ? settings.autoExpandSidebarOnCollapsedOptionClick
        : fallbackSettings.autoExpandSidebarOnCollapsedOptionClick,
    alwaysShowCompactMode:
      typeof settings.alwaysShowCompactMode === 'boolean'
        ? settings.alwaysShowCompactMode
        : fallbackSettings.alwaysShowCompactMode,
    enableFloatingThreadPreview:
      typeof settings.enableFloatingThreadPreview === 'boolean'
        ? settings.enableFloatingThreadPreview
        : fallbackSettings.enableFloatingThreadPreview,
    followSystemDarkMode:
      typeof settings.followSystemDarkMode === 'boolean'
        ? settings.followSystemDarkMode
        : fallbackSettings.followSystemDarkMode,
    fontScale:
      typeof settings.fontScale === 'number' ? clampFontScale(settings.fontScale) : fallbackSettings.fontScale,
    listCompactMode:
      typeof settings.listCompactMode === 'boolean'
        ? settings.listCompactMode
        : fallbackSettings.listCompactMode,
    sidebarThreadCollapseMode: readSidebarThreadCollapseMode(settings, fallbackSettings.sidebarThreadCollapseMode),
    showThreadFloorDirectory:
      typeof settings.showThreadFloorDirectory === 'boolean'
        ? settings.showThreadFloorDirectory
        : fallbackSettings.showThreadFloorDirectory,
    showThreadTitleInTopBar:
      typeof settings.showThreadTitleInTopBar === 'boolean'
        ? settings.showThreadTitleInTopBar
        : fallbackSettings.showThreadTitleInTopBar,
  };
}

function readSidebarThreadCollapseMode(
  settings: Record<string, unknown>,
  fallbackMode: SidebarThreadCollapseMode,
): SidebarThreadCollapseMode {
  if (isSidebarThreadCollapseMode(settings.sidebarThreadCollapseMode)) {
    return settings.sidebarThreadCollapseMode;
  }

  if (typeof settings.autoCollapseSidebarOnThread === 'boolean') {
    return settings.autoCollapseSidebarOnThread ? 'collapsed' : 'none';
  }

  return fallbackMode;
}

function isSidebarThreadCollapseMode(value: unknown): value is SidebarThreadCollapseMode {
  return value === 'none' || value === 'collapsed' || value === 'minimized';
}

function getDefaultInterfaceSettings(): InterfaceSettings {
  return {
    autoCollapseTopBarOnThread: false,
    autoExpandSidebarOnCollapsedOptionClick: false,
    alwaysShowCompactMode: false,
    enableFloatingThreadPreview: true,
    followSystemDarkMode: readThemePreference() === null,
    fontScale: DEFAULT_FONT_SCALE,
    listCompactMode: false,
    sidebarThreadCollapseMode: 'collapsed',
    showThreadFloorDirectory: true,
    showThreadTitleInTopBar: true,
  };
}

function isObjectRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
