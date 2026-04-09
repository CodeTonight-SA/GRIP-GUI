/**
 * GRIP Theme Engine — 21 themes across 4 categories.
 * Single source of truth for all theme data.
 * Applied at runtime via CSS custom properties on <html>.
 *
 * Swiss (6): Light, Dark, Neutrality, Optimism, Utopia, Brutalism
 * Nature (7): Autumn, Summer, Winter, Storm, Forest, Ocean
 * Retro (4): Retrowave, Synthwave, Vapor, Amber Terminal
 * Futuristic (4): Matrix, Cyberpunk, Techno, Hologram, Neon
 */

export interface ThemeColors {
  background: string;
  foreground: string;
  card: string;
  'card-foreground': string;
  popover: string;
  'popover-foreground': string;
  primary: string;
  'primary-foreground': string;
  secondary: string;
  'secondary-foreground': string;
  muted: string;
  'muted-foreground': string;
  accent: string;
  'accent-foreground': string;
  destructive: string;
  border: string;
  input: string;
  ring: string;
  success: string;
  'success-muted': string;
  warning: string;
  'warning-muted': string;
  danger: string;
  'danger-muted': string;
  info: string;
  'info-muted': string;
  'chart-1': string;
  'chart-2': string;
  'chart-3': string;
  'chart-4': string;
  'chart-5': string;
  'scrollbar-track': string;
  'scrollbar-thumb': string;
  'scrollbar-thumb-hover': string;
  'vortex-glow': string;
}

export interface ThemeDefinition {
  id: string;
  name: string;
  category: 'swiss' | 'nature' | 'retro' | 'futuristic';
  isDark: boolean;
  colors: ThemeColors;
}

function scrollbarColors(track: string, thumb: string, accent: string) {
  return { 'scrollbar-track': track, 'scrollbar-thumb': thumb, 'scrollbar-thumb-hover': accent };
}

export const THEMES: ThemeDefinition[] = [
  // ─── SWISS ────────────────────────────────────
  {
    id: 'swiss-nihilism-light',
    name: 'Swiss Nihilism Light',
    category: 'swiss',
    isDark: false,
    colors: {
      background: '#EAEAEA', foreground: '#000000',
      card: '#F5F5F5', 'card-foreground': '#000000',
      popover: '#F5F5F5', 'popover-foreground': '#000000',
      primary: '#0891b2', 'primary-foreground': '#FFFFFF',
      secondary: '#e0e0e0', 'secondary-foreground': '#000000',
      muted: '#d4d4d4', 'muted-foreground': '#525252',
      accent: '#0891b2', 'accent-foreground': '#FFFFFF',
      destructive: '#dc2626',
      border: '#d1d5db', input: '#F5F5F5', ring: '#0891b2',
      success: '#16a34a', 'success-muted': 'rgba(22, 163, 74, 0.12)',
      warning: '#ca8a04', 'warning-muted': 'rgba(202, 138, 4, 0.12)',
      danger: '#dc2626', 'danger-muted': 'rgba(220, 38, 38, 0.12)',
      info: '#0891b2', 'info-muted': 'rgba(8, 145, 178, 0.12)',
      'chart-1': '#0891b2', 'chart-2': '#525252', 'chart-3': '#16a34a', 'chart-4': '#dc2626', 'chart-5': '#000000',
      ...scrollbarColors('#e0e0e0', '#b0b0b0', '#0891b2'),
      'vortex-glow': '0 0 20px rgba(8, 145, 178, 0.3)',
    },
  },
  {
    id: 'swiss-nihilism-dark',
    name: 'Swiss Nihilism Dark',
    category: 'swiss',
    isDark: true,
    colors: {
      background: '#0a0a0a', foreground: '#e5e5e5',
      card: '#171717', 'card-foreground': '#e5e5e5',
      popover: '#171717', 'popover-foreground': '#e5e5e5',
      primary: '#22d3ee', 'primary-foreground': '#0a0a0a',
      secondary: '#1a1a1a', 'secondary-foreground': '#e5e5e5',
      muted: '#262626', 'muted-foreground': '#737373',
      accent: '#22d3ee', 'accent-foreground': '#0a0a0a',
      destructive: '#ef4444',
      border: '#262626', input: '#171717', ring: '#22d3ee',
      success: '#22c55e', 'success-muted': 'rgba(34, 197, 94, 0.15)',
      warning: '#eab308', 'warning-muted': 'rgba(234, 179, 8, 0.15)',
      danger: '#ef4444', 'danger-muted': 'rgba(239, 68, 68, 0.15)',
      info: '#22d3ee', 'info-muted': 'rgba(34, 211, 238, 0.15)',
      'chart-1': '#22d3ee', 'chart-2': '#a3a3a3', 'chart-3': '#22c55e', 'chart-4': '#ef4444', 'chart-5': '#e5e5e5',
      ...scrollbarColors('#171717', '#333', '#22d3ee'),
      'vortex-glow': '0 0 30px rgba(34, 211, 238, 0.4)',
    },
  },
  {
    id: 'swiss-neutrality',
    name: 'Swiss Neutrality',
    category: 'swiss',
    isDark: false,
    colors: {
      background: '#F0EDE8', foreground: '#1a1a1a',
      card: '#F7F5F0', 'card-foreground': '#1a1a1a',
      popover: '#F7F5F0', 'popover-foreground': '#1a1a1a',
      primary: '#996F00', 'primary-foreground': '#FFFFFF',
      secondary: '#E5E0D8', 'secondary-foreground': '#1a1a1a',
      muted: '#D9D4CC', 'muted-foreground': '#6b5f50',
      accent: '#996F00', 'accent-foreground': '#FFFFFF',
      destructive: '#c0392b',
      border: '#D0C8BC', input: '#F7F5F0', ring: '#B8860B',
      success: '#27ae60', 'success-muted': 'rgba(39, 174, 96, 0.12)',
      warning: '#d4a017', 'warning-muted': 'rgba(212, 160, 23, 0.12)',
      danger: '#c0392b', 'danger-muted': 'rgba(192, 57, 43, 0.12)',
      info: '#B8860B', 'info-muted': 'rgba(184, 134, 11, 0.12)',
      'chart-1': '#B8860B', 'chart-2': '#6b5f50', 'chart-3': '#27ae60', 'chart-4': '#c0392b', 'chart-5': '#1a1a1a',
      ...scrollbarColors('#E5E0D8', '#C0B8A8', '#B8860B'),
      'vortex-glow': '0 0 20px rgba(184, 134, 11, 0.3)',
    },
  },
  {
    id: 'swiss-optimism',
    name: 'Swiss Optimism',
    category: 'swiss',
    isDark: false,
    colors: {
      background: '#F5FAF0', foreground: '#1a2e1a',
      card: '#FAFFF5', 'card-foreground': '#1a2e1a',
      popover: '#FAFFF5', 'popover-foreground': '#1a2e1a',
      primary: '#15803d', 'primary-foreground': '#FFFFFF',
      secondary: '#E8F0E0', 'secondary-foreground': '#1a2e1a',
      muted: '#D5E0CC', 'muted-foreground': '#4a6040',
      accent: '#15803d', 'accent-foreground': '#FFFFFF',
      destructive: '#dc2626',
      border: '#C8D8BC', input: '#FAFFF5', ring: '#16a34a',
      success: '#16a34a', 'success-muted': 'rgba(22, 163, 74, 0.12)',
      warning: '#ca8a04', 'warning-muted': 'rgba(202, 138, 4, 0.12)',
      danger: '#dc2626', 'danger-muted': 'rgba(220, 38, 38, 0.12)',
      info: '#16a34a', 'info-muted': 'rgba(22, 163, 74, 0.12)',
      'chart-1': '#16a34a', 'chart-2': '#4a6040', 'chart-3': '#0891b2', 'chart-4': '#dc2626', 'chart-5': '#1a2e1a',
      ...scrollbarColors('#E8F0E0', '#B0C8A0', '#16a34a'),
      'vortex-glow': '0 0 20px rgba(22, 163, 74, 0.3)',
    },
  },
  {
    id: 'swiss-utopia',
    name: 'Swiss Utopia',
    category: 'swiss',
    isDark: false,
    colors: {
      background: '#F5F0FF', foreground: '#1a1028',
      card: '#FAF7FF', 'card-foreground': '#1a1028',
      popover: '#FAF7FF', 'popover-foreground': '#1a1028',
      primary: '#7C3AED', 'primary-foreground': '#FFFFFF',
      secondary: '#EDE5FF', 'secondary-foreground': '#1a1028',
      muted: '#DDD0F5', 'muted-foreground': '#6B5A8A',
      accent: '#7C3AED', 'accent-foreground': '#FFFFFF',
      destructive: '#dc2626',
      border: '#D0C0E8', input: '#FAF7FF', ring: '#8B5CF6',
      success: '#16a34a', 'success-muted': 'rgba(22, 163, 74, 0.12)',
      warning: '#ca8a04', 'warning-muted': 'rgba(202, 138, 4, 0.12)',
      danger: '#dc2626', 'danger-muted': 'rgba(220, 38, 38, 0.12)',
      info: '#8B5CF6', 'info-muted': 'rgba(139, 92, 246, 0.12)',
      'chart-1': '#8B5CF6', 'chart-2': '#6B5A8A', 'chart-3': '#16a34a', 'chart-4': '#dc2626', 'chart-5': '#1a1028',
      ...scrollbarColors('#EDE5FF', '#C0A8E8', '#8B5CF6'),
      'vortex-glow': '0 0 20px rgba(139, 92, 246, 0.3)',
    },
  },

  // ─── NATURE ───────────────────────────────────
  {
    id: 'autumn',
    name: 'Autumn',
    category: 'nature',
    isDark: false,
    colors: {
      background: '#FDF6E3', foreground: '#3C2A14',
      card: '#FFF8EC', 'card-foreground': '#3C2A14',
      popover: '#FFF8EC', 'popover-foreground': '#3C2A14',
      primary: '#B45309', 'primary-foreground': '#FFFFFF',
      secondary: '#F0E4CC', 'secondary-foreground': '#3C2A14',
      muted: '#E5D8C0', 'muted-foreground': '#7A6548',
      accent: '#B45309', 'accent-foreground': '#FFFFFF',
      destructive: '#dc2626',
      border: '#D8C8A8', input: '#FFF8EC', ring: '#D97706',
      success: '#16a34a', 'success-muted': 'rgba(22, 163, 74, 0.12)',
      warning: '#D97706', 'warning-muted': 'rgba(217, 119, 6, 0.12)',
      danger: '#dc2626', 'danger-muted': 'rgba(220, 38, 38, 0.12)',
      info: '#D97706', 'info-muted': 'rgba(217, 119, 6, 0.12)',
      'chart-1': '#D97706', 'chart-2': '#7A6548', 'chart-3': '#16a34a', 'chart-4': '#dc2626', 'chart-5': '#3C2A14',
      ...scrollbarColors('#F0E4CC', '#C8B090', '#D97706'),
      'vortex-glow': '0 0 20px rgba(217, 119, 6, 0.3)',
    },
  },
  {
    id: 'summer',
    name: 'Summer',
    category: 'nature',
    isDark: false,
    colors: {
      background: '#FFFBF0', foreground: '#2D1810',
      card: '#FFFDF5', 'card-foreground': '#2D1810',
      popover: '#FFFDF5', 'popover-foreground': '#2D1810',
      primary: '#DC2626', 'primary-foreground': '#FFFFFF',
      secondary: '#FFF0E0', 'secondary-foreground': '#2D1810',
      muted: '#F0E0D0', 'muted-foreground': '#8B6050',
      accent: '#DC2626', 'accent-foreground': '#FFFFFF',
      destructive: '#b91c1c',
      border: '#E8D4C0', input: '#FFFDF5', ring: '#EF4444',
      success: '#16a34a', 'success-muted': 'rgba(22, 163, 74, 0.12)',
      warning: '#ca8a04', 'warning-muted': 'rgba(202, 138, 4, 0.12)',
      danger: '#b91c1c', 'danger-muted': 'rgba(185, 28, 28, 0.12)',
      info: '#EF4444', 'info-muted': 'rgba(239, 68, 68, 0.12)',
      'chart-1': '#EF4444', 'chart-2': '#8B6050', 'chart-3': '#16a34a', 'chart-4': '#ca8a04', 'chart-5': '#2D1810',
      ...scrollbarColors('#FFF0E0', '#D8C0A8', '#EF4444'),
      'vortex-glow': '0 0 20px rgba(239, 68, 68, 0.3)',
    },
  },
  {
    id: 'winter',
    name: 'Winter',
    category: 'nature',
    isDark: false,
    colors: {
      background: '#F0F4F8', foreground: '#0F172A',
      card: '#F8FAFC', 'card-foreground': '#0F172A',
      popover: '#F8FAFC', 'popover-foreground': '#0F172A',
      primary: '#2563EB', 'primary-foreground': '#FFFFFF',
      secondary: '#E2E8F0', 'secondary-foreground': '#0F172A',
      muted: '#CBD5E1', 'muted-foreground': '#475569',
      accent: '#2563EB', 'accent-foreground': '#FFFFFF',
      destructive: '#dc2626',
      border: '#C0CCD8', input: '#F8FAFC', ring: '#3B82F6',
      success: '#16a34a', 'success-muted': 'rgba(22, 163, 74, 0.12)',
      warning: '#ca8a04', 'warning-muted': 'rgba(202, 138, 4, 0.12)',
      danger: '#dc2626', 'danger-muted': 'rgba(220, 38, 38, 0.12)',
      info: '#3B82F6', 'info-muted': 'rgba(59, 130, 246, 0.12)',
      'chart-1': '#3B82F6', 'chart-2': '#475569', 'chart-3': '#16a34a', 'chart-4': '#dc2626', 'chart-5': '#0F172A',
      ...scrollbarColors('#E2E8F0', '#A0B0C0', '#3B82F6'),
      'vortex-glow': '0 0 20px rgba(59, 130, 246, 0.3)',
    },
  },
  {
    id: 'storm',
    name: 'Storm',
    category: 'nature',
    isDark: true,
    colors: {
      background: '#1A1A2E', foreground: '#E0E0F0',
      card: '#22223A', 'card-foreground': '#E0E0F0',
      popover: '#22223A', 'popover-foreground': '#E0E0F0',
      primary: '#7C3AED', 'primary-foreground': '#E0E0F0',
      secondary: '#2A2A42', 'secondary-foreground': '#E0E0F0',
      muted: '#33334D', 'muted-foreground': '#9898BB',
      accent: '#7C3AED', 'accent-foreground': '#E0E0F0',
      destructive: '#ef4444',
      border: '#33334D', input: '#22223A', ring: '#7C3AED',
      success: '#22c55e', 'success-muted': 'rgba(34, 197, 94, 0.15)',
      warning: '#eab308', 'warning-muted': 'rgba(234, 179, 8, 0.15)',
      danger: '#ef4444', 'danger-muted': 'rgba(239, 68, 68, 0.15)',
      info: '#7C3AED', 'info-muted': 'rgba(124, 58, 237, 0.15)',
      'chart-1': '#7C3AED', 'chart-2': '#8888AA', 'chart-3': '#22c55e', 'chart-4': '#ef4444', 'chart-5': '#E0E0F0',
      ...scrollbarColors('#22223A', '#444466', '#7C3AED'),
      'vortex-glow': '0 0 30px rgba(124, 58, 237, 0.4)',
    },
  },
  {
    id: 'forest',
    name: 'Forest',
    category: 'nature',
    isDark: true,
    colors: {
      background: '#0D1B0E', foreground: '#D0E8D0',
      card: '#152418', 'card-foreground': '#D0E8D0',
      popover: '#152418', 'popover-foreground': '#D0E8D0',
      primary: '#22C55E', 'primary-foreground': '#0D1B0E',
      secondary: '#1A2E1C', 'secondary-foreground': '#D0E8D0',
      muted: '#243828', 'muted-foreground': '#6A9A6E',
      accent: '#22C55E', 'accent-foreground': '#0D1B0E',
      destructive: '#ef4444',
      border: '#2A3E2C', input: '#152418', ring: '#22C55E',
      success: '#22C55E', 'success-muted': 'rgba(34, 197, 94, 0.15)',
      warning: '#eab308', 'warning-muted': 'rgba(234, 179, 8, 0.15)',
      danger: '#ef4444', 'danger-muted': 'rgba(239, 68, 68, 0.15)',
      info: '#22C55E', 'info-muted': 'rgba(34, 197, 94, 0.15)',
      'chart-1': '#22C55E', 'chart-2': '#6A9A6E', 'chart-3': '#0891b2', 'chart-4': '#ef4444', 'chart-5': '#D0E8D0',
      ...scrollbarColors('#152418', '#2E4830', '#22C55E'),
      'vortex-glow': '0 0 30px rgba(34, 197, 94, 0.4)',
    },
  },

  // ─── RETRO ────────────────────────────────────
  {
    id: 'retrowave',
    name: 'Retrowave',
    category: 'retro',
    isDark: true,
    colors: {
      background: '#2D1B69', foreground: '#F0D0FF',
      card: '#3A2580', 'card-foreground': '#F0D0FF',
      popover: '#3A2580', 'popover-foreground': '#F0D0FF',
      primary: '#FF6B9D', 'primary-foreground': '#1A0E3D',
      secondary: '#3D2888', 'secondary-foreground': '#F0D0FF',
      muted: '#4A3098', 'muted-foreground': '#C8A8E0',
      accent: '#FF6B9D', 'accent-foreground': '#2D1B69',
      destructive: '#FF4060',
      border: '#4A3098', input: '#3A2580', ring: '#FF6B9D',
      success: '#50FA7B', 'success-muted': 'rgba(80, 250, 123, 0.15)',
      warning: '#FFB86C', 'warning-muted': 'rgba(255, 184, 108, 0.15)',
      danger: '#FF4060', 'danger-muted': 'rgba(255, 64, 96, 0.15)',
      info: '#FF6B9D', 'info-muted': 'rgba(255, 107, 157, 0.15)',
      'chart-1': '#FF6B9D', 'chart-2': '#B090D0', 'chart-3': '#50FA7B', 'chart-4': '#FF4060', 'chart-5': '#F0D0FF',
      ...scrollbarColors('#3A2580', '#5A40A8', '#FF6B9D'),
      'vortex-glow': '0 0 30px rgba(255, 107, 157, 0.4)',
    },
  },
  {
    id: 'synthwave',
    name: 'Synthwave',
    category: 'retro',
    isDark: true,
    colors: {
      background: '#0F0A2E', foreground: '#E0D0FF',
      card: '#1A1240', 'card-foreground': '#E0D0FF',
      popover: '#1A1240', 'popover-foreground': '#E0D0FF',
      primary: '#FF00FF', 'primary-foreground': '#0F0A2E',
      secondary: '#201850', 'secondary-foreground': '#E0D0FF',
      muted: '#2A2060', 'muted-foreground': '#A898D8',
      accent: '#FF00FF', 'accent-foreground': '#0F0A2E',
      destructive: '#FF2060',
      border: '#2A2060', input: '#1A1240', ring: '#FF00FF',
      success: '#00FF80', 'success-muted': 'rgba(0, 255, 128, 0.15)',
      warning: '#FFD700', 'warning-muted': 'rgba(255, 215, 0, 0.15)',
      danger: '#FF2060', 'danger-muted': 'rgba(255, 32, 96, 0.15)',
      info: '#FF00FF', 'info-muted': 'rgba(255, 0, 255, 0.15)',
      'chart-1': '#FF00FF', 'chart-2': '#9080C0', 'chart-3': '#00FF80', 'chart-4': '#FF2060', 'chart-5': '#E0D0FF',
      ...scrollbarColors('#1A1240', '#3A2870', '#FF00FF'),
      'vortex-glow': '0 0 30px rgba(255, 0, 255, 0.5)',
    },
  },
  {
    id: 'vapor',
    name: 'Vapor',
    category: 'retro',
    isDark: false,
    colors: {
      background: '#FFE4F0', foreground: '#2A1520',
      card: '#FFF0F7', 'card-foreground': '#2A1520',
      popover: '#FFF0F7', 'popover-foreground': '#2A1520',
      primary: '#0D9488', 'primary-foreground': '#FFFFFF',
      secondary: '#F8D0E0', 'secondary-foreground': '#2A1520',
      muted: '#F0C0D4', 'muted-foreground': '#6D3D55',
      accent: '#0D9488', 'accent-foreground': '#FFFFFF',
      destructive: '#dc2626',
      border: '#E8B0C8', input: '#FFF0F7', ring: '#14B8A6',
      success: '#16a34a', 'success-muted': 'rgba(22, 163, 74, 0.12)',
      warning: '#ca8a04', 'warning-muted': 'rgba(202, 138, 4, 0.12)',
      danger: '#dc2626', 'danger-muted': 'rgba(220, 38, 38, 0.12)',
      info: '#14B8A6', 'info-muted': 'rgba(20, 184, 166, 0.12)',
      'chart-1': '#14B8A6', 'chart-2': '#805068', 'chart-3': '#16a34a', 'chart-4': '#dc2626', 'chart-5': '#2A1520',
      ...scrollbarColors('#F8D0E0', '#D8A0B8', '#14B8A6'),
      'vortex-glow': '0 0 20px rgba(20, 184, 166, 0.3)',
    },
  },

  // ─── FUTURISTIC ───────────────────────────────
  {
    id: 'matrix',
    name: 'Matrix',
    category: 'futuristic',
    isDark: true,
    colors: {
      background: '#000000', foreground: '#00FF00',
      card: '#0A0A0A', 'card-foreground': '#00FF00',
      popover: '#0A0A0A', 'popover-foreground': '#00FF00',
      primary: '#00FF00', 'primary-foreground': '#000000',
      secondary: '#0A1A0A', 'secondary-foreground': '#00FF00',
      muted: '#102010', 'muted-foreground': '#00BB00',
      accent: '#00FF00', 'accent-foreground': '#000000',
      destructive: '#FF0000',
      border: '#003300', input: '#0A0A0A', ring: '#00FF00',
      success: '#00FF00', 'success-muted': 'rgba(0, 255, 0, 0.15)',
      warning: '#FFFF00', 'warning-muted': 'rgba(255, 255, 0, 0.15)',
      danger: '#FF0000', 'danger-muted': 'rgba(255, 0, 0, 0.15)',
      info: '#00FF00', 'info-muted': 'rgba(0, 255, 0, 0.15)',
      'chart-1': '#00FF00', 'chart-2': '#008800', 'chart-3': '#00FFFF', 'chart-4': '#FF0000', 'chart-5': '#00FF00',
      ...scrollbarColors('#0A0A0A', '#003300', '#00FF00'),
      'vortex-glow': '0 0 30px rgba(0, 255, 0, 0.5)',
    },
  },
  {
    id: 'cyberpunk',
    name: 'Cyberpunk',
    category: 'futuristic',
    isDark: true,
    colors: {
      background: '#1A1A1A', foreground: '#E8E8E0',
      card: '#242424', 'card-foreground': '#E8E8E0',
      popover: '#242424', 'popover-foreground': '#E8E8E0',
      primary: '#FACC15', 'primary-foreground': '#1A1A1A',
      secondary: '#2A2A2A', 'secondary-foreground': '#E8E8E0',
      muted: '#333333', 'muted-foreground': '#999990',
      accent: '#FACC15', 'accent-foreground': '#1A1A1A',
      destructive: '#ef4444',
      border: '#3A3A3A', input: '#242424', ring: '#FACC15',
      success: '#22c55e', 'success-muted': 'rgba(34, 197, 94, 0.15)',
      warning: '#FACC15', 'warning-muted': 'rgba(250, 204, 21, 0.15)',
      danger: '#ef4444', 'danger-muted': 'rgba(239, 68, 68, 0.15)',
      info: '#FACC15', 'info-muted': 'rgba(250, 204, 21, 0.15)',
      'chart-1': '#FACC15', 'chart-2': '#999990', 'chart-3': '#22c55e', 'chart-4': '#ef4444', 'chart-5': '#E8E8E0',
      ...scrollbarColors('#242424', '#444444', '#FACC15'),
      'vortex-glow': '0 0 30px rgba(250, 204, 21, 0.4)',
    },
  },
  {
    id: 'techno',
    name: 'Techno',
    category: 'futuristic',
    isDark: true,
    colors: {
      background: '#050510', foreground: '#C0D0F0',
      card: '#0D0D20', 'card-foreground': '#C0D0F0',
      popover: '#0D0D20', 'popover-foreground': '#C0D0F0',
      primary: '#3B82F6', 'primary-foreground': '#050510',
      secondary: '#10102A', 'secondary-foreground': '#C0D0F0',
      muted: '#1A1A38', 'muted-foreground': '#6080B0',
      accent: '#3B82F6', 'accent-foreground': '#050510',
      destructive: '#ef4444',
      border: '#1A1A38', input: '#0D0D20', ring: '#3B82F6',
      success: '#22c55e', 'success-muted': 'rgba(34, 197, 94, 0.15)',
      warning: '#eab308', 'warning-muted': 'rgba(234, 179, 8, 0.15)',
      danger: '#ef4444', 'danger-muted': 'rgba(239, 68, 68, 0.15)',
      info: '#3B82F6', 'info-muted': 'rgba(59, 130, 246, 0.15)',
      'chart-1': '#3B82F6', 'chart-2': '#6080B0', 'chart-3': '#22c55e', 'chart-4': '#ef4444', 'chart-5': '#C0D0F0',
      ...scrollbarColors('#0D0D20', '#2A2A50', '#3B82F6'),
      'vortex-glow': '0 0 30px rgba(59, 130, 246, 0.5)',
    },
  },
  {
    id: 'hologram',
    name: 'Hologram',
    category: 'futuristic',
    isDark: true,
    colors: {
      background: '#0A0A14', foreground: '#C8E0F0',
      card: '#12121E', 'card-foreground': '#C8E0F0',
      popover: '#12121E', 'popover-foreground': '#C8E0F0',
      primary: '#06B6D4', 'primary-foreground': '#0A0A14',
      secondary: '#161628', 'secondary-foreground': '#C8E0F0',
      muted: '#1E1E32', 'muted-foreground': '#6890A8',
      accent: '#06B6D4', 'accent-foreground': '#0A0A14',
      destructive: '#ef4444',
      border: '#1E1E32', input: '#12121E', ring: '#06B6D4',
      success: '#22c55e', 'success-muted': 'rgba(34, 197, 94, 0.15)',
      warning: '#eab308', 'warning-muted': 'rgba(234, 179, 8, 0.15)',
      danger: '#ef4444', 'danger-muted': 'rgba(239, 68, 68, 0.15)',
      info: '#06B6D4', 'info-muted': 'rgba(6, 182, 212, 0.15)',
      'chart-1': '#06B6D4', 'chart-2': '#6890A8', 'chart-3': '#22c55e', 'chart-4': '#ef4444', 'chart-5': '#C8E0F0',
      ...scrollbarColors('#12121E', '#2A2A44', '#06B6D4'),
      'vortex-glow': '0 0 30px rgba(6, 182, 212, 0.5)',
    },
  },
  // ─── NEW: BRUTALISM (Swiss) ───────────────────
  {
    id: 'brutalism',
    name: 'Brutalism',
    category: 'swiss',
    isDark: false,
    colors: {
      background: '#9E9E9E', foreground: '#1A1A1A',
      card: '#B0B0B0', 'card-foreground': '#1A1A1A',
      popover: '#B0B0B0', 'popover-foreground': '#1A1A1A',
      primary: '#D32F2F', 'primary-foreground': '#FFFFFF',
      secondary: '#8A8A8A', 'secondary-foreground': '#1A1A1A',
      muted: '#7A7A7A', 'muted-foreground': '#3A3A3A',
      accent: '#D32F2F', 'accent-foreground': '#FFFFFF',
      destructive: '#B71C1C',
      border: '#6A6A6A', input: '#A0A0A0', ring: '#D32F2F',
      success: '#2E7D32', 'success-muted': 'rgba(46, 125, 50, 0.15)',
      warning: '#F57F17', 'warning-muted': 'rgba(245, 127, 23, 0.15)',
      danger: '#D32F2F', 'danger-muted': 'rgba(211, 47, 47, 0.15)',
      info: '#1565C0', 'info-muted': 'rgba(21, 101, 192, 0.15)',
      'chart-1': '#D32F2F', 'chart-2': '#3A3A3A', 'chart-3': '#2E7D32', 'chart-4': '#F57F17', 'chart-5': '#1A1A1A',
      ...scrollbarColors('#8A8A8A', '#6A6A6A', '#D32F2F'),
      'vortex-glow': '0 0 20px rgba(211, 47, 47, 0.3)',
    },
  },
  // ─── NEW: OCEAN (Nature) ─────────────────────
  {
    id: 'ocean',
    name: 'Ocean',
    category: 'nature',
    isDark: true,
    colors: {
      background: '#0D1B2A', foreground: '#C8E6F0',
      card: '#1B2838', 'card-foreground': '#C8E6F0',
      popover: '#1B2838', 'popover-foreground': '#C8E6F0',
      primary: '#1B998B', 'primary-foreground': '#0D1B2A',
      secondary: '#15253A', 'secondary-foreground': '#C8E6F0',
      muted: '#1E3048', 'muted-foreground': '#6A9AB0',
      accent: '#1B998B', 'accent-foreground': '#0D1B2A',
      destructive: '#EF5350',
      border: '#1E3048', input: '#1B2838', ring: '#1B998B',
      success: '#26A69A', 'success-muted': 'rgba(38, 166, 154, 0.15)',
      warning: '#FFB74D', 'warning-muted': 'rgba(255, 183, 77, 0.15)',
      danger: '#EF5350', 'danger-muted': 'rgba(239, 83, 80, 0.15)',
      info: '#29B6F6', 'info-muted': 'rgba(41, 182, 246, 0.15)',
      'chart-1': '#1B998B', 'chart-2': '#6A9AB0', 'chart-3': '#26A69A', 'chart-4': '#EF5350', 'chart-5': '#C8E6F0',
      ...scrollbarColors('#15253A', '#2A4058', '#1B998B'),
      'vortex-glow': '0 0 25px rgba(27, 153, 139, 0.4)',
    },
  },
  // ─── NEW: AMBER TERMINAL (Retro) ─────────────
  {
    id: 'amber-terminal',
    name: 'Amber Terminal',
    category: 'retro',
    isDark: true,
    colors: {
      background: '#1A1A00', foreground: '#FFB000',
      card: '#242400', 'card-foreground': '#FFB000',
      popover: '#242400', 'popover-foreground': '#FFB000',
      primary: '#FFB000', 'primary-foreground': '#1A1A00',
      secondary: '#2A2A08', 'secondary-foreground': '#CC8C00',
      muted: '#333310', 'muted-foreground': '#8A7020',
      accent: '#FFB000', 'accent-foreground': '#1A1A00',
      destructive: '#FF4400',
      border: '#4A4A10', input: '#242400', ring: '#FFB000',
      success: '#88CC00', 'success-muted': 'rgba(136, 204, 0, 0.15)',
      warning: '#FFCC00', 'warning-muted': 'rgba(255, 204, 0, 0.15)',
      danger: '#FF4400', 'danger-muted': 'rgba(255, 68, 0, 0.15)',
      info: '#FFB000', 'info-muted': 'rgba(255, 176, 0, 0.15)',
      'chart-1': '#FFB000', 'chart-2': '#8A7020', 'chart-3': '#88CC00', 'chart-4': '#FF4400', 'chart-5': '#CC8C00',
      ...scrollbarColors('#242400', '#4A4A10', '#FFB000'),
      'vortex-glow': '0 0 25px rgba(255, 176, 0, 0.4)',
    },
  },
  // ─── NEW: NEON (Futuristic) ──────────────────
  {
    id: 'neon',
    name: 'Neon',
    category: 'futuristic',
    isDark: true,
    colors: {
      background: '#000000', foreground: '#E0E0F0',
      card: '#0A0A12', 'card-foreground': '#E0E0F0',
      popover: '#0A0A12', 'popover-foreground': '#E0E0F0',
      primary: '#FF006E', 'primary-foreground': '#000000',
      secondary: '#0F0F1A', 'secondary-foreground': '#E0E0F0',
      muted: '#1A1A28', 'muted-foreground': '#7070A0',
      accent: '#FF006E', 'accent-foreground': '#000000',
      destructive: '#FF1744',
      border: '#2A2A3A', input: '#0A0A12', ring: '#FF006E',
      success: '#00E676', 'success-muted': 'rgba(0, 230, 118, 0.15)',
      warning: '#FFEA00', 'warning-muted': 'rgba(255, 234, 0, 0.15)',
      danger: '#FF1744', 'danger-muted': 'rgba(255, 23, 68, 0.15)',
      info: '#00B0FF', 'info-muted': 'rgba(0, 176, 255, 0.15)',
      'chart-1': '#FF006E', 'chart-2': '#00B0FF', 'chart-3': '#00E676', 'chart-4': '#FF1744', 'chart-5': '#FFEA00',
      ...scrollbarColors('#0A0A12', '#2A2A3A', '#FF006E'),
      'vortex-glow': '0 0 35px rgba(255, 0, 110, 0.5)',
    },
  },
];

export const DEFAULT_THEME = 'swiss-nihilism-dark';

export function getTheme(id: string): ThemeDefinition {
  return THEMES.find(t => t.id === id) || THEMES.find(t => t.id === DEFAULT_THEME)!;
}

export function isDarkTheme(id: string): boolean {
  return getTheme(id).isDark;
}

/** Apply theme CSS variables to the document root */
export function applyTheme(id: string): void {
  const theme = getTheme(id);
  const root = document.documentElement;

  for (const [key, value] of Object.entries(theme.colors)) {
    root.style.setProperty(`--${key}`, value);
  }

  // Toggle .dark class for scrollbar CSS and backward compat
  root.classList.toggle('dark', theme.isDark);
}

/** Get the next theme in the list (cycling) */
export function getNextThemeId(currentId: string): string {
  const idx = THEMES.findIndex(t => t.id === currentId);
  return THEMES[(idx + 1) % THEMES.length].id;
}

/** Get all themes grouped by category */
export function getThemesByCategory(): Record<string, ThemeDefinition[]> {
  const grouped: Record<string, ThemeDefinition[]> = {};
  for (const theme of THEMES) {
    if (!grouped[theme.category]) grouped[theme.category] = [];
    grouped[theme.category].push(theme);
  }
  return grouped;
}
