import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Dimensions, TouchableOpacity, Image } from 'react-native';
import { useRouter } from 'expo-router';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withRepeat,
  withSequence,
  withDelay,
  Easing,
  interpolate,
} from 'react-native-reanimated';
import Svg, { Circle, Path, G } from 'react-native-svg';
import { colors, typography, spacing } from '@/theme';
import { useSettingsStore } from '@/domain/useSettingsStore';
import { useItemsStore } from '@/domain/useItemsStore';
import { ReMindLogo } from '@/components';

import { setupNotificationChannels } from '@/platform/notifications';

const { width } = Dimensions.get('window');

export default function SplashScreen() {
  const router = useRouter();
  const { settings, loadSettings, isLoading: settingsLoading } = useSettingsStore();
  const { loadItems } = useItemsStore();

  // Animation values
  const breathProgress = useSharedValue(0);
  const rotationProgress = useSharedValue(0);
  const logoScale = useSharedValue(0.7);
  const logoOpacity = useSharedValue(0);
  const textOpacity = useSharedValue(0);
  const textTranslateY = useSharedValue(24);
  const taglineOpacity = useSharedValue(0);
  const screenOpacity = useSharedValue(1);

  useEffect(() => {
    // Preload stores and setup notification channels
    loadSettings();
    loadItems();
    setupNotificationChannels().catch(() => {});

    // 1. Logo entrance: Spring/Smooth scale & fade
    logoScale.value = withTiming(1, {
      duration: 1200,
      easing: Easing.out(Easing.cubic),
    });
    logoOpacity.value = withTiming(1, { duration: 900 });

    // 2. Continuous breathing wave
    breathProgress.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 2400, easing: Easing.inOut(Easing.quad) }),
        withTiming(0, { duration: 2400, easing: Easing.inOut(Easing.quad) })
      ),
      -1,
      true
    );

    // 3. Continuous gentle orbital rotation
    rotationProgress.value = withRepeat(
      withTiming(360, { duration: 20000, easing: Easing.linear }),
      -1,
      false
    );

    // 4. Staggered text entrance
    textOpacity.value = withDelay(
      500,
      withTiming(1, { duration: 800, easing: Easing.out(Easing.quad) })
    );
    textTranslateY.value = withDelay(
      500,
      withTiming(0, { duration: 800, easing: Easing.out(Easing.back(1.2)) })
    );

    // 5. Tagline entrance
    taglineOpacity.value = withDelay(
      900,
      withTiming(1, { duration: 900, easing: Easing.out(Easing.quad) })
    );

    // 6. Automatic transition after 2.2 seconds
    const timer = setTimeout(() => {
      handleNavigate();
    }, 2200);

    return () => clearTimeout(timer);
  }, []);

  const hasNavigated = useRef(false);

  const navigateToDestination = async () => {
    if (hasNavigated.current) return;
    hasNavigated.current = true;

    // Retrieve active state directly from store to prevent stale closure bugs on reopen
    let currentSettings = useSettingsStore.getState().settings;
    if (useSettingsStore.getState().isLoading) {
      try {
        await Promise.race([
          useSettingsStore.getState().loadSettings(),
          new Promise((resolve) => setTimeout(resolve, 1500)),
        ]);
        currentSettings = useSettingsStore.getState().settings;
      } catch {}
    }

    if (currentSettings?.onboarding_completed === false) {
      router.replace('/onboarding');
    } else {
      router.replace('/(tabs)/today');
    }
  };

  const handleNavigate = () => {
    if (hasNavigated.current) return;
    screenOpacity.value = withTiming(0, { duration: 300 });
    setTimeout(() => {
      navigateToDestination();
    }, 300);
  };

  // Animated styles
  const screenAnimatedStyle = useAnimatedStyle(() => ({
    opacity: screenOpacity.value,
  }));

  const logoAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: logoScale.value }],
    opacity: logoOpacity.value,
  }));

  const textAnimatedStyle = useAnimatedStyle(() => ({
    opacity: textOpacity.value,
    transform: [{ translateY: textTranslateY.value }],
  }));

  const taglineAnimatedStyle = useAnimatedStyle(() => ({
    opacity: taglineOpacity.value,
  }));

  const outerPulseStyle = useAnimatedStyle(() => {
    const scale = interpolate(breathProgress.value, [0, 1], [0.95, 1.15]);
    const opacity = interpolate(breathProgress.value, [0, 1], [0.15, 0.4]);
    return {
      transform: [{ scale }],
      opacity,
    };
  });

  const middlePulseStyle = useAnimatedStyle(() => {
    const scale = interpolate(breathProgress.value, [0, 1], [0.98, 1.08]);
    const opacity = interpolate(breathProgress.value, [0, 1], [0.25, 0.55]);
    return {
      transform: [{ scale }],
      opacity,
    };
  });

  const orbitStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotationProgress.value}deg` }],
  }));

  return (
    <TouchableOpacity
      activeOpacity={1}
      onPress={handleNavigate}
      style={styles.container}
    >
      <Animated.View style={[styles.innerContent, screenAnimatedStyle]}>
        {/* Motion Graphics Centerpiece */}
        <View style={styles.graphicWrapper}>
          {/* Outer Ambient Breathing Halo */}
          <Animated.View style={[styles.haloRingOuter, outerPulseStyle]} />
          {/* Middle Concentric Ring */}
          <Animated.View style={[styles.haloRingMiddle, middlePulseStyle]} />

          {/* Rotating Orbital Vectors */}
          <Animated.View style={[styles.orbitContainer, orbitStyle]}>
            <Svg width={220} height={220} viewBox="0 0 220 220" fill="none">
              <Circle
                cx="110"
                cy="110"
                r="95"
                stroke={colors.accent}
                strokeWidth="1.2"
                strokeDasharray="8 12"
                opacity={0.5}
              />
              <Circle
                cx="110"
                cy="110"
                r="75"
                stroke={colors.textPrimary}
                strokeWidth="1"
                strokeDasharray="3 7"
                opacity={0.3}
              />
              <Circle cx="110" cy="15" r="3.5" fill={colors.accent} />
              <Circle cx="205" cy="110" r="2.5" fill={colors.textPrimary} />
              <Circle cx="15" cy="110" r="2" fill={colors.accent} />
            </Svg>
          </Animated.View>

          {/* Center Brand App Icon */}
          <Animated.View style={[styles.centerEmblem, logoAnimatedStyle]}>
            <Image
              source={require('../assets/images/icon.png')}
              style={styles.appIconImage}
              resizeMode="cover"
            />
          </Animated.View>
        </View>

        {/* Brand Title & Typography */}
        <Animated.View style={[styles.brandContainer, textAnimatedStyle]}>
          <ReMindLogo size="xl" />
          <View style={styles.titleDivider} />
        </Animated.View>

        {/* Tagline */}
        <Animated.View style={[styles.taglineContainer, taglineAnimatedStyle]}>
          <Text style={styles.taglineText}>
            A calm sanctuary for your attention
          </Text>
        </Animated.View>
      </Animated.View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  innerContent: {
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  graphicWrapper: {
    width: 260,
    height: 260,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    marginBottom: spacing.xxxl,
  },
  haloRingOuter: {
    position: 'absolute',
    width: 240,
    height: 240,
    borderRadius: 120,
    backgroundColor: 'rgba(212, 196, 176, 0.35)',
  },
  haloRingMiddle: {
    position: 'absolute',
    width: 170,
    height: 170,
    borderRadius: 85,
    backgroundColor: 'rgba(212, 196, 176, 0.45)',
  },
  orbitContainer: {
    position: 'absolute',
    width: 220,
    height: 220,
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerEmblem: {
    width: 96,
    height: 96,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 8,
    shadowColor: colors.textPrimary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 14,
  },
  appIconImage: {
    width: 88,
    height: 88,
    borderRadius: 22,
  },
  brandContainer: {
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  brandTitle: {
    ...typography.presets.hero,
    fontSize: 26,
    letterSpacing: 4.5,
    color: colors.textPrimary,
    fontWeight: '700',
  },
  titleDivider: {
    width: 32,
    height: 2,
    backgroundColor: colors.accent,
    borderRadius: 1,
    marginTop: spacing.md,
    opacity: 0.6,
  },
  taglineContainer: {
    marginTop: spacing.lg,
    paddingHorizontal: spacing.xxl,
  },
  taglineText: {
    ...typography.presets.body,
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    letterSpacing: 0.4,
  },
});
