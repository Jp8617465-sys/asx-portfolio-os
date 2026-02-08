/**
 * Glow AI — Profile & Settings Screen
 *
 * User profile overview, skin profile details, preferences,
 * journal, and app settings.
 */

import React from 'react';
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
import { useAppStore } from '../services/store';

export default function ProfileScreen() {
  const { userProfile, analysisHistory, journalEntries } = useAppStore();

  if (!userProfile) {
    return (
      <SafeAreaView style={styles.container}>
        <Text style={styles.loadingText}>Loading profile...</Text>
      </SafeAreaView>
    );
  }

  const {
    name,
    age,
    skinType,
    skinTone,
    concerns,
    preferences,
  } = userProfile;

  const stats = [
    { label: 'Scans', value: analysisHistory.length.toString(), icon: 'scan-circle' as const },
    { label: 'Journal', value: journalEntries.length.toString(), icon: 'book' as const },
    { label: 'Streak', value: '0 days', icon: 'flame' as const },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* Profile Header */}
        <LinearGradient
          colors={[colors.primary[50], colors.secondary[50], colors.neutral[0]]}
          style={styles.heroSection}
        >
          <View style={styles.avatarContainer}>
            <LinearGradient
              colors={[colors.primary[400], colors.secondary[500]]}
              style={styles.avatar}
            >
              <Text style={styles.avatarText}>
                {name.charAt(0).toUpperCase()}
              </Text>
            </LinearGradient>
          </View>

          <Text style={styles.userName}>{name}</Text>
          <Text style={styles.userMeta}>
            {age} | {skinType.charAt(0).toUpperCase() + skinType.slice(1)} Skin | {skinTone.charAt(0).toUpperCase() + skinTone.slice(1)} Tone
          </Text>

          {/* Stats Row */}
          <View style={styles.statsRow}>
            {stats.map((stat, i) => (
              <View key={i} style={styles.statItem}>
                <Ionicons name={stat.icon} size={20} color={colors.primary[500]} />
                <Text style={styles.statValue}>{stat.value}</Text>
                <Text style={styles.statLabel}>{stat.label}</Text>
              </View>
            ))}
          </View>
        </LinearGradient>

        {/* Skin Profile Card */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Skin Profile</Text>

          <View style={[styles.card, shadows.sm]}>
            <ProfileRow icon="water" label="Skin Type" value={skinType} />
            <ProfileRow icon="color-palette" label="Skin Tone" value={skinTone} />
            <ProfileRow
              icon="alert-circle"
              label="Concerns"
              value={concerns.length > 0 ? concerns.map(c => c.replace(/-/g, ' ')).join(', ') : 'None set'}
            />
          </View>
        </View>

        {/* Preferences Card */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Preferences</Text>

          <View style={[styles.card, shadows.sm]}>
            <ProfileRow
              icon="wallet"
              label="Budget"
              value={preferences.budgetRange.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
            />
            <ProfileRow
              icon="leaf"
              label="Natural / Clean"
              value={preferences.preferNatural ? 'Yes' : 'No preference'}
            />
            <ProfileRow
              icon="paw"
              label="Cruelty-Free"
              value={preferences.preferCrueltyFree ? 'Yes' : 'No preference'}
            />
            <ProfileRow
              icon="flower"
              label="Vegan"
              value={preferences.preferVegan ? 'Yes' : 'No preference'}
            />
            <ProfileRow
              icon="nose"
              label="Fragrance-Free"
              value={preferences.preferFragranceFree ? 'Yes' : 'No preference'}
            />
          </View>
        </View>

        {/* Style Preferences */}
        {preferences.stylePreferences.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Style Vibes</Text>
            <View style={styles.styleChips}>
              {preferences.stylePreferences.map((style, i) => (
                <View key={i} style={styles.styleChip}>
                  <Text style={styles.styleChipText}>
                    {style.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Settings */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Settings</Text>

          <View style={[styles.card, shadows.sm]}>
            <SettingsRow icon="notifications" label="Notifications" />
            <SettingsRow icon="shield-checkmark" label="Privacy" />
            <SettingsRow icon="help-circle" label="Help & Support" />
            <SettingsRow icon="star" label="Rate Glow AI" />
            <SettingsRow icon="share-social" label="Share with Friends" />
            <SettingsRow icon="information-circle" label="About" />
          </View>
        </View>

        {/* Disclaimer */}
        <View style={styles.disclaimer}>
          <Ionicons name="medical" size={16} color={colors.neutral[400]} />
          <Text style={styles.disclaimerText}>
            Glow AI provides general skincare guidance and is not a substitute for professional
            dermatological advice. If you have persistent skin concerns, please consult a
            dermatologist.
          </Text>
        </View>

        <Text style={styles.version}>Glow AI v1.0.0</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Sub-components ────────────────────────────────────────────

function ProfileRow({
  icon,
  label,
  value,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
}) {
  return (
    <View style={rowStyles.container}>
      <Ionicons name={icon} size={18} color={colors.primary[400]} />
      <Text style={rowStyles.label}>{label}</Text>
      <Text style={rowStyles.value} numberOfLines={2}>
        {value.charAt(0).toUpperCase() + value.slice(1)}
      </Text>
    </View>
  );
}

function SettingsRow({
  icon,
  label,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
}) {
  return (
    <TouchableOpacity style={rowStyles.container} activeOpacity={0.6}>
      <Ionicons name={icon} size={18} color={colors.neutral[500]} />
      <Text style={[rowStyles.label, { flex: 1 }]}>{label}</Text>
      <Ionicons name="chevron-forward" size={16} color={colors.neutral[300]} />
    </TouchableOpacity>
  );
}

// ─── Styles ────────────────────────────────────────────────────

const rowStyles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral[100],
  },
  label: {
    fontSize: typography.fontSize.sm,
    color: colors.neutral[600],
    fontWeight: typography.fontWeight.medium,
  },
  value: {
    fontSize: typography.fontSize.sm,
    color: colors.neutral[800],
    fontWeight: typography.fontWeight.semibold,
    textAlign: 'right',
    flex: 1,
  },
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.neutral[50],
  },
  scrollContent: {
    paddingBottom: spacing['5xl'],
  },
  loadingText: {
    padding: spacing.xl,
    textAlign: 'center',
    color: colors.neutral[500],
  },

  // Hero
  heroSection: {
    alignItems: 'center',
    paddingTop: spacing['2xl'],
    paddingBottom: spacing.xl,
    paddingHorizontal: spacing.lg,
  },
  avatarContainer: {
    marginBottom: spacing.base,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.glow,
  },
  avatarText: {
    fontSize: typography.fontSize['2xl'],
    fontWeight: typography.fontWeight.extrabold,
    color: colors.neutral[0],
  },
  userName: {
    fontSize: typography.fontSize.xl,
    fontWeight: typography.fontWeight.extrabold,
    color: colors.neutral[900],
  },
  userMeta: {
    fontSize: typography.fontSize.sm,
    color: colors.neutral[500],
    marginTop: 4,
  },
  statsRow: {
    flexDirection: 'row',
    marginTop: spacing.xl,
    gap: 24,
  },
  statItem: {
    alignItems: 'center',
    gap: 2,
  },
  statValue: {
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.extrabold,
    color: colors.neutral[800],
  },
  statLabel: {
    fontSize: typography.fontSize.xs,
    color: colors.neutral[400],
  },

  // Sections
  section: {
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.extrabold,
    color: colors.neutral[900],
    marginBottom: spacing.md,
  },
  card: {
    backgroundColor: colors.neutral[0],
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.xs,
  },

  // Style Chips
  styleChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  styleChip: {
    backgroundColor: colors.secondary[50],
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: borderRadius.full,
  },
  styleChipText: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semibold,
    color: colors.secondary[700],
  },

  // Disclaimer
  disclaimer: {
    flexDirection: 'row',
    paddingHorizontal: spacing.lg,
    gap: 8,
    marginTop: spacing.lg,
    marginBottom: spacing.base,
  },
  disclaimerText: {
    flex: 1,
    fontSize: typography.fontSize.xs,
    color: colors.neutral[400],
    lineHeight: typography.fontSize.xs * 1.5,
  },

  version: {
    textAlign: 'center',
    fontSize: typography.fontSize.xs,
    color: colors.neutral[300],
    marginBottom: spacing.xl,
  },
});
