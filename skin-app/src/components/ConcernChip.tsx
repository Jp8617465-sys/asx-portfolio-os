/**
 * Selectable concern/preference chip component
 */

import React from 'react';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';
import { colors, typography, borderRadius } from '../theme';

interface ConcernChipProps {
  label: string;
  selected: boolean;
  onPress: () => void;
  variant?: 'default' | 'severity';
  severity?: 'mild' | 'moderate' | 'severe';
}

export default function ConcernChip({
  label,
  selected,
  onPress,
  variant = 'default',
  severity,
}: ConcernChipProps) {
  if (variant === 'severity' && severity) {
    const severityColors = {
      mild: { bg: colors.mint[50], text: colors.mint[700], border: colors.mint[300] },
      moderate: { bg: colors.accent[50], text: colors.accent[700], border: colors.accent[300] },
      severe: { bg: '#FEF2F2', text: colors.error, border: '#FECACA' },
    };
    const c = severityColors[severity];

    return (
      <TouchableOpacity
        style={[styles.chip, { backgroundColor: c.bg, borderColor: c.border, borderWidth: 1 }]}
        onPress={onPress}
        activeOpacity={0.7}
      >
        <Text style={[styles.chipText, { color: c.text }]}>{label}</Text>
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity
      style={[
        styles.chip,
        selected ? styles.chipSelected : styles.chipUnselected,
      ]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <Text
        style={[
          styles.chipText,
          selected ? styles.chipTextSelected : styles.chipTextUnselected,
        ]}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: borderRadius.full,
    marginRight: 8,
    marginBottom: 8,
  },
  chipSelected: {
    backgroundColor: colors.primary[500],
  },
  chipUnselected: {
    backgroundColor: colors.neutral[100],
    borderWidth: 1,
    borderColor: colors.neutral[200],
  },
  chipText: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semibold,
  },
  chipTextSelected: {
    color: colors.neutral[0],
  },
  chipTextUnselected: {
    color: colors.neutral[600],
  },
});
