/**
 * Glow AI — Home Dashboard Screen
 *
 * Main landing screen after onboarding. Shows greeting, quick stats,
 * latest analysis summary, daily routine reminder, and product picks.
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  TouchableOpacity,
  FlatList,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';

import { colors, typography, spacing, borderRadius, shadows } from '../theme';
import GradientButton from '../components/GradientButton';
import ProductCard from '../components/ProductCard';
import { useAppStore } from '../services/store';
import { getRecommendations } from '../services/recommendations';

export default function HomeScreen() {
  const navigation = useNavigation();
  const { userProfile, currentAnalysis, analysisHistory, activeRoutine } = useAppStore();

  const name = userProfile?.name ?? 'Beautiful';
  const greeting = getGreeting();

  const topRecommendations = getRecommendations(
    userProfile?.concerns ?? [],
    userProfile ?? undefined,
    currentAnalysis ?? undefined,
    4
  );

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <LinearGradient
          colors={[colors.primary[50], colors.neutral[0]]}
          style={styles.heroSection}
        >
          <View style={styles.headerRow}>
            <View>
              <Text style={styles.greeting}>{greeting}</Text>
              <Text style={styles.name}>{name}</Text>
            </View>
            <TouchableOpacity
              style={styles.avatarCircle}
              onPress={() => navigation.navigate('Profile' as never)}
            >
              <Ionicons name="person" size={22} color={colors.primary[500]} />
            </TouchableOpacity>
          </View>

          {/* Quick Scan CTA */}
          <TouchableOpacity
            style={[styles.scanCta, shadows.md]}
            onPress={() => navigation.navigate('Scan' as never)}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={[colors.primary[400], colors.secondary[500]]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.scanCtaGradient}
            >
              <View style={styles.scanCtaContent}>
                <View>
                  <Text style={styles.scanCtaTitle}>Scan Your Skin</Text>
                  <Text style={styles.scanCtaSubtitle}>
                    Get AI-powered analysis in seconds
                  </Text>
                </View>
                <View style={styles.scanCtaIcon}>
                  <Ionicons name="scan-circle" size={40} color="rgba(255,255,255,0.9)" />
                </View>
              </View>
            </LinearGradient>
          </TouchableOpacity>
        </LinearGradient>

        {/* Latest Analysis Summary */}
        {currentAnalysis && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Latest Analysis</Text>
              <TouchableOpacity>
                <Text style={styles.seeAll}>View Details</Text>
              </TouchableOpacity>
            </View>

            <View style={[styles.analysisCard, shadows.sm]}>
              <View style={styles.analysisScoreRow}>
                <View style={styles.analysisMiniScore}>
                  <Text style={styles.analysisMiniScoreValue}>
                    {currentAnalysis.overallScore}
                  </Text>
                  <Text style={styles.analysisMiniScoreLabel}>Score</Text>
                </View>

                <View style={styles.analysisQuickMetrics}>
                  {[
                    { label: 'Hydration', value: currentAnalysis.metrics.hydration, color: colors.skin.hydration },
                    { label: 'Texture', value: currentAnalysis.metrics.texture, color: colors.skin.texture },
                    { label: 'Radiance', value: currentAnalysis.metrics.radiance, color: colors.accent[400] },
                  ].map((m, i) => (
                    <View key={i} style={styles.quickMetric}>
                      <Text style={styles.quickMetricValue}>{Math.round(m.value)}%</Text>
                      <View style={styles.quickMetricBarTrack}>
                        <View
                          style={[
                            styles.quickMetricBarFill,
                            { width: `${m.value}%`, backgroundColor: m.color },
                          ]}
                        />
                      </View>
                      <Text style={styles.quickMetricLabel}>{m.label}</Text>
                    </View>
                  ))}
                </View>
              </View>

              {currentAnalysis.concerns.length > 0 && (
                <View style={styles.analysisConcerns}>
                  <Text style={styles.analysisConcernsLabel}>Top Concerns:</Text>
                  <Text style={styles.analysisConcernsText}>
                    {currentAnalysis.concerns
                      .slice(0, 3)
                      .map((c) => c.type.replace(/-/g, ' '))
                      .join(', ')}
                  </Text>
                </View>
              )}
            </View>
          </View>
        )}

        {/* No Analysis Yet CTA */}
        {!currentAnalysis && (
          <View style={styles.section}>
            <View style={[styles.emptyCard, shadows.sm]}>
              <Ionicons name="sparkles" size={36} color={colors.primary[300]} />
              <Text style={styles.emptyTitle}>No scan yet</Text>
              <Text style={styles.emptySubtitle}>
                Take your first skin scan to get personalised insights and product recommendations.
              </Text>
              <GradientButton
                title="Start Your First Scan"
                onPress={() => navigation.navigate('Scan' as never)}
                size="sm"
                style={{ marginTop: 12 }}
              />
            </View>
          </View>
        )}

        {/* Daily Routine Reminder */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Today's Routine</Text>
            <TouchableOpacity onPress={() => navigation.navigate('Routine' as never)}>
              <Text style={styles.seeAll}>Full Routine</Text>
            </TouchableOpacity>
          </View>

          <View style={[styles.routineCard, shadows.sm]}>
            {(activeRoutine?.routine ?? currentAnalysis?.routineSuggestion) ? (
              <>
                <View style={styles.routineTime}>
                  <Ionicons name="sunny" size={18} color={colors.accent[400]} />
                  <Text style={styles.routineTimeLabel}>Morning</Text>
                </View>
                {(activeRoutine?.routine?.morning ?? currentAnalysis?.routineSuggestion?.morning ?? [])
                  .slice(0, 3)
                  .map((step, i) => (
                    <View key={i} style={styles.routineStepRow}>
                      <View style={styles.routineStepNumber}>
                        <Text style={styles.routineStepNumberText}>{i + 1}</Text>
                      </View>
                      <Text style={styles.routineStepText}>{step.description}</Text>
                    </View>
                  ))}
                <Text style={styles.routineMoreText}>
                  +{' '}
                  {Math.max(
                    0,
                    (activeRoutine?.routine?.morning ?? currentAnalysis?.routineSuggestion?.morning ?? []).length - 3
                  )}{' '}
                  more steps
                </Text>
              </>
            ) : (
              <View style={styles.routineEmpty}>
                <Ionicons name="water-outline" size={28} color={colors.neutral[300]} />
                <Text style={styles.routineEmptyText}>
                  Complete a scan to get your personalised routine
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* Product Recommendations */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Picked For You</Text>
            <TouchableOpacity onPress={() => navigation.navigate('Products' as never)}>
              <Text style={styles.seeAll}>See All</Text>
            </TouchableOpacity>
          </View>

          <FlatList
            data={topRecommendations}
            horizontal
            showsHorizontalScrollIndicator={false}
            keyExtractor={(item) => item.product.id}
            renderItem={({ item }) => (
              <ProductCard recommendation={item} compact />
            )}
            contentContainerStyle={styles.productList}
          />
        </View>

        {/* Skin Tip of the Day */}
        <View style={styles.section}>
          <LinearGradient
            colors={[colors.mint[50], colors.mint[100]]}
            style={[styles.tipCard, shadows.sm]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <View style={styles.tipHeader}>
              <Ionicons name="bulb" size={20} color={colors.mint[600]} />
              <Text style={styles.tipLabel}>Daily Skin Tip</Text>
            </View>
            <Text style={styles.tipText}>
              Always apply skincare products from thinnest to thickest consistency.
              This helps each layer absorb properly and maximises their benefits.
            </Text>
          </LinearGradient>
        </View>

        {/* Scan History */}
        {analysisHistory.length > 1 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Scan History</Text>
            <View style={styles.historyRow}>
              {analysisHistory.slice(0, 4).map((analysis, i) => (
                <View key={i} style={[styles.historyItem, shadows.sm]}>
                  <Text style={styles.historyScore}>{analysis.overallScore}</Text>
                  <Text style={styles.historyDate}>
                    {analysis.timestamp.toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.neutral[50],
  },
  scrollContent: {
    paddingBottom: spacing['5xl'],
  },

  // Hero
  heroSection: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xl,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  greeting: {
    fontSize: typography.fontSize.base,
    color: colors.neutral[500],
    fontWeight: typography.fontWeight.medium,
  },
  name: {
    fontSize: typography.fontSize['2xl'],
    fontWeight: typography.fontWeight.extrabold,
    color: colors.neutral[900],
  },
  avatarCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primary[100],
    alignItems: 'center',
    justifyContent: 'center',
  },
  scanCta: {
    borderRadius: borderRadius.xl,
    overflow: 'hidden',
  },
  scanCtaGradient: {
    padding: spacing.lg,
  },
  scanCtaContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  scanCtaTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.bold,
    color: colors.neutral[0],
    marginBottom: 2,
  },
  scanCtaSubtitle: {
    fontSize: typography.fontSize.sm,
    color: 'rgba(255,255,255,0.8)',
  },
  scanCtaIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Sections
  section: {
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.lg,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  sectionTitle: {
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.extrabold,
    color: colors.neutral[900],
  },
  seeAll: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semibold,
    color: colors.primary[500],
  },

  // Analysis Card
  analysisCard: {
    backgroundColor: colors.neutral[0],
    borderRadius: borderRadius.lg,
    padding: spacing.base,
  },
  analysisScoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  analysisMiniScore: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.primary[50],
    alignItems: 'center',
    justifyContent: 'center',
  },
  analysisMiniScoreValue: {
    fontSize: typography.fontSize.xl,
    fontWeight: typography.fontWeight.extrabold,
    color: colors.primary[600],
  },
  analysisMiniScoreLabel: {
    fontSize: 9,
    color: colors.primary[400],
    fontWeight: typography.fontWeight.semibold,
  },
  analysisQuickMetrics: {
    flex: 1,
    gap: 6,
  },
  quickMetric: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  quickMetricValue: {
    width: 32,
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.bold,
    color: colors.neutral[700],
  },
  quickMetricBarTrack: {
    flex: 1,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.neutral[100],
    overflow: 'hidden',
  },
  quickMetricBarFill: {
    height: '100%',
    borderRadius: 2,
  },
  quickMetricLabel: {
    width: 56,
    fontSize: 10,
    color: colors.neutral[400],
  },
  analysisConcerns: {
    flexDirection: 'row',
    marginTop: spacing.md,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.neutral[100],
    gap: 4,
  },
  analysisConcernsLabel: {
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.semibold,
    color: colors.neutral[500],
  },
  analysisConcernsText: {
    fontSize: typography.fontSize.xs,
    color: colors.neutral[600],
    flex: 1,
  },

  // Empty State
  emptyCard: {
    backgroundColor: colors.neutral[0],
    borderRadius: borderRadius.lg,
    padding: spacing.xl,
    alignItems: 'center',
  },
  emptyTitle: {
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.bold,
    color: colors.neutral[700],
    marginTop: spacing.md,
  },
  emptySubtitle: {
    fontSize: typography.fontSize.sm,
    color: colors.neutral[400],
    textAlign: 'center',
    marginTop: spacing.xs,
    lineHeight: typography.fontSize.sm * 1.5,
  },

  // Routine Card
  routineCard: {
    backgroundColor: colors.neutral[0],
    borderRadius: borderRadius.lg,
    padding: spacing.base,
  },
  routineTime: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: spacing.md,
  },
  routineTimeLabel: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.bold,
    color: colors.neutral[700],
  },
  routineStepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: spacing.sm,
  },
  routineStepNumber: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.primary[100],
    alignItems: 'center',
    justifyContent: 'center',
  },
  routineStepNumberText: {
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.bold,
    color: colors.primary[600],
  },
  routineStepText: {
    flex: 1,
    fontSize: typography.fontSize.sm,
    color: colors.neutral[600],
  },
  routineMoreText: {
    fontSize: typography.fontSize.xs,
    color: colors.neutral[400],
    marginLeft: 34,
    marginTop: 2,
  },
  routineEmpty: {
    alignItems: 'center',
    paddingVertical: spacing.lg,
    gap: 8,
  },
  routineEmptyText: {
    fontSize: typography.fontSize.sm,
    color: colors.neutral[400],
    textAlign: 'center',
  },

  // Product list
  productList: {
    paddingRight: spacing.lg,
  },

  // Tip Card
  tipCard: {
    borderRadius: borderRadius.lg,
    padding: spacing.base,
  },
  tipHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: spacing.sm,
  },
  tipLabel: {
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.bold,
    color: colors.mint[700],
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  tipText: {
    fontSize: typography.fontSize.sm,
    color: colors.mint[800],
    lineHeight: typography.fontSize.sm * 1.5,
  },

  // History
  historyRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: spacing.sm,
  },
  historyItem: {
    flex: 1,
    backgroundColor: colors.neutral[0],
    borderRadius: borderRadius.md,
    padding: spacing.md,
    alignItems: 'center',
  },
  historyScore: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.extrabold,
    color: colors.primary[600],
  },
  historyDate: {
    fontSize: 10,
    color: colors.neutral[400],
    marginTop: 2,
  },
});
