import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { PlayCircle, Link2, FileText, CheckSquare, Compass } from 'lucide-react-native';
import { colors, typography, spacing, radii, shadows } from '@/theme';
import { ItemType } from './ListItem';

interface ActivityCardProps {
  type: ItemType;
  typeLabel?: string;
  title: string;
  note?: string | null;
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
  onDoIt,
  onLater,
  onLetItGo,
  onShowAnother,
}) => {
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

  const displayTypeLabel = typeLabel || (
    type === 'reel' ? 'Instagram Reel' :
    type === 'link' ? 'Web Link' :
    type === 'task' ? 'Task' :
    type === 'activity' ? 'Activity' : 'Thought'
  );

  return (
    <View style={styles.card}>
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

      {/* Action Buttons */}
      <View style={styles.actionsContainer}>
        {/* Do it button */}
        <TouchableOpacity
          style={styles.doItButton}
          onPress={onDoIt}
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
            onPress={onLater}
            activeOpacity={0.8}
            accessibilityLabel="Later"
            accessibilityRole="button"
          >
            <Text style={styles.laterButtonText}>Later</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={onLetItGo}
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
          onPress={onShowAnother}
          activeOpacity={0.7}
          accessibilityLabel="Show something else"
          accessibilityRole="button"
        >
          <Text style={styles.showAnotherText}>Show something else</Text>
        </TouchableOpacity>
      ) : null}
    </View>
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
