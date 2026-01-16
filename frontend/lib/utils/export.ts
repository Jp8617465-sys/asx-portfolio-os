/**
 * Export utilities for CSV and PDF generation
 */

import { PortfolioHolding, Portfolio } from '@/lib/types';

/**
 * Export data to CSV file
 * @param data Array of objects to export
 * @param filename Name of the file (without extension)
 */
export function exportToCSV(data: any[], filename: string) {
  if (data.length === 0) {
    console.warn('No data to export');
    return;
  }

  // Extract headers from first object
  const headers = Object.keys(data[0]);

  // Create CSV content
  const csvContent = [
    // Header row
    headers.join(','),
    // Data rows
    ...data.map((row) =>
      headers
        .map((header) => {
          const value = row[header];

          // Handle null/undefined
          if (value === null || value === undefined) {
            return '';
          }

          // Convert to string
          const stringValue = String(value);

          // Escape commas and quotes
          if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
            return `"${stringValue.replace(/"/g, '""')}"`;
          }

          return stringValue;
        })
        .join(',')
    ),
  ].join('\n');

  // Create blob and download
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${filename}.csv`;
  link.style.display = 'none';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Export portfolio holdings to CSV
 * @param holdings Array of portfolio holdings
 * @param filename Name of the file (default: portfolio-holdings)
 */
export function exportHoldingsToCSV(holdings: PortfolioHolding[], filename: string = 'portfolio-holdings') {
  // Transform holdings to flat structure for CSV
  const exportData = holdings.map((holding) => {
    const pl = (holding.currentPrice - holding.avgCost) * holding.shares;
    const plPercent = ((holding.currentPrice - holding.avgCost) / holding.avgCost) * 100;

    return {
      Ticker: holding.ticker,
      Company: holding.companyName,
      Shares: holding.shares,
      'Avg Cost': holding.avgCost.toFixed(2),
      'Current Price': holding.currentPrice.toFixed(2),
      'Total Value': holding.totalValue.toFixed(2),
      'P&L ($)': pl.toFixed(2),
      'P&L (%)': plPercent.toFixed(2),
      Signal: holding.signal,
      Confidence: `${holding.confidence}%`,
      'Expected Return': holding.expectedReturn ? `${(holding.expectedReturn * 100).toFixed(2)}%` : '',
    };
  });

  exportToCSV(exportData, filename);
}

/**
 * Format currency for display
 */
export function formatCurrency(value: number): string {
  return `$${value.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

/**
 * Format number with commas
 */
export function formatNumber(value: number): string {
  return value.toLocaleString();
}

/**
 * Format percentage
 */
export function formatPercent(value: number, decimals: number = 2): string {
  return `${(value * 100).toFixed(decimals)}%`;
}
