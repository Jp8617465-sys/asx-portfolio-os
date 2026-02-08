/**
 * Glow AI — Main Entry Point
 *
 * AI-powered skin analysis and skincare recommendation app.
 * Built with React Native + Expo.
 */

import React, { useEffect, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import AppNavigator from './src/navigation/AppNavigator';
import { initializeModel } from './src/ml/skinModel';
import { colors, typography } from './src/theme';

export default function App() {
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function bootstrap() {
      try {
        // Initialize the ML skin analysis model
        await initializeModel();
      } catch (error) {
        console.warn('ML model initialization warning:', error);
      } finally {
        setIsLoading(false);
      }
    }

    bootstrap();
  }, []);

  if (isLoading) {
    return (
      <LinearGradient
        colors={[colors.primary[50], colors.neutral[0]]}
        style={styles.loadingContainer}
      >
        <View style={styles.loadingContent}>
          <Text style={styles.loadingLogo}>Glow</Text>
          <Text style={styles.loadingTagline}>AI-Powered Skin Analysis</Text>
          <ActivityIndicator
            size="small"
            color={colors.primary[500]}
            style={styles.loadingSpinner}
          />
        </View>
      </LinearGradient>
    );
  }

  return (
    <GestureHandlerRootView style={styles.root}>
      <StatusBar style="dark" />
      <AppNavigator />
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingContent: {
    alignItems: 'center',
  },
  loadingLogo: {
    fontSize: 48,
    fontWeight: '800',
    color: colors.primary[500],
    letterSpacing: -1,
  },
  loadingTagline: {
    fontSize: typography.fontSize.sm,
    color: colors.neutral[500],
    marginTop: 4,
    fontWeight: typography.fontWeight.medium,
  },
  loadingSpinner: {
    marginTop: 24,
  },
});
