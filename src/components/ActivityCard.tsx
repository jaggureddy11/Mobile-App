import React, { useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image, Animated } from 'react-native';
import { PlayCircle, Link2, FileText, CheckSquare, Compass, Globe } from 'lucide-react-native';
import { colors, typography, spacing, radii, shadows } from '@/theme';
import { ItemType } from './ListItem';
import { hapticFeedback } from '@/utils/haptics';

interface ActivityCardProps {
  type: ItemType;
  typeLabel?: string;
  title: string;
  note?: string | null;
  imageUrl?: string | null;
  siteName?: string | null;
  tags?: string[];
  onDoIt: () => void;
  onLater: () => void;
  onLetItGo: () => void;
  onShowAnother?: () => void;
}

export const ActivityCard: React.FC<ActivityCardProps> = ({
  type,
  typeLabel,
  title,
  note,
  imageUrl,
  siteName,
  tags,
  onDoIt,
  onLater,
  onLetItGo,
  onShowAnother,
}) => {
  const fadeAnim = useRef(new Animated.Value(0.4)).current;
  const slideAnim = useRef(new Animated.Value(8)).current;

  useEffect(() => {
    fadeAnim.setValue(0.4);
    slideAnim.setValue(8);
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 250,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        tension: 80,
        friction: 8,
        useNativeDriver: true,
      }),
    ]).start();
  }, [title]);

  const handleDoIt = () => {
    hapticFeedback.success();
    onDoIt();
  };

  const handleLater = () => {
    hapticFeedback.medium();
    onLater();
  };

  const handleLetItGo = () => {
    hapticFeedback.warning();
    onLetItGo();
  };

  const handleShowAnother = () => {
    hapticFeedback.light();
    if (onShowAnother) onShowAnother();
  };

  const renderTypeIcon = () => {
    switch (type) {
      case 'reel':
        return <PlayCircle size={22} color={colors.accent} />;
      case 'task':
        return <CheckSquare size={20} color={colors.accent} />;
      case 'activity':
        return <Compass size={22} color={colors.accent} />;
      case 'text':
        return <FileText size={20} color={colors.accent} />;
      case 'link':
      default:
        return <Link2 size={20} color={colors.accent} />;
    }
  };

  const displayTypeLabel = siteName || typeLabel || (
    type === 'reel' ? 'Instagram Reel' :
    type === 'link' ? 'Web Link' :
    type === 'task' ? 'Task' :
    type === 'activity' ? 'Activity' : 'Thought'
  );

  return (
    <Animated.View
      style={[
        styles.card,
        {
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }],
        },
      ]}
    >
      {/* Rich Preview Image if available */}
      {imageUrl ? (
        <View style={styles.cardImageContainer}>
          <Image source={{ uri: imageUrl }} style={styles.cardImage} resizeMode="cover" />
        </View>
      ) : null}

      {/* Type Badge */}
      <View style={styles.typeBadgeRow}>
        <View style={styles.typeIconBox}>
          {renderTypeIcon()}
        </View>
        <Text style={styles.typeLabel}>{displayTypeLabel}</Text>
      </View>

      {/* Title */}
      <Text style={styles.title}>{title}</Text>

      {/* Note / Quote Box */}
      <View style={styles.quoteBox}>
        <Text style={styles.quoteText}>
          {note ? `“${note}”` : '“You wanted to do this once.”'}
        </Text>
      </View>

      {/* Tags Chips */}
      {tags && tags.length > 0 && (
        <View style={styles.tagsRow}>
          {tags.map((t) => (
            <View key={t} style={styles.tagChip}>
              <Text style={styles.tagText}>#{t}</Text>
            </View>
          ))}
        </View>
      )}

      {/* Action Buttons */}
      <View style={styles.actionsContainer}>
        {/* Do it button */}
        <TouchableOpacity
          style={styles.doItButton}
          onPress={handleDoIt}
          activeOpacity={0.85}
          accessibilityLabel="Do it"
          accessibilityRole="button"
        >
          <Text style={styles.doItButtonText}>Do it</Text>
        </TouchableOpacity>

        {/* Later & Let it go */}
        <View style={styles.secondaryActionsRow}>
          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={handleLater}
            activeOpacity={0.8}
            accessibilityLabel="Later"
            accessibilityRole="button"
          >
            <Text style={styles.laterButtonText}>Later</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={handleLetItGo}
            activeOpacity={0.8}
            accessibilityLabel="Let it go"
            accessibilityRole="button"
          >
            <Text style={styles.letGoButtonText}>Let it go</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Show another */}
      {onShowAnother ? (
        <TouchableOpacity
          style={styles.showAnotherButton}
          onPress={handleShowAnother}
          activeOpacity={0.7}
          accessibilityLabel="Show something else"
          accessibilityRole="button"
        >
          <Text style={styles.showAnotherText}>Show something else</Text>
        </TouchableOpacity>
      ) : null}
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: radii.cardLarge,
    padding: spacing.xxl,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    ...shadows.card,
    overflow: 'hidden',
    width: '100%',
    maxWidth: 600,
    alignSelf: 'center',
  },
  cardImageContainer: {
    height: 160,
    marginHorizontal: -spacing.xxl,
    marginTop: -spacing.xxl,
    marginBottom: spacing.lg,
    backgroundColor: 'rgba(212, 196, 176, 0.2)',
  },
  cardImage: {
    width: '100%',
    height: '100%',
  },
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: spacing.lg,
  },
  tagChip: {
    backgroundColor: 'rgba(212, 196, 176, 0.25)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radii.pill,
  },
  tagText: {
    ...typography.presets.caption,
    fontSize: 11,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  typeBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  typeIconBox: {
    width: 40,
    height: 40,
    borderRadius: 16,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  typeLabel: {
    ...typography.presets.tag,
    color: colors.textSecondary,
  },
  title: {
    ...typography.presets.title1,
    color: colors.textPrimary,
    marginBottom: spacing.lg,
  },
  quoteBox: {
    padding: spacing.lg,
    backgroundColor: 'rgba(251, 249, 246, 0.8)',
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    marginBottom: spacing.xl,
  },
  quoteText: {
    ...typography.presets.quote,
    color: colors.textSecondary,
  },
  actionsContainer: {
    gap: spacing.md,
  },
  doItButton: {
    height: 56,
    backgroundColor: colors.primaryButton,
    borderRadius: radii.lg,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.soft,
  },
  doItButtonText: {
    ...typography.presets.button,
    color: colors.primaryButtonText,
  },
  secondaryActionsRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  secondaryButton: {
    flex: 1,
    height: 56,
    backgroundColor: colors.card,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.secondaryButtonBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  laterButtonText: {
    ...typography.presets.button,
    fontSize: 14,
    color: colors.textPrimary,
  },
  letGoButtonText: {
    ...typography.presets.button,
    fontSize: 14,
    color: colors.accent,
  },
  showAnotherButton: {
    marginTop: spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xs,
  },
  showAnotherText: {
    ...typography.presets.tag,
    color: colors.accent,
    letterSpacing: 2,
  },
});
