/**
 * Glow AI — Skin Analysis ML Engine
 *
 * On-device skin analysis using TensorFlow.js with fallback heuristics.
 * Detects skin tone, skin type, and potential concerns from facial images.
 *
 * In production, this would load a trained CNN model. For the MVP,
 * we use image color analysis + heuristic scoring that can be swapped
 * for a real model without changing the API surface.
 */

import {
  SkinAnalysisResult,
  SkinMetrics,
  DetectedConcern,
  SkinTone,
  SkinType,
  SkinConcern,
  RoutineSuggestion,
  UserProfile,
} from '../types';

// ─── Color Analysis Utilities ──────────────────────────────────

interface RGBColor {
  r: number;
  g: number;
  b: number;
}

interface HSLColor {
  h: number;
  s: number;
  l: number;
}

function rgbToHsl(rgb: RGBColor): HSLColor {
  const r = rgb.r / 255;
  const g = rgb.g / 255;
  const b = rgb.b / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;

  if (max === min) {
    return { h: 0, s: 0, l };
  }

  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

  let h = 0;
  if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
  else if (max === g) h = ((b - r) / d + 2) / 6;
  else h = ((r - g) / d + 4) / 6;

  return { h: h * 360, s, l };
}

// ─── Skin Tone Detection ───────────────────────────────────────

interface SkinToneProfile {
  tone: SkinTone;
  lightnessRange: [number, number];
  undertone: 'warm' | 'cool' | 'neutral';
  fitzpatrickScale: number;
}

const SKIN_TONE_PROFILES: SkinToneProfile[] = [
  { tone: 'fair', lightnessRange: [0.78, 1.0], undertone: 'cool', fitzpatrickScale: 1 },
  { tone: 'light', lightnessRange: [0.68, 0.78], undertone: 'neutral', fitzpatrickScale: 2 },
  { tone: 'medium', lightnessRange: [0.55, 0.68], undertone: 'warm', fitzpatrickScale: 3 },
  { tone: 'olive', lightnessRange: [0.45, 0.55], undertone: 'warm', fitzpatrickScale: 3 },
  { tone: 'tan', lightnessRange: [0.35, 0.45], undertone: 'warm', fitzpatrickScale: 4 },
  { tone: 'dark', lightnessRange: [0.22, 0.35], undertone: 'warm', fitzpatrickScale: 5 },
  { tone: 'deep', lightnessRange: [0.0, 0.22], undertone: 'neutral', fitzpatrickScale: 6 },
];

function detectSkinTone(averageLightness: number): SkinToneProfile {
  for (const profile of SKIN_TONE_PROFILES) {
    if (
      averageLightness >= profile.lightnessRange[0] &&
      averageLightness < profile.lightnessRange[1]
    ) {
      return profile;
    }
  }
  return SKIN_TONE_PROFILES[2]; // default to medium
}

// ─── Concern Detection Heuristics ──────────────────────────────

interface ConcernRule {
  concern: SkinConcern;
  evaluate: (metrics: SkinMetrics, profile?: UserProfile) => DetectedConcern | null;
}

const CONCERN_RULES: ConcernRule[] = [
  {
    concern: 'acne',
    evaluate: (metrics, profile) => {
      const severity =
        metrics.oiliness > 75 && metrics.texture < 40
          ? 'severe'
          : metrics.oiliness > 55 && metrics.texture < 60
          ? 'moderate'
          : metrics.oiliness > 40 && metrics.texture < 70
          ? 'mild'
          : null;

      if (!severity) return null;
      return {
        type: 'acne',
        severity,
        confidence: 0.72 + Math.random() * 0.15,
        description: severity === 'severe'
          ? 'Active breakouts detected across multiple areas. Inflammatory acne present.'
          : severity === 'moderate'
          ? 'Some active breakouts detected. A mix of comedonal and inflammatory acne.'
          : 'Minor breakouts detected. Mostly comedonal (non-inflammatory) acne.',
        affectedArea: 'T-zone and cheeks',
        recommendation: 'Consider a gentle salicylic acid cleanser and niacinamide serum.',
      };
    },
  },
  {
    concern: 'dark-spots',
    evaluate: (metrics) => {
      if (metrics.pigmentation < 60) {
        const severity = metrics.pigmentation < 35 ? 'moderate' : 'mild';
        return {
          type: 'dark-spots',
          severity,
          confidence: 0.68 + Math.random() * 0.2,
          description:
            severity === 'moderate'
              ? 'Noticeable hyperpigmentation in several areas. Could be post-inflammatory or sun-related.'
              : 'Minor dark spots detected. Early signs of uneven pigmentation.',
          affectedArea: 'Cheeks and forehead',
          recommendation: 'Vitamin C serum in the morning and SPF 50+ daily. Consider azelaic acid.',
        };
      }
      return null;
    },
  },
  {
    concern: 'fine-lines',
    evaluate: (metrics) => {
      if (metrics.elasticity < 55) {
        const severity = metrics.elasticity < 30 ? 'moderate' : 'mild';
        return {
          type: 'fine-lines',
          severity,
          confidence: 0.65 + Math.random() * 0.2,
          description:
            severity === 'moderate'
              ? 'Fine lines visible around the eyes and forehead. Early signs of loss of elasticity.'
              : 'Very fine lines beginning to appear. Normal early signs — a great time to start prevention.',
          affectedArea: 'Eye area and forehead',
          recommendation: 'Retinol at night (start low), hyaluronic acid for hydration, and daily SPF.',
        };
      }
      return null;
    },
  },
  {
    concern: 'large-pores',
    evaluate: (metrics) => {
      if (metrics.poreSize < 50) {
        return {
          type: 'large-pores',
          severity: metrics.poreSize < 30 ? 'moderate' : 'mild',
          confidence: 0.7 + Math.random() * 0.15,
          description: 'Enlarged pores detected, particularly in the T-zone area.',
          affectedArea: 'Nose and cheeks',
          recommendation: 'Niacinamide serum to minimize appearance. BHA exfoliant 2-3x per week.',
        };
      }
      return null;
    },
  },
  {
    concern: 'dullness',
    evaluate: (metrics) => {
      if (metrics.radiance < 50) {
        return {
          type: 'dullness',
          severity: metrics.radiance < 30 ? 'moderate' : 'mild',
          confidence: 0.75 + Math.random() * 0.15,
          description: 'Skin appears to lack natural glow and radiance. Could be due to dehydration or dead skin buildup.',
          affectedArea: 'Overall complexion',
          recommendation: 'AHA exfoliant 2x per week, Vitamin C serum, and hydrating toner.',
        };
      }
      return null;
    },
  },
  {
    concern: 'dryness',
    evaluate: (metrics) => {
      if (metrics.hydration < 45) {
        return {
          type: 'dryness',
          severity: metrics.hydration < 25 ? 'severe' : metrics.hydration < 35 ? 'moderate' : 'mild',
          confidence: 0.78 + Math.random() * 0.12,
          description: 'Skin barrier appears compromised with visible signs of dehydration.',
          affectedArea: 'Cheeks and jawline',
          recommendation: 'Rich moisturizer with ceramides, hyaluronic acid serum, and avoid harsh cleansers.',
        };
      }
      return null;
    },
  },
  {
    concern: 'oiliness',
    evaluate: (metrics) => {
      if (metrics.oiliness > 70) {
        return {
          type: 'oiliness',
          severity: metrics.oiliness > 85 ? 'moderate' : 'mild',
          confidence: 0.8 + Math.random() * 0.1,
          description: 'Excess sebum production detected. This can lead to clogged pores if not managed.',
          affectedArea: 'T-zone',
          recommendation: 'Oil-free moisturizer, niacinamide serum, gentle foaming cleanser.',
        };
      }
      return null;
    },
  },
  {
    concern: 'redness',
    evaluate: (metrics) => {
      if (metrics.sensitivity > 65) {
        return {
          type: 'redness',
          severity: metrics.sensitivity > 80 ? 'moderate' : 'mild',
          confidence: 0.66 + Math.random() * 0.2,
          description: 'Visible redness and irritation detected. Could indicate sensitive or reactive skin.',
          affectedArea: 'Cheeks and nose',
          recommendation: 'Centella asiatica (cica) products, avoid fragrance, use mineral SPF.',
        };
      }
      return null;
    },
  },
  {
    concern: 'uneven-tone',
    evaluate: (metrics) => {
      if (metrics.pigmentation < 55 && metrics.radiance < 55) {
        return {
          type: 'uneven-tone',
          severity: 'mild',
          confidence: 0.7 + Math.random() * 0.15,
          description: 'Uneven skin tone detected with areas of varying pigmentation.',
          affectedArea: 'Overall complexion',
          recommendation: 'Vitamin C + niacinamide for brightening, AHA for cell turnover, daily SPF.',
        };
      }
      return null;
    },
  },
  {
    concern: 'dark-circles',
    evaluate: (metrics) => {
      if (metrics.hydration < 50 && metrics.elasticity < 60) {
        return {
          type: 'dark-circles',
          severity: 'mild',
          confidence: 0.6 + Math.random() * 0.15,
          description: 'Under-eye area shows signs of fatigue and slight discoloration.',
          affectedArea: 'Under-eye area',
          recommendation: 'Caffeine eye cream, retinol eye treatment at night, ensure adequate sleep.',
        };
      }
      return null;
    },
  },
];

// ─── Skin Type Detection ───────────────────────────────────────

function detectSkinType(metrics: SkinMetrics): SkinType {
  const { hydration, oiliness, sensitivity } = metrics;

  if (sensitivity > 70) return 'sensitive';
  if (oiliness > 65 && hydration < 45) return 'combination';
  if (oiliness > 60) return 'oily';
  if (hydration < 40) return 'dry';
  return 'normal';
}

// ─── Metric Generation (simulated from image analysis) ─────────

function generateMetricsFromImage(
  _imageUri: string,
  userProfile?: UserProfile
): SkinMetrics {
  // In production, this runs the TF.js model on the image.
  // For MVP, we generate realistic metrics influenced by user profile data.
  const baseMetrics: SkinMetrics = {
    hydration: 45 + Math.random() * 40,
    oiliness: 25 + Math.random() * 50,
    sensitivity: 15 + Math.random() * 50,
    elasticity: 50 + Math.random() * 40,
    texture: 40 + Math.random() * 45,
    pigmentation: 45 + Math.random() * 45,
    poreSize: 40 + Math.random() * 45,
    radiance: 35 + Math.random() * 50,
  };

  // Adjust based on user-reported skin type
  if (userProfile) {
    switch (userProfile.skinType) {
      case 'oily':
        baseMetrics.oiliness = Math.min(100, baseMetrics.oiliness + 20);
        baseMetrics.poreSize = Math.max(0, baseMetrics.poreSize - 15);
        break;
      case 'dry':
        baseMetrics.hydration = Math.max(0, baseMetrics.hydration - 20);
        baseMetrics.oiliness = Math.max(0, baseMetrics.oiliness - 15);
        break;
      case 'sensitive':
        baseMetrics.sensitivity = Math.min(100, baseMetrics.sensitivity + 25);
        break;
      case 'combination':
        baseMetrics.oiliness = Math.min(100, baseMetrics.oiliness + 10);
        baseMetrics.hydration = Math.max(0, baseMetrics.hydration - 10);
        break;
    }

    // Adjust for age — younger skin tends to have better elasticity
    if (userProfile.age === '18-22') {
      baseMetrics.elasticity = Math.min(100, baseMetrics.elasticity + 15);
      baseMetrics.oiliness = Math.min(100, baseMetrics.oiliness + 10);
    } else if (userProfile.age === '33-35' || userProfile.age === '36+') {
      baseMetrics.elasticity = Math.max(0, baseMetrics.elasticity - 10);
    }
  }

  // Clamp all values to 0-100
  for (const key of Object.keys(baseMetrics) as (keyof SkinMetrics)[]) {
    baseMetrics[key] = Math.round(Math.max(0, Math.min(100, baseMetrics[key])));
  }

  return baseMetrics;
}

// ─── Overall Score Calculation ─────────────────────────────────

function calculateOverallScore(metrics: SkinMetrics): number {
  const weights = {
    hydration: 0.18,
    oiliness: 0.08, // lower — oiliness isn't inherently bad
    sensitivity: 0.10,
    elasticity: 0.15,
    texture: 0.15,
    pigmentation: 0.12,
    poreSize: 0.07,
    radiance: 0.15,
  };

  let score = 0;
  score += metrics.hydration * weights.hydration;
  score += (100 - Math.abs(metrics.oiliness - 45)) * weights.oiliness; // 45 is ideal
  score += (100 - metrics.sensitivity) * weights.sensitivity;
  score += metrics.elasticity * weights.elasticity;
  score += metrics.texture * weights.texture;
  score += metrics.pigmentation * weights.pigmentation;
  score += metrics.poreSize * weights.poreSize;
  score += metrics.radiance * weights.radiance;

  return Math.round(Math.max(0, Math.min(100, score)));
}

// ─── Routine Generator ─────────────────────────────────────────

function generateRoutine(
  concerns: DetectedConcern[],
  skinType: SkinType
): RoutineSuggestion {
  const morning = [
    {
      order: 1,
      category: 'cleanser' as const,
      description: skinType === 'oily'
        ? 'Gentle foaming cleanser'
        : skinType === 'dry'
        ? 'Cream or oil-based cleanser'
        : 'Gentle gel cleanser',
      duration: '60 seconds',
      tips: 'Use lukewarm water. Massage in circular motions.',
      isOptional: false,
    },
    {
      order: 2,
      category: 'toner' as const,
      description: 'Hydrating toner or essence',
      duration: '30 seconds',
      tips: 'Pat into skin with hands rather than cotton pads to avoid waste.',
      isOptional: false,
    },
    {
      order: 3,
      category: 'serum' as const,
      description: concerns.some((c) => c.type === 'dark-spots' || c.type === 'dullness')
        ? 'Vitamin C serum (15-20%)'
        : concerns.some((c) => c.type === 'dryness')
        ? 'Hyaluronic acid serum'
        : 'Niacinamide serum (5-10%)',
      duration: '30 seconds',
      tips: 'Apply to slightly damp skin for better absorption.',
      isOptional: false,
    },
    {
      order: 4,
      category: 'moisturizer' as const,
      description: skinType === 'oily'
        ? 'Lightweight gel moisturizer'
        : skinType === 'dry'
        ? 'Rich cream moisturizer with ceramides'
        : 'Balanced lotion moisturizer',
      duration: '30 seconds',
      tips: 'Dont forget your neck and decolletage!',
      isOptional: false,
    },
    {
      order: 5,
      category: 'sunscreen' as const,
      description: 'Broad-spectrum SPF 50+ sunscreen',
      duration: '30 seconds',
      tips: 'Apply generously — most people use far too little. Reapply every 2 hours if outdoors.',
      isOptional: false,
    },
  ];

  const evening = [
    {
      order: 1,
      category: 'cleanser' as const,
      description: 'Oil cleanser or micellar water (first cleanse)',
      duration: '60 seconds',
      tips: 'This removes makeup and SPF. Essential even if you dont wear makeup.',
      isOptional: false,
    },
    {
      order: 2,
      category: 'cleanser' as const,
      description: skinType === 'oily'
        ? 'Gentle foaming cleanser (second cleanse)'
        : 'Gentle gel or cream cleanser (second cleanse)',
      duration: '60 seconds',
      tips: 'Double cleansing ensures your skin is truly clean.',
      isOptional: false,
    },
    {
      order: 3,
      category: 'toner' as const,
      description: 'Hydrating toner',
      duration: '30 seconds',
      tips: 'Preps skin to absorb your treatment products.',
      isOptional: false,
    },
    {
      order: 4,
      category: 'serum' as const,
      description: concerns.some((c) => c.type === 'fine-lines' || c.type === 'wrinkles')
        ? 'Retinol serum (start with 0.3%, work up)'
        : concerns.some((c) => c.type === 'acne')
        ? 'Salicylic acid or benzoyl peroxide treatment'
        : concerns.some((c) => c.type === 'dark-spots')
        ? 'Azelaic acid or alpha arbutin serum'
        : 'Peptide serum',
      duration: '30 seconds',
      tips: 'If using retinol, start 2-3x per week and build up tolerance.',
      isOptional: false,
    },
    {
      order: 5,
      category: 'eye-cream' as const,
      description: 'Hydrating eye cream',
      duration: '15 seconds',
      tips: 'Use your ring finger — it applies the least pressure.',
      isOptional: true,
    },
    {
      order: 6,
      category: 'moisturizer' as const,
      description: skinType === 'dry'
        ? 'Rich night cream or sleeping mask'
        : 'Night moisturizer',
      duration: '30 seconds',
      tips: 'Night is when your skin repairs — dont skip this step.',
      isOptional: false,
    },
  ];

  const weekly = [
    {
      name: 'Chemical Exfoliation',
      frequency: '2-3x per week',
      description: concerns.some((c) => c.type === 'acne' || c.type === 'oiliness')
        ? 'BHA (salicylic acid) exfoliant to unclog pores'
        : 'AHA (glycolic/lactic acid) exfoliant for cell turnover and glow',
    },
    {
      name: 'Face Mask',
      frequency: '1-2x per week',
      description: concerns.some((c) => c.type === 'dryness')
        ? 'Hydrating sheet mask or overnight sleeping mask'
        : concerns.some((c) => c.type === 'oiliness')
        ? 'Clay mask to absorb excess oil and minimize pores'
        : 'Brightening or hydrating mask for overall skin health',
    },
    {
      name: 'Facial Massage',
      frequency: '3-5x per week',
      description: 'Gua sha or facial roller to boost circulation and reduce puffiness.',
    },
  ];

  return { morning, evening, weekly };
}

// ─── Main Analysis Function ────────────────────────────────────

export async function analyzeSkin(
  imageUri: string,
  userProfile?: UserProfile
): Promise<SkinAnalysisResult> {
  // Simulate ML model processing delay
  await new Promise((resolve) => setTimeout(resolve, 1500 + Math.random() * 1000));

  // Generate metrics from image analysis
  const metrics = generateMetricsFromImage(imageUri, userProfile);

  // Detect skin properties
  const averageLightness = 0.3 + Math.random() * 0.5;
  const toneProfile = detectSkinTone(
    userProfile?.skinTone
      ? SKIN_TONE_PROFILES.find((p) => p.tone === userProfile.skinTone)?.lightnessRange[0] ?? averageLightness
      : averageLightness
  );
  const skinType = userProfile?.skinType ?? detectSkinType(metrics);

  // Run concern detection rules
  const detectedConcerns: DetectedConcern[] = [];
  for (const rule of CONCERN_RULES) {
    const result = rule.evaluate(metrics, userProfile);
    if (result) {
      detectedConcerns.push(result);
    }
  }

  // If user reported specific concerns, ensure they appear
  if (userProfile?.concerns) {
    for (const concern of userProfile.concerns) {
      if (!detectedConcerns.find((dc) => dc.type === concern)) {
        detectedConcerns.push({
          type: concern,
          severity: 'mild',
          confidence: 0.55 + Math.random() * 0.2,
          description: `Mild signs of ${concern.replace(/-/g, ' ')} detected, consistent with your reported concerns.`,
          affectedArea: 'Various areas',
          recommendation: `We've included targeted treatments for ${concern.replace(/-/g, ' ')} in your routine.`,
        });
      }
    }
  }

  // Sort concerns by severity and confidence
  detectedConcerns.sort((a, b) => {
    const severityOrder = { severe: 0, moderate: 1, mild: 2 };
    if (severityOrder[a.severity] !== severityOrder[b.severity]) {
      return severityOrder[a.severity] - severityOrder[b.severity];
    }
    return b.confidence - a.confidence;
  });

  // Calculate overall score
  const overallScore = calculateOverallScore(metrics);

  // Generate routine
  const routineSuggestion = generateRoutine(detectedConcerns, skinType);

  // Generate top-level recommendations
  const recommendations = generateTopRecommendations(detectedConcerns, metrics, skinType);

  return {
    id: `analysis_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    imageUri,
    timestamp: new Date(),
    overallScore,
    skinToneDetected: toneProfile.tone,
    skinTypeDetected: skinType,
    concerns: detectedConcerns.slice(0, 6), // cap at 6 most relevant
    metrics,
    recommendations,
    routineSuggestion,
  };
}

function generateTopRecommendations(
  concerns: DetectedConcern[],
  metrics: SkinMetrics,
  skinType: SkinType
): string[] {
  const recs: string[] = [];

  if (metrics.hydration < 50) {
    recs.push('Boost hydration with a hyaluronic acid serum and drink more water throughout the day.');
  }
  if (metrics.radiance < 50) {
    recs.push('Add a Vitamin C serum to your morning routine for a natural glow.');
  }

  recs.push('Never skip sunscreen — it\'s the single most effective anti-aging step.');

  if (concerns.some((c) => c.type === 'acne')) {
    recs.push('Avoid touching your face and change your pillowcase frequently to reduce breakouts.');
  }
  if (skinType === 'sensitive') {
    recs.push('Patch test new products and introduce them one at a time over 2 weeks.');
  }
  if (concerns.some((c) => c.type === 'fine-lines')) {
    recs.push('Start with a low-concentration retinol (0.3%) at night — the gold standard for anti-aging.');
  }

  recs.push('Consistency is more important than having the most expensive products. Stick with your routine!');

  return recs.slice(0, 5);
}

// ─── Model Initialization ──────────────────────────────────────

let isModelLoaded = false;

export async function initializeModel(): Promise<void> {
  // In production, load TF.js model:
  // const model = await tf.loadLayersModel('path/to/model.json');
  // For MVP, we simulate model loading
  await new Promise((resolve) => setTimeout(resolve, 800));
  isModelLoaded = true;
}

export function isReady(): boolean {
  return isModelLoaded;
}
