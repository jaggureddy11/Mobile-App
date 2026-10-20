import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Mail,
  Lock,
} from 'lucide-react-native';
import { colors, typography, spacing, radii, shadows } from '@/theme';
import { useSettingsStore } from '@/domain/useSettingsStore';
import { NudgeFrequency } from '@/domain/types';
import {
  DoodleReading,
  DoodleCollections,
  DoodleTime,
  DoodleSanctuary,
} from '@/components/DoodleIllustrations';

export default function OnboardingScreen() {
  const router = useRouter();
  const { completeOnboarding, updateSettings } = useSettingsStore();

  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [frequency, setFrequency] = useState<NudgeFrequency>('daily');

  // Sign in / account fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleFinish = async (skipAuth = false) => {
    if (!skipAuth) {
      if (email.trim() && (!password || password.length < 6)) {
        setErrorMessage('Password must be at least 6 characters');
        return;
      }
      if (password !== confirmPassword) {
        setErrorMessage('Passwords do not match');
        return;
      }
    }

    setIsSubmitting(true);
    try {
      await updateSettings({
        nudge_frequency: frequency,
        user_email: email.trim() || null,
        user_password: password || null,
      });
      await completeOnboarding();
      router.replace('/(tabs)/today');
    } catch (err) {
      console.error('Failed to complete onboarding:', err);
      setIsSubmitting(false);
    }
  };

  const renderDoodle = () => {
    switch (step) {
      case 1:
        return <DoodleReading size={160} />;
      case 2:
        return <DoodleCollections size={160} />;
      case 3:
        return <DoodleTime size={160} />;
      case 4:
      default:
        return <DoodleSanctuary size={140} />;
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.keyboardAvoid}
      >
        <View style={styles.container}>
          {/* Header Bar with Back and Step Dots */}
          <View style={styles.topBar}>
            {step > 1 ? (
              <TouchableOpacity
                style={styles.backBtn}
                onPress={() => setStep((s) => (s - 1) as 1 | 2 | 3 | 4)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                activeOpacity={0.7}
              >
                <ArrowLeft size={18} color={colors.textPrimary} />
              </TouchableOpacity>
            ) : (
              <View style={styles.backBtnPlaceholder} />
            )}

            {/* Progress Dots */}
            <View style={styles.progressRow}>
              {[1, 2, 3, 4].map((i) => (
                <View
                  key={i}
                  style={[styles.dot, step === i && styles.dotActive]}
                />
              ))}
            </View>

            {step === 4 ? (
              <TouchableOpacity
                onPress={() => handleFinish(true)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Text style={styles.skipText}>Skip</Text>
              </TouchableOpacity>
            ) : (
              <View style={styles.backBtnPlaceholder} />
            )}
          </View>

          {/* Content Area */}
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {/* Doodle Illustration */}
            <View style={styles.doodleContainer}>{renderDoodle()}</View>

            {/* Step 1 */}
            {step === 1 && (
              <View style={styles.stepContent}>
                <Text style={styles.tag}>MINDFUL SPACE</Text>
                <Text style={styles.title}>A calm sanctuary{'\n'}for your attention.</Text>
                <Text style={styles.subtitle}>
                  Save articles, videos, thoughts, and tasks you discover throughout your day.
                  Review them when you actually have the headspace.
                </Text>
              </View>
            )}

            {/* Step 2 */}
            {step === 2 && (
              <View style={styles.stepContent}>
                <Text style={styles.tag}>ORGANIZED INTENTION</Text>
                <Text style={styles.title}>Collections &{'\n'}custom tags.</Text>
                <Text style={styles.subtitle}>
                  Group your saved inspirations into quiet collections, add tags with ease, and
                  set reminders like daily, in 1 day, 2 days, or 1 month.
                </Text>
              </View>
            )}

            {/* Step 3 */}
            {step === 3 && (
              <View style={styles.stepContent}>
                <Text style={styles.tag}>GENTLE NUDGES</Text>
                <Text style={styles.title}>How often should{'\n'}we nudge you?</Text>
                <Text style={styles.subtitle}>
                  No guilt, no streaks. Just a quiet check-in when you have downtime.
                </Text>

                <View style={styles.optionsList}>
                  {(['daily', 'weekly', 'never'] as NudgeFrequency[]).map((opt) => {
                    const isSelected = frequency === opt;
                    const labels: Record<NudgeFrequency, { title: string; desc: string }> = {
                      daily: { title: 'Daily Evening', desc: 'Once a day when you have a calm minute' },
                      weekly: { title: 'Weekly Calm', desc: 'A soothing Sunday wind-down review' },
                      never: { title: 'Purely On Demand', desc: 'I will open the app on my own rhythm' },
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

            {/* Step 4: Simple Local Sign In / Setup */}
            {step === 4 && (
              <View style={styles.stepContent}>
                <Text style={styles.tag}>YOUR SANCTUARY</Text>
                <Text style={styles.title}>Set up your account</Text>
                <Text style={styles.subtitle}>
                  Your data stays strictly offline and private on your device.
                </Text>

                {errorMessage ? (
                  <View style={styles.errorContainer}>
                    <Text style={styles.errorText}>{errorMessage}</Text>
                  </View>
                ) : null}

                <View style={styles.formContainer}>
                  {/* Email */}
                  <View style={styles.inputWrapper}>
                    <Mail size={18} color={colors.accent} style={styles.inputIcon} />
                    <TextInput
                      style={styles.textInput}
                      placeholder="Email address"
                      placeholderTextColor="rgba(138, 126, 114, 0.45)"
                      value={email}
                      onChangeText={(t) => {
                        setEmail(t);
                        setErrorMessage('');
                      }}
                      keyboardType="email-address"
                      autoCapitalize="none"
                      autoCorrect={false}
                    />
                  </View>

                  {/* Password */}
                  <View style={styles.inputWrapper}>
                    <Lock size={18} color={colors.accent} style={styles.inputIcon} />
                    <TextInput
                      style={styles.textInput}
                      placeholder="Set password (min 6 characters)"
                      placeholderTextColor="rgba(138, 126, 114, 0.45)"
                      value={password}
                      onChangeText={(t) => {
                        setPassword(t);
                        setErrorMessage('');
                      }}
                      secureTextEntry
                      autoCapitalize="none"
                    />
                  </View>

                  {/* Confirm Password */}
                  <View style={styles.inputWrapper}>
                    <Lock size={18} color={colors.accent} style={styles.inputIcon} />
                    <TextInput
                      style={styles.textInput}
                      placeholder="Confirm password"
                      placeholderTextColor="rgba(138, 126, 114, 0.45)"
                      value={confirmPassword}
                      onChangeText={(t) => {
                        setConfirmPassword(t);
                        setErrorMessage('');
                      }}
                      secureTextEntry
                      autoCapitalize="none"
                    />
                  </View>
                </View>
              </View>
            )}
          </ScrollView>

          {/* Footer Navigation Buttons */}
          <View style={styles.footer}>
            {step < 4 ? (
              <TouchableOpacity
                style={styles.primaryButton}
                onPress={() => setStep((s) => (s + 1) as 1 | 2 | 3 | 4)}
                activeOpacity={0.85}
              >
                <Text style={styles.primaryButtonText}>Next</Text>
                <ArrowRight size={18} color={colors.background} />
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={[styles.primaryButton, isSubmitting && styles.primaryButtonDisabled]}
                onPress={() => handleFinish(false)}
                disabled={isSubmitting}
                activeOpacity={0.85}
              >
                <Text style={styles.primaryButtonText}>
                  {isSubmitting ? 'Entering sanctuary...' : 'Get Started'}
                </Text>
                <Check size={18} color={colors.background} />
              </TouchableOpacity>
            )}
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  keyboardAvoid: {
    flex: 1,
  },
  container: {
    flex: 1,
    paddingHorizontal: spacing.xxl,
    justifyContent: 'space-between',
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.md,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.card,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(212, 196, 176, 0.3)',
  },
  backBtnPlaceholder: {
    width: 36,
  },
  skipText: {
    ...typography.presets.caption,
    fontWeight: '600',
    color: colors.accent,
  },
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
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
  scrollContent: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xl,
  },
  doodleContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xxl,
  },
  stepContent: {
    width: '100%',
    alignItems: 'center',
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
    maxWidth: 310,
    lineHeight: 22,
    marginBottom: spacing.xl,
  },
  // Step 3 Options
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
  // Step 4 Form
  errorContainer: {
    width: '100%',
    backgroundColor: 'rgba(212, 114, 114, 0.1)',
    borderRadius: radii.md,
    padding: spacing.sm,
    marginBottom: spacing.md,
    alignItems: 'center',
  },
  errorText: {
    ...typography.presets.caption,
    color: '#A84242',
    fontWeight: '600',
  },
  formContainer: {
    width: '100%',
    gap: spacing.md,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: radii.xl,
    borderWidth: 1.5,
    borderColor: 'rgba(212, 196, 176, 0.4)',
    paddingHorizontal: spacing.lg,
    height: 56,
  },
  inputIcon: {
    marginRight: spacing.md,
  },
  textInput: {
    flex: 1,
    height: '100%',
    color: colors.textPrimary,
    ...typography.presets.body,
  },
  // Footer Buttons
  footer: {
    paddingVertical: spacing.lg,
  },
  primaryButton: {
    height: 58,
    borderRadius: radii.xl,
    backgroundColor: colors.textPrimary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    ...shadows.soft,
  },
  primaryButtonDisabled: {
    opacity: 0.5,
  },
  primaryButtonText: {
    ...typography.presets.button,
    color: colors.background,
  },
});
