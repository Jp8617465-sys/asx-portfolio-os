/**
 * Glow AI — Skin Quiz Screen
 *
 * Multi-step quiz to build user profile: skin type, concerns,
 * preferences, goals. Conversational, friendly tone.
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

import { colors, typography, spacing, borderRadius } from '../theme';
import GradientButton from '../components/GradientButton';
import ConcernChip from '../components/ConcernChip';
import { useAppStore, QuizData } from '../services/store';
import {
  SkinType,
  SkinTone,
  SkinConcern,
  AgeRange,
  Gender,
  StylePreference,
} from '../types';

const TOTAL_STEPS = 7;

// ─── Option Data ───────────────────────────────────────────────

const AGE_OPTIONS: { value: AgeRange; label: string }[] = [
  { value: '18-22', label: '18-22' },
  { value: '23-27', label: '23-27' },
  { value: '28-32', label: '28-32' },
  { value: '33-35', label: '33-35' },
  { value: '36+', label: '36+' },
];

const GENDER_OPTIONS: { value: Gender; label: string }[] = [
  { value: 'female', label: 'Female' },
  { value: 'male', label: 'Male' },
  { value: 'non-binary', label: 'Non-Binary' },
  { value: 'prefer-not-to-say', label: 'Prefer not to say' },
];

const SKIN_TYPE_OPTIONS: { value: SkinType; label: string; description: string; icon: string }[] = [
  { value: 'oily', label: 'Oily', description: 'Shiny T-zone, visible pores', icon: '💧' },
  { value: 'dry', label: 'Dry', description: 'Tight, flaky, or rough patches', icon: '🏜' },
  { value: 'combination', label: 'Combination', description: 'Oily T-zone, dry cheeks', icon: '🌗' },
  { value: 'normal', label: 'Normal', description: 'Balanced, not too oily or dry', icon: '✨' },
  { value: 'sensitive', label: 'Sensitive', description: 'Easily irritated, reacts to products', icon: '🌸' },
];

const SKIN_TONE_OPTIONS: { value: SkinTone; label: string; color: string }[] = [
  { value: 'fair', label: 'Fair', color: '#FFE8D6' },
  { value: 'light', label: 'Light', color: '#F5D5B8' },
  { value: 'medium', label: 'Medium', color: '#D4A574' },
  { value: 'olive', label: 'Olive', color: '#C4956A' },
  { value: 'tan', label: 'Tan', color: '#A0714F' },
  { value: 'dark', label: 'Dark', color: '#7B5B3A' },
  { value: 'deep', label: 'Deep', color: '#5A3D2B' },
];

const CONCERN_OPTIONS: { value: SkinConcern; label: string }[] = [
  { value: 'acne', label: 'Acne & Breakouts' },
  { value: 'dark-spots', label: 'Dark Spots' },
  { value: 'fine-lines', label: 'Fine Lines' },
  { value: 'large-pores', label: 'Large Pores' },
  { value: 'uneven-tone', label: 'Uneven Skin Tone' },
  { value: 'dullness', label: 'Dullness' },
  { value: 'dryness', label: 'Dryness' },
  { value: 'oiliness', label: 'Excess Oil' },
  { value: 'redness', label: 'Redness' },
  { value: 'sensitivity', label: 'Sensitivity' },
  { value: 'dark-circles', label: 'Dark Circles' },
  { value: 'hyperpigmentation', label: 'Hyperpigmentation' },
  { value: 'texture', label: 'Rough Texture' },
  { value: 'blackheads', label: 'Blackheads' },
  { value: 'scarring', label: 'Acne Scarring' },
  { value: 'rosacea', label: 'Rosacea' },
  { value: 'eczema', label: 'Eczema' },
  { value: 'sun-damage', label: 'Sun Damage' },
  { value: 'melasma', label: 'Melasma' },
];

const STYLE_OPTIONS: { value: StylePreference; label: string }[] = [
  { value: 'minimal', label: 'Minimal / Low Maintenance' },
  { value: 'glass-skin', label: 'Glass Skin' },
  { value: 'natural-glow', label: 'Natural Glow' },
  { value: 'dewy', label: 'Dewy & Hydrated' },
  { value: 'matte', label: 'Matte Finish' },
  { value: 'k-beauty', label: 'K-Beauty' },
  { value: 'clean-beauty', label: 'Clean Beauty' },
  { value: 'anti-aging', label: 'Anti-Aging Focus' },
  { value: 'acne-fighting', label: 'Acne-Fighting' },
];

const BUDGET_OPTIONS: { value: QuizData['budgetRange']; label: string; description: string }[] = [
  { value: 'budget', label: 'Budget-Friendly', description: 'Under $25 per product' },
  { value: 'mid-range', label: 'Mid-Range', description: '$25-60 per product' },
  { value: 'premium', label: 'Premium', description: '$60-120 per product' },
  { value: 'luxury', label: 'Luxury', description: '$120+ per product' },
];

// ─── Component ─────────────────────────────────────────────────

export default function SkinQuizScreen() {
  const { quizData, setQuizData, finalizeQuiz } = useAppStore();
  const [step, setStep] = useState(0);

  const goNext = () => {
    if (step < TOTAL_STEPS - 1) {
      setStep(step + 1);
    } else {
      finalizeQuiz();
    }
  };

  const goBack = () => {
    if (step > 0) setStep(step - 1);
  };

  const progress = ((step + 1) / TOTAL_STEPS) * 100;

  const renderStep = () => {
    switch (step) {
      case 0:
        return renderNameStep();
      case 1:
        return renderAgeGenderStep();
      case 2:
        return renderSkinTypeStep();
      case 3:
        return renderSkinToneStep();
      case 4:
        return renderConcernsStep();
      case 5:
        return renderStyleStep();
      case 6:
        return renderPreferencesStep();
      default:
        return null;
    }
  };

  // ── Step 0: Name ──────────────────────────────────────────

  const renderNameStep = () => (
    <View style={styles.stepContent}>
      <Text style={styles.stepEmoji}>👋</Text>
      <Text style={styles.stepTitle}>Hey there, gorgeous!</Text>
      <Text style={styles.stepSubtitle}>
        What should we call you?
      </Text>
      <TextInput
        style={styles.textInput}
        placeholder="Your name"
        placeholderTextColor={colors.neutral[300]}
        value={quizData.name ?? ''}
        onChangeText={(text) => setQuizData({ name: text })}
        autoFocus
        returnKeyType="done"
      />
    </View>
  );

  // ── Step 1: Age & Gender ──────────────────────────────────

  const renderAgeGenderStep = () => (
    <View style={styles.stepContent}>
      <Text style={styles.stepTitle}>
        Nice to meet you{quizData.name ? `, ${quizData.name}` : ''}!
      </Text>
      <Text style={styles.stepSubtitle}>
        This helps us tailor recommendations to your life stage.
      </Text>

      <Text style={styles.sectionLabel}>Age Range</Text>
      <View style={styles.chipGrid}>
        {AGE_OPTIONS.map((opt) => (
          <ConcernChip
            key={opt.value}
            label={opt.label}
            selected={quizData.age === opt.value}
            onPress={() => setQuizData({ age: opt.value })}
          />
        ))}
      </View>

      <Text style={styles.sectionLabel}>Gender (optional)</Text>
      <View style={styles.chipGrid}>
        {GENDER_OPTIONS.map((opt) => (
          <ConcernChip
            key={opt.value}
            label={opt.label}
            selected={quizData.gender === opt.value}
            onPress={() => setQuizData({ gender: opt.value })}
          />
        ))}
      </View>
    </View>
  );

  // ── Step 2: Skin Type ─────────────────────────────────────

  const renderSkinTypeStep = () => (
    <View style={styles.stepContent}>
      <Text style={styles.stepTitle}>What's your skin type?</Text>
      <Text style={styles.stepSubtitle}>
        Not sure? No worries — our AI scan can help confirm this later.
      </Text>

      {SKIN_TYPE_OPTIONS.map((opt) => (
        <TouchableOpacity
          key={opt.value}
          style={[
            styles.optionCard,
            quizData.skinType === opt.value && styles.optionCardSelected,
          ]}
          onPress={() => setQuizData({ skinType: opt.value })}
          activeOpacity={0.7}
        >
          <Text style={styles.optionIcon}>{opt.icon}</Text>
          <View style={styles.optionText}>
            <Text style={[
              styles.optionLabel,
              quizData.skinType === opt.value && styles.optionLabelSelected,
            ]}>
              {opt.label}
            </Text>
            <Text style={styles.optionDescription}>{opt.description}</Text>
          </View>
          {quizData.skinType === opt.value && (
            <Ionicons name="checkmark-circle" size={24} color={colors.primary[500]} />
          )}
        </TouchableOpacity>
      ))}
    </View>
  );

  // ── Step 3: Skin Tone ─────────────────────────────────────

  const renderSkinToneStep = () => (
    <View style={styles.stepContent}>
      <Text style={styles.stepTitle}>What's your skin tone?</Text>
      <Text style={styles.stepSubtitle}>
        This helps with product shade matching and pigmentation analysis.
      </Text>

      <View style={styles.toneGrid}>
        {SKIN_TONE_OPTIONS.map((opt) => (
          <TouchableOpacity
            key={opt.value}
            style={[
              styles.toneOption,
              quizData.skinTone === opt.value && styles.toneOptionSelected,
            ]}
            onPress={() => setQuizData({ skinTone: opt.value })}
            activeOpacity={0.7}
          >
            <View style={[styles.toneCircle, { backgroundColor: opt.color }]} />
            <Text style={[
              styles.toneLabel,
              quizData.skinTone === opt.value && styles.toneLabelSelected,
            ]}>
              {opt.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  // ── Step 4: Concerns ──────────────────────────────────────

  const renderConcernsStep = () => {
    const selectedConcerns = (quizData.concerns ?? []) as SkinConcern[];

    const toggleConcern = (concern: SkinConcern) => {
      const updated = selectedConcerns.includes(concern)
        ? selectedConcerns.filter((c) => c !== concern)
        : [...selectedConcerns, concern];
      setQuizData({ concerns: updated });
    };

    return (
      <View style={styles.stepContent}>
        <Text style={styles.stepTitle}>What are your skin concerns?</Text>
        <Text style={styles.stepSubtitle}>
          Select all that apply. We'll address these in your personalised routine.
        </Text>

        <View style={styles.chipGrid}>
          {CONCERN_OPTIONS.map((opt) => (
            <ConcernChip
              key={opt.value}
              label={opt.label}
              selected={selectedConcerns.includes(opt.value)}
              onPress={() => toggleConcern(opt.value)}
            />
          ))}
        </View>
      </View>
    );
  };

  // ── Step 5: Style Preferences ─────────────────────────────

  const renderStyleStep = () => {
    const selectedStyles = (quizData.stylePreferences ?? []) as StylePreference[];

    const toggleStyle = (style: StylePreference) => {
      const updated = selectedStyles.includes(style)
        ? selectedStyles.filter((s) => s !== style)
        : [...selectedStyles, style];
      setQuizData({ stylePreferences: updated });
    };

    return (
      <View style={styles.stepContent}>
        <Text style={styles.stepTitle}>What's your vibe?</Text>
        <Text style={styles.stepSubtitle}>
          Pick the skincare styles that resonate with you.
        </Text>

        <View style={styles.chipGrid}>
          {STYLE_OPTIONS.map((opt) => (
            <ConcernChip
              key={opt.value}
              label={opt.label}
              selected={selectedStyles.includes(opt.value)}
              onPress={() => toggleStyle(opt.value)}
            />
          ))}
        </View>
      </View>
    );
  };

  // ── Step 6: Budget & Preferences ──────────────────────────

  const renderPreferencesStep = () => (
    <View style={styles.stepContent}>
      <Text style={styles.stepTitle}>Almost done!</Text>
      <Text style={styles.stepSubtitle}>
        A few more preferences to nail your recommendations.
      </Text>

      <Text style={styles.sectionLabel}>Budget per product</Text>
      {BUDGET_OPTIONS.map((opt) => (
        <TouchableOpacity
          key={opt.value}
          style={[
            styles.optionCard,
            quizData.budgetRange === opt.value && styles.optionCardSelected,
          ]}
          onPress={() => setQuizData({ budgetRange: opt.value })}
          activeOpacity={0.7}
        >
          <View style={styles.optionText}>
            <Text style={[
              styles.optionLabel,
              quizData.budgetRange === opt.value && styles.optionLabelSelected,
            ]}>
              {opt.label}
            </Text>
            <Text style={styles.optionDescription}>{opt.description}</Text>
          </View>
          {quizData.budgetRange === opt.value && (
            <Ionicons name="checkmark-circle" size={24} color={colors.primary[500]} />
          )}
        </TouchableOpacity>
      ))}

      <Text style={[styles.sectionLabel, { marginTop: 20 }]}>Important to you</Text>
      <View style={styles.chipGrid}>
        <ConcernChip
          label="Cruelty-Free"
          selected={quizData.preferCrueltyFree ?? false}
          onPress={() => setQuizData({ preferCrueltyFree: !quizData.preferCrueltyFree })}
        />
        <ConcernChip
          label="Vegan"
          selected={quizData.preferVegan ?? false}
          onPress={() => setQuizData({ preferVegan: !quizData.preferVegan })}
        />
        <ConcernChip
          label="Fragrance-Free"
          selected={quizData.preferFragranceFree ?? false}
          onPress={() => setQuizData({ preferFragranceFree: !quizData.preferFragranceFree })}
        />
        <ConcernChip
          label="Natural / Clean"
          selected={quizData.preferNatural ?? false}
          onPress={() => setQuizData({ preferNatural: !quizData.preferNatural })}
        />
      </View>
    </View>
  );

  // ── Layout ────────────────────────────────────────────────

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.flex}
      >
        {/* Progress bar */}
        <View style={styles.progressContainer}>
          <View style={styles.progressTrack}>
            <LinearGradient
              colors={[colors.primary[400], colors.primary[600]]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={[styles.progressFill, { width: `${progress}%` }]}
            />
          </View>
          <Text style={styles.progressText}>{step + 1} of {TOTAL_STEPS}</Text>
        </View>

        {/* Step content */}
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {renderStep()}
        </ScrollView>

        {/* Navigation buttons */}
        <View style={styles.navButtons}>
          {step > 0 && (
            <GradientButton
              title="Back"
              onPress={goBack}
              variant="outline"
              size="md"
              style={styles.backButton}
            />
          )}
          <GradientButton
            title={step === TOTAL_STEPS - 1 ? 'See My Results' : 'Continue'}
            onPress={goNext}
            size="md"
            style={styles.nextButton}
            icon={
              step === TOTAL_STEPS - 1 ? (
                <Ionicons name="sparkles" size={18} color={colors.neutral[0]} />
              ) : undefined
            }
          />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ─── Styles ────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.neutral[0],
  },
  flex: {
    flex: 1,
  },
  progressContainer: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.base,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  progressTrack: {
    flex: 1,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.neutral[100],
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  progressText: {
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.semibold,
    color: colors.neutral[400],
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing['2xl'],
    paddingBottom: spacing['3xl'],
  },
  stepContent: {
    flex: 1,
  },
  stepEmoji: {
    fontSize: 48,
    marginBottom: spacing.base,
  },
  stepTitle: {
    fontSize: typography.fontSize['2xl'],
    fontWeight: typography.fontWeight.extrabold,
    color: colors.neutral[900],
    marginBottom: spacing.sm,
    lineHeight: typography.fontSize['2xl'] * 1.2,
  },
  stepSubtitle: {
    fontSize: typography.fontSize.base,
    color: colors.neutral[500],
    lineHeight: typography.fontSize.base * 1.5,
    marginBottom: spacing.xl,
  },
  sectionLabel: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.bold,
    color: colors.neutral[700],
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: spacing.md,
    marginTop: spacing.sm,
  },
  textInput: {
    backgroundColor: colors.neutral[50],
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.base,
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.medium,
    color: colors.neutral[800],
    borderWidth: 2,
    borderColor: colors.neutral[200],
  },
  chipGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.neutral[50],
    borderRadius: borderRadius.lg,
    padding: spacing.base,
    marginBottom: spacing.sm,
    borderWidth: 2,
    borderColor: colors.neutral[200],
  },
  optionCardSelected: {
    borderColor: colors.primary[400],
    backgroundColor: colors.primary[50],
  },
  optionIcon: {
    fontSize: 28,
    marginRight: spacing.md,
  },
  optionText: {
    flex: 1,
  },
  optionLabel: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.bold,
    color: colors.neutral[700],
  },
  optionLabelSelected: {
    color: colors.primary[600],
  },
  optionDescription: {
    fontSize: typography.fontSize.xs,
    color: colors.neutral[400],
    marginTop: 2,
  },
  toneGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 12,
  },
  toneOption: {
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    borderWidth: 2,
    borderColor: 'transparent',
    width: 90,
  },
  toneOptionSelected: {
    borderColor: colors.primary[400],
    backgroundColor: colors.primary[50],
  },
  toneCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginBottom: spacing.sm,
    borderWidth: 2,
    borderColor: 'rgba(0,0,0,0.08)',
  },
  toneLabel: {
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.semibold,
    color: colors.neutral[600],
  },
  toneLabelSelected: {
    color: colors.primary[600],
  },
  navButtons: {
    flexDirection: 'row',
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing['2xl'],
    paddingTop: spacing.base,
    gap: 12,
  },
  backButton: {
    flex: 0.4,
  },
  nextButton: {
    flex: 1,
  },
});
