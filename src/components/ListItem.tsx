import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Link2, PlayCircle, FileText, CheckSquare, Compass, ChevronRight } from 'lucide-react-native';
import { colors, typography, spacing, radii } from '@/theme';

export type ItemType = 'link' | 'reel' | 'text' | 'task' | 'activity';

interface ListItemProps {
  id?: string;
  title: string;
  meta: string;
  type: ItemType;
  isDimmed?: boolean;
  onPress?: () => void;
}

export const ListItem: React.FC<ListItemProps> = ({
  title,
  meta,
  type,
  isDimmed = false,
  onPress,
}) => {
  const renderIcon = () => {
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

  return (
    <TouchableOpacity
      style={[
        styles.container,
        isDimmed && styles.dimmed,
      ]}
      onPress={onPress}
      activeOpacity={0.75}
      accessibilityRole="button"
      accessibilityLabel={`${title}, ${meta}`}
    >
      <View style={styles.iconContainer}>
        {renderIcon()}
      </View>
      <View style={styles.textContainer}>
        <Text style={styles.title} numberOfLines={1}>
          {title}
        </Text>
        <Text style={styles.meta} numberOfLines={1}>
          {meta}
        </Text>
      </View>
      <ChevronRight size={18} color={colors.accent} />
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    padding: spacing.lg,
    borderRadius: radii.card,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    marginBottom: spacing.md,
  },
  dimmed: {
    opacity: 0.65,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: radii.md,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  textContainer: {
    flex: 1,
    marginRight: spacing.sm,
  },
  title: {
    ...typography.presets.bodyMedium,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 2,
  },
  meta: {
    ...typography.presets.caption,
    color: colors.textSecondary,
    textTransform: 'none',
    letterSpacing: 0,
  },
});
