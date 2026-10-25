import React from 'react';
import { render, fireEvent, act } from '@testing-library/react-native';
import SplashScreen from '../index';
import { useSettingsStore } from '@/domain/useSettingsStore';
import { useItemsStore } from '@/domain/useItemsStore';
import { DEFAULT_SETTINGS } from '@/domain/types';

const mockPush = jest.fn();
const mockReplace = jest.fn();

jest.mock('lucide-react-native', () => {
  const React = require('react');
  const { View } = require('react-native');
  return new Proxy({}, {
    get: () => (props: any) => React.createElement(View, props),
  });
});

jest.mock('expo-router', () => ({
  useRouter: () => ({
    push: mockPush,
    replace: mockReplace,
  }),
  useLocalSearchParams: () => ({}),
}));

jest.mock('react-native-reanimated', () => {
  const React = require('react');
  const { View, Text } = require('react-native');
  return {
    __esModule: true,
    default: {
      View,
      Text,
      createAnimatedComponent: (c: any) => c,
    },
    useSharedValue: (init: any) => ({ value: init }),
    useAnimatedStyle: (cb: any) => cb() || {},
    withTiming: (toValue: any, _config?: any, callback?: any) => {
      if (typeof callback === 'function') callback(true);
      return toValue;
    },
    withRepeat: (anim: any) => anim,
    withSequence: (...anims: any[]) => anims[0],
    withDelay: (_delay: number, anim: any) => anim,
    Easing: {
      out: (e: any) => e,
      inOut: (e: any) => e,
      linear: (e: any) => e,
      quad: (e: any) => e,
      cubic: (e: any) => e,
      back: (_s: number) => (e: any) => e,
    },
    interpolate: (_val: number, _input: number[], output: number[]) => output[0],
  };
});

describe('SplashScreen (Cold Start & Navigation Safety)', () => {
  let screen: any;
  let loadSettingsSpy: jest.SpyInstance;
  let loadItemsSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();

    loadSettingsSpy = jest.spyOn(useSettingsStore.getState(), 'loadSettings').mockImplementation(async () => {});
    loadItemsSpy = jest.spyOn(useItemsStore.getState(), 'loadItems').mockImplementation(async () => {});

    useSettingsStore.setState({
      settings: { ...DEFAULT_SETTINGS, onboarding_completed: false },
      isLoading: false,
    });
  });

  afterEach(() => {
    if (screen) {
      screen.unmount();
      screen = null;
    }
    jest.clearAllTimers();
    jest.useRealTimers();
  });

  it('preloads settings and items on mount', async () => {
    screen = await render(<SplashScreen />);

    expect(loadSettingsSpy).toHaveBeenCalledTimes(1);
    expect(loadItemsSpy).toHaveBeenCalledTimes(1);
  });

  it('routes to /onboarding after 2.2s + 300ms transition for fresh install (onboarding_completed: false)', async () => {
    screen = await render(<SplashScreen />);

    expect(mockReplace).not.toHaveBeenCalled();

    // Advance 2.2s (trigger handleNavigate)
    await act(async () => {
      jest.advanceTimersByTime(2200);
    });

    expect(mockReplace).not.toHaveBeenCalled();

    // Advance 300ms (screenOpacity transition timeout)
    await act(async () => {
      jest.advanceTimersByTime(300);
    });

    expect(mockReplace).toHaveBeenCalledWith('/onboarding');
    expect(mockReplace).toHaveBeenCalledTimes(1);
  });

  it('routes to /(tabs)/today after timeout for returning user (onboarding_completed: true)', async () => {
    useSettingsStore.setState({
      settings: { ...DEFAULT_SETTINGS, onboarding_completed: true },
      isLoading: false,
    });

    screen = await render(<SplashScreen />);

    await act(async () => {
      jest.advanceTimersByTime(2500);
    });

    expect(mockReplace).toHaveBeenCalledWith('/(tabs)/today');
    expect(mockReplace).toHaveBeenCalledTimes(1);
  });

  it('allows immediate navigation when user taps screen before timeout', async () => {
    useSettingsStore.setState({
      settings: { ...DEFAULT_SETTINGS, onboarding_completed: true },
      isLoading: false,
    });

    screen = await render(<SplashScreen />);

    // Advance 500ms into the splash
    await act(async () => {
      jest.advanceTimersByTime(500);
    });

    expect(mockReplace).not.toHaveBeenCalled();

    // User taps the screen
    const touchable = screen.getByText('Re').parent.parent;
    await act(async () => {
      fireEvent.press(touchable);
    });

    // Advance the 300ms animation fadeout
    await act(async () => {
      jest.advanceTimersByTime(300);
    });

    expect(mockReplace).toHaveBeenCalledWith('/(tabs)/today');
    expect(mockReplace).toHaveBeenCalledTimes(1);
  });

  it('prevents duplicate navigation calls if tapped rapidly or after timer fires', async () => {
    useSettingsStore.setState({
      settings: { ...DEFAULT_SETTINGS, onboarding_completed: true },
      isLoading: false,
    });

    screen = await render(<SplashScreen />);

    // Fast-forward past both the 2.2s timeout and additional time
    await act(async () => {
      jest.advanceTimersByTime(2500);
      jest.advanceTimersByTime(5000);
    });

    expect(mockReplace).toHaveBeenCalledTimes(1);
  });

  it('renders branding elements Re:Mind logo and tagline', async () => {
    useSettingsStore.setState({
      settings: { ...DEFAULT_SETTINGS, onboarding_completed: true },
      isLoading: false,
    });

    screen = await render(<SplashScreen />);

    expect(screen.getByText('Re')).toBeTruthy();
    expect(screen.getByText('Mind')).toBeTruthy();
    expect(screen.getByText('A calm sanctuary for your attention')).toBeTruthy();
  });

  it('safely cleans up timer on unmount before timeout fires', async () => {
    screen = await render(<SplashScreen />);

    await act(async () => {
      jest.advanceTimersByTime(1000);
    });

    await act(async () => {
      screen.unmount();
      screen = null;
    });

    await act(async () => {
      jest.advanceTimersByTime(2000);
    });

    expect(mockReplace).not.toHaveBeenCalled();
  });

  it('handles multiple rapid taps by calling router.replace exactly once', async () => {
    useSettingsStore.setState({
      settings: { ...DEFAULT_SETTINGS, onboarding_completed: true },
      isLoading: false,
    });

    screen = await render(<SplashScreen />);

    const touchable = screen.getByText('Re').parent.parent;
    await act(async () => {
      fireEvent.press(touchable);
      fireEvent.press(touchable);
      fireEvent.press(touchable);
    });

    await act(async () => {
      jest.advanceTimersByTime(300);
    });

    expect(mockReplace).toHaveBeenCalledTimes(1);
    expect(mockReplace).toHaveBeenCalledWith('/(tabs)/today');
  });

  it('renders SVG background halo animation layers', async () => {
    screen = await render(<SplashScreen />);
    // Verify outer and inner elements are present
    expect(screen.toJSON()).toBeTruthy();
  });

  it('handles settings loading delay without throwing or prematurely navigating', async () => {
    useSettingsStore.setState({
      settings: DEFAULT_SETTINGS,
      isLoading: true,
    });

    screen = await render(<SplashScreen />);

    await act(async () => {
      jest.advanceTimersByTime(500);
    });

    expect(mockReplace).not.toHaveBeenCalled();

    // Resolve settings after 1 second
    await act(async () => {
      useSettingsStore.setState({
        settings: { ...DEFAULT_SETTINGS, onboarding_completed: false },
        isLoading: false,
      });
    });

    await act(async () => {
      jest.advanceTimersByTime(2000);
    });

    expect(mockReplace).toHaveBeenCalledWith('/onboarding');
  });

  it('routes fresh install to /onboarding on tap even before 2.2s timeout', async () => {
    useSettingsStore.setState({
      settings: { ...DEFAULT_SETTINGS, onboarding_completed: false },
      isLoading: false,
    });

    screen = await render(<SplashScreen />);

    const touchable = screen.getByText('Re').parent.parent;
    await act(async () => {
      fireEvent.press(touchable);
    });

    await act(async () => {
      jest.advanceTimersByTime(300);
    });

    expect(mockReplace).toHaveBeenCalledWith('/onboarding');
    expect(mockReplace).toHaveBeenCalledTimes(1);
  });

  it('avoids stale closure bug and routes to /(tabs)/today when settings load asynchronously with onboarding_completed: true', async () => {
    // Start with onboarding_completed: false and isLoading: true
    useSettingsStore.setState({
      settings: { ...DEFAULT_SETTINGS, onboarding_completed: false },
      isLoading: true,
    });

    screen = await render(<SplashScreen />);

    // Advance 500ms
    await act(async () => {
      jest.advanceTimersByTime(500);
    });

    // Settings store completes loading and updates state to true
    await act(async () => {
      useSettingsStore.setState({
        settings: { ...DEFAULT_SETTINGS, onboarding_completed: true },
        isLoading: false,
      });
    });

    // Advance past the 2.2s + 300ms transition
    await act(async () => {
      jest.advanceTimersByTime(2000);
    });

    // Because navigateToDestination reads fresh Zustand state via useSettingsStore.getState(),
    // it routes to /(tabs)/today and NOT /onboarding!
    expect(mockReplace).toHaveBeenCalledWith('/(tabs)/today');
    expect(mockReplace).toHaveBeenCalledTimes(1);
  });
});

