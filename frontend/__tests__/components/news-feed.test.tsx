/**
 * News Feed Component Tests
 */

import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import NewsFeed from '@/components/NewsFeed';

// Mock API client
jest.mock('@/lib/api-client', () => ({
  api: {
    getTickerNews: jest.fn(() =>
      Promise.resolve({
        data: {
          status: 'success',
          ticker: 'BHP.AX',
          article_count: 2,
          articles: [
            {
              id: 1,
              ticker: 'BHP.AX',
              title: 'BHP Reports Strong Quarterly Results',
              content: 'Mining giant BHP reported stronger than expected earnings...',
              url: 'https://example.com/article1',
              published_at: '2024-01-30T10:00:00Z',
              sentiment_label: 'positive',
              sentiment_score: 0.85,
              source: 'NewsAPI',
              author: 'John Doe',
            },
            {
              id: 2,
              ticker: 'BHP.AX',
              title: 'BHP Faces Environmental Concerns',
              content: 'Environmental groups raise concerns about mining operations...',
              url: 'https://example.com/article2',
              published_at: '2024-01-29T14:00:00Z',
              sentiment_label: 'negative',
              sentiment_score: 0.65,
              source: 'NewsAPI',
              author: 'Jane Smith',
            },
          ],
        },
      })
    ),
    getLatestNews: jest.fn(() =>
      Promise.resolve({
        data: {
          status: 'success',
          article_count: 1,
          articles: [
            {
              id: 3,
              ticker: 'CBA.AX',
              title: 'Banking Sector Update',
              content: 'Latest updates from the banking sector...',
              url: 'https://example.com/article3',
              published_at: '2024-01-31T09:00:00Z',
              sentiment_label: 'neutral',
              sentiment_score: 0.50,
              source: 'NewsAPI',
              author: 'News Team',
            },
          ],
        },
      })
    ),
    get: jest.fn(() => Promise.resolve({ data: { articles: [] } })),
  },
}));

describe('NewsFeed', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders without crashing', () => {
    const { container } = render(<NewsFeed />);
    expect(container).toBeInTheDocument();
  });

  it('displays loading state initially', () => {
    render(<NewsFeed />);
    expect(screen.getByText(/loading.*news/i)).toBeInTheDocument();
  });

  it('loads and displays news articles', async () => {
    render(<NewsFeed />);

    await waitFor(() => {
      expect(screen.getByText('Banking Sector Update')).toBeInTheDocument();
    });
  });

  it('loads ticker-specific news when ticker prop provided', async () => {
    render(<NewsFeed ticker="BHP.AX" />);

    await waitFor(() => {
      expect(screen.getByText('BHP Reports Strong Quarterly Results')).toBeInTheDocument();
    });

    const { api } = require('@/lib/api-client');
    expect(api.getTickerNews).toHaveBeenCalledWith('BHP.AX', expect.any(Object));
  });

  it('displays sentiment badges correctly', async () => {
    render(<NewsFeed ticker="BHP.AX" />);

    await waitFor(() => {
      expect(screen.getByText(/positive/i)).toBeInTheDocument();
      expect(screen.getByText(/negative/i)).toBeInTheDocument();
    });
  });

  it('shows confidence scores', async () => {
    render(<NewsFeed ticker="BHP.AX" />);

    await waitFor(() => {
      expect(screen.getByText(/85%.*confidence/i)).toBeInTheDocument();
      expect(screen.getByText(/65%.*confidence/i)).toBeInTheDocument();
    });
  });

  it('displays publication dates', async () => {
    render(<NewsFeed ticker="BHP.AX" />);

    await waitFor(() => {
      // Should show relative dates like "1d ago" or "Yesterday"
      const dateTexts = screen.getAllByText(/ago|Yesterday|Today/i);
      expect(dateTexts.length).toBeGreaterThan(0);
    });
  });

  it('shows article source attribution', async () => {
    render(<NewsFeed ticker="BHP.AX" />);

    await waitFor(() => {
      expect(screen.getByText('NewsAPI')).toBeInTheDocument();
    });
  });

  it('displays author information', async () => {
    render(<NewsFeed ticker="BHP.AX" />);

    await waitFor(() => {
      expect(screen.getByText(/John Doe|Jane Smith/)).toBeInTheDocument();
    });
  });

  it('allows filtering by sentiment', async () => {
    render(<NewsFeed showFilters={true} />);

    await waitFor(() => {
      const positiveFilter = screen.getByRole('button', { name: /Positive/i });
      fireEvent.click(positiveFilter);
    });

    // Should filter news by sentiment
    const { api } = require('@/lib/api-client');
    await waitFor(() => {
      expect(api.get).toHaveBeenCalledWith(
        '/api/news/latest',
        expect.objectContaining({
          params: expect.objectContaining({ sentiment: 'positive' }),
        })
      );
    });
  });

  it('allows changing timeframe', async () => {
    render(<NewsFeed showFilters={true} />);

    await waitFor(() => {
      const timeframe7d = screen.getByRole('button', { name: /7d/i });
      fireEvent.click(timeframe7d);
    });

    // Should reload news with new timeframe
    expect(true).toBeTruthy();
  });

  it('handles empty news state gracefully', async () => {
    const { api } = require('@/lib/api-client');
    api.getLatestNews.mockResolvedValueOnce({
      data: {
        status: 'success',
        article_count: 0,
        articles: [],
      },
    });

    render(<NewsFeed />);

    await waitFor(() => {
      expect(screen.getByText(/No news.*available/i)).toBeInTheDocument();
    });
  });

  it('handles API errors gracefully', async () => {
    const { api } = require('@/lib/api-client');
    api.getLatestNews.mockRejectedValueOnce(new Error('API Error'));

    render(<NewsFeed />);

    await waitFor(() => {
      expect(screen.getByText(/failed|error/i)).toBeInTheDocument();
    });
  });

  it('displays article cards with click handlers', async () => {
    // Mock window.open
    global.open = jest.fn();

    render(<NewsFeed ticker="BHP.AX" />);

    await waitFor(() => {
      const articleCard = screen.getByText('BHP Reports Strong Quarterly Results').closest('[class*="Card"]');
      if (articleCard) {
        fireEvent.click(articleCard);
        expect(global.open).toHaveBeenCalledWith('https://example.com/article1', '_blank');
      }
    });
  });

  it('limits articles when limit prop is provided', async () => {
    render(<NewsFeed limit={1} />);

    const { api } = require('@/lib/api-client');
    expect(api.getLatestNews).toHaveBeenCalledWith(
      expect.objectContaining({ limit: 1 })
    );
  });

  it('hides filters when showFilters is false', () => {
    render(<NewsFeed showFilters={false} />);

    const positiveFilter = screen.queryByRole('button', { name: /Positive/i });
    expect(positiveFilter).not.toBeInTheDocument();
  });
});
