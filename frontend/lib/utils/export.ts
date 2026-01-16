/**
 * Export utilities for CSV and PDF generation
 */

import { PortfolioHolding, Portfolio, RiskMetrics } from '@/lib/types';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

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

/**
 * Export portfolio to PDF report
 * @param portfolio Portfolio data including holdings
 * @param riskMetrics Optional risk metrics
 * @param filename Name of the PDF file (default: portfolio-report)
 */
export function exportPortfolioToPDF(
  portfolio: Portfolio,
  riskMetrics?: RiskMetrics,
  filename: string = 'portfolio-report'
) {
  const doc = new jsPDF();

  // Calculate totals
  const totalValue = portfolio.holdings.reduce((sum, h) => sum + h.totalValue, 0);
  const totalCost = portfolio.holdings.reduce((sum, h) => sum + h.avgCost * h.shares, 0);
  const totalPL = totalValue - totalCost;
  const totalPLPercent = (totalPL / totalCost) * 100;

  // Title
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.text('Portfolio Report', 14, 20);

  // Date
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Generated: ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}`, 14, 28);

  // Summary Section
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('Portfolio Summary', 14, 40);

  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  doc.text(`Total Value: ${formatCurrency(totalValue)}`, 14, 48);
  doc.text(`Total P&L: ${formatCurrency(totalPL)} (${totalPLPercent >= 0 ? '+' : ''}${totalPLPercent.toFixed(2)}%)`, 14, 55);
  doc.text(`Holdings: ${portfolio.holdings.length} positions`, 14, 62);
  doc.text(`Strong Signals: ${portfolio.holdings.filter(h => h.signal === 'STRONG_BUY' || h.signal === 'STRONG_SELL').length}`, 14, 69);

  // Risk Metrics Section (if provided)
  if (riskMetrics) {
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Risk Metrics', 14, 82);

    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    doc.text(`Sharpe Ratio: ${riskMetrics.sharpeRatio.toFixed(2)}`, 14, 90);
    doc.text(`Volatility: ${(riskMetrics.volatility * 100).toFixed(2)}%`, 14, 97);
    doc.text(`Beta: ${riskMetrics.beta.toFixed(2)}`, 14, 104);
    if (riskMetrics.maxDrawdown) {
      doc.text(`Max Drawdown: ${(Math.abs(riskMetrics.maxDrawdown) * 100).toFixed(2)}%`, 14, 111);
    }
  }

  // Holdings Table
  const tableStartY = riskMetrics ? 120 : 80;

  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('Holdings', 14, tableStartY);

  // Prepare table data
  const tableData = portfolio.holdings.map((holding) => {
    const pl = (holding.currentPrice - holding.avgCost) * holding.shares;
    const plPercent = ((holding.currentPrice - holding.avgCost) / holding.avgCost) * 100;

    return [
      holding.ticker,
      holding.shares.toLocaleString(),
      `$${holding.avgCost.toFixed(2)}`,
      `$${holding.currentPrice.toFixed(2)}`,
      `$${holding.totalValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      `${pl >= 0 ? '+' : ''}$${Math.abs(pl).toFixed(2)}`,
      `${plPercent >= 0 ? '+' : ''}${plPercent.toFixed(2)}%`,
      holding.signal,
      `${holding.confidence}%`,
    ];
  });

  // Add totals row
  tableData.push([
    'TOTAL',
    portfolio.holdings.reduce((sum, h) => sum + h.shares, 0).toLocaleString(),
    '-',
    '-',
    `$${totalValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
    `${totalPL >= 0 ? '+' : ''}$${Math.abs(totalPL).toFixed(2)}`,
    `${totalPLPercent >= 0 ? '+' : ''}${totalPLPercent.toFixed(2)}%`,
    '-',
    '-',
  ]);

  autoTable(doc, {
    startY: tableStartY + 6,
    head: [['Ticker', 'Shares', 'Avg Cost', 'Current Price', 'Value', 'P&L ($)', 'P&L (%)', 'Signal', 'Conf.']],
    body: tableData,
    theme: 'striped',
    headStyles: {
      fillColor: [59, 130, 246], // Blue
      textColor: 255,
      fontSize: 9,
      fontStyle: 'bold',
    },
    bodyStyles: {
      fontSize: 8,
    },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 20 },
      1: { halign: 'right', cellWidth: 15 },
      2: { halign: 'right', cellWidth: 20 },
      3: { halign: 'right', cellWidth: 20 },
      4: { halign: 'right', cellWidth: 25 },
      5: { halign: 'right', cellWidth: 20 },
      6: { halign: 'right', cellWidth: 18 },
      7: { halign: 'center', cellWidth: 18 },
      8: { halign: 'center', cellWidth: 12 },
    },
    didDrawCell: (data) => {
      // Highlight totals row
      if (data.section === 'body' && data.row.index === tableData.length - 1) {
        doc.setFillColor(240, 240, 240);
        doc.setFont('helvetica', 'bold');
      }
    },
  });

  // Footer
  const pageCount = doc.internal.pages.length - 1;
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text(
      `Page ${i} of ${pageCount} | ASX Portfolio OS`,
      doc.internal.pageSize.getWidth() / 2,
      doc.internal.pageSize.getHeight() - 10,
      { align: 'center' }
    );
  }

  // Save the PDF
  doc.save(`${filename}.pdf`);
}
