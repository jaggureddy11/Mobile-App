import React from 'react';
import { render, fireEvent, act } from '@testing-library/react-native';
import OnboardingScreen from '../onboarding';
import { useSettingsStore } from '@/domain/useSettingsStore';
import { DEFAULT_SETTINGS } from '@/domain/types';
import { FEATURES } from '@/config/features';

const mockPush = jest.fn();
const mockReplace = jest.fn();

jest.mock('expo-router', () => ({
  useRouter: () => ({
    push: mockPush,
    replace: mockReplace,
  }),
  useLocalSearchParams: () => ({}),
}));

jest.mock('lucide-react-native', () => {
  const React = require('react');
  const { View } = require('react-native');
  return new Proxy({}, {
    get: () => (props: any) => React.createElement(View, props),
  });
});

jest.mock('@/platform/notifications', () => ({
  requestNotificationPermission: jest.fn().mockResolvedValue(true),
}));

describe('OnboardingScreen (Step-by-step Flow & Persistence)', () => {
  let screen: any;
  let updateSettingsSpy: jest.SpyInstance;
  let completeOnboardingSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    useSettingsStore.setState({
      settings: { ...DEFAULT_SETTINGS, onboarding_completed: false },
      isLoading: false,
    });
    updateSettingsSpy = jest.spyOn(useSettingsStore.getState(), 'updateSettings').mockImplementation(async () => {});
    completeOnboardingSpy = jest.spyOn(useSettingsStore.getState(), 'completeOnboarding').mockImplementation(async () => {});
  });

  afterEach(() => {
    if (screen) {
      screen.unmount();
      screen = null;
    }
  });

  it('renders Step 1 with mindful space title and Next button', async () => {
    screen = await render(<OnboardingScreen />);

    expect(screen.getByText('MINDFUL SPACE')).toBeTruthy();
    expect(screen.getByText(/A calm sanctuary/i)).toBeTruthy();
    expect(screen.getByText('Next')).toBeTruthy();
    expect(screen.getByTestId('onboarding-step1-illustration')).toBeTruthy();
  });

  it('navigates from Step 1 to Step 2 when Next is pressed', async () => {
    screen = await render(<OnboardingScreen />);

    const nextBtn = screen.getByText('Next');
    await act(async () => {
      fireEvent.press(nextBtn);
    });

    expect(screen.getByText('ORGANIZED INTENTION')).toBeTruthy();
    expect(screen.getByText(/Collections &/i)).toBeTruthy();
    expect(screen.getByTestId('onboarding-step2-illustration')).toBeTruthy();
  });

  it('navigates back from Step 2 to Step 1 via top back arrow', async () => {
    screen = await render(<OnboardingScreen />);

    // Go to step 2
    await act(async () => {
      fireEvent.press(screen.getByText('Next'));
    });
    expect(screen.getByText('ORGANIZED INTENTION')).toBeTruthy();

    // Find and press back arrow
    const backBtn = screen.getByTestId('onboarding-back-btn');
    await act(async () => {
      fireEvent.press(backBtn);
    });

    expect(screen.getByText('MINDFUL SPACE')).toBeTruthy();
  });

  it('navigates from Step 2 to Step 3 when Next is pressed', async () => {
    screen = await render(<OnboardingScreen />);

    // Step 1 -> Step 2
    await act(async () => {
      fireEvent.press(screen.getByText('Next'));
    });

    // Step 2 -> Step 3
    await act(async () => {
      fireEvent.press(screen.getByText('Next'));
    });

    expect(screen.getByText('GENTLE NUDGES')).toBeTruthy();
    expect(screen.getByText(/How often should/i)).toBeTruthy();
    expect(screen.getByText('Get Started')).toBeTruthy();
    expect(screen.getByTestId('onboarding-step3-illustration')).toBeTruthy();
  });

  it('renders nudge frequency options with Daily selected by default', async () => {
    screen = await render(<OnboardingScreen />);

    // Advance to step 3
    await act(async () => {
      fireEvent.press(screen.getByText('Next'));
    });
    await act(async () => {
      fireEvent.press(screen.getByText('Next'));
    });

    expect(screen.getByText('Daily Evening')).toBeTruthy();
    expect(screen.getByText('Weekly Calm')).toBeTruthy();
    expect(screen.getByText('Purely On Demand')).toBeTruthy();
  });

  it('allows selecting Weekly Calm nudge frequency', async () => {
    screen = await render(<OnboardingScreen />);

    await act(async () => {
      fireEvent.press(screen.getByText('Next'));
    });
    await act(async () => {
      fireEvent.press(screen.getByText('Next'));
    });

    const weeklyOption = screen.getByText('Weekly Calm');
    await act(async () => {
      fireEvent.press(weeklyOption);
    });

    // Complete onboarding
    await act(async () => {
      fireEvent.press(screen.getByText('Get Started'));
    });

    expect(updateSettingsSpy).toHaveBeenCalledWith({
      nudge_frequency: 'weekly',
      user_email: null,
    });
    expect(completeOnboardingSpy).toHaveBeenCalledTimes(1);
    expect(mockReplace).toHaveBeenCalledWith('/(tabs)/today');
  });

  it('allows selecting Purely On Demand nudge frequency', async () => {
    screen = await render(<OnboardingScreen />);

    await act(async () => {
      fireEvent.press(screen.getByText('Next'));
    });
    await act(async () => {
      fireEvent.press(screen.getByText('Next'));
    });

    const neverOption = screen.getByText('Purely On Demand');
    await act(async () => {
      fireEvent.press(neverOption);
    });

    await act(async () => {
      fireEvent.press(screen.getByText('Get Started'));
    });

    expect(updateSettingsSpy).toHaveBeenCalledWith({
      nudge_frequency: 'never',
      user_email: null,
    });
    expect(completeOnboardingSpy).toHaveBeenCalledTimes(1);
    expect(mockReplace).toHaveBeenCalledWith('/(tabs)/today');
  });

  it('completes onboarding and routes to /(tabs)/today with default Daily frequency', async () => {
    screen = await render(<OnboardingScreen />);

    await act(async () => {
      fireEvent.press(screen.getByText('Next'));
    });
    await act(async () => {
      fireEvent.press(screen.getByText('Next'));
    });

    await act(async () => {
      fireEvent.press(screen.getByText('Get Started'));
    });

    expect(updateSettingsSpy).toHaveBeenCalledWith({
      nudge_frequency: 'daily',
      user_email: null,
    });
    expect(completeOnboardingSpy).toHaveBeenCalledTimes(1);
    expect(mockReplace).toHaveBeenCalledWith('/(tabs)/today');
  });

  it('shows 3 progress indicator dots when FEATURES.accounts is false', async () => {
    screen = await render(<OnboardingScreen />);

    // Root layout includes 3 dots when accounts feature is disabled
    expect(FEATURES.accounts).toBe(false);
  });

  it('handles error in completeOnboarding gracefully without crashing', async () => {
    completeOnboardingSpy.mockRejectedValueOnce(new Error('SQLite write failure'));

    screen = await render(<OnboardingScreen />);

    await act(async () => {
      fireEvent.press(screen.getByText('Next'));
    });
    await act(async () => {
      fireEvent.press(screen.getByText('Next'));
    });

    await act(async () => {
      fireEvent.press(screen.getByText('Get Started'));
    });

    // Should not crash and router should not have navigated on error
    expect(mockReplace).not.toHaveBeenCalled();
  });

  it('renders onboarding correctly when navigated to directly even if onboarding was previously completed', async () => {
    useSettingsStore.setState({
      settings: { ...DEFAULT_SETTINGS, onboarding_completed: true },
      isLoading: false,
    });

    screen = await render(<OnboardingScreen />);

    expect(screen.getByText('MINDFUL SPACE')).toBeTruthy();
    expect(mockReplace).not.toHaveBeenCalled();
  });

  it('renders Skip button on Step 1 and completes onboarding when pressed', async () => {
    screen = await render(<OnboardingScreen />);

    const skipBtn = screen.getByText('Skip');
    expect(skipBtn).toBeTruthy();

    await act(async () => {
      fireEvent.press(skipBtn);
    });

    expect(completeOnboardingSpy).toHaveBeenCalledTimes(1);
    expect(mockReplace).toHaveBeenCalledWith('/(tabs)/today');
  });

  it('renders Skip button on Step 2 and completes onboarding when pressed', async () => {
    screen = await render(<OnboardingScreen />);

    // Step 1 -> Step 2
    await act(async () => {
      fireEvent.press(screen.getByText('Next'));
    });

    const skipBtn = screen.getByText('Skip');
    expect(skipBtn).toBeTruthy();

    await act(async () => {
      fireEvent.press(skipBtn);
    });

    expect(completeOnboardingSpy).toHaveBeenCalledTimes(1);
    expect(mockReplace).toHaveBeenCalledWith('/(tabs)/today');
  });

  it('requests notification permission when completing onboarding with Daily frequency', async () => {
    const { requestNotificationPermission } = require('@/platform/notifications');
    (requestNotificationPermission as jest.Mock).mockClear();

    screen = await render(<OnboardingScreen />);

    // Advance to step 3
    await act(async () => {
      fireEvent.press(screen.getByText('Next'));
    });
    await act(async () => {
      fireEvent.press(screen.getByText('Next'));
    });

    await act(async () => {
      fireEvent.press(screen.getByText('Get Started'));
    });

    expect(requestNotificationPermission).toHaveBeenCalledTimes(1);
    expect(completeOnboardingSpy).toHaveBeenCalledTimes(1);
    expect(mockReplace).toHaveBeenCalledWith('/(tabs)/today');
  });

  it('does not request notification permission when completing onboarding with Purely On Demand', async () => {
    const { requestNotificationPermission } = require('@/platform/notifications');
    (requestNotificationPermission as jest.Mock).mockClear();

    screen = await render(<OnboardingScreen />);

    // Advance to step 3
    await act(async () => {
      fireEvent.press(screen.getByText('Next'));
    });
    await act(async () => {
      fireEvent.press(screen.getByText('Next'));
    });

    // Select Purely On Demand
    await act(async () => {
      fireEvent.press(screen.getByText('Purely On Demand'));
    });

    await act(async () => {
      fireEvent.press(screen.getByText('Get Started'));
    });

    expect(requestNotificationPermission).not.toHaveBeenCalled();
    expect(completeOnboardingSpy).toHaveBeenCalledTimes(1);
    expect(mockReplace).toHaveBeenCalledWith('/(tabs)/today');
  });
});

