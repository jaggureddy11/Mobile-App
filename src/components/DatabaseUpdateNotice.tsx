import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Share, Alert } from 'react-native';
import { HelpCircle } from 'lucide-react-native';
import { colors, typography, spacing, radii, shadows } from '@/theme';
import { retryDatabaseInitialization, getStartupMigrationError } from '@/db/database';
import { debugLogger } from '@/utils/debugLogger';

interface DatabaseUpdateNoticeProps {
  onRetrySuccess?: () => Promise<void> | void;
}

export function DatabaseUpdateNotice({ onRetrySuccess }: DatabaseUpdateNoticeProps) {
  const [isRetrying, setIsRetrying] = useState(false);
  const [error, setError] = useState<string | null>(getStartupMigrationError());

  const handleRetry = async () => {
    setIsRetrying(true);
    try {
      await retryDatabaseInitialization();
      setError(null);
      if (onRetrySuccess) {
        await onRetrySuccess();
      }
    } catch {
      setError(getStartupMigrationError() || 'Migration retry failed');
    } finally {
      setIsRetrying(false);
    }
  };

  const handleCopyDebugInfo = async () => {
    try {
      const debugInfo = debugLogger.formatDebugInfo();
      await Share.share({
        message: debugInfo,
        title: 'Re:Mind Debug Info',
      });
    } catch (err: any) {
      Alert.alert('Unable to copy debug info', err?.message || 'Unknown error');
    }
  };

  return (
    <View style={styles.errorContainer} testID="database-update-notice">
      <View style={styles.emptyIconCircle}>
        <HelpCircle size={32} color={colors.accent} />
      </View>
      <Text style={styles.emptyTitle}>Database Update Notice</Text>
      <Text style={styles.emptySubtitle}>
        A database update encountered a recoverable issue. Your saved data remains safe on your device.
      </Text>
      {error && __DEV__ && (
        <Text style={styles.devErrorText} numberOfLines={2}>
          {error}
        </Text>
      )}
      <View style={styles.buttonRow}>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={handleRetry}
          activeOpacity={0.85}
          disabled={isRetrying}
          testID="retry-loading-button"
        >
          {isRetrying ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Text style={styles.actionButtonText}>Retry loading</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.secondaryButton}
          onPress={handleCopyDebugInfo}
          activeOpacity={0.85}
          testID="copy-debug-info-button"
        >
          <Text style={styles.secondaryButtonText}>Copy debug info</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  errorContainer: {
    marginHorizontal: spacing.xxl,
    marginVertical: spacing.xl,
    padding: spacing.xxxl,
    backgroundColor: colors.card,
    borderRadius: radii.cardLarge,
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
  devErrorText: {
    ...typography.presets.caption,
    color: colors.accent,
    marginBottom: spacing.md,
    textAlign: 'center',
  },
  buttonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    flexWrap: 'wrap',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.textPrimary,
    paddingHorizontal: spacing.lg,
    height: 44,
    borderRadius: radii.pill,
    minWidth: 130,
    ...shadows.soft,
  },
  actionButtonText: {
    ...typography.presets.button,
    color: colors.background,
    fontSize: 14,
  },
  secondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
    borderColor: 'rgba(212, 196, 176, 0.4)',
    borderWidth: 1,
    paddingHorizontal: spacing.lg,
    height: 44,
    borderRadius: radii.pill,
    minWidth: 130,
    ...shadows.soft,
  },
  secondaryButtonText: {
    ...typography.presets.button,
    color: colors.textPrimary,
    fontSize: 14,
  },
});
