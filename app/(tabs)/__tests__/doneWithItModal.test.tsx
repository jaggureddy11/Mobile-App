import React from 'react';
import { AppState, AppStateStatus, Linking } from 'react-native';
import { render, fireEvent, act } from '@testing-library/react-native';
import TodayScreen from '../today';
import { useItemsStore } from '@/domain/useItemsStore';
import { Item } from '@/domain/types';

jest.mock('lucide-react-native', () => {
  const React = require('react');
  const { View } = require('react-native');
  return new Proxy({}, {
    get: () => (props: any) => React.createElement(View, props),
  });
});

jest.mock('expo-router', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
  }),
}));

jest.mock('@/platform/useListenShareIntent', () => ({
  useListenShareIntent: jest.fn(),
}));

const mockItem: Item = {
  id: 'link-item-1',
  type: 'link',
  title: 'Interesting Tech Article',
  url: 'https://example.com/tech-article',
  minutes: 5,
  status: 'pending',
  created_at: new Date(Date.now() - 30 * 3600 * 1000).toISOString(), // >24h old, eligible
  done_at: null,
  let_go_at: null,
  resurfaced_at: null,
  snoozed_until: null,
  times_surfaced: 0,
};

jest.mock('@/db/itemsRepo', () => ({
  itemsRepo: {
    getAll: jest.fn(() => Promise.resolve([mockItem])),
    recordSurfaceEvent: jest.fn(() => Promise.resolve('event-1')),
    recordSurfaceAction: jest.fn(() => Promise.resolve(undefined)),
    updateStatus: jest.fn(() => Promise.resolve(undefined)),
    deleteMultiple: jest.fn(() => Promise.resolve(undefined)),
  },
}));

jest.mock('@/db/settingsRepo', () => ({
  settingsRepo: {
    getSettings: jest.fn(() => Promise.resolve({ nudge_time: '19:00' })),
  },
}));

describe('TodayScreen: Done-With-It Confirmation Modal', () => {
  let appStateListener: (state: AppStateStatus) => void;
  let screen: any;

  beforeEach(() => {
    jest.clearAllMocks();
    AppState.currentState = 'active';

    jest.spyOn(Linking, 'openURL').mockResolvedValue(true as any);

    jest.spyOn(AppState, 'addEventListener').mockImplementation((type: any, handler: any) => {
      if (type === 'change') {
        appStateListener = handler;
      }
      return { remove: jest.fn() } as any;
    });

    jest.spyOn(useItemsStore.getState(), 'loadItems').mockImplementation(async () => {});

    useItemsStore.setState({
      items: [mockItem],
      activeItem: mockItem,
      selectedMinutes: 5,
      isLoading: false,
      undoItem: null,
      undoTimer: null,
      doItem: jest.fn().mockResolvedValue(undefined),
    });
  });

  afterEach(() => {
    screen?.unmount();
  });

  it('does NOT show modal if transitioning from inactive to active', async () => {
    screen = await render(<TodayScreen />);

    // Click "Do it" to launch URL and set pendingConfirmItemId
    const doItBtn = screen.getByText('Do it');
    await act(async () => {
      fireEvent.press(doItBtn);
    });

    expect(Linking.openURL).toHaveBeenCalledWith('https://example.com/tech-article');

    // Simulate transition to inactive first, then active
    await act(async () => {
      appStateListener('inactive');
    });
    await act(async () => {
      appStateListener('active');
    });

    // Modal should NOT show because transition was inactive -> active
    expect(screen.queryByText('Done with it?')).toBeNull();
  });

  it('shows modal ONLY on transition from background to active when pending id is set', async () => {
    screen = await render(<TodayScreen />);

    // Click "Do it" to open URL
    const doItBtn = screen.getByText('Do it');
    await act(async () => {
      fireEvent.press(doItBtn);
    });

    // App goes to background
    await act(async () => {
      appStateListener('background');
    });

    // App returns to active
    await act(async () => {
      appStateListener('active');
    });

    // Modal should now be visible!
    expect(await screen.findByText('Done with it?')).toBeTruthy();
    expect(await screen.findByText('Yes, done!')).toBeTruthy();
    expect(await screen.findByText('Keep waiting')).toBeTruthy();
  });

  it('clears pending id and hides modal when answered "Yes, done!"', async () => {
    const doItemMock = jest.fn().mockResolvedValue(undefined);
    useItemsStore.setState({ doItem: doItemMock });

    screen = await render(<TodayScreen />);

    // Open item
    await act(async () => {
      fireEvent.press(screen.getByText('Do it'));
    });

    // Background -> Active
    await act(async () => {
      appStateListener('background');
    });
    await act(async () => {
      appStateListener('active');
    });

    expect(await screen.findByText('Done with it?')).toBeTruthy();

    // Answer "Yes, done!"
    await act(async () => {
      fireEvent.press(screen.getByText('Yes, done!'));
    });

    expect(doItemMock).toHaveBeenCalledWith('link-item-1');

    // Modal should disappear
    expect(screen.queryByText('Done with it?')).toBeNull();

    // Trigger another background -> active; should NOT show modal again
    await act(async () => {
      appStateListener('background');
    });
    await act(async () => {
      appStateListener('active');
    });
    expect(screen.queryByText('Done with it?')).toBeNull();
  });

  it('clears pending id and hides modal when dismissed with "Keep waiting"', async () => {
    const doItemMock = jest.fn();
    useItemsStore.setState({ doItem: doItemMock });

    screen = await render(<TodayScreen />);

    await act(async () => {
      fireEvent.press(screen.getByText('Do it'));
    });

    await act(async () => {
      appStateListener('background');
    });
    await act(async () => {
      appStateListener('active');
    });

    expect(await screen.findByText('Done with it?')).toBeTruthy();

    // Answer "Keep waiting"
    await act(async () => {
      fireEvent.press(screen.getByText('Keep waiting'));
    });

    expect(doItemMock).not.toHaveBeenCalled();
    expect(screen.queryByText('Done with it?')).toBeNull();

    // Subsequent background -> active does not trigger modal
    await act(async () => {
      appStateListener('background');
    });
    await act(async () => {
      appStateListener('active');
    });
    expect(screen.queryByText('Done with it?')).toBeNull();
  });
});
