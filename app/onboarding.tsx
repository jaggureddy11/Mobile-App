import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Compass, HeartHandshake, Bell } from 'lucide-react-native';
import { colors, typography, spacing, radii, shadows } from '@/theme';
import { useSettingsStore } from '@/domain/useSettingsStore';
import { NudgeFrequency } from '@/domain/types';

export default function OnboardingScreen() {
  const router = useRouter();
  const { completeOnboarding, updateSettings } = useSettingsStore();

  const [step, setStep] = useState<1 | 2>(1);
  const [frequency, setFrequency] = useState<NudgeFrequency>('daily');

  const handleFinish = async () => {
    await updateSettings({ nudge_frequency: frequency });
    await completeOnboarding();
    router.replace('/(tabs)/today');
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        {/* Progress Dots */}
        <View style={styles.progressRow}>
          <View style={[styles.dot, step === 1 && styles.dotActive]} />
          <View style={[styles.dot, step === 2 && styles.dotActive]} />
        </View>

        {step === 1 ? (
          <View style={styles.content}>
            <View style={styles.illustrationBox}>
              <View style={styles.glowCircle} />
              <View style={styles.iconCircle}>
                <Compass size={48} color={colors.accent} />
              </View>
            </View>

            <Text style={styles.tag}>MAYBE LATER</Text>
            <Text style={styles.title}>Take a breath,{'\n'}one task at a time.</Text>
            <Text style={styles.subtitle}>
              Intentional productivity starts with being present. Save what inspires you now; come back when you have a minute.
            </Text>
          </View>
        ) : (
          <View style={styles.content}>
            <View style={styles.illustrationBox}>
              <View style={styles.glowCircle} />
              <View style={styles.iconCircle}>
                <Bell size={42} color={colors.accent} />
              </View>
            </View>

            <Text style={styles.tag}>GENTLE NUDGES</Text>
            <Text style={styles.title}>How often should{'\n'}we nudge you?</Text>
            <Text style={styles.subtitle}>
              No guilt, no streaks. Just a quiet check-in when you have downtime.
            </Text>

            <View style={styles.optionsList}>
              {(['daily', 'weekly', 'never'] as NudgeFrequency[]).map((opt) => {
                const isSelected = frequency === opt;
                const labels: Record<NudgeFrequency, { title: string; desc: string }> = {
                  daily: { title: 'Daily', desc: 'Once an evening when you have downtime' },
                  weekly: { title: 'Weekly', desc: 'A calm Sunday wind-down' },
                  never: { title: 'Never', desc: 'I will open the app whenever I want' },
                };
                return (
                  <TouchableOpacity
                    key={opt}
                    style={[styles.optionCard, isSelected && styles.optionCardActive]}
                    onPress={() => setFrequency(opt)}
                    activeOpacity={0.8}
                  >
                    <View style={styles.optionRadio}>
                      {isSelected ? <View style={styles.optionRadioInner} /> : null}
                    </View>
                    <View style={styles.optionTextContainer}>
                      <Text
                        style={[
                          styles.optionTitle,
                          isSelected && styles.optionTitleActive,
                        ]}
                      >
                        {labels[opt].title}
                      </Text>
                      <Text style={styles.optionDesc}>{labels[opt].desc}</Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        )}

        <View style={styles.footer}>
          {step === 1 ? (
            <TouchableOpacity
              style={styles.primaryButton}
              onPress={() => setStep(2)}
              activeOpacity={0.85}
            >
              <Text style={styles.primaryButtonText}>Let's get started</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={styles.primaryButton}
              onPress={handleFinish}
              activeOpacity={0.85}
            >
              <Text style={styles.primaryButtonText}>Start breathing</Text>
            </TouchableOpacity>
          )}
        </View>
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
    paddingHorizontal: spacing.xxl,
    paddingTop: spacing.xl,
    paddingBottom: spacing.xxl,
    justifyContent: 'space-between',
  },
  progressRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingTop: spacing.md,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(212, 196, 176, 0.4)',
  },
  dotActive: {
    width: 24,
    backgroundColor: colors.textPrimary,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xxl,
  },
  illustrationBox: {
    width: 140,
    height: 140,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    marginBottom: spacing.xxxl,
  },
  glowCircle: {
    position: 'absolute',
    width: 130,
    height: 130,
    borderRadius: 65,
    backgroundColor: 'rgba(212, 196, 176, 0.25)',
  },
  iconCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: 'rgba(212, 196, 176, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.card,
  },
  tag: {
    ...typography.presets.tag,
    color: colors.accent,
    letterSpacing: 1.5,
    marginBottom: spacing.xs,
  },
  title: {
    ...typography.presets.hero,
    color: colors.textPrimary,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  subtitle: {
    ...typography.presets.body,
    color: colors.textSecondary,
    textAlign: 'center',
    maxWidth: 290,
    lineHeight: 22,
    marginBottom: spacing.xxl,
  },
  optionsList: {
    width: '100%',
    gap: spacing.md,
  },
  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.lg,
    backgroundColor: colors.card,
    borderRadius: radii.xl,
    borderWidth: 1.5,
    borderColor: 'rgba(212, 196, 176, 0.3)',
    gap: spacing.md,
  },
  optionCardActive: {
    borderColor: colors.textPrimary,
    backgroundColor: colors.card,
  },
  optionRadio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionRadioInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.textPrimary,
  },
  optionTextContainer: {
    flex: 1,
  },
  optionTitle: {
    ...typography.presets.caption,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 2,
  },
  optionTitleActive: {
    color: colors.textPrimary,
  },
  optionDesc: {
    ...typography.presets.caption,
    color: colors.textSecondary,
    fontSize: 12,
  },
  footer: {
    paddingTop: spacing.lg,
  },
  primaryButton: {
    height: 60,
    borderRadius: radii.xl,
    backgroundColor: colors.textPrimary,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.soft,
  },
  primaryButtonText: {
    ...typography.presets.button,
    color: colors.background,
  },
});
