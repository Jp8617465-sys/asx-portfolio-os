import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import ThemeToggle from '../ThemeToggle';

// Setup matchMedia mock globally
let mockMatchMedia: jest.Mock;
let mockLocalStorage: Record<string, string> = {};

// Initialize matchMedia before all tests
beforeAll(() => {
  mockMatchMedia = jest.fn().mockReturnValue({ matches: false });
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: mockMatchMedia,
  });
});

describe('ThemeToggle', () => {
  beforeEach(() => {
    // Reset localStorage mock
    mockLocalStorage = {};
    Storage.prototype.getItem = jest.fn((key) => mockLocalStorage[key] || null);
    Storage.prototype.setItem = jest.fn((key, value) => {
      mockLocalStorage[key] = value;
    });

    // Reset matchMedia to default
    mockMatchMedia.mockReturnValue({ matches: false });

    // Reset document.documentElement.classList
    document.documentElement.className = '';
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Initial Render', () => {
    it('renders button after mounting', async () => {
      render(<ThemeToggle />);
      // Component should render button after mount
      await waitFor(() => {
        expect(screen.getByRole('button')).toBeInTheDocument();
      });
    });

    it('defaults to light theme when no stored preference and system prefers light', async () => {
      mockMatchMedia.mockReturnValue({ matches: false });

      render(<ThemeToggle />);

      await waitFor(() => {
        expect(screen.getByRole('button')).toBeInTheDocument();
      });

      expect(screen.getByText('Light')).toBeInTheDocument();
      expect(document.documentElement.classList.contains('dark')).toBe(false);
    });

    it('defaults to dark theme when no stored preference and system prefers dark', async () => {
      mockMatchMedia.mockReturnValue({ matches: true });

      render(<ThemeToggle />);

      await waitFor(() => {
        expect(screen.getByRole('button')).toBeInTheDocument();
      });

      expect(screen.getByText('Dark')).toBeInTheDocument();
      expect(document.documentElement.classList.contains('dark')).toBe(true);
    });

    it('uses stored theme preference over system preference', async () => {
      mockLocalStorage['asx-portfolio-theme'] = 'dark';
      mockMatchMedia.mockReturnValue({ matches: false }); // System prefers light

      render(<ThemeToggle />);

      await waitFor(() => {
        expect(screen.getByRole('button')).toBeInTheDocument();
      });

      expect(screen.getByText('Dark')).toBeInTheDocument();
      expect(document.documentElement.classList.contains('dark')).toBe(true);
    });

    it('loads light theme from localStorage', async () => {
      mockLocalStorage['asx-portfolio-theme'] = 'light';
      mockMatchMedia.mockReturnValue({ matches: true }); // System prefers dark

      render(<ThemeToggle />);

      await waitFor(() => {
        expect(screen.getByRole('button')).toBeInTheDocument();
      });

      expect(screen.getByText('Light')).toBeInTheDocument();
      expect(document.documentElement.classList.contains('dark')).toBe(false);
    });
  });

  describe('Theme Toggling', () => {
    it('changes from light to dark when clicked', async () => {
      mockMatchMedia.mockReturnValue({ matches: false });

      render(<ThemeToggle />);

      await waitFor(() => {
        expect(screen.getByRole('button')).toBeInTheDocument();
      });

      const button = screen.getByRole('button');
      expect(screen.getByText('Light')).toBeInTheDocument();

      fireEvent.click(button);

      expect(screen.getByText('Dark')).toBeInTheDocument();
      expect(document.documentElement.classList.contains('dark')).toBe(true);
    });

    it('changes from dark to light when clicked', async () => {
      mockMatchMedia.mockReturnValue({ matches: true });

      render(<ThemeToggle />);

      await waitFor(() => {
        expect(screen.getByRole('button')).toBeInTheDocument();
      });

      const button = screen.getByRole('button');
      expect(screen.getByText('Dark')).toBeInTheDocument();

      fireEvent.click(button);

      expect(screen.getByText('Light')).toBeInTheDocument();
      expect(document.documentElement.classList.contains('dark')).toBe(false);
    });

    it('toggles theme multiple times correctly', async () => {
      mockMatchMedia.mockReturnValue({ matches: false });

      render(<ThemeToggle />);

      await waitFor(() => {
        expect(screen.getByRole('button')).toBeInTheDocument();
      });

      const button = screen.getByRole('button');

      // Start: Light
      expect(screen.getByText('Light')).toBeInTheDocument();

      // First click: Light -> Dark
      fireEvent.click(button);
      expect(screen.getByText('Dark')).toBeInTheDocument();

      // Second click: Dark -> Light
      fireEvent.click(button);
      expect(screen.getByText('Light')).toBeInTheDocument();

      // Third click: Light -> Dark
      fireEvent.click(button);
      expect(screen.getByText('Dark')).toBeInTheDocument();
    });
  });

  describe('localStorage Persistence', () => {
    it('saves dark theme to localStorage when toggled', async () => {
      mockMatchMedia.mockReturnValue({ matches: false });

      render(<ThemeToggle />);

      await waitFor(() => {
        expect(screen.getByRole('button')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole('button'));

      expect(Storage.prototype.setItem).toHaveBeenCalledWith('asx-portfolio-theme', 'dark');
    });

    it('saves light theme to localStorage when toggled', async () => {
      mockMatchMedia.mockReturnValue({ matches: true });

      render(<ThemeToggle />);

      await waitFor(() => {
        expect(screen.getByRole('button')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole('button'));

      expect(Storage.prototype.setItem).toHaveBeenCalledWith('asx-portfolio-theme', 'light');
    });

    it('reads from localStorage on component mount', async () => {
      mockLocalStorage['asx-portfolio-theme'] = 'dark';
      mockMatchMedia.mockReturnValue({ matches: false });

      render(<ThemeToggle />);

      await waitFor(() => {
        expect(screen.getByRole('button')).toBeInTheDocument();
      });

      expect(Storage.prototype.getItem).toHaveBeenCalledWith('asx-portfolio-theme');
    });
  });

  describe('System Preference Detection', () => {
    it('calls window.matchMedia with correct query', async () => {
      mockMatchMedia.mockReturnValue({ matches: false });

      render(<ThemeToggle />);

      await waitFor(() => {
        expect(screen.getByRole('button')).toBeInTheDocument();
      });

      expect(mockMatchMedia).toHaveBeenCalledWith('(prefers-color-scheme: dark)');
    });

    it('applies system preference when no stored theme exists', async () => {
      mockMatchMedia.mockReturnValue({ matches: true });

      render(<ThemeToggle />);

      await waitFor(() => {
        expect(screen.getByRole('button')).toBeInTheDocument();
      });

      expect(document.documentElement.classList.contains('dark')).toBe(true);
      expect(screen.getByText('Dark')).toBeInTheDocument();
    });
  });

  describe('DOM Class Manipulation', () => {
    it('adds dark class to document element when dark theme active', async () => {
      mockMatchMedia.mockReturnValue({ matches: false });

      render(<ThemeToggle />);

      await waitFor(() => {
        expect(screen.getByRole('button')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole('button'));

      expect(document.documentElement.classList.contains('dark')).toBe(true);
    });

    it('removes dark class from document element when light theme active', async () => {
      mockMatchMedia.mockReturnValue({ matches: true });

      render(<ThemeToggle />);

      await waitFor(() => {
        expect(screen.getByRole('button')).toBeInTheDocument();
      });

      // Start with dark
      expect(document.documentElement.classList.contains('dark')).toBe(true);

      // Toggle to light
      fireEvent.click(screen.getByRole('button'));

      expect(document.documentElement.classList.contains('dark')).toBe(false);
    });
  });

  describe('Button Rendering', () => {
    it('renders button with correct type attribute', async () => {
      mockMatchMedia.mockReturnValue({ matches: false });

      render(<ThemeToggle />);

      await waitFor(() => {
        expect(screen.getByRole('button')).toBeInTheDocument();
      });

      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('type', 'button');
    });

    it('renders button with correct styling classes', async () => {
      mockMatchMedia.mockReturnValue({ matches: false });

      render(<ThemeToggle />);

      await waitFor(() => {
        expect(screen.getByRole('button')).toBeInTheDocument();
      });

      const button = screen.getByRole('button');
      expect(button).toHaveClass('rounded-full');
      expect(button).toHaveClass('border');
      expect(button).toHaveClass('uppercase');
    });

    it('displays correct text for light theme', async () => {
      mockMatchMedia.mockReturnValue({ matches: false });

      render(<ThemeToggle />);

      await waitFor(() => {
        expect(screen.getByRole('button')).toBeInTheDocument();
      });

      expect(screen.getByText('Light')).toBeInTheDocument();
    });

    it('displays correct text for dark theme', async () => {
      mockMatchMedia.mockReturnValue({ matches: true });

      render(<ThemeToggle />);

      await waitFor(() => {
        expect(screen.getByRole('button')).toBeInTheDocument();
      });

      expect(screen.getByText('Dark')).toBeInTheDocument();
    });
  });
});
