/**
 * Glow AI — Product Recommendation Engine
 *
 * Scores and ranks products based on user profile, skin analysis results,
 * and personal preferences. Uses weighted multi-factor matching.
 */

import {
  Product,
  ProductRecommendation,
  SkinAnalysisResult,
  UserProfile,
  SkinConcern,
  ProductCategory,
  PriceRange,
} from '../types';
import { PRODUCTS } from '../data/products';

// ─── Scoring Weights ───────────────────────────────────────────

const WEIGHTS = {
  concernMatch: 35,
  skinTypeMatch: 20,
  preferenceMatch: 15,
  budgetMatch: 10,
  rating: 10,
  popularity: 5,
  ingredientBonus: 5,
};

// ─── Price Range Budget Map ────────────────────────────────────

const BUDGET_THRESHOLDS: Record<PriceRange, number> = {
  budget: 25,
  'mid-range': 60,
  premium: 120,
  luxury: Infinity,
};

// ─── Key Active Ingredients by Concern ─────────────────────────

const HERO_INGREDIENTS: Record<SkinConcern, string[]> = {
  acne: ['Salicylic Acid', 'Benzoyl Peroxide', 'Niacinamide', 'Tea Tree', 'BHA', 'Zinc'],
  'dark-spots': ['Vitamin C', 'Azelaic Acid', 'Alpha Arbutin', 'Kojic Acid', 'Niacinamide'],
  'fine-lines': ['Retinol', 'Peptides', 'Hyaluronic Acid', 'Vitamin C', 'Bakuchiol'],
  wrinkles: ['Retinol', 'Retinal', 'Peptides', 'Collagen', 'Vitamin C'],
  'large-pores': ['Niacinamide', 'BHA', 'Salicylic Acid', 'Clay', 'AHA'],
  'uneven-tone': ['Vitamin C', 'AHA', 'Niacinamide', 'Azelaic Acid', 'Licorice Root'],
  dullness: ['Vitamin C', 'AHA', 'Glycolic Acid', 'Lactic Acid', 'Niacinamide'],
  dryness: ['Hyaluronic Acid', 'Ceramides', 'Squalane', 'Glycerin', 'Shea Butter'],
  oiliness: ['Niacinamide', 'BHA', 'Salicylic Acid', 'Clay', 'Zinc'],
  redness: ['Centella Asiatica', 'Cica', 'Aloe Vera', 'Green Tea', 'Chamomile', 'Azelaic Acid'],
  sensitivity: ['Ceramides', 'Centella Asiatica', 'Aloe Vera', 'Oat Extract', 'Allantoin'],
  'dark-circles': ['Caffeine', 'Vitamin K', 'Retinol', 'Peptides', 'Niacinamide'],
  hyperpigmentation: ['Vitamin C', 'Azelaic Acid', 'Alpha Arbutin', 'Tranexamic Acid', 'AHA'],
  texture: ['AHA', 'BHA', 'Retinol', 'Glycolic Acid', 'Lactic Acid', 'PHA'],
  blackheads: ['BHA', 'Salicylic Acid', 'Niacinamide', 'Charcoal', 'Clay'],
  whiteheads: ['BHA', 'Salicylic Acid', 'Benzoyl Peroxide', 'Retinol'],
  'sun-damage': ['Vitamin C', 'Retinol', 'AHA', 'Niacinamide', 'SPF'],
  scarring: ['Retinol', 'Vitamin C', 'AHA', 'Centella Asiatica', 'Rosehip Oil'],
  eczema: ['Ceramides', 'Colloidal Oatmeal', 'Shea Butter', 'Allantoin'],
  rosacea: ['Azelaic Acid', 'Centella Asiatica', 'Green Tea', 'Niacinamide'],
  melasma: ['Azelaic Acid', 'Vitamin C', 'Tranexamic Acid', 'Alpha Arbutin', 'Kojic Acid'],
};

// ─── Core Recommendation Logic ─────────────────────────────────

function scoreProduct(
  product: Product,
  concerns: SkinConcern[],
  profile?: UserProfile,
  analysis?: SkinAnalysisResult
): number {
  let score = 0;

  // 1. Concern match (highest weight)
  const concernMatchCount = concerns.filter((c) =>
    product.targetConcerns.includes(c)
  ).length;
  if (concerns.length > 0) {
    score += (concernMatchCount / concerns.length) * WEIGHTS.concernMatch;
  }

  // 2. Skin type match
  const skinType = analysis?.skinTypeDetected ?? profile?.skinType;
  if (skinType && product.suitableSkinTypes.includes(skinType)) {
    score += WEIGHTS.skinTypeMatch;
  }

  // 3. Preference match
  if (profile?.preferences) {
    let prefScore = 0;
    let prefCount = 0;

    if (profile.preferences.preferCrueltyFree) {
      prefCount++;
      if (product.isCrueltyFree) prefScore++;
    }
    if (profile.preferences.preferVegan) {
      prefCount++;
      if (product.isVegan) prefScore++;
    }
    if (profile.preferences.preferFragranceFree) {
      prefCount++;
      if (product.isFragranceFree) prefScore++;
    }
    if (profile.preferences.preferNatural) {
      prefCount++;
      if (product.isNatural) prefScore++;
    }

    if (prefCount > 0) {
      score += (prefScore / prefCount) * WEIGHTS.preferenceMatch;
    } else {
      score += WEIGHTS.preferenceMatch * 0.5; // neutral
    }
  }

  // 4. Budget match
  if (profile?.preferences?.budgetRange) {
    const maxBudget = BUDGET_THRESHOLDS[profile.preferences.budgetRange];
    if (product.price <= maxBudget) {
      score += WEIGHTS.budgetMatch;
    } else {
      // Slight penalty for being over budget, but don't exclude
      score += WEIGHTS.budgetMatch * 0.3;
    }
  } else {
    score += WEIGHTS.budgetMatch * 0.5;
  }

  // 5. Rating
  score += (product.rating / 5) * WEIGHTS.rating;

  // 6. Popularity (log scale)
  const popularityNorm = Math.min(1, Math.log10(product.reviewCount + 1) / 5);
  score += popularityNorm * WEIGHTS.popularity;

  // 7. Ingredient bonus — if product has hero ingredients for the concerns
  let ingredientHits = 0;
  for (const concern of concerns) {
    const heroIngredients = HERO_INGREDIENTS[concern] ?? [];
    for (const ingredient of product.keyIngredients) {
      if (heroIngredients.some((hi) => ingredient.toLowerCase().includes(hi.toLowerCase()))) {
        ingredientHits++;
        break;
      }
    }
  }
  if (concerns.length > 0) {
    score += (ingredientHits / concerns.length) * WEIGHTS.ingredientBonus;
  }

  return Math.round(score);
}

function generateMatchReasons(
  product: Product,
  concerns: SkinConcern[],
  profile?: UserProfile
): string[] {
  const reasons: string[] = [];

  const matchedConcerns = concerns.filter((c) => product.targetConcerns.includes(c));
  if (matchedConcerns.length > 0) {
    const names = matchedConcerns.map((c) => c.replace(/-/g, ' ')).join(', ');
    reasons.push(`Targets your concerns: ${names}`);
  }

  for (const concern of concerns) {
    const heroes = HERO_INGREDIENTS[concern] ?? [];
    const matchedIngredients = product.keyIngredients.filter((ki) =>
      heroes.some((h) => ki.toLowerCase().includes(h.toLowerCase()))
    );
    if (matchedIngredients.length > 0) {
      reasons.push(`Contains ${matchedIngredients.join(', ')} — proven for ${concern.replace(/-/g, ' ')}`);
    }
  }

  const skinType = profile?.skinType;
  if (skinType && product.suitableSkinTypes.includes(skinType)) {
    reasons.push(`Suitable for ${skinType} skin`);
  }

  if (product.rating >= 4.5) {
    reasons.push(`Highly rated (${product.rating}/5 from ${product.reviewCount.toLocaleString()} reviews)`);
  }

  if (profile?.preferences?.preferCrueltyFree && product.isCrueltyFree) {
    reasons.push('Cruelty-free');
  }
  if (profile?.preferences?.preferVegan && product.isVegan) {
    reasons.push('Vegan');
  }

  return reasons.slice(0, 4);
}

// ─── Public API ────────────────────────────────────────────────

export function getRecommendations(
  concerns: SkinConcern[],
  profile?: UserProfile,
  analysis?: SkinAnalysisResult,
  limit = 10
): ProductRecommendation[] {
  const scored = PRODUCTS.map((product) => ({
    product,
    matchScore: scoreProduct(product, concerns, profile, analysis),
    matchReasons: generateMatchReasons(product, concerns, profile),
    alternativeIds: [] as string[],
  }));

  // Sort by score descending
  scored.sort((a, b) => b.matchScore - a.matchScore);

  // Add alternatives (same category, next-best matches)
  for (const rec of scored) {
    rec.alternativeIds = scored
      .filter(
        (alt) =>
          alt.product.id !== rec.product.id &&
          alt.product.category === rec.product.category
      )
      .slice(0, 2)
      .map((alt) => alt.product.id);
  }

  return scored.slice(0, limit);
}

export function getRecommendationsByCategory(
  category: ProductCategory,
  concerns: SkinConcern[],
  profile?: UserProfile,
  analysis?: SkinAnalysisResult
): ProductRecommendation[] {
  const categoryProducts = PRODUCTS.filter((p) => p.category === category);

  const scored = categoryProducts.map((product) => ({
    product,
    matchScore: scoreProduct(product, concerns, profile, analysis),
    matchReasons: generateMatchReasons(product, concerns, profile),
    alternativeIds: [] as string[],
  }));

  scored.sort((a, b) => b.matchScore - a.matchScore);

  return scored;
}

export function getRoutineRecommendations(
  concerns: SkinConcern[],
  profile?: UserProfile,
  analysis?: SkinAnalysisResult
): Record<ProductCategory, ProductRecommendation[]> {
  const routineCategories: ProductCategory[] = [
    'cleanser',
    'toner',
    'serum',
    'moisturizer',
    'sunscreen',
    'eye-cream',
  ];

  const result: Partial<Record<ProductCategory, ProductRecommendation[]>> = {};

  for (const category of routineCategories) {
    result[category] = getRecommendationsByCategory(category, concerns, profile, analysis);
  }

  return result as Record<ProductCategory, ProductRecommendation[]>;
}
