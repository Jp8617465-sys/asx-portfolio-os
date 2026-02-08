// ─── User Profile ──────────────────────────────────────────────

export type SkinType = 'oily' | 'dry' | 'combination' | 'normal' | 'sensitive';
export type SkinTone = 'fair' | 'light' | 'medium' | 'olive' | 'tan' | 'dark' | 'deep';
export type AgeRange = '18-22' | '23-27' | '28-32' | '33-35' | '36+';
export type Gender = 'female' | 'male' | 'non-binary' | 'prefer-not-to-say';

export interface UserProfile {
  id: string;
  name: string;
  age: AgeRange;
  gender: Gender;
  skinType: SkinType;
  skinTone: SkinTone;
  concerns: SkinConcern[];
  allergies: string[];
  preferences: UserPreferences;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserPreferences {
  budgetRange: 'budget' | 'mid-range' | 'premium' | 'luxury';
  preferNatural: boolean;
  preferFragranceFree: boolean;
  preferCrueltyFree: boolean;
  preferVegan: boolean;
  stylePreferences: StylePreference[];
  skinGoals: string[];
}

export type StylePreference =
  | 'minimal'
  | 'glass-skin'
  | 'natural-glow'
  | 'full-coverage'
  | 'dewy'
  | 'matte'
  | 'k-beauty'
  | 'clean-beauty'
  | 'anti-aging'
  | 'acne-fighting';

// ─── Skin Analysis ─────────────────────────────────────────────

export type SkinConcern =
  | 'acne'
  | 'dark-spots'
  | 'fine-lines'
  | 'wrinkles'
  | 'large-pores'
  | 'uneven-tone'
  | 'dullness'
  | 'dryness'
  | 'oiliness'
  | 'redness'
  | 'sensitivity'
  | 'dark-circles'
  | 'hyperpigmentation'
  | 'texture'
  | 'blackheads'
  | 'whiteheads'
  | 'sun-damage'
  | 'scarring'
  | 'eczema'
  | 'rosacea'
  | 'melasma';

export interface SkinAnalysisResult {
  id: string;
  imageUri: string;
  timestamp: Date;
  overallScore: number; // 0-100
  skinToneDetected: SkinTone;
  skinTypeDetected: SkinType;
  concerns: DetectedConcern[];
  metrics: SkinMetrics;
  recommendations: string[];
  routineSuggestion: RoutineSuggestion;
}

export interface DetectedConcern {
  type: SkinConcern;
  severity: 'mild' | 'moderate' | 'severe';
  confidence: number; // 0-1
  description: string;
  affectedArea: string;
  recommendation: string;
}

export interface SkinMetrics {
  hydration: number;      // 0-100
  oiliness: number;       // 0-100
  sensitivity: number;    // 0-100
  elasticity: number;     // 0-100
  texture: number;        // 0-100 (higher = smoother)
  pigmentation: number;   // 0-100 (higher = more even)
  poreSize: number;       // 0-100 (higher = smaller pores)
  radiance: number;       // 0-100
}

// ─── Products ──────────────────────────────────────────────────

export type ProductCategory =
  | 'cleanser'
  | 'toner'
  | 'serum'
  | 'moisturizer'
  | 'sunscreen'
  | 'eye-cream'
  | 'mask'
  | 'exfoliant'
  | 'oil'
  | 'spot-treatment'
  | 'essence'
  | 'mist'
  | 'lip-care'
  | 'retinol'
  | 'vitamin-c';

export type PriceRange = 'budget' | 'mid-range' | 'premium' | 'luxury';

export interface Product {
  id: string;
  name: string;
  brand: string;
  category: ProductCategory;
  description: string;
  imageUrl: string;
  price: number;
  currency: string;
  priceRange: PriceRange;
  rating: number;
  reviewCount: number;
  ingredients: string[];
  keyIngredients: string[];
  targetConcerns: SkinConcern[];
  suitableSkinTypes: SkinType[];
  isNatural: boolean;
  isCrueltyFree: boolean;
  isVegan: boolean;
  isFragranceFree: boolean;
  howToUse: string;
  size: string;
}

export interface ProductRecommendation {
  product: Product;
  matchScore: number;    // 0-100
  matchReasons: string[];
  alternativeIds: string[];
}

// ─── Routines ──────────────────────────────────────────────────

export type RoutineTime = 'morning' | 'evening';

export interface RoutineStep {
  order: number;
  category: ProductCategory;
  product?: Product;
  description: string;
  duration: string;
  tips: string;
  isOptional: boolean;
}

export interface RoutineSuggestion {
  morning: RoutineStep[];
  evening: RoutineStep[];
  weekly: WeeklyTreatment[];
}

export interface WeeklyTreatment {
  name: string;
  frequency: string;
  description: string;
  product?: Product;
}

export interface SavedRoutine {
  id: string;
  name: string;
  createdAt: Date;
  routine: RoutineSuggestion;
  isActive: boolean;
}

// ─── Progress Tracking ─────────────────────────────────────────

export interface SkinJournalEntry {
  id: string;
  date: Date;
  imageUri?: string;
  metrics?: SkinMetrics;
  notes: string;
  mood: 'great' | 'good' | 'okay' | 'bad';
  productsUsed: string[];
  concerns: SkinConcern[];
}

export interface ProgressData {
  entries: SkinJournalEntry[];
  analysisHistory: SkinAnalysisResult[];
  overallTrend: 'improving' | 'stable' | 'declining';
  streakDays: number;
}

// ─── Navigation ────────────────────────────────────────────────

export type RootStackParamList = {
  Onboarding: undefined;
  SkinQuiz: undefined;
  MainTabs: undefined;
  Camera: undefined;
  AnalysisResult: { analysisId: string };
  ProductDetail: { productId: string };
};

export type MainTabParamList = {
  Home: undefined;
  Scan: undefined;
  Routine: undefined;
  Products: undefined;
  Profile: undefined;
};
