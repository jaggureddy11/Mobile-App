import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  TouchableOpacity,
  Alert,
  Share,
  ActivityIndicator,
  Switch,
  Linking,
} from 'react-native';
import * as Notifications from 'expo-notifications';
import {
  Bell,
  BellOff,
  Clock,
  Moon,
  Download,
  Trash2,
  Heart,
  ChevronRight,
  ShieldCheck,
  Cloud,
  RefreshCw,
  CheckCircle2,
  FileText,
} from 'lucide-react-native';
import { PageHeader } from '@/components';
import { colors, typography, spacing, radii, shadows } from '@/theme';
import { useSettingsStore } from '@/domain/useSettingsStore';
import { useItemsStore } from '@/domain/useItemsStore';
import { NudgeFrequency } from '@/domain/types';
import { syncService } from '@/platform/syncService';
import { FEATURES } from '@/config/features';
import { debugLogger } from '@/utils/debugLogger';

export default function SettingsScreen() {
  const { settings, updateSettings } = useSettingsStore();
  const { items, runPurge } = useItemsStore();
  const [isSyncing, setIsSyncing] = useState(false);
  const [hasNotificationPermission, setHasNotificationPermission] = useState(true);

  React.useEffect(() => {
    Notifications.getPermissionsAsync()
      .then(({ status }) => setHasNotificationPermission(status === 'granted'))
      .catch(() => {});
  }, []);

  const savedCount = items.filter((i) => i.status === 'pending').length;
  const doneCount = items.filter((i) => i.status === 'done').length;

  const cycleFrequency = () => {
    const cycle: Record<NudgeFrequency, NudgeFrequency> = {
      daily: 'weekly',
      weekly: 'never',
      never: 'daily',
    };
    updateSettings({ nudge_frequency: cycle[settings.nudge_frequency] });
  };

  const cycleTime = () => {
    const times = ['09:00', '12:30', '18:00', '19:00', '21:00'];
    const idx = times.indexOf(settings.nudge_time);
    const nextTime = times[(idx + 1) % times.length];
    updateSettings({ nudge_time: nextTime });
  };

  const handleSyncNow = async () => {
    setIsSyncing(true);
    try {
      const result = await syncService.performSync(settings.sync_endpoint);
      await updateSettings({ last_synced_at: result.timestamp });
      Alert.alert(
        'Cloud Backup Complete',
        `${result.message}\n\nAll items and collections are preserved locally and backed up safely.`
      );
    } catch (err: any) {
      Alert.alert('Sync Notice', 'Synced with local snapshot. Remote cloud server was unreachable.');
    } finally {
      setIsSyncing(false);
    }
  };

  const toggleCloudSync = (val: boolean) => {
    updateSettings({ cloud_sync_enabled: val });
  };

  const handleExportCSV = async () => {
    try {
      const header = 'id,type,title,url,note,minutes,status,created_at,done_at\n';
      const rows = items
        .map(
          (i) =>
            `"${i.id}","${i.type}","${i.title.replace(/"/g, '""')}","${i.url || ''}","${(i.note || '').replace(/"/g, '""')}",${i.minutes},"${i.status}","${i.created_at}","${i.done_at || ''}"`
        )
        .join('\n');
      const csv = header + rows;

      await Share.share({
        title: 'Re:Mind - Exported Items.csv',
        message: csv,
      });
    } catch (err) {
      console.error('Export error:', err);
    }
  };

  const handleManualPurge = async () => {
    const count = await runPurge();
    Alert.alert(
      'Cleaned up',
      count > 0
        ? `Cleaned up ${count} items that were let go over 30 days ago.`
        : 'No expired items found. All let-go items under 30 days are safe.'
    );
  };

  const handleCopyDebugInfo = async () => {
    try {
      await debugLogger.loadPersistedLogs();
      const debugInfo = debugLogger.formatDebugInfo();
      const logs = debugLogger.getLogs();
      await Share.share({
        message: debugInfo,
        title: 'Re:Mind Debug Info',
      });
      Alert.alert(
        'Debug Info',
        `Exported ${logs.length} error entries. Contains only error names, screens, and timestamps. No saved items, URLs, or notes are included.`
      );
    } catch (err: any) {
      Alert.alert('Unable to copy debug info', err?.message || 'Unknown error');
    }
  };

  const formatLastSynced = () => {
    if (!settings.last_synced_at) return 'Never synced';
    const date = new Date(settings.last_synced_at);
    return `Today at ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <PageHeader title="Settings" categoryTag="RE:MIND" showSettingsButton={false} />

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.contentContainer}
          showsVerticalScrollIndicator={false}
        >
          {/* Stats Card mirroring profile design */}
          <View style={styles.statsCard}>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{savedCount}</Text>
              <Text style={styles.statLabel}>Saved</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{doneCount}</Text>
              <Text style={styles.statLabel}>Done</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              {FEATURES.cloudSync ? (
                <>
                  <Text style={styles.statNumber}>Offline</Text>
                  <Text style={styles.statLabel}>+ Online</Text>
                </>
              ) : (
                <>
                  <Text style={styles.statNumber}>Private</Text>
                  <Text style={styles.statLabel}>on device</Text>
                </>
              )}
            </View>
          </View>

          {/* Cloud Backup & Sync Section (Gated) */}
          {FEATURES.cloudSync && (
            <View style={styles.section}>
              <Text style={styles.sectionHeader}>HYBRID CLOUD BACKUP & SYNC</Text>

              <View style={styles.settingRow}>
                <View style={styles.settingIconBox}>
                  <Cloud size={20} color={colors.accent} />
                </View>
                <View style={styles.settingTextContainer}>
                  <Text style={styles.settingTitle}>Cloud Backup</Text>
                  <Text style={styles.settingSubtitle}>
                    {settings.cloud_sync_enabled ? 'Connected & Offline-ready' : 'Offline local-only mode'}
                  </Text>
                </View>
                <Switch
                  value={settings.cloud_sync_enabled}
                  onValueChange={toggleCloudSync}
                  trackColor={{ false: 'rgba(212, 196, 176, 0.4)', true: colors.accent }}
                  thumbColor={colors.background}
                />
              </View>

              {settings.cloud_sync_enabled && (
                <TouchableOpacity
                  style={styles.settingRow}
                  onPress={handleSyncNow}
                  disabled={isSyncing}
                  activeOpacity={0.7}
                >
                  <View style={styles.settingIconBox}>
                    {isSyncing ? (
                      <ActivityIndicator size="small" color={colors.accent} />
                    ) : (
                      <RefreshCw size={19} color={colors.accent} />
                    )}
                  </View>
                  <View style={styles.settingTextContainer}>
                    <Text style={styles.settingTitle}>Sync with Cloud</Text>
                    <Text style={styles.settingSubtitle}>Last backup: {formatLastSynced()}</Text>
                  </View>
                  <View style={styles.syncBadge}>
                    <Text style={styles.syncBadgeText}>{isSyncing ? 'Syncing...' : 'Sync Now'}</Text>
                  </View>
                </TouchableOpacity>
              )}
            </View>
          )}

          {/* Preferences Section */}
          <View style={styles.section}>
            <Text style={styles.sectionHeader}>NUDGES & CALM REMINDERS</Text>

            {!hasNotificationPermission && settings.nudge_frequency !== 'never' && (
              <View style={styles.permissionWarningBanner}>
                <View style={styles.warningIconBox}>
                  <BellOff size={20} color={colors.accent} />
                </View>
                <View style={styles.warningTextBox}>
                  <Text style={styles.warningTitle}>Notifications are disabled</Text>
                  <Text style={styles.warningSubtitle}>
                    Enable notifications in your device settings to receive your gentle daily or weekly nudges.
                  </Text>
                  <TouchableOpacity
                    style={styles.openSettingsButton}
                    onPress={() => Linking.openSettings().catch(() => {})}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.openSettingsText}>Open device settings</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            <TouchableOpacity
              style={styles.settingRow}
              onPress={cycleFrequency}
              activeOpacity={0.7}
            >
              <View style={styles.settingIconBox}>
                <Bell size={20} color={colors.accent} />
              </View>
              <View style={styles.settingTextContainer}>
                <Text style={styles.settingTitle}>Nudge frequency</Text>
                <Text style={styles.settingSubtitle}>Gentle prompt to take a minute</Text>
              </View>
              <Text style={styles.settingValue}>
                {settings.nudge_frequency.toUpperCase()}
              </Text>
              <ChevronRight size={18} color={colors.accent} />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.settingRow}
              onPress={cycleTime}
              activeOpacity={0.7}
            >
              <View style={styles.settingIconBox}>
                <Clock size={20} color={colors.accent} />
              </View>
              <View style={styles.settingTextContainer}>
                <Text style={styles.settingTitle}>Preferred time</Text>
                <Text style={styles.settingSubtitle}>When downtime usually happens</Text>
              </View>
              <Text style={styles.settingValue}>{settings.nudge_time}</Text>
              <ChevronRight size={18} color={colors.accent} />
            </TouchableOpacity>

            <View style={styles.settingRow}>
              <View style={styles.settingIconBox}>
                <Moon size={20} color={colors.accent} />
              </View>
              <View style={styles.settingTextContainer}>
                <Text style={styles.settingTitle}>Quiet hours</Text>
                <Text style={styles.settingSubtitle}>No notifications during sleep</Text>
              </View>
              <Text style={styles.settingValue}>22:00 – 08:00</Text>
            </View>
          </View>

          {/* Data & Privacy */}
          <View style={styles.section}>
            <Text style={styles.sectionHeader}>DATA & FREEDOM</Text>

            <TouchableOpacity
              style={styles.settingRow}
              onPress={handleExportCSV}
              activeOpacity={0.7}
            >
              <View style={styles.settingIconBox}>
                <Download size={20} color={colors.accent} />
              </View>
              <View style={styles.settingTextContainer}>
                <Text style={styles.settingTitle}>Export your data</Text>
                <Text style={styles.settingSubtitle}>Download all items as clean CSV</Text>
              </View>
              <ChevronRight size={18} color={colors.accent} />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.settingRow}
              onPress={handleManualPurge}
              activeOpacity={0.7}
            >
              <View style={styles.settingIconBox}>
                <Trash2 size={20} color={colors.accent} />
              </View>
              <View style={styles.settingTextContainer}>
                <Text style={styles.settingTitle}>Auto-purge status</Text>
                <Text style={styles.settingSubtitle}>Clean let-go items older than 30 days</Text>
              </View>
              <ChevronRight size={18} color={colors.accent} />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.settingRow}
              onPress={handleCopyDebugInfo}
              activeOpacity={0.7}
            >
              <View style={styles.settingIconBox}>
                <FileText size={20} color={colors.accent} />
              </View>
              <View style={styles.settingTextContainer}>
                <Text style={styles.settingTitle}>Copy debug info</Text>
                <Text style={styles.settingSubtitle}>Local error log (last 50, zero URLs/titles)</Text>
              </View>
              <ChevronRight size={18} color={colors.accent} />
            </TouchableOpacity>
          </View>

          {/* Privacy Guarantee */}
          <View style={styles.privacyCard}>
            <ShieldCheck size={22} color={colors.accent} />
            <View style={styles.privacyContent}>
              <Text style={styles.privacyTitle}>Offline-First Guarantee</Text>
              <Text style={styles.privacyText}>
                Your data and scheduled notifications always run 100% locally on your device with or without internet. When connected, rich link previews and cloud backup work seamlessly.
              </Text>
            </View>
          </View>

          {/* Footer Note */}
          <View style={styles.footerNote}>
            <Heart size={14} color={colors.accent} />
            <Text style={styles.footerNoteText}>
              Crafted for calm, intentional living.
            </Text>
          </View>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: spacing.xxl,
    paddingBottom: 130,
  },
  statsCard: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: radii.card,
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.lg,
    borderWidth: 1,
    borderColor: 'rgba(212, 196, 176, 0.25)',
    marginBottom: spacing.xxxl,
    ...shadows.card,
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    ...typography.presets.title1,
    color: colors.textPrimary,
  },
  statLabel: {
    ...typography.presets.tag,
    color: colors.textSecondary,
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    height: 36,
    backgroundColor: 'rgba(212, 196, 176, 0.25)',
  },
  section: {
    marginBottom: spacing.xxxl,
  },
  sectionHeader: {
    ...typography.presets.tag,
    color: colors.accent,
    letterSpacing: 1.5,
    marginBottom: spacing.md,
    marginLeft: spacing.xs,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    padding: spacing.lg,
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: 'rgba(212, 196, 176, 0.2)',
    marginBottom: spacing.sm,
  },
  settingIconBox: {
    width: 42,
    height: 42,
    borderRadius: 16,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  settingTextContainer: {
    flex: 1,
  },
  settingTitle: {
    ...typography.presets.body,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  settingSubtitle: {
    ...typography.presets.caption,
    color: colors.textSecondary,
    marginTop: 2,
  },
  settingValue: {
    ...typography.presets.caption,
    fontWeight: '700',
    color: colors.textPrimary,
    marginRight: spacing.xs,
  },
  syncBadge: {
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: radii.pill,
    backgroundColor: colors.textPrimary,
  },
  syncBadgeText: {
    ...typography.presets.caption,
    color: colors.background,
    fontWeight: '600',
    fontSize: 12,
  },
  privacyCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: colors.card,
    padding: spacing.xl,
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: 'rgba(212, 196, 176, 0.25)',
    gap: spacing.md,
    marginBottom: spacing.xxxl,
  },
  privacyContent: {
    flex: 1,
  },
  privacyTitle: {
    ...typography.presets.caption,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 2,
  },
  privacyText: {
    ...typography.presets.caption,
    color: colors.textSecondary,
    lineHeight: 18,
  },
  footerNote: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingTop: spacing.lg,
  },
  footerNoteText: {
    ...typography.presets.caption,
    color: colors.accent,
    fontStyle: 'italic',
  },
  permissionWarningBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: 'rgba(197, 168, 128, 0.15)',
    padding: spacing.lg,
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: 'rgba(197, 168, 128, 0.35)',
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  warningIconBox: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  warningTextBox: {
    flex: 1,
  },
  warningTitle: {
    ...typography.presets.bodyLarge,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 2,
  },
  warningSubtitle: {
    ...typography.presets.caption,
    color: colors.textSecondary,
    lineHeight: 18,
    marginBottom: spacing.sm,
  },
  openSettingsButton: {
    alignSelf: 'flex-start',
    backgroundColor: colors.textPrimary,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: radii.pill,
  },
  openSettingsText: {
    ...typography.presets.caption,
    color: colors.background,
    fontWeight: '700',
    fontSize: 12,
  },
});
