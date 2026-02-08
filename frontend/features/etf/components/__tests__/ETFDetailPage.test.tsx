import React from 'react';
import { render, screen } from '@testing-library/react';
import { ETFDetailPage } from '../ETFDetailPage';
import { useETFHoldings, useSectorAllocation } from '../../hooks/useETFs';
import type { ETFHolding, ETFSectorAllocationEntry } from '@/contracts';

jest.mock('../../hooks/useETFs');

const mockedUseETFHoldings = useETFHoldings as jest.MockedFunction<typeof useETFHoldings>;
const mockedUseSectorAllocation = useSectorAllocation as jest.MockedFunction<
  typeof useSectorAllocation
>;

const mockHoldings: ETFHolding[] = [
  {
    holdingSymbol: 'CBA.AX',
    holdingName: 'Commonwealth Bank',
    weight: 10.5,
    sector: 'Financials',
    signal: 'BUY',
    confidence: 85,
  },
  {
    holdingSymbol: 'BHP.AX',
    holdingName: 'BHP Group',
    weight: 8.2,
    sector: 'Materials',
    signal: 'HOLD',
    confidence: 60,
  },
];

const mockSectors: ETFSectorAllocationEntry[] = [
  { sector: 'Financials', weight: 32.5, holdingCount: 45 },
  { sector: 'Materials', weight: 20.1, holdingCount: 30 },
];

describe('ETFDetailPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render loading state when holdings are loading', () => {
    mockedUseETFHoldings.mockReturnValue({
      data: undefined,
      error: undefined,
      isLoading: true,
      isValidating: false,
      mutate: jest.fn(),
    } as any);
    mockedUseSectorAllocation.mockReturnValue({
      data: undefined,
      error: undefined,
      isLoading: true,
      isValidating: false,
      mutate: jest.fn(),
    } as any);

    render(<ETFDetailPage symbol="VAS.AX" />);
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('should render sector chart when sector data is available', () => {
    mockedUseETFHoldings.mockReturnValue({
      data: { holdings: mockHoldings, count: 2, asOfDate: '2026-02-01' },
      error: undefined,
      isLoading: false,
      isValidating: false,
      mutate: jest.fn(),
    } as any);
    mockedUseSectorAllocation.mockReturnValue({
      data: mockSectors,
      error: undefined,
      isLoading: false,
      isValidating: false,
      mutate: jest.fn(),
    } as any);

    render(<ETFDetailPage symbol="VAS.AX" />);
    expect(screen.getByText('Sector Allocation')).toBeInTheDocument();
    // "Financials" appears in both sector chart and holdings table
    expect(screen.getAllByText('Financials').length).toBeGreaterThanOrEqual(1);
  });

  it('should render holdings table when holdings data is available', () => {
    mockedUseETFHoldings.mockReturnValue({
      data: { holdings: mockHoldings, count: 2, asOfDate: '2026-02-01' },
      error: undefined,
      isLoading: false,
      isValidating: false,
      mutate: jest.fn(),
    } as any);
    mockedUseSectorAllocation.mockReturnValue({
      data: mockSectors,
      error: undefined,
      isLoading: false,
      isValidating: false,
      mutate: jest.fn(),
    } as any);

    render(<ETFDetailPage symbol="VAS.AX" />);
    expect(screen.getByText('CBA.AX')).toBeInTheDocument();
    expect(screen.getByText('BHP.AX')).toBeInTheDocument();
  });

  it('should render error state when holdings fail to load', () => {
    mockedUseETFHoldings.mockReturnValue({
      data: undefined,
      error: new Error('Failed to fetch holdings'),
      isLoading: false,
      isValidating: false,
      mutate: jest.fn(),
    } as any);
    mockedUseSectorAllocation.mockReturnValue({
      data: undefined,
      error: undefined,
      isLoading: false,
      isValidating: false,
      mutate: jest.fn(),
    } as any);

    render(<ETFDetailPage symbol="VAS.AX" />);
    expect(screen.getByRole('alert')).toBeInTheDocument();
  });

  it('should display ETF symbol as heading', () => {
    mockedUseETFHoldings.mockReturnValue({
      data: { holdings: mockHoldings, count: 2, asOfDate: '2026-02-01' },
      error: undefined,
      isLoading: false,
      isValidating: false,
      mutate: jest.fn(),
    } as any);
    mockedUseSectorAllocation.mockReturnValue({
      data: mockSectors,
      error: undefined,
      isLoading: false,
      isValidating: false,
      mutate: jest.fn(),
    } as any);

    render(<ETFDetailPage symbol="VAS.AX" />);
    expect(screen.getByText('VAS.AX')).toBeInTheDocument();
  });
});
