/**
 * Sentry Error Tracking Configuration
 * Currently disabled - @sentry/nextjs package not installed
 *
 * To enable:
 * 1. Run: npm install @sentry/nextjs
 * 2. Set NEXT_PUBLIC_SENTRY_DSN environment variable
 * 3. Uncomment code below
 */

/*
import * as Sentry from '@sentry/nextjs';

const SENTRY_DSN = process.env.NEXT_PUBLIC_SENTRY_DSN;
const ENVIRONMENT = process.env.NODE_ENV || 'development';

if (SENTRY_DSN && typeof window !== 'undefined') {
  Sentry.init({
    dsn: SENTRY_DSN,
    environment: ENVIRONMENT,
    tracesSampleRate: ENVIRONMENT === 'production' ? 0.1 : 1.0,
    sampleRate: 1.0,
    autoSessionTracking: true,
    integrations: [
      new Sentry.BrowserTracing({
        tracingOrigins: ['localhost', /^\//],
      }),
    ],
    beforeSend(event: any, hint: any) {
      if (ENVIRONMENT === 'development') {
        console.log('Sentry event (not sent in dev):', event);
        return null;
      }

      if (event.exception) {
        const error = hint.originalException;
        if (error instanceof Error) {
          if (
            error.message.includes('Network Error') ||
            error.message.includes('Failed to fetch')
          ) {
            return null;
          }

          if (error.message.includes('cancel') || error.message.includes('abort')) {
            return null;
          }
        }
      }

      if (event.breadcrumbs) {
        event.breadcrumbs = event.breadcrumbs.map((breadcrumb: any) => {
          if (breadcrumb.category === 'xhr' || breadcrumb.category === 'fetch') {
            if (breadcrumb.data?.url) {
              breadcrumb.data.url = breadcrumb.data.url.split('?')[0];
            }
          }
          return breadcrumb;
        });
      }

      return event;
    },
    ignoreErrors: [
      'top.GLOBALS',
      'originalCreateNotification',
      'canvas.contentDocument',
      'MyApp_RemoveAllHighlights',
      'Hydration failed',
      'There was an error while hydrating',
    ],
  });

  console.log('✅ Sentry initialized for environment:', ENVIRONMENT);
} else if (!SENTRY_DSN && typeof window !== 'undefined') {
  console.warn('⚠️ NEXT_PUBLIC_SENTRY_DSN not set - error tracking disabled');
}

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
*/

// Stub exports to prevent import errors
export const trackEvent = (eventName: string, properties?: Record<string, any>) => {
  // No-op
};

export const trackError = (error: Error, context?: Record<string, any>) => {
  // No-op
};

export const setUser = (userId: string, email?: string, username?: string) => {
  // No-op
};

export const clearUser = () => {
  // No-op
};
