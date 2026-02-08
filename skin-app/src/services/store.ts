/**
 * Glow AI — Global State Management (Zustand)
 */

import { create } from 'zustand';
import {
  UserProfile,
  SkinAnalysisResult,
  SavedRoutine,
  SkinConcern,
  SkinType,
  SkinTone,
  AgeRange,
  Gender,
  UserPreferences,
  StylePreference,
  SkinJournalEntry,
} from '../types';

// ─── App State ─────────────────────────────────────────────────

interface AppState {
  // Onboarding
  hasCompletedOnboarding: boolean;
  setOnboardingComplete: () => void;

  // User Profile
  userProfile: UserProfile | null;
  setUserProfile: (profile: UserProfile) => void;
  updateProfile: (updates: Partial<UserProfile>) => void;

  // Skin Quiz state (builds the profile incrementally)
  quizStep: number;
  quizData: Partial<QuizData>;
  setQuizStep: (step: number) => void;
  setQuizData: (data: Partial<QuizData>) => void;
  finalizeQuiz: () => void;

  // Analysis
  currentAnalysis: SkinAnalysisResult | null;
  analysisHistory: SkinAnalysisResult[];
  setCurrentAnalysis: (result: SkinAnalysisResult) => void;
  clearCurrentAnalysis: () => void;

  // Routines
  activeRoutine: SavedRoutine | null;
  savedRoutines: SavedRoutine[];
  setActiveRoutine: (routine: SavedRoutine) => void;
  saveRoutine: (routine: SavedRoutine) => void;

  // Journal
  journalEntries: SkinJournalEntry[];
  addJournalEntry: (entry: SkinJournalEntry) => void;

  // UI state
  isAnalyzing: boolean;
  setIsAnalyzing: (v: boolean) => void;
}

export interface QuizData {
  name: string;
  age: AgeRange;
  gender: Gender;
  skinType: SkinType;
  skinTone: SkinTone;
  concerns: SkinConcern[];
  allergies: string[];
  budgetRange: 'budget' | 'mid-range' | 'premium' | 'luxury';
  preferNatural: boolean;
  preferFragranceFree: boolean;
  preferCrueltyFree: boolean;
  preferVegan: boolean;
  stylePreferences: StylePreference[];
  skinGoals: string[];
}

export const useAppStore = create<AppState>((set, get) => ({
  // ── Onboarding ───────────────────────────────────────────
  hasCompletedOnboarding: false,
  setOnboardingComplete: () => set({ hasCompletedOnboarding: true }),

  // ── User Profile ─────────────────────────────────────────
  userProfile: null,
  setUserProfile: (profile) => set({ userProfile: profile }),
  updateProfile: (updates) => {
    const current = get().userProfile;
    if (current) {
      set({ userProfile: { ...current, ...updates, updatedAt: new Date() } });
    }
  },

  // ── Quiz ─────────────────────────────────────────────────
  quizStep: 0,
  quizData: {},
  setQuizStep: (step) => set({ quizStep: step }),
  setQuizData: (data) =>
    set((state) => ({ quizData: { ...state.quizData, ...data } })),
  finalizeQuiz: () => {
    const { quizData } = get();
    const profile: UserProfile = {
      id: `user_${Date.now()}`,
      name: quizData.name ?? 'Beautiful',
      age: quizData.age ?? '23-27',
      gender: quizData.gender ?? 'prefer-not-to-say',
      skinType: quizData.skinType ?? 'normal',
      skinTone: quizData.skinTone ?? 'medium',
      concerns: quizData.concerns ?? [],
      allergies: quizData.allergies ?? [],
      preferences: {
        budgetRange: quizData.budgetRange ?? 'mid-range',
        preferNatural: quizData.preferNatural ?? false,
        preferFragranceFree: quizData.preferFragranceFree ?? false,
        preferCrueltyFree: quizData.preferCrueltyFree ?? false,
        preferVegan: quizData.preferVegan ?? false,
        stylePreferences: quizData.stylePreferences ?? [],
        skinGoals: quizData.skinGoals ?? [],
      },
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    set({
      userProfile: profile,
      hasCompletedOnboarding: true,
      quizStep: 0,
      quizData: {},
    });
  },

  // ── Analysis ─────────────────────────────────────────────
  currentAnalysis: null,
  analysisHistory: [],
  setCurrentAnalysis: (result) =>
    set((state) => ({
      currentAnalysis: result,
      analysisHistory: [result, ...state.analysisHistory].slice(0, 50),
    })),
  clearCurrentAnalysis: () => set({ currentAnalysis: null }),

  // ── Routines ─────────────────────────────────────────────
  activeRoutine: null,
  savedRoutines: [],
  setActiveRoutine: (routine) => set({ activeRoutine: routine }),
  saveRoutine: (routine) =>
    set((state) => ({
      savedRoutines: [routine, ...state.savedRoutines],
      activeRoutine: routine,
    })),

  // ── Journal ──────────────────────────────────────────────
  journalEntries: [],
  addJournalEntry: (entry) =>
    set((state) => ({
      journalEntries: [entry, ...state.journalEntries],
    })),

  // ── UI ───────────────────────────────────────────────────
  isAnalyzing: false,
  setIsAnalyzing: (v) => set({ isAnalyzing: v }),
}));
