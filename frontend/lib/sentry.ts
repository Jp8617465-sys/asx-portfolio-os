/**
 * Sentry Error Tracking Configuration
 * Initializes Sentry for frontend error monitoring
 */

import * as Sentry from '@sentry/nextjs';

const SENTRY_DSN = process.env.NEXT_PUBLIC_SENTRY_DSN;
const ENVIRONMENT = process.env.NODE_ENV || 'development';

if (SENTRY_DSN && typeof window !== 'undefined') {
  Sentry.init({
    dsn: SENTRY_DSN,
    environment: ENVIRONMENT,

    // Set tracesSampleRate to capture a percentage of transactions for performance monitoring
    // 0.1 = 10% of transactions
    tracesSampleRate: ENVIRONMENT === 'production' ? 0.1 : 1.0,

    // Capture 100% of errors
    sampleRate: 1.0,

    // Enable automatic session tracking
    autoSessionTracking: true,

    // Integrations
    integrations: [
      // Automatic breadcrumbs for console, fetch, XHR, DOM events
      new Sentry.BrowserTracing({
        tracingOrigins: ['localhost', /^\//],
      }),
    ],

    // Filter out sensitive data
    beforeSend(event, hint) {
      // Don't send errors in development
      if (ENVIRONMENT === 'development') {
        console.log('Sentry event (not sent in dev):', event);
        return null;
      }

      // Filter out noisy errors
      if (event.exception) {
        const error = hint.originalException;
        if (error instanceof Error) {
          // Ignore network errors (user offline, etc.)
          if (error.message.includes('Network Error') || error.message.includes('Failed to fetch')) {
            return null;
          }

          // Ignore cancelled requests
          if (error.message.includes('cancel') || error.message.includes('abort')) {
            return null;
          }
        }
      }

      // Remove sensitive data from breadcrumbs
      if (event.breadcrumbs) {
        event.breadcrumbs = event.breadcrumbs.map((breadcrumb) => {
          if (breadcrumb.category === 'xhr' || breadcrumb.category === 'fetch') {
            if (breadcrumb.data?.url) {
              // Remove query parameters that might contain sensitive data
              breadcrumb.data.url = breadcrumb.data.url.split('?')[0];
            }
          }
          return breadcrumb;
        });
      }

      return event;
    },

    // Ignore certain errors
    ignoreErrors: [
      // Browser extensions
      'top.GLOBALS',
      // Random plugins/extensions
      'originalCreateNotification',
      'canvas.contentDocument',
      'MyApp_RemoveAllHighlights',
      // React hydration mismatches (common in Next.js)
      'Hydration failed',
      'There was an error while hydrating',
    ],
  });

  console.log('✅ Sentry initialized for environment:', ENVIRONMENT);
} else if (!SENTRY_DSN && typeof window !== 'undefined') {
  console.warn('⚠️ NEXT_PUBLIC_SENTRY_DSN not set - error tracking disabled');
}

// Custom event tracking helpers
export const trackEvent = (eventName: string, properties?: Record<string, any>) => {
  if (typeof window === 'undefined') return;

  Sentry.addBreadcrumb({
    category: 'custom',
    message: eventName,
    level: 'info',
    data: properties,
  });
};

export const trackError = (error: Error, context?: Record<string, any>) => {
  if (typeof window === 'undefined') return;

  Sentry.captureException(error, {
    extra: context,
  });
};

export const setUser = (userId: string, email?: string, username?: string) => {
  if (typeof window === 'undefined') return;

  Sentry.setUser({
    id: userId,
    email,
    username,
  });
};

export const clearUser = () => {
  if (typeof window === 'undefined') return;

  Sentry.setUser(null);
};
