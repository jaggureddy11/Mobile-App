import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Image,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import {
  X,
  Link2,
  PlayCircle,
  FileText,
  CheckSquare,
  Compass,
  Folder,
  Plus,
  Bell,
  Tag as TagIcon,
  Check,
  Globe,
  Sparkles,
} from 'lucide-react-native';
import { colors, typography, spacing, radii, shadows } from '@/theme';
import { useItemsStore } from '@/domain/useItemsStore';
import { useCollectionsStore } from '@/domain/useCollectionsStore';
import { itemsRepo } from '@/db/itemsRepo';
import { ItemType, MinuteOption, RemindInterval, DEFAULT_ITEM_MINUTES } from '@/domain/types';
import { detectItemTypeFromUrl } from '@/platform/useListenShareIntent';
import { detectItemClassification } from '@/domain/classification';
import { fetchUrlMetadata, UrlMetadata } from '@/platform/metadataScraper';
import { FEATURES } from '@/config/features';
import { getStartupMigrationError } from '@/db/database';

const TYPE_OPTIONS: { type: ItemType; label: string; icon: React.ComponentType<{ size: number; color: string }> }[] = [
  { type: 'link', label: 'Link', icon: Link2 },
  { type: 'reel', label: 'Reel', icon: PlayCircle },
  { type: 'text', label: 'Text', icon: FileText },
  { type: 'task', label: 'Task', icon: CheckSquare },
  { type: 'activity', label: 'Activity', icon: Compass },
];

const DURATION_OPTIONS: MinuteOption[] = [1, 5, 15, 30];

const REMINDER_OPTIONS: { value: RemindInterval; label: string }[] = [
  { value: 'none', label: 'None' },
  { value: 'daily', label: 'Daily' },
  { value: '1_day', label: '1 Day' },
  { value: '2_days', label: '2 Days' },
  { value: '1_month', label: '1 Month' },
];

const SUGGESTED_TAGS = ['focus', 'reading', 'design', 'learn', 'weekend', 'calm'];

export default function AddModal() {
  const router = useRouter();
  const addItem = useItemsStore((state) => state.addItem);
  const { collections, loadCollections, createCollection } = useCollectionsStore();

  const [title, setTitle] = useState('');
  const [url, setUrl] = useState('');
  const [note, setNote] = useState('');
  const [selectedType, setSelectedType] = useState<ItemType>('link');
  const [selectedMinutes, setSelectedMinutes] = useState<MinuteOption>(5);
  const [selectedCollectionId, setSelectedCollectionId] = useState<string | null>(null);
  const [selectedReminder, setSelectedReminder] = useState<RemindInterval>('none');
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  
  // URL Metadata scraping state
  const [isScraping, setIsScraping] = useState(false);
  const [metadata, setMetadata] = useState<UrlMetadata | null>(null);
  const scrapeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Inline collection creation state
  const [isCreatingCollection, setIsCreatingCollection] = useState(false);
  const [newCollectionName, setNewCollectionName] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    loadCollections();
    return () => {
      if (scrapeTimeoutRef.current) clearTimeout(scrapeTimeoutRef.current);
    };
  }, []);

  const triggerMetadataScrape = (targetUrl: string) => {
    const trimmed = targetUrl.trim();
    if (!trimmed.startsWith('http://') && !trimmed.startsWith('https://')) {
      setMetadata(null);
      return;
    }

    if (scrapeTimeoutRef.current) {
      clearTimeout(scrapeTimeoutRef.current);
    }

    scrapeTimeoutRef.current = setTimeout(async () => {
      setIsScraping(true);
      try {
        const meta = await fetchUrlMetadata(trimmed);
        if (meta) {
          setMetadata(meta);
          // If title is still empty, automatically set it to the scraped title
          setTitle((prev) => (!prev.trim() && meta.title ? meta.title : prev));
          // If description exists and note is empty, provide a subtle suggestion or fill
          if (meta.description && !note.trim()) {
            setNote(meta.description.slice(0, 200));
          }
          // If estimated read time is present from article word count, auto-update duration chip
          if (meta.estimatedMinutes) {
            setSelectedMinutes(meta.estimatedMinutes);
          }
        }
      } catch {
        // Safe offline resilience
      } finally {
        setIsScraping(false);
      }
    }, 600);
  };

  // Auto-detect type & duration when URL changes and trigger scraping
  const handleUrlChange = (text: string) => {
    setUrl(text);
    if (text.trim().startsWith('http')) {
      const classification = detectItemClassification(text.trim());
      setSelectedType(classification.type);
      setSelectedMinutes(classification.suggestedMinutes);
      triggerMetadataScrape(text);
    } else {
      setMetadata(null);
    }
  };

  const handleTypeSelect = (type: ItemType) => {
    setSelectedType(type);
    setSelectedMinutes(DEFAULT_ITEM_MINUTES[type]);
  };

  const handleAddTag = (tagToAdd?: string) => {
    const raw = (tagToAdd || tagInput).trim().replace(/^#/, '');
    if (!raw) return;
    if (!tags.includes(raw)) {
      setTags([...tags, raw]);
    }
    setTagInput('');
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter((t) => t !== tagToRemove));
  };

  const handleCreateCollection = async () => {
    if (!newCollectionName.trim()) return;
    try {
      const created = await createCollection(newCollectionName.trim());
      setSelectedCollectionId(created.id);
      setNewCollectionName('');
      setIsCreatingCollection(false);
    } catch (err) {
      console.error('Failed to create collection:', err);
    }
  };

  const handleSave = async () => {
    if (getStartupMigrationError()) {
      Alert.alert(
        'Database update in progress',
        'A database update is pending. Please return to the Today tab and tap Retry.'
      );
      return;
    }
    if (!title.trim() && !url.trim()) return;

    setIsSubmitting(true);
    try {
      if (url.trim()) {
        const existing = await itemsRepo.findByNormalizedUrl(url.trim());
        if (existing) {
          Alert.alert(
            'Already in your list',
            'This link is already saved in your list.'
          );
          setIsSubmitting(false);
          return;
        }
      }

      await addItem({
        type: selectedType,
        title: title.trim() || url.trim(),
        url: url.trim() || null,
        note: note.trim() || null,
        minutes: selectedMinutes,
        collection_id: selectedCollectionId,
        tags,
        remind_interval: selectedReminder,
        image_url: metadata?.imageUrl || null,
        site_name: metadata?.siteName || null,
      });
      router.back();
    } catch (err) {
      console.error('Failed to add item:', err);
      setIsSubmitting(false);
    }
  };

  const isSaveDisabled = (!title.trim() && !url.trim()) || isSubmitting;

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.keyboardAvoid}
      >
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.closeButton}
            onPress={() => router.back()}
            activeOpacity={0.7}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <X size={20} color={colors.textSecondary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Save for later</Text>
          <View style={styles.headerSpacer} />
        </View>

        <ScrollView
          style={styles.scrollContainer}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Type Selector Pills */}
          <Text style={styles.fieldLabel}>CATEGORY</Text>
          <View style={styles.typeSelector}>
            {TYPE_OPTIONS.map((opt) => {
              const Icon = opt.icon;
              const isSelected = selectedType === opt.type;
              return (
                <TouchableOpacity
                  key={opt.type}
                  style={[styles.typePill, isSelected && styles.typePillActive]}
                  onPress={() => handleTypeSelect(opt.type)}
                  activeOpacity={0.8}
                >
                  <Icon
                    size={15}
                    color={isSelected ? colors.background : colors.textSecondary}
                  />
                  <Text
                    style={[
                      styles.typePillText,
                      isSelected && styles.typePillTextActive,
                    ]}
                  >
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Title Input */}
          <View style={styles.inputGroup}>
            <Text style={styles.fieldLabel}>TITLE OR THOUGHT</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Read article on creative focus"
              placeholderTextColor="rgba(138, 126, 114, 0.4)"
              value={title}
              onChangeText={setTitle}
              autoFocus
              returnKeyType="next"
            />
          </View>

          {/* URL Input (optional for tasks/notes) */}
          <View style={styles.inputGroup}>
            <View style={styles.urlLabelRow}>
              <Text style={styles.fieldLabelInline}>LINK OR SOURCE (OPTIONAL)</Text>
              {isScraping && (
                <View style={styles.scrapingIndicator}>
                  <ActivityIndicator size="small" color={colors.accent} />
                  <Text style={styles.scrapingText}>Fetching preview...</Text>
                </View>
              )}
            </View>
            <TextInput
              style={styles.input}
              placeholder="https://..."
              placeholderTextColor="rgba(138, 126, 114, 0.4)"
              value={url}
              onChangeText={handleUrlChange}
              autoCapitalize="none"
              keyboardType="url"
              returnKeyType="next"
            />

            {/* Scraped Metadata Card Preview */}
            {metadata && (metadata.siteName || metadata.imageUrl || metadata.title) && (
              <View style={styles.previewCard}>
                {metadata.imageUrl ? (
                  <Image source={{ uri: metadata.imageUrl }} style={styles.previewImage} resizeMode="cover" />
                ) : (
                  <View style={styles.previewFallbackIcon}>
                    <Globe size={20} color={colors.accent} />
                  </View>
                )}
                <View style={styles.previewInfo}>
                  <View style={styles.previewBadgeRow}>
                    <Sparkles size={12} color={colors.accent} />
                    <Text style={styles.previewSiteName}>
                      {metadata.siteName || 'Web Preview'}
                    </Text>
                  </View>
                  <Text style={styles.previewTitle} numberOfLines={2}>
                    {metadata.title || url}
                  </Text>
                </View>
              </View>
            )}
          </View>

          {/* Duration Selector */}
          <View style={styles.inputGroup}>
            <Text style={styles.fieldLabel}>ESTIMATED TIME</Text>
            <View style={styles.durationRow}>
              {DURATION_OPTIONS.map((min) => {
                const isSelected = selectedMinutes === min;
                return (
                  <TouchableOpacity
                    key={min}
                    style={[
                      styles.durationPill,
                      isSelected && styles.durationPillActive,
                    ]}
                    onPress={() => setSelectedMinutes(min)}
                    activeOpacity={0.8}
                  >
                    <Text
                      style={[
                        styles.durationPillText,
                        isSelected && styles.durationPillTextActive,
                      ]}
                    >
                      {min} min
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Collection Selector */}
          <View style={styles.inputGroup}>
            <View style={styles.labelWithIcon}>
              <Folder size={14} color={colors.accent} />
              <Text style={styles.fieldLabelInline}>COLLECTION</Text>
            </View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.collectionsScroll}
            >
              <TouchableOpacity
                style={[
                  styles.collectionPill,
                  selectedCollectionId === null && styles.collectionPillActive,
                ]}
                onPress={() => setSelectedCollectionId(null)}
                activeOpacity={0.8}
              >
                <Text
                  style={[
                    styles.collectionPillText,
                    selectedCollectionId === null && styles.collectionPillTextActive,
                  ]}
                >
                  None
                </Text>
              </TouchableOpacity>

              {collections.map((col) => {
                const isSelected = selectedCollectionId === col.id;
                return (
                  <TouchableOpacity
                    key={col.id}
                    style={[
                      styles.collectionPill,
                      isSelected && styles.collectionPillActive,
                    ]}
                    onPress={() => setSelectedCollectionId(col.id)}
                    activeOpacity={0.8}
                  >
                    <Text
                      style={[
                        styles.collectionPillText,
                        isSelected && styles.collectionPillTextActive,
                      ]}
                    >
                      {col.name}
                    </Text>
                  </TouchableOpacity>
                );
              })}

              <TouchableOpacity
                style={styles.newCollectionPill}
                onPress={() => setIsCreatingCollection(true)}
                activeOpacity={0.8}
              >
                <Plus size={14} color={colors.accent} />
                <Text style={styles.newCollectionPillText}>New</Text>
              </TouchableOpacity>
            </ScrollView>

            {/* Inline New Collection Creator */}
            {isCreatingCollection && (
              <View style={styles.newCollectionInputRow}>
                <TextInput
                  style={styles.inlineInput}
                  placeholder="Collection name..."
                  placeholderTextColor="rgba(138, 126, 114, 0.4)"
                  value={newCollectionName}
                  onChangeText={setNewCollectionName}
                  autoFocus
                  returnKeyType="done"
                  onSubmitEditing={handleCreateCollection}
                />
                <TouchableOpacity
                  style={styles.inlineCreateBtn}
                  onPress={handleCreateCollection}
                  activeOpacity={0.8}
                >
                  <Check size={16} color={colors.background} />
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.inlineCancelBtn}
                  onPress={() => {
                    setIsCreatingCollection(false);
                    setNewCollectionName('');
                  }}
                  activeOpacity={0.8}
                >
                  <X size={16} color={colors.textSecondary} />
                </TouchableOpacity>
              </View>
            )}
          </View>

          {/* Reminding Feature (Gated) */}
          {FEATURES.perItemReminders && (
            <View style={styles.inputGroup}>
              <View style={styles.labelWithIcon}>
                <Bell size={14} color={colors.accent} />
                <Text style={styles.fieldLabelInline}>REMIND ME</Text>
              </View>
              <View style={styles.reminderRow}>
                {REMINDER_OPTIONS.map((opt) => {
                  const isSelected = selectedReminder === opt.value;
                  return (
                    <TouchableOpacity
                      key={opt.value}
                      style={[
                        styles.reminderPill,
                        isSelected && styles.reminderPillActive,
                      ]}
                      onPress={() => setSelectedReminder(opt.value)}
                      activeOpacity={0.8}
                    >
                      <Text
                        style={[
                          styles.reminderPillText,
                          isSelected && styles.reminderPillTextActive,
                        ]}
                      >
                        {opt.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          )}

          {/* Tags Feature */}
          <View style={styles.inputGroup}>
            <View style={styles.labelWithIcon}>
              <TagIcon size={14} color={colors.accent} />
              <Text style={styles.fieldLabelInline}>TAGS (OPTIONAL)</Text>
            </View>
            
            {/* Active Tags Chips */}
            {tags.length > 0 && (
              <View style={styles.activeTagsRow}>
                {tags.map((tag) => (
                  <View key={tag} style={styles.activeTagChip}>
                    <Text style={styles.activeTagText}>#{tag}</Text>
                    <TouchableOpacity
                      onPress={() => handleRemoveTag(tag)}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                      <X size={13} color={colors.textPrimary} />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            )}

            {/* Tag Input */}
            <View style={styles.tagInputRow}>
              <TextInput
                style={styles.tagInput}
                placeholder="Add tag (e.g. reading, focus)..."
                placeholderTextColor="rgba(138, 126, 114, 0.4)"
                value={tagInput}
                onChangeText={setTagInput}
                returnKeyType="done"
                onSubmitEditing={() => handleAddTag()}
              />
              <TouchableOpacity
                style={styles.addTagButton}
                onPress={() => handleAddTag()}
                activeOpacity={0.8}
              >
                <Plus size={16} color={colors.textPrimary} />
                <Text style={styles.addTagButtonText}>Add</Text>
              </TouchableOpacity>
            </View>

            {/* Quick Tag Suggestions */}
            <View style={styles.quickTagsContainer}>
              {SUGGESTED_TAGS.filter((s) => !tags.includes(s)).map((suggestion) => (
                <TouchableOpacity
                  key={suggestion}
                  style={styles.quickTagPill}
                  onPress={() => handleAddTag(suggestion)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.quickTagText}>+{suggestion}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Note Input */}
          <View style={styles.inputGroup}>
            <Text style={styles.fieldLabel}>PERSONAL NOTE / WHY SAVE THIS?</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Add a gentle reminder to your future self..."
              placeholderTextColor="rgba(138, 126, 114, 0.4)"
              value={note}
              onChangeText={setNote}
              multiline
              numberOfLines={3}
            />
          </View>
        </ScrollView>

        {/* Submit Action */}
        <View style={styles.footer}>
          <TouchableOpacity
            style={[styles.submitButton, isSaveDisabled && styles.submitButtonDisabled]}
            onPress={handleSave}
            disabled={isSaveDisabled}
            activeOpacity={0.85}
          >
            <Text style={styles.submitButtonText}>
              {isSubmitting ? 'Saving...' : 'Keep for later'}
            </Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  keyboardAvoid: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.xxl,
    paddingTop: spacing.lg,
    paddingBottom: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(212, 196, 176, 0.2)',
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.card,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(212, 196, 176, 0.3)',
  },
  headerTitle: {
    ...typography.presets.title2,
    color: colors.textPrimary,
  },
  headerSpacer: {
    width: 36,
  },
  scrollContainer: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.xxl,
  },
  fieldLabel: {
    ...typography.presets.tag,
    color: colors.accent,
    marginBottom: spacing.sm,
    letterSpacing: 1.2,
  },
  labelWithIcon: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: spacing.sm,
  },
  fieldLabelInline: {
    ...typography.presets.tag,
    color: colors.accent,
    letterSpacing: 1.2,
  },
  typeSelector: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.xxl,
  },
  typePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radii.pill,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: 'rgba(212, 196, 176, 0.3)',
  },
  typePillActive: {
    backgroundColor: colors.textPrimary,
    borderColor: colors.textPrimary,
  },
  typePillText: {
    ...typography.presets.caption,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  typePillTextActive: {
    color: colors.background,
  },
  inputGroup: {
    marginBottom: spacing.xxl,
  },
  urlLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  scrapingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  scrapingText: {
    ...typography.presets.caption,
    color: colors.accent,
    fontSize: 11,
    fontStyle: 'italic',
  },
  previewCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(238, 230, 219, 0.6)',
    borderRadius: radii.lg,
    padding: spacing.md,
    marginTop: spacing.sm,
    borderWidth: 1,
    borderColor: 'rgba(212, 196, 176, 0.4)',
    gap: spacing.md,
  },
  previewImage: {
    width: 52,
    height: 52,
    borderRadius: radii.md,
    backgroundColor: 'rgba(212, 196, 176, 0.2)',
  },
  previewFallbackIcon: {
    width: 52,
    height: 52,
    borderRadius: radii.md,
    backgroundColor: 'rgba(212, 196, 176, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewInfo: {
    flex: 1,
  },
  previewBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 2,
  },
  previewSiteName: {
    ...typography.presets.tag,
    color: colors.accent,
    fontSize: 10,
    textTransform: 'uppercase',
  },
  previewTitle: {
    ...typography.presets.caption,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  input: {
    height: 54,
    backgroundColor: colors.card,
    borderRadius: radii.xl,
    paddingHorizontal: spacing.lg,
    borderWidth: 1.5,
    borderColor: 'rgba(212, 196, 176, 0.4)',
    color: colors.textPrimary,
    ...typography.presets.body,
  },
  textArea: {
    height: 90,
    paddingTop: spacing.md,
    paddingBottom: spacing.md,
    textAlignVertical: 'top',
  },
  durationRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  durationPill: {
    flex: 1,
    height: 44,
    borderRadius: radii.pill,
    backgroundColor: colors.card,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(212, 196, 176, 0.3)',
  },
  durationPillActive: {
    backgroundColor: colors.textPrimary,
    borderColor: colors.textPrimary,
    ...shadows.soft,
  },
  durationPillText: {
    ...typography.presets.caption,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  durationPillTextActive: {
    color: colors.background,
  },
  // Collections styles
  collectionsScroll: {
    gap: spacing.sm,
    paddingVertical: 2,
  },
  collectionPill: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm + 2,
    borderRadius: radii.pill,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: 'rgba(212, 196, 176, 0.3)',
  },
  collectionPillActive: {
    backgroundColor: colors.textPrimary,
    borderColor: colors.textPrimary,
  },
  collectionPillText: {
    ...typography.presets.caption,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  collectionPillTextActive: {
    color: colors.background,
  },
  newCollectionPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.accent,
    borderStyle: 'dashed',
    backgroundColor: 'transparent',
  },
  newCollectionPillText: {
    ...typography.presets.caption,
    color: colors.accent,
    fontWeight: '600',
  },
  newCollectionInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  inlineInput: {
    flex: 1,
    height: 44,
    backgroundColor: colors.card,
    borderRadius: radii.pill,
    paddingHorizontal: spacing.lg,
    borderWidth: 1,
    borderColor: colors.accent,
    color: colors.textPrimary,
    ...typography.presets.caption,
  },
  inlineCreateBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.textPrimary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inlineCancelBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.card,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(212, 196, 176, 0.3)',
  },
  // Reminders styles
  reminderRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  reminderPill: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radii.pill,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: 'rgba(212, 196, 176, 0.3)',
  },
  reminderPillActive: {
    backgroundColor: colors.textPrimary,
    borderColor: colors.textPrimary,
  },
  reminderPillText: {
    ...typography.presets.caption,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  reminderPillTextActive: {
    color: colors.background,
  },
  // Tags styles
  activeTagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  activeTagChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: radii.pill,
    backgroundColor: 'rgba(212, 196, 176, 0.35)',
    borderWidth: 1,
    borderColor: 'rgba(212, 196, 176, 0.6)',
  },
  activeTagText: {
    ...typography.presets.caption,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  tagInputRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  tagInput: {
    flex: 1,
    height: 46,
    backgroundColor: colors.card,
    borderRadius: radii.pill,
    paddingHorizontal: spacing.lg,
    borderWidth: 1,
    borderColor: 'rgba(212, 196, 176, 0.4)',
    color: colors.textPrimary,
    ...typography.presets.caption,
  },
  addTagButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.lg,
    height: 46,
    borderRadius: radii.pill,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: 'rgba(212, 196, 176, 0.5)',
  },
  addTagButtonText: {
    ...typography.presets.caption,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  quickTagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginTop: spacing.sm,
  },
  quickTagPill: {
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: 4,
    borderRadius: radii.pill,
    backgroundColor: 'rgba(212, 196, 176, 0.15)',
  },
  quickTagText: {
    ...typography.presets.caption,
    fontSize: 11,
    color: colors.accent,
  },
  // Footer
  footer: {
    padding: spacing.xxl,
    borderTopWidth: 1,
    borderTopColor: 'rgba(212, 196, 176, 0.2)',
    backgroundColor: colors.background,
  },
  submitButton: {
    height: 56,
    borderRadius: radii.xl,
    backgroundColor: colors.textPrimary,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.soft,
  },
  submitButtonDisabled: {
    opacity: 0.4,
  },
  submitButtonText: {
    ...typography.presets.button,
    color: colors.background,
  },
});
