/** Design system constants — single source of truth for JS/TS consumers */

export const MOTION = {
  fast: 150,
  normal: 250,
  slow: 350,
  sheet: 450,
} as const

export const EASING = {
  ios: 'cubic-bezier(0.2, 0.9, 0.3, 1)',
  sheet: 'cubic-bezier(0.32, 0.72, 0, 1)',
  spring: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
} as const

export const LAYOUT = {
  screenInset: 16,
  screenInsetLg: 20,
  tabBarHeight: 72,
  tabBarInset: 16,
  fabSize: 56,
  fabMargin: 12,
  navCompactHeight: 44,
  navLargeTitleHeight: 96,
  collapseThreshold: 60,
  minTouchTarget: 44,
  listRowHeight: 44,
  listRowHeightRich: 56,
} as const

export const SHEET_DETENTS = {
  medium: 0.5,
  large: 0.9,
} as const

export const ICON_SIZE = {
  tab: 24,
  inline: 20,
  small: 16,
  large: 28,
} as const

export const TAB_ROUTES = ['dashboard', 'tasks', 'focus', 'projects', 'library'] as const

export const FOCUS_PRESETS = {
  focus: 25,
  shortBreak: 5,
  longBreak: 15,
} as const

export type TabRouteName = (typeof TAB_ROUTES)[number]
