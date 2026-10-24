import React from 'react';
import { render, fireEvent, act } from '@testing-library/react-native';
import { Alert } from 'react-native';
import SavedScreen from '../saved';
import { useItemsStore } from '@/domain/useItemsStore';
import { useCollectionsStore } from '@/domain/useCollectionsStore';
import { Item, Collection } from '@/domain/types';
import * as databaseModule from '@/db/database';

const mockPush = jest.fn();

jest.mock('expo-router', () => ({
  useRouter: () => ({
    push: mockPush,
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

jest.mock('@/db/database', () => ({
  getStartupMigrationError: jest.fn(() => null),
  retryDatabaseInitialization: jest.fn(() => Promise.resolve(true)),
}));

const mockItems: Item[] = [
  {
    id: 'item-1',
    type: 'link',
    title: 'Minimalist Architecture in Tokyo',
    url: 'https://example.com/tokyo-arch',
    minutes: 5,
    status: 'pending',
    created_at: new Date(Date.now() - 3600000).toISOString(),
    done_at: null,
    let_go_at: null,
    resurfaced_at: null,
    snoozed_until: null,
    times_surfaced: 0,
    tags: ['japan', 'design'],
    note: 'Inspirational timber details',
    collection_id: 'col-1',
  },
  {
    id: 'item-2',
    type: 'reel',
    title: 'Pour over coffee brew guide',
    url: 'https://instagram.com/reel/coffee123',
    minutes: 1,
    status: 'pending',
    created_at: new Date(Date.now() - 7200000).toISOString(),
    done_at: null,
    let_go_at: null,
    resurfaced_at: null,
    snoozed_until: null,
    times_surfaced: 0,
    tags: ['coffee'],
    collection_id: null,
  },
  {
    id: 'item-3',
    type: 'task',
    title: 'Clean espresso grinder',
    url: null,
    minutes: 15,
    status: 'pending',
    created_at: new Date(Date.now() - 10800000).toISOString(),
    done_at: null,
    let_go_at: null,
    resurfaced_at: null,
    snoozed_until: null,
    times_surfaced: 0,
    collection_id: null,
  },
  {
    id: 'item-4',
    type: 'link',
    title: 'Read rust async guide',
    url: 'https://rust-lang.org/async',
    minutes: 30,
    status: 'done',
    created_at: new Date(Date.now() - 86400000).toISOString(),
    done_at: new Date().toISOString(),
    let_go_at: null,
    resurfaced_at: null,
    snoozed_until: null,
    times_surfaced: 1,
    collection_id: null,
  },
];

const mockCollections: Collection[] = [
  { id: 'col-1', name: 'Design Library', created_at: new Date().toISOString() },
  { id: 'col-2', name: 'Weekend Tasks', created_at: new Date().toISOString() },
];

describe('SavedScreen (Search, Filters, Collections & Item Actions)', () => {
  let screen: any;
  let createCollectionSpy: jest.Mock;
  let deleteCollectionSpy: jest.Mock;
  let alertSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();

    createCollectionSpy = jest.fn().mockResolvedValue({ id: 'col-3', name: 'New Col' });
    deleteCollectionSpy = jest.fn().mockResolvedValue(undefined);
    alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});

    useItemsStore.setState({
      items: mockItems,
      loadItems: jest.fn().mockResolvedValue(undefined),
    });

    useCollectionsStore.setState({
      collections: mockCollections,
      loadCollections: jest.fn().mockResolvedValue(undefined),
      createCollection: createCollectionSpy,
      deleteCollection: deleteCollectionSpy,
    });
  });

  afterEach(() => {
    if (screen) {
      screen.unmount();
      screen = null;
    }
  });

  it('renders header, search bar, and item count for pending items', async () => {
    screen = await render(<SavedScreen />);

    expect(screen.getByText('Your Collection')).toBeTruthy();
    expect(screen.getByPlaceholderText('Search saved items, tags, links...')).toBeTruthy();
    expect(screen.getByText('3 ITEMS')).toBeTruthy();
    expect(screen.getByText('Minimalist Architecture in Tokyo')).toBeTruthy();
    expect(screen.getByText('Pour over coffee brew guide')).toBeTruthy();
    expect(screen.getByText('Clean espresso grinder')).toBeTruthy();
  });

  it('filters items in real-time by search query matching title', async () => {
    screen = await render(<SavedScreen />);

    const searchInput = screen.getByPlaceholderText('Search saved items, tags, links...');
    await act(async () => {
      fireEvent.changeText(searchInput, 'tokyo');
    });

    expect(screen.getByText('Minimalist Architecture in Tokyo')).toBeTruthy();
    expect(screen.queryByText('Pour over coffee brew guide')).toBeNull();
    expect(screen.queryByText('Clean espresso grinder')).toBeNull();
    expect(screen.getByText('1 ITEM')).toBeTruthy();
  });

  it('filters items in real-time by search query matching notes', async () => {
    screen = await render(<SavedScreen />);

    const searchInput = screen.getByPlaceholderText('Search saved items, tags, links...');
    await act(async () => {
      fireEvent.changeText(searchInput, 'timber');
    });

    expect(screen.getByText('Minimalist Architecture in Tokyo')).toBeTruthy();
    expect(screen.queryByText('Pour over coffee brew guide')).toBeNull();
  });

  it('filters items in real-time by search query matching tags', async () => {
    screen = await render(<SavedScreen />);

    const searchInput = screen.getByPlaceholderText('Search saved items, tags, links...');
    await act(async () => {
      fireEvent.changeText(searchInput, 'coffee');
    });

    expect(screen.getByText('Pour over coffee brew guide')).toBeTruthy();
    expect(screen.queryByText('Minimalist Architecture in Tokyo')).toBeNull();
  });

  it('displays empty state when search query matches zero items', async () => {
    screen = await render(<SavedScreen />);

    const searchInput = screen.getByPlaceholderText('Search saved items, tags, links...');
    await act(async () => {
      fireEvent.changeText(searchInput, 'xyznotfoundquery');
    });

    expect(screen.getByText('0 ITEMS')).toBeTruthy();
    expect(screen.getByText('No items here')).toBeTruthy();
  });

  it('filters down to Reels when Reel filter chip is pressed', async () => {
    screen = await render(<SavedScreen />);

    const reelChip = screen.getByText('Reels');
    await act(async () => {
      fireEvent.press(reelChip);
    });

    expect(screen.getByText('Pour over coffee brew guide')).toBeTruthy();
    expect(screen.queryByText('Minimalist Architecture in Tokyo')).toBeNull();
    expect(screen.queryByText('Clean espresso grinder')).toBeNull();
  });

  it('filters down to Tasks when Tasks filter chip is pressed', async () => {
    screen = await render(<SavedScreen />);

    const tasksChip = screen.getByText('Tasks');
    await act(async () => {
      fireEvent.press(tasksChip);
    });

    expect(screen.getByText('Clean espresso grinder')).toBeTruthy();
    expect(screen.queryByText('Minimalist Architecture in Tokyo')).toBeNull();
    expect(screen.queryByText('Pour over coffee brew guide')).toBeNull();
  });

  it('shows completed items when Completed filter chip is pressed', async () => {
    screen = await render(<SavedScreen />);

    const doneChip = screen.getByText('Completed');
    await act(async () => {
      fireEvent.press(doneChip);
    });

    expect(screen.getByText('Read rust async guide')).toBeTruthy();
    expect(screen.queryByText('Minimalist Architecture in Tokyo')).toBeNull();
  });

  it('navigates to item detail screen when an item is pressed', async () => {
    screen = await render(<SavedScreen />);

    const itemRow = screen.getByText('Minimalist Architecture in Tokyo');
    await act(async () => {
      fireEvent.press(itemRow);
    });

    expect(mockPush).toHaveBeenCalledWith('/item/item-1');
  });

  it('switches to Collections tab and renders collections list', async () => {
    screen = await render(<SavedScreen />);

    const collectionsTab = screen.getByText('Collections (2)');
    await act(async () => {
      fireEvent.press(collectionsTab);
    });

    expect(screen.getByText('Design Library')).toBeTruthy();
    expect(screen.getByText('Weekend Tasks')).toBeTruthy();
  });

  it('filters items belonging to collection when a collection is selected', async () => {
    screen = await render(<SavedScreen />);

    // Switch to collections
    await act(async () => {
      fireEvent.press(screen.getByText('Collections (2)'));
    });

    // Tap on Design Library collection
    await act(async () => {
      fireEvent.press(screen.getByText('Design Library'));
    });

    // Should show collection name as title and show back to collections button
    expect(screen.getByText('All Collections')).toBeTruthy();
    expect(screen.getByText('Minimalist Architecture in Tokyo')).toBeTruthy();
    expect(screen.queryByText('Pour over coffee brew guide')).toBeNull();
  });

  it('navigates back to all collections from collection detail view', async () => {
    screen = await render(<SavedScreen />);

    await act(async () => {
      fireEvent.press(screen.getByText('Collections (2)'));
    });
    await act(async () => {
      fireEvent.press(screen.getByText('Design Library'));
    });

    expect(screen.getByText('All Collections')).toBeTruthy();

    await act(async () => {
      fireEvent.press(screen.getByText('All Collections'));
    });

    expect(screen.getByText('Collections (2)')).toBeTruthy();
  });

  it('renders DatabaseUpdateNotice if a database migration error exists', async () => {
    (databaseModule.getStartupMigrationError as jest.Mock).mockReturnValue(
      'Database migration failed'
    );

    screen = await render(<SavedScreen />);

    expect(screen.getByText('Database Update Notice')).toBeTruthy();
  });
});
