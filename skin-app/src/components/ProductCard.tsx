/**
 * Product recommendation card component
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ProductRecommendation } from '../types';
import { colors, typography, borderRadius, shadows, spacing } from '../theme';

interface ProductCardProps {
  recommendation: ProductRecommendation;
  onPress?: () => void;
  compact?: boolean;
}

export default function ProductCard({ recommendation, onPress, compact }: ProductCardProps) {
  const { product, matchScore, matchReasons } = recommendation;

  const priceRangeLabel: Record<string, string> = {
    budget: '$',
    'mid-range': '$$',
    premium: '$$$',
    luxury: '$$$$',
  };

  if (compact) {
    return (
      <TouchableOpacity
        style={[styles.compactCard, shadows.sm]}
        onPress={onPress}
        activeOpacity={0.7}
      >
        <View style={styles.compactImagePlaceholder}>
          <Ionicons name="flask" size={24} color={colors.primary[300]} />
        </View>
        <Text style={styles.compactBrand}>{product.brand}</Text>
        <Text style={styles.compactName} numberOfLines={2}>{product.name}</Text>
        <Text style={styles.compactPrice}>${product.price.toFixed(2)}</Text>
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity
      style={[styles.card, shadows.md]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.row}>
        <View style={styles.imagePlaceholder}>
          <Ionicons name="flask" size={32} color={colors.primary[300]} />
        </View>
        <View style={styles.info}>
          <View style={styles.brandRow}>
            <Text style={styles.brand}>{product.brand}</Text>
            <View style={styles.matchBadge}>
              <Text style={styles.matchText}>{matchScore}% match</Text>
            </View>
          </View>
          <Text style={styles.name} numberOfLines={2}>{product.name}</Text>
          <Text style={styles.category}>
            {product.category.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
          </Text>

          <View style={styles.metaRow}>
            <Text style={styles.price}>
              ${product.price.toFixed(2)} {priceRangeLabel[product.priceRange]}
            </Text>
            <View style={styles.ratingRow}>
              <Ionicons name="star" size={12} color={colors.accent[400]} />
              <Text style={styles.rating}>
                {product.rating} ({(product.reviewCount / 1000).toFixed(1)}k)
              </Text>
            </View>
          </View>

          {/* Badges */}
          <View style={styles.badges}>
            {product.isCrueltyFree && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>Cruelty-Free</Text>
              </View>
            )}
            {product.isVegan && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>Vegan</Text>
              </View>
            )}
            {product.isFragranceFree && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>Fragrance-Free</Text>
              </View>
            )}
          </View>
        </View>
      </View>

      {/* Match reasons */}
      {matchReasons.length > 0 && (
        <View style={styles.reasonsSection}>
          {matchReasons.slice(0, 2).map((reason, i) => (
            <View key={i} style={styles.reasonRow}>
              <Ionicons name="checkmark-circle" size={14} color={colors.success} />
              <Text style={styles.reasonText}>{reason}</Text>
            </View>
          ))}
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.neutral[0],
    borderRadius: borderRadius.lg,
    padding: spacing.base,
    marginBottom: spacing.md,
  },
  row: {
    flexDirection: 'row',
  },
  imagePlaceholder: {
    width: 72,
    height: 72,
    borderRadius: borderRadius.md,
    backgroundColor: colors.primary[50],
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  info: {
    flex: 1,
  },
  brandRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 2,
  },
  brand: {
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.semibold,
    color: colors.primary[500],
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  matchBadge: {
    backgroundColor: colors.primary[50],
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: borderRadius.full,
  },
  matchText: {
    fontSize: 10,
    fontWeight: typography.fontWeight.bold,
    color: colors.primary[600],
  },
  name: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.bold,
    color: colors.neutral[800],
    marginBottom: 2,
  },
  category: {
    fontSize: typography.fontSize.xs,
    color: colors.neutral[400],
    marginBottom: 6,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  price: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.bold,
    color: colors.neutral[700],
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  rating: {
    fontSize: typography.fontSize.xs,
    color: colors.neutral[500],
  },
  badges: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
  },
  badge: {
    backgroundColor: colors.mint[50],
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: borderRadius.full,
  },
  badgeText: {
    fontSize: 9,
    fontWeight: typography.fontWeight.semibold,
    color: colors.mint[700],
  },
  reasonsSection: {
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.neutral[100],
  },
  reasonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  reasonText: {
    fontSize: typography.fontSize.xs,
    color: colors.neutral[600],
    flex: 1,
  },

  // Compact variant
  compactCard: {
    backgroundColor: colors.neutral[0],
    borderRadius: borderRadius.md,
    padding: spacing.md,
    width: 140,
    marginRight: spacing.md,
  },
  compactImagePlaceholder: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.sm,
    backgroundColor: colors.primary[50],
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  compactBrand: {
    fontSize: 9,
    fontWeight: typography.fontWeight.semibold,
    color: colors.primary[500],
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  compactName: {
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.bold,
    color: colors.neutral[800],
    marginBottom: 4,
  },
  compactPrice: {
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.bold,
    color: colors.neutral[600],
  },
});
