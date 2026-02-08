import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { ETFListPage } from '../ETFListPage';
import { useETFList } from '../../hooks/useETFs';
import type { ETFSummary } from '@/contracts';

jest.mock('../../hooks/useETFs');

const mockedUseETFList = useETFList as jest.MockedFunction<typeof useETFList>;

const mockETFs: ETFSummary[] = [
  {
    symbol: 'VAS.AX',
    etfName: 'Vanguard Australian Shares',
    nav: 95.42,
    return1w: 1.23,
    return1m: -0.56,
    return3m: 3.45,
    holdingsCount: 300,
  },
  {
    symbol: 'VGS.AX',
    etfName: 'Vanguard MSCI Index International',
    nav: 112.8,
    return1w: 0.89,
    return1m: 2.1,
    return3m: 5.67,
    holdingsCount: 1500,
  },
];

describe('ETFListPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render loading state', () => {
    mockedUseETFList.mockReturnValue({
      data: undefined,
      error: undefined,
      isLoading: true,
      isValidating: false,
      mutate: jest.fn(),
    } as any);

    render(<ETFListPage onSelectETF={jest.fn()} />);
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('should render error state', () => {
    mockedUseETFList.mockReturnValue({
      data: undefined,
      error: new Error('Failed to fetch'),
      isLoading: false,
      isValidating: false,
      mutate: jest.fn(),
    } as any);

    render(<ETFListPage onSelectETF={jest.fn()} />);
    expect(screen.getByRole('alert')).toBeInTheDocument();
  });

  it('should render ETF cards when data is loaded', () => {
    mockedUseETFList.mockReturnValue({
      data: { etfs: mockETFs, count: 2 },
      error: undefined,
      isLoading: false,
      isValidating: false,
      mutate: jest.fn(),
    } as any);

    render(<ETFListPage onSelectETF={jest.fn()} />);
    expect(screen.getByText('VAS.AX')).toBeInTheDocument();
    expect(screen.getByText('VGS.AX')).toBeInTheDocument();
  });

  it('should render empty state when no ETFs', () => {
    mockedUseETFList.mockReturnValue({
      data: { etfs: [], count: 0 },
      error: undefined,
      isLoading: false,
      isValidating: false,
      mutate: jest.fn(),
    } as any);

    render(<ETFListPage onSelectETF={jest.fn()} />);
    expect(screen.getByText('No ETFs Found')).toBeInTheDocument();
  });

  it('should call onSelectETF when a card is clicked', () => {
    mockedUseETFList.mockReturnValue({
      data: { etfs: mockETFs, count: 2 },
      error: undefined,
      isLoading: false,
      isValidating: false,
      mutate: jest.fn(),
    } as any);

    const onSelectETF = jest.fn();
    render(<ETFListPage onSelectETF={onSelectETF} />);
    fireEvent.click(screen.getByText('VAS.AX'));
    expect(onSelectETF).toHaveBeenCalledWith('VAS.AX');
  });
});
