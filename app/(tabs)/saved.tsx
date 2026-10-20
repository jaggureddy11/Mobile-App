import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  TouchableOpacity,
  Modal,
  TextInput,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import {
  Bookmark,
  Folder,
  Plus,
  ChevronRight,
  ArrowLeft,
  Trash2,
  X,
  Check,
} from 'lucide-react-native';
import { PageHeader, ListItem } from '@/components';
import { colors, typography, spacing, radii, shadows } from '@/theme';
import { useItemsStore } from '@/domain/useItemsStore';
import { useCollectionsStore } from '@/domain/useCollectionsStore';
import { ItemType, Collection } from '@/domain/types';

type CategoryFilter = 'all' | ItemType | 'done';
type SavedViewMode = 'items' | 'collections';

const FILTER_CHIPS: { label: string; value: CategoryFilter }[] = [
  { label: 'All', value: 'all' },
  { label: 'Articles & Links', value: 'link' },
  { label: 'Reels', value: 'reel' },
  { label: 'Tasks', value: 'task' },
  { label: 'Activities', value: 'activity' },
  { label: 'Thoughts', value: 'text' },
  { label: 'Completed', value: 'done' },
];

export default function SavedScreen() {
  const router = useRouter();
  const { items } = useItemsStore();
  const {
    collections,
    loadCollections,
    createCollection,
    deleteCollection,
  } = useCollectionsStore();

  const [viewMode, setViewMode] = useState<SavedViewMode>('items');
  const [activeFilter, setActiveFilter] = useState<CategoryFilter>('all');
  const [selectedCollection, setSelectedCollection] = useState<Collection | null>(null);

  // New Collection Modal State
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [newCollectionName, setNewCollectionName] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    loadCollections();
  }, []);

  const handleCreateCollection = async () => {
    if (!newCollectionName.trim()) return;
    setIsCreating(true);
    try {
      await createCollection(newCollectionName.trim());
      setNewCollectionName('');
      setIsModalVisible(false);
      await loadCollections();
    } catch (err) {
      console.error('Failed to create collection:', err);
    } finally {
      setIsCreating(false);
    }
  };

  const handleDeleteCollection = (collection: Collection) => {
    Alert.alert(
      'Delete Collection',
      `Are you sure you want to delete "${collection.name}"? Items inside will not be deleted.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            await deleteCollection(collection.id);
            if (selectedCollection?.id === collection.id) {
              setSelectedCollection(null);
            }
            await loadCollections();
          },
        },
      ]
    );
  };

  // Map collection names for display
  const collectionNameMap = new Map<string, string>();
  collections.forEach((c) => collectionNameMap.set(c.id, c.name));

  // Filter items
  const filteredItems = items.filter((item) => {
    // If inside a collection detail view
    if (selectedCollection) {
      if (item.collection_id !== selectedCollection.id) return false;
      return item.status !== 'let_go';
    }

    if (activeFilter === 'done') {
      return item.status === 'done';
    }
    if (item.status !== 'pending') {
      return false;
    }
    if (activeFilter === 'all') {
      return true;
    }
    return item.type === activeFilter;
  });

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <PageHeader
          title={selectedCollection ? selectedCollection.name : 'Your Collection'}
          categoryTag={selectedCollection ? 'COLLECTION' : 'MAYBE LATER'}
        />

        {/* Top View Mode Switcher (Items vs Collections) */}
        {!selectedCollection ? (
          <View style={styles.tabSwitcher}>
            <TouchableOpacity
              style={[
                styles.tabButton,
                viewMode === 'items' && styles.tabButtonActive,
              ]}
              onPress={() => setViewMode('items')}
              activeOpacity={0.8}
            >
              <Text
                style={[
                  styles.tabButtonText,
                  viewMode === 'items' && styles.tabButtonTextActive,
                ]}
              >
                All Items
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.tabButton,
                viewMode === 'collections' && styles.tabButtonActive,
              ]}
              onPress={() => setViewMode('collections')}
              activeOpacity={0.8}
            >
              <Text
                style={[
                  styles.tabButtonText,
                  viewMode === 'collections' && styles.tabButtonTextActive,
                ]}
              >
                Collections ({collections.length})
              </Text>
            </TouchableOpacity>
          </View>
        ) : (
          /* Back to collections button */
          <View style={styles.backButtonContainer}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => setSelectedCollection(null)}
              activeOpacity={0.7}
            >
              <ArrowLeft size={16} color={colors.textPrimary} />
              <Text style={styles.backButtonText}>All Collections</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.deleteCollectionButton}
              onPress={() => handleDeleteCollection(selectedCollection)}
              activeOpacity={0.7}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Trash2 size={16} color={colors.accent} />
            </TouchableOpacity>
          </View>
        )}

        {/* View Mode: ITEMS */}
        {viewMode === 'items' && !selectedCollection && (
          <>
            {/* Filter Chips Horizontal Scroll */}
            <View style={styles.filtersWrapper}>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.filtersContainer}
              >
                {FILTER_CHIPS.map((chip) => {
                  const isSelected = activeFilter === chip.value;
                  return (
                    <TouchableOpacity
                      key={chip.value}
                      style={[
                        styles.filterChip,
                        isSelected ? styles.filterChipActive : styles.filterChipInactive,
                      ]}
                      onPress={() => setActiveFilter(chip.value)}
                      activeOpacity={0.8}
                    >
                      <Text
                        style={[
                          styles.filterChipText,
                          isSelected ? styles.filterChipTextActive : styles.filterChipTextInactive,
                        ]}
                      >
                        {chip.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>

            {/* List of items */}
            <ScrollView
              style={styles.scrollView}
              contentContainerStyle={styles.contentContainer}
              showsVerticalScrollIndicator={false}
            >
              <View style={styles.sectionHeader}>
                <Text style={styles.itemCountText}>
                  {filteredItems.length} {filteredItems.length === 1 ? 'ITEM' : 'ITEMS'}
                </Text>
              </View>

              {filteredItems.length > 0 ? (
                <View style={styles.itemsList}>
                  {filteredItems.map((item) => (
                    <ListItem
                      key={item.id}
                      type={item.type}
                      title={item.title}
                      meta={`${item.type.charAt(0).toUpperCase() + item.type.slice(1)} • ${item.minutes} min`}
                      tags={item.tags}
                      collectionName={item.collection_id ? collectionNameMap.get(item.collection_id) : undefined}
                      isDimmed={item.status === 'done'}
                      onPress={() => router.push(`/item/${item.id}`)}
                    />
                  ))}
                </View>
              ) : (
                <View style={styles.emptyContainer}>
                  <View style={styles.emptyIconBox}>
                    <Bookmark size={28} color={colors.accent} />
                  </View>
                  <Text style={styles.emptyTitle}>No items here</Text>
                  <Text style={styles.emptySubtitle}>
                    {activeFilter === 'done'
                      ? 'Completed items will show up here.'
                      : 'Items you save will appear in your quiet collection.'}
                  </Text>
                </View>
              )}
            </ScrollView>
          </>
        )}

        {/* View Mode: COLLECTIONS GRID/LIST */}
        {viewMode === 'collections' && !selectedCollection && (
          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.contentContainer}
            showsVerticalScrollIndicator={false}
          >
            {/* Action Bar */}
            <View style={styles.collectionsActionBar}>
              <Text style={styles.itemCountText}>
                {collections.length} {collections.length === 1 ? 'COLLECTION' : 'COLLECTIONS'}
              </Text>
              <TouchableOpacity
                style={styles.addCollectionBtn}
                onPress={() => setIsModalVisible(true)}
                activeOpacity={0.8}
              >
                <Plus size={16} color={colors.background} />
                <Text style={styles.addCollectionBtnText}>New Collection</Text>
              </TouchableOpacity>
            </View>

            {/* Collection Cards */}
            <View style={styles.collectionsList}>
              {collections.map((col) => {
                const count = items.filter(
                  (i) => i.collection_id === col.id && i.status !== 'let_go'
                ).length;

                return (
                  <TouchableOpacity
                    key={col.id}
                    style={styles.collectionCard}
                    onPress={() => setSelectedCollection(col)}
                    activeOpacity={0.75}
                  >
                    <View style={styles.collectionCardLeft}>
                      <View style={styles.folderIconBox}>
                        <Folder size={22} color={colors.accent} />
                      </View>
                      <View style={styles.collectionInfo}>
                        <Text style={styles.collectionCardTitle} numberOfLines={1}>
                          {col.name}
                        </Text>
                        <Text style={styles.collectionCardMeta}>
                          {count} {count === 1 ? 'saved item' : 'saved items'}
                        </Text>
                      </View>
                    </View>
                    <ChevronRight size={18} color={colors.accent} />
                  </TouchableOpacity>
                );
              })}
            </View>
          </ScrollView>
        )}

        {/* View Mode: SINGLE COLLECTION DETAIL */}
        {selectedCollection && (
          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.contentContainer}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.sectionHeader}>
              <Text style={styles.itemCountText}>
                {filteredItems.length} {filteredItems.length === 1 ? 'ITEM' : 'ITEMS'}
              </Text>
            </View>

            {filteredItems.length > 0 ? (
              <View style={styles.itemsList}>
                {filteredItems.map((item) => (
                  <ListItem
                    key={item.id}
                    type={item.type}
                    title={item.title}
                    meta={`${item.type.charAt(0).toUpperCase() + item.type.slice(1)} • ${item.minutes} min`}
                    tags={item.tags}
                    isDimmed={item.status === 'done'}
                    onPress={() => router.push(`/item/${item.id}`)}
                  />
                ))}
              </View>
            ) : (
              <View style={styles.emptyContainer}>
                <View style={styles.emptyIconBox}>
                  <Folder size={28} color={colors.accent} />
                </View>
                <Text style={styles.emptyTitle}>Empty Collection</Text>
                <Text style={styles.emptySubtitle}>
                  Save items and assign them to "{selectedCollection.name}" to view them here.
                </Text>
              </View>
            )}
          </ScrollView>
        )}

        {/* Create Collection Modal */}
        <Modal
          visible={isModalVisible}
          transparent
          animationType="fade"
          onRequestClose={() => setIsModalVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>New Collection</Text>
                <TouchableOpacity
                  onPress={() => setIsModalVisible(false)}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <X size={20} color={colors.textSecondary} />
                </TouchableOpacity>
              </View>

              <Text style={styles.modalSubtitle}>
                Create a space for topics, projects, or thoughts you love.
              </Text>

              <TextInput
                style={styles.modalInput}
                placeholder="e.g. Architecture, Mindful Reads, Books"
                placeholderTextColor="rgba(138, 126, 114, 0.4)"
                value={newCollectionName}
                onChangeText={setNewCollectionName}
                autoFocus
                returnKeyType="done"
                onSubmitEditing={handleCreateCollection}
              />

              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={styles.modalCancelBtn}
                  onPress={() => setIsModalVisible(false)}
                  activeOpacity={0.8}
                >
                  <Text style={styles.modalCancelText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.modalSaveBtn,
                    (!newCollectionName.trim() || isCreating) && styles.modalSaveBtnDisabled,
                  ]}
                  onPress={handleCreateCollection}
                  disabled={!newCollectionName.trim() || isCreating}
                  activeOpacity={0.85}
                >
                  <Check size={16} color={colors.background} />
                  <Text style={styles.modalSaveText}>
                    {isCreating ? 'Creating...' : 'Create'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  container: {
    flex: 1,
  },
  // Tab Switcher
  tabSwitcher: {
    flexDirection: 'row',
    backgroundColor: 'rgba(212, 196, 176, 0.25)',
    borderRadius: radii.pill,
    marginHorizontal: spacing.xxl,
    marginBottom: spacing.lg,
    padding: 3,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabButtonActive: {
    backgroundColor: colors.card,
    ...shadows.soft,
  },
  tabButtonText: {
    ...typography.presets.caption,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  tabButtonTextActive: {
    color: colors.textPrimary,
  },
  // Back button container
  backButtonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.xxl,
    marginBottom: spacing.md,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
  },
  backButtonText: {
    ...typography.presets.caption,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  deleteCollectionButton: {
    padding: 6,
  },
  // Filters
  filtersWrapper: {
    marginBottom: spacing.lg,
  },
  filtersContainer: {
    paddingHorizontal: spacing.xxl,
    gap: spacing.sm,
  },
  filterChip: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm + 2,
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterChipActive: {
    backgroundColor: colors.textPrimary,
    ...shadows.soft,
  },
  filterChipInactive: {
    backgroundColor: 'rgba(212, 196, 176, 0.2)',
  },
  filterChipText: {
    ...typography.presets.caption,
    fontWeight: '600',
  },
  filterChipTextActive: {
    color: colors.background,
  },
  filterChipTextInactive: {
    color: colors.textSecondary,
  },
  // Scroll
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: spacing.xxl,
    paddingBottom: 130,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginBottom: spacing.md,
  },
  itemCountText: {
    ...typography.presets.tag,
    color: colors.accent,
    letterSpacing: 1.5,
  },
  itemsList: {
    gap: spacing.md,
  },
  // Collections Section
  collectionsActionBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  addCollectionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.textPrimary,
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
    borderRadius: radii.pill,
    ...shadows.soft,
  },
  addCollectionBtnText: {
    ...typography.presets.caption,
    fontWeight: '600',
    color: colors.background,
  },
  collectionsList: {
    gap: spacing.md,
  },
  collectionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.card,
    padding: spacing.lg,
    borderRadius: radii.card,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    ...shadows.card,
  },
  collectionCardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  folderIconBox: {
    width: 48,
    height: 48,
    borderRadius: radii.md,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  collectionInfo: {
    flex: 1,
  },
  collectionCardTitle: {
    ...typography.presets.bodyMedium,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 2,
  },
  collectionCardMeta: {
    ...typography.presets.caption,
    color: colors.textSecondary,
  },
  // Empty states
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xxxl * 2,
  },
  emptyIconBox: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: colors.card,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(212, 196, 176, 0.3)',
  },
  emptyTitle: {
    ...typography.presets.title2,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  emptySubtitle: {
    ...typography.presets.caption,
    color: colors.textSecondary,
    textAlign: 'center',
    maxWidth: 240,
    lineHeight: 20,
  },
  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    justifyContent: 'center',
    padding: spacing.xxl,
  },
  modalContent: {
    backgroundColor: colors.card,
    borderRadius: radii.xl,
    padding: spacing.xxl,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    ...shadows.card,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  modalTitle: {
    ...typography.presets.title2,
    color: colors.textPrimary,
  },
  modalSubtitle: {
    ...typography.presets.caption,
    color: colors.textSecondary,
    marginBottom: spacing.lg,
  },
  modalInput: {
    height: 52,
    backgroundColor: colors.background,
    borderRadius: radii.lg,
    paddingHorizontal: spacing.lg,
    borderWidth: 1.5,
    borderColor: 'rgba(212, 196, 176, 0.4)',
    color: colors.textPrimary,
    ...typography.presets.body,
    marginBottom: spacing.xl,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing.md,
  },
  modalCancelBtn: {
    paddingHorizontal: spacing.lg,
    paddingVertical: 12,
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCancelText: {
    ...typography.presets.caption,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  modalSaveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.textPrimary,
    paddingHorizontal: spacing.xl,
    paddingVertical: 12,
    borderRadius: radii.pill,
  },
  modalSaveBtnDisabled: {
    opacity: 0.4,
  },
  modalSaveText: {
    ...typography.presets.caption,
    fontWeight: '600',
    color: colors.background,
  },
});
