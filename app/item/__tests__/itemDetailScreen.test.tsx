import React from 'react';
import { render, fireEvent, act } from '@testing-library/react-native';
import { Linking } from 'react-native';
import ItemDetailScreen from '../[id]';
import { useItemsStore } from '@/domain/useItemsStore';
import { useCollectionsStore } from '@/domain/useCollectionsStore';
import { Item, Collection } from '@/domain/types';

const mockBack = jest.fn();
let mockParams = { id: 'test-item-1' };

jest.mock('expo-router', () => ({
  useLocalSearchParams: () => mockParams,
  useRouter: () => ({
    back: mockBack,
    push: jest.fn(),
    replace: jest.fn(),
  }),
}));

jest.mock('lucide-react-native', () => {
  const React = require('react');
  const { View } = require('react-native');
  return new Proxy({}, {
    get: () => (props: any) => React.createElement(View, props),
  });
});

const mockItem: Item = {
  id: 'test-item-1',
  type: 'link',
  title: 'Understanding SQLite Write Ahead Logging',
  url: 'https://sqlite.org/wal.html',
  minutes: 15,
  status: 'pending',
  created_at: new Date(Date.now() - 3600000).toISOString(),
  done_at: null,
  let_go_at: null,
  resurfaced_at: null,
  snoozed_until: null,
  times_surfaced: 1,
  note: 'Key architecture reference for embedded mobile databases',
  tags: ['sqlite', 'database', 'perf'],
  collection_id: 'col-dev',
  site_name: 'SQLite.org',
};

const mockCollections: Collection[] = [
  { id: 'col-dev', name: 'Developer Reading', created_at: new Date().toISOString() },
];

describe('ItemDetailScreen (Full Item Lifecycle & Deep Actions)', () => {
  let screen: any;
  let doItemSpy: jest.Mock;
  let laterItemSpy: jest.Mock;
  let letGoItemSpy: jest.Mock;
  let openUrlSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    mockParams = { id: 'test-item-1' };

    doItemSpy = jest.fn().mockResolvedValue(undefined);
    laterItemSpy = jest.fn().mockResolvedValue(undefined);
    letGoItemSpy = jest.fn().mockResolvedValue(undefined);
    openUrlSpy = jest.spyOn(Linking, 'openURL').mockResolvedValue(true as any);

    useItemsStore.setState({
      items: [mockItem],
      doItem: doItemSpy,
      laterItem: laterItemSpy,
      letGoItem: letGoItemSpy,
    });

    useCollectionsStore.setState({
      collections: mockCollections,
    });
  });

  afterEach(() => {
    if (screen) {
      screen.unmount();
      screen = null;
    }
  });

  it('renders "Item not found" and handles "Go back" button when item ID does not exist', async () => {
    mockParams = { id: 'non-existent-id' };

    screen = await render(<ItemDetailScreen />);

    expect(screen.getByText('Item not found')).toBeTruthy();

    const goBackBtn = screen.getByText('Go back');
    await act(async () => {
      fireEvent.press(goBackBtn);
    });

    expect(mockBack).toHaveBeenCalledTimes(1);
  });

  it('renders complete item details (title, note, duration, collection, tags, and site)', async () => {
    screen = await render(<ItemDetailScreen />);

    expect(screen.getByText('Understanding SQLite Write Ahead Logging')).toBeTruthy();
    expect(screen.getByText('"Key architecture reference for embedded mobile databases"')).toBeTruthy();
    expect(screen.getByText('15 Minutes')).toBeTruthy();
    expect(screen.getByText('Developer Reading')).toBeTruthy();
    expect(screen.getByText('#sqlite')).toBeTruthy();
    expect(screen.getByText('#database')).toBeTruthy();
    expect(screen.getByText('SQLITE.ORG')).toBeTruthy();
    expect(screen.getByText('https://sqlite.org/wal.html')).toBeTruthy();
  });

  it('navigates back when header back arrow is pressed', async () => {
    screen = await render(<ItemDetailScreen />);

    const backArrow = screen.getByText('Taking a Moment').parent.parent.children[0];
    await act(async () => {
      fireEvent.press(backArrow);
    });

    expect(mockBack).toHaveBeenCalledTimes(1);
  });

  it('opens URL via Linking when URL link button is pressed', async () => {
    screen = await render(<ItemDetailScreen />);

    const urlButton = screen.getByText('https://sqlite.org/wal.html');
    await act(async () => {
      fireEvent.press(urlButton);
    });

    expect(openUrlSpy).toHaveBeenCalledWith('https://sqlite.org/wal.html');
  });

  it('executes "Start this now": launches external URL, calls doItem, and navigates back', async () => {
    screen = await render(<ItemDetailScreen />);

    const startBtn = screen.getByText('Start this now');
    await act(async () => {
      fireEvent.press(startBtn);
    });

    expect(openUrlSpy).toHaveBeenCalledWith('https://sqlite.org/wal.html');
    expect(doItemSpy).toHaveBeenCalledWith('test-item-1');
    expect(mockBack).toHaveBeenCalledTimes(1);
  });

  it('executes "Start this now" for a task with null URL without throwing', async () => {
    const taskItem: Item = {
      ...mockItem,
      id: 'task-1',
      type: 'task',
      url: null,
    };
    useItemsStore.setState({ items: [taskItem] });
    mockParams = { id: 'task-1' };

    screen = await render(<ItemDetailScreen />);

    const startBtn = screen.getByText('Start this now');
    await act(async () => {
      fireEvent.press(startBtn);
    });

    expect(openUrlSpy).not.toHaveBeenCalled();
    expect(doItemSpy).toHaveBeenCalledWith('task-1');
    expect(mockBack).toHaveBeenCalledTimes(1);
  });

  it('executes "Keep for later" button: calls laterItem and navigates back', async () => {
    screen = await render(<ItemDetailScreen />);

    const laterBtn = screen.getByText('Keep for later');
    await act(async () => {
      fireEvent.press(laterBtn);
    });

    expect(laterItemSpy).toHaveBeenCalledWith('test-item-1');
    expect(mockBack).toHaveBeenCalledTimes(1);
  });

  it('executes "Let it go" button: calls letGoItem and navigates back', async () => {
    screen = await render(<ItemDetailScreen />);

    const letGoBtn = screen.getByText('Let it go');
    await act(async () => {
      fireEvent.press(letGoBtn);
    });

    expect(letGoItemSpy).toHaveBeenCalledWith('test-item-1');
    expect(mockBack).toHaveBeenCalledTimes(1);
  });

  it('renders completed banner and hides pending action buttons when item status is done', async () => {
    const doneItem: Item = {
      ...mockItem,
      status: 'done',
      done_at: new Date().toISOString(),
    };
    useItemsStore.setState({ items: [doneItem] });

    screen = await render(<ItemDetailScreen />);

    expect(screen.getByText('DONE')).toBeTruthy();
    expect(screen.getByText('You already breathed through this activity.')).toBeTruthy();
    expect(screen.queryByText('Start this now')).toBeNull();
    expect(screen.queryByText('Keep for later')).toBeNull();
  });
});
