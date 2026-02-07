import {
  getLoadingAriaLabel,
  getErrorAriaLabel,
  shouldHaveFocus,
  trapFocus,
  announceToScreenReader,
  getSignalAriaLabel,
  getPriceChangeAriaLabel,
  handleKeyboardActivation,
} from '../accessibility';

describe('getLoadingAriaLabel', () => {
  it('returns "Loading content" by default', () => {
    expect(getLoadingAriaLabel()).toBe('Loading content');
  });

  it('uses custom item name', () => {
    expect(getLoadingAriaLabel('portfolio data')).toBe('Loading portfolio data');
  });
});

describe('getErrorAriaLabel', () => {
  it('returns formatted error string', () => {
    expect(getErrorAriaLabel('Connection failed')).toBe('Error: Connection failed');
  });
});

describe('shouldHaveFocus', () => {
  it('returns false for null', () => {
    expect(shouldHaveFocus(null)).toBe(false);
  });

  it('returns true for button element', () => {
    const button = document.createElement('button');
    expect(shouldHaveFocus(button)).toBe(true);
  });

  it('returns true for anchor with href', () => {
    const anchor = document.createElement('a');
    anchor.setAttribute('href', '/test');
    expect(shouldHaveFocus(anchor)).toBe(true);
  });

  it('returns false for disabled button', () => {
    const button = document.createElement('button');
    button.setAttribute('disabled', '');
    expect(shouldHaveFocus(button)).toBe(false);
  });

  it('returns false for plain div', () => {
    const div = document.createElement('div');
    expect(shouldHaveFocus(div)).toBe(false);
  });

  it('returns true for element with tabindex', () => {
    const div = document.createElement('div');
    div.setAttribute('tabindex', '0');
    expect(shouldHaveFocus(div)).toBe(true);
  });

  it('returns false for element with tabindex -1', () => {
    const div = document.createElement('div');
    div.setAttribute('tabindex', '-1');
    expect(shouldHaveFocus(div)).toBe(false);
  });

  it('returns true for input element', () => {
    const input = document.createElement('input');
    expect(shouldHaveFocus(input)).toBe(true);
  });

  it('returns false for anchor without href', () => {
    const anchor = document.createElement('a');
    expect(shouldHaveFocus(anchor)).toBe(false);
  });
});

describe('trapFocus', () => {
  it('returns a cleanup function', () => {
    const container = document.createElement('div');
    const button = document.createElement('button');
    container.appendChild(button);

    const cleanup = trapFocus(container);
    expect(typeof cleanup).toBe('function');
    cleanup();
  });

  it('handles Tab key wrapping to first element', () => {
    const container = document.createElement('div');
    const firstButton = document.createElement('button');
    firstButton.textContent = 'First';
    const lastButton = document.createElement('button');
    lastButton.textContent = 'Last';
    container.appendChild(firstButton);
    container.appendChild(lastButton);
    document.body.appendChild(container);

    const cleanup = trapFocus(container);

    // Focus the last button
    lastButton.focus();
    expect(document.activeElement).toBe(lastButton);

    // Simulate Tab on the last element (should wrap to first)
    const focusSpy = jest.spyOn(firstButton, 'focus');
    const tabEvent = new KeyboardEvent('keydown', {
      key: 'Tab',
      shiftKey: false,
      bubbles: true,
    });
    const preventDefaultSpy = jest.spyOn(tabEvent, 'preventDefault');
    container.dispatchEvent(tabEvent);

    expect(preventDefaultSpy).toHaveBeenCalled();
    expect(focusSpy).toHaveBeenCalled();

    cleanup();
    document.body.removeChild(container);
  });

  it('handles Shift+Tab key wrapping to last element', () => {
    const container = document.createElement('div');
    const firstButton = document.createElement('button');
    firstButton.textContent = 'First';
    const lastButton = document.createElement('button');
    lastButton.textContent = 'Last';
    container.appendChild(firstButton);
    container.appendChild(lastButton);
    document.body.appendChild(container);

    const cleanup = trapFocus(container);

    // Focus the first button
    firstButton.focus();
    expect(document.activeElement).toBe(firstButton);

    // Simulate Shift+Tab on the first element (should wrap to last)
    const focusSpy = jest.spyOn(lastButton, 'focus');
    const shiftTabEvent = new KeyboardEvent('keydown', {
      key: 'Tab',
      shiftKey: true,
      bubbles: true,
    });
    const preventDefaultSpy = jest.spyOn(shiftTabEvent, 'preventDefault');
    container.dispatchEvent(shiftTabEvent);

    expect(preventDefaultSpy).toHaveBeenCalled();
    expect(focusSpy).toHaveBeenCalled();

    cleanup();
    document.body.removeChild(container);
  });

  it('does not interfere with non-Tab keys', () => {
    const container = document.createElement('div');
    const button = document.createElement('button');
    container.appendChild(button);
    document.body.appendChild(container);

    const cleanup = trapFocus(container);

    const enterEvent = new KeyboardEvent('keydown', {
      key: 'Enter',
      bubbles: true,
    });
    const preventDefaultSpy = jest.spyOn(enterEvent, 'preventDefault');
    container.dispatchEvent(enterEvent);

    expect(preventDefaultSpy).not.toHaveBeenCalled();

    cleanup();
    document.body.removeChild(container);
  });
});

describe('announceToScreenReader', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('creates and removes announcement element', () => {
    announceToScreenReader('Data loaded');

    const announcement = document.querySelector('[role="status"]');
    expect(announcement).not.toBeNull();
    expect(announcement!.textContent).toBe('Data loaded');
    expect(announcement!.getAttribute('aria-live')).toBe('polite');
    expect(announcement!.getAttribute('aria-atomic')).toBe('true');
    expect(announcement!.className).toBe('sr-only');

    // Element should be removed after 1 second
    jest.advanceTimersByTime(1000);
    const removedAnnouncement = document.querySelector('[role="status"]');
    expect(removedAnnouncement).toBeNull();
  });

  it('uses assertive priority when specified', () => {
    announceToScreenReader('Critical error', 'assertive');

    const announcement = document.querySelector('[role="status"]');
    expect(announcement).not.toBeNull();
    expect(announcement!.getAttribute('aria-live')).toBe('assertive');

    jest.advanceTimersByTime(1000);
  });
});

describe('getSignalAriaLabel', () => {
  it('returns signal label without confidence', () => {
    expect(getSignalAriaLabel('strong_buy')).toBe('Signal: strong buy');
  });

  it('returns signal label with confidence percentage', () => {
    expect(getSignalAriaLabel('buy', 85.7)).toBe('Signal: buy with 86% confidence');
  });

  it('handles zero confidence', () => {
    expect(getSignalAriaLabel('hold', 0)).toBe('Signal: hold with 0% confidence');
  });
});

describe('getPriceChangeAriaLabel', () => {
  it('returns "increased" for positive change', () => {
    expect(getPriceChangeAriaLabel(1.5, 2.34)).toBe('Price increased by 2.34%');
  });

  it('returns "decreased" for negative change', () => {
    expect(getPriceChangeAriaLabel(-0.75, -1.23)).toBe('Price decreased by 1.23%');
  });

  it('returns "increased" for zero change', () => {
    expect(getPriceChangeAriaLabel(0, 0)).toBe('Price increased by 0.00%');
  });
});

describe('handleKeyboardActivation', () => {
  it('calls callback on Enter', () => {
    const callback = jest.fn();
    const mockEvent = { key: 'Enter', preventDefault: jest.fn() } as any;

    handleKeyboardActivation(mockEvent, callback);

    expect(mockEvent.preventDefault).toHaveBeenCalled();
    expect(callback).toHaveBeenCalled();
  });

  it('calls callback on Space', () => {
    const callback = jest.fn();
    const mockEvent = { key: ' ', preventDefault: jest.fn() } as any;

    handleKeyboardActivation(mockEvent, callback);

    expect(mockEvent.preventDefault).toHaveBeenCalled();
    expect(callback).toHaveBeenCalled();
  });

  it('does not call callback on other keys', () => {
    const callback = jest.fn();
    const mockEvent = { key: 'Escape', preventDefault: jest.fn() } as any;

    handleKeyboardActivation(mockEvent, callback);

    expect(mockEvent.preventDefault).not.toHaveBeenCalled();
    expect(callback).not.toHaveBeenCalled();
  });

  it('does not call callback on Tab key', () => {
    const callback = jest.fn();
    const mockEvent = { key: 'Tab', preventDefault: jest.fn() } as any;

    handleKeyboardActivation(mockEvent, callback);

    expect(mockEvent.preventDefault).not.toHaveBeenCalled();
    expect(callback).not.toHaveBeenCalled();
  });
});
