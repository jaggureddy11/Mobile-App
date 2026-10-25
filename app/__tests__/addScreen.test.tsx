import React from 'react';
import { render, fireEvent, act } from '@testing-library/react-native';
import { Alert } from 'react-native';
import AddModal from '../add';
import { useItemsStore } from '@/domain/useItemsStore';
import { useCollectionsStore } from '@/domain/useCollectionsStore';
import { itemsRepo } from '@/db/itemsRepo';
import * as metadataScraper from '@/platform/metadataScraper';
import * as databaseModule from '@/db/database';

const mockBack = jest.fn();

jest.mock('expo-router', () => ({
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

jest.mock('@/db/itemsRepo', () => ({
  itemsRepo: {
    findByNormalizedUrl: jest.fn(() => Promise.resolve(null)),
  },
}));

jest.mock('@/platform/metadataScraper', () => ({
  fetchUrlMetadata: jest.fn(),
}));

jest.mock('@/db/database', () => ({
  getStartupMigrationError: jest.fn(() => null),
}));

describe('AddModal (Screen & Flow Integration)', () => {
  let screen: any;
  let addItemSpy: jest.Mock;
  let createCollectionSpy: jest.Mock;
  let alertSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();

    addItemSpy = jest.fn().mockResolvedValue(undefined);
    createCollectionSpy = jest.fn().mockResolvedValue({ id: 'col-new', name: 'Work' });
    alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});

    useItemsStore.setState({
      addItem: addItemSpy,
    });

    useCollectionsStore.setState({
      collections: [
        { id: 'col-1', name: 'Articles', created_at: new Date().toISOString() },
        { id: 'col-2', name: 'Recipes', created_at: new Date().toISOString() },
      ],
      loadCollections: jest.fn().mockResolvedValue(undefined),
      createCollection: createCollectionSpy,
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

  it('renders "Save for later" header and close button', async () => {
    screen = await render(<AddModal />);
    expect(screen.getByText('Save for later')).toBeTruthy();
  });

  it('navigates back when close button is pressed', async () => {
    screen = await render(<AddModal />);

    // Close button has icon X
    const closeBtn = screen.getByText('Save for later').parent.children[0];
    await act(async () => {
      fireEvent.press(closeBtn);
    });

    expect(mockBack).toHaveBeenCalledTimes(1);
  });

  it('disables submit button when title and url are both empty', async () => {
    screen = await render(<AddModal />);

    const submitBtn = screen.getByText('Keep for later');
    await act(async () => {
      fireEvent.press(submitBtn);
    });

    expect(addItemSpy).not.toHaveBeenCalled();
    expect(mockBack).not.toHaveBeenCalled();
  });

  it('enables submit button and saves item when only title is provided', async () => {
    screen = await render(<AddModal />);

    const titleInput = screen.getByPlaceholderText('e.g. Read article on creative focus');
    await act(async () => {
      fireEvent.changeText(titleInput, 'Finish taxes');
    });

    const submitBtn = screen.getByText('Keep for later');
    await act(async () => {
      fireEvent.press(submitBtn);
    });

    expect(addItemSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'link',
        title: 'Finish taxes',
        url: null,
      })
    );
    expect(mockBack).toHaveBeenCalledTimes(1);
  });

  it('switches category to Task and auto-updates duration to 15m', async () => {
    screen = await render(<AddModal />);

    const taskPill = screen.getByText('Task');
    await act(async () => {
      fireEvent.press(taskPill);
    });

    const titleInput = screen.getByPlaceholderText('e.g. Read article on creative focus');
    await act(async () => {
      fireEvent.changeText(titleInput, 'Call electrician');
    });

    await act(async () => {
      fireEvent.press(screen.getByText('Keep for later'));
    });

    expect(addItemSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'task',
        minutes: 15,
      })
    );
  });

  it('switches category to Reel and auto-updates duration to 1m', async () => {
    screen = await render(<AddModal />);

    const reelPill = screen.getByText('Reel');
    await act(async () => {
      fireEvent.press(reelPill);
    });

    const titleInput = screen.getByPlaceholderText('e.g. Read article on creative focus');
    await act(async () => {
      fireEvent.changeText(titleInput, 'Watch pottery clip');
    });

    await act(async () => {
      fireEvent.press(screen.getByText('Keep for later'));
    });

    expect(addItemSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'reel',
        minutes: 1,
      })
    );
  });

  it('switches category to Activity and auto-updates duration to 30m', async () => {
    screen = await render(<AddModal />);

    const activityPill = screen.getByText('Activity');
    await act(async () => {
      fireEvent.press(activityPill);
    });

    const titleInput = screen.getByPlaceholderText('e.g. Read article on creative focus');
    await act(async () => {
      fireEvent.changeText(titleInput, 'Afternoon jog');
    });

    await act(async () => {
      fireEvent.press(screen.getByText('Keep for later'));
    });

    expect(addItemSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'activity',
        minutes: 30,
      })
    );
  });

  it('allows manual override of duration chips (e.g. selecting 30 min for a link)', async () => {
    screen = await render(<AddModal />);

    const duration30 = screen.getByText('30 min');
    await act(async () => {
      fireEvent.press(duration30);
    });

    const titleInput = screen.getByPlaceholderText('e.g. Read article on creative focus');
    await act(async () => {
      fireEvent.changeText(titleInput, 'Long-form deep dive');
    });

    await act(async () => {
      fireEvent.press(screen.getByText('Keep for later'));
    });

    expect(addItemSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'link',
        minutes: 30,
      })
    );
  });

  it('auto-detects reel type and 1 min duration when entering Instagram reel URL', async () => {
    screen = await render(<AddModal />);

    const urlInput = screen.getByPlaceholderText('https://...');
    await act(async () => {
      fireEvent.changeText(urlInput, 'https://www.instagram.com/reel/C12345678/');
    });

    await act(async () => {
      fireEvent.press(screen.getByText('Keep for later'));
    });

    expect(addItemSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'reel',
        minutes: 1,
        url: 'https://www.instagram.com/reel/C12345678/',
      })
    );
  });

  it('triggers metadata scraping and auto-fills title and description snippet on success', async () => {
    (metadataScraper.fetchUrlMetadata as jest.Mock).mockResolvedValueOnce({
      title: 'Architectural Digest: Sustainable Japanese Homes',
      description: 'A walkthrough of three timber residences in Kyoto focusing on passive heating.',
      siteName: 'Architectural Digest',
      imageUrl: 'https://example.com/kyoto-home.jpg',
      estimatedMinutes: 5,
    });

    screen = await render(<AddModal />);

    const urlInput = screen.getByPlaceholderText('https://...');
    await act(async () => {
      fireEvent.changeText(urlInput, 'https://architecturaldigest.com/story/kyoto-homes');
    });

    // Advance 600ms debounce
    await act(async () => {
      jest.advanceTimersByTime(600);
    });

    expect(metadataScraper.fetchUrlMetadata).toHaveBeenCalledWith(
      'https://architecturaldigest.com/story/kyoto-homes'
    );

    await act(async () => {
      fireEvent.press(screen.getByText('Keep for later'));
    });

    expect(addItemSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Architectural Digest: Sustainable Japanese Homes',
        site_name: 'Architectural Digest',
        image_url: 'https://example.com/kyoto-home.jpg',
      })
    );
  });

  it('handles metadata scraping failure gracefully without interrupting user', async () => {
    (metadataScraper.fetchUrlMetadata as jest.Mock).mockRejectedValueOnce(
      new Error('Network request failed')
    );

    screen = await render(<AddModal />);

    const urlInput = screen.getByPlaceholderText('https://...');
    await act(async () => {
      fireEvent.changeText(urlInput, 'https://example.com/offline-page');
    });

    await act(async () => {
      jest.advanceTimersByTime(600);
    });

    // Still allows saving cleanly
    await act(async () => {
      fireEvent.press(screen.getByText('Keep for later'));
    });

    expect(addItemSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        url: 'https://example.com/offline-page',
      })
    );
  });

  it('shows Alert and prevents duplicate entry if URL already exists as pending', async () => {
    (itemsRepo.findByNormalizedUrl as jest.Mock).mockResolvedValueOnce({
      id: 'existing-id-123',
      title: 'Already saved article',
      url: 'https://example.com/duplicate',
    });

    screen = await render(<AddModal />);

    const urlInput = screen.getByPlaceholderText('https://...');
    await act(async () => {
      fireEvent.changeText(urlInput, 'https://example.com/duplicate');
    });

    await act(async () => {
      fireEvent.press(screen.getByText('Keep for later'));
    });

    expect(alertSpy).toHaveBeenCalledWith(
      'Already in your list',
      'This link is already saved in your list.'
    );
    expect(addItemSpy).not.toHaveBeenCalled();
    expect(mockBack).not.toHaveBeenCalled();
  });

  it('allows adding custom tags and verifies suggested tags are removed', async () => {
    screen = await render(<AddModal />);

    const titleInput = screen.getByPlaceholderText('e.g. Read article on creative focus');
    await act(async () => {
      fireEvent.changeText(titleInput, 'Design system thinking');
    });

    // Suggested tags should no longer be present
    expect(screen.queryByText('+focus')).toBeNull();

    const tagInput = screen.getByPlaceholderText('Add tag (e.g. reading, focus)...');
    await act(async () => {
      fireEvent.changeText(tagInput, 'focus');
    });

    const addTagBtn = screen.getByText('Add');
    await act(async () => {
      fireEvent.press(addTagBtn);
    });

    expect(screen.getByText('#focus')).toBeTruthy();

    await act(async () => {
      fireEvent.press(screen.getByText('Keep for later'));
    });

    expect(addItemSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        tags: ['focus'],
      })
    );
  });

  it('allows adding custom tag via tag text input', async () => {
    screen = await render(<AddModal />);

    const titleInput = screen.getByPlaceholderText('e.g. Read article on creative focus');
    await act(async () => {
      fireEvent.changeText(titleInput, 'React Native architecture');
    });

    const tagInput = screen.getByPlaceholderText('Add tag (e.g. reading, focus)...');
    await act(async () => {
      fireEvent.changeText(tagInput, 'engineering');
    });

    const addTagBtn = screen.getByText('Add');
    await act(async () => {
      fireEvent.press(addTagBtn);
    });

    expect(screen.getByText('#engineering')).toBeTruthy();

    await act(async () => {
      fireEvent.press(screen.getByText('Keep for later'));
    });

    expect(addItemSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        tags: ['engineering'],
      })
    );
  });

  it('allows assigning item to an existing collection', async () => {
    screen = await render(<AddModal />);

    const titleInput = screen.getByPlaceholderText('e.g. Read article on creative focus');
    await act(async () => {
      fireEvent.changeText(titleInput, 'Best pasta dough recipe');
    });

    const recipesColPill = screen.getByText('Recipes');
    await act(async () => {
      fireEvent.press(recipesColPill);
    });

    await act(async () => {
      fireEvent.press(screen.getByText('Keep for later'));
    });

    expect(addItemSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        collection_id: 'col-2',
      })
    );
  });

  it('blocks saving if a database migration error is active', async () => {
    (databaseModule.getStartupMigrationError as jest.Mock).mockReturnValueOnce(
      'Database migration failed'
    );

    screen = await render(<AddModal />);

    const titleInput = screen.getByPlaceholderText('e.g. Read article on creative focus');
    await act(async () => {
      fireEvent.changeText(titleInput, 'Should not save');
    });

    await act(async () => {
      fireEvent.press(screen.getByText('Keep for later'));
    });

    expect(alertSpy).toHaveBeenCalledWith(
      'Database update in progress',
      expect.any(String)
    );
    expect(addItemSpy).not.toHaveBeenCalled();
  });
});
