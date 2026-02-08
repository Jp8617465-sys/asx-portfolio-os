/**
 * Animated metric bar used for skin analysis results
 */

import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { colors, typography, borderRadius } from '../theme';

interface MetricBarProps {
  label: string;
  value: number; // 0-100
  color: string;
  icon?: string;
}

export default function MetricBar({ label, value, color, icon }: MetricBarProps) {
  const animatedWidth = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(animatedWidth, {
      toValue: value,
      duration: 1000,
      useNativeDriver: false,
    }).start();
  }, [value]);

  const widthInterpolation = animatedWidth.interpolate({
    inputRange: [0, 100],
    outputRange: ['0%', '100%'],
  });

  const getLabel = (val: number): string => {
    if (val >= 80) return 'Excellent';
    if (val >= 60) return 'Good';
    if (val >= 40) return 'Fair';
    if (val >= 20) return 'Low';
    return 'Very Low';
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.label}>
          {icon ? `${icon} ` : ''}{label}
        </Text>
        <Text style={[styles.valueText, { color }]}>
          {Math.round(value)}% — {getLabel(value)}
        </Text>
      </View>
      <View style={styles.trackOuter}>
        <Animated.View
          style={[
            styles.trackFill,
            {
              width: widthInterpolation,
              backgroundColor: color,
            },
          ]}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  label: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semibold,
    color: colors.neutral[700],
  },
  valueText: {
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.bold,
  },
  trackOuter: {
    height: 8,
    borderRadius: borderRadius.full,
    backgroundColor: colors.neutral[100],
    overflow: 'hidden',
  },
  trackFill: {
    height: '100%',
    borderRadius: borderRadius.full,
  },
});
