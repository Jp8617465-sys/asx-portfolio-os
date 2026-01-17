# ASX Portfolio OS - Frontend Design Specification

**Version:** 1.0
**Date:** January 15, 2026
**Status:** Ready for Implementation

## Executive Summary

AI-driven portfolio management platform for Australian Stock Exchange using 3-model ensemble (Technical + Fundamentals + Sentiment) targeting 70% prediction accuracy. This document defines the complete frontend architecture, design system, and implementation roadmap.

## Technology Stack

### Core Framework

- **Next.js 14** (App Router) - SSR for SEO, file-based routing
- **TypeScript** - Type safety across codebase
- **Deployment:** Vercel Edge (automatic scaling, global CDN)

### UI & Styling

- **shadcn/ui** - Accessible, customizable React components
- **Tailwind CSS** - Utility-first styling
- **Radix UI** - Headless components for accessibility

### Data Visualization

- **TradingView Lightweight Charts** - Industry-standard financial charts
- **Recharts** - Additional charts (portfolio allocation, performance)

### Data Management

- **TanStack Table v8** - Advanced table with sorting, filtering, pagination
- **TanStack Query (React Query)** - Server state management, caching
- **Zustand** - Client-side state (watchlist, preferences)

### Forms & Validation

- **React Hook Form** - Performant form management
- **Zod** - Schema validation with TypeScript inference

### API Integration

- **Axios** - HTTP client with interceptors
- **WebSocket** (Socket.io-client) - Real-time updates (Phase 3+)

[Rest of specification content from original document...]
