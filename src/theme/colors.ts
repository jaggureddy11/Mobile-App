export const colors = {
  // Core canvas & backgrounds
  background: '#FBF9F6', // Warm Cream
  backgroundSecondary: '#F5F0E8', // Light Beige / Soft Sand
  card: '#FFFFFF', // Pure White card surface
  cardMuted: '#FAF7F2',
  
  // Accents & Borders
  accent: '#D4C4B0', // Sandy Beige
  accentLight: 'rgba(212, 196, 176, 0.2)',
  accentMedium: 'rgba(212, 196, 176, 0.4)',
  accentGlow: 'rgba(212, 196, 176, 0.15)',
  border: 'rgba(212, 196, 176, 0.3)',
  borderSubtle: 'rgba(212, 196, 176, 0.15)',
  
  // Text hierarchy
  textPrimary: '#2D2D2D', // Deep Charcoal
  textSecondary: '#8A7E72', // Warm Slate / Muted Taupe
  textTertiary: '#D4C4B0', // Sandy Beige text / captions
  textInverted: '#FBF9F6', // Cream on Dark
  
  // Buttons & Controls
  primaryButton: '#2D2D2D',
  primaryButtonText: '#FFFFFF',
  secondaryButton: '#FFFFFF',
  secondaryButtonBorder: 'rgba(212, 196, 176, 0.4)',
  secondaryButtonText: '#2D2D2D',
  
  // Action states
  doIt: '#2D2D2D',
  later: '#2D2D2D',
  letItGo: '#8A7E72',
  letItGoMuted: '#D4C4B0',
  
  // Pills
  pillActiveBg: '#2D2D2D',
  pillActiveText: '#FBF9F6',
  pillInactiveBg: 'rgba(212, 196, 176, 0.2)',
  pillInactiveText: '#8A7E72',
  
  // Success & Danger
  success: '#7C8B68', // Warm Sage
  danger: '#C86D5B', // Warm Terracotta
  warning: '#D4A373',
  
  // Overlay
  overlay: 'rgba(45, 45, 45, 0.4)',
  blurNav: 'rgba(255, 255, 255, 0.85)',
} as const;

export type Colors = typeof colors;
