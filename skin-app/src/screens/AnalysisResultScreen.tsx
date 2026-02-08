/**
 * Glow AI — Analysis Result Screen
 *
 * Displays comprehensive skin analysis results with metrics,
 * detected concerns, and personalised recommendations.
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  Image,
  TouchableOpacity,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';

import { colors, typography, spacing, borderRadius, shadows } from '../theme';
import GradientButton from '../components/GradientButton';
import MetricBar from '../components/MetricBar';
import ConcernChip from '../components/ConcernChip';
import { useAppStore } from '../services/store';

export default function AnalysisResultScreen() {
  const navigation = useNavigation();
  const { currentAnalysis, userProfile } = useAppStore();

  if (!currentAnalysis) {
    return (
      <SafeAreaView style={styles.container}>
        <Text style={styles.errorText}>No analysis data available.</Text>
      </SafeAreaView>
    );
  }

  const {
    overallScore,
    skinToneDetected,
    skinTypeDetected,
    concerns,
    metrics,
    recommendations,
    imageUri,
  } = currentAnalysis;

  const scoreColor =
    overallScore >= 75
      ? colors.success
      : overallScore >= 50
      ? colors.accent[500]
      : colors.error;

  const scoreLabel =
    overallScore >= 80
      ? 'Excellent'
      : overallScore >= 65
      ? 'Great'
      : overallScore >= 50
      ? 'Good'
      : overallScore >= 35
      ? 'Fair'
      : 'Needs Attention';

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={24} color={colors.neutral[700]} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Your Results</Text>
          <View style={{ width: 32 }} />
        </View>

        {/* Score Card */}
        <LinearGradient
          colors={[colors.primary[50], colors.secondary[50]]}
          style={[styles.scoreCard, shadows.md]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <View style={styles.scoreRow}>
            {imageUri && (
              <Image source={{ uri: imageUri }} style={styles.thumbnail} />
            )}
            <View style={styles.scoreInfo}>
              <Text style={styles.scoreLabel}>Overall Skin Health</Text>
              <View style={styles.scoreValueRow}>
                <Text style={[styles.scoreValue, { color: scoreColor }]}>
                  {overallScore}
                </Text>
                <Text style={styles.scoreMax}>/100</Text>
              </View>
              <Text style={[styles.scoreBadge, { color: scoreColor }]}>
                {scoreLabel}
              </Text>
            </View>
          </View>

          <View style={styles.quickStats}>
            <View style={styles.quickStat}>
              <Text style={styles.quickStatLabel}>Skin Type</Text>
              <Text style={styles.quickStatValue}>
                {skinTypeDetected.charAt(0).toUpperCase() + skinTypeDetected.slice(1)}
              </Text>
            </View>
            <View style={styles.quickStatDivider} />
            <View style={styles.quickStat}>
              <Text style={styles.quickStatLabel}>Skin Tone</Text>
              <Text style={styles.quickStatValue}>
                {skinToneDetected.charAt(0).toUpperCase() + skinToneDetected.slice(1)}
              </Text>
            </View>
            <View style={styles.quickStatDivider} />
            <View style={styles.quickStat}>
              <Text style={styles.quickStatLabel}>Concerns</Text>
              <Text style={styles.quickStatValue}>{concerns.length} found</Text>
            </View>
          </View>
        </LinearGradient>

        {/* Skin Metrics */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Skin Metrics</Text>
          <Text style={styles.sectionSubtitle}>Detailed breakdown of your skin health</Text>

          <View style={[styles.metricsCard, shadows.sm]}>
            <MetricBar label="Hydration" value={metrics.hydration} color={colors.skin.hydration} />
            <MetricBar label="Oil Balance" value={100 - Math.abs(metrics.oiliness - 45) * 1.8} color={colors.skin.oiliness} />
            <MetricBar label="Texture" value={metrics.texture} color={colors.skin.texture} />
            <MetricBar label="Radiance" value={metrics.radiance} color={colors.accent[400]} />
            <MetricBar label="Elasticity" value={metrics.elasticity} color={colors.skin.elasticity} />
            <MetricBar label="Even Tone" value={metrics.pigmentation} color={colors.skin.pigmentation} />
            <MetricBar label="Pore Size" value={metrics.poreSize} color={colors.mint[500]} />
            <MetricBar label="Sensitivity" value={100 - metrics.sensitivity} color={colors.skin.sensitivity} />
          </View>
        </View>

        {/* Detected Concerns */}
        {concerns.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Detected Concerns</Text>
            <Text style={styles.sectionSubtitle}>
              Areas we identified for improvement
            </Text>

            {concerns.map((concern, i) => (
              <View key={i} style={[styles.concernCard, shadows.sm]}>
                <View style={styles.concernHeader}>
                  <Text style={styles.concernTitle}>
                    {concern.type.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
                  </Text>
                  <ConcernChip
                    label={concern.severity}
                    selected={false}
                    onPress={() => {}}
                    variant="severity"
                    severity={concern.severity}
                  />
                </View>

                <Text style={styles.concernDescription}>{concern.description}</Text>

                <View style={styles.concernConfidence}>
                  <Ionicons name="analytics" size={14} color={colors.secondary[500]} />
                  <Text style={styles.concernConfidenceText}>
                    {Math.round(concern.confidence * 100)}% confidence
                  </Text>
                </View>

                <View style={styles.concernRecommendation}>
                  <Ionicons name="bulb-outline" size={16} color={colors.accent[500]} />
                  <Text style={styles.concernRecText}>{concern.recommendation}</Text>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Top Recommendations */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Our Recommendations</Text>
          <Text style={styles.sectionSubtitle}>
            Personalised advice based on your analysis
          </Text>

          {recommendations.map((rec, i) => (
            <View key={i} style={[styles.recCard, shadows.sm]}>
              <View style={styles.recIcon}>
                <Ionicons
                  name={
                    i === 0 ? 'star' : i === 1 ? 'sunny' : i === 2 ? 'shield-checkmark' : 'leaf'
                  }
                  size={20}
                  color={colors.primary[500]}
                />
              </View>
              <Text style={styles.recText}>{rec}</Text>
            </View>
          ))}
        </View>

        {/* CTA Buttons */}
        <View style={styles.ctaSection}>
          <GradientButton
            title="View My Routine"
            onPress={() => navigation.navigate('MainTabs' as never)}
            size="lg"
            icon={<Ionicons name="water" size={20} color={colors.neutral[0]} />}
            style={styles.ctaButton}
          />

          <GradientButton
            title="See Product Picks"
            onPress={() => navigation.navigate('MainTabs' as never)}
            variant="outline"
            size="md"
            style={styles.ctaButton}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.neutral[50],
  },
  scrollContent: {
    paddingBottom: spacing['5xl'],
  },
  errorText: {
    padding: spacing.xl,
    fontSize: typography.fontSize.base,
    color: colors.neutral[500],
    textAlign: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.base,
    paddingTop: spacing.base,
    paddingBottom: spacing.sm,
  },
  backBtn: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.bold,
    color: colors.neutral[800],
  },

  // Score Card
  scoreCard: {
    marginHorizontal: spacing.base,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },
  scoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  thumbnail: {
    width: 72,
    height: 72,
    borderRadius: borderRadius.lg,
    marginRight: spacing.base,
  },
  scoreInfo: {
    flex: 1,
  },
  scoreLabel: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semibold,
    color: colors.neutral[500],
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  scoreValueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  scoreValue: {
    fontSize: typography.fontSize['4xl'],
    fontWeight: typography.fontWeight.extrabold,
  },
  scoreMax: {
    fontSize: typography.fontSize.lg,
    color: colors.neutral[400],
    fontWeight: typography.fontWeight.medium,
    marginLeft: 2,
  },
  scoreBadge: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.bold,
  },
  quickStats: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.06)',
    paddingTop: spacing.md,
  },
  quickStat: {
    flex: 1,
    alignItems: 'center',
  },
  quickStatLabel: {
    fontSize: typography.fontSize.xs,
    color: colors.neutral[400],
    marginBottom: 2,
  },
  quickStatValue: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.bold,
    color: colors.neutral[800],
  },
  quickStatDivider: {
    width: 1,
    backgroundColor: 'rgba(0,0,0,0.06)',
  },

  // Sections
  section: {
    paddingHorizontal: spacing.base,
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.extrabold,
    color: colors.neutral[900],
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: typography.fontSize.sm,
    color: colors.neutral[500],
    marginBottom: spacing.base,
  },

  // Metrics Card
  metricsCard: {
    backgroundColor: colors.neutral[0],
    borderRadius: borderRadius.lg,
    padding: spacing.base,
  },

  // Concern Cards
  concernCard: {
    backgroundColor: colors.neutral[0],
    borderRadius: borderRadius.lg,
    padding: spacing.base,
    marginBottom: spacing.md,
  },
  concernHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  concernTitle: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.bold,
    color: colors.neutral[800],
  },
  concernDescription: {
    fontSize: typography.fontSize.sm,
    color: colors.neutral[600],
    lineHeight: typography.fontSize.sm * 1.5,
    marginBottom: spacing.sm,
  },
  concernConfidence: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: spacing.sm,
  },
  concernConfidenceText: {
    fontSize: typography.fontSize.xs,
    color: colors.secondary[500],
    fontWeight: typography.fontWeight.semibold,
  },
  concernRecommendation: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: colors.accent[50],
    borderRadius: borderRadius.md,
    padding: spacing.md,
  },
  concernRecText: {
    flex: 1,
    fontSize: typography.fontSize.sm,
    color: colors.accent[800],
    lineHeight: typography.fontSize.sm * 1.4,
  },

  // Recommendation Cards
  recCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: colors.neutral[0],
    borderRadius: borderRadius.md,
    padding: spacing.base,
    marginBottom: spacing.sm,
    gap: 12,
  },
  recIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.primary[50],
    alignItems: 'center',
    justifyContent: 'center',
  },
  recText: {
    flex: 1,
    fontSize: typography.fontSize.sm,
    color: colors.neutral[700],
    lineHeight: typography.fontSize.sm * 1.5,
  },

  // CTA
  ctaSection: {
    paddingHorizontal: spacing.base,
    gap: 12,
  },
  ctaButton: {
    width: '100%',
  },
});
