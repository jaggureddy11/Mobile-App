import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { User, ArrowLeft } from 'lucide-react-native';
import { colors, typography, spacing, radii, shadows } from '@/theme';
import { ReMindLogo } from './ReMindLogo';

interface PageHeaderProps {
  title?: string;
  subtitle?: string;
  categoryTag?: string;
  showLogo?: boolean;
  showBack?: boolean;
  showSettingsButton?: boolean;
  onBackPress?: () => void;
  rightAction?: React.ReactNode;
}

export const PageHeader: React.FC<PageHeaderProps> = ({
  title,
  subtitle,
  categoryTag,
  showLogo,
  showBack = false,
  showSettingsButton = true,
  onBackPress,
  rightAction,
}) => {
  const router = useRouter();

  // If no title/back button provided, this is the main home header
  const isHomeHeader = !showBack && !categoryTag && (!title || title === 'Hi friend,\ntake a breather.');
  const displayTitle = title || (isHomeHeader ? '' : 'Hi friend,\ntake a breather.');

  const handleBack = () => {
    if (onBackPress) {
      onBackPress();
    } else {
      router.back();
    }
  };

  const handleSettings = () => {
    router.push('/(tabs)/settings');
  };

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        {showBack ? (
          <TouchableOpacity
            style={styles.circleButton}
            onPress={handleBack}
            activeOpacity={0.8}
            accessibilityLabel="Go back"
            accessibilityRole="button"
          >
            <ArrowLeft size={20} color={colors.textSecondary} />
          </TouchableOpacity>
        ) : null}

        <View style={styles.textContainer}>
          {showLogo || isHomeHeader ? (
            <View style={styles.logoTitleGroup}>
              <ReMindLogo size="lg" />
              <Text style={styles.logoSubtitle}>
                {subtitle || 'Hi friend, take a breather.'}
              </Text>
            </View>
          ) : (
            <>
              {categoryTag === 'RE:MIND' || categoryTag === 'Re:Mind' ? (
                <View style={styles.logoBadgeContainer}>
                  <ReMindLogo size="xs" />
                </View>
              ) : categoryTag ? (
                <Text style={styles.categoryTag}>{categoryTag}</Text>
              ) : null}
              {displayTitle ? <Text style={styles.title}>{displayTitle}</Text> : null}
              {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
            </>
          )}
        </View>

        {rightAction ? (
          rightAction
        ) : (
          <View style={styles.actionsRow}>
            {/* Profile / Settings Button */}
            {showSettingsButton ? (
              <TouchableOpacity
                style={styles.circleButton}
                onPress={handleSettings}
                activeOpacity={0.8}
                accessibilityLabel="Settings"
                accessibilityRole="button"
              >
                <User size={20} color={colors.textSecondary} />
              </TouchableOpacity>
            ) : null}
          </View>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingTop: spacing.lg,
    paddingHorizontal: spacing.xxl,
    paddingBottom: spacing.lg,
    backgroundColor: colors.background,
    width: '100%',
    maxWidth: 600,
    alignSelf: 'center',
  },
  content: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  textContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  logoTitleGroup: {
    justifyContent: 'center',
  },
  logoSubtitle: {
    ...typography.presets.bodySmall,
    color: colors.textSecondary,
    marginTop: 4,
  },
  logoBadgeContainer: {
    marginBottom: spacing.xs,
  },
  categoryTag: {
    ...typography.presets.tag,
    color: colors.accent,
    marginBottom: spacing.xxs,
  },
  title: {
    ...typography.presets.title1,
    color: colors.textPrimary,
  },
  subtitle: {
    ...typography.presets.bodySmall,
    color: colors.textSecondary,
    marginTop: spacing.xxs,
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  circleButton: {
    width: 44,
    height: 44,
    borderRadius: radii.circle,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.accent,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 2,
    position: 'relative',
  },
  activityBadgeDot: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.accent,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xxl,
  },
  modalCard: {
    width: '100%',
    maxWidth: 340,
    maxHeight: 460,
    backgroundColor: colors.card,
    borderRadius: radii.cardLarge,
    padding: spacing.xl,
    ...shadows.card,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(212, 196, 176, 0.2)',
    marginBottom: spacing.md,
  },
  modalHeaderTitleBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  modalTitle: {
    ...typography.presets.title2,
    color: colors.textPrimary,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalScroll: {
    flexGrow: 0,
  },
  activityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.sm + 2,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(212, 196, 176, 0.12)',
  },
  activityIconBox: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(124, 139, 104, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  activityTextBox: {
    flex: 1,
  },
  activityItemTitle: {
    ...typography.presets.caption,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  activityItemTime: {
    ...typography.presets.tag,
    color: colors.textSecondary,
    fontSize: 11,
    marginTop: 2,
  },
  modalEmpty: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xxl,
  },
  modalEmptyTitle: {
    ...typography.presets.body,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: spacing.xxs,
  },
  modalEmptySubtitle: {
    ...typography.presets.caption,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
  },
});
