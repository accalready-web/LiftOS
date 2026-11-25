/**
 * LiftOS Design Tokens
 * Dark Mode (default, AMOLED/gym-friendly) + Light Mode palette
 * Based on docs/02_DESIGN.md Section 3.3
 */

// ─── Color Palettes ──────────────────────────────────────────────

export const Colors = {
  dark: {
    background: '#0B0F14',
    surface: '#151B23',
    surfaceElevated: '#1E2631',
    border: '#2A3441',
    textPrimary: '#F3F4F6',
    textSecondary: '#9CA3AF',
    primary: '#3B82F6',       // Electric Blue — buttons, active tab, timer
    primaryPressed: '#2563EB',
    success: '#10B981',       // Emerald Green — completed set highlight
    successMuted: 'rgba(16, 185, 129, 0.12)', // Set row ✓ background tint
    danger: '#EF4444',
    dangerMuted: 'rgba(239, 68, 68, 0.12)',
    warning: '#F59E0B',
    tabBarBackground: '#0B0F14',
    tabBarBorder: '#2A3441',
    statusBarStyle: 'light' as const,
  },
  light: {
    background: '#F8FAFC',
    surface: '#FFFFFF',
    surfaceElevated: '#F1F5F9',
    border: '#E2E8F0',
    textPrimary: '#0F172A',
    textSecondary: '#64748B',
    primary: '#3B82F6',
    primaryPressed: '#2563EB',
    success: '#10B981',
    successMuted: 'rgba(16, 185, 129, 0.10)',
    danger: '#EF4444',
    dangerMuted: 'rgba(239, 68, 68, 0.10)',
    warning: '#F59E0B',
    tabBarBackground: '#FFFFFF',
    tabBarBorder: '#E2E8F0',
    statusBarStyle: 'dark' as const,
  },
} as const;

// ─── Set Type Badge Colors (same in both themes for consistency) ─

export const SetTypeBadgeColors = {
  warmup: { bg: 'rgba(245, 158, 11, 0.15)', text: '#F59E0B', label: 'W' },
  normal: { bg: 'transparent', text: '', label: '' }, // uses theme textPrimary
  dropset: { bg: 'rgba(168, 85, 247, 0.15)', text: '#A855F7', label: 'D' },
  failure: { bg: 'rgba(239, 68, 68, 0.15)', text: '#EF4444', label: 'F' },
} as const;

export type SetType = keyof typeof SetTypeBadgeColors;

// ─── Spacing Scale ──────────────────────────────────────────────

export const Spacing = {
  xxs: 2,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
  xxxxl: 48,
} as const;

// ─── Typography ─────────────────────────────────────────────────

export const FontSize = {
  xs: 11,
  sm: 13,
  base: 15,
  lg: 17,
  xl: 20,
  xxl: 24,
  xxxl: 30,
} as const;

export const FontWeight = {
  regular: '400' as const,
  medium: '500' as const,
  semibold: '600' as const,
  bold: '700' as const,
};

// ─── Layout ─────────────────────────────────────────────────────

export const Layout = {
  /** Breakpoint: below = mobile bottom tabs, at or above = desktop sidebar */
  desktopBreakpoint: 768,
  /** Sidebar width on desktop */
  sidebarWidth: 240,
  /** Maximum content width for Active Workout on desktop */
  workoutMaxWidth: 800,
  /** Minimum touch target for gym UX (dp) */
  minTouchTarget: 44,
  /** Tab bar height on mobile */
  tabBarHeight: 56,
  /** Mini workout bar height */
  miniWorkoutBarHeight: 48,
  /** Border radius */
  radius: {
    sm: 6,
    md: 10,
    lg: 14,
    xl: 20,
    full: 999,
  },
} as const;

// ─── Theme type helper ──────────────────────────────────────────

export type ThemeMode = 'dark' | 'light';
export interface ThemeColors {
  readonly background: string;
  readonly surface: string;
  readonly surfaceElevated: string;
  readonly border: string;
  readonly textPrimary: string;
  readonly textSecondary: string;
  readonly primary: string;
  readonly primaryPressed: string;
  readonly success: string;
  readonly successMuted: string;
  readonly danger: string;
  readonly dangerMuted: string;
  readonly warning: string;
  readonly tabBarBackground: string;
  readonly tabBarBorder: string;
  readonly statusBarStyle: 'light' | 'dark';
}

export function getColors(theme: ThemeMode): ThemeColors {
  return Colors[theme];
}
