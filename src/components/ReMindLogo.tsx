import React from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';

interface ReMindLogoProps {
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  textColor?: string;
  dotColor?: string;
}

const SIZES = {
  xs: { fontSize: 13, dotSize: 3, dotGap: 2.5, letterSpacing: -0.3, hGap: 1.5 },
  sm: { fontSize: 18, dotSize: 4, dotGap: 3.5, letterSpacing: -0.4, hGap: 2 },
  md: { fontSize: 26, dotSize: 5.5, dotGap: 4.5, letterSpacing: -0.6, hGap: 3 },
  lg: { fontSize: 34, dotSize: 7.5, dotGap: 6, letterSpacing: -0.8, hGap: 4 },
  xl: { fontSize: 46, dotSize: 10, dotGap: 8, letterSpacing: -1.2, hGap: 5 },
};

export const ReMindLogo: React.FC<ReMindLogoProps> = ({
  size = 'md',
  textColor = '#231F1D',
  dotColor = '#C29F79',
}) => {
  const config = SIZES[size] || SIZES.md;

  const fontStyle = {
    fontFamily: Platform.select({
      ios: 'Arial Rounded MT Bold',
      android: 'sans-serif-medium',
      default: 'system-ui',
    }),
    fontWeight: '800' as const,
    fontSize: config.fontSize,
    color: textColor,
    letterSpacing: config.letterSpacing,
    includeFontPadding: false,
  };

  return (
    <View style={styles.container}>
      {/* "Re" */}
      <Text style={fontStyle}>Re</Text>

      {/* Custom Caramel Colon Dots */}
      <View
        style={[
          styles.colonContainer,
          {
            marginHorizontal: config.hGap,
            height: config.fontSize * 0.58,
          },
        ]}
      >
        <View
          style={{
            width: config.dotSize,
            height: config.dotSize,
            borderRadius: config.dotSize / 2,
            backgroundColor: dotColor,
            marginBottom: config.dotGap,
          }}
        />
        <View
          style={{
            width: config.dotSize,
            height: config.dotSize,
            borderRadius: config.dotSize / 2,
            backgroundColor: dotColor,
          }}
        />
      </View>

      {/* "Mind" */}
      <Text style={fontStyle}>Mind</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  colonContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 2,
  },
});
