'use client';

import { useState } from 'react';
import { Upload, FileText, X, AlertCircle } from 'lucide-react';
import { api } from '@/lib/api-client';

interface PortfolioUploadProps {
  onSuccess: () => void;
}

interface CSVRow {
  ticker: string;
  shares: string;
  avg_cost: string;
  date_acquired?: string;
}

export default function PortfolioUpload({ onSuccess }: PortfolioUploadProps) {
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [preview, setPreview] = useState<CSVRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleFileChange = (selectedFile: File | null) => {
    if (!selectedFile) return;

    setError(null);

    // Validate file type
    if (!selectedFile.name.endsWith('.csv')) {
      setError('Please upload a CSV file');
      return;
    }

    setFile(selectedFile);
    parseCSVPreview(selectedFile);
  };

  const parseCSVPreview = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const lines = text.split('\n').filter((line) => line.trim());

      if (lines.length < 2) {
        setError('CSV file is empty or invalid');
        return;
      }

      // Parse header
      const headers = lines[0].split(',').map((h) => h.trim().toLowerCase());

      // Validate required columns
      const requiredColumns = ['ticker', 'shares', 'avg_cost'];
      const missingColumns = requiredColumns.filter((col) => !headers.includes(col));

      if (missingColumns.length > 0) {
        setError(`Missing required columns: ${missingColumns.join(', ')}`);
        return;
      }

      // Parse data rows (first 5 for preview)
      const dataRows = lines.slice(1, 6).map((line) => {
        const values = line.split(',').map((v) => v.trim());
        const row: any = {};
        headers.forEach((header, index) => {
          row[header] = values[index] || '';
        });
        return row as CSVRow;
      });

      setPreview(dataRows);
    };

    reader.onerror = () => {
      setError('Failed to read file');
    };

    reader.readAsText(file);
  };

  const handleUpload = async () => {
    if (!file) return;

    setIsUploading(true);
    setError(null);

    try {
      await api.uploadPortfolio(file);
      onSuccess();

      // Reset form
      setFile(null);
      setPreview([]);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to upload portfolio');
    } finally {
      setIsUploading(false);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const droppedFile = e.dataTransfer.files[0];
    handleFileChange(droppedFile);
  };

  const clearFile = () => {
    setFile(null);
    setPreview([]);
    setError(null);
  };

  return (
    <div className="space-y-6">
      {/* Upload Area */}
      <div
        className={`
          relative border-2 border-dashed rounded-lg p-8 text-center transition-colors
          ${isDragging ? 'border-blue-500 bg-blue-50 dark:bg-blue-950' : 'border-gray-300 dark:border-gray-700'}
          ${!file ? 'hover:border-gray-400 dark:hover:border-gray-600 cursor-pointer' : ''}
        `}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {!file ? (
          <>
            <Upload className="w-12 h-12 mx-auto mb-4 text-gray-400" />
            <h3 className="text-lg font-semibold mb-2">Upload Portfolio</h3>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              Drag and drop your CSV file here, or click to browse
            </p>
            <input
              type="file"
              accept=".csv"
              onChange={(e) => handleFileChange(e.target.files?.[0] || null)}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            />
            <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
              Select CSV File
            </button>

            {/* Format Guide */}
            <div className="mt-6 text-left max-w-md mx-auto">
              <p className="text-sm font-semibold mb-2">Required CSV format:</p>
              <pre className="text-xs bg-gray-100 dark:bg-gray-800 p-3 rounded overflow-x-auto">
                {`ticker,shares,avg_cost,date_acquired
CBA.AX,100,95.50,2023-06-15
BHP.AX,250,42.30,2023-08-20`}
              </pre>
              <p className="text-xs text-gray-500 mt-2">* date_acquired is optional</p>
            </div>
          </>
        ) : (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <FileText className="w-8 h-8 text-blue-600" />
              <div className="text-left">
                <p className="font-semibold">{file.name}</p>
                <p className="text-sm text-gray-600">
                  {(file.size / 1024).toFixed(1)} KB • {preview.length} rows (preview)
                </p>
              </div>
            </div>
            <button
              onClick={clearFile}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        )}
      </div>

      {/* Error Message */}
      {error && (
        <div className="flex items-start gap-2 p-4 bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-lg">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-red-900 dark:text-red-100">Upload Failed</p>
            <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
          </div>
        </div>
      )}

      {/* Preview Table */}
      {preview.length > 0 && !error && (
        <div className="border dark:border-gray-700 rounded-lg overflow-hidden">
          <div className="bg-gray-50 dark:bg-gray-800 px-4 py-3 border-b dark:border-gray-700">
            <h4 className="font-semibold">Preview (First 5 rows)</h4>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-800">
                <tr>
                  <th className="px-4 py-2 text-left text-sm font-semibold">Ticker</th>
                  <th className="px-4 py-2 text-right text-sm font-semibold">Shares</th>
                  <th className="px-4 py-2 text-right text-sm font-semibold">Avg Cost</th>
                  <th className="px-4 py-2 text-left text-sm font-semibold">Date Acquired</th>
                </tr>
              </thead>
              <tbody>
                {preview.map((row, index) => (
                  <tr key={index} className="border-t dark:border-gray-700">
                    <td className="px-4 py-2 font-mono font-semibold">{row.ticker}</td>
                    <td className="px-4 py-2 text-right">{row.shares}</td>
                    <td className="px-4 py-2 text-right">${row.avg_cost}</td>
                    <td className="px-4 py-2 text-gray-600 dark:text-gray-400">
                      {row.date_acquired || '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Upload Button */}
      {file && preview.length > 0 && !error && (
        <div className="flex justify-end gap-3">
          <button
            onClick={clearFile}
            className="px-6 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800"
          >
            Cancel
          </button>
          <button
            onClick={handleUpload}
            disabled={isUploading}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isUploading ? (
              <span className="flex items-center gap-2">
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Uploading...
              </span>
            ) : (
              'Upload Portfolio'
            )}
          </button>
        </div>
      )}
    </div>
  );
}
