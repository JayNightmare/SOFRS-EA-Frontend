/**
 * Design system tokens for the Employee Access app.
 * Dark navy theme matching the provided design mockups.
 */

export const AppColors = {
  background: '#0A0E1A',
  surface: '#111827',
  surfaceLight: '#1A2332',
  accent: '#3B82F6',
  accentDark: '#2563EB',
  success: '#22C55E',
  warning: '#F59E0B',
  error: '#EF4444',
  textPrimary: '#FFFFFF',
  textSecondary: '#9CA3AF',
  textMuted: '#6B7280',
  border: '#1E293B',
  borderLight: '#374151',
  chipGreen: '#064E3B',
  chipGreenText: '#34D399',
  chipBlue: '#1E3A5F',
  chipBlueText: '#60A5FA',
  chipYellow: '#422006',
  chipYellowText: '#FBBF24',
  chipRed: '#450A0A',
  chipRedText: '#F87171',
  overlay: 'rgba(0, 0, 0, 0.6)',
} as const;

export const AppSpacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
} as const;

export const AppBorderRadius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  full: 9999,
} as const;

export const AppFontSizes = {
  xs: 12,
  sm: 14,
  md: 16,
  lg: 20,
  xl: 24,
  xxl: 32,
  hero: 40,
} as const;
