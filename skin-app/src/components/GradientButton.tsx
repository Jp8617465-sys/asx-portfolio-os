/**
 * Reusable gradient button component with glow effect
 */

import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ViewStyle,
  TextStyle,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, typography, borderRadius, shadows } from '../theme';

interface GradientButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  icon?: React.ReactNode;
  style?: ViewStyle;
}

export default function GradientButton({
  title,
  onPress,
  variant = 'primary',
  size = 'md',
  disabled = false,
  icon,
  style,
}: GradientButtonProps) {
  const sizeStyles = SIZE_MAP[size];

  if (variant === 'outline') {
    return (
      <TouchableOpacity
        onPress={onPress}
        disabled={disabled}
        style={[
          styles.base,
          sizeStyles.button,
          styles.outline,
          disabled && styles.disabled,
          style,
        ]}
        activeOpacity={0.7}
      >
        {icon && <View style={styles.iconWrap}>{icon}</View>}
        <Text style={[styles.outlineText, sizeStyles.text]}>{title}</Text>
      </TouchableOpacity>
    );
  }

  const gradientColors =
    variant === 'secondary'
      ? [colors.secondary[400], colors.secondary[600]]
      : [colors.primary[400], colors.primary[600]];

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.8}
      style={[disabled && styles.disabled, style]}
    >
      <LinearGradient
        colors={gradientColors}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.base, sizeStyles.button, shadows.glow]}
      >
        {icon && <View style={styles.iconWrap}>{icon}</View>}
        <Text style={[styles.filledText, sizeStyles.text]}>{title}</Text>
      </LinearGradient>
    </TouchableOpacity>
  );
}

const SIZE_MAP: Record<string, { button: ViewStyle; text: TextStyle }> = {
  sm: {
    button: { paddingVertical: 10, paddingHorizontal: 20, borderRadius: borderRadius.md },
    text: { fontSize: typography.fontSize.sm },
  },
  md: {
    button: { paddingVertical: 14, paddingHorizontal: 28, borderRadius: borderRadius.lg },
    text: { fontSize: typography.fontSize.base },
  },
  lg: {
    button: { paddingVertical: 18, paddingHorizontal: 36, borderRadius: borderRadius.xl },
    text: { fontSize: typography.fontSize.md },
  },
};

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  filledText: {
    color: colors.neutral[0],
    fontWeight: typography.fontWeight.bold,
    letterSpacing: 0.3,
  },
  outline: {
    borderWidth: 2,
    borderColor: colors.primary[400],
    backgroundColor: 'transparent',
  },
  outlineText: {
    color: colors.primary[500],
    fontWeight: typography.fontWeight.bold,
  },
  disabled: {
    opacity: 0.5,
  },
  iconWrap: {
    marginRight: 8,
  },
});
