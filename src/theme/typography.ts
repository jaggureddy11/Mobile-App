import { TextStyle } from 'react-native';

export const typography = {
  // Font families fallback cleanly to system geometric/humanist fonts if custom fonts not loaded
  fontFamily: {
    heading: 'System',
    body: 'System',
  },
  
  sizes: {
    tag: 10,
    caption: 11,
    footnote: 12,
    subhead: 13,
    body: 14,
    callout: 15,
    title3: 16,
    title2: 18,
    title1: 22,
    headline: 24,
    display: 28,
    hero: 32,
  },
  
  weights: {
    regular: '400' as const,
    medium: '500' as const,
    semibold: '600' as const,
    bold: '700' as const,
  },
  
  presets: {
    hero: {
      fontSize: 32,
      lineHeight: 38,
      fontWeight: '700',
      letterSpacing: -0.5,
    } as TextStyle,
    
    display: {
      fontSize: 28,
      lineHeight: 34,
      fontWeight: '600',
      letterSpacing: -0.3,
    } as TextStyle,
    
    title1: {
      fontSize: 22,
      lineHeight: 28,
      fontWeight: '600',
      letterSpacing: -0.2,
    } as TextStyle,
    
    title2: {
      fontSize: 18,
      lineHeight: 24,
      fontWeight: '600',
    } as TextStyle,
    
    bodyLarge: {
      fontSize: 16,
      lineHeight: 22,
      fontWeight: '500',
    } as TextStyle,
    
    body: {
      fontSize: 14,
      lineHeight: 20,
      fontWeight: '400',
    } as TextStyle,
    
    bodyMedium: {
      fontSize: 14,
      lineHeight: 20,
      fontWeight: '500',
    } as TextStyle,
    
    bodySmall: {
      fontSize: 13,
      lineHeight: 18,
      fontWeight: '500',
    } as TextStyle,
    
    quote: {
      fontSize: 13,
      lineHeight: 19,
      fontWeight: '500',
      fontStyle: 'italic',
    } as TextStyle,
    
    caption: {
      fontSize: 11,
      lineHeight: 14,
      fontWeight: '700',
      letterSpacing: 1.2,
      textTransform: 'uppercase',
    } as TextStyle,
    
    tag: {
      fontSize: 10,
      lineHeight: 13,
      fontWeight: '700',
      letterSpacing: 1.5,
      textTransform: 'uppercase',
    } as TextStyle,
    
    button: {
      fontSize: 15,
      lineHeight: 20,
      fontWeight: '700',
    } as TextStyle,
  },
};
