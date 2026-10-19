import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated } from 'react-native';
import { Undo2 } from 'lucide-react-native';
import { colors, typography, spacing, radii, shadows } from '@/theme';

interface UndoSnackbarProps {
  visible: boolean;
  itemTitle: string;
  onUndo: () => void;
}

export const UndoSnackbar: React.FC<UndoSnackbarProps> = ({
  visible,
  itemTitle,
  onUndo,
}) => {
  if (!visible) return null;

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.text} numberOfLines={1}>
          Let go: "{itemTitle}"
        </Text>
        <TouchableOpacity
          style={styles.undoButton}
          onPress={onUndo}
          activeOpacity={0.8}
        >
          <Undo2 size={16} color={colors.accent} />
          <Text style={styles.undoText}>Undo</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 110,
    left: spacing.xxl,
    right: spacing.xxl,
    zIndex: 100,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.textPrimary,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: radii.xl,
    ...shadows.card,
  },
  text: {
    ...typography.presets.caption,
    color: colors.background,
    flex: 1,
    marginRight: spacing.md,
  },
  undoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(212, 196, 176, 0.15)',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: radii.pill,
  },
  undoText: {
    ...typography.presets.caption,
    fontWeight: '700',
    color: colors.accent,
  },
});
