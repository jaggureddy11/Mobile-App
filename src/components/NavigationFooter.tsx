import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Sun, Bookmark, Plus } from 'lucide-react-native';
import { colors, typography, spacing, radii, shadows } from '@/theme';
import { hapticFeedback } from '@/utils/haptics';

export type TabKey = 'today' | 'saved' | 'settings';

interface NavigationFooterProps {
  activeTab: TabKey;
  onTabPress: (tab: TabKey) => void;
  onAddPress: () => void;
}

export const NavigationFooter: React.FC<NavigationFooterProps> = ({
  activeTab,
  onTabPress,
  onAddPress,
}) => {
  let insetsBottom = 0;
  try {
    const insets = useSafeAreaInsets();
    insetsBottom = insets?.bottom ?? 0;
  } catch {}

  const dynamicPaddingBottom = Math.max(insetsBottom, Platform.OS === 'ios' ? 16 : 10);
  const dynamicHeight = 58 + dynamicPaddingBottom;

  const handleTabPress = (tab: TabKey) => {
    hapticFeedback.selection();
    onTabPress(tab);
  };

  const handleAddPress = () => {
    hapticFeedback.light();
    onAddPress();
  };

  return (
    <View style={styles.wrapper}>
      <View
        style={[
          styles.container,
          { height: dynamicHeight, paddingBottom: dynamicPaddingBottom },
        ]}
      >
        {/* Left Side: Today Tab */}
        <TouchableOpacity
          style={styles.tabButton}
          onPress={() => handleTabPress('today')}
          activeOpacity={0.7}
          accessibilityLabel="Today"
          accessibilityRole="tab"
          accessibilityState={{ selected: activeTab === 'today' }}
        >
          <Sun
            size={24}
            color={activeTab === 'today' ? colors.textPrimary : colors.textSecondary}
          />
          <Text
            style={[
              styles.tabLabel,
              activeTab === 'today' ? styles.tabLabelActive : styles.tabLabelInactive,
            ]}
          >
            Today
          </Text>
        </TouchableOpacity>

        {/* Center: Perfectly Centered Elevated Action Button (+) */}
        <View style={styles.centerSlot}>
          <TouchableOpacity
            style={styles.fabButton}
            onPress={handleAddPress}
            activeOpacity={0.85}
            accessibilityLabel="Add new item"
            accessibilityRole="button"
          >
            <Plus size={32} color="#FFFFFF" strokeWidth={2.5} />
          </TouchableOpacity>
        </View>

        {/* Right Side: Saved Tab */}
        <TouchableOpacity
          style={styles.tabButton}
          onPress={() => handleTabPress('saved')}
          activeOpacity={0.7}
          accessibilityLabel="Saved items"
          accessibilityRole="tab"
          accessibilityState={{ selected: activeTab === 'saved' }}
        >
          <Bookmark
            size={24}
            color={activeTab === 'saved' ? colors.textPrimary : colors.textSecondary}
            fill={activeTab === 'saved' ? colors.textPrimary : 'transparent'}
          />
          <Text
            style={[
              styles.tabLabel,
              activeTab === 'saved' ? styles.tabLabelActive : styles.tabLabelInactive,
            ]}
          >
            Saved
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'transparent',
    zIndex: 50,
    alignItems: 'center',
  },
  container: {
    width: '100%',
    maxWidth: 600,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderTopWidth: 1,
    borderTopColor: 'rgba(212, 196, 176, 0.2)',
    shadowColor: colors.accent,
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 8,
  },
  tabButton: {
    width: 80,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xs,
  },
  tabLabel: {
    ...typography.presets.tag,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.2,
    marginTop: 4,
    textTransform: 'uppercase',
  },
  tabLabelActive: {
    color: colors.textPrimary,
  },
  tabLabelInactive: {
    color: colors.textSecondary,
    opacity: 0.6,
  },
  centerSlot: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    top: -20,
    zIndex: 60,
  },
  fabButton: {
    width: 64,
    height: 64,
    borderRadius: 24,
    backgroundColor: colors.textPrimary,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.fab,
  },
});
