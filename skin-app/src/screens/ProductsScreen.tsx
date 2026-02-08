/**
 * Glow AI — Products Screen
 *
 * Curated product recommendations based on user profile and analysis.
 * Filterable by category, with match scoring.
 */

import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  SafeAreaView,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

import { colors, typography, spacing, borderRadius, shadows } from '../theme';
import ProductCard from '../components/ProductCard';
import { useAppStore } from '../services/store';
import { getRecommendations, getRecommendationsByCategory } from '../services/recommendations';
import { ProductCategory, ProductRecommendation } from '../types';

type FilterCategory = 'all' | ProductCategory;

const FILTER_OPTIONS: { value: FilterCategory; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'cleanser', label: 'Cleansers' },
  { value: 'toner', label: 'Toners' },
  { value: 'serum', label: 'Serums' },
  { value: 'moisturizer', label: 'Moisturisers' },
  { value: 'sunscreen', label: 'SPF' },
  { value: 'eye-cream', label: 'Eye Care' },
  { value: 'exfoliant', label: 'Exfoliants' },
  { value: 'mask', label: 'Masks' },
  { value: 'spot-treatment', label: 'Spot Treatments' },
];

export default function ProductsScreen() {
  const { userProfile, currentAnalysis } = useAppStore();
  const [activeFilter, setActiveFilter] = useState<FilterCategory>('all');

  const concerns = userProfile?.concerns ?? [];

  const recommendations = useMemo<ProductRecommendation[]>(() => {
    if (activeFilter === 'all') {
      return getRecommendations(concerns, userProfile ?? undefined, currentAnalysis ?? undefined, 30);
    }
    return getRecommendationsByCategory(
      activeFilter,
      concerns,
      userProfile ?? undefined,
      currentAnalysis ?? undefined
    );
  }, [activeFilter, concerns, userProfile, currentAnalysis]);

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Product Picks</Text>
        <Text style={styles.headerSubtitle}>
          Curated recommendations matched to your skin
        </Text>
      </View>

      {/* Filter Chips */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.filterScroll}
        contentContainerStyle={styles.filterContent}
      >
        {FILTER_OPTIONS.map((opt) => (
          <TouchableOpacity
            key={opt.value}
            style={[
              styles.filterChip,
              activeFilter === opt.value && styles.filterChipActive,
            ]}
            onPress={() => setActiveFilter(opt.value)}
            activeOpacity={0.7}
          >
            <Text
              style={[
                styles.filterChipText,
                activeFilter === opt.value && styles.filterChipTextActive,
              ]}
            >
              {opt.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Results Count */}
      <View style={styles.resultsHeader}>
        <Text style={styles.resultsCount}>
          {recommendations.length} product{recommendations.length !== 1 ? 's' : ''} found
        </Text>
        <View style={styles.sortIndicator}>
          <Ionicons name="sparkles" size={14} color={colors.primary[500]} />
          <Text style={styles.sortText}>Best match</Text>
        </View>
      </View>

      {/* Product List */}
      <FlatList
        data={recommendations}
        keyExtractor={(item) => item.product.id}
        renderItem={({ item }) => <ProductCard recommendation={item} />}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="search" size={36} color={colors.neutral[300]} />
            <Text style={styles.emptyTitle}>No products found</Text>
            <Text style={styles.emptyText}>
              Try selecting a different category or update your skin profile for better matches.
            </Text>
          </View>
        }
      />
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

  // Filters
  filterScroll: {
    marginTop: spacing.base,
    maxHeight: 48,
  },
  filterContent: {
    paddingHorizontal: spacing.lg,
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: borderRadius.full,
    backgroundColor: colors.neutral[100],
    borderWidth: 1,
    borderColor: colors.neutral[200],
  },
  filterChipActive: {
    backgroundColor: colors.primary[500],
    borderColor: colors.primary[500],
  },
  filterChipText: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semibold,
    color: colors.neutral[600],
  },
  filterChipTextActive: {
    color: colors.neutral[0],
  },

  // Results Header
  resultsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.base,
    paddingBottom: spacing.sm,
  },
  resultsCount: {
    fontSize: typography.fontSize.sm,
    color: colors.neutral[500],
    fontWeight: typography.fontWeight.medium,
  },
  sortIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  sortText: {
    fontSize: typography.fontSize.xs,
    color: colors.primary[500],
    fontWeight: typography.fontWeight.semibold,
  },

  // List
  listContent: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing['5xl'],
  },

  // Empty State
  emptyState: {
    alignItems: 'center',
    paddingVertical: spacing['4xl'],
    paddingHorizontal: spacing.xl,
  },
  emptyTitle: {
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.bold,
    color: colors.neutral[700],
    marginTop: spacing.md,
  },
  emptyText: {
    fontSize: typography.fontSize.sm,
    color: colors.neutral[400],
    textAlign: 'center',
    marginTop: spacing.sm,
    lineHeight: typography.fontSize.sm * 1.5,
  },
});
