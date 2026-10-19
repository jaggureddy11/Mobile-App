import React, { useState } from 'react';
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
} from 'react-native';
import { useRouter } from 'expo-router';
import { X, Link2, PlayCircle, FileText, CheckSquare, Compass } from 'lucide-react-native';
import { colors, typography, spacing, radii, shadows } from '@/theme';
import { useItemsStore } from '@/domain/useItemsStore';
import { ItemType, MinuteOption, DEFAULT_ITEM_MINUTES } from '@/domain/types';
import { detectItemTypeFromUrl } from '@/platform/useListenShareIntent';

const TYPE_OPTIONS: { type: ItemType; label: string; icon: React.ComponentType<{ size: number; color: string }> }[] = [
  { type: 'link', label: 'Link', icon: Link2 },
  { type: 'reel', label: 'Reel', icon: PlayCircle },
  { type: 'text', label: 'Text', icon: FileText },
  { type: 'task', label: 'Task', icon: CheckSquare },
  { type: 'activity', label: 'Activity', icon: Compass },
];

const DURATION_OPTIONS: MinuteOption[] = [1, 5, 15, 30];

export default function AddModal() {
  const router = useRouter();
  const addItem = useItemsStore((state) => state.addItem);

  const [title, setTitle] = useState('');
  const [url, setUrl] = useState('');
  const [note, setNote] = useState('');
  const [selectedType, setSelectedType] = useState<ItemType>('link');
  const [selectedMinutes, setSelectedMinutes] = useState<MinuteOption>(5);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Auto-detect type when URL changes
  const handleUrlChange = (text: string) => {
    setUrl(text);
    if (text.trim().startsWith('http')) {
      const detected = detectItemTypeFromUrl(text.trim());
      setSelectedType(detected);
      setSelectedMinutes(DEFAULT_ITEM_MINUTES[detected]);
    }
  };

  const handleTypeSelect = (type: ItemType) => {
    setSelectedType(type);
    setSelectedMinutes(DEFAULT_ITEM_MINUTES[type]);
  };

  const handleSave = async () => {
    if (!title.trim() && !url.trim()) return;

    setIsSubmitting(true);
    try {
      await addItem({
        type: selectedType,
        title: title.trim() || url.trim(),
        url: url.trim() || null,
        note: note.trim() || null,
        minutes: selectedMinutes,
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
            <Text style={styles.fieldLabel}>LINK OR SOURCE (OPTIONAL)</Text>
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
