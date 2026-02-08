import React from 'react';
import { renderHook, waitFor } from '@testing-library/react';
import { SWRConfig } from 'swr';
import { useETFList, useETFHoldings, useSectorAllocation } from '../useETFs';
import { getETFList, getETFHoldings, getSectorAllocation } from '../../api/etf-api';
import type { ETFSummary, ETFHolding, ETFSectorAllocationEntry } from '@/contracts';

jest.mock('../../api/etf-api');

const mockedGetETFList = getETFList as jest.MockedFunction<typeof getETFList>;
const mockedGetETFHoldings = getETFHoldings as jest.MockedFunction<typeof getETFHoldings>;
const mockedGetSectorAllocation = getSectorAllocation as jest.MockedFunction<
  typeof getSectorAllocation
>;

const createWrapper = (swrConfig?: Record<string, unknown>) => {
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return React.createElement(
      SWRConfig,
      { value: { provider: () => new Map(), dedupingInterval: 0, ...swrConfig } },
      children
    );
  };
};

const mockETFs: ETFSummary[] = [
  {
    symbol: 'VAS.AX',
    etfName: 'Vanguard Australian Shares',
    sector: 'Broad Market',
    nav: 95.42,
    return1w: 1.23,
    return1m: -0.56,
    return3m: 3.45,
    holdingsCount: 300,
  },
  {
    symbol: 'VGS.AX',
    etfName: 'Vanguard MSCI Index International',
    sector: 'International',
    nav: 112.8,
    return1w: 0.89,
    return1m: 2.1,
    return3m: 5.67,
    holdingsCount: 1500,
  },
];

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
  { sector: 'Healthcare', weight: 10.8, holdingCount: 15 },
];

describe('useETFList', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should fetch and return ETF list data', async () => {
    mockedGetETFList.mockResolvedValue({ etfs: mockETFs, count: 2 });

    const { result } = renderHook(() => useETFList(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.data).toBeDefined();
    });

    expect(result.current.data?.etfs).toEqual(mockETFs);
    expect(result.current.data?.count).toBe(2);
    expect(result.current.error).toBeUndefined();
  });

  it('should handle loading state', async () => {
    mockedGetETFList.mockResolvedValue({ etfs: mockETFs, count: 2 });

    const { result } = renderHook(() => useETFList(), {
      wrapper: createWrapper(),
    });

    expect(result.current.isLoading).toBe(true);

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });
  });

  it('should handle API errors', async () => {
    const error = new Error('Failed to fetch ETF list');
    mockedGetETFList.mockRejectedValue(error);

    const { result } = renderHook(() => useETFList(), {
      wrapper: createWrapper({ shouldRetryOnError: false }),
    });

    await waitFor(() => {
      expect(result.current.error).toBeDefined();
    });

    expect(result.current.error).toBe(error);
    expect(result.current.isLoading).toBe(false);
  });
});

describe('useETFHoldings', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should fetch holdings for a given symbol', async () => {
    mockedGetETFHoldings.mockResolvedValue({
      holdings: mockHoldings,
      count: 2,
      asOfDate: '2026-02-01',
    });

    const { result } = renderHook(() => useETFHoldings('VAS.AX'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.data).toBeDefined();
    });

    expect(mockedGetETFHoldings).toHaveBeenCalledWith('VAS.AX', false);
    expect(result.current.data?.holdings).toEqual(mockHoldings);
    expect(result.current.data?.count).toBe(2);
  });

  it('should fetch holdings with signals when withSignals is true', async () => {
    mockedGetETFHoldings.mockResolvedValue({
      holdings: mockHoldings,
      count: 2,
      asOfDate: '2026-02-01',
    });

    const { result } = renderHook(() => useETFHoldings('VAS.AX', true), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.data).toBeDefined();
    });

    expect(mockedGetETFHoldings).toHaveBeenCalledWith('VAS.AX', true);
  });

  it('should not fetch when symbol is null', async () => {
    const { result } = renderHook(() => useETFHoldings(null), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(mockedGetETFHoldings).not.toHaveBeenCalled();
    expect(result.current.data).toBeUndefined();
  });

  it('should handle API errors', async () => {
    const error = new Error('Failed to fetch holdings');
    mockedGetETFHoldings.mockRejectedValue(error);

    const { result } = renderHook(() => useETFHoldings('VAS.AX'), {
      wrapper: createWrapper({ shouldRetryOnError: false }),
    });

    await waitFor(() => {
      expect(result.current.error).toBeDefined();
    });

    expect(result.current.error).toBe(error);
  });
});

describe('useSectorAllocation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should fetch sector allocation for a given symbol', async () => {
    mockedGetSectorAllocation.mockResolvedValue(mockSectors);

    const { result } = renderHook(() => useSectorAllocation('VAS.AX'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.data).toBeDefined();
    });

    expect(mockedGetSectorAllocation).toHaveBeenCalledWith('VAS.AX');
    expect(result.current.data).toEqual(mockSectors);
  });

  it('should not fetch when symbol is null', async () => {
    const { result } = renderHook(() => useSectorAllocation(null), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(mockedGetSectorAllocation).not.toHaveBeenCalled();
    expect(result.current.data).toBeUndefined();
  });

  it('should handle API errors', async () => {
    const error = new Error('Failed to fetch sectors');
    mockedGetSectorAllocation.mockRejectedValue(error);

    const { result } = renderHook(() => useSectorAllocation('VAS.AX'), {
      wrapper: createWrapper({ shouldRetryOnError: false }),
    });

    await waitFor(() => {
      expect(result.current.error).toBeDefined();
    });

    expect(result.current.error).toBe(error);
  });
});
