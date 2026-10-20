import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  TouchableOpacity,
  Linking,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Compass, Award } from 'lucide-react-native';
import {
  PageHeader,
  TimeChip,
  TimeChipValue,
  ActivityCard,
  ListItem,
  UndoSnackbar,
} from '@/components';
import { colors, typography, spacing, radii, shadows } from '@/theme';
import { useItemsStore } from '@/domain/useItemsStore';
import { useSettingsStore } from '@/domain/useSettingsStore';
import { useListenShareIntent } from '@/platform/useListenShareIntent';

export default function TodayScreen() {
  const router = useRouter();

  // Listen for native system share intents
  useListenShareIntent();

  const {
    items,
    activeItem,
    selectedMinutes,
    isLoading,
    undoItem,
    loadItems,
    setSelectedMinutes,
    doItem,
    laterItem,
    letGoItem,
    undoLetGo,
    nextResurfacedItem,
  } = useItemsStore();

  const { settings, loadSettings } = useSettingsStore();

  // State for celebration modal
  const [celebrationItemTitle, setCelebrationItemTitle] = useState<string | null>(null);

  // Initial load
  useEffect(() => {
    loadSettings();
    loadItems();
  }, [loadSettings, loadItems]);

  // "Waiting for you" pending items excluding the active one
  const pendingItems = items.filter(
    (item) => item.status === 'pending' && item.id !== activeItem?.id
  );
  const queuePreview = pendingItems.slice(0, 3);

  const handleDoIt = async () => {
    if (!activeItem) return;

    // If item has a URL, open it in browser / app
    if (activeItem.url) {
      Linking.openURL(activeItem.url).catch((err) =>
        console.warn('Could not open URL:', err)
      );
    }

    const title = activeItem.title;
    await doItem(activeItem.id);
    setCelebrationItemTitle(title);
  };

  const handleLater = async () => {
    if (!activeItem) return;
    await laterItem(activeItem.id);
  };

  const handleLetItGo = async () => {
    if (!activeItem) return;
    await letGoItem(activeItem.id);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <PageHeader />

        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.accent} />
          </View>
        ) : (
          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.contentContainer}
            showsVerticalScrollIndicator={false}
          >
            {/* Time Filter Chips */}
            <View style={styles.chipsSection}>
              <View style={styles.chipsRow}>
                <TimeChip
                  minutes={5}
                  isSelected={selectedMinutes === 5}
                  onSelect={(m) => setSelectedMinutes(m as TimeChipValue)}
                />
                <TimeChip
                  minutes={15}
                  isSelected={selectedMinutes === 15}
                  onSelect={(m) => setSelectedMinutes(m as TimeChipValue)}
                />
                <TimeChip
                  minutes={30}
                  isSelected={selectedMinutes === 30}
                  onSelect={(m) => setSelectedMinutes(m as TimeChipValue)}
                />
              </View>
            </View>

            {/* Resurfaced Card or Peaceful Empty State */}
            <View style={styles.cardSection}>
              {activeItem ? (
                <ActivityCard
                  type={activeItem.type}
                  title={activeItem.title}
                  note={activeItem.note || 'You wanted to do this once.'}
                  imageUrl={activeItem.image_url}
                  siteName={activeItem.site_name}
                  tags={activeItem.tags}
                  onDoIt={handleDoIt}
                  onLater={handleLater}
                  onLetItGo={handleLetItGo}
                  onShowAnother={
                    pendingItems.length > 0 ? nextResurfacedItem : undefined
                  }
                />
              ) : (
                <View style={styles.emptyStateCard}>
                  <View style={styles.emptyIconCircle}>
                    <Compass size={32} color={colors.accent} />
                  </View>
                  <Text style={styles.emptyTitle}>All clear for now</Text>
                  <Text style={styles.emptySubtitle}>
                    Nothing saved for this duration. Enjoy your peace, or tap '+' below to save something for later.
                  </Text>
                </View>
              )}
            </View>

            {/* Waiting for you queue section */}
            {queuePreview.length > 0 ? (
              <View style={styles.listSection}>
                <View style={styles.listSectionHeader}>
                  <Text style={styles.sectionTitle}>Waitin' for you</Text>
                  <TouchableOpacity
                    onPress={() => router.push('/(tabs)/saved')}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.seeAllText}>See all</Text>
                  </TouchableOpacity>
                </View>

                <View style={styles.itemsList}>
                  {queuePreview.map((item, idx) => (
                    <ListItem
                      key={item.id}
                      type={item.type}
                      title={item.title}
                      meta={`${item.type.charAt(0).toUpperCase() + item.type.slice(1)} • ${item.minutes} min`}
                      tags={item.tags}
                      imageUrl={item.image_url}
                      siteName={item.site_name}
                      isDimmed={idx > 0}
                      onPress={() => router.push(`/item/${item.id}`)}
                    />
                  ))}
                </View>
              </View>
            ) : null}
          </ScrollView>
        )}

        {/* 5-second Undo Snackbar */}
        <UndoSnackbar
          visible={!!undoItem}
          itemTitle={undoItem?.title || ''}
          onUndo={undoLetGo}
        />

        {/* Celebration Modal after completing an item */}
        <Modal
          visible={!!celebrationItemTitle}
          transparent
          animationType="fade"
          onRequestClose={() => setCelebrationItemTitle(null)}
        >
          <View style={styles.celebrationBackdrop}>
            <View style={styles.celebrationCard}>
              <View style={styles.celebrationIconBox}>
                <Award size={36} color={colors.accent} />
              </View>
              <Text style={styles.celebrationTitle}>Proud of you.</Text>
              <Text style={styles.celebrationSubtitle}>
                You took a real breath today and finished:
              </Text>
              <Text style={styles.celebrationItemName} numberOfLines={2}>
                "{celebrationItemTitle}"
              </Text>

              <TouchableOpacity
                style={styles.celebrationDoneButton}
                onPress={() => setCelebrationItemTitle(null)}
                activeOpacity={0.85}
              >
                <Text style={styles.celebrationDoneText}>Continue</Text>
              </TouchableOpacity>
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
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    paddingBottom: 130,
  },
  chipsSection: {
    paddingHorizontal: spacing.xxl,
    marginBottom: spacing.xxl,
  },
  chipsRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  cardSection: {
    paddingHorizontal: spacing.xxl,
    marginBottom: spacing.xxxl,
  },
  emptyStateCard: {
    backgroundColor: colors.card,
    borderRadius: radii.cardLarge,
    padding: spacing.xxxl,
    alignItems: 'center',
    textAlign: 'center',
    borderWidth: 1,
    borderColor: 'rgba(212, 196, 176, 0.25)',
    ...shadows.card,
  },
  emptyIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  emptyTitle: {
    ...typography.presets.title1,
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  emptySubtitle: {
    ...typography.presets.body,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
  listSection: {
    paddingHorizontal: spacing.xxl,
  },
  listSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    ...typography.presets.title2,
    color: colors.textPrimary,
  },
  seeAllText: {
    ...typography.presets.caption,
    fontWeight: '700',
    color: colors.accent,
  },
  itemsList: {
    gap: spacing.md,
  },
  celebrationBackdrop: {
    flex: 1,
    backgroundColor: colors.overlay,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xxl,
  },
  celebrationCard: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: colors.card,
    borderRadius: radii.cardLarge,
    padding: spacing.xxxl,
    alignItems: 'center',
    textAlign: 'center',
    ...shadows.card,
  },
  celebrationIconBox: {
    width: 72,
    height: 72,
    borderRadius: radii.xl,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: 'rgba(212, 196, 176, 0.3)',
  },
  celebrationTitle: {
    ...typography.presets.hero,
    fontSize: 26,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  celebrationSubtitle: {
    ...typography.presets.body,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.xs,
  },
  celebrationItemName: {
    ...typography.presets.bodyLarge,
    fontWeight: '600',
    color: colors.textPrimary,
    textAlign: 'center',
    marginBottom: spacing.xxl,
    fontStyle: 'italic',
  },
  celebrationDoneButton: {
    width: '100%',
    height: 52,
    borderRadius: radii.xl,
    backgroundColor: colors.textPrimary,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.soft,
  },
  celebrationDoneText: {
    ...typography.presets.button,
    color: colors.background,
  },
});
