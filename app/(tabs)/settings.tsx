import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  TouchableOpacity,
  Alert,
  Share,
} from 'react-native';
import {
  Bell,
  Clock,
  Moon,
  Download,
  Trash2,
  Heart,
  ChevronRight,
  ShieldCheck,
} from 'lucide-react-native';
import { PageHeader } from '@/components';
import { colors, typography, spacing, radii, shadows } from '@/theme';
import { useSettingsStore } from '@/domain/useSettingsStore';
import { useItemsStore } from '@/domain/useItemsStore';
import { NudgeFrequency } from '@/domain/types';

export default function SettingsScreen() {
  const { settings, updateSettings } = useSettingsStore();
  const { items, runPurge } = useItemsStore();

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
              <Text style={styles.statNumber}>100%</Text>
              <Text style={styles.statLabel}>Local</Text>
            </View>
          </View>

          {/* Preferences Section */}
          <View style={styles.section}>
            <Text style={styles.sectionHeader}>NUDGES & CALM REMINDERS</Text>

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
          </View>

          {/* Privacy Guarantee */}
          <View style={styles.privacyCard}>
            <ShieldCheck size={22} color={colors.accent} />
            <View style={styles.privacyContent}>
              <Text style={styles.privacyTitle}>Private & Local</Text>
              <Text style={styles.privacyText}>
                Re:Mind has no servers, accounts, or analytics trackers. Everything stays safe on your device.
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
});
