import React, { useEffect, useState, useRef } from 'react';
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
  AppState,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Compass, Award, Clock, Calendar, CheckCircle2, HelpCircle, Plus, Sparkles } from 'lucide-react-native';
import {
  PageHeader,
  TimeChip,
  TimeChipValue,
  ActivityCard,
  ListItem,
  UndoSnackbar,
  DatabaseUpdateNotice,
} from '@/components';
import { colors, typography, spacing, radii, shadows } from '@/theme';
import { useItemsStore } from '@/domain/useItemsStore';
import { useSettingsStore } from '@/domain/useSettingsStore';
import { useListenShareIntent } from '@/platform/useListenShareIntent';
import { isItemEligible, getItemMinutes, areAllPendingItemsYoungerThanHidePeriod } from '@/domain/eligibility';
import { SnoozeOption } from '@/domain/types';
import { perfTracker } from '@/utils/perfTracker';
import { getStartupMigrationError, setStartupMigrationError } from '@/db/database';

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
    snoozeItem,
    letGoItem,
    undoLetGo,
    nextResurfacedItem,
  } = useItemsStore();

  const { loadSettings } = useSettingsStore();

  // State for celebration modal
  const [celebrationItemTitle, setCelebrationItemTitle] = useState<string | null>(null);

  // State for "Do it" confirm modal on return
  const [pendingConfirmItemId, setPendingConfirmItemId] = useState<string | null>(null);
  const [showConfirmModal, setShowConfirmModal] = useState<boolean>(false);
  const appState = useRef(AppState.currentState);

  // State for "Later" snooze modal
  const [showSnoozeModal, setShowSnoozeModal] = useState<boolean>(false);
  const [migrationError, setMigrationError] = useState<string | null>(getStartupMigrationError());

  // Initial load
  useEffect(() => {
    perfTracker.mark('cold_start_begin');
    loadSettings();
    loadItems().then(() => {
      perfTracker.measure('cold_start_to_today', 'cold_start_begin');
      setMigrationError(getStartupMigrationError());
    });
  }, [loadSettings, loadItems]);

  // Called by DatabaseUpdateNotice AFTER it has already run retryDatabaseInitialization.
  // Only reloads screen data — does not re-run migrations.
  const handleRetryMigration = async () => {
    setMigrationError(null);
    await loadSettings().catch(() => {});
    await loadItems().catch(() => {});
  };

  // AppState listener for "Do it" confirmation
  // Show ONLY on transition from 'background' to 'active' (not from 'inactive'), and only when pendingConfirmItemId is set
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState) => {
      if (
        appState.current === 'background' &&
        nextAppState === 'active' &&
        pendingConfirmItemId
      ) {
        setShowConfirmModal(true);
      }
      appState.current = nextAppState;
    });

    return () => {
      subscription.remove();
    };
  }, [pendingConfirmItemId]);

  // "Waiting for you" pending items excluding the active one
  const pendingItems = items.filter(
    (item) => item.status === 'pending' && item.id !== activeItem?.id
  );
  const queuePreview = pendingItems.slice(0, 3);

  // Total saved items across the entire app
  const totalSavedCount = items.length;

  // Eligible items right now
  const now = new Date();
  const eligibleItems = items.filter((item) => isItemEligible(item, now));

  // Determine suggested minutes if activeItem is null but eligible items exist
  let suggestedMinutes: TimeChipValue = 15;
  if (!activeItem && eligibleItems.length > 0) {
    if (selectedMinutes === 5) {
      suggestedMinutes = eligibleItems.some((i) => getItemMinutes(i) <= 15) ? 15 : 30;
    } else if (selectedMinutes === 15) {
      suggestedMinutes = eligibleItems.some((i) => getItemMinutes(i) <= 30) ? 30 : 5;
    } else {
      suggestedMinutes = eligibleItems.some((i) => getItemMinutes(i) <= 5) ? 5 : 15;
    }
  }

  const handleDoIt = async () => {
    if (!activeItem) return;

    // If item has a URL, open it in external browser/app and prompt on return
    if (activeItem.url) {
      setPendingConfirmItemId(activeItem.id);
      Linking.openURL(activeItem.url).catch((err) => {
        console.warn('Could not open URL:', err);
        setPendingConfirmItemId(null);
      });
    } else {
      // Non-URL items (tasks, activities, text) can complete immediately
      const title = activeItem.title;
      await doItem(activeItem.id);
      setCelebrationItemTitle(title);
    }
  };

  const handleConfirmDone = async () => {
    if (!pendingConfirmItemId) return;
    const item = items.find((i) => i.id === pendingConfirmItemId);
    const title = item?.title || '';
    setShowConfirmModal(false);
    setPendingConfirmItemId(null);
    await doItem(pendingConfirmItemId);
    if (title) {
      setCelebrationItemTitle(title);
    }
  };

  const handleConfirmNotYet = () => {
    setShowConfirmModal(false);
    setPendingConfirmItemId(null);
  };

  const handleLater = () => {
    if (!activeItem) return;
    setShowSnoozeModal(true);
  };

  const handleSelectSnooze = async (option: SnoozeOption) => {
    if (!activeItem) return;
    setShowSnoozeModal(false);
    await snoozeItem(activeItem.id, option);
  };

  const handleLetItGo = async () => {
    if (!activeItem) return;
    await letGoItem(activeItem.id);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <PageHeader />

        {migrationError ? (
          <DatabaseUpdateNotice onRetrySuccess={handleRetryMigration} />
        ) : isLoading ? (
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

            {/* Resurfaced Card or 3 Distinct Empty States */}
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
              ) : totalSavedCount === 0 ? (
                /* Empty State 1: Nothing saved yet */
                <View style={styles.emptyStateCard}>
                  <View style={styles.emptyIconCircle}>
                    <Compass size={32} color={colors.accent} />
                  </View>
                  <Text style={styles.emptyTitle}>Nothing saved yet</Text>
                  <Text style={styles.emptySubtitle}>
                    Share links from Instagram, YouTube, or your browser to build your calm list.
                  </Text>
                  <TouchableOpacity
                    style={styles.emptyActionButton}
                    onPress={() => router.push('/add')}
                    activeOpacity={0.85}
                  >
                    <Plus size={18} color={colors.background} style={{ marginRight: 6 }} />
                    <Text style={styles.emptyActionText}>Save an item</Text>
                  </TouchableOpacity>
                </View>
              ) : areAllPendingItemsYoungerThanHidePeriod(items, now) ? (
                /* Empty State 4: First-day experience */
                <View style={styles.emptyStateCard}>
                  <View style={styles.emptyIconCircle}>
                    <Sparkles size={32} color={colors.accent} />
                  </View>
                  <Text style={styles.emptyTitle}>Your first item will be ready tomorrow</Text>
                  <Text style={styles.emptySubtitle}>
                    Saved items rest for a day, then come back when you have a minute.
                  </Text>
                </View>
              ) : eligibleItems.length === 0 ? (
                /* Empty State 3: All caught up */
                <View style={styles.emptyStateCard}>
                  <View style={styles.emptyIconCircle}>
                    <Sparkles size={32} color={colors.accent} />
                  </View>
                  <Text style={styles.emptyTitle}>All caught up for now</Text>
                  <Text style={styles.emptySubtitle}>
                    Take a breath. Your items are resting and will resurface tomorrow or at your preferred nudge time.
                  </Text>
                </View>
              ) : (
                /* Empty State 2: Nothing fits this chip right now */
                <View style={styles.emptyStateCard}>
                  <View style={styles.emptyIconCircle}>
                    <Clock size={32} color={colors.accent} />
                  </View>
                  <Text style={styles.emptyTitle}>
                    Nothing fits {selectedMinutes} minutes right now. Try {suggestedMinutes}?
                  </Text>
                  <Text style={styles.emptySubtitle}>
                    You have items waiting that fit longer or shorter moments.
                  </Text>
                  <TouchableOpacity
                    style={styles.emptyActionButton}
                    onPress={() => setSelectedMinutes(suggestedMinutes)}
                    activeOpacity={0.85}
                  >
                    <Text style={styles.emptyActionText}>Switch to {suggestedMinutes} min</Text>
                  </TouchableOpacity>
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

        {/* "Do it" confirmation modal on AppState return */}
        <Modal
          visible={showConfirmModal}
          transparent
          animationType="fade"
          onRequestClose={handleConfirmNotYet}
        >
          <View style={styles.modalBackdrop}>
            <View style={styles.modalCard}>
              <View style={styles.modalIconBox}>
                <HelpCircle size={32} color={colors.accent} />
              </View>
              <Text style={styles.modalTitle}>Done with it?</Text>
              <Text style={styles.modalSubtitle}>
                Did you finish enjoying this item, or should we keep it waiting in your list?
              </Text>

              <View style={styles.modalButtonsRow}>
                <TouchableOpacity
                  style={[styles.modalButton, styles.modalButtonSecondary]}
                  onPress={handleConfirmNotYet}
                  activeOpacity={0.85}
                >
                  <Text style={styles.modalButtonSecondaryText}>Keep waiting</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.modalButton, styles.modalButtonPrimary]}
                  onPress={handleConfirmDone}
                  activeOpacity={0.85}
                >
                  <CheckCircle2 size={18} color={colors.background} style={{ marginRight: 6 }} />
                  <Text style={styles.modalButtonPrimaryText}>Yes, done!</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        {/* "Later" Snooze Options Modal */}
        <Modal
          visible={showSnoozeModal}
          transparent
          animationType="slide"
          onRequestClose={() => setShowSnoozeModal(false)}
        >
          <View style={styles.modalBackdrop}>
            <View style={styles.snoozeSheet}>
              <View style={styles.sheetHandle} />
              <Text style={styles.snoozeTitle}>Snooze for Later</Text>
              <Text style={styles.snoozeSubtitle}>
                When would you like this item to resurface?
              </Text>

              <TouchableOpacity
                style={styles.snoozeOption}
                onPress={() => handleSelectSnooze('tomorrow')}
                activeOpacity={0.7}
              >
                <View style={styles.snoozeIconBox}>
                  <Clock size={20} color={colors.accent} />
                </View>
                <View style={styles.snoozeTextBox}>
                  <Text style={styles.snoozeOptionTitle}>Tomorrow</Text>
                  <Text style={styles.snoozeOptionDesc}>Resurfaces tomorrow at your nudge time</Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.snoozeOption}
                onPress={() => handleSelectSnooze('weekend')}
                activeOpacity={0.7}
              >
                <View style={styles.snoozeIconBox}>
                  <Calendar size={20} color={colors.accent} />
                </View>
                <View style={styles.snoozeTextBox}>
                  <Text style={styles.snoozeOptionTitle}>This weekend</Text>
                  <Text style={styles.snoozeOptionDesc}>Saturday at 10:00 AM</Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.snoozeOption}
                onPress={() => handleSelectSnooze('next_week')}
                activeOpacity={0.7}
              >
                <View style={styles.snoozeIconBox}>
                  <Sparkles size={20} color={colors.accent} />
                </View>
                <View style={styles.snoozeTextBox}>
                  <Text style={styles.snoozeOptionTitle}>Next week</Text>
                  <Text style={styles.snoozeOptionDesc}>Monday at your nudge time</Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.snoozeCancelButton}
                onPress={() => setShowSnoozeModal(false)}
                activeOpacity={0.8}
              >
                <Text style={styles.snoozeCancelText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

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
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xxl,
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
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  emptySubtitle: {
    ...typography.presets.body,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: spacing.lg,
  },
  emptyActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.textPrimary,
    paddingHorizontal: spacing.xl,
    height: 46,
    borderRadius: radii.pill,
    ...shadows.soft,
  },
  emptyActionText: {
    ...typography.presets.button,
    color: colors.background,
    fontSize: 14,
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
  modalBackdrop: {
    flex: 1,
    backgroundColor: colors.overlay,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xxl,
  },
  modalCard: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: colors.card,
    borderRadius: radii.cardLarge,
    padding: spacing.xxxl,
    alignItems: 'center',
    textAlign: 'center',
    ...shadows.card,
  },
  modalIconBox: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  modalTitle: {
    ...typography.presets.title1,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  modalSubtitle: {
    ...typography.presets.body,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: spacing.xxl,
  },
  modalButtonsRow: {
    flexDirection: 'row',
    gap: spacing.md,
    width: '100%',
  },
  modalButton: {
    flex: 1,
    height: 48,
    borderRadius: radii.xl,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  modalButtonPrimary: {
    backgroundColor: colors.textPrimary,
    ...shadows.soft,
  },
  modalButtonPrimaryText: {
    ...typography.presets.button,
    color: colors.background,
    fontSize: 14,
  },
  modalButtonSecondary: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: 'rgba(212, 196, 176, 0.4)',
  },
  modalButtonSecondaryText: {
    ...typography.presets.button,
    color: colors.textPrimary,
    fontSize: 14,
  },
  snoozeSheet: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: colors.card,
    borderRadius: radii.cardLarge,
    padding: spacing.xxl,
    ...shadows.card,
  },
  sheetHandle: {
    width: 36,
    height: 4,
    backgroundColor: 'rgba(122, 114, 101, 0.3)',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: spacing.lg,
  },
  snoozeTitle: {
    ...typography.presets.title1,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  snoozeSubtitle: {
    ...typography.presets.body,
    color: colors.textSecondary,
    marginBottom: spacing.lg,
  },
  snoozeOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(212, 196, 176, 0.2)',
  },
  snoozeIconBox: {
    width: 44,
    height: 44,
    borderRadius: radii.lg,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  snoozeTextBox: {
    flex: 1,
  },
  snoozeOptionTitle: {
    ...typography.presets.bodyLarge,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  snoozeOptionDesc: {
    ...typography.presets.caption,
    color: colors.textSecondary,
    marginTop: 2,
  },
  snoozeCancelButton: {
    marginTop: spacing.lg,
    height: 46,
    borderRadius: radii.xl,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  snoozeCancelText: {
    ...typography.presets.button,
    color: colors.textSecondary,
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

