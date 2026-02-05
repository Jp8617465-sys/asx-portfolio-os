/**
 * Accessibility utilities and helpers
 */

/**
 * Generate ARIA label for loading state
 */
export function getLoadingAriaLabel(itemName: string = 'content'): string {
  return `Loading ${itemName}`;
}

/**
 * Generate ARIA label for error state
 */
export function getErrorAriaLabel(error: string): string {
  return `Error: ${error}`;
}

/**
 * Check if element should have keyboard focus
 */
export function shouldHaveFocus(element: HTMLElement | null): boolean {
  if (!element) return false;

  const focusableElements = [
    'a[href]',
    'button:not([disabled])',
    'textarea:not([disabled])',
    'input:not([disabled])',
    'select:not([disabled])',
    '[tabindex]:not([tabindex="-1"])',
  ];

  return focusableElements.some((selector) => element.matches(selector));
}

/**
 * Trap focus within a modal or dialog
 */
export function trapFocus(element: HTMLElement) {
  const focusableElements = element.querySelectorAll<HTMLElement>(
    'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
  );

  const firstFocusable = focusableElements[0];
  const lastFocusable = focusableElements[focusableElements.length - 1];

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key !== 'Tab') return;

    if (e.shiftKey && document.activeElement === firstFocusable) {
      e.preventDefault();
      lastFocusable.focus();
    } else if (!e.shiftKey && document.activeElement === lastFocusable) {
      e.preventDefault();
      firstFocusable.focus();
    }
  };

  element.addEventListener('keydown', handleKeyDown);

  return () => {
    element.removeEventListener('keydown', handleKeyDown);
  };
}

/**
 * Announce message to screen readers
 */
export function announceToScreenReader(
  message: string,
  priority: 'polite' | 'assertive' = 'polite'
) {
  const announcement = document.createElement('div');
  announcement.setAttribute('role', 'status');
  announcement.setAttribute('aria-live', priority);
  announcement.setAttribute('aria-atomic', 'true');
  announcement.className = 'sr-only';
  announcement.textContent = message;

  document.body.appendChild(announcement);

  setTimeout(() => {
    document.body.removeChild(announcement);
  }, 1000);
}

/**
 * Get descriptive label for signal type
 */
export function getSignalAriaLabel(signal: string, confidence?: number): string {
  const baseLabel = `Signal: ${signal.replace('_', ' ')}`;
  if (confidence !== undefined) {
    return `${baseLabel} with ${Math.round(confidence)}% confidence`;
  }
  return baseLabel;
}

/**
 * Get descriptive label for price change
 */
export function getPriceChangeAriaLabel(change: number, changePercent: number): string {
  const direction = change >= 0 ? 'increased' : 'decreased';
  return `Price ${direction} by ${Math.abs(changePercent).toFixed(2)}%`;
}

/**
 * Keyboard event helper for Enter/Space activation
 */
export function handleKeyboardActivation(event: React.KeyboardEvent, callback: () => void) {
  if (event.key === 'Enter' || event.key === ' ') {
    event.preventDefault();
    callback();
  }
}
