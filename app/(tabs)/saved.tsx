import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  TouchableOpacity,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Bookmark } from 'lucide-react-native';
import { PageHeader, ListItem } from '@/components';
import { colors, typography, spacing, radii, shadows } from '@/theme';
import { useItemsStore } from '@/domain/useItemsStore';
import { ItemType } from '@/domain/types';

type CategoryFilter = 'all' | ItemType | 'done';

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
  const [activeFilter, setActiveFilter] = useState<CategoryFilter>('all');

  // Filter items based on activeFilter
  const filteredItems = items.filter((item) => {
    if (activeFilter === 'done') {
      return item.status === 'done';
    }
    // For non-done filters, show pending items
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
        <PageHeader title="Your Collection" categoryTag="MAYBE LATER" />

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

        {/* List Content */}
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
});
