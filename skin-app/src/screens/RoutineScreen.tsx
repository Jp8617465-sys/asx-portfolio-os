/**
 * Glow AI — Routine Screen
 *
 * Shows the user's personalised morning and evening skincare routine
 * with step-by-step guidance, product suggestions, and tips.
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  TouchableOpacity,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

import { colors, typography, spacing, borderRadius, shadows } from '../theme';
import GradientButton from '../components/GradientButton';
import { useAppStore } from '../services/store';
import { RoutineStep } from '../types';

type TimeTab = 'morning' | 'evening' | 'weekly';

export default function RoutineScreen() {
  const { currentAnalysis, activeRoutine, userProfile } = useAppStore();
  const [activeTab, setActiveTab] = useState<TimeTab>('morning');

  const routine = activeRoutine?.routine ?? currentAnalysis?.routineSuggestion;

  const hasRoutine = !!routine;

  const tabs: { key: TimeTab; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
    { key: 'morning', label: 'Morning', icon: 'sunny' },
    { key: 'evening', label: 'Evening', icon: 'moon' },
    { key: 'weekly', label: 'Weekly', icon: 'calendar' },
  ];

  const renderStep = (step: RoutineStep, index: number) => (
    <View key={index} style={[styles.stepCard, shadows.sm]}>
      <View style={styles.stepHeader}>
        <View style={styles.stepNumberCircle}>
          <Text style={styles.stepNumber}>{step.order}</Text>
        </View>
        <View style={styles.stepHeaderText}>
          <Text style={styles.stepCategory}>
            {step.category.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
          </Text>
          {step.isOptional && (
            <View style={styles.optionalBadge}>
              <Text style={styles.optionalText}>Optional</Text>
            </View>
          )}
        </View>
        <Text style={styles.stepDuration}>{step.duration}</Text>
      </View>

      <Text style={styles.stepDescription}>{step.description}</Text>

      {step.tips && (
        <View style={styles.tipBox}>
          <Ionicons name="bulb-outline" size={14} color={colors.accent[600]} />
          <Text style={styles.tipText}>{step.tips}</Text>
        </View>
      )}
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Your Routine</Text>
        <Text style={styles.headerSubtitle}>
          {hasRoutine
            ? 'Personalised for your skin type and concerns'
            : 'Complete a skin scan to get your routine'}
        </Text>
      </View>

      {/* Tab Bar */}
      <View style={styles.tabBar}>
        {tabs.map((tab) => (
          <TouchableOpacity
            key={tab.key}
            style={[styles.tab, activeTab === tab.key && styles.tabActive]}
            onPress={() => setActiveTab(tab.key)}
            activeOpacity={0.7}
          >
            <Ionicons
              name={tab.icon}
              size={18}
              color={activeTab === tab.key ? colors.primary[500] : colors.neutral[400]}
            />
            <Text
              style={[styles.tabLabel, activeTab === tab.key && styles.tabLabelActive]}
            >
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {!hasRoutine ? (
          <View style={styles.emptyState}>
            <View style={styles.emptyIcon}>
              <Ionicons name="water-outline" size={48} color={colors.primary[200]} />
            </View>
            <Text style={styles.emptyTitle}>No routine yet</Text>
            <Text style={styles.emptyText}>
              Take a skin scan first and we'll create a personalised morning and evening routine just for you.
            </Text>
            <GradientButton
              title="Start Skin Scan"
              onPress={() => {}}
              size="md"
              style={{ marginTop: 16 }}
            />
          </View>
        ) : activeTab === 'morning' ? (
          <>
            <LinearGradient
              colors={[colors.accent[50], 'transparent']}
              style={styles.timeHeader}
            >
              <Ionicons name="sunny" size={24} color={colors.accent[500]} />
              <View>
                <Text style={styles.timeTitle}>Morning Routine</Text>
                <Text style={styles.timeSubtitle}>
                  {routine.morning.length} steps — ~{routine.morning.length * 1} min
                </Text>
              </View>
            </LinearGradient>

            {routine.morning.map(renderStep)}
          </>
        ) : activeTab === 'evening' ? (
          <>
            <LinearGradient
              colors={[colors.secondary[50], 'transparent']}
              style={styles.timeHeader}
            >
              <Ionicons name="moon" size={24} color={colors.secondary[500]} />
              <View>
                <Text style={styles.timeTitle}>Evening Routine</Text>
                <Text style={styles.timeSubtitle}>
                  {routine.evening.length} steps — ~{routine.evening.length * 1.5} min
                </Text>
              </View>
            </LinearGradient>

            {routine.evening.map(renderStep)}
          </>
        ) : (
          <>
            <LinearGradient
              colors={[colors.mint[50], 'transparent']}
              style={styles.timeHeader}
            >
              <Ionicons name="calendar" size={24} color={colors.mint[600]} />
              <View>
                <Text style={styles.timeTitle}>Weekly Treatments</Text>
                <Text style={styles.timeSubtitle}>
                  Extra steps for enhanced results
                </Text>
              </View>
            </LinearGradient>

            {routine.weekly.map((treatment, i) => (
              <View key={i} style={[styles.weeklyCard, shadows.sm]}>
                <View style={styles.weeklyHeader}>
                  <Text style={styles.weeklyName}>{treatment.name}</Text>
                  <View style={styles.frequencyBadge}>
                    <Text style={styles.frequencyText}>{treatment.frequency}</Text>
                  </View>
                </View>
                <Text style={styles.weeklyDescription}>{treatment.description}</Text>
              </View>
            ))}
          </>
        )}

        {/* Pro Tips Section */}
        {hasRoutine && (
          <View style={styles.proTipsSection}>
            <Text style={styles.proTipsTitle}>Pro Tips</Text>
            <View style={styles.proTip}>
              <Ionicons name="time-outline" size={16} color={colors.secondary[500]} />
              <Text style={styles.proTipText}>
                Wait 1-2 minutes between each step to let products absorb properly.
              </Text>
            </View>
            <View style={styles.proTip}>
              <Ionicons name="hand-left-outline" size={16} color={colors.secondary[500]} />
              <Text style={styles.proTipText}>
                Use upward motions when applying products to prevent tugging the skin.
              </Text>
            </View>
            <View style={styles.proTip}>
              <Ionicons name="refresh-outline" size={16} color={colors.secondary[500]} />
              <Text style={styles.proTipText}>
                Consistency beats perfection. Even doing 3 steps daily is better than a full routine once a week.
              </Text>
            </View>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.neutral[50],
  },
  header: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
  },
  headerTitle: {
    fontSize: typography.fontSize['2xl'],
    fontWeight: typography.fontWeight.extrabold,
    color: colors.neutral[900],
  },
  headerSubtitle: {
    fontSize: typography.fontSize.sm,
    color: colors.neutral[500],
    marginTop: 2,
  },

  // Tab Bar
  tabBar: {
    flexDirection: 'row',
    marginHorizontal: spacing.lg,
    marginTop: spacing.lg,
    backgroundColor: colors.neutral[100],
    borderRadius: borderRadius.lg,
    padding: 4,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    gap: 6,
  },
  tabActive: {
    backgroundColor: colors.neutral[0],
    ...shadows.sm,
  },
  tabLabel: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semibold,
    color: colors.neutral[400],
  },
  tabLabelActive: {
    color: colors.primary[500],
  },

  scrollContent: {
    padding: spacing.lg,
    paddingBottom: spacing['5xl'],
  },

  // Time Header
  timeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: borderRadius.lg,
    padding: spacing.base,
    marginBottom: spacing.base,
  },
  timeTitle: {
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.bold,
    color: colors.neutral[800],
  },
  timeSubtitle: {
    fontSize: typography.fontSize.xs,
    color: colors.neutral[500],
    marginTop: 1,
  },

  // Step Card
  stepCard: {
    backgroundColor: colors.neutral[0],
    borderRadius: borderRadius.lg,
    padding: spacing.base,
    marginBottom: spacing.md,
  },
  stepHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  stepNumberCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.primary[100],
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
  },
  stepNumber: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.bold,
    color: colors.primary[600],
  },
  stepHeaderText: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  stepCategory: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.bold,
    color: colors.neutral[700],
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  optionalBadge: {
    backgroundColor: colors.neutral[100],
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: borderRadius.full,
  },
  optionalText: {
    fontSize: 9,
    color: colors.neutral[400],
    fontWeight: typography.fontWeight.semibold,
  },
  stepDuration: {
    fontSize: typography.fontSize.xs,
    color: colors.neutral[400],
    fontWeight: typography.fontWeight.medium,
  },
  stepDescription: {
    fontSize: typography.fontSize.base,
    color: colors.neutral[800],
    lineHeight: typography.fontSize.base * 1.4,
    marginBottom: spacing.sm,
  },
  tipBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: colors.accent[50],
    borderRadius: borderRadius.md,
    padding: spacing.sm,
    gap: 6,
  },
  tipText: {
    flex: 1,
    fontSize: typography.fontSize.xs,
    color: colors.accent[700],
    lineHeight: typography.fontSize.xs * 1.4,
  },

  // Weekly Cards
  weeklyCard: {
    backgroundColor: colors.neutral[0],
    borderRadius: borderRadius.lg,
    padding: spacing.base,
    marginBottom: spacing.md,
  },
  weeklyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  weeklyName: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.bold,
    color: colors.neutral[800],
  },
  frequencyBadge: {
    backgroundColor: colors.mint[50],
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: borderRadius.full,
  },
  frequencyText: {
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.semibold,
    color: colors.mint[700],
  },
  weeklyDescription: {
    fontSize: typography.fontSize.sm,
    color: colors.neutral[600],
    lineHeight: typography.fontSize.sm * 1.5,
  },

  // Empty State
  emptyState: {
    alignItems: 'center',
    paddingVertical: spacing['4xl'],
  },
  emptyIcon: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: colors.primary[50],
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  emptyTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.bold,
    color: colors.neutral[700],
  },
  emptyText: {
    fontSize: typography.fontSize.sm,
    color: colors.neutral[400],
    textAlign: 'center',
    marginTop: spacing.sm,
    lineHeight: typography.fontSize.sm * 1.5,
    maxWidth: 280,
  },

  // Pro Tips
  proTipsSection: {
    marginTop: spacing.lg,
    backgroundColor: colors.secondary[50],
    borderRadius: borderRadius.lg,
    padding: spacing.base,
  },
  proTipsTitle: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.bold,
    color: colors.secondary[700],
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: spacing.md,
  },
  proTip: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginBottom: spacing.md,
  },
  proTipText: {
    flex: 1,
    fontSize: typography.fontSize.sm,
    color: colors.secondary[800],
    lineHeight: typography.fontSize.sm * 1.4,
  },
});
