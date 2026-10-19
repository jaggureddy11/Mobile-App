import React from 'react';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';
import { colors, typography, spacing, radii } from '@/theme';

export type TimeChipValue = 5 | 15 | 30;

interface TimeChipProps {
  minutes: TimeChipValue;
  isSelected: boolean;
  onSelect: (minutes: TimeChipValue) => void;
}

export const TimeChip: React.FC<TimeChipProps> = ({
  minutes,
  isSelected,
  onSelect,
}) => {
  return (
    <TouchableOpacity
      style={[
        styles.chip,
        isSelected ? styles.chipActive : styles.chipInactive,
      ]}
      onPress={() => onSelect(minutes)}
      activeOpacity={0.8}
      accessibilityRole="button"
      accessibilityState={{ selected: isSelected }}
      accessibilityLabel={`${minutes} minutes filter`}
    >
      <Text
        style={[
          styles.chipText,
          isSelected ? styles.chipTextActive : styles.chipTextInactive,
        ]}
      >
        {minutes} min
      </Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  chip: {
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipActive: {
    backgroundColor: colors.pillActiveBg,
    shadowColor: colors.primaryButton,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 3,
  },
  chipInactive: {
    backgroundColor: colors.pillInactiveBg,
  },
  chipText: {
    ...typography.presets.bodyMedium,
    fontWeight: '600',
  },
  chipTextActive: {
    color: colors.pillActiveText,
  },
  chipTextInactive: {
    color: colors.pillInactiveText,
  },
});
