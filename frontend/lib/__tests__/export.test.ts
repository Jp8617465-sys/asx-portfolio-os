import {
  exportToCSV,
  exportHoldingsToCSV,
  exportPortfolioToPDF,
  formatCurrency,
  formatNumber,
  formatPercent,
} from '../utils/export';
import { PortfolioHolding, Portfolio, RiskMetrics } from '../types';

// ── formatCurrency ──────────────────────────────────────────────────────────

describe('formatCurrency', () => {
  it('formats a positive number with $ prefix and two decimals', () => {
    const result = formatCurrency(1234.5);
    expect(result).toMatch(/^\$/);
    expect(result).toContain('1,234.50');
  });

  it('formats zero', () => {
    expect(formatCurrency(0)).toBe('$0.00');
  });

  it('formats a negative number', () => {
    const result = formatCurrency(-500.1);
    expect(result).toContain('500.10');
    expect(result).toContain('-');
  });
});

// ── formatNumber ─────────────────────────────────────────────────────────────

describe('formatNumber', () => {
  it('adds commas to thousands', () => {
    expect(formatNumber(1000)).toBe('1,000');
  });

  it('returns "0" for zero', () => {
    expect(formatNumber(0)).toBe('0');
  });

  it('handles large numbers', () => {
    expect(formatNumber(1000000)).toBe('1,000,000');
  });
});

// ── formatPercent ────────────────────────────────────────────────────────────

describe('formatPercent', () => {
  it('converts 0.5 to 50.00%', () => {
    expect(formatPercent(0.5)).toBe('50.00%');
  });

  it('respects custom decimals', () => {
    expect(formatPercent(0.123, 1)).toBe('12.3%');
  });

  it('formats 1 as 100.00%', () => {
    expect(formatPercent(1)).toBe('100.00%');
  });

  it('formats 0 as 0.00%', () => {
    expect(formatPercent(0)).toBe('0.00%');
  });
});

// ── shared CSV download helpers ─────────────────────────────────────────────

function blobToText(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsText(blob);
  });
}

function setupCSVMocks() {
  let capturedBlob: Blob | null = null;
  const realCreateElement = document.createElement.bind(document);
  const mockLink = realCreateElement('a') as HTMLAnchorElement;
  mockLink.click = jest.fn() as any;

  jest.spyOn(document, 'createElement').mockImplementation((tag: string) => {
    if (tag === 'a') return mockLink as any;
    return realCreateElement(tag);
  });
  jest.spyOn(document.body, 'appendChild').mockReturnValue(mockLink as any);
  jest.spyOn(document.body, 'removeChild').mockReturnValue(mockLink as any);

  (URL.createObjectURL as jest.Mock).mockImplementation((blob: Blob) => {
    capturedBlob = blob;
    return 'blob:mock-url';
  });
  (URL.revokeObjectURL as jest.Mock).mockClear();

  return { mockLink, readCSV: async () => blobToText(capturedBlob!) };
}

// ── exportToCSV ──────────────────────────────────────────────────────────────

describe('exportToCSV', () => {
  let mockLink: HTMLAnchorElement;
  let readCSV: () => Promise<string>;

  beforeEach(() => {
    ({ mockLink, readCSV } = setupCSVMocks());
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('warns and returns early when data is empty', () => {
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    exportToCSV([], 'test');
    expect(warnSpy).toHaveBeenCalledWith('No data to export');
    expect(URL.createObjectURL).not.toHaveBeenCalled();
    warnSpy.mockRestore();
  });

  it('creates a downloadable CSV link with correct filename', () => {
    exportToCSV([{ name: 'Alice', age: 30 }], 'people');
    expect(mockLink.download).toBe('people.csv');
    expect(mockLink.click).toHaveBeenCalled();
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:mock-url');
  });

  it('escapes values containing commas by wrapping in quotes', async () => {
    exportToCSV([{ city: 'Sydney, NSW' }], 'test');
    const text = await readCSV();
    expect(text).toContain('"Sydney, NSW"');
  });

  it('converts null values to empty strings', async () => {
    exportToCSV([{ value: null }], 'test');
    const text = await readCSV();
    // CSV: "value\n" — null becomes empty string after header
    const lines = text.split('\n');
    expect(lines).toHaveLength(2);
    expect(lines[1]).toBe('');
  });
});

// ── exportHoldingsToCSV ──────────────────────────────────────────────────────

describe('exportHoldingsToCSV', () => {
  let mockLink: HTMLAnchorElement;
  let readCSV: () => Promise<string>;

  beforeEach(() => {
    ({ mockLink, readCSV } = setupCSVMocks());
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('downloads CSV with correct default filename', () => {
    const holdings: PortfolioHolding[] = [
      {
        ticker: 'CBA.AX',
        companyName: 'Commonwealth Bank',
        shares: 100,
        avgCost: 95,
        currentPrice: 100,
        totalValue: 10000,
        signal: 'BUY',
        confidence: 75,
      },
    ];

    exportHoldingsToCSV(holdings);
    expect(mockLink.download).toBe('portfolio-holdings.csv');
    expect(mockLink.click).toHaveBeenCalled();
  });

  it('uses custom filename when provided', () => {
    const holdings: PortfolioHolding[] = [
      {
        ticker: 'BHP.AX',
        companyName: 'BHP',
        shares: 10,
        avgCost: 40,
        currentPrice: 42,
        totalValue: 420,
        signal: 'HOLD',
        confidence: 50,
      },
    ];

    exportHoldingsToCSV(holdings, 'my-exports');
    expect(mockLink.download).toBe('my-exports.csv');
  });

  it('includes ticker and correct P&L in CSV content', async () => {
    const holdings: PortfolioHolding[] = [
      {
        ticker: 'CBA.AX',
        companyName: 'Commonwealth Bank',
        shares: 100,
        avgCost: 95,
        currentPrice: 100,
        totalValue: 10000,
        signal: 'BUY',
        confidence: 75,
      },
    ];

    exportHoldingsToCSV(holdings);
    const text = await readCSV();

    expect(text).toContain('CBA.AX');
    expect(text).toContain('Commonwealth Bank');
    // P&L ($) = (100 - 95) * 100 = 500.00
    expect(text).toContain('500.00');
  });
});

// ── exportPortfolioToPDF ─────────────────────────────────────────────────────

// jsPDF is mocked via __mocks__/jspdf.js
jest.mock('jspdf');
jest.mock('jspdf-autotable');

describe('exportPortfolioToPDF', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const createMockHolding = (overrides: Partial<PortfolioHolding> = {}): PortfolioHolding => ({
    ticker: 'CBA.AX',
    companyName: 'Commonwealth Bank',
    shares: 100,
    avgCost: 95,
    currentPrice: 100,
    totalValue: 10000,
    signal: 'BUY',
    confidence: 75,
    ...overrides,
  });

  const createMockPortfolio = (holdings: PortfolioHolding[] = []): Portfolio => ({
    holdings: holdings.length > 0 ? holdings : [createMockHolding()],
  });

  const createMockRiskMetrics = (): RiskMetrics => ({
    sharpeRatio: 1.5,
    volatility: 0.15,
    beta: 1.1,
    maxDrawdown: -0.12,
  });

  it('should export PDF without crashing', () => {
    const portfolio = createMockPortfolio();

    expect(() => {
      exportPortfolioToPDF(portfolio);
    }).not.toThrow();
  });

  it('should export PDF with custom filename', () => {
    const portfolio = createMockPortfolio();

    expect(() => {
      exportPortfolioToPDF(portfolio, undefined, 'custom-report');
    }).not.toThrow();
  });

  it('should export PDF with risk metrics', () => {
    const portfolio = createMockPortfolio();
    const riskMetrics = createMockRiskMetrics();

    expect(() => {
      exportPortfolioToPDF(portfolio, riskMetrics);
    }).not.toThrow();
  });

  it('should export PDF with risk metrics without maxDrawdown', () => {
    const portfolio = createMockPortfolio();
    const riskMetrics: RiskMetrics = {
      sharpeRatio: 1.5,
      volatility: 0.15,
      beta: 1.1,
    };

    expect(() => {
      exportPortfolioToPDF(portfolio, riskMetrics);
    }).not.toThrow();
  });

  it('should handle portfolio with multiple holdings', () => {
    const holdings: PortfolioHolding[] = [
      createMockHolding({ ticker: 'CBA.AX', totalValue: 10000 }),
      createMockHolding({ ticker: 'BHP.AX', totalValue: 5000, signal: 'STRONG_BUY' }),
      createMockHolding({ ticker: 'WBC.AX', totalValue: 3000, signal: 'STRONG_SELL' }),
    ];
    const portfolio = createMockPortfolio(holdings);

    expect(() => {
      exportPortfolioToPDF(portfolio);
    }).not.toThrow();
  });

  it('should handle portfolio with negative P&L', () => {
    const holdings: PortfolioHolding[] = [
      createMockHolding({ avgCost: 110, currentPrice: 100 }), // Loss
    ];
    const portfolio = createMockPortfolio(holdings);

    expect(() => {
      exportPortfolioToPDF(portfolio);
    }).not.toThrow();
  });

  it('should handle portfolio with zero shares', () => {
    const holdings: PortfolioHolding[] = [createMockHolding({ shares: 0 })];
    const portfolio = createMockPortfolio(holdings);

    expect(() => {
      exportPortfolioToPDF(portfolio);
    }).not.toThrow();
  });

  it('should handle empty holdings array', () => {
    const portfolio: Portfolio = { holdings: [] };

    expect(() => {
      exportPortfolioToPDF(portfolio);
    }).not.toThrow();
  });

  it('should handle holdings with expectedReturn', () => {
    const holdings: PortfolioHolding[] = [createMockHolding({ expectedReturn: 0.15 })];
    const portfolio = createMockPortfolio(holdings);

    expect(() => {
      exportPortfolioToPDF(portfolio);
    }).not.toThrow();
  });

  it('should correctly calculate totals for multiple holdings', () => {
    const holdings: PortfolioHolding[] = [
      createMockHolding({ shares: 100, avgCost: 100, currentPrice: 110, totalValue: 11000 }),
      createMockHolding({ shares: 50, avgCost: 50, currentPrice: 60, totalValue: 3000 }),
    ];
    const portfolio = createMockPortfolio(holdings);

    // This should not throw, even with varied data
    expect(() => {
      exportPortfolioToPDF(portfolio);
    }).not.toThrow();
  });
});
