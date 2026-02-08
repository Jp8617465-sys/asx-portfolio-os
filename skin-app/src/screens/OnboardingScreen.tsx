/**
 * Glow AI — Onboarding Screen
 *
 * Beautiful multi-page onboarding with gradient backgrounds,
 * animations, and a welcoming feel for the 18-35 target market.
 */

import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  FlatList,
  Animated,
  StatusBar,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { colors, typography, spacing, borderRadius } from '../theme';
import GradientButton from '../components/GradientButton';
import { RootStackParamList } from '../types';

const { width, height } = Dimensions.get('window');

type NavProp = NativeStackNavigationProp<RootStackParamList, 'Onboarding'>;

interface OnboardingPage {
  id: string;
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle: string;
  gradient: string[];
  description: string;
}

const PAGES: OnboardingPage[] = [
  {
    id: '1',
    icon: 'sparkles',
    title: 'Welcome to\nGlow AI',
    subtitle: 'Your personal skin analyst',
    gradient: [colors.primary[100], colors.primary[50], '#FFF0F5'],
    description:
      'Discover your unique skin profile with AI-powered analysis. Get personalised routines and product recommendations that actually work for you.',
  },
  {
    id: '2',
    icon: 'scan-circle-outline',
    title: 'Scan Your\nSkin',
    subtitle: 'Powered by machine learning',
    gradient: [colors.secondary[100], colors.secondary[50], '#F5F0FF'],
    description:
      'Take a quick selfie and our AI analyses your skin tone, texture, hydration, and more. We detect potential concerns and track your progress over time.',
  },
  {
    id: '3',
    icon: 'heart-circle-outline',
    title: 'Personalised\nFor You',
    subtitle: 'Tailored to your unique skin',
    gradient: [colors.mint[100], colors.mint[50], '#F0FDF9'],
    description:
      'Get curated product recommendations based on your skin type, concerns, budget, and preferences. Build the perfect routine — morning and evening.',
  },
  {
    id: '4',
    icon: 'trending-up',
    title: 'Track Your\nGlow Up',
    subtitle: 'See real results',
    gradient: [colors.accent[100], colors.accent[50], '#FFF7ED'],
    description:
      'Log your skincare journey, track improvements, and watch your skin transform. Your glow-up starts today.',
  },
];

export default function OnboardingScreen() {
  const navigation = useNavigation<NavProp>();
  const [currentPage, setCurrentPage] = useState(0);
  const flatListRef = useRef<FlatList>(null);
  const scrollX = useRef(new Animated.Value(0)).current;

  const handleNext = () => {
    if (currentPage < PAGES.length - 1) {
      flatListRef.current?.scrollToIndex({ index: currentPage + 1 });
      setCurrentPage(currentPage + 1);
    } else {
      navigation.navigate('SkinQuiz');
    }
  };

  const handleSkip = () => {
    navigation.navigate('SkinQuiz');
  };

  const renderPage = ({ item, index }: { item: OnboardingPage; index: number }) => (
    <LinearGradient
      colors={item.gradient}
      style={styles.page}
      start={{ x: 0, y: 0 }}
      end={{ x: 0.5, y: 1 }}
    >
      <View style={styles.iconContainer}>
        <View style={styles.iconCircle}>
          <Ionicons name={item.icon} size={64} color={colors.primary[500]} />
        </View>
      </View>

      <View style={styles.textContainer}>
        <Text style={styles.title}>{item.title}</Text>
        <Text style={styles.subtitle}>{item.subtitle}</Text>
        <Text style={styles.description}>{item.description}</Text>
      </View>
    </LinearGradient>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />

      {/* Skip button */}
      {currentPage < PAGES.length - 1 && (
        <View style={styles.skipContainer}>
          <Text onPress={handleSkip} style={styles.skipText}>
            Skip
          </Text>
        </View>
      )}

      {/* Pages */}
      <FlatList
        ref={flatListRef}
        data={PAGES}
        renderItem={renderPage}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        keyExtractor={(item) => item.id}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { x: scrollX } } }],
          { useNativeDriver: false }
        )}
        onMomentumScrollEnd={(e) => {
          const page = Math.round(e.nativeEvent.contentOffset.x / width);
          setCurrentPage(page);
        }}
        scrollEventThrottle={16}
      />

      {/* Bottom section */}
      <View style={styles.bottomSection}>
        {/* Dot indicators */}
        <View style={styles.dotsContainer}>
          {PAGES.map((_, i) => {
            const inputRange = [(i - 1) * width, i * width, (i + 1) * width];
            const dotWidth = scrollX.interpolate({
              inputRange,
              outputRange: [8, 24, 8],
              extrapolate: 'clamp',
            });
            const dotOpacity = scrollX.interpolate({
              inputRange,
              outputRange: [0.3, 1, 0.3],
              extrapolate: 'clamp',
            });

            return (
              <Animated.View
                key={i}
                style={[
                  styles.dot,
                  {
                    width: dotWidth,
                    opacity: dotOpacity,
                  },
                ]}
              />
            );
          })}
        </View>

        {/* CTA Button */}
        <GradientButton
          title={currentPage === PAGES.length - 1 ? "Let's Get Started" : 'Next'}
          onPress={handleNext}
          size="lg"
          style={styles.ctaButton}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.neutral[0],
  },
  skipContainer: {
    position: 'absolute',
    top: 60,
    right: 24,
    zIndex: 10,
  },
  skipText: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semibold,
    color: colors.neutral[500],
  },
  page: {
    width,
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: spacing['2xl'],
  },
  iconContainer: {
    alignItems: 'center',
    marginBottom: spacing['3xl'],
  },
  iconCircle: {
    width: 128,
    height: 128,
    borderRadius: 64,
    backgroundColor: 'rgba(255,255,255,0.8)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.primary[500],
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 6,
  },
  textContainer: {
    alignItems: 'center',
  },
  title: {
    fontSize: typography.fontSize['3xl'],
    fontWeight: typography.fontWeight.extrabold,
    color: colors.neutral[900],
    textAlign: 'center',
    lineHeight: typography.fontSize['3xl'] * 1.15,
    marginBottom: spacing.sm,
  },
  subtitle: {
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.medium,
    color: colors.primary[500],
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  description: {
    fontSize: typography.fontSize.base,
    color: colors.neutral[500],
    textAlign: 'center',
    lineHeight: typography.fontSize.base * 1.6,
    paddingHorizontal: spacing.base,
  },
  bottomSection: {
    paddingHorizontal: spacing['2xl'],
    paddingBottom: spacing['4xl'],
    alignItems: 'center',
  },
  dotsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  dot: {
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.primary[500],
    marginHorizontal: 4,
  },
  ctaButton: {
    width: '100%',
  },
});
