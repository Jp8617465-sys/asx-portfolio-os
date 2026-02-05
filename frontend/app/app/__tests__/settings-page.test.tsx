import { render, screen } from '@testing-library/react';
import SettingsPage from '../settings/page';

// Mock child components
jest.mock('../../../components/PageTransition', () => {
  return function MockPageTransition({ children }: { children: React.ReactNode }) {
    return <div data-testid="page-transition">{children}</div>;
  };
});

jest.mock('../../../components/Topbar', () => {
  return function MockTopbar({
    title,
    subtitle,
    eyebrow,
  }: {
    title: string;
    subtitle: string;
    eyebrow: string;
  }) {
    return (
      <div data-testid="topbar">
        <span data-testid="topbar-eyebrow">{eyebrow}</span>
        <span data-testid="topbar-title">{title}</span>
        <span data-testid="topbar-subtitle">{subtitle}</span>
      </div>
    );
  };
});

jest.mock('../../../components/ui/card', () => ({
  Card: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <div data-testid="card" className={className}>
      {children}
    </div>
  ),
  CardContent: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <div data-testid="card-content" className={className}>
      {children}
    </div>
  ),
  CardHeader: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="card-header">{children}</div>
  ),
  CardTitle: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="card-title">{children}</div>
  ),
}));

jest.mock('../../../components/ui/badge', () => ({
  Badge: ({ children, variant }: { children: React.ReactNode; variant?: string }) => (
    <span data-testid="badge" data-variant={variant}>
      {children}
    </span>
  ),
}));

jest.mock('../../../components/SettingsStatus', () => {
  return function MockSettingsStatus() {
    return <div data-testid="settings-status">Settings Status Component</div>;
  };
});

describe('SettingsPage', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  describe('Page Structure', () => {
    it('renders within PageTransition wrapper', () => {
      render(<SettingsPage />);
      expect(screen.getByTestId('page-transition')).toBeInTheDocument();
    });

    it('renders Topbar with correct props', () => {
      render(<SettingsPage />);

      expect(screen.getByTestId('topbar')).toBeInTheDocument();
      expect(screen.getByTestId('topbar-title')).toHaveTextContent('Settings');
      expect(screen.getByTestId('topbar-subtitle')).toHaveTextContent(
        'Confirm environment configuration and verify the backend connection.'
      );
      expect(screen.getByTestId('topbar-eyebrow')).toHaveTextContent('System');
    });

    it('renders multiple cards', () => {
      render(<SettingsPage />);
      const cards = screen.getAllByTestId('card');
      expect(cards.length).toBe(2); // Environment card and Links card
    });
  });

  describe('Environment Card', () => {
    it('displays Environment title', () => {
      render(<SettingsPage />);
      const cardTitles = screen.getAllByTestId('card-title');
      expect(cardTitles[0]).toHaveTextContent('Environment');
    });

    it('displays API Base URL label', () => {
      render(<SettingsPage />);
      expect(screen.getByText('API Base URL')).toBeInTheDocument();
    });

    it('displays API URL from environment variable', () => {
      process.env.NEXT_PUBLIC_API_URL = 'http://localhost:8000/api/v1';
      render(<SettingsPage />);
      expect(screen.getByText('http://localhost:8000/api/v1')).toBeInTheDocument();
    });

    it('displays "Not set" when API URL is not defined', () => {
      delete process.env.NEXT_PUBLIC_API_URL;
      render(<SettingsPage />);
      expect(screen.getByText('Not set')).toBeInTheDocument();
    });

    it('displays Data Mode label', () => {
      render(<SettingsPage />);
      expect(screen.getByText('Data Mode')).toBeInTheDocument();
    });

    it('displays Data Mode badge with sample text', () => {
      render(<SettingsPage />);
      const badges = screen.getAllByTestId('badge');
      const dataBadge = badges.find((b) => b.textContent?.includes('Sample'));
      expect(dataBadge).toBeInTheDocument();
      expect(dataBadge).toHaveTextContent('Sample (<=50 tickers)');
    });

    it('displays Supabase label', () => {
      render(<SettingsPage />);
      expect(screen.getByText('Supabase (Phase 3)')).toBeInTheDocument();
    });

    it('displays Supabase planned badge', () => {
      render(<SettingsPage />);
      const badges = screen.getAllByTestId('badge');
      const supabaseBadge = badges.find((b) => b.textContent === 'Planned');
      expect(supabaseBadge).toBeInTheDocument();
    });

    it('displays disclaimer text about fundamentals ingestion', () => {
      render(<SettingsPage />);
      expect(
        screen.getByText(/Fundamentals ingestion is capped while EODHD stabilizes/)
      ).toBeInTheDocument();
    });

    it('badge has secondary variant', () => {
      render(<SettingsPage />);
      const badges = screen.getAllByTestId('badge');
      badges.forEach((badge) => {
        expect(badge).toHaveAttribute('data-variant', 'secondary');
      });
    });
  });

  describe('SettingsStatus Component', () => {
    it('renders SettingsStatus component', () => {
      render(<SettingsPage />);
      expect(screen.getByTestId('settings-status')).toBeInTheDocument();
    });
  });

  describe('Links Card', () => {
    it('displays Links title', () => {
      render(<SettingsPage />);
      const cardTitles = screen.getAllByTestId('card-title');
      expect(cardTitles[1]).toHaveTextContent('Links');
    });

    it('displays Backend Health label', () => {
      render(<SettingsPage />);
      expect(screen.getByText(/Backend Health:/)).toBeInTheDocument();
    });

    it('displays Backend Health link', () => {
      render(<SettingsPage />);
      const healthLink = screen.getByRole('link', { name: /Render Health Check/i });
      expect(healthLink).toBeInTheDocument();
      expect(healthLink).toHaveAttribute('href', 'https://asx-portfolio-os.onrender.com/health');
    });

    it('Backend Health link opens in new tab', () => {
      render(<SettingsPage />);
      const healthLink = screen.getByRole('link', { name: /Render Health Check/i });
      expect(healthLink).toHaveAttribute('target', '_blank');
      expect(healthLink).toHaveAttribute('rel', 'noreferrer');
    });

    it('displays API Docs label', () => {
      render(<SettingsPage />);
      expect(screen.getByText(/API Docs:/)).toBeInTheDocument();
    });

    it('displays API Docs link', () => {
      render(<SettingsPage />);
      const docsLink = screen.getByRole('link', { name: /OpenAPI Docs/i });
      expect(docsLink).toBeInTheDocument();
      expect(docsLink).toHaveAttribute('href', 'https://asx-portfolio-os.onrender.com/docs');
    });

    it('API Docs link opens in new tab', () => {
      render(<SettingsPage />);
      const docsLink = screen.getByRole('link', { name: /OpenAPI Docs/i });
      expect(docsLink).toHaveAttribute('target', '_blank');
      expect(docsLink).toHaveAttribute('rel', 'noreferrer');
    });

    it('links have correct CSS class for styling', () => {
      render(<SettingsPage />);
      const links = screen.getAllByRole('link');
      links.forEach((link) => {
        expect(link).toHaveClass('text-accent', 'underline');
      });
    });
  });

  describe('Layout', () => {
    it('has flex column layout for main container', () => {
      render(<SettingsPage />);
      const transition = screen.getByTestId('page-transition');
      const mainDiv = transition.firstChild as HTMLElement;
      expect(mainDiv).toHaveClass('flex', 'flex-col', 'gap-10');
    });

    it('environment section has grid layout', () => {
      render(<SettingsPage />);
      const section = document.querySelector('section');
      expect(section).toHaveClass('grid', 'gap-6');
    });
  });
});
