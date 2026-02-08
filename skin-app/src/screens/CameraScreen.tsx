/**
 * Glow AI — Camera / Image Upload Screen
 *
 * Allows user to take a selfie or pick from gallery for skin analysis.
 * Shows an animated scanning overlay during analysis.
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  SafeAreaView,
  ActivityIndicator,
  Animated,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { colors, typography, spacing, borderRadius, shadows } from '../theme';
import GradientButton from '../components/GradientButton';
import { useAppStore } from '../services/store';
import { analyzeSkin } from '../ml/skinModel';
import { RootStackParamList } from '../types';

type NavProp = NativeStackNavigationProp<RootStackParamList>;

export default function CameraScreen() {
  const navigation = useNavigation<NavProp>();
  const { userProfile, setCurrentAnalysis, isAnalyzing, setIsAnalyzing } = useAppStore();
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [analysisStage, setAnalysisStage] = useState('');

  const pickImage = async (useCamera: boolean) => {
    const permissionMethod = useCamera
      ? ImagePicker.requestCameraPermissionsAsync
      : ImagePicker.requestMediaLibraryPermissionsAsync;

    const { status } = await permissionMethod();
    if (status !== 'granted') return;

    const options: ImagePicker.ImagePickerOptions = {
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    };

    const result = useCamera
      ? await ImagePicker.launchCameraAsync(options)
      : await ImagePicker.launchImageLibraryAsync(options);

    if (!result.canceled && result.assets[0]) {
      setSelectedImage(result.assets[0].uri);
    }
  };

  const startAnalysis = async () => {
    if (!selectedImage) return;

    setIsAnalyzing(true);

    // Simulate staged analysis feedback
    const stages = [
      'Detecting face region...',
      'Analysing skin tone...',
      'Measuring hydration levels...',
      'Checking for concerns...',
      'Generating recommendations...',
    ];

    for (let i = 0; i < stages.length; i++) {
      setAnalysisStage(stages[i]);
      await new Promise((r) => setTimeout(r, 500 + Math.random() * 400));
    }

    const result = await analyzeSkin(selectedImage, userProfile ?? undefined);
    setCurrentAnalysis(result);
    setIsAnalyzing(false);
    setSelectedImage(null);
    setAnalysisStage('');

    navigation.navigate('AnalysisResult', { analysisId: result.id });
  };

  // ── Analyzing State ───────────────────────────────────────

  if (isAnalyzing) {
    return (
      <LinearGradient
        colors={[colors.primary[50], colors.secondary[50], colors.neutral[0]]}
        style={styles.analyzingContainer}
      >
        <SafeAreaView style={styles.analyzingInner}>
          {selectedImage && (
            <View style={styles.analyzingImageWrap}>
              <Image source={{ uri: selectedImage }} style={styles.analyzingImage} />
              {/* Scanning overlay */}
              <View style={styles.scanOverlay}>
                <LinearGradient
                  colors={['transparent', 'rgba(255,61,127,0.15)', 'transparent']}
                  style={styles.scanLine}
                />
              </View>
            </View>
          )}

          <ActivityIndicator size="large" color={colors.primary[500]} style={{ marginTop: 32 }} />
          <Text style={styles.analyzingTitle}>Analysing Your Skin</Text>
          <Text style={styles.analyzingStage}>{analysisStage}</Text>
          <Text style={styles.analyzingHint}>
            Our AI is examining your skin across 8 different metrics
          </Text>
        </SafeAreaView>
      </LinearGradient>
    );
  }

  // ── Image Selected State ──────────────────────────────────

  if (selectedImage) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Ready to Scan</Text>
        </View>

        <View style={styles.previewContainer}>
          <Image source={{ uri: selectedImage }} style={styles.previewImage} />
        </View>

        <View style={styles.previewActions}>
          <Text style={styles.previewHint}>
            Make sure your face is clearly visible with good lighting for the best results.
          </Text>

          <GradientButton
            title="Analyse My Skin"
            onPress={startAnalysis}
            size="lg"
            icon={<Ionicons name="sparkles" size={20} color={colors.neutral[0]} />}
            style={styles.analyseButton}
          />

          <GradientButton
            title="Retake Photo"
            onPress={() => setSelectedImage(null)}
            variant="outline"
            size="md"
            style={styles.retakeButton}
          />
        </View>
      </SafeAreaView>
    );
  }

  // ── Default State (no image) ──────────────────────────────

  return (
    <LinearGradient
      colors={[colors.primary[50], colors.neutral[0]]}
      style={styles.container}
    >
      <SafeAreaView style={styles.flex}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Skin Scan</Text>
          <Text style={styles.headerSubtitle}>
            Take a selfie or upload a photo for AI analysis
          </Text>
        </View>

        <View style={styles.optionsContainer}>
          {/* Camera option */}
          <GradientButton
            title="Take a Selfie"
            onPress={() => pickImage(true)}
            size="lg"
            icon={<Ionicons name="camera" size={22} color={colors.neutral[0]} />}
            style={styles.optionButton}
          />

          <View style={styles.dividerRow}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>or</Text>
            <View style={styles.dividerLine} />
          </View>

          {/* Gallery option */}
          <GradientButton
            title="Upload from Gallery"
            onPress={() => pickImage(false)}
            variant="outline"
            size="lg"
            icon={<Ionicons name="images" size={22} color={colors.primary[500]} />}
            style={styles.optionButton}
          />
        </View>

        {/* Tips */}
        <View style={styles.tipsContainer}>
          <Text style={styles.tipsTitle}>Tips for best results</Text>
          {[
            { icon: 'sunny-outline' as const, text: 'Use natural lighting — face a window' },
            { icon: 'happy-outline' as const, text: 'Keep a neutral expression' },
            { icon: 'water-outline' as const, text: 'Clean face, no makeup if possible' },
            { icon: 'phone-portrait-outline' as const, text: 'Hold phone at eye level' },
          ].map((tip, i) => (
            <View key={i} style={styles.tipRow}>
              <Ionicons name={tip.icon} size={18} color={colors.primary[400]} />
              <Text style={styles.tipText}>{tip.text}</Text>
            </View>
          ))}
        </View>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  flex: {
    flex: 1,
  },
  header: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing['2xl'],
    paddingBottom: spacing.base,
  },
  headerTitle: {
    fontSize: typography.fontSize['2xl'],
    fontWeight: typography.fontWeight.extrabold,
    color: colors.neutral[900],
  },
  headerSubtitle: {
    fontSize: typography.fontSize.base,
    color: colors.neutral[500],
    marginTop: 4,
  },
  optionsContainer: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing['3xl'],
  },
  optionButton: {
    width: '100%',
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.lg,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.neutral[200],
  },
  dividerText: {
    marginHorizontal: spacing.base,
    fontSize: typography.fontSize.sm,
    color: colors.neutral[400],
    fontWeight: typography.fontWeight.medium,
  },
  tipsContainer: {
    marginTop: 'auto',
    backgroundColor: colors.neutral[50],
    borderTopLeftRadius: borderRadius['2xl'],
    borderTopRightRadius: borderRadius['2xl'],
    padding: spacing.xl,
    paddingBottom: spacing['4xl'],
  },
  tipsTitle: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.bold,
    color: colors.neutral[700],
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: spacing.md,
  },
  tipRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: spacing.sm,
  },
  tipText: {
    fontSize: typography.fontSize.sm,
    color: colors.neutral[600],
  },

  // Preview state
  previewContainer: {
    flex: 1,
    padding: spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewImage: {
    width: 280,
    height: 280,
    borderRadius: borderRadius['2xl'],
    ...shadows.lg,
  },
  previewActions: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing['3xl'],
  },
  previewHint: {
    fontSize: typography.fontSize.sm,
    color: colors.neutral[500],
    textAlign: 'center',
    marginBottom: spacing.lg,
    lineHeight: typography.fontSize.sm * 1.5,
  },
  analyseButton: {
    width: '100%',
    marginBottom: spacing.md,
  },
  retakeButton: {
    width: '100%',
  },

  // Analyzing state
  analyzingContainer: {
    flex: 1,
  },
  analyzingInner: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
  },
  analyzingImageWrap: {
    width: 200,
    height: 200,
    borderRadius: borderRadius['2xl'],
    overflow: 'hidden',
    ...shadows.lg,
  },
  analyzingImage: {
    width: '100%',
    height: '100%',
  },
  scanOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
  },
  scanLine: {
    height: 40,
    width: '100%',
  },
  analyzingTitle: {
    fontSize: typography.fontSize.xl,
    fontWeight: typography.fontWeight.bold,
    color: colors.neutral[800],
    marginTop: spacing.lg,
  },
  analyzingStage: {
    fontSize: typography.fontSize.base,
    color: colors.primary[500],
    fontWeight: typography.fontWeight.medium,
    marginTop: spacing.sm,
  },
  analyzingHint: {
    fontSize: typography.fontSize.sm,
    color: colors.neutral[400],
    marginTop: spacing.sm,
    textAlign: 'center',
  },
});
